import { initDb, getDb } from '../db.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from '../services/OrderService.js';
import { OrderController } from '../controllers/OrderController.js';
import { generatePickupCode, verifyQRSignature } from '../utils/qrSigner.js';

import { initOrderWorker } from '../queues/orderQueue.js';

async function testAlphanumericPickup() {
  console.log('Initializing DB for Alphanumeric Pickup Tests...');
  await initDb();
  initOrderWorker();

  const orderRepository = new OrderRepository();
  const orderService = new OrderService(orderRepository);
  const orderController = new OrderController(orderService);

  // 1. Test generatePickupCode helper
  console.log('1. Testing generatePickupCode()...');
  for (let i = 0; i < 5; i++) {
    const code = generatePickupCode(4);
    if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(code)) {
      throw new Error(`Generated invalid alphanumeric code: ${code}`);
    }
    console.log(`  Generated alphanumeric sample [${i + 1}]: ${code}`);
  }
  console.log('✔ generatePickupCode passed.');

  // 2. Place an order and check pickup_code format
  console.log('2. Placing order through OrderService...');
  const order = await orderService.placeOrder({
    name: 'Rohan Sharma',
    rollNumber: 'CS-2026-099',
    canteenId: 'c1',
    items: [{ id: 'm1', name: 'Veg Grilled Sandwich', price: 80, quantity: 2 }],
    totalPrice: 160
  });

  console.log(`✔ Order placed: ${order.order_number}, ID: ${order.id}, Pickup Code: ${order.pickup_code}`);
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(order.pickup_code)) {
    throw new Error(`Expected 4-character alphanumeric pickup code, got: ${order.pickup_code}`);
  }

  // Wait for worker to write to DB if queue is active
  let dbOrder = null;
  for (let i = 0; i < 10; i++) {
    dbOrder = await orderRepository.findById(order.id);
    if (dbOrder) break;
    await new Promise(r => setTimeout(r, 200));
  }

  // 3. Mark Order as READY
  await orderService.updateOrderStatus(order.id, 'READY');
  console.log('✔ Order marked READY in kitchen display.');

  // 4. Test verifyPickup with alphanumeric pickup code (case-insensitive)
  console.log('3. Testing pickup verification with lowercase alphanumeric input...');
  const reqLower: any = {
    body: {
      order_id: order.id,
      pickup_code: order.pickup_code.toLowerCase(),
      canteen_id: 'c1'
    }
  };
  let resStatus: number = 200;
  let resData: any = null;
  const res: any = {
    status(code: number) {
      resStatus = code;
      return this;
    },
    json(data: any) {
      resData = data;
      return this;
    }
  };

  await orderController.verifyPickup(reqLower, res);
  if (!resData || !resData.success) {
    throw new Error(`verifyPickup failed: ${JSON.stringify(resData)}`);
  }
  console.log('✔ verifyPickup succeeded with response:', resData);

  // 5. Verify database state
  const db = await getDb();
  const checkRes = await db.query('SELECT status, pickup_code FROM orders WHERE id = $1', [order.id]);
  if (checkRes.rows[0].status !== 'COMPLETED') {
    throw new Error(`Expected status COMPLETED, got: ${checkRes.rows[0].status}`);
  }
  console.log(`✔ Database verified: Order is COMPLETED with immutable pickup_code ${checkRes.rows[0].pickup_code}`);

  console.log('🎉 ALL Alphanumeric Pickup Code tests passed with 100% success!');
  process.exit(0);
}

testAlphanumericPickup().catch(err => {
  console.error('Alphanumeric pickup test failed:', err);
  process.exit(1);
});
