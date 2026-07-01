# CampusBites Canteen Selector - Full Technical & UI/UX Specification

This document details the functional behavior, database schemas, API specifications, and comprehensive UI/UX design specifications of the CampusBites web application. It acts as the definitive design blueprint ("Design DNA") for generating high-fidelity modern UI interfaces using Google Stitch.

---

## 1. Architectural Overview

```mermaid
graph TD
    subgraph Frontend [React Client (Vite)]
        App[App.tsx - Routing & Header]
        StudentView[StudentView.tsx - Ordering & Tracker]
        StaffLogin[StaffLogin.tsx - Admin Auth]
        StaffView[StaffView.tsx - Route Guard]
        StaffOrders[StaffOrders.tsx - Kanban Dashboard]
        StaffMenu[StaffMenu.tsx - Menu CRUD Editor]
        LocalStorage[(LocalStorage - staffToken & myOrdersList)]
    end

    subgraph Backend [Express Node.js Server]
        API[Express App.ts / CORS / Helmet / RateLimiter]
        AuthRoute[authRoutes - Login handler]
        MenuRoute[menuRoutes - Public menu fetch]
        OrderRoute[orderRoutes - Order creation & polling]
        AdminRoute[adminRoutes - Orders status & Menu CRUD]
    end

    subgraph Database [SQLite]
        SQLiteDB[(sqlite.db - SQLite3)]
    end

    StudentView -->|GET /api/menu| API
    StudentView -->|POST /api/orders| API
    StudentView -->|GET /api/orders/:id| API
    StaffLogin -->|POST /api/auth/login| API
    StaffOrders -->|GET /api/admin/orders| API
    StaffOrders -->|PATCH /api/admin/orders/:id/status| API
    StaffMenu -->|GET /api/admin/menu| API
    StaffMenu -->|POST/PUT/DELETE /api/admin/menu| API

    API --> SQLiteDB
    StudentView <--> LocalStorage
    StaffLogin <--> LocalStorage
    StaffOrders <--> LocalStorage
```

---

## 2. Database Schema Specification

The application runs on a single-file SQLite database configured with the following table schemas:

### 2.1. The `menu` Table
Stores food items and their availability.
```sql
CREATE TABLE IF NOT EXISTS menu (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT NOT NULL,
  is_available INTEGER DEFAULT 1, -- Boolean (1 = In Stock, 0 = Out of Stock)
  image TEXT
);
```

### 2.2. The `orders` Table
Stores order information, including ordered items serialized as a JSON string.
```sql
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_roll TEXT NOT NULL,
  items TEXT NOT NULL,           -- Serialized JSON array of ordered items
  total_price REAL NOT NULL,
  status TEXT NOT NULL,          -- 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED'
  pickup_code TEXT NOT NULL,     -- 4-digit unique OTP code
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Detailed UI/UX Design System & Tokens

Stitch must use these specific visual variables, styles, and spacing rules to maintain visual coherence across all regenerated components.

### 3.1. Color Palette (Dark Theme / Glassmorphism)
The application is built on a premium slate-obsidian dark theme:

*   **Background Hierarchy:**
    *   `Primary Background (Level 1):` `#0F172A` (Rich Dark Slate - `hsl(222, 47%, 7%)`) - Used for body wrappers.
    *   `Secondary Background (Level 2):` `#1E293B` (Muted Charcoal - `hsl(222, 47%, 10%)`) - Used for card wrappers, sidebars, and input inputs.
    *   `Surface Level (Level 3):` `#334155` (Slate Accent - `hsl(222, 47%, 13%)`) - Used for active selectors and table headers.
*   **Brand Accents:**
    *   `Brand Primary:` `#6366F1` (Indigo - State default)
    *   `Brand Hover:` `#4F46E5` (Deep Indigo)
    *   `Brand Subtle:` `rgba(99, 102, 241, 0.15)` (Active item backing)
