import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/unifiedConfig.js';

export class AuthService {
  private hashedStaffPassword: string;

  constructor() {
    // Generate bcrypt hash of the environment password at startup to demonstrate secure hashing
    this.hashedStaffPassword = bcrypt.hashSync(config.auth.staffPassword, 10);
  }

  async login(password: string): Promise<string | null> {
    const isValid = await bcrypt.compare(password, this.hashedStaffPassword);
    
    if (isValid) {
      // Sign token, valid for 12 hours
      const token = jwt.sign(
        { role: 'staff' },
        config.auth.jwtSecret,
        { expiresIn: '12h' }
      );
      return token;
    }
    
    return null;
  }
}
