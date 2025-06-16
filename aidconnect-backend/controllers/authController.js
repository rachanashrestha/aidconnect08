const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const signup = async (req, res) => {
  try {
    console.log('Signup request received:', { body: req.body });
    
    const { name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      console.log('Missing required fields:', { name, email, password, phone });
      return res.status(400).json({ message: "Name, email, password, and phone number are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    console.log('Checking for existing user with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Create new user
    console.log('Creating new user:', { name, email, role, phone });
    const user = new User({
      name,
      email,
      password, // Will be hashed by the User model pre-save hook
      role: role || 'requester',
      phone,
      location: {
        type: 'Point',
        coordinates: [0, 0], // Default coordinates
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        },
        formattedAddress: 'Location not specified'
      }
    });

    console.log('Saving user to database...');
    await user.save();
    console.log('User saved successfully:', user._id);

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: "Server configuration error" });
    }

    console.log('Generating JWT token...');
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send response without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Signup error details:', error);
    res.status(500).json({ 
      message: "Error creating user",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        email: user.email 
      }, 
      process.env.JWT_SECRET, 
      {
        expiresIn: '2d',
        algorithm: 'HS256'
      }
    );

    // Calculate token expiration time
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    res.status(200).json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        role: user.role,
        email: user.email 
      },
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

module.exports = { signup, login };
