import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config.js';

export const socket = io(API_BASE_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
