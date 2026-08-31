import { createServer } from 'http';
import app from './app.js';
import { initDb } from './db.js';
import { config } from './config/unifiedConfig.js';
import { initSocket } from './utils/websocket.js';
import { initOrderWorker } from './queues/orderQueue.js';
import { getRedis } from './config/redis.js';
import { startKeepAliveService } from './utils/keepAlive.js';

async function startServer() {
  try {
    // Initialize PostgreSQL tables and seed data
    await initDb();

    // Initialize Redis & BullMQ worker gracefully (OrderService has direct DB fallback)
    try {
      getRedis();
      initOrderWorker();
      console.log('BullMQ Order Queue worker initialized successfully.');
    } catch (redisErr) {
      console.warn('Redis/BullMQ unavailable, using direct DB fallback mode:', redisErr);
    }
    
    const port = config.server.port;
    const httpServer = createServer(app);
    
    // Initialize Socket.io
    initSocket(httpServer);
    
    httpServer.listen(port, () => {
      console.log(`Canteen server running on http://localhost:${port}`);
      // Launch background keep-alive pings to keep Render free tier alive
      startKeepAliveService();
    });
  } catch (error) {
    console.error('Failed to start canteen server:', error);
    process.exit(1);
  }
}

startServer();
