const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Get all notifications for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notification count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notifications
router.delete('/', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (notificationIds && Array.isArray(notificationIds)) {
      // Delete specific notifications
      await Notification.deleteMany({
        _id: { $in: notificationIds },
        recipient: req.user.id
      });
    } else {
      // Delete all read notifications
      await Notification.deleteMany({
        recipient: req.user.id,
        read: true
      });
    }

    res.json({ message: 'Notifications deleted' });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 