export const INITIAL_PRODUCT = {
  productName: "",
  metalType: "gold",
  qty: "1",
  weight: "",
  rate: "",
  makingCharge: "",
  diamondCharge: "",
  pieceId: "",
};

/** Returns a fresh product object with a stable unique key for React rendering. */
export function createProduct(overrides = {}) {
  return {
    ...INITIAL_PRODUCT,
    _uid: typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    ...overrides,
  };
}

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

  const metalValue = weight * rate;
  // GST is handled separately by GSTPanel — no per-item GST in product total
  const total = metalValue + makingCharge + diamondCharge;

  return {
    ...product,
    makingCharge,
    diamondCharge,
    metalValue,
    gstAmount: 0,
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
