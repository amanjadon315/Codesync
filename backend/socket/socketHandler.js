const Room = require('../models/Room');
const File = require('../models/File');
const Message = require('../models/Message');
const otEngine = require('./otEngine');
const { verifySocketToken } = require('../middlewares/authMiddleware');

// roomId -> Map<socketId, userInfo>
const roomUsers = new Map();

function initSocketHandlers(io, pubClient, subClient) {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const decoded = verifySocketToken(token);
    if (!decoded) return next(new Error('Authentication error'));
    socket.userId = decoded.id;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ── JOIN ROOM ────────────────────────────────────────────────
    socket.on('join_room', async ({ roomId, user, fileId }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.currentFile = fileId;
        socket.userInfo = user;

        // Track user in room
        if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
        roomUsers.get(roomId).set(socket.id, { ...user, socketId: socket.id });

        // Load initial file content
        if (fileId) {
          const file = await File.findById(fileId);
          if (file) {
            otEngine.initDocument(fileId, file.codeContent, file.version);
            socket.emit('file_loaded', {
              fileId,
              content: file.codeContent,
              version: file.version,
              language: file.language,
            });
          }
        }

        // Broadcast updated user list to room
        const users = Array.from(roomUsers.get(roomId).values());
        io.to(roomId).emit('room_users', { users });

        // Notify others
        socket.to(roomId).emit('user_joined', {
          user,
          message: `${user.name} joined the room`,
        });

        // Save join message to DB
        await Message.create({
          roomId: room._id,
          userName: user.name,
          userColor: user.color,
          text: `${user.name} joined the room`,
          type: 'system',
        });

      } catch (err) {
        console.error('join_room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── CODE CHANGE (OT) ─────────────────────────────────────────
    socket.on('code_change', ({ fileId, op, roomId }) => {
      if (!fileId || !op) return;

      const transformedOp = otEngine.applyOp(fileId, op);
      if (!transformedOp) return;

      // Broadcast transformed op to everyone else in room
      socket.to(roomId).emit('code_change', {
        fileId,
        op: transformedOp,
        senderId: socket.id,
      });

      // Acknowledge to sender with server version
      socket.emit('op_ack', { fileId, version: transformedOp.version });
    });

    // ── FULL CONTENT SYNC (fallback for large pastes) ────────────
    socket.on('full_sync', ({ fileId, content, roomId }) => {
      const doc = otEngine.getDocument(fileId);
      if (doc) {
        doc.content = content;
        doc.version += 1;
      }
      socket.to(roomId).emit('full_sync', { fileId, content });
    });

    // ── CURSOR MOVE ──────────────────────────────────────────────
    socket.on('cursor_move', ({ roomId, fileId, cursor, user }) => {
      socket.to(roomId).emit('cursor_move', {
        socketId: socket.id,
        fileId,
        cursor, // { lineNumber, column }
        user,
      });
    });

    // ── TYPING INDICATOR ─────────────────────────────────────────
    socket.on('typing', ({ roomId, user, isTyping }) => {
      socket.to(roomId).emit('typing', { socketId: socket.id, user, isTyping });
    });

    // ── FILE SWITCH ──────────────────────────────────────────────
    socket.on('file_switch', async ({ fileId, roomId }) => {
      socket.currentFile = fileId;
      try {
        const file = await File.findById(fileId);
        if (!file) return;

        otEngine.initDocument(fileId, file.codeContent, file.version);
        socket.emit('file_loaded', {
          fileId,
          content: file.codeContent,
          version: file.version,
          language: file.language,
        });
      } catch (err) {
        console.error('file_switch error:', err);
      }
    });

    // ── CHAT MESSAGE ─────────────────────────────────────────────
    socket.on('chat_message', async ({ roomId, text, user }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        const message = await Message.create({
          roomId: room._id,
          userId: socket.userId,
          userName: user.name,
          userColor: user.color,
          text,
          type: 'chat',
        });

        io.to(roomId).emit('chat_message', {
          _id: message._id,
          userName: user.name,
          userColor: user.color,
          text,
          timestamp: message.createdAt,
        });
      } catch (err) {
        console.error('chat_message error:', err);
      }
    });

    // ── RUN CODE ─────────────────────────────────────────────────
    socket.on('run_code', async ({ roomId, language, code }) => {
      socket.emit('run_output', { output: 'Running...', type: 'info' });
      try {
        const { runCode } = require('../utils/codeRunner');
        const result = await runCode(language, code);
        socket.emit('run_output', { output: result.output, type: result.error ? 'error' : 'success' });
      } catch (err) {
        socket.emit('run_output', { output: `Execution error: ${err.message}`, type: 'error' });
      }
    });

    // ── AUTO-SAVE ────────────────────────────────────────────────
    socket.on('auto_save', async ({ fileId, content, userId }) => {
      try {
        const doc = otEngine.getDocument(fileId);
        const version = doc ? doc.version : 0;

        await File.findByIdAndUpdate(fileId, {
          codeContent: content,
          version,
          lastModifiedBy: userId,
        });
      } catch (err) {
        console.error('auto_save error:', err);
      }
    });

    // ── DISCONNECT ───────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);
        if (roomUsers.get(roomId).size === 0) roomUsers.delete(roomId);
      }

      const users = roomUsers.has(roomId)
        ? Array.from(roomUsers.get(roomId).values())
        : [];

      io.to(roomId).emit('room_users', { users });
      socket.to(roomId).emit('user_left', {
        socketId: socket.id,
        user: socket.userInfo,
      });

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocketHandlers };
