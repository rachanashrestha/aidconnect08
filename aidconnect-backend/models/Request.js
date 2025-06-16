const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    enum: ['medical', 'food', 'transportation', 'shelter', 'other']
  },
  emergencyLevel: { 
    type: String, 
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium'
  },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  volunteer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  assignedAt: { type: Date },
  completedAt: { type: Date },
  estimatedDuration: { type: Number }, // in minutes
  priority: {
    type: Number,
    default: 0
  },
  attachments: [{
    path: { type: String, required: true },
    description: String
  }],
  notes: [{
    text: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a 2dsphere index for geospatial queries
requestSchema.index({ location: '2dsphere' });

// Calculate priority based on emergency level and time
requestSchema.pre('save', function(next) {
  const emergencyLevelWeights = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'urgent': 4
  };
  
  const timeWeight = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60)); // hours since creation
  
  this.priority = emergencyLevelWeights[this.emergencyLevel] + timeWeight;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Request', requestSchema); 