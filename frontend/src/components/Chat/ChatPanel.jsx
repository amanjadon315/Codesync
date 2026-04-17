import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';

export default function ChatPanel({ roomId, user, initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const { on, emit } = useSocket();

  useEffect(() => {
    on('chat_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    on('user_joined', ({ message, user: u }) => {
      setMessages((prev) => [
        ...prev,
        { _id: Date.now(), userName: 'system', text: message, type: 'system', timestamp: new Date() },
      ]);
    });
    on('user_left', ({ user: u }) => {
      if (u?.name) {
        setMessages((prev) => [
          ...prev,
          { _id: Date.now() + 1, userName: 'system', text: `${u.name} left`, type: 'system', timestamp: new Date() },
        ]);
      }
    });
  }, []); // eslint-disable-line

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    emit('chat_message', { roomId, text: trimmed, user });
    setText('');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {messages.map((msg) =>
          msg.type === 'system' ? (
            <div key={msg._id} className="text-center text-xs text-editor-muted py-1">
              {msg.text}
            </div>
          ) : (
            <div key={msg._id} className="flex flex-col gap-0.5 fade-in">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold" style={{ color: msg.userColor || '#4ade80' }}>
                  {msg.userName}
                </span>
                <span className="text-xs text-editor-muted">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-xs text-editor-muted leading-relaxed break-words">{msg.text}</p>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 p-2 border-t"
        style={{ borderColor: '#30363d' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          maxLength={500}
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-editor-text outline-none focus:ring-1 focus:ring-green-400 font-sans"
          style={{ background: '#21262d', border: '1px solid #30363d' }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-400 text-black disabled:opacity-40 hover:bg-green-300 transition-colors"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
