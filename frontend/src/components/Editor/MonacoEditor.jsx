import React, { useRef, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  lineNumbers: 'on',
  glyphMargin: true,
  folding: true,
  lineDecorationsWidth: 8,
  renderLineHighlight: 'all',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  tabSize: 2,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  formatOnPaste: true,
  formatOnType: false,
};

export default function CodeEditor({
  value,
  language,
  theme,
  onChange,
  onCursorChange,
  cursors,       // { socketId: { cursor: { lineNumber, column }, user: { name, color } } }
  readOnly = false,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);          // Monaco decoration IDs for remote cursors
  const isRemoteChangeRef = useRef(false);    // suppress echo on remote ops

  // ── EDITOR MOUNT ──────────────────────────────────────────────
  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define CodeSync dark theme
    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '484f58', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'd2a8ff' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'ffa657' },
        { token: 'operator', foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#264f7840',
        'editorCursor.foreground': '#4ade80',
        'editorLineNumber.foreground': '#3b434c',
        'editorLineNumber.activeForeground': '#8b949e',
        'editor.findMatchBackground': '#ffa65740',
        'editor.findMatchHighlightBackground': '#ffa65720',
        'editorIndentGuide.background': '#21262d',
        'editorIndentGuide.activeBackground': '#30363d',
        'scrollbarSlider.background': '#30363d80',
        'scrollbarSlider.hoverBackground': '#484f5880',
        'editorBracketMatch.background': '#4ade8020',
        'editorBracketMatch.border': '#4ade8080',
      },
    });

    monaco.editor.defineTheme('codesync-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editorCursor.foreground': '#0969da',
        'editorLineNumber.foreground': '#8c959f',
      },
    });

    monaco.editor.setTheme(theme || 'codesync-dark');

    // Cursor position change → emit to server
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  // ── THEME SWITCH ──────────────────────────────────────────────
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'light' ? 'codesync-light' : 'codesync-dark');
    }
  }, [theme]);

  // ── APPLY REMOTE CHANGE (OT op) ───────────────────────────────
  // Called by Editor.jsx when an incoming op needs to be applied
  const applyRemoteOp = useCallback((op) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    isRemoteChangeRef.current = true;
    const model = editor.getModel();

    try {
      if (op.type === 'full_replace') {
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: op.content }],
          () => null
        );
        return;
      }

      if (op.type === 'insert') {
        const pos = model.getPositionAt(op.position);
        model.pushEditOperations(
          [],
          [{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text: op.text }],
          () => null
        );
      } else if (op.type === 'delete') {
        const start = model.getPositionAt(op.position);
        const end = model.getPositionAt(op.position + op.length);
        model.pushEditOperations(
          [],
          [{ range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column), text: '' }],
          () => null
        );
      }
    } finally {
      isRemoteChangeRef.current = false;
    }
  }, []);

  // Expose applyRemoteOp via ref so Editor.jsx can call it
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.__applyRemoteOp = applyRemoteOp;
    }
  }, [applyRemoteOp]);

  // ── REMOTE CURSOR DECORATIONS ─────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const newDecorations = Object.entries(cursors || {}).map(([socketId, { cursor, user }]) => {
      const { lineNumber, column } = cursor;
      const color = user?.color || '#4ade80';

      // Inject per-cursor CSS if not already present
      const styleId = `cursor-style-${socketId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .remote-cursor-${socketId} {
            border-left: 2px solid ${color};
            margin-left: -1px;
          }
          .remote-cursor-label-${socketId}::after {
            content: "${user?.name || 'User'}";
            background: ${color};
            color: #000;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 0 3px 3px 0;
            position: absolute;
            top: -18px;
            left: 0;
            white-space: nowrap;
            pointer-events: none;
            font-family: "JetBrains Mono", monospace;
          }
        `;
        document.head.appendChild(style);
      }

      return {
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `remote-cursor-${socketId} remote-cursor-label-${socketId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [cursors]);

  // ── LOCAL CHANGE → OT op ──────────────────────────────────────
  const handleChange = useCallback(
    (newValue, event) => {
      if (isRemoteChangeRef.current) return; // skip remote-applied changes
      if (!event?.changes) return;

      // Convert Monaco change events to OT ops
      for (const change of event.changes) {
        const model = editorRef.current?.getModel();
        if (!model) continue;

        const position = model.getOffsetAt({
          lineNumber: change.range.startLineNumber,
          column: change.range.startColumn,
        });

        // Deletion
        if (change.rangeLength > 0) {
          onChange?.({
            type: 'delete',
            position,
            length: change.rangeLength,
          });
        }

        // Insertion
        if (change.text.length > 0) {
          onChange?.({
            type: 'insert',
            position,
            text: change.text,
          });
        }
      }
    },
    [onChange]
  );

  return (
    <MonacoEditor
      height="100%"
      language={language || 'javascript'}
      value={value}
      options={{ ...MONACO_OPTIONS, readOnly }}
      onMount={handleMount}
      onChange={handleChange}
      loading={
        <div className="flex items-center justify-center h-full bg-editor-bg text-editor-muted text-sm">
          Loading editor…
        </div>
      }
    />
  );
}
