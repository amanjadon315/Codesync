const express = require('express');
const router = express.Router();
const File = require('../models/File');
const Room = require('../models/Room');
const { protect } = require('../middlewares/authMiddleware');

// GET /api/projects/:roomId — all files with content for a room
router.get('/:roomId', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const files = await File.find({ roomId: room._id });
    res.json({ room, files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load project' });
  }
});

module.exports = router;
