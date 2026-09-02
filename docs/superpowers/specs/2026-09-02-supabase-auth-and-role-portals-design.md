# Supabase Auth, Multi-Tier Role Access Control, and Immutable Order System

**Date:** 2026-09-02  
**Status:** Approved by User  
**Target:** CampusBites Canteen & Food Shop Ordering Platform  

---

## 1. Executive Summary

This specification defines the architecture for a robust, mobile-optimized authentication and role-based access control (RBAC) system backed by Supabase / PostgreSQL. The platform serves:
1. **The First Client**: A heritage 50-year-old shop featuring kitchen cooks and 2–3 store managers.
2. **Super Admin (Platform Owner)**: Full-visibility executive portal to monitor all orders (placed, preparing, completed, cancelled), view real-time revenues, and manage staff credentials/PINs.
3. **Store Managers**: Outlet-specific operations terminal for order pickup verification, menu availability management, and read-only order history.
4. **Kitchen Cooks**: Ultra-streamlined mobile Kitchen Display System (KDS) with fast PIN/code login and 1-tap order status progression.
5. **Students / Customers**: Mobile ordering with device-level history clearing that never alters or deletes records from the database.

---

## 2. Immutability & Deletion Policy

### Strict Rules:
- **No Database Deletion**: Hard deletion (`DELETE FROM orders`) is completely prohibited across the API and database layers.
- **Store Managers & Cooks**: Order records are strictly read-only audit streams. Staff can only update order statuses (`PLACED` → `PREPARING` → `READY` → `COMPLETED` / `CANCELLED`).
- **Customer Privacy**: When a customer clicks "Clear My Order History" in their mobile view, it purges only the local device cache (`localStorage`). Supabase maintains 100% of all transaction records permanently for audit and analytics.

---

## 3. Database Schema (Supabase / PostgreSQL)

### 3.1 `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,                        -- Required for admin and managers
  username TEXT UNIQUE,                     -- Quick handle / identifier
  password_hash TEXT,                       -- Bcrypt hash for admin and managers
  pin_hash TEXT,                            -- Bcrypt hash of 4-6 digit code for cooks
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cook')),
  canteen_id TEXT REFERENCES canteen(id),   -- NULL for Super Admin (global scope)
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_canteen_role ON users(canteen_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 3.2 `orders` Table (Immutable Ledger)
```sql
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_roll TEXT,
  student_phone TEXT,
  items JSONB NOT NULL,
  total_price DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PLACED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
  payment_status TEXT DEFAULT 'PAID',
  payment_session_id TEXT,
  cf_order_id TEXT,
  pickup_code TEXT NOT NULL,
  canteen_id TEXT REFERENCES canteen(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_canteen_status ON orders(canteen_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code);
```

---

## 4. Authentication & Authorization Architecture

### 4.1 Login Endpoints & Credentials
- **`POST /api/auth/login`**:
  - **Cook Mode**: `{ canteen_id, pin }` → Validates against `pin_hash` for the cook account belonging to that canteen.
  - **Manager Mode**: `{ email, password }` → Validates against `password_hash` and confirms `role = 'manager'`.
  - **Admin Mode**: `{ email, password }` → Validates against `password_hash` and confirms `role = 'admin'`.
- **JWT Session**: Signed with server `JWT_SECRET`, valid for 12 hours. Contains:
  ```json
  {
    "id": "usr_...",
    "role": "admin" | "manager" | "cook",
    "displayName": "Chef Ramesh",
    "canteenId": "c1",
    "canteenName": "50-Year Heritage Diner",
    "exp": 1741234567
  }
  ```

### 4.2 Role Middleware Matrix

| Endpoint Route | Allowed Roles | Description |
|---|---|---|
| `GET /api/admin/*` | `admin` | Global revenue, all canteens, staff PIN management |
| `POST /api/admin/staff` | `admin` | Create/update staff users, reset PINs |
| `GET /api/orders` | `admin` (all), `manager`/`cook` (scoped to `canteenId`) | Order feed query |
| `PATCH /api/orders/:id/status` | `admin`, `manager`, `cook` | Advance order state |
| `POST /api/orders/verify-pickup` | `admin`, `manager`, `cook` | Verify 4-digit PIN / QR signature |
| `POST /api/menu`, `PUT /api/menu/:id` | `admin`, `manager` | Update prices / items |
| `PATCH /api/menu/:id/toggle` | `admin`, `manager` | Fast stock availability toggle |

---

## 5. Frontend UI & Mobile Optimization

### 5.1 Design Language (`high-end-visual-design`)
- **Theme**: Double-Bezel nested containers (`rounded-[2rem]` outer ring, concentric inner core), smooth haptic spring physics on click/tap (`active:scale-[0.98]`).
- **Touch-First Ergonomics**: All key actions have minimum 48px touch targets, high-contrast badges, and fluid mobile drawer navigation.

### 5.2 Application Routing & Views
1. **`/admin/login` & `/admin` (Super Admin Executive Portal)**:
   - Live multi-outlet real-time order stream.
   - Financial overview (Today's revenue, order count, breakdown per outlet).
   - Staff PIN Management Panel (create cooks, assign/update PIN codes, manage manager accounts).
   - Global search & audit filter.
2. **`/staff/login` (Staff Gateway)**:
   - Tab 1: **Kitchen Cook PIN Pad** (Select Outlet → Tap 4-Digit Code → Enter).
   - Tab 2: **Store Manager Login** (Email + Password input).
3. **`/staff` (Role-Aware Dashboard)**:
   - **For Cooks**: Kitchen Display System (KDS) showing active queue cards, audio chime on incoming orders, giant "Start Cooking" and "Mark Ready" buttons.
   - **For Managers**: Live queue, Pickup PIN verification modal, 1-tap out-of-stock toggles, and read-only order history ledger.
4. **`/menu` & `/c/:slug` (Customer Ordering)**:
   - Clean mobile ordering with live order tracking.
   - "Clear History" button on device resets `localStorage` view without contacting the server to delete records.

---

## 6. Verification Plan

1. **Security & Auth Tests**:
   - Verify Cook PIN login generates a token with `role: 'cook'` and proper `canteenId`.
   - Verify Manager login generates a token with `role: 'manager'`.
   - Verify Super Admin login generates a token with `role: 'admin'`.
   - Verify invalid credentials return 401 with clean error messages.
2. **Immutability Verification**:
   - Verify no DELETE endpoint exists.
   - Verify manager and cook endpoints only return scoped orders.
   - Verify customer local clear wipes phone storage while database retains full order details.
3. **Admin Controls Verification**:
   - Verify Super Admin can view orders across all canteens simultaneously.
   - Verify Super Admin can create new cook PINs and update passwords.
4. **Mobile Responsiveness Verification**:
   - Verify full layout responsiveness, numeric PIN pad, and touch controls on mobile viewports (<768px).
