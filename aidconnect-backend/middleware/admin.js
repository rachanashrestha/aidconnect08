const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminOnly = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
      }

    req.user = user;
    next();
  } catch (err) {
    console.error('Admin Middleware Error:', err); 
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { adminOnly };
