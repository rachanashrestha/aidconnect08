const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true,
    required: true
  },
  address: {
    type: String,
    trim: true,
    required: false
  },
  bio: { type: String },
  role: {
    type: String,
    enum: ['requester', 'volunteer', 'admin'],
    default: 'requester'
  },
  isBlocked: { type: Boolean, default: false },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  profilePicture: {
    type: String,
    default: 'default-avatar.png'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    formattedAddress: String
  },
  availabilityStatus: { 
    type: String, 
    enum: ['online', 'offline', 'on_duty'],
    default: 'offline'
  },
  assignedArea: { type: String },
  completedRequests: { type: Number, default: 0 },
  volunteerStats: {
    totalHours: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  badges: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create a geospatial index for location queries
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update volunteer streak
userSchema.methods.updateStreak = async function() {
  const today = new Date();
  const lastActive = this.volunteerStats.lastActive;
  
  if (!lastActive) {
    this.volunteerStats.currentStreak = 1;
  } else {
    const lastActiveDate = new Date(lastActive);
    const diffDays = Math.floor((today - lastActiveDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      this.volunteerStats.currentStreak += 1;
      if (this.volunteerStats.currentStreak > this.volunteerStats.longestStreak) {
        this.volunteerStats.longestStreak = this.volunteerStats.currentStreak;
      }
    } else if (diffDays > 1) {
      this.volunteerStats.currentStreak = 1;
    }
  }
  
  this.volunteerStats.lastActive = today;
  await this.save();
};

// Method to add a badge
userSchema.methods.addBadge = async function(badge) {
  if (!this.badges.some(b => b.name === badge.name)) {
    this.badges.push(badge);
    await this.save();
  }
};

// Method to update rating
userSchema.methods.updateRating = async function(newRating) {
  const { totalRatings, averageRating } = this.volunteerStats;
  this.volunteerStats.totalRatings += 1;
  this.volunteerStats.averageRating = 
    ((averageRating * totalRatings) + newRating) / (totalRatings + 1);
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
