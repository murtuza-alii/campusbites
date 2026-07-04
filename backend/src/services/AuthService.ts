import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/unifiedConfig.js';
import { getDb } from '../db.js';

export class AuthService {
  async login(username: string, password: string): Promise<string | null> {
    const db = await getDb();
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      // Sign token, valid for 12 hours
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          canteenId: user.canteen_id 
        },
        config.auth.jwtSecret,
        { expiresIn: '12h' }
      );
      return token;
    }
    
    return null;
  }
}
