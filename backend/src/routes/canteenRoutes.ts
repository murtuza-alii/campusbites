import { Router } from 'express';
import { getDb } from '../db.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();

router.get('/', asyncErrorWrapper(async (req, res) => {
  const db = await getDb();
  const result = await db.query('SELECT * FROM canteen ORDER BY name ASC');
  res.status(200).json(result.rows);
}));

router.get('/by-slug/:slug', asyncErrorWrapper(async (req, res) => {
  const db = await getDb();
  const { slug } = req.params;
  const canteenRes = await db.query('SELECT * FROM canteen WHERE slug = $1 OR id = $1', [slug]);
  
  if (canteenRes.rows.length === 0) {
    return res.status(404).json({ error: 'Canteen not found' });
  }

  const canteen = canteenRes.rows[0];
  let sisterCanteens: any[] = [];
  if (canteen.group_name) {
    const sistersRes = await db.query('SELECT * FROM canteen WHERE group_name = $1 ORDER BY name ASC', [canteen.group_name]);
    sisterCanteens = sistersRes.rows;
  } else {
    sisterCanteens = [canteen];
  }

  res.status(200).json({ canteen, sisterCanteens });
}));

export default router;
