const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const User = require("../models/User"); // adjust path if needed
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Request = require('../models/Request');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
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
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// View profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email, phone, address, bio } = req.body;

    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name, 
        email, 
        phone, 
        address, 
        bio,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating profile:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Upload profile picture
router.post("/profile/picture", auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      // Delete the uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPicturePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }

    // Update user's profile picture
    const relativePath = path.join('uploads', 'profiles', req.file.filename).replace(/\\/g, '/');
    
    // Update only the profile picture field
    const updateData = {
      profilePicture: '/' + relativePath,
      updatedAt: Date.now()
    };

    // Use findByIdAndUpdate with runValidators: false to skip validation
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: false }
    ).select("-password");

    if (!updatedUser) {
      // Delete the uploaded file if update fails
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "Profile picture updated successfully",
      profilePicture: updatedUser.profilePicture
    });
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    // Delete the uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Get user profile by ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -__v')
      .populate('completedRequests', 'title status createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's average rating if they are a volunteer
    if (user.role === 'volunteer') {
      const ratings = await Request.find({
        volunteer: user._id,
        status: 'completed',
        rating: { $exists: true }
      });

      const totalRatings = ratings.length;
      const averageRating = totalRatings > 0
        ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings
        : 0;

      user.averageRating = averageRating;
      user.totalRatings = totalRatings;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's requests
router.get('/:userId/requests', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let requests;
    if (user.role === 'volunteer') {
      // Get requests where user is the volunteer
      requests = await Request.find({ volunteer: userId })
        .populate('requester', 'name email profilePicture')
        .sort({ createdAt: -1 });
    } else {
      // Get requests where user is the requester
      requests = await Request.find({ requester: userId })
        .populate('volunteer', 'name email profilePicture')
        .sort({ createdAt: -1 });
    }

    res.json(requests);
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
