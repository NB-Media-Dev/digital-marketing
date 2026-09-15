// Re-export the Socket.IO initialiser and emit helpers from one place.
export { initSocket, getIo } from '../config/socket';
export { socketService } from '../services/socket.service';
export { EVENTS } from './events';
