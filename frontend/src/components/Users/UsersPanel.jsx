import React from 'react';

function Avatar({ name, color, size = 28 }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color || '#4ade80',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: '#000',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function TypingWave() {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <div
          key={i}
          style={{
            width: 3,
            background: '#4ade80',
            borderRadius: 2,
            animation: `typingWave 1s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function UsersPanel({ users, typingUsers, roomId }) {
  const copyLink = () => {
    const url = `${window.location.origin}/editor/${roomId}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {users.map((user) => {
          const isTyping = Object.values(typingUsers).includes(user.name);
          return (
            <div
              key={user.socketId || user._id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Avatar name={user.name} color={user.color} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-editor-text truncate">{user.name}</div>
                <div className="text-xs text-editor-muted">
                  {isTyping ? 'typing…' : 'online'}
                </div>
              </div>
              {isTyping && <TypingWave />}
            </div>
          );
        })}
      </div>

      {/* Room invite section */}
      <div
        className="mx-2 mb-2 rounded-lg border overflow-hidden"
        style={{ background: '#0d1117', borderColor: '#30363d' }}
      >
        {/* Room code — most important, show big */}
        <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid #30363d' }}>
          <p style={{ fontSize: 10, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Room code
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              alert(`Room code copied: ${roomId}`);
            }}
            style={{
              width: '100%',
              background: '#21262d',
              border: '1px solid #4ade8055',
              borderRadius: 6,
              padding: '6px 8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15,
              fontWeight: 700,
              color: '#4ade80',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              textAlign: 'center',
            }}
          >
            {roomId}
          </button>
          <p style={{ fontSize: 10, color: '#8b949e', marginTop: 5, textAlign: 'center' }}>
            Click to copy code
          </p>
        </div>

        {/* Full link */}
        <div style={{ padding: '8px 10px' }}>
          <p style={{ fontSize: 10, color: '#8b949e', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Invite link
          </p>
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#38bdf8', marginBottom: 6, wordBreak: 'break-all', lineHeight: 1.5 }}>
            {window.location.origin}/editor/{roomId}
          </p>
          <button
            onClick={copyLink}
            style={{ width: '100%', fontSize: 11, padding: '5px', borderRadius: 5, background: 'transparent', border: '1px solid #30363d', color: '#8b949e', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Copy invite link
          </button>
        </div>
      </div>
    </div>
  );
}
