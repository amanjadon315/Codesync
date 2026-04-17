import React from 'react';
import { useNavigate } from 'react-router-dom';

const LANGUAGES = ['javascript', 'typescript', 'python', 'cpp', 'java'];

export default function EditorTopbar({
  roomName,
  roomId,
  language,
  onLanguageChange,
  theme,
  onThemeToggle,
  users,
  onRun,
  running,
  saving,
}) {
  const navigate = useNavigate();

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/editor/${roomId}`);
  };

  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 gap-3"
      style={{ background: '#161b22', borderColor: '#30363d', minHeight: 48 }}
    >
      {/* Left: logo + room name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm font-bold font-mono flex-shrink-0"
        >
          <span className="text-green-400">Code</span>
          <span className="text-sky-400">Sync</span>
        </button>
        <span className="text-editor-muted text-xs">/</span>
        <span className="text-editor-text text-sm font-medium truncate">{roomName}</span>

        {/* Room code pill */}
        <button
          onClick={copyLink}
          title="Click to copy room link"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border text-editor-muted hover:text-green-400 hover:border-green-400/40 transition-colors flex-shrink-0"
          style={{ background: '#21262d', borderColor: '#30363d' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-green-400"
            style={{ animation: 'pulse 2s infinite' }}
          />
          {roomId}
        </button>
      </div>

      {/* Center: language selector */}
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="text-xs text-editor-text px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-green-400 flex-shrink-0"
        style={{ background: '#21262d', border: '1px solid #30363d' }}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {/* Right: user avatars + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Auto-save status */}
        <span className="text-xs text-editor-muted hidden md:block">
          {saving ? 'Saving…' : 'Saved'}
        </span>

        {/* User avatar stack */}
        <div className="flex items-center">
          {users.slice(0, 5).map((u, i) => {
            const initials = u.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={u.socketId || i}
                title={u.name}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: u.color || '#4ade80',
                  border: '2px solid #0d1117',
                  marginLeft: i === 0 ? 0 : -6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#000',
                  zIndex: users.length - i,
                  position: 'relative',
                }}
              >
                {initials}
              </div>
            );
          })}
          {users.length > 5 && (
            <div
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: '#21262d', border: '2px solid #0d1117',
                marginLeft: -6, fontSize: 9, fontWeight: 700,
                color: '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              +{users.length - 5}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          title="Toggle theme"
          className="p-1.5 rounded-lg text-editor-muted hover:text-editor-text transition-colors text-sm"
          style={{ background: '#21262d' }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-400 text-black hover:bg-green-300 disabled:opacity-50 transition-colors"
        >
          {running ? (
            <>
              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Running…
            </>
          ) : (
            '▶ Run'
          )}
        </button>
      </div>
    </header>
  );
}
