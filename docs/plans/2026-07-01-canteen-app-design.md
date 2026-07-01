# College Canteen App Design Document
**Date:** 2026-07-01  
**Status:** Approved  

---

## 1. Project Overview
This application aims to solve the problem of rush and confusion at the college canteen during peak hours. By allowing students to order from their phones, receive a secure pickup code, and pay offline at the counter upon picking up their food, the app streamlines canteen operations and improves the overall dining experience for students.

---

## 2. Technical Stack & Architecture

- **Frontend:** React with Vite, styled using modern Vanilla CSS with glassmorphic elements and CSS variables.
- **Backend:** Node.js with Express.
- **Database:** SQLite (single-file database, providing concurrency safety for heavy student traffic).
- **Communication:** REST APIs with auto-polling (every 5-10 seconds) on the student/staff clients to sync orders and menu availability.
- **Security:** Token-based authentication (JWT) for staff access control, locking down menu management and dashboard APIs.

---

## 3. Design System & Aesthetics

- **Primary Colors:** 
  - Dark Mode background: Rich Obsidian/Charcoal (`#0F172A` / `#1E293B`).
  - Brand Accent: Premium Indigo (`#6366F1` / `#4F46E5`).
  - Success/Status Accent: Vibrant Emerald Green (`#10B981` / `#059669`).
  - Text: Clean White (`#F8FAFC`) and Muted Grey (`#94A3B8`).
- **Typography:** Modern geometric sans-serif (Inter or Outfit) imported from Google Fonts.
- **Visual Feel:** Semi-transparent glassmorphic overlays (`backdrop-filter: blur()`), smooth transitions (300ms ease), and custom shadows.

---

## 4. User Journeys & Pages

### 4.1. Student Flow
1. **Menu View:** Categorized listing of food items. Students search and add items to a floating cart drawer.
2. **Checkout:** Student reviews the cart and inputs their **Name** and **Roll Number/Phone**. Placing the order sends it to the server.
3. **Status Tracker:** A dedicated screen displaying order details, a **4-digit pickup code**, a **QR code**, and the order's current status (`Placed`, `Preparing`, or `Ready for Pickup`).

### 4.2. Staff Flow
1. **Secure Login:** Staff authenticate via password (configured on the server via `STAFF_PASSWORD` in `.env`). Upon success, a JWT is stored.
2. **Orders Dashboard:** A column/tabbed view split by order states (Pending, Active, Ready). Staff can click buttons to update states (e.g., "Mark Ready", "Complete & Pay"). It features a sound alert on new incoming orders.
3. **Menu Editor:** Staff can instantly edit items, change prices, add new items, and toggle a dynamic "In Stock" switch that immediately disables/greys out items for students.

---

## 5. Security & Authentication Logic

- The backend serves protected routes under `/api/admin/*`.
- Requests to these routes must contain a `Bearer <token>` in the `Authorization` header.
- The server validates the token using the secret key. If missing or invalid, a `403 Forbidden` status is returned.
- Students have no credentials and cannot access staff endpoints. Their identity is verified by counter staff using the 4-digit code matching the server's record.
