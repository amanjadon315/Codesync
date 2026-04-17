const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: { type: String, required: true },
    userColor: { type: String, default: '#4ade80' },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['chat', 'system'], // 'system' for join/leave notices
      default: 'chat',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
