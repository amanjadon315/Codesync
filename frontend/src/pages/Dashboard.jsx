import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const LANGUAGE_OPTIONS = ['javascript', 'typescript', 'python', 'cpp', 'java'];
const LANG_COLORS = {
  javascript: '#f7df1e',
  typescript: '#3178c6',
  python: '#3572A5',
  cpp: '#f34b7d',
  java: '#b07219',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomName: '', language: 'javascript' });
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get('/rooms')
      .then((res) => setRooms(res.data.rooms))
      .catch(() => toast.error('Failed to load rooms'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoom.roomName.trim()) return toast.error('Room name required');
    setCreating(true);
    try {
      const res = await api.post('/rooms/create', newRoom);
      const { roomId } = res.data.room;
      toast.success('Room created!');
      navigate(`/editor/${roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return toast.error('Enter a room code');
    navigate(`/editor/${code}`);
  };

  const handleDelete = async (roomId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room and all its files?')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-editor-bg text-editor-text">
      {/* Topbar */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ background: '#161b22', borderColor: '#30363d' }}
      >
        <span className="text-xl font-bold font-mono">
          <span className="text-green-400">Code</span>
          <span className="text-sky-400">Sync</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-editor-muted">{user?.name}</span>
          <button
            onClick={() => navigate('/profile')}
            className="text-xs text-editor-muted hover:text-editor-text transition-colors"
          >
            Profile
          </button>
          <button
            onClick={logout}
            className="text-xs text-editor-muted hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">My workspace</h1>
            <p className="text-editor-muted text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoin(true)}
              className="px-4 py-2 rounded-lg text-sm border text-editor-muted hover:text-editor-text transition-colors"
              style={{ borderColor: '#30363d', background: '#21262d' }}
            >
              Join room
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-400 text-black hover:bg-green-300 transition-colors"
            >
              + New room
            </button>
          </div>
        </div>

        {/* Rooms grid */}
        {loading ? (
          <div className="text-center text-editor-muted py-16">Loading rooms…</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-editor-muted text-lg">No rooms yet</p>
            <p className="text-editor-muted text-sm mt-2">Create a room to start collaborating</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold bg-green-400 text-black hover:bg-green-300 transition-colors"
            >
              Create your first room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => navigate(`/editor/${room.roomId}`)}
                className="rounded-xl p-5 border cursor-pointer hover:border-green-400/40 transition-all group"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-editor-text truncate flex-1">{room.roomName}</h3>
                  <button
                    onClick={(e) => handleDelete(room.roomId, e)}
                    className="text-editor-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs ml-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{
                      background: '#21262d',
                      color: LANG_COLORS[room.language] || '#8b949e',
                    }}
                  >
                    {room.language}
                  </span>
                  <span className="text-xs text-editor-muted">{timeAgo(room.updatedAt)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-editor-muted border px-2 py-0.5 rounded"
                    style={{ borderColor: '#30363d' }}>
                    {room.roomId}
                  </span>
                  <span className="text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h2 className="text-lg font-semibold mb-5">Create new room</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-editor-muted mb-1.5">Room name</label>
              <input
                autoFocus
                value={newRoom.roomName}
                onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                placeholder="e.g. Backend API, ML Assignment"
                className="w-full px-3 py-2 rounded-lg text-sm text-editor-text outline-none focus:ring-1 focus:ring-green-400"
                style={{ background: '#0d1117', border: '1px solid #30363d' }}
              />
            </div>
            <div>
              <label className="block text-xs text-editor-muted mb-1.5">Language</label>
              <select
                value={newRoom.language}
                onChange={(e) => setNewRoom({ ...newRoom, language: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-editor-text outline-none focus:ring-1 focus:ring-green-400"
                style={{ background: '#0d1117', border: '1px solid #30363d' }}
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2 rounded-lg text-sm border text-editor-muted hover:text-editor-text"
                style={{ borderColor: '#30363d' }}>
                Cancel
              </button>
              <button type="submit" disabled={creating}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-green-400 text-black hover:bg-green-300 disabled:opacity-50">
                {creating ? 'Creating…' : 'Create room'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Join Room Modal */}
      {showJoin && (
        <Modal onClose={() => setShowJoin(false)}>
          <h2 className="text-lg font-semibold mb-5">Join a room</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs text-editor-muted mb-1.5">Room code</label>
              <input
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. abc-1234"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono text-editor-text outline-none focus:ring-1 focus:ring-sky-400"
                style={{ background: '#0d1117', border: '1px solid #30363d' }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowJoin(false)}
                className="flex-1 py-2 rounded-lg text-sm border text-editor-muted hover:text-editor-text"
                style={{ borderColor: '#30363d' }}>
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-sky-400 text-black hover:bg-sky-300">
                Join
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl border p-6 w-full max-w-sm"
        style={{ background: '#161b22', borderColor: '#30363d' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
