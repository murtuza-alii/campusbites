import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/unifiedConfig.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string | null;
  role: 'admin' | 'manager' | 'cook' | 'delivery';
  displayName: string;
  canteenId?: string | null;
  canteenName?: string | null;
  canteenSlug?: string | null;
  groupName?: string | null;
  groupSlug?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : authHeader;
  
  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid format' });
  }
  
  jwt.verify(token, config.auth.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid, expired, or unauthorized access token' });
    }
    req.user = user as AuthenticatedUser;
    next();
  });
}

// Alias for authenticateToken
export const requireAuth = authenticateToken;

// Middleware to enforce specific role(s)
export function requireRole(allowedRoles: Array<'admin' | 'manager' | 'cook' | 'delivery'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}], but current role is '${req.user.role}'` 
      });
    }

    next();
  };
}
