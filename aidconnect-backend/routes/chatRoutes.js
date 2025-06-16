const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Request = require('../models/Request');

// Get all chat rooms for the authenticated user
router.get('/rooms', auth, async (req, res) => {
  try {
    console.log('Fetching chat rooms for user:', req.user.id);

    // Find all chat rooms where the user is a participant
    const chatRooms = await ChatRoom.find({
      participants: req.user.id
    })
    .populate('participants', 'name profilePicture')
    .populate('request', 'title status')
    .sort({ updatedAt: -1 });

    // For each chat room, get the last message and unread count
    const chatRoomsWithDetails = await Promise.all(chatRooms.map(async (room) => {
      const lastMessage = await Message.findOne({ chatRoom: room._id })
        .sort({ createdAt: -1 })
        .limit(1);

      const unreadCount = await Message.countDocuments({
        chatRoom: room._id,
        sender: { $ne: req.user.id },
        read: false
      });

      // Get the other participant's info
      const otherParticipant = room.participants.find(
        p => p._id.toString() !== req.user.id
      );

      return {
        ...room.toObject(),
        otherParticipant,
        lastMessage,
        unreadCount
      };
    }));

    console.log(`Found ${chatRoomsWithDetails.length} chat rooms for user ${req.user.id}`);
    res.json(chatRoomsWithDetails);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Create or get chat room
router.post('/room', auth, async (req, res) => {
  try {
    const { requestId, volunteerId, requesterId } = req.body;

    console.log('Received chat room creation request:', {
      requestId,
      volunteerId,
      requesterId,
      userId: req.user.id
    });

    // Validate required fields
    if (!requestId || !volunteerId || !requesterId) {
      console.error('Missing required fields:', { requestId, volunteerId, requesterId });
      return res.status(400).json({ 
        message: 'Request ID, volunteer ID, and requester ID are required',
        received: { requestId, volunteerId, requesterId }
      });
    }

    // Verify the request exists and is in progress
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found:', requestId);
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'in_progress') {
      console.error('Request is not in progress:', request.status);
      return res.status(400).json({ message: 'Request must be in progress to start a chat' });
    }

    // Verify the user is either the volunteer or requester
    if (req.user.id !== volunteerId && req.user.id !== requesterId) {
      console.error('User not authorized:', {
        userId: req.user.id,
        volunteerId,
        requesterId
      });
      return res.status(403).json({ message: 'Not authorized to create chat room' });
    }

    // Check if chat room already exists
    let chatRoom = await ChatRoom.findOne({ request: requestId })
      .populate('participants', 'name profilePicture');

    if (!chatRoom) {
      console.log('Creating new chat room');
      // Create new chat room
      chatRoom = new ChatRoom({
        request: requestId,
        volunteer: volunteerId,
        requester: requesterId,
        participants: [volunteerId, requesterId]
      });
      await chatRoom.save();
      
      // Populate the participants after saving
      await chatRoom.populate('participants', 'name profilePicture');

      // Notify participants through Socket.IO
      const io = req.app.get('io');
      if (io) {
        [volunteerId, requesterId].forEach(participantId => {
          io.to(participantId).emit('newChatRoom', {
            chatRoom: chatRoom._id,
            request: requestId
          });
        });
      }
    } else {
      console.log('Found existing chat room:', chatRoom._id);
    }

    // Get the other participant's info
    const otherParticipant = chatRoom.participants.find(
      p => p._id.toString() !== req.user.id
    );

    // Add last message info if available
    const lastMessage = await Message.findOne({ chatRoom: chatRoom._id })
      .sort({ createdAt: -1 })
      .limit(1);

    // Get unread count
    const unreadCount = await Message.countDocuments({
      chatRoom: chatRoom._id,
      sender: { $ne: req.user.id },
      read: false
    });

    const chatRoomResponse = {
      ...chatRoom.toObject(),
      otherParticipant,
      lastMessage,
      unreadCount
    };

    console.log('Sending chat room response:', {
      chatRoomId: chatRoom._id,
      participants: chatRoom.participants.map(p => p._id)
    });

    res.json(chatRoomResponse);
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// Get chat room messages
router.get('/room/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    const messages = await Message.find({ chatRoom: roomId })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/room/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    if (!chatRoom.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    const message = new Message({
      chatRoom: roomId,
      sender: req.user.id,
      content
    });

    await message.save();

    // Populate sender info before sending response
    await message.populate('sender', 'name profilePicture');

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single chat room by ID
router.get('/room/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('Fetching chat room:', roomId);

    const chatRoom = await ChatRoom.findById(roomId)
      .populate('participants', 'name profilePicture')
      .populate('request', 'title status');

    if (!chatRoom) {
      console.error('Chat room not found:', roomId);
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    if (!chatRoom.participants.some(p => p._id.toString() === req.user.id)) {
      console.error('User not authorized to view chat room:', {
        userId: req.user.id,
        roomId
      });
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    // Get the other participant's info
    const otherParticipant = chatRoom.participants.find(
      p => p._id.toString() !== req.user.id
    );

    // Add last message info if available
    const lastMessage = await Message.findOne({ chatRoom: roomId })
      .sort({ createdAt: -1 })
      .limit(1);

    // Get unread count
    const unreadCount = await Message.countDocuments({
      chatRoom: roomId,
      sender: { $ne: req.user.id },
      read: false
    });

    const chatRoomResponse = {
      ...chatRoom.toObject(),
      otherParticipant,
      lastMessage,
      unreadCount
    };

    console.log('Sending chat room response:', {
      chatRoomId: chatRoom._id,
      participants: chatRoom.participants.map(p => p._id)
    });

    res.json(chatRoomResponse);
  } catch (error) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 