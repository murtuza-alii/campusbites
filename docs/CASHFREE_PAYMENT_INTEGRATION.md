# Cashfree Payment Gateway Integration Guide

Comprehensive technical and operational documentation for the **Cashfree Payment Gateway** in CampusBites.

---

## 📌 Architecture Overview

CampusBites integrates Cashfree's **PG V3 Web Checkout (Redirect & In-App Modal)** alongside real-time WebSocket notifications. The platform supports **Dynamic Environment Switching** between **Sandbox (`TEST`)** and **Production (`PROD`)**.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (App / Web)
    participant FE as React Frontend (StudentView)
    participant BE as Express Backend (PaymentController)
    participant DB as PostgreSQL Database
    participant CF as Cashfree PG Server (Sandbox / Live)
    participant WS as WebSocket & Kitchen Dashboard

    Student->>FE: Adds items to cart & clicks "Pay with Cashfree"
    FE->>BE: POST /api/payments/create-order { name, rollNumber, canteenId, items, totalPrice }
    BE->>CF: POST /orders (x-client-id, x-client-secret, x-api-version)
    CF-->>BE: Returns payment_session_id & cf_order_id
    BE->>DB: Stores Order (status: 'PENDING', payment_status: 'PENDING')
    BE-->>FE: Returns { orderId, orderNumber, paymentSessionId, environment }
    
    FE->>CF: Cashfree JS SDK opens Checkout Modal (mode: environment)
    Student->>CF: Completes Payment (UPI / Card / Netbanking)
    
    par Modal Return / Redirect Verification
        CF-->>FE: Checkout finishes / returns to page
        FE->>BE: POST /api/payments/verify { orderId }
        BE->>CF: GET /orders/{orderId}
        BE->>DB: Updates payment_status = 'PAID'
        BE->>WS: Emits emitOrderCreated & emitOrderStatusChanged
        BE-->>FE: Returns verified active order ticket
        FE-->>Student: Displays pickup PIN & cryptographically signed QR
    and Asynchronous Webhook
        CF->>BE: POST /api/payments/webhook (x-webhook-signature)
        BE->>BE: Validates HMAC SHA-256 signature
        BE->>DB: Updates payment_status = 'PAID'
        BE->>WS: Emits order updates to Kitchen Ticket Queue
    end
```

---

## ⚙️ Environment Configuration

All credentials and runtime switches are managed via environment variables in `backend/.env` and your cloud host (e.g. Render Dashboard):

```env
# ==============================================================================
# Cashfree Payment Gateway Configuration
# ==============================================================================
# Your Cashfree App ID (Client ID)
CASHFREE_APP_ID=your_app_id_here

# Your Cashfree Secret Key (Client Secret)
CASHFREE_SECRET_KEY=your_secret_key_here

# Environment Switch: 'TEST' for Sandbox | 'PROD' for Live Production
CASHFREE_ENV=PROD

# Cashfree API Version (e.g. 2023-08-01)
CASHFREE_API_VERSION=2023-08-01

# Public Frontend URL for return redirects
FRONTEND_URL=https://campusbites-frontend-4jw1.onrender.com
```

### Dynamic Switching Explained:
* When `CASHFREE_ENV=TEST`:
  - Backend targets: `https://sandbox.cashfree.com/pg`
  - Frontend SDK loads with: `mode: "sandbox"`
* When `CASHFREE_ENV=PROD`:
  - Backend targets: `https://api.cashfree.com/pg`
  - Frontend SDK loads with: `mode: "production"`

---

## 📡 API Endpoints Reference

### 1. Create Payment Order Session
* **Endpoint**: `POST /api/payments/create-order`
* **Access**: Public
* **Request Body**:
```json
{
  "name": "Rahul Sharma",
  "rollNumber": "CS2026",
  "canteenId": "c1",
  "items": [
    { "id": "m1", "name": "Paneer Tikka Roll", "price": 80, "quantity": 1 }
  ],
  "totalPrice": 80,
  "phone": "9876543210",
  "email": "student@college.edu"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "orderId": "ord_x7k9p2a1b",
    "orderNumber": "#1042",
    "paymentSessionId": "session_Tdt_E2DEKxkX_N1GgQy9Nr...",
    "cfOrderId": "214899299215296",
    "orderAmount": 80,
    "environment": "production"
  }
}
```

---

### 2. Verify Payment Status
* **Endpoint**: `POST /api/payments/verify`
* **Access**: Public
* **Request Body**:
```json
{
  "orderId": "ord_x7k9p2a1b"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "status": "PAID",
    "order": {
      "id": "ord_x7k9p2a1b",
      "order_number": "#1042",
      "student_name": "Rahul Sharma",
      "student_roll": "CS2026",
      "total_price": 80,
      "status": "PENDING",
      "pickup_code": "5821",
      "payment_status": "PAID",
      "items": [ ... ],
      "qr_payload": { ... }
    }
  }
}
```

---

