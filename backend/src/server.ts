import app from './app.js';
import { initDb } from './db.js';
import { config } from './config/unifiedConfig.js';

async function startServer() {
  try {
    // Initialize SQLite tables and seed data
    await initDb();
    
    const port = config.server.port;
    app.listen(port, () => {
      console.log(`Canteen server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start canteen server:', error);
    process.exit(1);
  }
}

startServer();
