import { io } from 'socket.io-client';

const socket = io({
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('[Socket] Connected to backend — id:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected from backend — reason:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

export default socket;
