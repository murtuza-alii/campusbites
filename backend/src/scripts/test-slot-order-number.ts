import { generateSlotOrderNumber } from '../utils/orderNumber.js';

console.log('🧪 Testing generateSlotOrderNumber() for 25-order slot partitioning:\n');

const testCases = [
  { count: 0, expectedSlot: 1, label: 'First order (0 previous orders)' },
  { count: 12, expectedSlot: 1, label: 'Mid-slot order (12 previous orders)' },
  { count: 24, expectedSlot: 1, label: 'Last order of Slot 1 (24 previous orders)' },
  { count: 25, expectedSlot: 2, label: 'First order of Slot 2 (25 previous orders)' },
  { count: 49, expectedSlot: 2, label: 'Last order of Slot 2 (49 previous orders)' },
  { count: 50, expectedSlot: 3, label: 'First order of Slot 3 (50 previous orders)' },
  { count: 99, expectedSlot: 4, label: 'Last order of Slot 4 (99 previous orders)' },
  { count: 100, expectedSlot: 5, label: 'First order of Slot 5 (100 previous orders)' },
  { count: 249, expectedSlot: 10, label: 'Slot 10 boundary (249 previous orders)' },
  { count: 250, expectedSlot: 11, label: 'Slot 11 start (250 previous orders)' },
  { count: 999, expectedSlot: 40, label: 'Order #1000 (999 previous orders)' },
];

for (const tc of testCases) {
  const result = generateSlotOrderNumber(tc.count);
  console.log(`[Test] ${tc.label}: Count = ${tc.count} -> Output = "${result.orderNumber}" (Slot ${result.slotNumber}, Code: ${result.orderCode})`);
  
  if (result.slotNumber !== tc.expectedSlot) {
    throw new Error(`Expected slot ${tc.expectedSlot} for count ${tc.count}, got ${result.slotNumber}`);
  }

  // Check pattern: matches /^\d+-[A-Z][A-Z0-9]{3}$/
  const regex = /^\d+-[A-Z][A-Z0-9]{3}$/;
  if (!regex.test(result.orderNumber)) {
    throw new Error(`Order number "${result.orderNumber}" does not match expected alphanumeric pattern (e.g. "1-C458")`);
  }
}

console.log('\n🎉 ALL slot calculation and alphanumeric order number unit tests PASSED!');
process.exit(0);
