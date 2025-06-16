const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const User = require("../models/User");
const Request = require("../models/Request");
const mongoose = require("mongoose");
const multer = require('multer');
const path = require('path');
const { notifyNewMessage } = require('../services/notificationService');
const Conversation = require('../models/Conversation');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create a new conversation with a user
router.post("/conversation", auth, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] }
    }).populate('participants', 'name profilePicture');

    if (conversation) {
      return res.json(conversation);
    }

    // Create new conversation
    conversation = new Conversation({
      participants: [req.user.id, participantId]
    });

    await conversation.save();
    await conversation.populate('participants', 'name profilePicture');

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation with a specific user
router.get("/conversation/user/:userId", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, req.params.userId] }
    })
    .populate('participants', 'name profilePicture')
    .populate('lastMessage');

    if (!conversation) {
      return res.json(null);
    }

    // Get unread message count
    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: req.user.id },
      read: false
    });

    res.json({
      ...conversation.toObject(),
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all conversations for the current user
router.get("/conversations", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
    .populate('participants', 'name profilePicture')
    .populate('lastMessage')
    .sort('-updatedAt');

    // Get unread message counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          sender: { $ne: req.user.id },
          read: false
        });
        return {
          ...conversation.toObject(),
          unreadCount
        };
      })
    );

    res.json(conversationsWithUnread);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages with a specific user
router.get("/:userId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    })
    .populate("sender receiver", "name role profilePicture")
    .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user.id,
        status: { $ne: "read" }
      },
      {
        $set: { status: "read", readAt: new Date() }
      }
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send a message
router.post("/send", auth, upload.single('file'), async (req, res) => {
  try {
    console.log('Received message request:', req.body);
    console.log('File:', req.file);

    const { receiver, text, type = 'text', metadata } = req.body;

    // Validate required fields
    if (!receiver || !text) {
      return res.status(400).json({ message: 'Receiver and text are required' });
    }

    // Validate receiver exists
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, receiver] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, receiver]
      });
      await conversation.save();
    }

    // Create message
    const messageData = {
      conversation: conversation._id,
      sender: req.user.id,
      receiver,
      text,
      type
    };

    // Handle file upload
    if (req.file) {
      messageData.type = 'image';
      messageData.metadata = {
        ...metadata,
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
      };
    }
    // Handle location data
    else if (type === 'location' && metadata) {
      messageData.metadata = {
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        address: metadata.address
      };
    }

    const message = new Message(messageData);
    await message.save();

    // Populate sender details
    await message.populate('sender', 'name profilePicture');

    // Create notification for new message
    await notifyNewMessage(message, req.user, receiverUser);

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.updatedAt = Date.now();
    await conversation.save();

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(receiver).emit('new_message', {
        message,
        conversation: conversation._id
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a specific request
router.get("/request/:requestId", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Check if user is either requester or volunteer
    if (request.requester.toString() !== req.user.id && 
        request.volunteer?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view these messages" });
    }

    const messages = await Message.find({ request: req.params.requestId })
      .populate("sender receiver", "name role profilePicture")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching request messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark messages as read
router.put("/read", auth, async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ message: "Invalid message IDs" });
    }

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: req.user.id
      },
      {
        $set: { status: "read", readAt: new Date() }
      }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get or create a conversation with a user
router.get('/conversation/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId] }
    });

    // If no conversation exists, create a new one
    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, userId]
      });
      await conversation.save();
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversation: conversation._id })
      .sort('createdAt')
      .populate('sender', 'name profilePicture');

    // Get unread message count
    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: req.user.id },
      read: false
    });

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: req.user.id },
        read: false
      },
      { read: true }
    );

    res.json({
      conversation,
      messages,
      unreadCount
    });
  } catch (error) {
    console.error('Error in conversation/user/:userId:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific conversation by ID
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Find conversation and verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversation: conversationId })
      .sort('createdAt')
      .populate('sender', 'name profilePicture');

    // Get unread message count
    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      sender: { $ne: req.user.id },
      read: false
    });

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user.id },
        read: false
      },
      { read: true }
    );

    res.json({
      conversation,
      messages,
      unreadCount
    });
  } catch (error) {
    console.error('Error in conversation/:conversationId:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
