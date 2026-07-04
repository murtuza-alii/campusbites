import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ParsedOrder } from '../types/index.js';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins for the prototype/college environment
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join admin room
    socket.on('joinAdmin', () => {
      socket.join('admin');
      console.log(`Socket ${socket.id} joined admin room`);
    });

    // Join specific order rooms to receive status updates
    socket.on('joinOrderRooms', (orderIds: string[]) => {
      if (Array.isArray(orderIds)) {
        orderIds.forEach((id) => {
          const roomName = `order_${id}`;
          socket.join(roomName);
          console.log(`Socket ${socket.id} joined room ${roomName}`);
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
}

/**
 * Broadcast menu update event to all connected clients
 */
export function broadcastMenuUpdate(): void {
  try {
    const socketIo = getIo();
    socketIo.emit('menuUpdated');
    console.log('Broadcasted menuUpdated event to all clients');
  } catch (error) {
    console.error('Failed to broadcast menuUpdated:', error);
  }
}

/**
 * Emit orderCreated event to all admins
 */
export function emitOrderCreated(order: ParsedOrder): void {
  try {
    const socketIo = getIo();
    socketIo.to('admin').emit('orderCreated', order);
    console.log(`Emitted orderCreated event for order ${order.id} to admin room`);
  } catch (error) {
    console.error('Failed to emit orderCreated:', error);
  }
}

/**
 * Emit orderStatusChanged event to the specific order room and admin room
 */
export function emitOrderStatusChanged(order: ParsedOrder): void {
  try {
    const socketIo = getIo();
    const roomName = `order_${order.id}`;
    // Emit to the student in the order-specific room
    socketIo.to(roomName).emit('orderStatusChanged', order);
    // Emit to admins so their dashboard updates
    socketIo.to('admin').emit('orderStatusChanged', order);
    console.log(`Emitted orderStatusChanged event for order ${order.id} to room ${roomName} and admin room`);
  } catch (error) {
    console.error('Failed to emit orderStatusChanged:', error);
  }
}