### 3. Asynchronous Webhook Receiver
* **Endpoint**: `POST /api/payments/webhook`
* **Access**: Cashfree Server Notifications
* **Headers Verified**: `x-webhook-signature`, `x-webhook-timestamp`
* **Payload Handled**: `ORDER_PAID`, `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`
* **Response**: `{ "status": "OK" }`

---

## 💻 Frontend Implementation Guide

### 1. SDK Script Tag
Included in [`frontend/index.html`](file:///e:/campusbites/frontend/index.html):
```html
<!-- Cashfree Web JS SDK v3 -->
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

### 2. Checkout Modal Trigger ([`StudentView.tsx`](file:///e:/campusbites/frontend/src/components/StudentView.tsx))
```typescript
const sessionData = await response.json();
const { paymentSessionId, orderId, environment } = sessionData;
const checkoutMode = environment === 'production' ? 'production' : 'sandbox';

const win = window as any;
if (paymentSessionId && (win.Cashfree || win.loadCashfree)) {
  let cashfreeInstance: any;
  if (typeof win.Cashfree === 'function') {
    cashfreeInstance = win.Cashfree({ mode: checkoutMode });
  } else if (typeof win.loadCashfree === 'function') {
    cashfreeInstance = await win.loadCashfree({ mode: checkoutMode });
  }

  if (cashfreeInstance) {
    cashfreeInstance.checkout({
      paymentSessionId: paymentSessionId,
      redirectTarget: '_modal', // Sleek in-app popup modal
    }).then(async (result: any) => {
      if (result.error) {
        console.warn('Payment cancelled:', result.error);
        return;
      }
      await verifyAndCompleteOrder(orderId);
    });
  }
}
```

---

## 🔒 Security & Verification

1. **Server-Side Order Creation**:
   API keys (`CASHFREE_SECRET_KEY`) are kept strictly on the backend. The client only receives short-lived `payment_session_id` tokens.
2. **HMAC SHA-256 Webhook Verification**:
   All incoming webhooks compute `crypto.createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64')` to prevent unauthorized payload tampering.
3. **Double Verification**:
   The frontend automatically calls `/api/payments/verify` immediately upon modal completion to fetch authoritative status directly from Cashfree before issuing QR codes.

---

## 🎨 Brand Assets & Checkout Logos

Vector SVG logos tailored for Cashfree checkout branding and web applications:
* **Square Icon (512x512)**: `frontend/public/campusbites-logo-square.svg`
  - URL: `https://campusbites-frontend-4jw1.onrender.com/campusbites-logo-square.svg`
* **Wide Banner Logo**: `frontend/public/campusbites-logo-wide.svg`
  - URL: `https://campusbites-frontend-4jw1.onrender.com/campusbites-logo-wide.svg`

---

## 🛠️ Maintenance & Key Rotation

To generate a new key or switch between Sandbox/Production:
1. Go to **Cashfree Merchant Dashboard ➔ Developers ➔ API Keys**.
2. Click **Generate New API Key** (and click **Download API Key** to activate).
3. Update `CASHFREE_APP_ID` & `CASHFREE_SECRET_KEY` in:
   - Local: `backend/.env`
   - Render: **Render Dashboard ➔ campusbites service ➔ Environment Variables**.

---

## 📋 Comprehensive Onboarding & Implementation Log

A detailed chronicle of everything completed during the Cashfree Payment Gateway onboarding and development session:

### 1. Step 1: Sandbox Verification & Order Creation
* **Sandbox Keys Configured**: Connected to Cashfree Sandbox using initial App ID & Secret Key from dashboard.
* **Backend Services Implemented**:
  - `PaymentService.ts`: PG order creation via `https://sandbox.cashfree.com/pg/orders`, status polling, HMAC SHA256 signature verification.
  - `PaymentController.ts` & `paymentRoutes.ts`: Mounted on `/api/payments/create-order`, `/api/payments/verify`, and `/api/payments/webhook`.
  - `db.ts` & `unifiedConfig.ts`: Auto-migrated `orders` table to track `payment_status`, `payment_session_id`, and `cf_order_id`.
* **Frontend Web SDK**:
  - Added Cashfree Web SDK V3 to `index.html`.
  - Updated `StudentView.tsx` with dynamic modal checkout (`_modal` target) and automatic return-order verification.
* **Test Simulation Completed**: Performed mock transaction on Sandbox (`HTTP 200`), satisfying Cashfree's Sandbox Onboarding requirement.

### 2. Step 2: Domain Whitelisting & Method Verification
* **Whitelisted Origin**: Registered and verified `campusbites-frontend-4jw1.onrender.com` in Cashfree.
* **Payment Methods**: Verified active support for UPI (GPay, PhonePe, Paytm, BHIM, RuPay), Credit/Debit Cards, and Net Banking.

### 3. Step 3: Webhooks & Production Deployment
* **Live Webhook Endpoint**: Deployed `https://campusbites-4dch.onrender.com/api/payments/webhook` to Render.
* **Render Environment Synced**: Configured live Render backend with `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=PROD`, and `CASHFREE_API_VERSION=2023-08-01`.
* **Live Test Verified**: Confirmed Render webhook returns `{"status": "OK"}` (HTTP 200) to Cashfree server tests.

### 4. Step 4: Production Account Activation & Brand Assets
### 5. Step 5: Verification Feedback, Legal Policies & Entity Deployment
* **Merchant Verification Requirement**: Cashfree compliance requested explicit display of legal entity name (**MURTUZA ALI**), official email (`murtuzaali17th@gmail.com`), phone (`+91 8432123450`), and missing statutory policies.
* **Compliance Pages Deployed**:
  - Implemented `frontend/src/components/LegalPolicies.tsx` covering **Terms & Conditions**, **Privacy Policy (DPDP Act 2023)**, **Refund & Cancellation Policy**, **Shipping & Delivery Policy (Counter Pickup)**, and **Contact Us & Grievance Redressal (Consumer Protection Rules 2020)**.
  - Deployed dedicated routes (`/terms`, `/privacy`, `/refund-policy`, `/shipping-policy`, `/contact`) and verified merchant footer cards on Render.

### 6. Step 6: Cashfree Feature Decision Record (Easy Split vs. Standard PG)
* **Feature Decision Log (Ticket ID: 8324844)**:
  - **Easy Split Request**: ❌ **Declined** by Cashfree underwriting due to internal risk and policy constraints for new individual/sole proprietorship accounts.
  - **Core Payment Gateway**: ✅ **Approved & Moving to Live Activation**. Cashfree confirmed standard payment collection is active, and same-day / instant settlement will be provisioned upon completion of onboarding pendencies.
* **Architectural Strategy**:
  - CampusBites operates on the **Standard Payment Gateway** model where 100% of student order payments settle directly into the primary merchant account (`MURTUZA ALI`).
  - Canteen ledger reconciliations and disbursements are managed internally through CampusBites order reporting / direct bank settlements.
  - If instant marketplace splitting is required later, it can be re-evaluated with Cashfree after establishing processing history/GST, or via Easebuzz Slices.

---

### 📂 Modified / Created File Inventory

| File | Type | Purpose |
|---|---|---|
| [`backend/src/services/PaymentService.ts`](file:///e:/campusbites/backend/src/services/PaymentService.ts) | Backend Service | Connects to Cashfree PG APIs & computes HMAC signatures |
| [`backend/src/controllers/PaymentController.ts`](file:///e:/campusbites/backend/src/controllers/PaymentController.ts) | Controller | Handles checkout session creation, status verification & webhooks |
| [`backend/src/routes/paymentRoutes.ts`](file:///e:/campusbites/backend/src/routes/paymentRoutes.ts) | Express Router | Exposes `/api/payments/*` routes |
| [`backend/src/config/unifiedConfig.ts`](file:///e:/campusbites/backend/src/config/unifiedConfig.ts) | Configuration | Zod environment schema & dynamic Cashfree URLs |
| [`backend/src/db.ts`](file:///e:/campusbites/backend/src/db.ts) | Database | Schema alterations for order payment status & session IDs |
| [`backend/src/app.ts`](file:///e:/campusbites/backend/src/app.ts) | Application | Mounts payment routes onto the Express app |
| [`frontend/index.html`](file:///e:/campusbites/frontend/index.html) | Frontend | Loads Cashfree Web SDK V3 |
| [`frontend/src/components/StudentView.tsx`](file:///e:/campusbites/frontend/src/components/StudentView.tsx) | React UI | Triggers dynamic checkout popup & auto-verifies payments |
| [`frontend/src/components/LegalPolicies.tsx`](file:///e:/campusbites/frontend/src/components/LegalPolicies.tsx) | Frontend UI | Mandatory compliance policies & grievance details for PG verification |
| [`frontend/src/components/LandingPage.tsx`](file:///e:/campusbites/frontend/src/components/LandingPage.tsx) | Frontend UI | Verified merchant operator card & statutory links |
| [`frontend/public/campusbites-logo-square.svg`](file:///e:/campusbites/frontend/public/campusbites-logo-square.svg) | Brand Asset | 512x512 vector squircle logo for Cashfree checkout |
| [`frontend/public/campusbites-logo-wide.svg`](file:///e:/campusbites/frontend/public/campusbites-logo-wide.svg) | Brand Asset | Horizontal vector banner logo |
| [`docs/CASHFREE_PAYMENT_INTEGRATION.md`](file:///e:/campusbites/docs/CASHFREE_PAYMENT_INTEGRATION.md) | Documentation | Comprehensive technical integration & architecture guide |
| [`docs/GATEWAY_SPLIT_PAYMENT_ARCHITECTURE.md`](file:///e:/campusbites/docs/GATEWAY_SPLIT_PAYMENT_ARCHITECTURE.md) | Documentation | Multi-vendor vs single-merchant gateway architecture guide |
| [`docs/API_DOCUMENTATION.md`](file:///e:/campusbites/docs/API_DOCUMENTATION.md) | Documentation | Updated with `/api/payments` endpoints |
| [`README.md`](file:///e:/campusbites/README.md) | Documentation | Updated with Cashfree PG guide reference |


