const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Request = require("../models/Request");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { notifyRequestAccepted, notifyRequestCompleted, notifyRequestCreated } = require('../services/notificationService');
const Rating = require("../models/Rating");
const ChatRoom = require("../models/ChatRoom");
const { updateVolunteerStats } = require("../services/badgeService");

// Get all requests (filtered based on user role)
router.get("/", auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is a requester, show their requests and nearby open requests
    if (req.user.role === 'requester') {
      query = {
        $or: [
          { requester: req.user.id },
          { status: 'open' }
        ]
      };
    }
    // If user is a volunteer, show all open requests and their accepted requests
    else if (req.user.role === 'volunteer') {
      query = {
        $or: [
          { status: 'open' },
          { volunteer: req.user.id }
        ]
      };
    }

    const requests = await Request.find(query)
      .populate("requester", "name email profilePicture")
      .populate("volunteer", "name email profilePicture")
      .sort({ priority: -1, createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get nearby requests
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query; // radius in kilometers

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const requests = await Request.find({
      status: 'pending',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    })
    .populate('requester', 'name profilePicture')
    .sort({ emergencyLevel: -1, createdAt: -1 });

    // Add distance to each request
    const requestsWithDistance = requests.map(request => {
      const requestObj = request.toObject();
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        request.location.coordinates[1],
        request.location.coordinates[0]
      );
      requestObj.distance = distance;
      return requestObj;
    });

    res.json(requestsWithDistance);
  } catch (error) {
    console.error('Error fetching nearby requests:', error);
    res.status(500).json({ message: 'Error fetching nearby requests' });
  }
});

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Create a new request
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, category, emergencyLevel, location } = req.body;
    
    if (!title || !description || !category || !emergencyLevel || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const request = new Request({
      title,
      description,
      category,
      emergencyLevel,
      location,
      requester: req.user.id,
      status: 'open'
    });

    await request.save();

    // Create notifications for nearby volunteers
    await notifyRequestCreated(request, req.user);

    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update request status
router.put("/:id/:action", auth, async (req, res) => {
  try {
    const { id, action } = req.params;
    const request = await Request.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    let notification = null;

    if (action === 'accept') {
      if (request.status !== 'open') {
        return res.status(400).json({ message: "Request is no longer available" });
      }
      request.status = 'in_progress';
      request.volunteer = req.user.id;
      request.assignedAt = new Date();

      // Create notification for requester
      notification = new Notification({
        recipient: request.requester,
        sender: req.user.id,
        request: request._id,
        type: 'request_accepted',
        title: 'Request Accepted',
        message: `Your request "${request.title}" has been accepted by a volunteer`
      });
    } 
    else if (action === 'complete') {
      if (request.status !== 'in_progress' || request.volunteer.toString() !== req.user.id.toString()) {
        return res.status(400).json({ message: "Request cannot be completed" });
      }

      // Only update status and completedAt
      const updatedRequest = await Request.findByIdAndUpdate(
        request._id,
        {
          $set: {
            status: 'completed',
            completedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );

      if (!updatedRequest) {
        return res.status(500).json({ message: "Failed to update request" });
      }
      
      // Update volunteer's completed requests count
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { completedRequests: 1 }
      });

      // Create notification for requester
      notification = new Notification({
        recipient: request.requester,
        sender: req.user.id,
        request: request._id,
        type: 'request_completed',
        title: 'Request Completed',
        message: `Your request "${request.title}" has been completed`
      });
      await notification.save();

      request = updatedRequest;
    }
    else if (action === 'cancel') {
      if (request.requester.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: "Only the requester can cancel the request" });
      }
      if (request.status !== 'open') {
        return res.status(400).json({ message: "Can only cancel open requests" });
      }
      request.status = 'cancelled';

      // Create notification for volunteer if assigned
      if (request.volunteer) {
        notification = new Notification({
          recipient: request.volunteer,
          sender: req.user.id,
          request: request._id,
          type: 'request_cancelled',
          title: 'Request Cancelled',
          message: `The request "${request.title}" has been cancelled by the requester`
        });
      }
    }
    else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await request.save();
    if (notification) {
      await notification.save();
    }

    res.json(request);
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get request details
router.get("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("requester", "name email profilePicture")
      .populate("volunteer", "name email profilePicture");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Check if user has permission to view the request
    if (request.requester._id.toString() !== req.user.id && 
        request.volunteer?._id.toString() !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to view this request" });
    }

    res.json(request);
  } catch (error) {
    console.error("Error fetching request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept a request
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'open') {
      return res.status(400).json({ message: 'Request is no longer open' });
    }

    request.status = 'in_progress';
    request.volunteer = req.user.id;
    await request.save();

    // Create notification for request accepted
    await notifyRequestAccepted(request, req.user);

    res.json(request);
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete a request
router.put('/:id/complete', auth, async (req, res) => {
  try {
    console.log('Completing request:', {
      requestId: req.params.id,
      userId: req.user._id,
      userRole: req.user.role
    });

    const request = await Request.findById(req.params.id);
    
    if (!request) {
      console.log('Request not found:', req.params.id);
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is the assigned volunteer
    if (!request.volunteer || request.volunteer.toString() !== req.user._id.toString()) {
      console.log('Unauthorized completion attempt:', {
        requestId: req.params.id,
        userId: req.user._id,
        assignedVolunteer: request.volunteer
      });
      return res.status(403).json({ message: 'Only the assigned volunteer can complete this request' });
    }

    // Check if request is in progress
    if (request.status !== 'in_progress') {
      console.log('Invalid request status for completion:', {
        requestId: req.params.id,
        currentStatus: request.status
      });
      return res.status(400).json({ 
        message: 'Can only complete requests that are in progress',
        currentStatus: request.status
      });
    }

    // Update request status
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

// Rate a volunteer after request completion
router.post('/:requestId/rate', auth, async (req, res) => {
  try {
    const { rating, comment, volunteerId } = req.body;
    const request = await Request.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is the requester
    if (request.requester.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the requester can rate the volunteer' });
    }

    // Check if request is completed
    if (request.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed requests' });
    }

    // Check if volunteer is assigned
    if (!request.volunteer || request.volunteer.toString() !== volunteerId) {
      return res.status(400).json({ message: 'Invalid volunteer for this request' });
    }

    // Create rating
    const ratingData = {
      request: request._id,
      volunteer: volunteerId,
      requester: req.user.id,
      rating,
      comment,
      createdAt: Date.now()
    };

    // Update volunteer's average rating
    const volunteer = await User.findById(volunteerId);
    if (volunteer) {
      const totalRatings = (volunteer.totalRatings || 0) + 1;
      const currentRating = volunteer.averageRating || 0;
      const newRating = ((currentRating * (totalRatings - 1)) + rating) / totalRatings;

      volunteer.averageRating = newRating;
      volunteer.totalRatings = totalRatings;
      await volunteer.save();
    }

    // Save rating
    const newRating = new Rating(ratingData);
    await newRating.save();

    res.status(201).json(newRating);
  } catch (error) {
    console.error('Error rating volunteer:', error);
    res.status(500).json({ message: 'Error rating volunteer' });
  }
});

// Get top 3 nearby urgent requests for instant match
router.get('/instant-match', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Find top 3 urgent requests within 5km
    const requests = await Request.find({
      status: 'pending',
      emergencyLevel: 'urgent',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 5000 // 5km in meters
        }
      }
    })
    .populate('requester', 'name profilePicture phone')
    .sort({ createdAt: 1 })
    .limit(3);

    // Add distance to each request
    const requestsWithDistance = requests.map(request => {
      const requestObj = request.toObject();
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        request.location.coordinates[1],
        request.location.coordinates[0]
      );
      requestObj.distance = distance;
      return requestObj;
    });

    res.json(requestsWithDistance);
  } catch (error) {
    console.error('Error fetching instant match requests:', error);
    res.status(500).json({ message: 'Error fetching instant match requests' });
  }
});

// Instant accept a request
router.post('/:id/instant-accept', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer available' });
    }

    // Update request status and assign volunteer
    request.status = 'accepted';
    request.volunteer = req.user._id;
    await request.save();

    // Create a chat room for the request
    const chatRoom = new ChatRoom({
      request: request._id,
      participants: [request.requester, req.user._id],
      lastMessage: {
        text: 'Request accepted. Chat started.',
        sender: req.user._id
      }
    });
    await chatRoom.save();

    // Notify the requester
    const notification = new Notification({
      recipient: request.requester,
      sender: req.user._id,
      type: 'request_accepted',
      request: request._id,
      message: `${req.user.name} has accepted your request`
    });
    await notification.save();

    // Update volunteer stats
    await updateVolunteerStats(req.user._id, {
      emergencyLevel: request.emergencyLevel
    });

    res.json({
      message: 'Request accepted successfully',
      request,
      chatRoomId: chatRoom._id
    });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ message: 'Error accepting request' });
  }
});

module.exports = router; 