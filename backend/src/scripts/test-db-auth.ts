import { getDb, initDb } from '../db.js';

async function verifyAuthSchema() {
  console.log('Initializing database schema...');
  await initDb();
  const db = await getDb();
  
  // Verify columns in users table
  const colRes = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  const columns = colRes.rows.map(r => r.column_name);
  console.log('Detected users columns:', columns);
  const required = ['id', 'email', 'username', 'password_hash', 'pin_hash', 'role', 'canteen_id', 'display_name'];
  
  for (const col of required) {
    if (!columns.includes(col)) {
      throw new Error(`Missing required column: ${col} in users table`);
    }
  }

  // Verify seed users
  const adminRes = await db.query(`SELECT * FROM users WHERE role = 'admin'`);
  if (adminRes.rows.length === 0) throw new Error('No admin user found in database');
  console.log(`Found ${adminRes.rows.length} admin user(s). Example:`, adminRes.rows[0].email || adminRes.rows[0].username);

  const cookRes = await db.query(`SELECT * FROM users WHERE role = 'cook'`);
  if (cookRes.rows.length === 0) throw new Error('No cook user found in database');
  console.log(`Found ${cookRes.rows.length} cook user(s). Example PIN hash present:`, !!cookRes.rows[0].pin_hash);

  const mgrRes = await db.query(`SELECT * FROM users WHERE role = 'manager'`);
  if (mgrRes.rows.length === 0) throw new Error('No manager user found in database');
  console.log(`Found ${mgrRes.rows.length} manager user(s). Example:`, mgrRes.rows[0].email);

  console.log('Database auth schema & seed verification passed successfully!');
  process.exit(0);
}

verifyAuthSchema().catch(err => {
  console.error('Schema verification failed:', err);
  process.exit(1);
});
