import { Router } from 'express';
import { getDb } from '../db.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();

// Register a new restaurant / campus canteen
router.post('/register', asyncErrorWrapper(async (req, res) => {
  const { restaurant_name, owner_name, email, phone, campus_name, city, daily_orders_capacity } = req.body;

  if (!restaurant_name || !owner_name || !email || !phone || !campus_name) {
    return res.status(400).json({ error: 'Please provide all required fields (restaurant_name, owner_name, email, phone, campus_name)' });
  }

  const id = 'reg_' + Math.random().toString(36).substring(2, 11);
  const db = await getDb();

  await db.query(
    `INSERT INTO restaurant_registrations (id, restaurant_name, owner_name, email, phone, campus_name, city, daily_orders_capacity, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
    [id, restaurant_name, owner_name, email, phone, campus_name, city || null, daily_orders_capacity || 100]
  );

  res.status(201).json({
    success: true,
    message: `Thank you, ${owner_name}! Your application for ${restaurant_name} at ${campus_name} has been received. Our campus integration team will reach out within 24 hours.`,
    registration_id: id
  });
}));

// Get all registrations (Admin endpoint)
router.get('/registrations', asyncErrorWrapper(async (req, res) => {
  const db = await getDb();
  const result = await db.query('SELECT * FROM restaurant_registrations ORDER BY created_at DESC');
  res.status(200).json(result.rows);
}));

export default router;
