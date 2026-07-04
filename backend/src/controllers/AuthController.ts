import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AuthService } from '../services/AuthService.js';

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const token = await this.authService.login(username, password);
      
      if (token) {
        this.handleSuccess(res, { token });
      } else {
        const err = new Error('Incorrect username or password');
        (err as any).statusCode = 401;
        throw err;
      }
    } catch (error) {
      this.handleError(error, res, 'login');
    }
  }
}
