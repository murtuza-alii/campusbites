import { Router } from 'express';
import { getDb } from '../db.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();

router.get('/', asyncErrorWrapper(async (req, res) => {
  const db = await getDb();
  const result = await db.query('SELECT * FROM canteen ORDER BY name ASC');
  res.status(200).json(result.rows);
}));

export default router;
