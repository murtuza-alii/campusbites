import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config.js';

export const socket = io(API_BASE_URL, {
  autoConnect: true,
});
