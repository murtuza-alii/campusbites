# Supabase Auth, Multi-Tier Role Portals, and Immutable Order System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a robust Supabase/PostgreSQL authentication system supporting PIN-based cook login, email/password manager & admin logins, dedicated mobile-optimized portals (Kitchen Display, Store Manager, Super Admin), and guaranteed order immutability.

**Architecture:** 
- PostgreSQL/Supabase database schema with user roles (`admin`, `manager`, `cook`) and separate password & PIN hashes.
- Express auth service issuing 12-hour role-scoped JWTs with strict RBAC middleware and 0 DELETE order endpoints.
- React/Tailwind mobile-first frontend featuring Double-Bezel tactile design, Cook KDS, Store Manager operations terminal, and Super Admin command center (`/admin`).

**Tech Stack:** TypeScript, React, Vite, Tailwind CSS, Express, PostgreSQL / Supabase, JWT, bcryptjs, Lucide Icons.

## Global Constraints

- Never expose or write any `DELETE /api/orders` endpoints.
- Orders in Supabase/PostgreSQL are 100% immutable and permanent.
- Cooks authenticate via Outlet + 4-digit PIN/code.
- Store Managers and Super Admin authenticate via Email + Password.
- Follow `high-end-visual-design` principles: Double-Bezel nested containers, 48px+ touch targets on mobile, smooth haptic physics.

---

### Task 1: Supabase / PostgreSQL Schema Migration & Seeding

**Files:**
- Modify: `backend/src/db.ts`
- Create: `backend/src/scripts/test-db-auth.ts`

**Interfaces:**
- Consumes: PostgreSQL connection pool from `getDb()`.
- Produces: Updated `users` table schema with `email`, `password_hash`, `pin_hash`, `role`, `canteen_id`, and `display_name`; seeded initial users for 50-year heritage shop and super admin.

- [ ] **Step 1: Write database test script to verify user columns and roles**

```typescript
// backend/src/scripts/test-db-auth.ts
import { getDb, initDb } from '../db.js';

async function verifyAuthSchema() {
  await initDb();
  const db = await getDb();
  
  // Verify columns in users table
  const colRes = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  const columns = colRes.rows.map(r => r.column_name);
  const required = ['id', 'email', 'username', 'password_hash', 'pin_hash', 'role', 'canteen_id', 'display_name'];
  
  for (const col of required) {
    if (!columns.includes(col)) {
      throw new Error(`Missing required column: ${col} in users table`);
    }
  }

  // Verify seed users
  const adminRes = await db.query(`SELECT * FROM users WHERE role = 'admin'`);
  if (adminRes.rows.length === 0) throw new Error('No admin user found in database');

  const cookRes = await db.query(`SELECT * FROM users WHERE role = 'cook'`);
  if (cookRes.rows.length === 0) throw new Error('No cook user found in database');

  console.log('Database auth schema & seed verification passed successfully!');
  process.exit(0);
}

verifyAuthSchema().catch(err => {
  console.error('Schema verification failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Update `backend/src/db.ts` schema and seed data**

```typescript
// Add columns to users table and update seed records:
// 1. ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
// 2. ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
// 3. ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
// 4. Seed Super Admin (admin@campusbites.com), 50-Year Heritage Diner Cook (PIN: 1234), and Store Manager (manager@heritage50.com)
```

- [ ] **Step 3: Run the test script to verify schema initialization**

Run: `npx tsx src/scripts/test-db-auth.ts` (in `backend`)  
Expected: "Database auth schema & seed verification passed successfully!"

- [ ] **Step 4: Commit**

```bash
git add backend/src/db.ts backend/src/scripts/test-db-auth.ts
git commit -m "feat(db): update users schema with pin_hash, display_name, email and seed role accounts"
```

---

### Task 2: Backend Authentication Service & Role RBAC Middleware

**Files:**
- Modify: `backend/src/services/AuthService.ts`
- Modify: `backend/src/controllers/AuthController.ts`
- Modify: `backend/src/middleware/authMiddleware.ts`
- Create: `backend/src/scripts/test-auth-endpoints.ts`

**Interfaces:**
- Consumes: `users` and `canteen` tables via `getDb()`.
- Produces: `AuthService.login({ email, password, pin, canteen_id, canteen_slug, role })`, `requireAuth`, `requireRole(roles[])`.

- [ ] **Step 1: Write integration test for Auth Service**

```typescript
// backend/src/scripts/test-auth-endpoints.ts
import { AuthService } from '../services/AuthService.js';
import { initDb } from '../db.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/unifiedConfig.js';

