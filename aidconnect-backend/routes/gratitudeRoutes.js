const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gratitude = require('../models/Gratitude');

// Get all gratitude messages
router.get('/', auth, async (req, res) => {
  try {
    const gratitudes = await Gratitude.find()
      .populate('sender', 'name email profilePicture')
      .populate('recipient', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(gratitudes);
  } catch (error) {
    console.error('Error fetching gratitudes:', error);
    res.status(500).json({ message: 'Server error while fetching gratitude messages' });
  }
});

// Add a new gratitude message
router.post('/', auth, async (req, res) => {
  try {
    const { message, recipientId } = req.body;
    const sender = req.user._id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (message.length > 500) {
      return res.status(400).json({ message: 'Message must be 500 characters or less' });
    }

    const gratitude = new Gratitude({
      message: message.trim(),
      sender,
      recipient: recipientId || null
    });

    await gratitude.save();
    await gratitude.populate('sender', 'name email profilePicture');
    if (gratitude.recipient) {
      await gratitude.populate('recipient', 'name email profilePicture');
    }

    res.status(201).json(gratitude);
  } catch (error) {
    console.error('Error adding gratitude:', error);
    res.status(500).json({ message: 'Server error while adding gratitude message' });
  }
});

// Get gratitude messages for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const messages = await Gratitude.find({ recipient: req.params.userId })
      .populate('sender', 'name profilePicture')
      .populate('recipient', 'name profilePicture')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user gratitude messages' });
  }
});

// Delete a gratitude message (only by sender)
router.delete('/:id', auth, async (req, res) => {
  try {
    const gratitude = await Gratitude.findById(req.params.id);
    
    if (!gratitude) {
      return res.status(404).json({ message: 'Gratitude message not found' });
    }

    if (gratitude.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await gratitude.remove();
    res.json({ message: 'Gratitude message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting gratitude message' });
  }
});

module.exports = router; 