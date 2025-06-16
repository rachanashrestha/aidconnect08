const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require("../models/User");
const Request = require("../models/Request");
const Message = require("../models/Message");
const { auth } = require("../middleware/authMiddleware");
const { requester } = require("../middleware/requester");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/requests';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Get requester's statistics
router.get("/stats", auth, requester, async (req, res) => {
  try {
    const requests = await Request.find({ requester: req.user._id });
    
    const stats = {
      totalRequests: requests.length,
      requestsByStatus: {
        pending: requests.filter(r => r.status === 'pending').length,
        in_progress: requests.filter(r => r.status === 'in_progress').length,
        fulfilled: requests.filter(r => r.status === 'fulfilled').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length
      },
      recentRequests: await Request.find({ requester: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('requester', 'name email')
        .populate('volunteer', 'name email')
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching requester stats:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
});

// Get all requests for the requester
router.get("/requests", auth, requester, async (req, res) => {
  try {
    const requests = await Request.find({ requester: req.user._id })
      .sort({ createdAt: -1 })
      .populate("volunteer", "name email");
    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// Create a new request
router.post("/requests", auth, requester, upload.array('images', 2), async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    console.log('Received files:', req.files);

    const requestData = {
      ...req.body,
      requester: req.user._id,
      status: "pending"
    };

    // Handle location data
    if (typeof requestData.location === 'string') {
      try {
        requestData.location = JSON.parse(requestData.location);
      } catch (error) {
        console.error('Error parsing location data:', error);
        return res.status(400).json({ 
          message: "Invalid location data format",
          error: error.message 
        });
      }
    }

    // Validate required fields
    if (!requestData.title || !requestData.description || !requestData.category || !requestData.emergencyLevel) {
      return res.status(400).json({ 
        message: "Missing required fields",
        required: ['title', 'description', 'category', 'emergencyLevel']
      });
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      requestData.attachments = req.files.map(file => ({
        path: file.path.replace(/\\/g, '/'), // Convert Windows paths to forward slashes
        description: 'Request image'
      }));
    }

    console.log('Creating request with data:', requestData);

    const request = new Request(requestData);
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating request:", error);
    // Delete uploaded files if request creation fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    res.status(500).json({ 
      message: "Error creating request",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get a specific request
router.get("/requests/:id", auth, requester, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      requester: req.user._id
    }).populate("volunteer", "name email");
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    
    res.json(request);
  } catch (error) {
    console.error("Error fetching request:", error);
    res.status(500).json({ message: "Error fetching request" });
  }
});

// Cancel a request
router.post("/requests/:id/cancel", auth, requester, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      requester: req.user._id,
      status: "pending"
    });
    
    if (!request) {
      return res.status(404).json({ message: "Request not found or cannot be cancelled" });
    }
    
    request.status = "cancelled";
    await request.save();
    
    res.json(request);
  } catch (error) {
    console.error("Error cancelling request:", error);
    res.status(500).json({ message: "Error cancelling request" });
  }
});

// Submit feedback for a completed request
router.post("/requests/:id/feedback", auth, requester, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      requester: req.user._id,
      status: "completed"
    });
    
    if (!request) {
      return res.status(404).json({ message: "Request not found or cannot be rated" });
    }
    
    request.feedback = {
      rating: req.body.rating,
      comment: req.body.comment
    };
    await request.save();
    
    res.json(request);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Error submitting feedback" });
  }
});

// Get all users (for messaging)
router.get("/users", auth, requester, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("name email role")
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get messages with a specific user
router.get("/messages/:userId", auth, requester, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    })
      .populate("sender", "name")
      .populate("receiver", "name")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send a message
router.post("/messages", auth, requester, async (req, res) => {
  try {
    const { receiver, text } = req.body;

    if (!receiver || !text) {
      return res.status(400).json({ message: "Receiver and message text are required" });
    }

    const newMessage = new Message({
      sender: req.user._id,
      receiver,
      text,
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router; 