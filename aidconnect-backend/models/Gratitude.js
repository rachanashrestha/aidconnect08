const mongoose = require('mongoose');

const gratitudeSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
gratitudeSchema.index({ sender: 1, recipient: 1 });
gratitudeSchema.index({ request: 1 });

module.exports = mongoose.model('Gratitude', gratitudeSchema); 