async function testAuth() {
  await initDb();
  const authService = new AuthService();

  // 1. Test Admin Login (Email + Password)
  const adminToken = await authService.login({ email: 'admin@campusbites.com', password: 'adminpassword' });
  if (!adminToken) throw new Error('Admin login failed');
  const decodedAdmin: any = jwt.verify(adminToken, config.auth.jwtSecret);
  if (decodedAdmin.role !== 'admin') throw new Error(`Expected admin role, got ${decodedAdmin.role}`);

  // 2. Test Cook Login (Canteen + PIN)
  const cookToken = await authService.login({ canteen_slug: 'mithibai-canteen-a', pin: '1234' });
  if (!cookToken) throw new Error('Cook PIN login failed');
  const decodedCook: any = jwt.verify(cookToken, config.auth.jwtSecret);
  if (decodedCook.role !== 'cook') throw new Error(`Expected cook role, got ${decodedCook.role}`);

  // 3. Test Invalid PIN
  const invalidToken = await authService.login({ canteen_slug: 'mithibai-canteen-a', pin: '9999' });
  if (invalidToken !== null) throw new Error('Expected invalid PIN to fail');

  console.log('All AuthService tests passed!');
  process.exit(0);
}

testAuth().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Update `backend/src/services/AuthService.ts` to support Cook PIN and Manager/Admin Email login**

Implement full payload handling for `{ email, password }`, `{ username, password }`, and `{ canteen_id / canteen_slug, pin }`. Sign JWT containing `id`, `role`, `displayName`, `canteenId`, `canteenName`, `canteenSlug`.

- [ ] **Step 3: Update `backend/src/middleware/authMiddleware.ts` to support multi-role guards (`requireRole`)**

Ensure `requireRole(['admin'])`, `requireRole(['admin', 'manager'])`, and `requireRole(['admin', 'manager', 'cook'])` properly validate token claims.

- [ ] **Step 4: Run the test script to verify auth logic**

Run: `npx tsx src/scripts/test-auth-endpoints.ts` (in `backend`)  
Expected: "All AuthService tests passed!"

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/AuthService.ts backend/src/controllers/AuthController.ts backend/src/middleware/authMiddleware.ts backend/src/scripts/test-auth-endpoints.ts
git commit -m "feat(auth): implement hybrid cook PIN and admin/manager email authentication"
```

---

### Task 3: Backend Super Admin Endpoints & Permanent Immutability Enforcement

**Files:**
- Modify: `backend/src/routes/adminRoutes.ts`
- Create: `backend/src/controllers/AdminController.ts`
- Create: `backend/src/services/AdminService.ts`
- Modify: `backend/src/routes/orderRoutes.ts`
- Create: `backend/src/scripts/test-admin-endpoints.ts`

**Interfaces:**
- Consumes: `requireAuth`, `requireRole(['admin'])`.
- Produces: 
  - `GET /api/admin/overview`: Summary stats (Total revenue, active/completed/cancelled counts, per-canteen stats).
  - `GET /api/admin/orders`: Global order feed with search and status filtering.
  - `GET /api/admin/staff`: Staff list.
  - `POST /api/admin/staff`: Create new staff member (Cook PIN or Manager credentials).
  - `PATCH /api/admin/staff/:id/pin`: Update/reset Cook PIN or Manager password.

- [ ] **Step 1: Write integration test for Admin endpoints**

```typescript
// backend/src/scripts/test-admin-endpoints.ts
import { AdminService } from '../services/AdminService.js';
import { initDb } from '../db.js';

async function testAdmin() {
  await initDb();
  const adminService = new AdminService();

  const overview = await adminService.getOverview();
  if (typeof overview.totalRevenue !== 'number') throw new Error('Invalid overview revenue');
  if (!Array.isArray(overview.canteenBreakdown)) throw new Error('Invalid canteen breakdown');

  const staff = await adminService.getStaffList();
  if (!Array.isArray(staff)) throw new Error('Invalid staff list');

  console.log('Admin service tests passed!');
  process.exit(0);
}

