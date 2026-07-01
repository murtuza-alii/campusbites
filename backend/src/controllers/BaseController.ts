import { Response } from 'express';

export abstract class BaseController {
  protected handleSuccess(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json(data);
  }

  protected handleError(error: any, res: Response, methodName: string): void {
    // Attach controller method context for error tracking
    if (error && typeof error === 'object') {
      error.method = methodName;
      error.controller = this.constructor.name;
    }
    throw error;
  }
}
