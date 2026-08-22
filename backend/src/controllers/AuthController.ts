import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AuthService } from '../services/AuthService.js';

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const token = await this.authService.login(req.body);
      
      if (token) {
        this.handleSuccess(res, { token });
      } else {
        const err = new Error('Invalid credentials, incorrect PIN, or unauthorized access');
        (err as any).statusCode = 401;
        throw err;
      }
    } catch (error) {
      this.handleError(error, res, 'login');
    }
  }
}
