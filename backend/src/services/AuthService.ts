import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/unifiedConfig.js';
import { getDb } from '../db.js';

export interface AuthLoginPayload {
  username?: string;
  password?: string;
  canteen_id?: string;
  canteen_slug?: string;
  role?: string;
  pin?: string;
}

export class AuthService {
  async login(
    input: string | AuthLoginPayload,
    optionalPassword?: string
  ): Promise<string | null> {
    const db = await getDb();
    let user: any = null;

    let payload: AuthLoginPayload = {};
    if (typeof input === 'string') {
      payload = { username: input, password: optionalPassword };
    } else {
      payload = input;
    }

    const secretAttempt = payload.password || payload.pin || '';

    // Strategy 1: Look up by Canteen ID / Canteen Slug and Role
    if ((payload.canteen_id || payload.canteen_slug) && payload.role) {
      let canteenId = payload.canteen_id;
      if (!canteenId && payload.canteen_slug) {
        const cRes = await db.query('SELECT id FROM canteen WHERE slug = $1 OR id = $1', [payload.canteen_slug]);
        if (cRes.rows.length > 0) {
          canteenId = cRes.rows[0].id;
        }
      }

      if (canteenId) {
        const uRes = await db.query(
          'SELECT * FROM users WHERE canteen_id = $1 AND role = $2',
          [canteenId, payload.role.toLowerCase()]
        );
        if (uRes.rows.length > 0) {
          user = uRes.rows[0];
        }
      }
    }

    // Strategy 2: Look up by Username
    if (!user && payload.username) {
      const uRes = await db.query('SELECT * FROM users WHERE username = $1', [payload.username]);
      if (uRes.rows.length > 0) {
        user = uRes.rows[0];
      }
    }

    if (user && secretAttempt && await bcrypt.compare(secretAttempt, user.password_hash)) {
      let canteenInfo: any = null;
      if (user.canteen_id) {
        const cRes = await db.query('SELECT * FROM canteen WHERE id = $1', [user.canteen_id]);
        if (cRes.rows.length > 0) {
          canteenInfo = cRes.rows[0];
        }
      }

      // Sign token, valid for 12 hours
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          canteenId: user.canteen_id,
          canteenName: canteenInfo?.name || null,
          canteenSlug: canteenInfo?.slug || null,
          groupName: canteenInfo?.group_name || null,
          groupSlug: canteenInfo?.group_slug || null,
        },
        config.auth.jwtSecret,
        { expiresIn: '12h' }
      );
      return token;
    }
    
    return null;
  }
}

