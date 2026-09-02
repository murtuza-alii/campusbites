import { initDb, getDb } from '../db.js';

async function verify() {
  await initDb();
  const db = await getDb();
  
  const res = await db.query(
    'SELECT category, count(*) FROM menu WHERE canteen_id = $1 GROUP BY category ORDER BY count DESC',
    ['c6']
  );
  console.log('Anand Stall Menu Breakdown by Category:');
  console.table(res.rows);

  const total = await db.query('SELECT count(*) FROM menu WHERE canteen_id = $1', ['c6']);
  console.log('Total dishes seeded for Anand Stall:', total.rows[0].count);

  const staff = await db.query(
    'SELECT username, role, pin_hash IS NOT NULL as has_pin, password_hash IS NOT NULL as has_pass FROM users WHERE canteen_id = $1',
    ['c6']
  );
  console.log('Anand Stall Staff Users:');
  console.table(staff.rows);

  const sampleDosas = await db.query(
    'SELECT name, price, category FROM menu WHERE canteen_id = $1 AND name LIKE $2 LIMIT 5',
    ['c6', '%Dosa%']
  );
  console.log('Sample Dosa Items:');
  console.table(sampleDosas.rows);

  process.exit(0);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
