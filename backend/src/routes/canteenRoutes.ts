import { Router } from 'express';
import { getDb } from '../db.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();

router.get('/', asyncErrorWrapper(async (req, res) => {
  const db = await getDb();
  const result = await db.query('SELECT * FROM canteen ORDER BY group_name ASC, name ASC');
  res.status(200).json(result.rows);
}));

router.get('/by-slug/:slug', asyncErrorWrapper(async (req, res) => {
  const db = await getDb();
  const { slug } = req.params;
  
  // Look up by canteen slug, id, group_slug, or group_name
  const canteenRes = await db.query(
    'SELECT * FROM canteen WHERE slug = $1 OR id = $1 OR group_slug = $1 OR LOWER(group_name) = LOWER($1) OR LOWER(name) = LOWER($1) ORDER BY name ASC',
    [slug]
  );
  
  if (canteenRes.rows.length === 0) {
    return res.status(404).json({ error: 'Campus or canteen not found' });
  }

  const rows = canteenRes.rows;
  let canteen = rows[0];
  let sisterCanteens: any[] = [];

  // If the query matched a group_slug or group_name, all matched canteens are sister canteens
  if (rows.length > 1) {
    sisterCanteens = rows;
  } else if (canteen.group_name) {
    const sistersRes = await db.query('SELECT * FROM canteen WHERE group_name = $1 ORDER BY name ASC', [canteen.group_name]);
    sisterCanteens = sistersRes.rows;
  } else {
    sisterCanteens = [canteen];
  }

  res.status(200).json({ canteen, sisterCanteens });
}));

export default router;