*   **Status & Feedback Badges:**
    *   `Success (Green):` `#10B981` / `rgba(16, 185, 129, 0.15)` (Used for `READY` orders, active toggles)
    *   `Warning (Orange):` `#F59E0B` / `rgba(245, 158, 11, 0.1)` (Used for `PENDING` states, alert borders)
    *   `Error (Red):` `#EF4444` / `rgba(239, 68, 68, 0.15)` (Used for offline indicators, delete states)

### 3.2. Glassmorphic Surface Specifications
All dashboard modules and food cards must render using translucent overlays:
*   **Glass Card class (`.glass-card`):**
    ```css
    backdrop-filter: blur(8px);
    background-color: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
    ```
*   **Glass Nav class (`.glass`):**
    ```css
    backdrop-filter: blur(12px);
    background-color: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    ```

### 3.3. Typography & Hierarchy
Fonts are imported from Google Fonts:
*   **Headings/Hero Texts:** `Outfit` (sans-serif, geometric, weight: 600/700, tracking: tight `-0.025em`).
*   **Body, Inputs, & Details:** `Inter` (sans-serif, weights: 400/500/600, highly legible at small sizes).
*   **Monospace Codes:** `Courier New` / System Monospace - used strictly for Order OTPs.
*   **Case Mapping:** Small metadata and category badges must be set to `uppercase` with letters tracked slightly wider (`tracking-wider`).

---

## 4. Layout & Grid Specifications

Stitch must preserve these grid ratios and layout behaviors across screen size changes:

### 4.1. Responsive Breakpoints
*   **Mobile Screen (< 768px):** Single column. Sidebars (like the Cart drawer) collapse into bottom sheet overlays.
*   **Tablet Screen (768px - 1024px):** Standard grid structures scale down, menu grid adjusts to 2-columns.
*   **Desktop Screen (> 1024px):** Split columns. Sidebar cart locked as a sticky column beside the menu grid.

### 4.2. Grids & Panels Layout
*   **Main Header:** Height fixed to `64px` (`py-3`). Content aligned using flexbox (`justify-between`).
*   **Food Menu Grid:** Set to standard CSS grid.
    *   Desktop: `grid-cols-3` with `gap-5`.
    *   Tablet: `grid-cols-2` with `gap-5`.
    *   Mobile: `grid-cols-1` with `gap-4`.
*   **Cart Drawer Sidebar:** Max width set to `320px` (`w-80`). Vertical sizing must be constrained using `max-h-[calc(100vh-140px)]` to prevent footer clipping.
*   **Kanban Board (Staff):** Uses `grid-cols-3` with `gap-6` on desktop. Each column column wrapper is set to a fixed height limit of `70vh` (`max-h-[70vh]`), and has scroll overflow `overflow-y-auto` enabled. This guarantees all 3 columns stay aligned on one screen.

---

## 5. Visual Interactions, Transitions, & Animations (UX)

Stitch must configure smooth transitions on all interactive components:

### 5.1. Animation Curves
*   **Base Hover transitions:** `200ms ease` (applies to buttons, links, tabs).
*   **Card Scale Animations:** `300ms cubic-bezier(0.16, 1, 0.3, 1)` (smooth deceleration curve).
*   **Drawer Slide-ups:** `300ms cubic-bezier(0.16, 1, 0.3, 1)` sliding along the Y-axis.

### 5.2. Component Visual States
*   **Food Item Card Hover:**
    *   Cards scale up slightly (`scale-[1.02]`) on hover.
    *   Borders transition from `white/0.08` to `brand/0.40`.
    *   Dish images scale up (`scale-105`) inside their overflow-hidden containers (`transition-all duration-500`).
*   **Add-To-Cart Transition:**
    *   Clicking "Add to Cart" triggers a cross-fade replacing the button with the "+ / -" quantity controller.
    *   The floating bag button on mobile springs/scales up (`scale-105` then settles to `scale-100`) as quantities change.
