import { AuthService } from '../services/AuthService.js';
import { initDb } from '../db.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/unifiedConfig.js';

async function testAuth() {
  console.log('Initializing DB for Auth tests...');
  await initDb();
  const authService = new AuthService();

  // 1. Test Admin Login (Email + Password)
  console.log('1. Testing Super Admin Login with Email...');
  const adminToken = await authService.login({ 
    email: 'admin@campusbites.com', 
    password: 'adminpassword' 
  });
  if (!adminToken) throw new Error('Admin login failed');
  const decodedAdmin: any = jwt.verify(adminToken, config.auth.jwtSecret);
  if (decodedAdmin.role !== 'admin') throw new Error(`Expected admin role, got ${decodedAdmin.role}`);
  console.log('✔ Super Admin login verified. Token payload:', { role: decodedAdmin.role, email: decodedAdmin.email, displayName: decodedAdmin.displayName });

  // 2. Test Store Manager Login (Email + Password)
  console.log('2. Testing Store Manager Login with Email...');
  const mgrToken = await authService.login({ 
    email: 'manager@heritage50.com', 
    password: 'manager123' 
  });
  if (!mgrToken) throw new Error('Store Manager login failed');
  const decodedMgr: any = jwt.verify(mgrToken, config.auth.jwtSecret);
  if (decodedMgr.role !== 'manager') throw new Error(`Expected manager role, got ${decodedMgr.role}`);
  console.log('✔ Store Manager login verified. Token payload:', { role: decodedMgr.role, canteenId: decodedMgr.canteenId, displayName: decodedMgr.displayName });

  // 3. Test Cook Login (Canteen + PIN)
  console.log('3. Testing Cook Login with 4-Digit PIN...');
  const cookToken = await authService.login({ 
    canteen_slug: 'mithibai-canteen-a', 
    pin: '1234' 
  });
  if (!cookToken) throw new Error('Cook PIN login failed');
  const decodedCook: any = jwt.verify(cookToken, config.auth.jwtSecret);
  if (decodedCook.role !== 'cook') throw new Error(`Expected cook role, got ${decodedCook.role}`);
  console.log('✔ Cook PIN login verified. Token payload:', { role: decodedCook.role, canteenId: decodedCook.canteenId, displayName: decodedCook.displayName });

  // 4. Test Invalid PIN
  console.log('4. Testing Invalid Cook PIN (Should fail)...');
  const invalidCookToken = await authService.login({ 
    canteen_slug: 'mithibai-canteen-a', 
    pin: '9999' 
  });
  if (invalidCookToken !== null) throw new Error('Expected invalid PIN to fail but got token');
  console.log('✔ Invalid PIN correctly rejected with null.');

  // 5. Test Invalid Admin Password
  console.log('5. Testing Invalid Admin Password (Should fail)...');
  const invalidAdminToken = await authService.login({ 
    email: 'admin@campusbites.com', 
    password: 'wrongpassword' 
  });
  if (invalidAdminToken !== null) throw new Error('Expected invalid password to fail but got token');
  console.log('✔ Invalid password correctly rejected with null.');

  console.log('🎉 ALL AuthService tests passed with flying colors!');
  process.exit(0);
}

testAuth().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
