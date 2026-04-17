import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';

/**
 * useSocket — thin wrapper giving components access to the shared socket
 * with automatic cleanup of event listeners on unmount.
 */
export function useSocket() {
  const socket = getSocket();
  const listenersRef = useRef([]);

  const on = useCallback(
    (event, handler) => {
      socket.on(event, handler);
      listenersRef.current.push({ event, handler });
    },
    [socket]
  );

  const off = useCallback(
    (event, handler) => {
      socket.off(event, handler);
    },
    [socket]
  );

  const emit = useCallback(
    (event, data) => {
      socket.emit(event, data);
    },
    [socket]
  );

  // Remove all listeners registered via this hook on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      listenersRef.current = [];
    };
  }, [socket]);

  return { socket, on, off, emit };
}
