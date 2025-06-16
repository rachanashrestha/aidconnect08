const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Ensure participants array has exactly 2 unique users
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('Conversation must have exactly 2 participants'));
  }
  
  // Check for duplicate participants
  const uniqueParticipants = new Set(this.participants.map(p => p.toString()));
  if (uniqueParticipants.size !== 2) {
    next(new Error('Conversation must have 2 unique participants'));
  }
  
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 