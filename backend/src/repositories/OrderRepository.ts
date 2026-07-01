import { getDb } from '../db.js';
import { Order } from '../types/index.js';

export class OrderRepository {
  async countAll(): Promise<number> {
    const db = await getDb();
    const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM orders');
    return result ? result.count : 0;
  }

  async create(order: {
    id: string;
    order_number: string;
    student_name: string;
    student_roll: string;
    items: string;
    total_price: number;
    status: string;
    pickup_code: string;
  }): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO orders (id, order_number, student_name, student_roll, items, total_price, status, pickup_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.order_number,
        order.student_name,
        order.student_roll,
        order.items,
        order.total_price,
        order.status,
        order.pickup_code
      ]
    );
  }

  async findById(id: string): Promise<Order | undefined> {
    const db = await getDb();
    return db.get<Order>('SELECT * FROM orders WHERE id = ?', [id]);
  }

  async findAll(): Promise<Order[]> {
    const db = await getDb();
    return db.all<Order[]>('SELECT * FROM orders ORDER BY created_at DESC');
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  }
}