testAdmin().catch(err => {
  console.error('Admin test failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Implement `AdminService.ts`, `AdminController.ts`, and `adminRoutes.ts`**

Write methods for `getOverview()`, `getAllOrdersGlobal()`, `getStaffList()`, `createStaffUser()`, and `updateStaffCredentials()`.

- [ ] **Step 3: Run the test script to verify admin operations**

Run: `npx tsx src/scripts/test-admin-endpoints.ts` (in `backend`)  
Expected: "Admin service tests passed!"

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/AdminService.ts backend/src/controllers/AdminController.ts backend/src/routes/adminRoutes.ts backend/src/scripts/test-admin-endpoints.ts
git commit -m "feat(admin): implement super admin overview, global order stream, and staff PIN management"
```

---

### Task 4: Frontend Staff & Kitchen Display System (KDS)

**Files:**
- Modify: `frontend/src/components/StaffLogin.tsx`
- Modify: `frontend/src/components/StaffOrders.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/login`, `GET /api/orders`, `PATCH /api/orders/:id/status`.
- Produces: Mobile-optimized Cook KDS with large touch buttons, incoming order audio chime, tactile numeric PIN pad, and Store Manager terminal with pickup code verification and 0 delete buttons.

- [ ] **Step 1: Upgrade `StaffLogin.tsx` with Dual Tab (Cook PIN vs Manager Email)**

Implement segmented control between **"🍳 Kitchen Cook"** (Outlet picker + large numeric keypad `0-9`, backspace, submit) and **"📋 Store Manager"** (Email + Password). Add Double-Bezel styling with haptic spring physics.

- [ ] **Step 2: Upgrade `StaffOrders.tsx` with Cook KDS & Manager Modes**

- For `cook` role:
  - Big ticket cards with large text and item modification notes.
  - Sound alert on new incoming order via Web Audio API.
  - Giant one-tap buttons: "Start Preparing" and "Mark Ready" (displays large 4-digit pickup code).
  - Quick-switch cook PIN button.
  - No delete/cancel controls.
- For `manager` role:
  - Full active queue + pickup PIN/QR scanner modal.
  - Quick 1-tap item stock availability switch.
  - Filterable read-only order history ledger.

- [ ] **Step 3: Test frontend build with `npm run build` in `frontend`**

Run: `npm run build` (in `frontend`)  
Expected: Clean build with 0 TypeScript/lint errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/StaffLogin.tsx frontend/src/components/StaffOrders.tsx
git commit -m "feat(ui): implement mobile-first Cook KDS with PIN keypad and Manager operations terminal"
```

---

### Task 5: Frontend Super Admin Executive Portal (`/admin/login` & `/admin`)

**Files:**
- Create: `frontend/src/components/AdminLogin.tsx`
- Create: `frontend/src/components/AdminDashboard.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/admin/*`.
- Produces: Protected Super Admin control center showing global live stream, sales revenue bento, and staff PIN manager modal.

- [ ] **Step 1: Create `AdminLogin.tsx`**

High-security executive login with clean modern aesthetics, email & password validation, and direct redirection to `/admin`.

- [ ] **Step 2: Create `AdminDashboard.tsx`**

- Bento overview cards: Today's Revenue, Total Orders Placed, Completed, and Cancelled.
- Live multi-canteen order stream with status filters, date selector, and search by order number / customer.
- Staff & Cook PIN Management tab: List all cooks & managers, 1-click reset PIN modal, create new staff account with assigned canteen.
- Responsive mobile drawer and tab switcher.

- [ ] **Step 3: Wire routes in `frontend/src/App.tsx`**

Add `/admin/login` and `/admin` routes with token and role check (`userRole === 'admin'`).

- [ ] **Step 4: Verify frontend build with `npm run build` in `frontend`**

Run: `npm run build` (in `frontend`)  
Expected: Clean build with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AdminLogin.tsx frontend/src/components/AdminDashboard.tsx frontend/src/App.tsx
git commit -m "feat(ui): implement super admin executive dashboard and staff PIN management portal"
```

---

### Task 6: Customer View Device-Level Privacy Clear & End-to-End Verification

**Files:**
- Modify: `frontend/src/components/StudentView.tsx`

**Interfaces:**
- Consumes: Local storage order tracking.
- Produces: "Clear My Order View" / "Hide from this device" action that resets `localStorage` without deleting any records in Supabase.

- [ ] **Step 1: Add "Clear My Recent Orders" in `StudentView.tsx`**

Provide a clean, user-friendly button in the order tracking modal/drawer with explicit helper text: "Clears order view from your phone. Your receipt & pickup code remain permanently stored in the shop's database."

- [ ] **Step 2: Run End-to-End verification across all roles**

1. Verify Cook login with 4-digit PIN → Access Cook KDS → Update order status.
2. Verify Store Manager login with Email/Password → Access Manager Terminal → Verify pickup code.
3. Verify Super Admin login with Email/Password → Access `/admin` → View revenue & update Cook PIN.
4. Verify Student places order → Sees order → Clears local view → Order remains 100% visible in Supabase, Cook KDS, Manager terminal, and Admin dashboard.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StudentView.tsx
git commit -m "feat(customer): add device-level local privacy clear and finalize role-based workflow"
```
