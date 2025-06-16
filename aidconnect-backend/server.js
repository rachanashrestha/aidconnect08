const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require("./routes/userRoutes"); // update path if needed
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require('./routes/adminRoutes');
const requestRoutes = require('./routes/requestRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const requesterRoutes = require('./routes/requesterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const gratitudeRoutes = require('./routes/gratitudeRoutes');
const dotenv = require('dotenv');
const cors = require('cors');
const User = require("./models/User");
const Message = require("./models/Message");

dotenv.config();
const app = express();
const server = http.createServer(app);

// Create uploads directories if they don't exist
const uploadDirs = ['uploads', 'uploads/profiles', 'uploads/requests'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure CORS for both Express and Socket.IO
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: corsOptions
});

// Make io accessible to routes
app.set('io', io);

// Increase payload size limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.user._id);

  // Join user's personal room
  socket.join(socket.user._id);

  // Update user's online status
  socket.broadcast.emit('userStatus', {
    userId: socket.user._id,
    status: 'online'
  });

  // Handle private messages
  socket.on('privateMessage', async (data) => {
    try {
      const { receiverId, message } = data;
      
      // Emit to receiver
      io.to(receiverId).emit('newMessage', message);

      // Emit to sender
      socket.emit('messageSent', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Error sending message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    io.to(receiverId).emit('userTyping', {
      userId: socket.user._id,
      isTyping
    });
  });

  // Handle read receipts
  socket.on('markAsRead', async (data) => {
    try {
      const { messageIds } = data;
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          receiver: socket.user._id
        },
        { $set: { status: 'read', readAt: new Date() } }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user._id);
    socket.broadcast.emit('userStatus', {
      userId: socket.user._id,
      status: 'offline',
      lastSeen: new Date()
    });
  });
});

app.use("/api/user", userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/messages", messageRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/requester', requesterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/gratitude', gratitudeRoutes);

app.get("/", (req, res) => res.send("AidConnect Backend Running"));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB");
  server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}).catch(err => console.log(err));
