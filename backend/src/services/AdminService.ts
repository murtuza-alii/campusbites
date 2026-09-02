import { getDb } from '../db.js';
import bcrypt from 'bcryptjs';

export interface OverviewMetrics {
  totalRevenue: number;
  totalOrders: number;
  placedOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  canteenBreakdown: Array<{
    canteenId: string;
    canteenName: string;
    slug: string;
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
  }>;
  recentOrders: any[];
}

export interface StaffUserSummary {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'manager' | 'cook';
  displayName: string;
  canteenId: string | null;
  canteenName: string | null;
  canteenSlug: string | null;
  createdAt: string;
}

export class AdminService {
  async getOverview(): Promise<OverviewMetrics> {
    const db = await getDb();

    // 1. Order counts and revenue
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_price ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN status = 'PLACED' THEN 1 END) as placed_orders,
        COUNT(CASE WHEN status = 'PREPARING' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM orders
    `);
    const s = statsRes.rows[0];

    // 2. Breakdown per canteen
    const breakdownRes = await db.query(`
      SELECT 
        c.id as canteen_id,
        c.name as canteen_name,
        c.slug,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total_price ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN o.status IN ('PLACED', 'PREPARING', 'READY') THEN 1 END) as active_orders
      FROM canteen c
      LEFT JOIN orders o ON o.canteen_id = c.id
      GROUP BY c.id, c.name, c.slug
      ORDER BY total_orders DESC, c.name ASC
    `);

    // 3. Top 15 recent orders across all canteens
    const recentRes = await db.query(`
      SELECT 
        o.*,
        c.name as canteen_name,
        c.slug as canteen_slug
      FROM orders o
      LEFT JOIN canteen c ON c.id = o.canteen_id
      ORDER BY o.created_at DESC
      LIMIT 15
    `);

    return {
      totalRevenue: parseFloat(s.total_revenue || '0'),
      totalOrders: parseInt(s.total_orders || '0', 10),
      placedOrders: parseInt(s.placed_orders || '0', 10),
      preparingOrders: parseInt(s.preparing_orders || '0', 10),
      readyOrders: parseInt(s.ready_orders || '0', 10),
      completedOrders: parseInt(s.completed_orders || '0', 10),
      cancelledOrders: parseInt(s.cancelled_orders || '0', 10),
      canteenBreakdown: breakdownRes.rows.map(r => ({
        canteenId: r.canteen_id,
        canteenName: r.canteen_name,
        slug: r.slug,
        totalOrders: parseInt(r.total_orders || '0', 10),
        totalRevenue: parseFloat(r.total_revenue || '0'),
        activeOrders: parseInt(r.active_orders || '0', 10)
      })),
      recentOrders: recentRes.rows
    };
  }

  async getAllOrdersGlobal(filters?: {
    status?: string;
    canteenId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: any[]; totalCount: number }> {
    const db = await getDb();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters?.status && filters.status !== 'ALL') {
      conditions.push(`o.status = $${idx++}`);
      params.push(filters.status.toUpperCase());
    }

    if (filters?.canteenId && filters.canteenId !== 'ALL') {
      conditions.push(`o.canteen_id = $${idx++}`);
      params.push(filters.canteenId);
    }

    if (filters?.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(
        `(o.order_number ILIKE $${idx} OR o.student_name ILIKE $${idx} OR o.student_roll ILIKE $${idx} OR o.pickup_code ILIKE $${idx})`
      );
      params.push(searchPattern);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) as count FROM orders o ${whereClause}`, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const query = `
      SELECT 
        o.*,
        c.name as canteen_name,
        c.slug as canteen_slug
      FROM orders o
      LEFT JOIN canteen c ON c.id = o.canteen_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);

    const ordersRes = await db.query(query, params);
    return {
      orders: ordersRes.rows,
      totalCount
    };
  }

  async getStaffList(): Promise<StaffUserSummary[]> {
    const db = await getDb();
    const res = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.display_name,
        u.canteen_id,
        c.name as canteen_name,
        c.slug as canteen_slug,
        u.created_at
      FROM users u
      LEFT JOIN canteen c ON c.id = u.canteen_id
      ORDER BY 
        CASE WHEN u.role = 'admin' THEN 1 WHEN u.role = 'manager' THEN 2 ELSE 3 END,
        u.created_at ASC
    `);

    return res.rows.map(r => ({
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      displayName: r.display_name || r.username,
      canteenId: r.canteen_id,
      canteenName: r.canteen_name,
      canteenSlug: r.canteen_slug,
      createdAt: r.created_at
    }));
  }

  async createStaffUser(data: {
    role: 'manager' | 'cook';
    displayName: string;
    canteenId: string;
    email?: string;
    username?: string;
    password?: string;
    pin?: string;
  }): Promise<StaffUserSummary> {
    const db = await getDb();
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const username = data.username || `${data.role}_${Date.now().toString().slice(-4)}`;
    
    let passwordHash: string | null = null;
    let pinHash: string | null = null;

    if (data.role === 'manager') {
      if (!data.email || !data.password) {
        const err = new Error('Email and password are required for Store Manager accounts.');
        (err as any).statusCode = 400;
        throw err;
      }
      passwordHash = bcrypt.hashSync(data.password, 10);
    } else {
      // Cook account
      if (!data.pin || !/^\d{4,6}$/.test(data.pin)) {
        const err = new Error('A 4-6 digit numeric PIN is required for Cook accounts.');
        (err as any).statusCode = 400;
        throw err;
      }
      pinHash = bcrypt.hashSync(data.pin, 10);
    }

    await db.query(
      `INSERT INTO users (id, username, email, password_hash, pin_hash, role, canteen_id, display_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, username, data.email || null, passwordHash, pinHash, data.role, data.canteenId, data.displayName]
    );

    const cRes = await db.query('SELECT name, slug FROM canteen WHERE id = $1', [data.canteenId]);
    const canteen = cRes.rows[0];

    return {
      id,
      username,
      email: data.email || null,
      role: data.role,
      displayName: data.displayName,
      canteenId: data.canteenId,
      canteenName: canteen?.name || null,
      canteenSlug: canteen?.slug || null,
      createdAt: new Date().toISOString()
    };
  }

  async updateStaffCredentials(
    userId: string,
    data: {
      pin?: string;
      password?: string;
      displayName?: string;
      email?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const db = await getDb();
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      const err = new Error('Staff user not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const user = userRes.rows[0];
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.displayName) {
      updates.push(`display_name = $${idx++}`);
      params.push(data.displayName);
    }

    if (data.email) {
      updates.push(`email = $${idx++}`);
      params.push(data.email);
    }

    if (data.password) {
      updates.push(`password_hash = $${idx++}`);
      params.push(bcrypt.hashSync(data.password, 10));
    }

    if (data.pin) {
      if (!/^\d{4,6}$/.test(data.pin)) {
        const err = new Error('Cook PIN must be 4 to 6 digits.');
        (err as any).statusCode = 400;
        throw err;
      }
      updates.push(`pin_hash = $${idx++}`);
      params.push(bcrypt.hashSync(data.pin, 10));
    }

    if (updates.length === 0) {
      return { success: true, message: 'No changes provided.' };
    }

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    );

    return {
      success: true,
      message: `Staff credentials for ${user.display_name || user.username} updated successfully!`
    };
  }
}
