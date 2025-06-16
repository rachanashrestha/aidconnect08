const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
    },
    type: {
      type: String,
      enum: ["text", "image", "location"],
      default: "text",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    metadata: {
      type: Object,
      default: undefined,
      validate: {
        validator: function(metadata) {
          if (!metadata) return true;
          
          if (this.type === 'location') {
            return metadata.location && 
                   metadata.location.type === 'Point' && 
                   Array.isArray(metadata.location.coordinates) && 
                   metadata.location.coordinates.length === 2;
          }
          
          if (this.type === 'image') {
            return metadata.imageUrl && 
                   typeof metadata.imageUrl === 'string';
          }
          
          return true;
        },
        message: props => `Invalid metadata for message type ${props.type}`
      }
    },
    readAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create indexes for faster queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ request: 1 });

// Create geospatial index only for location messages
messageSchema.index({ "metadata.location": "2dsphere" }, { sparse: true });

// Prevent self-messaging
messageSchema.pre("save", function (next) {
  if (this.sender.toString() === this.receiver.toString()) {
    const error = new Error("Cannot send message to yourself");
    error.name = "ValidationError";
    return next(error);
  }
  next();
});

// Update message status to read when receiver reads it
messageSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "read") {
    this.status = "read";
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);
