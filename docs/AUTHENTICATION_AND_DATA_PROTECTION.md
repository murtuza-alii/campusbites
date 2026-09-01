# CampusBites — Data Protection & Authentication Architecture Specification

This document details the Supabase database architecture for order history persistence, data security standards, and the roadmap for implementing a robust, production-grade student and staff authentication system.

---

## 1. Supabase Database & Order History Architecture

### 1.1 Live Supabase PostgreSQL Connection
- **Region**: `ap-south-1` (Mumbai, India)
- **Database Engine**: PostgreSQL 17 (Supabase Managed Cloud)
- **Tables Synchronized**:
  - `orders`: Stores all live and historical orders, items JSON, total amounts, pickup codes, Cashfree payment transaction IDs (`cf_order_id`, `payment_session_id`), timestamps, and order statuses (`PENDING`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`).
  - `canteen`: Campus outlets with group names, slugs, and operating configurations.
  - `users`: Staff and administrator credentials with bcrypt password/PIN hashes.
  - `menu`: Menu catalog with pricing, categories, and item availability flags.
  - `restaurant_registrations`: Onboarding partner inquiries.

### 1.2 Data Security & Performance Indexes
To ensure sub-millisecond retrieval of historical orders and secure partitioning per canteen, the following indexes are enabled in Supabase:
- `idx_orders_canteen_status` on `orders (canteen_id, status)` — Optimizes kitchen queue and counter pickup queries.
- `idx_orders_created_at` on `orders (created_at DESC)` — Optimizes historical analytics and pagination.
- `idx_orders_student_roll` on `orders (student_roll)` — Secures and speeds up customer phone-based order lookups.
- `idx_orders_pickup_code` on `orders (pickup_code)` — Ensures instant 4-digit PIN verification at counter handover.

---

## 2. Roadmap: Robust Authentication & Data Protection System

Currently, staff authenticate via canteen-scoped hashed PINs/passwords issuing JWTs, while students place orders using validated phone numbers stored in browser state and synced to Supabase. To scale securely across thousands of daily university diners, the following robust login and protection system is specified:

### 2.1 Student / Customer Authentication (Supabase Auth)
1. **Phone OTP / Passwordless Login**:
   - Integrates Supabase Auth with SMS OTP (e.g. Twilio / Msg91) or Email Magic Links.
   - Students log in with their mobile number once; a secure session token is persisted in HTTP-only secure cookies.
2. **Persistent Student Order History**:
   - Orders are permanently linked to the student's `auth.uid()`.
   - Students can access their order history across multiple devices (mobile browser, laptop, campus kiosks) without losing historical records when clearing browser cache.
3. **Student Profile & Preferences**:
   - Dietary preferences (Veg/Non-Veg, Jain), favorite items, and 1-tap re-ordering.

### 2.2 Staff & Cook Terminal Access Control (RBAC)
1. **Granular Role-Based Access Control**:
   - `cook`: Restricted to Kitchen Queue (`PENDING` ➔ `PREPARING` ➔ `READY`), batch prep ribbons, and order cancellation.
   - `counter_staff`: Restricted to Counter Pickup, 4-digit PIN verification, and meal handover.
   - `manager`: Full outlet control (menu editing, pricing, availability toggles, daily settlement reports).
   - `campus_admin`: Master multi-canteen overview across all dining halls.
2. **Unique Per-Canteen Staff PINs**:
   - Each outlet manager and cook receives a unique 4–6 digit station PIN.
   - Stored with individual salt rounds via `bcrypt`.
   - Brute-force rate limiting: 5 failed PIN attempts locks the terminal for 2 minutes.

### 2.3 Row Level Security (RLS) Policies in Supabase
Enable strict Row-Level Security on PostgreSQL:
```sql
-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Students can only view their own orders
CREATE POLICY "Students can only read own orders"
ON orders FOR SELECT
USING (auth.uid()::text = student_id OR student_roll = current_setting('request.jwt.claims', true)::json->>'phone');

-- Policy 2: Canteen staff can only view/update orders for their assigned canteen
CREATE POLICY "Staff can access assigned canteen orders"
ON orders FOR ALL
USING (canteen_id = current_setting('request.jwt.claims', true)::json->>'canteenId');

-- Policy 3: Master Admin has full global visibility
CREATE POLICY "Master Admin full access"
ON orders FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
```

### 2.4 Data Encryption & PII Protection
- **SSL/TLS in Transit**: All database connections require `sslmode=require` with TLS 1.3.
- **PII Redaction in Telemetry**: Customer phone numbers and payment tokens are masked in server access logs.
- **Webhook Signature Verification**: All Cashfree PG payment callbacks are verified using HMAC-SHA256 signatures before modifying database records.
