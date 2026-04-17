const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      default: () => uuidv4().slice(0, 8), // short human-readable room code
      unique: true,
    },
    roomName: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: 80,
    },
    hostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activeUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        color: String,
        socketId: String,
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    language: {
      type: String,
      default: 'javascript',
      enum: ['javascript', 'typescript', 'python', 'cpp', 'java'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
