export const INITIAL_PRODUCT = {
  productName: "",
  metalType: "gold",
  weight: "",
  rate: "",
  makingCharge: "",
  diamondCharge: "",
  gstPercent: "3",
};

export function parseNumber(value) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Compute metalValue, gstAmount, total for a single product.
 * @param {typeof INITIAL_PRODUCT} product
 * @returns {{ metalValue: number, gstAmount: number, total: number, ... }}
 */
export function calculateProductTotals(product) {
  const weight = parseNumber(product.weight);
  const rate = parseNumber(product.rate);
  const makingCharge = parseNumber(product.makingCharge);
  const diamondCharge = parseNumber(product.diamondCharge);
  const gstPercent = parseNumber(product.gstPercent);

  const metalValue = weight * rate;
  const taxableAmount = metalValue + makingCharge;
  const gstAmount = (taxableAmount * gstPercent) / 100;
  const total = metalValue + makingCharge + diamondCharge + gstAmount;

  return {
    ...product,
    makingCharge,
    diamondCharge,
    metalValue,
    gstAmount,
    total,
  };
}

/**
 * Compute totals for an array of products.
 * @param {Array<typeof INITIAL_PRODUCT>} products
 * @returns {Array<ReturnType<calculateProductTotals>>}
 */
export function calculateAllProductTotals(products) {
  return (products || []).map(calculateProductTotals);
}

/**
 * Sum grand total from calculated products.
 * @param {Array<{ total: number }>} calculatedProducts
 * @returns {number}
 */
export function grandTotalFromProducts(calculatedProducts) {
  return (calculatedProducts || []).reduce((sum, p) => sum + (p.total ?? 0), 0);
}

export function getWeightUnit(metalType) {
  if (metalType === "silver") return "kg";
  if (metalType === "diamond") return "pieces";
  return "g";
}
