import { useEffect, useRef, useCallback, useState } from 'react';
import { useSocket } from './useSocket';

/**
 * useCollaboration — manages OT client state for one file session.
 *
 * The client tracks its local version and a pending queue of unacknowledged ops.
 * When an ack arrives, it dequeues. When a remote op arrives, it transforms
 * local pending ops against it before applying to the editor.
 */
export function useCollaboration({ roomId, fileId, user, onRemoteOp, onFileLoaded }) {
  const { on, emit } = useSocket();
  const versionRef = useRef(0);
  const pendingRef = useRef([]); // ops sent but not yet acked

  const [roomUsers, setRoomUsers] = useState([]);
  const [cursors, setCursors] = useState({});    // socketId -> { cursor, user }
  const [typingUsers, setTypingUsers] = useState({}); // socketId -> userName

  // ── JOIN ROOM ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !fileId || !user) return;

    emit('join_room', { roomId, user, fileId });

    on('file_loaded', ({ content, version, language }) => {
      versionRef.current = version;
      pendingRef.current = [];
      onFileLoaded?.({ content, version, language });
    });

    on('room_users', ({ users }) => setRoomUsers(users));

    on('user_joined', ({ user: u }) => {
      // Toast is shown in parent component via this callback if needed
    });

    on('user_left', ({ socketId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    on('error', ({ message }) => console.error('Socket error:', message));

    return () => {
      emit('auto_save', {
        fileId,
        content: '', // caller should pass current content; handled at Editor level
        userId: user._id,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, fileId, user?._id]);

  // ── INCOMING CODE CHANGES (remote OT) ─────────────────────────
  useEffect(() => {
    on('code_change', ({ op, fileId: changedFileId }) => {
      if (changedFileId !== fileId) return;

      // Transform pending local ops against incoming remote op
      let transformedOp = op;
      pendingRef.current = pendingRef.current.map((pending) => {
        const [tPending, tRemote] = transformPair(pending, transformedOp);
        transformedOp = tRemote;
        return tPending;
      });

      versionRef.current = op.version;
      onRemoteOp?.(transformedOp);
    });

    on('full_sync', ({ fileId: fid, content }) => {
      if (fid !== fileId) return;
      onFileLoaded?.({ content, version: versionRef.current });
    });

    on('op_ack', ({ version }) => {
      versionRef.current = version;
      pendingRef.current.shift(); // dequeue oldest pending
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // ── CURSORS ────────────────────────────────────────────────────
  useEffect(() => {
    on('cursor_move', ({ socketId, cursor, user: u, fileId: fid }) => {
      if (fid !== fileId) return;
      setCursors((prev) => ({ ...prev, [socketId]: { cursor, user: u } }));
    });

    on('typing', ({ socketId, user: u, isTyping }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) next[socketId] = u.name;
        else delete next[socketId];
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // ── SEND OP ────────────────────────────────────────────────────
  const sendOp = useCallback(
    (op) => {
      const outgoing = { ...op, version: versionRef.current };
      pendingRef.current.push(outgoing);
      emit('code_change', { fileId, op: outgoing, roomId });
    },
    [fileId, roomId, emit]
  );

  const sendFullSync = useCallback(
    (content) => {
      emit('full_sync', { fileId, content, roomId });
    },
    [fileId, roomId, emit]
  );

  const sendCursor = useCallback(
    (cursor) => {
      emit('cursor_move', { roomId, fileId, cursor, user });
    },
    [roomId, fileId, user, emit]
  );

  const sendTyping = useCallback(
    (isTyping) => {
      emit('typing', { roomId, user, isTyping });
    },
    [roomId, user, emit]
  );

  const sendAutoSave = useCallback(
    (content) => {
      emit('auto_save', { fileId, content, userId: user?._id });
    },
    [fileId, user, emit]
  );

  return {
    roomUsers,
    cursors,
    typingUsers,
    sendOp,
    sendFullSync,
    sendCursor,
    sendTyping,
    sendAutoSave,
  };
}

// Simplified client-side transform pair (mirrors server logic)
function transformPair(op1, op2) {
  if (op1.type === 'insert' && op2.type === 'insert') {
    if (op2.position <= op1.position) {
      return [{ ...op1, position: op1.position + op2.text.length }, op2];
    }
    return [op1, { ...op2, position: op2.position + op1.text.length }];
  }
  if (op1.type === 'delete' && op2.type === 'delete') {
    if (op1.position + op1.length <= op2.position) {
      return [op1, { ...op2, position: op2.position - op1.length }];
    }
    if (op2.position + op2.length <= op1.position) {
      return [{ ...op1, position: op1.position - op2.length }, op2];
    }
  }
  return [op1, op2];
}
