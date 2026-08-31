# CampusBites — Gateway Split Payment Architecture & Vendor Strategy

## 1. Executive Summary

This document specifies the **Gateway-Level Split Payment Architecture** for CampusBites using **Easebuzz Slices** (or **Cashfree Easy Split**).

In this architecture, funds paid by students are automatically split at the payment gateway level during checkout:
* **The Vendor's Food Share** settles directly from the gateway into the vendor's bank account.
* **CampusBites Platform Commission** settles directly from the gateway into your PIKS bank account.
* **100% Tax Shielding:** High-volume restaurant revenue never passes through your personal or company bank account, protecting CampusBites from unnecessary GST liabilities and income tax scrutiny.
* **Unregistered Vendor Friendly:** High-volume street food vendors (*thele-waalas*) without a GSTIN can be fully onboarded as individual sub-merchants using just their PAN and Bank Passbook.
* **Strict Payment-First Kitchen Gatekeeping:** The kitchen never receives or starts preparing an order until the gateway confirms payment has successfully cleared.
* **UPI Latency & Delayed Settlement Protection:** Automated auto-refunds are triggered if banking network delays deliver payment confirmations after a critical cutoff threshold (e.g. 15–20 minutes).

---

## 2. Why Gateway Splitting is Essential (Tax & Legal Shield)

When partnering with popular restaurants or famous street food vendors generating lakhs in monthly sales, collecting 100% of the funds into your account is a severe tax hazard.

```
                  [ Student Pays ₹105 for Food Order ]
                                   │
                                   ▼
          [ Payment Gateway (Easebuzz Slices / Cashfree Easy Split) ]
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
     [ ₹100.00 Food Share ]               [ ₹2.90 Net Commission ]
   Direct Gateway Settlement             Direct Gateway Settlement
                 │                                   │
                 ▼                                   ▼
    [ Vendor's Bank Account ]              [ CampusBites Bank Account ]
  • Vendor's Turnover: ₹100.00           • Platform Turnover: ₹2.90
  • Vendor handles own taxes/GST         • Stays 100% tax-free (<₹20L)
```

### Tax Comparison Matrix

| Parameter | ❌ Without Splitting (Direct Collection) |  With Gateway Splitting (Slices / Easy Split) |
| :--- | :--- | :--- |
| **Gross Bank Turnover** | Millions in gross food sales enter your bank. | **Only your ₹3/item commission enters your bank.** |
| **GST Liability (You)** | Triggers mandatory GST registration once bank deposits cross ₹20 Lakhs. | **Zero GST.** Platform annual earnings comfortably remain under the ₹20 Lakh micro-business exemption. |
| **Income Tax Risk** | Risk of scrutiny notices to explain why huge gross funds were credited without declared profit. | **Clean & zero risk.** Bank statements reflect actual net software revenue only. |
| **Food Tax Responsibility** | Tax authorities could demand food GST (5%) from you. | Vendor or restaurant's own accountant accounts for their food turnover. |

---

## 3. Unit Economics & The "2% Buffer + Commission" Pricing Formula

To guarantee that gateway transaction fees (~1.75%–2% + GST) never eat into your ₹3/item profit, and to ensure the vendor receives **100% of their asking price**, all menu prices on CampusBites follow this formula:

$$\mathbf{\text{App Listed Price}} = (\text{Vendor Base Price} \times 1.02) + ₹3 \text{ Platform Commission}$$

*(Optionally rounded to the nearest ₹1 or ₹5 for clean menu display)*

### Example Financial Walkthrough

* **Item:** Special Kathi Roll from famous street vendor
* **Vendor Base Asking Price:** ₹100.00
* **Calculated Listed Price:** $(₹100 \times 1.02) + ₹3 = \mathbf{₹105.00}$

```
┌──────────────────────────────────────────────────────────────┐
│ Student Checkout Total:                     ₹105.00          │
│ Payment Gateway Fee (~2.0% on ₹105.00):     -₹2.10           │
│                                                              │
│ Net Slices Settlement:                                       │
│ ├── Vendor Bank Account (100% of Base):     ₹100.00  (0 loss)│
│ └── CampusBites Bank Account (Net Profit):    ₹2.90  (Profit)│
└──────────────────────────────────────────────────────────────┘
```

