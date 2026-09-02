import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/unifiedConfig.js';
import { getDb } from '../db.js';

export interface AuthLoginPayload {
  email?: string;
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
      // If single string provided, determine if it's email or username
      if (input.includes('@')) {
        payload = { email: input.trim(), password: optionalPassword };
      } else {
        payload = { username: input.trim(), password: optionalPassword };
      }
    } else {
      payload = input;
    }

    const pinAttempt = payload.pin ? String(payload.pin).trim() : null;
    const passwordAttempt = payload.password ? String(payload.password) : null;

    // Strategy 1: Cook Quick PIN Login (By Canteen and PIN)
    if (pinAttempt && (payload.canteen_id || payload.canteen_slug)) {
      let canteenId = payload.canteen_id;
      if (!canteenId && payload.canteen_slug) {
        const cRes = await db.query('SELECT id FROM canteen WHERE slug = $1 OR id = $1', [payload.canteen_slug]);
        if (cRes.rows.length > 0) {
          canteenId = cRes.rows[0].id;
        }
      }

      if (canteenId) {
        const cooksRes = await db.query(
          'SELECT * FROM users WHERE canteen_id = $1 AND role = $2',
          [canteenId, 'cook']
        );
        for (const candidate of cooksRes.rows) {
          const hashToTest = candidate.pin_hash || candidate.password_hash;
          if (hashToTest && await bcrypt.compare(pinAttempt, hashToTest)) {
            user = candidate;
            break;
          }
        }
      }
    }

    // Strategy 2: Email & Password Login (Admin & Store Managers)
    if (!user && payload.email && passwordAttempt) {
      const emailRes = await db.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        [payload.email.trim()]
      );
      if (emailRes.rows.length > 0) {
        const candidate = emailRes.rows[0];
        if (candidate.password_hash && await bcrypt.compare(passwordAttempt, candidate.password_hash)) {
          user = candidate;
        }
      }
    }

    // Strategy 3: Username & Password Login
    if (!user && payload.username && passwordAttempt) {
      const userRes = await db.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
        [payload.username.trim()]
      );
      if (userRes.rows.length > 0) {
        const candidate = userRes.rows[0];
        if (candidate.password_hash && await bcrypt.compare(passwordAttempt, candidate.password_hash)) {
          user = candidate;
        }
      }
    }

    // Strategy 4: Role + Canteen Specific Lookup
    if (!user && (payload.canteen_id || payload.canteen_slug) && payload.role && passwordAttempt) {
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
          const candidate = uRes.rows[0];
          if (candidate.password_hash && await bcrypt.compare(passwordAttempt, candidate.password_hash)) {
            user = candidate;
          }
        }
      }
    }

    // If valid user matched, issue 12-hour signed JWT
    if (user) {
      let canteenInfo: any = null;
      if (user.canteen_id) {
        const cRes = await db.query('SELECT * FROM canteen WHERE id = $1', [user.canteen_id]);
        if (cRes.rows.length > 0) {
          canteenInfo = cRes.rows[0];
        }
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email || null,
          role: user.role, 
          displayName: user.display_name || user.username,
          canteenId: user.canteen_id || null,
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
