const User = require('../models/User');

const volunteerOnly = async (req, res, next) => {
  try {
    console.log('Volunteer Middleware - Starting verification');
    console.log('Volunteer Middleware - User from auth:', req.user);
    
    if (!req.user) {
      console.log('Volunteer Middleware - No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id);
    console.log('Volunteer Middleware - User found:', user ? { id: user._id, role: user.role } : 'Not found');

    if (!user) {
      console.log('Volunteer Middleware - User not found');
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'volunteer') {
      console.log('Volunteer Middleware - User is not a volunteer:', user.role);
      return res.status(403).json({ message: 'Access denied. Volunteer role required.' });
    }

    console.log('Volunteer Middleware - Verification successful');
    req.user = user;
    next();
  } catch (error) {
    console.error('Volunteer Middleware Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { volunteerOnly }; 