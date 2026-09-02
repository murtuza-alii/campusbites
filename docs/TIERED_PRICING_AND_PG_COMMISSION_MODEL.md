# CampusBites — Tiered Flat-Fee Pricing & Payment Gateway Commission Model

This document outlines the business rationale, mathematical formulation, and implementation blueprint for CampusBites' **Tiered Flat-Fee Markup Model**. It details how the platform absorbs the ~2.5% Payment Gateway (PG) fee (Razorpay / Cashfree) while guaranteeing 100% vendor payouts and securing predictable platform net profit.

---

## 1. Executive Summary & Strategy

Traditional food delivery platforms apply percentage-based service charges (e.g., 2.5% to 5%) directly to customers or deduct 15–25% commissions from merchants. In a high-frequency college campus and street food environment:
1. **Percentage surcharges create messy friction**: A 2.5% fee on a ₹60 Frankie produces ₹61.50, and on a ₹220 Dosa produces ₹225.50. Students dislike non-rounded change.
2. **Vendors resist percentage cuts**: Street stall owners and campus canteen contractors operate on thin food margins and reject commission deductions from their base rates.

### The CampusBites Solution: Tiered Flat-Fee Model
- **Clean Rounded Customer Prices**: Increments are rounded to **+₹5, +₹10, +₹15, or +₹20**, ensuring every menu price ends in clean multiples of 5 or 0.
- **100% Vendor Payout Protection**: Vendors receive 100% of their actual menu rates, eliminating vendor onboarding friction.
- **PG Cut Absorption**: The ~2.5% PG transaction cut is deducted strictly from the platform's flat fee markup.
- **Guaranteed Positive Take Rate**: Every dish sold generates a net profit margin between **₹3.10 and ₹13.75** for CampusBites.

---

## 2. Mathematical Formulation

For any menu item with baseline price $P_{\text{base}}$:

$$P_{\text{final}} = P_{\text{base}} + \Delta P_{\text{tier}}$$

Where $\Delta P_{\text{tier}}$ is the flat fee determined by the price tier.

$$\text{PG Fee Cut} = P_{\text{final}} \times 0.025$$

$$\text{Vendor Payout} = P_{\text{base}}$$

$$\mathbf{\text{CampusBites Net Profit}} = \Delta P_{\text{tier}} - \text{PG Fee Cut}$$

---

## 3. Tiered Price Structure Matrix

| Tier | Base Price Bracket ($P_{\text{base}}$) | Flat Markup ($\Delta P_{\text{tier}}$) | Customer Price ($P_{\text{final}}$) | 2.5% PG Cut Range | Vendor Payout ($P_{\text{base}}$) | CampusBites Net Take |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tier 1 (Budget Bites)** | ₹30 – ₹70 | **+₹5** | ₹35 – ₹75 | ₹0.88 – ₹1.88 | 100% (₹30–₹70) | **₹3.12 – ₹4.12** |
| **Tier 2 (Popular & Drinks)** | ₹80 – ₹130 | **+₹10** | ₹90 – ₹140 | ₹2.25 – ₹3.50 | 100% (₹80–₹130) | **₹6.50 – ₹7.75** |
| **Tier 3 (Gourmet & Grills)** | ₹140 – ₹220 | **+₹15** | ₹155 – ₹235 | ₹3.88 – ₹5.88 | 100% (₹140–₹220) | **₹9.12 – ₹11.12** |
| **Tier 4 (Ultra-Premium)** | ₹230 – ₹340 | **+₹20** | ₹250 – ₹360 | ₹6.25 – ₹9.00 | 100% (₹230–₹340) | **₹11.00 – ₹13.75** |

---

## 4. Real-World Menu Mapping (Anand Stall Catalog)

### 4.1 Tier 1: Budget Street Bites (+₹5 Markup)
*Quick-grab Mumbai comfort food and handheld snacks.*

| Dish Name | Base Price | Customer Price | 2.5% PG Cut | Vendor Gets | Net Platform Profit |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Butter Vada Pav / Samosa Pav | ₹30 | **₹35** | ₹0.88 | ₹30.00 | **+₹4.12** |
| Grill Vada Pav / Schezwan Pav | ₹50 | **₹55** | ₹1.38 | ₹50.00 | **+₹3.62** |
| Veg Frankie / Cheese Vada Pav | ₹60 | **₹65** | ₹1.63 | ₹60.00 | **+₹3.37** |
| Sada Sandwich / Bread Butter Toast | ₹60 | **₹65** | ₹1.63 | ₹60.00 | **+₹3.37** |
| Butter Sada Dosa / Cheese Grill Pav | ₹70 | **₹75** | ₹1.88 | ₹70.00 | **+₹3.12** |

### 4.2 Tier 2: Fast Food & Daily Refreshers (+₹10 Markup)
*Everyday student favorites, cold coffees, fresh juices, and classic dosas.*

