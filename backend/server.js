require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const fileRoutes = require('./routes/files');
const projectRoutes = require('./routes/projects');
const { initSocketHandlers } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Redis clients (pub/sub for scaling across multiple Node instances)
const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis pub error:', err));
subClient.on('error', (err) => console.error('Redis sub error:', err));

// Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // For production scaling, use @socket.io/redis-adapter:
  // adapter: createAdapter(pubClient, subClient)
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/projects', projectRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codesync')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Initialize all Socket.io event handlers
initSocketHandlers(io, pubClient, subClient);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CodeSync server running on port ${PORT}`);
});