*   **Segmented Tab Switchers:**
    *   Selected tab button highlights with the solid brand color.
    *   Unselected tabs hover to a semi-transparent state (`white/5`).
*   **Custom Toggle Switch (Stock status):**
    *   Slider switch uses smooth CSS transition: check-state shifts the white indicator ball (`translate-x-full`) over a background color change from grey to green (`bg-status-success`) in `200ms`.
*   **Loader Spinner Cues:**
    *   Spinner icons (`RotateCw` and `Loader2`) rotate indefinitely via `@keyframes spin`.
    *   Offline alerts use soft pulse transparency loops (`animate-pulse`).

---

## 6. Detailed UX Flow Specifications

### 6.1. Student Checkout & Form Flow
1.  **Selection Feedback:** Cart quantities increment in real-time. On desktop, the sidebar list updates instantly. On mobile, the floating action button updates a badge count.
2.  **Validation Feedback:** Form inputs (Name & Roll Number) block form submission if empty, applying focus states.
3.  **Order Button Lockout:** Clicking "Place Order" replaces button text with "Ordering..." and disables interaction to prevent duplicate submissions.
4.  **OTP Presentation:** The unique 4-digit code is presented in high-contrast monospace text inside a dashed border ticket.
5.  **QR Code Contrast:** The QR image is rendered with a clean white padding box (`bg-white p-1`) to ensure high contrast against dark mode backgrounds, making it easily scannable by staff.

### 6.2. Staff Orders Dashboard Flow
1.  **Incoming Alert:** A chime plays automatically (`https://assets.mixkit.co/active_storage/sfx/1018/1018-500.wav`) when a new order lands in `PENDING`.
2.  **Accepting & Cooking:** Clicking "Accept & Cook" fades the ticket card out of Column 1 and moves it into Column 2, activating a spinning loader status icon.
3.  **Pickup Ready Alert:** Marking an order ready plays a sound chimer (`https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav`) for the student, and displays a flashing status tag.
4.  **Completion Archive:** Clicking "Paid & Collected" completes the order, archiving it in the History Table logs, which are accessible via a secondary toggle button.

---

## 7. Frontend State & Component Specification

### 7.1. Main Routing Hub (`App.tsx`)
Coordinates the overall page structure and global navigation bar.
*   **State Hooks:**
    *   `isStaffLoggedIn` (`boolean`): Tracked via check on `localStorage.getItem('staffToken')`.
*   **Links & Buttons:**
    *   `Logo Link (CampusBites)`: Clicking routes to `/` (StudentView).
    *   `Staff Dashboard Link`: Routed to `/staff`. Changes dynamically to "Orders" and "Edit Menu" tabs when logged in.
    *   `Logout Button`: Triggers `handleLogout()`, removing `staffToken` and redirecting to `/`.
    *   `Student Menu Link`: Redirects back to student page from `/staff` view.

---

### 7.2. Student Ordering Interface (`StudentView.tsx`)
Consists of two main modes: **Browse Menu** and **My Orders**, switched via a segmented toggle button.

#### State Hook Reference:
*   `menu` (`MenuItem[]`): Current dishes fetched from server.
*   `selectedCategory` (`string`): Filters displayed food grid (`All`, `Meals`, `Snacks`, `Beverages`, `Desserts`).
*   `searchQuery` (`string`): Real-time search string typed by the student.
*   `cart` (`CartItem[]`): Active selections. Items include `{ id, name, price, quantity }`.
*   `isCartOpen` (`boolean`): Controls mobile bottom sheet drawer visibility.
*   `studentName` (`string`): Customer name bound to the checkout form input.
*   `studentRoll` (`string`): Customer Roll Number or Phone bound to input.
*   `myOrders` (`Order[]`): Past orders placed in the current session (synced with local storage `myOrdersList`).
*   `activeSubTab` (`'menu' | 'orders'`): Tracks selected sub-page mode.
*   `isSubmitting` (`boolean`): Lockout flag during API checkout request.
*   `serverError` (`string`): Holds error messages when backend is offline.

