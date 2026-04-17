const File = require('../models/File');
const Room = require('../models/Room');

// GET /api/files/:fileId — full content
const getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch file' });
  }
};

// POST /api/files/create
const createFile = async (req, res) => {
  try {
    const { roomId, fileName } = req.body;
    if (!roomId || !fileName) {
      return res.status(400).json({ message: 'roomId and fileName required' });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const language = File.detectLanguage(fileName);
    const file = await File.create({ roomId, fileName, language });
    res.status(201).json({ file });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create file' });
  }
};

// PUT /api/files/update — auto-save from client
const updateFile = async (req, res) => {
  try {
    const { fileId, codeContent, userId } = req.body;
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Save version snapshot every 10 versions
    if (file.version % 10 === 0) {
      file.versions.push({ content: file.codeContent, savedBy: userId });
      if (file.versions.length > 20) file.versions.shift(); // keep last 20 snapshots
    }

    file.codeContent = codeContent;
    file.version += 1;
    file.lastModifiedBy = userId;
    await file.save();

    res.json({ message: 'Saved', version: file.version });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save file' });
  }
};

// DELETE /api/files/delete
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.body;
    await File.findByIdAndDelete(fileId);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// GET /api/files/:fileId/history
const getHistory = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId).select('versions fileName');
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json({ versions: file.versions.reverse() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

module.exports = { getFile, createFile, updateFile, deleteFile, getHistory };
