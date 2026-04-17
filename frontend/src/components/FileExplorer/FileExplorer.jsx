import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EXT_COLORS = {
  js: '#f7df1e', ts: '#3178c6', py: '#3572A5',
  cpp: '#f34b7d', java: '#b07219', css: '#563d7c',
  html: '#e34c26', md: '#083fa1',
};

function getExt(name) {
  return name.split('.').pop().toLowerCase();
}

export default function FileExplorer({ roomId, files, activeFileId, onFileSelect, onFilesChange }) {
  const [newFileName, setNewFileName] = useState('');
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) return;
    try {
      const res = await api.post('/files/create', { roomId, fileName: name });
      onFilesChange([...files, res.data.file]);
      setNewFileName('');
      setAdding(false);
      onFileSelect(res.data.file);
      toast.success(`Created ${name}`);
    } catch {
      toast.error('Failed to create file');
    }
  };

  const handleDelete = async (fileId, fileName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${fileName}?`)) return;
    try {
      await api.delete('/files/delete', { data: { fileId } });
      const updated = files.filter((f) => f._id !== fileId);
      onFilesChange(updated);
      if (activeFileId === fileId && updated.length > 0) {
        onFileSelect(updated[0]);
      }
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleRename = async (fileId) => {
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    try {
      await api.put('/files/update', { fileId, fileName: name });
      onFilesChange(files.map((f) => (f._id === fileId ? { ...f, fileName: name } : f)));
      toast.success('Renamed');
    } catch {
      toast.error('Rename failed');
    } finally {
      setRenamingId(null);
    }
  };

  return (
    <aside
      className="flex flex-col h-full select-none"
      style={{ background: '#161b22', borderRight: '1px solid #30363d', width: 200, minWidth: 160 }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: '#30363d' }}
      >
        <span className="text-xs uppercase tracking-widest text-editor-muted font-semibold">
          Explorer
        </span>
        <button
          onClick={() => setAdding(true)}
          title="New file"
          className="text-editor-muted hover:text-green-400 text-lg leading-none transition-colors"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => {
          const ext = getExt(file.fileName);
          const color = EXT_COLORS[ext] || '#8b949e';
          const isActive = file._id === activeFileId;

          return (
            <div
              key={file._id}
              onClick={() => onFileSelect(file)}
              className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors"
              style={{
                background: isActive ? '#21262d' : 'transparent',
                color: isActive ? '#e6edf3' : '#8b949e',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = '#1c2128';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Dot indicator */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: color }}
              />

              {renamingId === file._id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(file._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(file._id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent outline-none text-xs text-editor-text"
                />
              ) : (
                <span className="flex-1 truncate text-xs">{file.fileName}</span>
              )}

              {/* Actions */}
              <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(file._id);
                    setRenameValue(file.fileName);
                  }}
                  className="text-editor-muted hover:text-sky-400 text-xs"
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => handleDelete(file._id, file.fileName, e)}
                  className="text-editor-muted hover:text-red-400 text-xs"
                  title="Delete"
                >
                  ✕
                </button>
              </span>
            </div>
          );
        })}

        {adding && (
          <form onSubmit={handleCreate} className="px-3 py-1.5">
            <input
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => !newFileName && setAdding(false)}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              placeholder="filename.js"
              className="w-full bg-transparent border-b text-xs text-editor-text outline-none pb-0.5"
              style={{ borderColor: '#4ade80' }}
            />
          </form>
        )}
      </div>

      {/* Footer: auto-save indicator */}
      <div
        className="px-3 py-2 text-xs text-editor-muted border-t"
        style={{ borderColor: '#30363d' }}
      >
        Auto-saving…
      </div>
    </aside>
  );
}
