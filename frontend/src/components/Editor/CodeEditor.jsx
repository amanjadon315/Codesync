import React, { useRef, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';

const MONACO_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6e7681', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'type', foreground: 'ffa657' },
    { token: 'function', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'e6edf3' },
    { token: 'operator', foreground: 'ff7b72' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#e6edf3',
    'editor.lineHighlightBackground': '#161b22',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#264f7840',
    'editorLineNumber.foreground': '#3b434c',
    'editorLineNumber.activeForeground': '#8b949e',
    'editorCursor.foreground': '#4ade80',
    'editorWhitespace.foreground': '#30363d',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
    'scrollbarSlider.background': '#30363d80',
    'scrollbarSlider.hoverBackground': '#484f5880',
    'minimap.background': '#0d1117',
    'editorGutter.background': '#0d1117',
  },
};

const LANGUAGE_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  css: 'css',
  html: 'html',
  markdown: 'markdown',
};

// Debounce utility
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function CodeEditor({
  content,
  language,
  onChange,
  onCursorChange,
  remoteCursors = {},
  readOnly = false,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const isRemoteChangeRef = useRef(false);

  // Apply remote cursors as Monaco decorations
  const updateRemoteCursors = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const newDecorations = Object.entries(remoteCursors).map(([socketId, { cursor, user }]) => {
      const lineNumber = cursor?.lineNumber || 1;
      const column = cursor?.column || 1;
      const color = user?.color || '#38bdf8';
      const name = user?.name || 'User';

      // Inject per-cursor CSS
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
            content: "${name}";
            position: absolute;
            top: -18px;
            left: 0;
            background: ${color};
            color: #000;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 3px 3px 3px 0;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
          }
        `;
        document.head.appendChild(style);
      }

      return {
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `remote-cursor-${socketId}`,
          beforeContentClassName: `remote-cursor-label-${socketId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors]);

  useEffect(() => {
    updateRemoteCursors();
  }, [updateRemoteCursors]);

  // Sync content from remote without triggering re-emit
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentVal = editor.getValue();
    if (currentVal !== content) {
      isRemoteChangeRef.current = true;
      const pos = editor.getPosition();
      editor.setValue(content);
      if (pos) editor.setPosition(pos);
      isRemoteChangeRef.current = false;
    }
  }, [content]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    monaco.editor.defineTheme('codesync-dark', MONACO_THEME);
    monaco.editor.setTheme('codesync-dark');

    // Cursor position tracking (debounced)
    const debouncedCursor = debounce((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    }, 80);

    editor.onDidChangeCursorPosition(debouncedCursor);

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Ctrl+S triggers save — handled in Editor page via auto_save
      editor.trigger('keyboard', 'editor.action.formatDocument', {});
    });
  };

  // Debounced change handler — sends ops at max 50ms interval
  const debouncedChange = useCallback(
    debounce((value, event) => {
      if (isRemoteChangeRef.current) return;
      if (!event?.changes?.length) return;

      // Convert Monaco change events to OT ops
      for (const change of event.changes) {
        const { rangeOffset, rangeLength, text } = change;

        if (text.length > 0 && rangeLength === 0) {
          onChange?.({ type: 'insert', position: rangeOffset, text }, value);
        } else if (rangeLength > 0 && text.length === 0) {
          onChange?.({ type: 'delete', position: rangeOffset, length: rangeLength }, value);
        } else {
          // Replace (delete + insert) — send as full_replace for simplicity
          onChange?.({ type: 'full_replace', content: value }, value);
        }
      }
    }, 50),
    [onChange]
  );

  return (
    <div className="relative w-full h-full">
      <MonacoEditor
        height="100%"
        language={LANGUAGE_MAP[language] || 'javascript'}
        defaultValue={content}
        theme="codesync-dark"
        onMount={handleEditorDidMount}
        onChange={(value, event) => debouncedChange(value, event)}
        options={{
          fontSize: 13.5,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineHeight: 1.7,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          tabSize: 2,
          insertSpaces: true,
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: false,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          renderLineHighlight: 'line',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 12, bottom: 12 },
          readOnly,
          contextmenu: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          parameterHints: { enabled: true },
          suggest: { showKeywords: true },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}
