const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const Request = require('../models/Request');
const { adminOnly } = require('../middleware/admin');
const router = express.Router();

// Get admin dashboard stats
router.get('/stats', adminOnly, async (req, res) => {
  try {
    // Get total users count by role
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total requests count by status
    const requestStats = await Request.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total messages count
    const messageCount = await Message.countDocuments();

    // Get recent activities (last 5 requests)
    const recentRequests = await Request.find()
      .populate('requester', 'name email')
      .populate('volunteer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent users (last 5 registrations)
    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      userStats: userStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      requestStats: requestStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      messageCount,
      recentRequests,
      recentUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all users
router.get('/users', adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all messages
router.get('/messages', adminOnly, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender receiver', 'name email')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all requests
router.get('/requests', adminOnly, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('requester', 'name email')
      .populate('volunteer', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status
router.put('/users/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// (Optional) DELETE a message
router.delete('/messages/:id', adminOnly, async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ message: 'Message deleted' });
});

module.exports = router;
