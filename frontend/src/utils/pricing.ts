/**
 * Tiered Flat-Fee Markup Calculator
 * Based on docs/TIERED_PRICING_AND_PG_COMMISSION_MODEL.md:
 * - Tier 1: ₹1 – ₹49    => +₹4
 * - Tier 2: ₹50 – ₹99   => +₹5
 * - Tier 3: ₹100 – ₹199 => +₹10
 * - Tier 4: ₹200+       => +₹13
 */
export function calculateHike(basePrice: number): number {
  if (basePrice < 50) {
    return 4;
  } else if (basePrice < 100) {
    return 5;
  } else if (basePrice < 200) {
    return 10;
  } else {
    return 13;
  }
}

export function calculateTieredPrice(basePrice: number) {
  const hike = calculateHike(basePrice);
  const finalPrice = basePrice + hike;
  const pgCut = Math.round(finalPrice * 0.025 * 100) / 100;
  const netProfit = Math.round((hike - pgCut) * 100) / 100;
  return {
    basePrice,
    hike,
    finalPrice,
    pgCut,
    vendorPayout: basePrice,
    netProfit,
  };
}