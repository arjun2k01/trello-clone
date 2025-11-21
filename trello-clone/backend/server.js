require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const boardRoutes = require('./src/routes/boardRoutes');
const cardRoutes = require('./src/routes/cardRoutes');

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join board room
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
    console.log(`User ${socket.id} joined board ${boardId}`);
    socket.to(boardId).emit('user_joined', { userId: socket.id });
  });

  // Leave board room
  socket.on('leave_board', (boardId) => {
    socket.leave(boardId);
    console.log(`User ${socket.id} left board ${boardId}`);
    socket.to(boardId).emit('user_left', { userId: socket.id });
  });

  // Card created
  socket.on('card_created', (data) => {
    socket.to(data.boardId).emit('card_created', data);
  });

  // Card updated
  socket.on('card_updated', (data) => {
    socket.to(data.boardId).emit('card_updated', data);
  });

  // Card moved
  socket.on('card_moved', (data) => {
    socket.to(data.boardId).emit('card_moved', data);
  });

  // Card deleted
  socket.on('card_deleted', (data) => {
    socket.to(data.boardId).emit('card_deleted', data);
  });

  // List created
  socket.on('list_created', (data) => {
    socket.to(data.boardId).emit('list_created', data);
  });

  // List updated
  socket.on('list_updated', (data) => {
    socket.to(data.boardId).emit('list_updated', data);
  });

  // User typing
  socket.on('typing', (data) => {
    socket.to(data.boardId).emit('typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/cards', cardRoutes);
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io server ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

module.exports = { app, io };