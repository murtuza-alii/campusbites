# 🏛️ CampusBites Architecture & Database Specification

This document provides a deep dive into the internal architecture, database schema, background queue processing, and real-time communication pipeline of **CampusBites**.

---

## 🏗️ High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients [Client Layer]
        SV[Student Web Client - React 19]
        KD[Kitchen Cook Display - Kanban]
        MD[Canteen Manager Portal - Menu & Analytics]
    end

    subgraph BackendGateway [Backend Gateway & API]
        ExpressApp[Express.js Server]
        RateLimiter[Rate Limiter & Helmet]
        AuthGuard[JWT Auth & RBAC Middleware]
        ZodValidator[Zod Payload Validation]
    end

    subgraph AsyncPipeline [High-Concurrency Queue]
        OrderQueue[BullMQ Order Queue]
        Worker[Order Worker Consumer]
    end

    subgraph StorageRealtime [Data & Real-Time Layer]
        PostgreSQL[(PostgreSQL Relational DB)]
        Redis[(Redis Cache & Queue Broker)]
        SocketIO[Socket.io WebSocket Server]
    end

    SV -->|POST /api/orders| ExpressApp
    KD -->|PATCH /api/admin/orders/:id/status| ExpressApp
    MD -->|POST/PUT /api/admin/menu| ExpressApp

    ExpressApp --> RateLimiter --> AuthGuard --> ZodValidator
    ZodValidator -->|Push Job| OrderQueue
    OrderQueue --> Redis
    Worker -->|Process Job| Redis
    Worker -->|Insert Order Record| PostgreSQL
    Worker -->|Broadcast new_order| SocketIO
    ExpressApp -->|Broadcast status/menu changes| SocketIO

    SocketIO -->|Live Updates| SV
    SocketIO -->|Live Kanban Refresh| KD
    SocketIO -->|Live Updates| MD
```

---

## 🗄️ Database Relational Schema

CampusBites uses **PostgreSQL** for ACID-compliant transactional consistency.

```mermaid
erDiagram
    CANTEEN ||--o{ USERS : employs
    CANTEEN ||--o{ MENU : offers
    CANTEEN ||--o{ ORDERS : fulfills

    CANTEEN {
        text id PK
        text name
        text description
        text image
    }

    USERS {
        text id PK
        text username UK
        text password_hash
        text role
        text canteen_id FK
    }

    MENU {
        text id PK
        text name
        double_precision price
        text category
        integer is_available
        text image
        text canteen_id FK
    }

    ORDERS {
        text id PK
        text order_number
        text student_name
        text student_roll
        text items
        double_precision total_price
        text status
        text pickup_code
        timestamp created_at
        text canteen_id FK
    }
```

### Table Definitions

1. **`canteen`**:
   * Represents an independent dining hall or outlet (e.g. Canteen A, Canteen B).
2. **`users`**:
   * Stores canteen personnel with roles (`admin`, `manager`, `cook`).
   * Passwords hashed using `bcrypt` (cost factor 10).
3. **`menu`**:
   * Items linked to a specific `canteen_id`.
   * Categories: `Snacks`, `Beverages`, `Meals`, `Desserts`.
4. **`orders`**:
   * Stores customer information (`student_name`, `student_roll`).
   * `status` state machine: `PENDING` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED` (or `CANCELLED`).
   * `pickup_code`: Short human-readable identifier (e.g., `PICKUP-1234`).

---

## ⚡ Concurrency & BullMQ Pipeline

During campus lunch breaks, order volume surges. Direct synchronous database writes can cause locks and dropped requests.

### Asynchronous Order Flow:
1. **Submission**: Student submits order via `POST /api/orders`.
2. **Ingestion**: The API enqueues the job into `orderQueue` (BullMQ backed by Redis) and returns immediately.
3. **Worker Processing**:
   * Worker calculates total price server-side from current menu rates (preventing price tampering).
   * Generates order number (`ORD-XXX`) and pickup token.
   * Commits the record to PostgreSQL.
4. **Real-Time Notification**:
   * Emits `new_order` event via Socket.io to the kitchen dashboard for the relevant canteen.
   * Emits confirmation to the student client.

---

## 🛡️ Role-Based Access Control (RBAC)

| Role | Scope | Permissions |
|---|---|---|
| **Admin** (`admin`) | Global (All Canteens) | Full access to all menus, orders, users, and canteen management. |
| **Manager** (`manager`) | Canteen-Scoped | Add/Edit/Delete menu items, adjust prices, toggle item stock, manage orders. |
| **Cook** (`cook`) | Canteen-Scoped | View live orders, advance order status (`PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`). |