**Outcome:**
1. **The Vendor is thrilled:** They get the exact ₹100 they asked for with zero deductions.
2. **The Student is happy:** A nominal ₹5 markup for digital ordering, skip-the-line pickup, and instant status updates.
3. **CampusBites is profitable:** Every ordered item yields a guaranteed ~₹2.90 to ₹3.00 net margin.

---

## 4. Vendor Onboarding: Unregistered Street Food Vendors (*Thele-waalas*)

Street food vendors and small canteen operators **do not need a GSTIN**. Under Indian tax law, any food vendor earning under ₹20 Lakhs/year is legally exempt from GST.

### Required Onboarding Documents (Zero Bureaucracy)

| Document | Purpose |
| :--- | :--- |
| **1. Personal PAN Card** | Identity verification for sub-merchant creation |
| **2. Aadhaar Card** | Address / individual KYC verification |
| **3. Bank Passbook / Cancelled Cheque** | Account Number & IFSC where food settlements will be deposited |

### Onboarding Steps on Easebuzz / Cashfree:
1. In the Gateway Dashboard, navigate to **Sub-Merchants / Vendors $\rightarrow$ Add New**.
2. Select Category: **"Individual / Unregistered Sole Proprietor"**.
3. Enter the vendor's PAN, Name, and Bank Account details.
4. The gateway performs an automated **₹1 Penny Drop verification** to confirm the bank account is active.
5. The vendor is assigned a unique `sub_merchant_id` (e.g., `SUB_MCH_ROLL_CORNER_01`).
6. Link this `sub_merchant_id` to the canteen record in the CampusBites database.

---

## 5. Strict Payment Gatekeeping & Kitchen Workflow

To eliminate food wastage and financial disputes, the backend strictly enforces a **"No Payment $\rightarrow$ No Food"** rule.

```
Student Clicks 'Pay' 
        │
        ▼
[ Order Status = PAYMENT_PENDING ]
        │
        ├──► Is Payment Confirmed by Gateway?
        │       ├── NO  ──► Kitchen Screen is BLANK (Order NOT visible to cook)
        │       └── YES ──► [ Order Status = CONFIRMED ]
        │                     └── Order appears on Kitchen KDS Screen / Soundbox
```

### Core Rules:
1. **Zero Premature Preparation:** The kitchen screen and vendor soundbox are only triggered when the backend receives a cryptographically verified `PAYMENT_SUCCESS` webhook from the gateway.
2. **No Unpaid Tickets:** If a student abandons the checkout page, closes the app, or experiences a bank failure, no ticket is generated in the kitchen.

---

## 6. UPI Banking Latency & The 20-Minute Edge Case

In Indian UPI transactions, bank server congestion (SBI/HDFC/NPCI downtime or low campus mobile signal) can create edge cases where money is debited from the customer's account, but confirmation takes minutes or hours to reach the payment gateway.

### Case A: Immediate Payment Failure / User Cancellation
* **What happens:** The user enters the wrong UPI PIN or cancels the request on Google Pay / PhonePe.
* **System Action:**
  1. Gateway reports `PAYMENT_FAILED`.
  2. Order status transitions to `PAYMENT_FAILED`.
  3. Student screen displays:
     > ❌ **Payment Incomplete**  
     > *"Your transaction was not completed. If any money was deducted by your bank, it will be automatically reversed to your bank account within 24–48 hours as per RBI/NPCI guidelines."*

---

### Case B: Delayed Payment Clearance (The "20-Minute Late Webhook" Edge Case)

* **The Problem Scenario:**
  1. At **1:00 PM**, student places an order for ₹105.
  2. Student's bank account is debited ₹105, but NPCI hangs and does not notify the gateway.
  3. At **1:05 PM**, the student gives up, assumes payment failed, and leaves the canteen or buys elsewhere.
  4. At **1:22 PM (22 minutes later)**, NPCI finishes resolving its backlog and sends a delayed `PAYMENT_SUCCESS` webhook to CampusBites.

* **The Conflict:** If we send this order to the kitchen at 1:22 PM, the vendor cooks food that the student is no longer there to collect, causing severe food wastage and angry refund requests.

* **The Solution — Automated 15–20 Minute Cutoff with Instant Auto-Refund:**
  When a delayed `PAYMENT_SUCCESS` webhook arrives, the backend evaluates the order age:
  $$\Delta t = \text{Current Webhook Time} - \text{Order Created Time}$$

