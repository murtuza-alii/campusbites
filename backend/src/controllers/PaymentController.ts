import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { PaymentService } from '../services/PaymentService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { emitOrderCreated, emitOrderStatusChanged } from '../utils/websocket.js';
import { buildQRPayload, generatePickupCode } from '../utils/qrSigner.js';
import { generateSlotOrderNumber } from '../utils/orderNumber.js';
import { getDb } from '../db.js';
import { config } from '../config/unifiedConfig.js';
import { calculateHike } from '../utils/pricing.js';


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
      const { name, rollNumber, canteenId, items, phone, email, building, breakTiming, break_timing } = req.body;

      if (!name || !rollNumber || !canteenId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Missing required order details' });
        return;
      }

      // Check stock and compute subtotal + additional charges against DB records
      const db = await getDb();
      const itemIds = items.map((i: any) => i.id).filter(Boolean);

      let calculatedSubtotal = 0;
      let calculatedAdditionalCharges = 0;
      const verifiedItems: any[] = [];

      if (itemIds.length > 0) {
        const placeholders = itemIds.map((_: any, idx: number) => `$${idx + 1}`).join(',');
        const stockRes = await db.query(
          `SELECT id, name, price, price_hike, is_available FROM menu WHERE id IN (${placeholders})`,
          itemIds
        );
        const menuMap = new Map(stockRes.rows.map((r: any) => [r.id, r]));

        const outOfStockNames: string[] = [];
        for (const item of items) {
          const dbItem = menuMap.get(item.id);
          if (dbItem) {
            if (dbItem.is_available === 0) {
              outOfStockNames.push(dbItem.name);
            }
            const itemHike = dbItem.price_hike !== undefined && dbItem.price_hike !== null
              ? Number(dbItem.price_hike)
              : calculateHike(Number(dbItem.price));
            const qty = Number(item.quantity) || 1;
            calculatedSubtotal += Number(dbItem.price) * qty;
            calculatedAdditionalCharges += itemHike * qty;
            verifiedItems.push({
              id: dbItem.id,
              name: dbItem.name,
              price: Number(dbItem.price),
              price_hike: itemHike,
              quantity: qty,
            });
          } else {
            const price = Number(item.price) || 0;
            const itemHike = item.price_hike !== undefined && item.price_hike !== null
              ? Number(item.price_hike)
              : calculateHike(price);
            const qty = Number(item.quantity) || 1;
            calculatedSubtotal += price * qty;
            calculatedAdditionalCharges += itemHike * qty;
            verifiedItems.push({
              ...item,
              price,
              price_hike: itemHike,
              quantity: qty,
            });
          }
        }

        if (outOfStockNames.length > 0) {
          res.status(400).json({ error: `The following dish(es) are currently sold out: ${outOfStockNames.join(', ')}. Please remove them from your cart.` });
          return;
        }
      } else {
        // Fallback calculation if item IDs are missing
        for (const item of items) {
          const price = Number(item.price) || 0;
          const itemHike = item.price_hike !== undefined ? Number(item.price_hike) : calculateHike(price);
          const qty = Number(item.quantity) || 1;
          calculatedSubtotal += price * qty;
          calculatedAdditionalCharges += itemHike * qty;
          verifiedItems.push({
            ...item,
            price,
            price_hike: itemHike,
            quantity: qty,
          });
        }
      }

      const finalTotalPrice = Number((calculatedSubtotal + calculatedAdditionalCharges).toFixed(2));

      const orderBuilding = building || null;
      const orderBreakTiming = breakTiming || break_timing || null;

      // Generate order ID
      const orderId = 'ord_' + Math.random().toString(36).substring(2, 11);

      // 1. Call Cashfree to provision the PG payment session
      const cfOrder = await this.paymentService.createCashfreeOrder({
        orderId,
        orderAmount: finalTotalPrice,
        customerName: name,
        customerRoll: rollNumber,
        customerPhone: phone,
        customerEmail: email,
      });

      // 2. Calculate slot and alphanumeric order number
      const totalOrders = await this.orderRepository.countAll();
      const { orderNumber, slotNumber } = generateSlotOrderNumber(totalOrders);

      // Generate alphanumeric pickup code
      const pickupCode = generatePickupCode(4);

      // 3. Persist order with additional_charges, payment_status, and slot_number
      await db.query(
        `INSERT INTO orders (id, order_number, student_name, student_roll, items, total_price, additional_charges, status, pickup_code, canteen_id, payment_status, payment_session_id, cf_order_id, building, break_timing, slot_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          orderId,
          orderNumber,
          name,
          rollNumber,
          JSON.stringify(verifiedItems),
          finalTotalPrice,
          calculatedAdditionalCharges,
          'PENDING',
          pickupCode,
          canteenId,
          'PENDING',
          cfOrder.payment_session_id,
          cfOrder.cf_order_id?.toString() || '',
          orderBuilding,
          orderBreakTiming,
          slotNumber,
        ]
      );

      this.handleSuccess(
        res,
        {
          orderId,
          orderNumber,
          slotNumber,
          paymentSessionId: cfOrder.payment_session_id,
          cfOrderId: cfOrder.cf_order_id,
          orderAmount: cfOrder.order_amount,
          subtotal: calculatedSubtotal,
          additionalCharges: calculatedAdditionalCharges,
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
