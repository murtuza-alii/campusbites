import { OrderRepository } from '../repositories/OrderRepository.js';
import { ParsedOrder } from '../types/index.js';

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async placeOrder(data: {
    name: string;
    rollNumber: string;
    items: any[];
    totalPrice: number;
  }): Promise<ParsedOrder> {
    const totalOrders = await this.orderRepository.countAll();
    const orderNum = 1001 + totalOrders;
    const orderNumber = `#${orderNum}`;
    
    const pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
    const id = 'ord_' + Math.random().toString(36).substring(2, 11);
    
    await this.orderRepository.create({
      id,
      order_number: orderNumber,
      student_name: data.name,
      student_roll: data.rollNumber,
      items: JSON.stringify(data.items),
      total_price: data.totalPrice,
      status: 'PENDING',
      pickup_code
    });

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Failed to retrieve newly created order');
    }

    return {
      ...order,
      items: JSON.parse(order.items)
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

  async getAllOrders(): Promise<ParsedOrder[]> {
    const orders = await this.orderRepository.findAll();
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
  }
}
