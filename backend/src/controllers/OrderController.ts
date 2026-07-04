import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { OrderService } from '../services/OrderService.js';

export class OrderController extends BaseController {
  constructor(private readonly orderService: OrderService) {
    super();
  }

  async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const newOrder = await this.orderService.placeOrder(req.body);
      this.handleSuccess(res, newOrder, 201);
    } catch (error) {
      this.handleError(error, res, 'placeOrder');
    }
  }

  async getOrderDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderDetails(id);
      this.handleSuccess(res, order);
    } catch (error) {
      this.handleError(error, res, 'getOrderDetails');
    }
  }

  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      let canteenId: string | undefined = req.query.canteenId as string | undefined;

      if (!canteenId && authUser && authUser.role !== 'admin') {
        canteenId = authUser.canteenId;
      }

      const orders = await this.orderService.getAllOrders(canteenId);
      this.handleSuccess(res, orders);
    } catch (error) {
      this.handleError(error, res, 'getAllOrders');
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await this.orderService.updateOrderStatus(id, status);
      this.handleSuccess(res, { success: true, id, status });
    } catch (error) {
      this.handleError(error, res, 'updateOrderStatus');
    }
  }
}
