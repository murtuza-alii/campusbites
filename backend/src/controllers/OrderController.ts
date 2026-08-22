import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { OrderService } from '../services/OrderService.js';
import { verifyQRSignature } from '../utils/qrSigner.js';
import { getDb } from '../db.js';
import { emitOrderStatusChanged } from '../utils/websocket.js';

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

  async verifyPickup(req: Request, res: Response): Promise<void> {
    try {
      let { order_id, pickup_code, signature, qr_data } = req.body;

      // Handle scanned JSON string if staff scanned full QR
      if (qr_data && typeof qr_data === 'string') {
        try {
          const parsed = JSON.parse(qr_data);
          order_id = parsed.order_id || order_id;
          pickup_code = parsed.pickup_code || pickup_code;
          signature = parsed.signature || signature;
        } catch (e) {
          // If qr_data is raw pickup code or order ID string
          if (!order_id) order_id = qr_data;
        }
      }

      if (!order_id) {
        const err = new Error('Missing order_id or scanned payload');
        (err as any).statusCode = 400;
        throw err;
      }

      const db = await getDb();
      const orderRes = await db.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1', [order_id]);
      if (orderRes.rows.length === 0) {
        const err = new Error('Order not found');
        (err as any).statusCode = 404;
        throw err;
      }

      const order = orderRes.rows[0];

      // If signature is provided, verify HMAC
      if (signature && pickup_code) {
        const isValid = verifyQRSignature(order.id, pickup_code, signature);
        if (!isValid) {
          const err = new Error('Invalid or forged QR verification signature');
          (err as any).statusCode = 400;
          throw err;
        }
      } else if (pickup_code && order.pickup_code !== pickup_code) {
        const err = new Error('Incorrect pickup verification code');
        (err as any).statusCode = 400;
        throw err;
      }

      if (order.status === 'COMPLETED') {
        const err = new Error('Order Already Picked Up');
        (err as any).statusCode = 400;
        throw err;
      }

      await this.orderService.updateOrderStatus(order.id, 'COMPLETED');

      this.handleSuccess(res, {
        success: true,
        message: `Order ${order.order_number} verified and completed!`,
        order_number: order.order_number,
        student_name: order.student_name
      });
    } catch (error) {
      this.handleError(error, res, 'verifyPickup');
    }
  }
}
