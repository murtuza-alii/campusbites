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
  role: 'admin' | 'manager' | 'cook' | 'delivery';
  displayName: string;
  canteenId: string | null;
  canteenName: string | null;
  canteenSlug: string | null;
  createdAt: string;
}

export interface MonthlySalesSummary {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  avgOrderValue: number;
  totalItemsSold: number;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  dailyStats: Array<{
    date: string;
    dayLabel: string;
    revenue: number;
    orders: number;
  }>;
}

export interface MonthlySalesResponse {
  canteen: {
    id: string | null;
    name: string | null;
    slug: string | null;
  } | null;
  allTimeSummary: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    avgOrderValue: number;
    totalItemsSold: number;
  };
  months: MonthlySalesSummary[];
  selectedMonth: MonthlySalesSummary | null;
  orders: any[];
  totalOrdersCount: number;
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
    role: 'manager' | 'cook' | 'delivery';
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
      // Cook or Delivery account
      if (!data.pin || data.pin.trim().length < 3) {
        const err = new Error('An alphanumeric passcode/PIN of at least 3 characters is required for Cook and Delivery accounts.');
        (err as any).statusCode = 400;
        throw err;
      }
      pinHash = bcrypt.hashSync(data.pin.trim(), 10);
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
      if (data.pin.trim().length < 3) {
        const err = new Error('Cook / Delivery alphanumeric passcode must be at least 3 characters.');
        (err as any).statusCode = 400;
        throw err;
      }
      updates.push(`pin_hash = $${idx++}`);
      params.push(bcrypt.hashSync(data.pin.trim(), 10));
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

  async getMonthlySalesAnalytics(filters?: {
    canteenId?: string;
    month?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<MonthlySalesResponse> {
    const db = await getDb();
    const canteenId = filters?.canteenId || null;

    // 1. Fetch Canteen Info
    let canteenInfo: any = null;
    if (canteenId) {
      const cRes = await db.query('SELECT id, name, slug FROM canteen WHERE id = $1', [canteenId]);
      if (cRes.rows.length > 0) {
        canteenInfo = cRes.rows[0];
      }
    }

    // 2. Fetch all orders matching the canteen filter
    let orderQuery = `
      SELECT 
        o.*,
        c.name as canteen_name,
        c.slug as canteen_slug
      FROM orders o
      LEFT JOIN canteen c ON c.id = o.canteen_id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIdx = 1;

    if (canteenId) {
      orderQuery += ` AND o.canteen_id = $${paramIdx++}`;
      queryParams.push(canteenId);
    }

    orderQuery += ` ORDER BY o.created_at DESC`;

    const allOrdersRes = await db.query(orderQuery, queryParams);
    const rawOrders = allOrdersRes.rows;

    // 3. Compute All-Time Summary & Monthly Buckets
    const monthMap = new Map<string, {
      monthKey: string;
      year: number;
      month: number;
      totalRevenue: number;
      totalOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      activeOrders: number;
      totalItemsSold: number;
      itemMap: Map<string, { name: string; quantity: number; revenue: number }>;
      dailyMap: Map<string, { date: string; revenue: number; orders: number }>;
    }>();

    let allTimeRevenue = 0;
    let allTimeOrders = 0;
    let allTimeCompleted = 0;
    let allTimeCancelled = 0;
    let allTimeActive = 0;
    let allTimeItemsSold = 0;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (const order of rawOrders) {
      const createdAt = new Date(order.created_at);
      const year = createdAt.getFullYear();
      const monthNum = createdAt.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const dateKey = createdAt.toISOString().split('T')[0];

      const price = parseFloat(order.total_price || '0');
      const isCancelled = order.status === 'CANCELLED';
      const isCompleted = order.status === 'COMPLETED';
      const isActive = ['PLACED', 'PREPARING', 'READY'].includes(order.status);

      allTimeOrders++;
      if (!isCancelled) allTimeRevenue += price;
      if (isCompleted) allTimeCompleted++;
      if (isCancelled) allTimeCancelled++;
      if (isActive) allTimeActive++;

      // Parse items
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (!Array.isArray(parsedItems)) parsedItems = [];
      } catch {
        parsedItems = [];
      }

      let orderItemCount = 0;
      parsedItems.forEach((i: any) => {
        const q = parseInt(i.quantity || '1', 10);
        orderItemCount += q;
      });
      if (!isCancelled) {
        allTimeItemsSold += orderItemCount;
      }

      // Monthly bucket
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          year,
          month: monthNum,
          totalRevenue: 0,
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          activeOrders: 0,
          totalItemsSold: 0,
          itemMap: new Map(),
          dailyMap: new Map()
        });
      }

      const m = monthMap.get(monthKey)!;
      m.totalOrders++;
      if (!isCancelled) {
        m.totalRevenue += price;
        m.totalItemsSold += orderItemCount;
      }
      if (isCompleted) m.completedOrders++;
      if (isCancelled) m.cancelledOrders++;
      if (isActive) m.activeOrders++;

      // Item sales tracking for month
      if (!isCancelled) {
        parsedItems.forEach((item: any) => {
          const name = item.name || 'Dish';
          const qty = parseInt(item.quantity || '1', 10);
          const itemPrice = parseFloat(item.price || '0') * qty;
          
          const existing = m.itemMap.get(name) || { name, quantity: 0, revenue: 0 };
          existing.quantity += qty;
          existing.revenue += itemPrice;
          m.itemMap.set(name, existing);
        });

        // Daily stats tracking for month
        const dayExisting = m.dailyMap.get(dateKey) || { date: dateKey, revenue: 0, orders: 0 };
        dayExisting.orders++;
        dayExisting.revenue += price;
        m.dailyMap.set(dateKey, dayExisting);
      }
    }

    // Format monthly bucket list
    const months: MonthlySalesSummary[] = Array.from(monthMap.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map(m => {
        const monthLabel = `${monthNames[m.month - 1]} ${m.year}`;
        const nonCancelledOrders = m.totalOrders - m.cancelledOrders;
        const avgOrderValue = nonCancelledOrders > 0 ? Math.round((m.totalRevenue / nonCancelledOrders) * 100) / 100 : 0;
        
        const topItems = Array.from(m.itemMap.values())
          .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
          .slice(0, 10);

        const dailyStats = Array.from(m.dailyMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(d => {
            const dObj = new Date(d.date);
            const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return {
              date: d.date,
              dayLabel,
              revenue: Math.round(d.revenue * 100) / 100,
              orders: d.orders
            };
          });

        return {
          monthKey: m.monthKey,
          monthLabel,
          year: m.year,
          month: m.month,
          totalRevenue: Math.round(m.totalRevenue * 100) / 100,
          totalOrders: m.totalOrders,
          completedOrders: m.completedOrders,
          cancelledOrders: m.cancelledOrders,
          activeOrders: m.activeOrders,
          avgOrderValue,
          totalItemsSold: m.totalItemsSold,
          topItems,
          dailyStats
        };
      });

    // Selected month determination
    const targetMonthKey = filters?.month && filters.month !== 'ALL' 
      ? filters.month 
      : (months.length > 0 ? months[0].monthKey : null);

    const selectedMonth = targetMonthKey ? (months.find(m => m.monthKey === targetMonthKey) || null) : null;

    // Filter orders for return based on selected month, search, and status
    let filteredOrders = rawOrders;

    if (targetMonthKey && filters?.month !== 'ALL') {
      filteredOrders = filteredOrders.filter(o => {
        const d = new Date(o.created_at);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return mKey === targetMonthKey;
      });
    }

    if (filters?.status && filters.status !== 'ALL') {
      filteredOrders = filteredOrders.filter(o => o.status === filters.status!.toUpperCase());
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filteredOrders = filteredOrders.filter(o => {
        const numMatch = o.order_number?.toLowerCase().includes(q);
        const nameMatch = o.student_name?.toLowerCase().includes(q);
        const rollMatch = o.student_roll?.toLowerCase().includes(q);
        const pinMatch = o.pickup_code?.toLowerCase().includes(q);
        let itemMatch = false;
        try {
          const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
          itemMatch = items.some((i: any) => i.name?.toLowerCase().includes(q));
        } catch {}
        return numMatch || nameMatch || rollMatch || pinMatch || itemMatch;
      });
    }

    const totalOrdersCount = filteredOrders.length;
    const limit = filters?.limit || 250;
    const offset = filters?.offset || 0;
    const paginatedOrders = filteredOrders.slice(offset, offset + limit);

    const allTimeNonCancelled = allTimeOrders - allTimeCancelled;
    const allTimeAOV = allTimeNonCancelled > 0 ? Math.round((allTimeRevenue / allTimeNonCancelled) * 100) / 100 : 0;

    return {
      canteen: canteenInfo ? {
        id: canteenInfo.id,
        name: canteenInfo.name,
        slug: canteenInfo.slug
      } : null,
      allTimeSummary: {
        totalRevenue: Math.round(allTimeRevenue * 100) / 100,
        totalOrders: allTimeOrders,
        completedOrders: allTimeCompleted,
        cancelledOrders: allTimeCancelled,
        activeOrders: allTimeActive,
        avgOrderValue: allTimeAOV,
        totalItemsSold: allTimeItemsSold
      },
      months,
      selectedMonth,
      orders: paginatedOrders,
      totalOrdersCount
    };
  }
}
