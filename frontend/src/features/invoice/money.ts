/**
 * Invoice math in integer cents (BigInt), mirroring backend/app/services/money.py.
 * Unparseable input counts as zero so the preview keeps working mid-edit.
 */

export const QUANTITY_DECIMALS = 3;
export const MONEY_DECIMALS = 2;
export const TAX_RATE_DECIMALS = 3;

const DECIMAL_PATTERN = /^\d+(?:\.\d*)?$|^\.\d+$/;

/** "12.5" with 3 decimals -> 12500n; null if not a plain decimal. */
export function parseScaled(value: string, decimals: number): bigint | null {
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return null;
  const [whole = "", fraction = ""] = text.split(".");
  if (fraction.length > decimals) return null;
  return BigInt((whole || "0") + fraction.padEnd(decimals, "0"));
}

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
  // The form blocks saving; the preview just never goes negative.
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
  const dollars = abs / 100n;
  const rest = (abs % 100n).toString().padStart(2, "0");
  const whole = usd.format(Number(dollars)).replace(/\.00$/, "");
  return `${negative ? "-" : ""}${whole}.${rest}`;
}

export function formatMoney(value: string): string {
  return formatCents(parseScaled(value, MONEY_DECIMALS) ?? 0n);
}

export function formatDecimal(value: string): string {
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return text || "0";
  const [whole = "0", fraction = ""] = text.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const grouped = Number(whole || "0").toLocaleString("en-US");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

/** Digits and one dot only, so negatives can't be typed. */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  return firstDot === -1
    ? cleaned
    : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
