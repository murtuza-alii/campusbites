/**
 * Generates an alphanumeric order ID prefixed with its 25-order batch Slot Number.
 * 
 * Logic:
 * - Every 25 orders form 1 Slot:
 *   - Orders 1 – 25   -> Slot 1
 *   - Orders 26 – 50  -> Slot 2
 *   - Orders 51 – 75  -> Slot 3
 *   - ...
 * - Alphanumeric code: 4 uppercase characters starting with a letter (e.g. C458, A102, K382)
 *   from clean, unambiguous charset (no confusing 0/O or 1/I).
 * - Full Order Number: "${slotNumber}-${orderCode}" (e.g. "1-C458", "2-A892")
 */

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSlotOrderNumber(totalOrdersCount: number): {
  orderNumber: string;
  slotNumber: number;
  orderCode: string;
} {
  // 1. Calculate 1-indexed slot number (each slot contains 25 orders)
  const slotNumber = Math.floor(Math.max(0, totalOrdersCount) / 25) + 1;

  // 2. Generate 4-character uppercase alphanumeric code (e.g. C458)
  const firstLetter = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length));
  }
  const orderCode = `${firstLetter}${suffix}`;

  // 3. Format into "${slotNumber}-${orderCode}" (e.g. "1-C458")
  const orderNumber = `${slotNumber}-${orderCode}`;

  return {
    orderNumber,
    slotNumber,
    orderCode,
  };
}
