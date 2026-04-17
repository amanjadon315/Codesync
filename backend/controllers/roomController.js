const Room = require('../models/Room');
const File = require('../models/File');

// POST /api/rooms/create
const createRoom = async (req, res) => {
  try {
    const { roomName, language } = req.body;
    if (!roomName) return res.status(400).json({ message: 'Room name required' });

    const room = await Room.create({
      roomName,
      hostUserId: req.user._id,
      language: language || 'javascript',
    });

    // Seed a default file
    await File.create({
      roomId: room._id,
      fileName: language === 'python' ? 'main.py' : 'index.js',
      language: language || 'javascript',
      codeContent: getBoilerplate(language || 'javascript'),
    });

    res.status(201).json({ room });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ message: 'Failed to create room' });
  }
};

// GET /api/rooms/:roomId
const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId }).populate(
      'hostUserId',
      'name email color'
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const files = await File.find({ roomId: room._id }).select('-versions -codeContent');
    res.json({ room, files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch room' });
  }
};

// GET /api/rooms  — list rooms for current user
const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ hostUserId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list rooms' });
  }
};

// DELETE /api/rooms/:roomId
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (String(room.hostUserId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only host can delete room' });
    }
    await File.deleteMany({ roomId: room._id });
    await room.deleteOne();
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete room' });
  }
};

function getBoilerplate(language) {
  const templates = {
    javascript: `// Welcome to CodeSync!\nconsole.log("Hello, World!");\n`,
    typescript: `// Welcome to CodeSync!\nconst greet = (name: string): string => {\n  return \`Hello, \${name}!\`;\n};\nconsole.log(greet("World"));\n`,
    python: `# Welcome to CodeSync!\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
  };
  return templates[language] || templates.javascript;
}

module.exports = { createRoom, getRoom, listRooms, deleteRoom };
