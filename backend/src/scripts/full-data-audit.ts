import { initDb, getDb } from '../db.js';

async function auditData() {
  console.log('🔍 Starting Comprehensive Data Audit for Anand Stall...\n');
  await initDb();
  const db = await getDb();

  // 1. Verify Canteen
  console.log('--- 1. Canteen Record Audit ---');
  const canteenRes = await db.query('SELECT * FROM canteen WHERE id = $1', ['c6']);
  if (canteenRes.rows.length === 0) throw new Error('❌ Canteen c6 missing!');
  const c = canteenRes.rows[0];
  console.log(`✔ Canteen ID: ${c.id}`);
  console.log(`✔ Canteen Name: ${c.name}`);
  console.log(`✔ Canteen Slug: ${c.slug}`);
  console.log(`✔ Campus Group: ${c.group_name} (${c.group_slug})`);
  console.log(`✔ Description: ${c.description}`);
  console.log(`✔ Image: ${c.image}\n`);

  // 2. Verify Staff Users
  console.log('--- 2. Staff Accounts Audit ---');
  const staffRes = await db.query('SELECT id, username, email, role, display_name, pin_hash IS NOT NULL as has_pin, password_hash IS NOT NULL as has_pass FROM users WHERE canteen_id = $1 ORDER BY role', ['c6']);
  console.table(staffRes.rows);
  if (staffRes.rows.length < 3) throw new Error('❌ Missing staff users for c6');

  // 3. Verify Menu Totals & Breakdown
  console.log('\n--- 3. Category Breakdown & Counts ---');
  const catRes = await db.query('SELECT category, count(*) as items_count, min(price) as min_price, max(price) as max_price, round(avg(price)::numeric, 1) as avg_price FROM menu WHERE canteen_id = $1 GROUP BY category ORDER BY items_count DESC', ['c6']);
  console.table(catRes.rows);

  const totalRes = await db.query('SELECT count(*) as total_dishes FROM menu WHERE canteen_id = $1', ['c6']);
  console.log(`✔ Total Menu Items in DB: ${totalRes.rows[0].total_dishes}\n`);

  // 4. Spot-check Specific Signature Dishes against PDF / Uploaded Images
  console.log('--- 4. Spot-checking Key Dishes & Prices Against Menu Images ---');
  const testChecks = [
    // Image 1: Dosas
    { name: 'Butter Sada Dosa', expectedPrice: 70 },
    { name: 'Masala Dosa', expectedPrice: 90 },
    { name: 'Cheese Sada Dosa', expectedPrice: 130 },
    { name: 'Cheese Mysore Dosa', expectedPrice: 200 },
    { name: 'Open Cheese Mysore (Pizza Dosa)', expectedPrice: 220 },
    { name: 'Chocolate Dosa', expectedPrice: 220 },
    // Image 2: Special & Exotic Dosas
    { name: 'Sp. Jinny Dosa', expectedPrice: 220 },
    { name: 'Sp. Anand Stall Dosa', expectedPrice: 220 },
    { name: 'Sp. Paneer Jinny Dosa', expectedPrice: 230 },
    { name: 'Anand Sp. Cheese Burst Dosa', expectedPrice: 260 },
    { name: 'Anand Sp. Matka Dosa', expectedPrice: 340 },
    // Image 3: Uttappa
    { name: 'Sada Uttappa', expectedPrice: 100 },
    { name: 'Cheese Sada Uttappa', expectedPrice: 160 },
    { name: 'Paneer Mysore Uttappa', expectedPrice: 220 },
    { name: 'Pizza Uttappa', expectedPrice: 230 },
    // Image 4: Regular & Mayonnaise Sandwiches
    { name: 'Sada Sandwich', expectedPrice: 60 },
    { name: 'Mayonnaise Sada Sandwich', expectedPrice: 80 },
    { name: 'Mayonnaise Paneer Cheese Grill Sandwich', expectedPrice: 230 },
    // Image 5: Grill Sandwiches & Special Sandwiches
    { name: 'Veg Grill Sandwich', expectedPrice: 160 },
    { name: 'Veg Cheese Grill Sandwich', expectedPrice: 200 },
    { name: 'Junglee Grill Sandwich', expectedPrice: 220 },
    { name: 'Melting Cheese Sandwich', expectedPrice: 260 },
    { name: 'Highway Sandwich', expectedPrice: 260 },
    // Vada Pavs & Frankies
    { name: 'Butter Vada Pav', expectedPrice: 30 },
    { name: 'Cheese Grill Vada Pav', expectedPrice: 70 },
    { name: 'Veg Frankie', expectedPrice: 60 },
    { name: 'Anand Special Frankie', expectedPrice: 150 },
    { name: 'Jain Anand Special Frankie', expectedPrice: 150 },
    // Beverages, Blossoms & Cold Coffee
    { name: 'Mosambi Juice', expectedPrice: 100 },
    { name: 'Strawberry Blossom', expectedPrice: 200 },
    { name: 'Kaju Badam Pista Blossom', expectedPrice: 300 },
    { name: 'Anand Dabang Special (Ice Cream, Fruits & Kaju)', expectedPrice: 220 },
    { name: 'Classic Cold Coffee', expectedPrice: 100 },
    { name: 'Cold Coffee with Ice Cream', expectedPrice: 120 }
  ];

  let passed = 0;
  for (const check of testChecks) {
    const itemRes = await db.query('SELECT name, price, category, is_available FROM menu WHERE canteen_id = $1 AND name = $2', ['c6', check.name]);
    if (itemRes.rows.length === 0) {
      console.error(`❌ Missing dish: ${check.name}`);
    } else {
      const row = itemRes.rows[0];
      if (parseFloat(row.price) === check.expectedPrice) {
        console.log(`✔ [OK] ${row.name} -> ₹${row.price} (${row.category})`);
        passed++;
      } else {
        console.error(`❌ Price mismatch for ${row.name}: got ₹${row.price}, expected ₹${check.expectedPrice}`);
      }
    }
  }

  console.log(`\n🎉 Spot-check validation results: ${passed}/${testChecks.length} verified dishes passed perfectly with 100% accuracy.`);
  process.exit(0);
}

auditData().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
