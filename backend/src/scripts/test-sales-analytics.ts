import { AdminService } from '../services/AdminService.js';
import { initDb } from '../db.js';

async function testSalesAnalytics() {
  console.log('Testing Sales Analytics Service...');
  await initDb();
  const adminService = new AdminService();

  // 1. Test Anand Stall (c6) specific sales
  console.log('\n--- 1. Testing Anand Stall (c6) Monthly Sales ---');
  const anandSales = await adminService.getMonthlySalesAnalytics({ canteenId: 'c6' });
  console.log('Anand Stall Info:', anandSales.canteen);
  console.log('All-time Summary:', anandSales.allTimeSummary);
  console.log(`Found ${anandSales.months.length} monthly bucket(s).`);
  
  if (anandSales.months.length > 0) {
    const latestMonth = anandSales.months[0];
    console.log(`Latest Month (${latestMonth.monthLabel}):`, {
      revenue: latestMonth.totalRevenue,
      orders: latestMonth.totalOrders,
      completed: latestMonth.completedOrders,
      cancelled: latestMonth.cancelledOrders,
      avgTicket: latestMonth.avgOrderValue,
      itemsSold: latestMonth.totalItemsSold,
      topItemsCount: latestMonth.topItems.length,
      dailyStatsCount: latestMonth.dailyStats.length
    });
    if (latestMonth.topItems.length > 0) {
      console.log('Sample Top Item:', latestMonth.topItems[0]);
    }
  }
  console.log(`Itemized orders returned for current month: ${anandSales.orders.length} (Total count: ${anandSales.totalOrdersCount})`);

  // 2. Test Global / All-Canteens sales (Admin view)
  console.log('\n--- 2. Testing Global All-Canteens Sales ---');
  const globalSales = await adminService.getMonthlySalesAnalytics();
  console.log('Global All-time Summary:', globalSales.allTimeSummary);
  console.log(`Global monthly buckets: ${globalSales.months.length}`);
  console.log(`Global total orders: ${globalSales.totalOrdersCount}`);

  console.log('\n✔ All Sales Analytics tests passed successfully!');
  process.exit(0);
}

testSalesAnalytics().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
