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
      const db = await getDb();
      const requestedCanteenId = req.query.canteenId as string | undefined;

      // For non-admin staff (cooks/managers), strictly lock orders to their assigned canteen
      if (authUser && authUser.role !== 'admin') {
        const lockedCanteenId = authUser.canteenId;
        if (!lockedCanteenId) {
          res.status(403).json({ error: 'Unauthorized: No canteen assigned to this staff account' });
          return;
        }

        const orders = await this.orderService.getAllOrders(lockedCanteenId);
        this.handleSuccess(res, orders);
        return;
      }

      // Admin has global multi-campus visibility
      const orders = await this.orderService.getAllOrders(requestedCanteenId);
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
      let { order_id, pickup_code, signature, qr_data, canteen_id } = req.body;

      // 1. Handle scanned JSON or raw string payload in qr_data
      if (qr_data && typeof qr_data === 'string') {
        const trimmed = qr_data.trim();
        try {
          const parsed = JSON.parse(trimmed);
          order_id = parsed.order_id || order_id;
          pickup_code = parsed.pickup_code || pickup_code;
          signature = parsed.signature || signature;
          canteen_id = parsed.canteen_id || canteen_id;
        } catch (e) {
          // If not JSON, check if it's a 4-digit PIN or order identifier
          if (/^\d{4}$/.test(trimmed)) {
            pickup_code = trimmed;
          } else {
            order_id = trimmed;
          }
        }
      }

      // Sanitize string inputs
      if (order_id && typeof order_id === 'string') order_id = order_id.trim();
      if (pickup_code && typeof pickup_code === 'string') pickup_code = pickup_code.trim();

      const db = await getDb();
      let order: any = null;

      // Strategy 1: Look up by explicit order_id or order_number (e.g. ord_..., #1001, 1001)
      if (order_id && !(/^\d{4}$/.test(order_id) && !pickup_code)) {
        const orderRes = await db.query(
          'SELECT * FROM orders WHERE id = $1 OR order_number = $1 OR order_number = $2',
          [order_id, `#${order_id}`]
        );
        if (orderRes.rows.length > 0) {
          order = orderRes.rows[0];
        }
      }

      // Strategy 2: If not found yet and pickup_code (or 4-digit PIN in order_id) is provided, find active ready order
      const pinCandidate = pickup_code || (/^\d{4}$/.test(order_id) ? order_id : null);
      if (!order && pinCandidate) {
        let query = `SELECT * FROM orders WHERE pickup_code = $1 AND status != 'COMPLETED'`;
        const params: any[] = [pinCandidate];
        if (canteen_id) {
          query += ` AND canteen_id = $2`;
          params.push(canteen_id);
        }
        query += ` ORDER BY CASE WHEN status = 'READY' THEN 1 WHEN status = 'PREPARING' THEN 2 ELSE 3 END, created_at DESC LIMIT 1`;
        
        const pinRes = await db.query(query, params);
        if (pinRes.rows.length > 0) {
          order = pinRes.rows[0];
          pickup_code = pinCandidate;
        } else {
          // Check if the order was already completed
          const completedRes = await db.query(
            `SELECT * FROM orders WHERE pickup_code = $1 AND status = 'COMPLETED' ORDER BY created_at DESC LIMIT 1`,
            [pinCandidate]
          );
          if (completedRes.rows.length > 0) {
            const err = new Error(`Order ${completedRes.rows[0].order_number} has already been completed and picked up.`);
            (err as any).statusCode = 400;
            throw err;
          }
        }
      }

      if (!order) {
        const err = new Error(pickup_code ? `No active order found matching PIN "${pickup_code}".` : 'Order not found.');
        (err as any).statusCode = 404;
        throw err;
      }

      // Verify cryptographic signature or match pickup code
      if (signature && pickup_code) {
        const isValid = verifyQRSignature(order.id, pickup_code, signature);
        if (!isValid && order.pickup_code !== pickup_code) {
          const err = new Error('Invalid or forged QR verification signature.');
          (err as any).statusCode = 400;
          throw err;
        }
      } else if (pickup_code && order.pickup_code !== pickup_code) {
        const err = new Error(`Incorrect PIN for order ${order.order_number}. Expected PIN does not match.`);
        (err as any).statusCode = 400;
        throw err;
      }

      if (order.status === 'COMPLETED') {
        const err = new Error(`Order ${order.order_number} has already been picked up and completed.`);
        (err as any).statusCode = 400;
        throw err;
      }

      // Update status to COMPLETED
      await this.orderService.updateOrderStatus(order.id, 'COMPLETED');

      this.handleSuccess(res, {
        success: true,
        message: `Order ${order.order_number} verified and completed!`,
        order_id: order.id,
        order_number: order.order_number,
        student_name: order.student_name,
        pickup_code: order.pickup_code
      });
    } catch (error) {
      this.handleError(error, res, 'verifyPickup');
    }
  }
}
