# 📖 CampusBites API & Real-Time WebSocket Documentation

This document describes all REST API endpoints, request schemas, response formats, authentication standards, and WebSocket events used in the **CampusBites** system.

---

## 🔐 Authentication & Roles

* **Token Format**: Bearer JWT passed in `Authorization: Bearer <token>` header.
* **Roles**:
  * `admin`: System-wide administrator. Can manage all canteens, orders, and menu items.
  * `manager`: Canteen Manager. Can manage menu items, pricing, and orders for their assigned canteen.
  * `cook`: Kitchen Cook. Can view orders and update order statuses (Preparing, Ready) for their assigned canteen.

---

## 🌐 Base URL
* **Local Development**: `http://localhost:5000`
* **Production**: `https://<your-backend-service>.onrender.com`

---

## 🥗 Public & Student Endpoints

### 1. List Canteens
* **Method**: `GET /api/canteens`
* **Auth**: None
* **Description**: Returns all registered canteens/dining halls.
* **Response**: `200 OK`
  ```json
  [
    {
      "id": "c1",
      "name": "Canteen A",
      "description": "Independent student dining hall serving full meals, snacks, and drinks.",
      "image": "https://images.unsplash.com/photo-..."
    }
  ]
  ```

---

### 2. Fetch Menu Items
* **Method**: `GET /api/menu`
* **Query Parameters**:
  * `canteen_id` (optional): Filter items by canteen ID (e.g. `?canteen_id=c1`).
  * `category` (optional): Filter by category (`Snacks`, `Beverages`, `Meals`, `Desserts`).
* **Response**: `200 OK`
  ```json
  [
    {
      "id": "m1",
      "name": "Paneer Tikka Roll",
      "price": 80.0,
      "category": "Snacks",
      "is_available": 1,
      "image": "https://...",
      "canteen_id": "c1"
    }
  ]
  ```

---

### 3. Place New Order
* **Method**: `POST /api/orders`
* **Auth**: None (Students identify via name & roll number)
* **Request Body**:
  ```json
  {
    "student_name": "Aarav Sharma",
    "student_roll": "CS-2024-042",
    "canteen_id": "c1",
    "items": [
      {
        "id": "m1",
        "name": "Paneer Tikka Roll",
        "price": 80,
        "quantity": 2
      }
    ]
  }
  ```
* **Response**: `201 Created`
  ```json
  {
    "id": "ord_1720000000_abc123",
    "order_number": "ORD-042",
    "student_name": "Aarav Sharma",
    "student_roll": "CS-2024-042",
    "items": "[{\"id\":\"m1\",\"name\":\"Paneer Tikka Roll\",\"price\":80,\"quantity\":2}]",
    "total_price": 160,
    "status": "PENDING",
    "pickup_code": "PICKUP-8921",
    "created_at": "2026-08-21T18:45:00.000Z",
    "canteen_id": "c1"
  }
  ```

---

### 4. Check Order Status
* **Method**: `GET /api/orders/:id`
* **Auth**: None
* **Description**: Returns live details for a specific order.
* **Response**: `200 OK`
  ```json
  {
    "id": "ord_1720000000_abc123",
    "order_number": "ORD-042",
    "status": "PREPARING",
    "pickup_code": "PICKUP-8921",
    "total_price": 160
  }
  ```

---

## 🔒 Staff & Administrative Endpoints

### 1. Staff Login
* **Method**: `POST /api/auth/login`
* **Request Body**:
  ```json
  {
    "username": "canteen_a_mgr",
    "password": "1234"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u2",
      "username": "canteen_a_mgr",
      "role": "manager",
      "canteen_id": "c1"
    }
  }
  ```

---

### 2. Fetch All Orders (Staff Dashboard)
* **Method**: `GET /api/admin/orders`
* **Headers**: `Authorization: Bearer <token>`
* **Description**: Returns all orders filtered automatically by the authenticated staff user's `canteen_id` (or all canteens for `admin`).
* **Response**: `200 OK`
  ```json
  [
    {
      "id": "ord_1720000000_abc123",
      "order_number": "ORD-042",
      "student_name": "Aarav Sharma",
      "student_roll": "CS-2024-042",
      "items": "[{\"id\":\"m1\",\"name\":\"Paneer Tikka Roll\",\"price\":80,\"quantity\":2}]",
      "total_price": 160,
      "status": "PENDING",
      "pickup_code": "PICKUP-8921",
      "canteen_id": "c1"
    }
  ]
  ```

---

### 3. Update Order Status
* **Method**: `PATCH /api/admin/orders/:id/status`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "status": "PREPARING" // "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "message": "Order status updated to PREPARING",
    "order": { ... }
  }
  ```

---

### 4. Menu Management (CRUD)
* **Headers**: `Authorization: Bearer <token>`
* **Endpoints**:
  * `POST /api/admin/menu`: Create item (`{ name, price, category, image, canteen_id }`)
  * `PUT /api/admin/menu/:id`: Update item (`{ name, price, category, is_available, image }`)
  * `DELETE /api/admin/menu/:id`: Delete menu item.

---

## ⚡ Real-Time WebSocket Events (Socket.io)

### Client Connection
```ts
import { io } from 'socket.io-client';
const socket = io('https://your-backend.onrender.com');
```

### Server $\rightarrow$ Client Events

| Event Name | Payload | Description |
|---|---|---|
| `new_order` | `Order` object | Emitted to staff dashboards when a student submits an order. |
| `order_status_updated` | `{ orderId: string, status: string, order: Order }` | Emitted when staff changes order status; triggers student tracking update. |
| `menu_updated` | `{ type: 'create'\|'update'\|'delete', item: MenuItem }` | Emitted when staff edits menu; invalidates client menu cache. |
