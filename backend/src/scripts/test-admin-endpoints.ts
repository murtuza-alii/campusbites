import { AdminService } from '../services/AdminService.js';
import { initDb } from '../db.js';

async function testAdmin() {
  console.log('Initializing DB for Admin service tests...');
  await initDb();
  const adminService = new AdminService();

  // 1. Test Overview Metrics
  console.log('1. Testing getOverview()...');
  const overview = await adminService.getOverview();
  console.log('Overview metrics retrieved:', {
    totalRevenue: overview.totalRevenue,
    totalOrders: overview.totalOrders,
    placed: overview.placedOrders,
    preparing: overview.preparingOrders,
    ready: overview.readyOrders,
    completed: overview.completedOrders,
    cancelled: overview.cancelledOrders,
    canteensCount: overview.canteenBreakdown.length
  });
  if (typeof overview.totalRevenue !== 'number') throw new Error('Invalid overview revenue');
  if (!Array.isArray(overview.canteenBreakdown)) throw new Error('Invalid canteen breakdown');
  console.log('✔ getOverview() passed.');

  // 2. Test Staff List
  console.log('2. Testing getStaffList()...');
  const staff = await adminService.getStaffList();
  console.log(`Retrieved ${staff.length} staff users.`);
  if (!Array.isArray(staff) || staff.length === 0) throw new Error('Invalid staff list');
  console.log('✔ getStaffList() passed.');

  // 3. Test Global Orders Stream
  console.log('3. Testing getAllOrdersGlobal()...');
  const globalOrders = await adminService.getAllOrdersGlobal({ limit: 10 });
  console.log(`Retrieved ${globalOrders.orders.length} orders (total count: ${globalOrders.totalCount}).`);
  if (!Array.isArray(globalOrders.orders)) throw new Error('Invalid global orders response');
  console.log('✔ getAllOrdersGlobal() passed.');

  // 4. Test Updating Cook PIN
  const sampleCook = staff.find(s => s.role === 'cook');
  if (sampleCook) {
    console.log(`4. Testing updateStaffCredentials() PIN update for cook ${sampleCook.displayName}...`);
    const updateRes = await adminService.updateStaffCredentials(sampleCook.id, { pin: '5678' });
    console.log('Update result:', updateRes);
    if (!updateRes.success) throw new Error('Failed to update cook PIN');
    console.log('✔ Cook PIN update passed.');

    // Revert back to 1234
    await adminService.updateStaffCredentials(sampleCook.id, { pin: '1234' });
    console.log('✔ Cook PIN safely restored to default test PIN.');
  }

  console.log('🎉 ALL AdminService tests passed successfully!');
  process.exit(0);
}

testAdmin().catch(err => {
  console.error('Admin test failed:', err);
  process.exit(1);
});
