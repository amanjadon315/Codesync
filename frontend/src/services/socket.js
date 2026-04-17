import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
