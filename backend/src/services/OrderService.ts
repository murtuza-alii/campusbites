import { OrderRepository } from '../repositories/OrderRepository.js';
import { ParsedOrder } from '../types/index.js';
import { emitOrderStatusChanged } from '../utils/websocket.js';
import { orderQueue } from '../queues/orderQueue.js';

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async placeOrder(data: {
    name: string;
    rollNumber: string;
    canteenId: string;
    items: any[];
    totalPrice: number;
  }): Promise<ParsedOrder> {
    // Generate order ID synchronously so the client can immediately subscribe to updates
    const id = 'ord_' + Math.random().toString(36).substring(2, 11);

    // Push the checkout task to the BullMQ Redis queue
    await orderQueue.add('checkout', {
      id,
      student_name: data.name,
      student_roll: data.rollNumber,
      canteen_id: data.canteenId,
      items: JSON.stringify(data.items),
      total_price: data.totalPrice,
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
      pickup_code: '...',
      created_at: new Date().toISOString(),
    };
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
      items: JSON.parse(order.items)
    };
  }

  async getAllOrders(canteenId?: string): Promise<ParsedOrder[]> {
    const orders = await this.orderRepository.findAll(canteenId);
    return orders.map(ord => ({
      ...ord,
      items: JSON.parse(ord.items)
    }));
  }

  async updateOrderStatus(id: string, status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED'): Promise<void> {
    const existing = await this.orderRepository.findById(id);
    if (!existing) {
      const err = new Error('Order not found');
      (err as any).statusCode = 404;
      throw err;
    }

    await this.orderRepository.updateStatus(id, status);

    const updated = await this.orderRepository.findById(id);
    if (updated) {
      const parsedOrder = {
        ...updated,
        items: JSON.parse(updated.items)
      };

      // Emit WebSocket notification to student client and admins
      emitOrderStatusChanged(parsedOrder);
    }
  }
}
