import React, { useRef, useEffect } from 'react';

export default function OutputPanel({ lines, onClear, onClose }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div
      className="flex flex-col"
      style={{
        background: '#0d1117',
        borderTop: '1px solid #30363d',
        height: 180,
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-1.5 border-b"
        style={{ borderColor: '#30363d' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-editor-muted uppercase tracking-wider">
            Output
          </span>
          {lines.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-editor-muted hover:text-editor-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-editor-muted hover:text-editor-text text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs leading-6">
        {lines.length === 0 ? (
          <span className="text-editor-muted">Run code to see output here…</span>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className="whitespace-pre-wrap break-words"
              style={{
                color:
                  line.type === 'error'
                    ? '#f85149'
                    : line.type === 'info'
                    ? '#8b949e'
                    : '#4ade80',
              }}
            >
              {line.type === 'info' ? (
                <span className="text-editor-muted mr-2">$</span>
              ) : line.type === 'error' ? (
                <span className="text-red-400 mr-2">✕</span>
              ) : (
                <span className="text-green-400 mr-2">›</span>
              )}
              {line.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