```
                           Delayed Webhook Arrives
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
           Is Δt ≤ 15 Minutes?               Is Δt > 15 Minutes?
                    │                                 │
                    ▼                                 ▼
       [ Normal Order Processing ]      [ Automatic Stale Order Protocol ]
       • Status → CONFIRMED             • DO NOT notify kitchen / vendor
       • Send to Kitchen Screen         • Order Status → EXPIRED_AUTO_REFUNDED
       • Notify student: "Food Cooking" • Trigger Gateway Instant Refund API
                                        • Notify student: "Order expired due to
                                          bank delay; 100% refund initiated"
```

1. **If $\Delta t \le 15 \text{ Minutes}$:**
   * The order is accepted normally. Status transitions to `CONFIRMED`, and the kitchen receives the order ticket.
2. **If $\Delta t > 15 \text{ Minutes}$:**
   * **The order is NOT sent to the kitchen.**
   * The backend instantly calls the Gateway Refund API (`POST /refund`) for the full ₹105.
   * Order status is updated to `AUTO_REFUNDED_BANK_DELAY`.
   * The student receives an SMS/WhatsApp/Push notification:
     > ℹ️ **CampusBites Order Update**  
     > *"Your payment of ₹105 was delayed by the banking network (NPCI) and received after 20 minutes. To prevent food wastage, this order was not cooked. A 100% full refund of ₹105 has been automatically initiated back to your UPI account."*

---

## 7. Customer UI: Banking Delay Flag & Transparency Warning

When a payment is in the `PENDING` state during checkout, it is critical that the customer understands **the delay is caused by their bank / NPCI, and is NOT a bug in CampusBites**.

### User Interface Banner Specifications

If the payment status is pending for more than 30 seconds, the frontend displays an interactive warning modal:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ Awaiting Bank Confirmation                               │
│                                                              │
│  We have not yet received confirmation from your Bank/UPI.   │
│                                                              │
│  📌 Note: This delay is on your Bank / NPCI network side,    │
│     NOT CampusBites.                                         │
│                                                              │
│  • Please DO NOT pay again to avoid double deductions.       │
│  • If your money was debited, it will either confirm shortly │
│    or automatically refund back to your bank account.        │
│                                                              │
│  [ 🔄 Check Payment Status ]       [ ⏳ Waiting (04:12) ]    │
└──────────────────────────────────────────────────────────────┘
```

### UI Features:
1. **Prominent Bank Attribution:** Clearly attributes network latency to the student's bank or NPCI.
2. **Live "Check Status" Button:** Lets the student manually force a status poll against the gateway without refreshing or re-ordering.
3. **Double-Payment Prevention Warning:** Warns the student not to retry immediately while the first transaction is in bank transit.
4. **Auto-Cancellation Countdown:** Displays a 15-minute countdown after which the pending order expires and automatically transitions to refund.

---

## 8. Gateway Comparison: Easebuzz Slices vs. Cashfree Easy Split

| Feature | Easebuzz Slices | Cashfree Easy Split |
| :--- | :--- | :--- |
| **Current Readiness** | **Ready immediately** (Active account under PIKS) | Requires fresh merchant application |
| **TDR Fee Rate** | ~1.80% – 2.00% + GST | ~1.75% – 1.90% + GST |
| **Unregistered Sub-Merchants** | Fully supported (PAN + Bank details) | Fully supported (API & Dashboard) |
| **Settlement Timeline** | T+1 Banking Day | T+1 Banking Day |
| **Automated Instant Refunds** | Fully supported via Refund API | Fully supported via Refund API |
| **Webhooks & Signature Auth** | HMAC SHA-512 Verification | HMAC SHA-256 Verification |

---

## 9. Summary Checklist for Rollout

- [x] **Parent Entity:** PIKS registered under Udyam (Micro Business) — 100% compliant under ₹20L exemption.
- [x] **Gateway Selection:** Easebuzz Slices (ready) or Cashfree Easy Split.
- [x] **Vendor Onboarding:** Collect PAN, Aadhaar, and Bank Passbook (No GSTIN needed for street food vendors).
- [x] **Pricing Formula:** Apply `(Base Price × 1.02) + ₹3.00` to all menu items.
- [x] **Strict Kitchen Gatekeeping:** No ticket is printed/displayed until `PAYMENT_SUCCESS` is received.
- [x] **15–20 Minute Delayed Webhook Protection:** Auto-refund triggers if payment confirmation arrives past the 15-minute cutoff.
- [x] **Customer Transparency:** Clear UI flag explaining that UPI pending states originate from bank/NPCI networks.
