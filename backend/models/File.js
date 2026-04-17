const mongoose = require('mongoose');

// Version snapshot — stored for history
const versionSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  savedAt: { type: Date, default: Date.now },
});

const fileSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      default: 'untitled.js',
    },
    language: {
      type: String,
      default: 'javascript',
      enum: ['javascript', 'typescript', 'python', 'cpp', 'java', 'css', 'html', 'markdown'],
    },
    codeContent: {
      type: String,
      default: '',
    },
    // OT document version counter — incremented on every accepted change
    version: {
      type: Number,
      default: 0,
    },
    versions: [versionSchema], // last N snapshots
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Detect language from file extension
fileSchema.statics.detectLanguage = function (fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    cpp: 'cpp',
    cc: 'cpp',
    java: 'java',
    css: 'css',
    html: 'html',
    md: 'markdown',
  };
  return map[ext] || 'javascript';
};

module.exports = mongoose.model('File', fileSchema);
