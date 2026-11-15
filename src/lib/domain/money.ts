// ============================================================
// Money utilities — all arithmetic in integer paise
// ============================================================

/**
 * Convert rupees (float) to paise (integer).
 * Rounds to nearest integer to avoid floating-point drift.
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise (integer) to rupees (float).
 */
export function toRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format paise as Indian Rupees with Indian digit grouping.
 * e.g. 4847800 paise → "₹48,478"
 * Whole rupees only (paise truncated for display).
 */
export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  const isNegative = rupees < 0;
  const abs = Math.abs(rupees);
  const formatted = indianGrouping(abs);
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Indian digit grouping: last 3 digits, then groups of 2.
 * e.g. 1234567 → "12,34,567"
 */
function indianGrouping(n: number): string {
  const s = n.toString();
  if (s.length <= 3) return s;

  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  // Group the rest in pairs from right
  const pairs: string[] = [];
  for (let i = rest.length; i > 0; i -= 2) {
    pairs.unshift(rest.slice(Math.max(0, i - 2), i));
  }
  return pairs.join(',') + ',' + last3;
}

/**
 * Compact format for stats: ₹48.5K, ₹1.2L, ₹2.5Cr
 */
export function formatCompact(paise: number): string {
  const rupees = Math.abs(Math.round(paise / 100));
  const sign = paise < 0 ? '-' : '';

  if (rupees >= 1_00_00_000) {
    // Crores
    const cr = rupees / 1_00_00_000;
    return `${sign}₹${cr >= 10 ? Math.round(cr).toString() : cr.toFixed(1).replace(/\.0$/, '')}Cr`;
  }
  if (rupees >= 1_00_000) {
    // Lakhs
    const l = rupees / 1_00_000;
    return `${sign}₹${l >= 10 ? Math.round(l).toString() : l.toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (rupees >= 1_000) {
    // Thousands — always show 1 decimal if not a whole number
    const k = rupees / 1_000;
    const kFixed = parseFloat(k.toFixed(1));
    return `${sign}₹${kFixed % 1 === 0 ? Math.round(kFixed).toString() : kFixed.toString()}K`;
  }
  return `${sign}₹${rupees}`;
}

/**
 * Calculate item amount in paise.
 * itemAmount = crates × weightPerCrate × ratePerKg
 * All inputs: crates (count), weightPerCrate (kg as float), ratePerKg (paise int).
 */
export function calcItemAmount(
  crates: number,
  weightPerCrate: number,
  ratePerKgPaise: number
): number {
  // crates × weightPerCrate × (ratePerKgPaise / 100) gives rupees
  // We need paise, so: crates × weightPerCrate × ratePerKgPaise
  // But weight is float, so round the final result
  return Math.round(crates * weightPerCrate * ratePerKgPaise);
}

/**
 * Calculate total sale amount in paise.
 */
export function calcTotalAmount(
  itemAmountPaise: number,
  deliveryChargePaise: number
): number {
  return itemAmountPaise + deliveryChargePaise;
}

/**
 * Get pending balance color class.
 * Green = zero or credit, Amber ≤ ₹5,000, Red > ₹5,000.
 */
export function getPendingColorClass(paise: number): string {
  if (paise <= 0) return 'text-green-600';
  if (paise <= 500000) return 'text-amber-600'; // ≤ ₹5,000
  return 'text-red-600';
}

/**
 * Format balance for display.
 * Positive → amount owed; Zero → "All Clear!"; Negative → "Credit ₹X"
 */
export function formatBalance(paise: number): { text: string; label: string } {
  if (paise === 0) {
    return { text: '₹0', label: 'All Clear!' };
  }
  if (paise < 0) {
    return {
      text: formatINR(Math.abs(paise)),
      label: 'Customer Credit',
    };
  }
  return { text: formatINR(paise), label: 'Pending' };
}