| Dish Name | Base Price | Customer Price | 2.5% PG Cut | Vendor Gets | Net Platform Profit |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Fresh Lemon Soda / Jam Toast | ₹80 | **₹90** | ₹2.25 | ₹80.00 | **+₹7.75** |
| Masala Dosa / Onion Sada Dosa | ₹90 | **₹100** | ₹2.50 | ₹90.00 | **+₹7.50** |
| Classic Cold Coffee / Mojitos | ₹100 | **₹110** | ₹2.75 | ₹100.00 | **+₹7.25** |
| Fresh Apple / Orange / Grapes Juice | ₹110 | **₹120** | ₹3.00 | ₹110.00 | **+₹7.00** |
| Chinese Manchurian Frankie / Paneer Bhurji | ₹120 | **₹130** | ₹3.25 | ₹120.00 | **+₹6.75** |
| Cheese Sada Dosa / Oreo Cold Coffee | ₹130 | **₹140** | ₹3.50 | ₹130.00 | **+₹6.50** |

### 4.3 Tier 3: Mid-Gourmet & Toasties (+₹15 Markup)
*Specialty frankies, big grill sandwiches, pizza dosas, and thick milkshakes.*

| Dish Name | Base Price | Customer Price | 2.5% PG Cut | Vendor Gets | Net Platform Profit |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Cheese Paneer Bhurji / Schezwan Frankie | ₹140 | **₹155** | ₹3.88 | ₹140.00 | **+₹11.12** |
| Anand Special Frankie / Tandoori Paneer | ₹150 | **₹165** | ₹4.13 | ₹150.00 | **+₹10.87** |
| Mysore Masala Dosa / Chinese Chopsey Dosa | ₹160 | **₹175** | ₹4.38 | ₹160.00 | **+₹10.62** |
| Mayonnaise Mini Grill / Open Cheese Chilli | ₹180 | **₹195** | ₹4.88 | ₹180.00 | **+₹10.12** |
| Veg Cheese Grill / Mysore Uttappa | ₹200 | **₹215** | ₹5.38 | ₹200.00 | **+₹9.62** |
| Sp. Jinny Dosa / Maggi Cheese Dosa | ₹220 | **₹235** | ₹5.88 | ₹220.00 | **+₹9.12** |

### 4.4 Tier 4: Ultra-Premium & Signature Dishes (+₹20 Markup)
*Triple-layer loaded toasties, exotic dry fruit blossom shakes, and signature Matka Dosa.*

| Dish Name | Base Price | Customer Price | 2.5% PG Cut | Vendor Gets | Net Platform Profit |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Pizza Uttappa / Club Grill Sandwich | ₹230 | **₹250** | ₹6.25 | ₹230.00 | **+₹13.75** |
| Night Queen Special / Chocolate D.S.P Special | ₹240 | **₹260** | ₹6.50 | ₹240.00 | **+₹13.50** |
| Melting Cheese Sandwich / Anand Cheese Burst | ₹260 | **₹280** | ₹7.00 | ₹260.00 | **+₹13.00** |
| Dry Fruit Blossom / Pista Anjeer Milkshake | ₹270 | **₹290** | ₹7.25 | ₹270.00 | **+₹12.75** |
| Kaju Badam Pista Blossom | ₹300 | **₹320** | ₹8.00 | ₹300.00 | **+₹12.00** |
| Anand Sp. Matka Dosa *(Flagship Dish)* | ₹340 | **₹360** | ₹9.00 | ₹340.00 | **+₹11.00** |

---

## 5. Technical Implementation & Automation

### 5.1 Pricing Calculator Function (TypeScript)
```typescript
/**
 * Calculates the customer selling price based on the Tiered Flat-Fee Model.
 * @param basePrice Vendor baseline menu price
 * @returns Final customer price, PG fee cut, and net platform profit
 */
export function calculateTieredPricing(basePrice: number) {
  let flatFee = 5;

  if (basePrice <= 70) {
    flatFee = 5;
  } else if (basePrice <= 130) {
    flatFee = 10;
  } else if (basePrice <= 220) {
    flatFee = 15;
  } else {
    flatFee = 20;
  }

  const finalPrice = basePrice + flatFee;
  const pgCut = Math.round((finalPrice * 0.025) * 100) / 100;
  const netPlatformProfit = Math.round((flatFee - pgCut) * 100) / 100;

  return {
    basePrice,
    flatFee,
    finalPrice,
    pgCut,
    vendorPayout: basePrice,
    netPlatformProfit,
  };
}
```

### 5.2 Settlement & Easy Split Integration
When processing payments through Cashfree Easy Split or Razorpay Route:
- **Vendor Transfer Amount**: $\sum (\text{Base Price} \times \text{Quantity})$
- **Platform Transfer Amount**: $\sum (\text{Flat Fee} \times \text{Quantity})$
- **PG Deduction Source**: Deducted from the platform account balance, leaving vendor bank accounts unaffected.
