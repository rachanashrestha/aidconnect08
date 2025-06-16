const User = require('../models/User');

const requester = async (req, res, next) => {
  try {
    console.log('Requester Middleware - Starting verification');
    console.log('Requester Middleware - User from auth:', req.user);
    
    if (!req.user) {
      console.log('Requester Middleware - No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id);
    console.log('Requester Middleware - User found:', user ? { id: user._id, role: user.role } : 'Not found');

    if (!user) {
      console.log('Requester Middleware - User not found');
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'requester') {
      console.log('Requester Middleware - User is not a requester:', user.role);
      return res.status(403).json({ message: 'Access denied. Requester role required.' });
    }

    console.log('Requester Middleware - Verification successful');
    req.user = user;
    next();
  } catch (error) {
    console.error('Requester Middleware Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { requester }; 