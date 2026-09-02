import { OrderRepository } from '../repositories/OrderRepository.js';
import { ParsedOrder } from '../types/index.js';
import { emitOrderCreated, emitOrderStatusChanged } from '../utils/websocket.js';
import { orderQueue } from '../queues/orderQueue.js';
import { buildQRPayload, generatePickupCode } from '../utils/qrSigner.js';

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async placeOrder(data: {
    name: string;
    rollNumber: string;
    canteenId: string;
    items: any[];
    totalPrice: number;
  }): Promise<ParsedOrder> {
    const id = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pickupCode = generatePickupCode(4);

    try {
      // Direct fast-path via Redis Bull Queue
      await orderQueue.add('process_order', {
        id,
        pickupCode,
        ...data,
      });

      console.log(`Enqueued checkout job for order ID: ${id}`);

      // Return immediate pending state representation
      return {
        id,
        order_number: 'Queueing...',
        student_name: data.name,
        student_roll: data.rollNumber,
        canteen_id: data.canteenId,
        items: data.items,
        total_price: data.totalPrice,
        status: 'PENDING',
        pickup_code: pickupCode,
        created_at: new Date().toISOString(),
      };
    } catch (queueError) {
      console.warn('Redis queue unavailable, falling back to direct database write:', queueError);

      // Calculate order number sequentially
      const totalOrders = await this.orderRepository.countAll();
      const orderNum = 1001 + totalOrders;
      const orderNumber = `#${orderNum}`;

      // Write order directly to PostgreSQL
      await this.orderRepository.create({
        id,
        order_number: orderNumber,
        student_name: data.name,
        student_roll: data.rollNumber,
        canteen_id: data.canteenId,
        items: JSON.stringify(data.items),
        total_price: data.totalPrice,
        status: 'PENDING',
        pickup_code: pickupCode,
      });

      const parsedOrder: ParsedOrder = {
        id,
        order_number: orderNumber,
        student_name: data.name,
        student_roll: data.rollNumber,
        canteen_id: data.canteenId,
        items: data.items,
        total_price: data.totalPrice,
        status: 'PENDING',
        pickup_code: pickupCode,
        created_at: new Date().toISOString(),
        qr_payload: buildQRPayload({ id, order_number: orderNumber, canteen_id: data.canteenId, pickup_code: pickupCode })
      };

      // Notify staff dashboard and student in real-time
      emitOrderCreated(parsedOrder);
      emitOrderStatusChanged(parsedOrder);

      return parsedOrder;
    }
  }

  async getOrderDetails(id: string): Promise<ParsedOrder> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      const err = new Error('Order not found');
      (err as any).statusCode = 404;
      throw err;
    }

    return {
      ...order,
      items: JSON.parse(order.items),
      qr_payload: buildQRPayload(order)
    };
  }

  async getAllOrders(canteenId?: string | string[]): Promise<ParsedOrder[]> {
    const orders = await this.orderRepository.findAll(canteenId);
    return orders.map(ord => ({
      ...ord,
      items: JSON.parse(ord.items),
      qr_payload: buildQRPayload(ord)
    }));
  }

  async updateOrderStatus(id: string, status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'): Promise<void> {
    const existing = await this.orderRepository.findById(id);
    if (!existing) {
      const err = new Error('Order not found');
      (err as any).statusCode = 404;
      throw err;
    }

    await this.orderRepository.updateStatus(id, status);

    const updated = await this.orderRepository.findById(id);
    if (updated) {
      const parsedOrder: ParsedOrder = {
        ...updated,
        items: JSON.parse(updated.items),
        qr_payload: buildQRPayload(updated)
      };

      // Emit WebSocket notification to student client and admins
      emitOrderStatusChanged(parsedOrder);
    }
  }
}
