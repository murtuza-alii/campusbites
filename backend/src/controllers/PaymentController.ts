import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { PaymentService } from '../services/PaymentService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { emitOrderCreated, emitOrderStatusChanged } from '../utils/websocket.js';
import { buildQRPayload, generatePickupCode } from '../utils/qrSigner.js';
import { getDb } from '../db.js';
import { config } from '../config/unifiedConfig.js';


export class PaymentController extends BaseController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly orderRepository: OrderRepository
  ) {
    super();
  }

  /**
   * Initialize a Cashfree checkout session for a student cart
   */
  async createPaymentSession(req: Request, res: Response): Promise<void> {
    try {
      const { name, rollNumber, canteenId, items, totalPrice, phone, email, building, breakTiming, break_timing } = req.body;

      if (!name || !rollNumber || !canteenId || !items || !Array.isArray(items) || items.length === 0 || !totalPrice) {
        res.status(400).json({ error: 'Missing required order details' });
        return;
      }

      const orderBuilding = building || null;
      const orderBreakTiming = breakTiming || break_timing || null;

      // Generate order ID
      const orderId = 'ord_' + Math.random().toString(36).substring(2, 11);

      // 1. Call Cashfree to provision the PG payment session
      const cfOrder = await this.paymentService.createCashfreeOrder({
        orderId,
        orderAmount: Number(totalPrice),
        customerName: name,
        customerRoll: rollNumber,
        customerPhone: phone,
        customerEmail: email,
      });

      // 2. Count existing orders to allocate sequential order number
      const totalOrders = await this.orderRepository.countAll();
      const orderNum = 1001 + totalOrders;
      const orderNumber = `#${orderNum}`;

      // Generate alphanumeric pickup code
      const pickupCode = generatePickupCode(4);

      // 3. Persist order with initial payment_status
      const db = await getDb();
      await db.query(
        `INSERT INTO orders (id, order_number, student_name, student_roll, items, total_price, status, pickup_code, canteen_id, payment_status, payment_session_id, cf_order_id, building, break_timing)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          orderId,
          orderNumber,
          name,
          rollNumber,
          JSON.stringify(items),
          totalPrice,
          'PENDING',
          pickupCode,
          canteenId,
          'PENDING',
          cfOrder.payment_session_id,
          cfOrder.cf_order_id?.toString() || '',
          orderBuilding,
          orderBreakTiming,
        ]
      );

      this.handleSuccess(
        res,
        {
          orderId,
          orderNumber,
          paymentSessionId: cfOrder.payment_session_id,
          cfOrderId: cfOrder.cf_order_id,
          orderAmount: cfOrder.order_amount,
          environment: config.cashfree.env === 'PROD' ? 'production' : 'sandbox',
        },
        201
      );
    } catch (error) {
      this.handleError(error, res, 'createPaymentSession');
    }
  }

  /**
   * Verify Cashfree order payment status and transition order
   */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        res.status(400).json({ error: 'Order ID is required' });
        return;
      }

      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found in database' });
        return;
      }

      // Check status with Cashfree
      const cfStatus = await this.paymentService.getCashfreeOrderStatus(orderId);

      const db = await getDb();
      if (cfStatus.order_status === 'PAID') {
        // Update payment status in database
        await db.query(
          `UPDATE orders SET payment_status = 'PAID', status = 'PENDING' WHERE id = $1`,
          [orderId]
        );

        const updatedOrder = await this.orderRepository.findById(orderId);
        const parsedOrder = {
          ...updatedOrder!,
          items: JSON.parse(updatedOrder!.items),
          qr_payload: buildQRPayload(updatedOrder!),
        };

        // Notify canteen staff kitchen dashboard & student live socket
        emitOrderCreated(parsedOrder);
        emitOrderStatusChanged(parsedOrder);

        this.handleSuccess(res, {
          success: true,
          status: 'PAID',
          order: parsedOrder,
        });
      } else {
        this.handleSuccess(res, {
          success: false,
          status: cfStatus.order_status,
          message: `Order status is currently ${cfStatus.order_status}`,
        });
      }
    } catch (error) {
      this.handleError(error, res, 'verifyPayment');
    }
  }

  /**
   * Webhook endpoint for async Cashfree payment notifications
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;
      const rawBody = JSON.stringify(req.body);

      // Verify webhook authenticity if signature is provided
      if (signature && timestamp) {
        const isValid = this.paymentService.verifyWebhookSignature(signature, rawBody, timestamp);
        if (!isValid) {
          console.warn('[Cashfree Webhook] Invalid signature received');
          res.status(400).json({ error: 'Invalid signature' });
          return;
        }
      }

      const event = req.body;
      console.log('[Cashfree Webhook] Event received:', event?.type || event?.event);

      const orderData = event?.data?.order;
      if (orderData && (orderData.order_status === 'PAID' || event.type === 'PAYMENT_SUCCESS_WEBHOOK')) {
        const orderId = orderData.order_id;
        const db = await getDb();
        await db.query(
          `UPDATE orders SET payment_status = 'PAID', status = 'PENDING' WHERE id = $1`,
          [orderId]
        );

        const updatedOrder = await this.orderRepository.findById(orderId);
        if (updatedOrder) {
          const parsedOrder = {
            ...updatedOrder,
            items: JSON.parse(updatedOrder.items),
            qr_payload: buildQRPayload(updatedOrder),
          };
          emitOrderCreated(parsedOrder);
          emitOrderStatusChanged(parsedOrder);
        }
      }

      res.status(200).json({ status: 'OK' });
    } catch (error) {
      console.error('[Cashfree Webhook] Processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}
