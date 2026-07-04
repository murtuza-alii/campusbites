import { getDb } from '../db.js';
import { Order } from '../types/index.js';

export class OrderRepository {
  async countAll(): Promise<number> {
    const db = await getDb();
    const result = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM orders');
    return result.rows[0] ? parseInt(result.rows[0].count, 10) : 0;
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
    canteen_id: string;
  }): Promise<void> {
    const db = await getDb();
    await db.query(
      `INSERT INTO orders (id, order_number, student_name, student_roll, items, total_price, status, pickup_code, canteen_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        order.id,
        order.order_number,
        order.student_name,
        order.student_roll,
        order.items,
        order.total_price,
        order.status,
        order.pickup_code,
        order.canteen_id
      ]
    );
  }

  async findById(id: string): Promise<Order | undefined> {
    const db = await getDb();
    const result = await db.query<Order>('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async findAll(canteenId?: string): Promise<Order[]> {
    const db = await getDb();
    if (canteenId) {
      const result = await db.query<Order>('SELECT * FROM orders WHERE canteen_id = $1 ORDER BY created_at DESC', [canteenId]);
      return result.rows;
    } else {
      const result = await db.query<Order>('SELECT * FROM orders ORDER BY created_at DESC');
      return result.rows;
    }
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const db = await getDb();
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
  }
}
