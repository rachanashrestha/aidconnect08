const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const Request = require('../models/Request');
const { auth } = require('../middleware/authMiddleware');
const { volunteerOnly } = require('../middleware/volunteer');
const router = express.Router();

// Get volunteer dashboard stats
router.get('/stats', auth, volunteerOnly, async (req, res) => {
  try {
    // Get total requests handled by this volunteer
    const totalRequests = await Request.countDocuments({ volunteer: req.user._id });

    // Get requests by status for this volunteer
    const requestsByStatus = await Request.aggregate([
      { $match: { volunteer: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent requests handled by this volunteer
    const recentRequests = await Request.find({ volunteer: req.user._id })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get available requests (not assigned to any volunteer)
    const availableRequests = await Request.find({
      status: 'pending',
      volunteer: null
    })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate completion rate
    const completedRequests = await Request.countDocuments({
      volunteer: req.user._id,
      status: 'completed'
    });
    const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

    res.json({
      totalRequests,
      requestsByStatus: requestsByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentRequests,
      availableRequests,
      completionRate: Math.round(completionRate),
      lastActive: req.user.lastActive || new Date()
    });
  } catch (error) {
    console.error('Error fetching volunteer stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all requests assigned to this volunteer
router.get('/requests', auth, volunteerOnly, async (req, res) => {
  try {
    const requests = await Request.find({ volunteer: req.user._id })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching volunteer requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available requests (not assigned to any volunteer)
router.get('/available-requests', auth, volunteerOnly, async (req, res) => {
  try {
    const requests = await Request.find({
      status: 'pending',
      volunteer: null
    })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching available requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept a request
router.put('/requests/:id/accept', auth, volunteerOnly, async (req, res) => {
  try {
    const requestId = req.params.id;
    const volunteerId = req.user._id;

    console.log('Accept request attempt:', {
      requestId,
      volunteerId,
      userRole: req.user.role,
      timestamp: new Date().toISOString()
    });

    // Validate request ID format
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid request ID format:', requestId);
      return res.status(400).json({
        message: 'Invalid request ID format',
        requestId
      });
    }

    // Validate volunteer ID
    if (!volunteerId) {
      console.log('Missing volunteer ID');
      return res.status(400).json({
        message: 'Volunteer ID is required',
        volunteerId
      });
    }

    // First check if the volunteer is already assigned to another request
    const activeRequest = await Request.findOne({
      volunteer: volunteerId,
      status: { $in: ['in_progress', 'pending'] }
    });

    if (activeRequest) {
      console.log('Volunteer has active request:', {
        activeRequestId: activeRequest._id,
        status: activeRequest.status,
        volunteerId
      });
      return res.status(400).json({ 
        message: 'You already have an active request. Please complete it before accepting another one.',
        activeRequestId: activeRequest._id
      });
    }

    // Find the request to accept
    const request = await Request.findOne({
      _id: requestId,
      status: 'pending',
      volunteer: null
    });

    if (!request) {
      // Check if request exists but is not available
      const existingRequest = await Request.findById(requestId);
      if (existingRequest) {
        console.log('Request exists but is not available:', {
          requestId,
          status: existingRequest.status,
          volunteer: existingRequest.volunteer,
          currentVolunteer: volunteerId
        });

        let errorMessage = 'This request is no longer available for acceptance';
        if (existingRequest.volunteer) {
          errorMessage = 'This request has already been assigned to another volunteer';
        } else if (existingRequest.status !== 'pending') {
          errorMessage = `This request is in ${existingRequest.status} status and cannot be accepted`;
        }

        return res.status(400).json({
          message: errorMessage,
          requestId,
          currentStatus: existingRequest.status,
          currentVolunteer: existingRequest.volunteer
        });
      }

      console.log('Request not found:', requestId);
      return res.status(404).json({ 
        message: 'Request not found',
        requestId
      });
    }

    // Update the request
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        $set: {
          volunteer: volunteerId,
          status: 'in_progress',
          assignedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).populate('requester', 'name email');

    if (!updatedRequest) {
      console.log('Failed to update request:', {
        requestId,
        volunteerId
      });
      return res.status(500).json({ 
        message: 'Failed to update request',
        requestId
      });
    }

    console.log('Request accepted successfully:', {
      requestId: updatedRequest._id,
      newStatus: updatedRequest.status,
      newVolunteer: updatedRequest.volunteer,
      requester: updatedRequest.requester
    });

    res.json({
      message: 'Request accepted successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error accepting request:', {
      error: error.message,
      stack: error.stack,
      requestId: req.params.id,
      volunteerId: req.user._id
    });
    res.status(500).json({ 
      message: 'Server error while accepting request',
      error: error.message 
    });
  }
});

// Complete a request
router.post('/requests/:id/complete', auth, volunteerOnly, async (req, res) => {
  try {
    console.log('Completing request:', {
      requestId: req.params.id,
      userId: req.user._id,
      userRole: req.user.role
    });

    const request = await Request.findOne({
      _id: req.params.id,
      volunteer: req.user._id,
      status: 'in_progress'
    });

    if (!request) {
      console.log('Request not found or not in progress:', {
        requestId: req.params.id,
        userId: req.user._id
      });
      return res.status(404).json({ message: 'Request not found or not in progress' });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    // Update volunteer's completed requests count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { completedRequests: 1 }
    });

    // Create notification for requester
    const notification = new Notification({
      recipient: request.requester,
      sender: req.user._id,
      request: request._id,
      type: 'request_completed',
      title: 'Request Completed',
      message: `Your request "${request.title}" has been completed`
    });
    await notification.save();

    console.log('Request completed successfully:', {
      requestId: request._id,
      volunteerId: req.user._id
    });

    res.json(request);
  } catch (error) {
    console.error('Error completing request:', {
      error: error.message,
      stack: error.stack,
      requestId: req.params.id,
      userId: req.user._id
    });
    res.status(500).json({ 
      message: 'Server error while completing request',
      error: error.message 
    });
  }
});

// Get messages for a specific user
router.get('/messages/:userId', auth, volunteerOnly, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
    .populate('sender receiver', 'name')
    .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/messages', auth, volunteerOnly, async (req, res) => {
  try {
    const { receiver, text } = req.body;
    
    if (!receiver || !text) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const message = new Message({
      sender: req.user._id,
      receiver,
      text
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users for chat
router.get('/users', auth, volunteerOnly, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name role email')
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    console.error('Fetch Users Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get request details
router.get('/requests/:id', auth, volunteerOnly, async (req, res) => {
  try {
    const requestId = req.params.id;
    const volunteerId = req.user._id;

    console.log('Fetching request details:', {
      requestId,
      volunteerId,
      timestamp: new Date().toISOString()
    });

    // Validate request ID format
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid request ID format:', requestId);
      return res.status(400).json({
        message: 'Invalid request ID format',
        requestId
      });
    }

    // Find the request
    const request = await Request.findById(requestId)
      .populate('requester', 'name email profilePicture')
      .populate('volunteer', 'name email profilePicture averageRating totalRatings');

    if (!request) {
      console.log('Request not found:', requestId);
      return res.status(404).json({
        message: 'Request not found',
        requestId
      });
    }

    // Check if the volunteer is authorized to view this request
    if (request.volunteer && request.volunteer._id.toString() !== volunteerId.toString()) {
      console.log('Unauthorized access attempt:', {
        requestId,
        volunteerId,
        assignedVolunteer: request.volunteer._id
      });
      return res.status(403).json({
        message: 'You are not authorized to view this request'
      });
    }

    console.log('Request details fetched successfully:', {
      requestId,
      status: request.status,
      volunteer: request.volunteer?._id
    });

    res.json(request);
  } catch (error) {
    console.error('Error fetching request details:', {
      error: error.message,
      stack: error.stack,
      requestId: req.params.id,
      volunteerId: req.user._id
    });
    res.status(500).json({
      message: 'Server error while fetching request details',
      error: error.message
    });
  }
});

module.exports = router; 