---

### 7.3. Staff Login Portal (`StaffLogin.tsx`)
*   **State Hooks:**
    *   `password` (`string`): Value entered in the security pin text input.
    *   `error` (`string`): Error message displayed in a red banner.
    *   `isLoading` (`boolean`): Shows a spinning loader while verifying.
*   **Submit Action:** Sends a POST request containing the security password. If verification is successful, saves `staffToken` in `localStorage` and routes to `/staff`.

---

### 7.4. Staff Orders Kanban (`StaffOrders.tsx`)
A Kanban board that groups orders into three columns matching order lifecycle statuses.

#### State Hook Reference:
*   `orders` (`Order[]`): Holds list of all active/completed orders fetched via polling.
*   `activeTab` (`'ACTIVE' | 'COMPLETED'`): Toggles between the active Kanban board and Completed table log.
*   `isLoading` (`boolean`): Active during initial dashboard load.
*   `error` (`string`): Connection error banner state.

---

### 7.5. Inventory Menu Management (`StaffMenu.tsx`)
Allows staff to create, modify, or delete menu items.

#### State Hook Reference:
*   `menuItems` (`MenuItem[]`): Master list of menu dishes.
*   `isModalOpen` (`boolean`): Modal pop-up toggle for Add/Edit item form.
*   `editingId` (`string | null`): Set to the item ID if editing, or `null` if creating.
*   `name` (`string`), `price` (`string`), `category` (`string`), `imageUrl` (`string`), `isAvailable` (`boolean`): Form fields states.

---

## 8. REST API Endpoint Specification

All backend requests are routed through `/api/*`. Staff endpoints require a `Bearer <JWT_TOKEN>` in the `Authorization` header.

### 8.1. Public Endpoints (Rate limited to max 200 requests / 15 minutes)

#### Get Menu
*   **Method & Route:** `GET /api/menu`
*   **Response (200 OK):** Array of available items.

#### Place Order
*   **Method & Route:** `POST /api/orders`
*   **Payload (JSON):**
    ```json
    {
      "name": "John Doe",
      "rollNumber": "CS2026",
      "items": [
        { "id": "m1", "name": "Paneer Tikka Roll", "price": 80.0, "quantity": 2 }
      ],
      "totalPrice": 160.0
    }
    ```
*   **Response (201 Created):** Order details object.

#### Poll Order Details
*   **Method & Route:** `GET /api/orders/:id`
*   **Response (200 OK):** Order details object.

---

### 8.2. Staff Protected Endpoints (Requires JWT Bearer Token validation)

#### Verify Staff Login
*   **Method & Route:** `POST /api/auth/login`
*   **Payload (JSON):** `{ "password": "securepassword" }`
*   **Response (200 OK):** `{ "token": "jwt-token" }`

#### Get All Orders
*   **Method & Route:** `GET /api/admin/orders`
*   **Headers:** `Authorization: Bearer <token>`
*   **Response (200 OK):** Array of all orders.

#### Update Order Status
*   **Method & Route:** `PATCH /api/admin/orders/:id/status`
*   **Headers:** `Authorization: Bearer <token>`
*   **Payload (JSON):** `{ "status": "PREPARING" }`
*   **Response (200 OK):** Status updated successfully.

#### Get Full Menu (For Editing)
*   **Method & Route:** `GET /api/admin/menu`
*   **Headers:** `Authorization: Bearer <token>`

#### Add Menu Item
*   **Method & Route:** `POST /api/admin/menu`
*   **Headers:** `Authorization: Bearer <token>`

#### Edit Menu Item
*   **Method & Route:** `PUT /api/admin/menu/:id`
*   **Headers:** `Authorization: Bearer <token>`

#### Delete Menu Item
*   **Method & Route:** `DELETE /api/admin/menu/:id`
*   **Headers:** `Authorization: Bearer <token>`
