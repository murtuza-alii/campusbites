# Hybrid Order Verification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Part 1 of the specification — Hybrid Order Verification System with HMAC-signed QR code generation on student order cards, backend signature verification & status transition API, and staff scanner/manual verification modal.

**Architecture:** 
- Backend HMAC SHA-256 signing utility using `JWT_SECRET`.
- Backend API `POST /api/orders/verify-pickup` to validate payload, signature, and transition order to `COMPLETED`.
- Frontend student order view rendering QR code (`qrcode.react` or SVG generation) for orders in `READY` status.
- Frontend staff order dashboard verification modal with QR scanner integration / direct code input.

**Tech Stack:** Node.js, Express, TypeScript, HMAC-SHA256, React, Lucide Icons / Material Symbols.

## Global Constraints
- Target only Part 1 (Hybrid Order Verification System), excluding Easebuzz payment gateway.
- Require cryptographic HMAC signature verification to prevent QR forgery or screenshot reuse.
- Transition order from `READY` to `COMPLETED` upon valid verification.
- Return explicit failure if already completed (`"Order Already Picked Up"`) or if signature is invalid.

---

### Task 1: Backend HMAC QR Signer & Verification API Endpoint

**Files:**
- Create: `backend/src/utils/qrSigner.ts`
- Modify: `backend/src/controllers/OrderController.ts`
- Modify: `backend/src/routes/orderRoutes.ts`
- Modify: `backend/src/services/OrderService.ts`
- Modify: `backend/src/repositories/OrderRepository.ts`

**Interfaces:**
- Consumes: `JWT_SECRET` config, Order ID, Pickup Code
- Produces: 
  - `generateQRPayload(order: Order): { order_id, order_number, canteen_id, pickup_code, signature }`
  - `verifyQRPayload(payload: { order_id, pickup_code, signature }): boolean`
  - `POST /api/orders/verify-pickup` API endpoint

- [ ] **Step 1: Create HMAC Signer Utility `backend/src/utils/qrSigner.ts`**

```typescript
import crypto from 'crypto';
import { config } from '../config/unifiedConfig.js';

const SECRET = config.jwtSecret || 'campusbites_secret';

export interface QRPayload {
  order_id: string;
  order_number: string;
  canteen_id: string;
  pickup_code: string;
  signature: string;
}

export function generateQRSignature(orderId: string, pickupCode: string): string {
  const data = `${orderId}:${pickupCode}`;
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

export function buildQRPayload(order: { id: string; order_number: string; canteen_id: string; pickup_code: string }): QRPayload {
  const signature = generateQRSignature(order.id, order.pickup_code);
  return {
    order_id: order.id,
    order_number: order.order_number,
    canteen_id: order.canteen_id,
    pickup_code: order.pickup_code,
    signature
  };
}

export function verifyQRSignature(orderId: string, pickupCode: string, signature: string): boolean {
  const expected = generateQRSignature(orderId, pickupCode);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
```

- [ ] **Step 2: Add verify endpoint to `OrderController.ts` and `orderRoutes.ts`**

In `backend/src/routes/orderRoutes.ts`:
```typescript
router.post('/verify-pickup', asyncErrorWrapper(async (req, res) => {
  const { order_id, pickup_code, signature } = req.body;
  
  if (!order_id || !pickup_code || !signature) {
    return res.status(400).json({ error: 'Missing verification parameters' });
  }

  const isValid = verifyQRSignature(order_id, pickup_code, signature);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or forged QR verification signature' });
  }

  const db = await getDb();
  const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
  if (orderRes.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = orderRes.rows[0];
  if (order.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Order Already Picked Up' });
  }

  if (order.status !== 'READY') {
    return res.status(400).json({ error: `Order is in ${order.status} state, must be READY for pickup` });
  }

  await db.query("UPDATE orders SET status = 'COMPLETED' WHERE id = $1", [order_id]);
  broadcastOrderStatusUpdate(order_id, 'COMPLETED');

  res.status(200).json({ success: true, message: 'Pickup verified successfully', order_number: order.order_number });
}));
```

- [ ] **Step 3: Include QR signature payload in `GET /api/orders` responses**

In `OrderService.ts` / `OrderController.ts`, attach `qr_payload` to order objects so students receive the signed payload when order status is `READY`.

- [ ] **Step 4: Build backend and verify API syntax**

Run: `npm run build` in `backend`.

- [ ] **Step 5: Commit backend verification changes**

```bash
git add backend/src/utils/qrSigner.ts backend/src/routes/orderRoutes.ts backend/src/controllers/OrderController.ts
git commit -m "feat(api): add HMAC QR signature generator and /api/orders/verify-pickup endpoint"
```

---

### Task 2: Student QR Code Display (`StudentView.tsx`)

**Files:**
- Modify: `frontend/src/components/StudentView.tsx`

**Interfaces:**
- Consumes: Order with status `READY` and `qr_payload` / `pickup_code`
- Produces: Visual 3-digit token display (`#042`) and scannable QR code block on the active student order card.

- [ ] **Step 1: Render dynamic QR code and prominent token on READY orders**

In `StudentView.tsx`:
For any order where `order.status === 'READY'`:
- Render prominent Visual Queue Token badge (e.g. `Token #${order.order_number}`).
- Render a scannable QR Code containing the JSON string of `qr_payload` (or canvas/SVG QR generator).
- Display pickup instructions: "Show this QR code at the counter for pickup verification."

- [ ] **Step 2: Test student view rendering with mock READY order**

Verify that when order becomes `READY`, the QR card is rendered cleanly with clear token details.

- [ ] **Step 3: Commit student QR component changes**

```bash
git add frontend/src/components/StudentView.tsx
git commit -m "feat(student): render visual queue token and verification QR code for READY orders"
```

---

### Task 4: Staff Dashboard Verification Scanner & Modal (`StaffOrders.tsx`)

**Files:**
- Modify: `frontend/src/components/StaffOrders.tsx`

**Interfaces:**
- Consumes: `POST /api/orders/verify-pickup`
- Produces: QR Verification Modal with camera scanner / manual code entry trigger in `StaffOrders.tsx`.

- [ ] **Step 1: Add "Verify & Scan Pickup" modal in `StaffOrders.tsx`**

In `StaffOrders.tsx`:
- Add a **"Verify Pickup QR"** action button in the staff header/toolbar.
- Opens a modal where staff can paste/scan the QR code payload or enter pickup code.
- Calls `POST /api/orders/verify-pickup`.
- Shows instant visual feedback:
  - Green Success banner: `"Order #ORD-042 Verified! Hand over meal."`
  - Red Error banner: `"Order Already Picked Up"` or `"Invalid QR Signature"`.

- [ ] **Step 2: Test staff verification modal**

Verify that staff can verify an order by pasting/scanning the QR payload.

- [ ] **Step 3: Commit staff verification UI changes**

```bash
git add frontend/src/components/StaffOrders.tsx
git commit -m "feat(staff): add QR verification modal and pickup validation trigger"
```
