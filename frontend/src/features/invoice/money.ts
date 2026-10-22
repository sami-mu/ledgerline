/**
 * Invoice arithmetic in exact integer units (BigInt), mirroring backend/app/services/money.py.
 *
 *   line total = round(quantity x unit price)        to cents, half up
 *   subtotal   = sum of line totals
 *   tax        = round((subtotal - discount) x rate) to cents, half up
 *   total      = subtotal - discount + tax
 *
 * Inputs are the raw strings from the form. Anything unparseable counts as zero so the
 * live preview keeps working while the user is mid-edit; the form schema reports the error.
 */

export const QUANTITY_DECIMALS = 3;
export const MONEY_DECIMALS = 2;
export const TAX_RATE_DECIMALS = 3;

const DECIMAL_PATTERN = /^\d+(?:\.\d*)?$|^\.\d+$/;

/** "12.5" with 3 decimals -> 12500n. Returns null for anything that is not a plain decimal. */
export function parseScaled(value: string, decimals: number): bigint | null {
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return null;
  const [whole = "", fraction = ""] = text.split(".");
  if (fraction.length > decimals) return null;
  return BigInt((whole || "0") + fraction.padEnd(decimals, "0"));
}

/** Integer division rounded half up, for non negative numerator and positive denominator. */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

const QTY_SCALE = 10n ** BigInt(QUANTITY_DECIMALS);
const RATE_SCALE = 100n * 10n ** BigInt(TAX_RATE_DECIMALS); // percent -> fraction

export function lineTotalCents(quantity: string, unitPrice: string): bigint {
  const qty = parseScaled(quantity, QUANTITY_DECIMALS) ?? 0n;
  const price = parseScaled(unitPrice, MONEY_DECIMALS) ?? 0n;
  return divRoundHalfUp(qty * price, QTY_SCALE);
}

export type LineInput = { quantity: string; unit_price: string };

export type Totals = {
  subtotal: bigint;
  discount: bigint;
  tax: bigint;
  total: bigint;
};

export function subtotalCents(lines: readonly LineInput[]): bigint {
  return lines.reduce((sum, line) => sum + lineTotalCents(line.quantity, line.unit_price), 0n);
}

export function computeTotals(
  lines: readonly LineInput[],
  discount: string,
  taxRatePercent: string,
): Totals {
  const subtotal = subtotalCents(lines);
  const requested = parseScaled(discount, MONEY_DECIMALS) ?? 0n;
  // Saving is blocked when the discount exceeds the subtotal; the preview never goes negative.
  const applied = requested > subtotal ? subtotal : requested;
  const rate = parseScaled(taxRatePercent, TAX_RATE_DECIMALS) ?? 0n;
  const taxable = subtotal - applied;
  const tax = divRoundHalfUp(taxable * rate, RATE_SCALE);
  return { subtotal, discount: applied, tax, total: taxable + tax };
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  // Split so values beyond Number's exact range still format correctly.
  const dollars = abs / 100n;
  const rest = (abs % 100n).toString().padStart(2, "0");
  const whole = usd.format(Number(dollars)).replace(/\.00$/, "");
  return `${negative ? "-" : ""}${whole}.${rest}`;
}

/** Human formatting for quantities and rates: "6.5", "1", "8.875". */
export function formatDecimal(value: string): string {
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return text || "0";
  const [whole = "0", fraction = ""] = text.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const grouped = Number(whole || "0").toLocaleString("en-US");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

/** Keep only digits and a single decimal point while typing. Makes negatives impossible to type. */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  return firstDot === -1
    ? cleaned
    : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
