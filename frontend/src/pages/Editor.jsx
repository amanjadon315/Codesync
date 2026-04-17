import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useCollaboration } from '../hooks/useCollaboration';
import api from '../services/api';

import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Editor/OutputPanel';
import FileExplorer from '../components/FileExplorer/FileExplorer';
import UsersPanel from '../components/Users/UsersPanel';
import ChatPanel from '../components/Chat/ChatPanel';

const AUTOSAVE_INTERVAL = 5000;

function applyOp(content, op) {
  if (!op) return content;
  if (op.type === 'insert') {
    const pos = Math.min(op.position, content.length);
    return content.slice(0, pos) + op.text + content.slice(pos);
  }
  if (op.type === 'delete') {
    const pos = Math.min(op.position, content.length);
    const len = Math.min(op.length, content.length - pos);
    return content.slice(0, pos) + content.slice(pos + len);
  }
  if (op.type === 'full_replace') return op.content ?? content;
  return content;
}

export default function Editor() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit, on } = useSocket();

  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState('users');
  const [outputLines, setOutputLines] = useState([]);
  const [showOutput, setShowOutput] = useState(false);
  const [running, setRunning] = useState(false);

  const contentRef = useRef('');
  const autoSaveTimer = useRef(null);
  const typingTimerRef = useRef(null);

  const {
    roomUsers,
    cursors,
    typingUsers,
    sendOp,
    sendFullSync,
    sendCursor,
    sendTyping,
    sendAutoSave,
  } = useCollaboration({
    roomId,
    fileId: activeFile?._id,
    user: user ? { _id: user._id, name: user.name, color: user.color } : null,
    onRemoteOp: (op) => {
      const next = applyOp(contentRef.current, op);
      contentRef.current = next;
      setEditorContent(next);
    },
    onFileLoaded: ({ content, language: lang }) => {
      setEditorContent(content);
      contentRef.current = content;
      if (lang) setLanguage(lang);
    },
  });

  useEffect(() => {
    if (!roomId) return;
    api.get(`/projects/${roomId}`)
      .then((res) => {
        setRoom(res.data.room);
        setFiles(res.data.files);
        if (res.data.files.length > 0) {
          const first = res.data.files[0];
          setActiveFile(first);
          setEditorContent(first.codeContent || '');
          contentRef.current = first.codeContent || '';
          setLanguage(first.language || 'javascript');
        }
      })
      .catch(() => { toast.error('Room not found'); navigate('/dashboard'); })
      .finally(() => setLoading(false));
  }, [roomId, navigate]);

  useEffect(() => {
    if (!activeFile) return;
    clearInterval(autoSaveTimer.current);
    autoSaveTimer.current = setInterval(() => {
      sendAutoSave(contentRef.current);
      api.put('/files/update', {
        fileId: activeFile._id,
        codeContent: contentRef.current,
        userId: user?._id,
      }).catch(() => {});
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(autoSaveTimer.current);
  }, [activeFile?._id]);

  useEffect(() => {
    on('run_output', ({ output, type }) => {
      setRunning(false);
      setShowOutput(true);
      setOutputLines((prev) => [...prev, { text: output, type }]);
    });
  }, []);

  const handleEditorChange = useCallback((op, fullValue) => {
    contentRef.current = fullValue;
    setEditorContent(fullValue);
    if (op.type === 'full_replace') sendFullSync(fullValue);
    else sendOp(op);
    sendTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 1500);
  }, [sendOp, sendFullSync, sendTyping]);

  const handleFileSelect = useCallback((file) => {
    if (file._id === activeFile?._id) return;
    if (activeFile) sendAutoSave(contentRef.current);
    setActiveFile(file);
    emit('file_switch', { fileId: file._id, roomId });
  }, [activeFile?._id, roomId, emit, sendAutoSave]);

  const handleRunCode = useCallback(() => {
    if (running) return;
    setRunning(true);
    setShowOutput(true);
    setOutputLines([{ text: `Running ${language}...`, type: 'info' }]);
    emit('run_code', { roomId, language, code: contentRef.current });
  }, [running, roomId, language, emit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#0d1117' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono" style={{ color: '#8b949e' }}>Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0d1117', color: '#e6edf3', fontFamily: 'JetBrains Mono, monospace' }}>
      {/* TOPBAR */}
      <header className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ background: '#161b22', borderBottom: '1px solid #30363d', minHeight: 46 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="font-bold text-base" style={{ color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Code<span style={{ color: '#38bdf8' }}>Sync</span>
          </button>
          <span style={{ color: '#30363d' }}>›</span>
          <span className="text-sm font-medium truncate" style={{ maxWidth: 160 }}>{room?.roomName || roomId}</span>
          <button
            title="Click to copy room code"
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              toast.success(`Room code copied: ${roomId}`);
            }}
            style={{ background: '#21262d', border: '1px solid #4ade8066', color: '#4ade80', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.04em' }}
          >
            {roomId} 📋
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />
            <span className="text-xs" style={{ color: '#8b949e' }}>{roomUsers.length} online</span>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: -4 }}>
          {roomUsers.slice(0, 5).map((u, i) => (
            <div key={u.socketId || i} title={u.name} style={{ width: 26, height: 26, borderRadius: '50%', background: u.color || '#4ade80', border: '2px solid #0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000', marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }}>
              {u.name?.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
            {['javascript','typescript','python','cpp','java'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={() => {
              const link = `${window.location.origin}/editor/${roomId}`;
              navigator.clipboard.writeText(link);
              toast.success(
                `Room link copied!\nCode: ${roomId}`,
                { duration: 3000, style: { whiteSpace: 'pre-line' } }
              );
            }}
            style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Share
          </button>
          <button onClick={handleRunCode} disabled={running} style={{ background: running ? '#2a4a2a' : '#4ade80', color: '#000', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: running ? 0.7 : 1 }}>
            {running ? 'Running...' : '▶ Run'}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <FileExplorer roomId={room?._id} files={files} activeFileId={activeFile?._id} onFileSelect={handleFileSelect} onFilesChange={setFiles} />

        {/* Editor + Output */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center flex-shrink-0" style={{ background: '#1c2128', borderBottom: '1px solid #30363d', minHeight: 34 }}>
            {activeFile && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ color: '#e6edf3', borderBottom: '2px solid #38bdf8', background: '#0d1117' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#38bdf8' }} />
                {activeFile.fileName}
              </div>
            )}
            {Object.keys(typingUsers).length > 0 && (
              <div className="ml-auto flex items-center gap-2 px-4 text-xs" style={{ color: '#8b949e' }}>
                <div className="flex gap-0.5 items-end" style={{ height: 12 }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} style={{ width: 3, background: '#4ade80', borderRadius: 2, height: 4, animation: `typingWave 1s ease-in-out ${d}s infinite` }} />
                  ))}
                </div>
                {Object.values(typingUsers).join(', ')} typing...
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor
              content={editorContent}
              language={language}
              onChange={handleEditorChange}
              onCursorChange={sendCursor}
              remoteCursors={cursors}
            />
          </div>

          {showOutput && (
            <OutputPanel lines={outputLines} onClear={() => setOutputLines([])} onClose={() => setShowOutput(false)} />
          )}
        </div>

        {/* Right Panel */}
        <aside className="flex flex-col flex-shrink-0" style={{ width: 220, background: '#161b22', borderLeft: '1px solid #30363d' }}>
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid #30363d' }}>
            {['users', 'chat'].map((tab) => (
              <button key={tab} onClick={() => setRightTab(tab)} style={{ flex: 1, padding: '8px 0', fontSize: 12, color: rightTab === tab ? '#e6edf3' : '#8b949e', background: 'none', border: 'none', borderBottom: rightTab === tab ? '2px solid #4ade80' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                {tab}{tab === 'users' && roomUsers.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, background: '#21262d', borderRadius: 8, padding: '1px 5px', color: '#8b949e' }}>{roomUsers.length}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === 'users'
              ? <UsersPanel users={roomUsers} typingUsers={typingUsers} roomId={roomId} />
              : <ChatPanel roomId={roomId} user={user ? { _id: user._id, name: user.name, color: user.color } : {}} />
            }
          </div>
        </aside>
      </div>
    </div>
  );
}
