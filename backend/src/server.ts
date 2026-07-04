import { createServer } from 'http';
import app from './app.js';
import { initDb } from './db.js';
import { config } from './config/unifiedConfig.js';
import { initSocket } from './utils/websocket.js';
import { initOrderWorker } from './queues/orderQueue.js';
import { getRedis } from './config/redis.js';

async function startServer() {
  try {
    // Initialize PostgreSQL tables and seed data
    await initDb();

    // Verify Redis connection on startup
    getRedis();
    
    const port = config.server.port;
    const httpServer = createServer(app);
    
    // Initialize Socket.io
    initSocket(httpServer);

    // Initialize BullMQ background order worker
    initOrderWorker();
    console.log('BullMQ Order Queue worker initialized successfully.');
    
    httpServer.listen(port, () => {
      console.log(`Canteen server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start canteen server:', error);
    process.exit(1);
  }
}

startServer();
