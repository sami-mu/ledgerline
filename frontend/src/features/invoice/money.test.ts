import { describe, expect, it } from "vitest";
import {
  computeTotals,
  formatCents,
  formatDecimal,
  lineTotalCents,
  parseScaled,
  sanitizeDecimalInput,
} from "./money";

describe("computeTotals", () => {
  it("matches the brief: 2 x $50 - $10 discount + 10% tax = $99.00", () => {
    const totals = computeTotals([{ quantity: "2", unit_price: "50" }], "10", "10");
    expect(totals).toEqual({ subtotal: 10000n, discount: 1000n, tax: 900n, total: 9900n });
    expect(formatCents(totals.total)).toBe("$99.00");
  });

  it("rounds each line half up before summing", () => {
    // 0.001 x 4.99 = 0.00499 -> 0.00 per line, so 3 lines sum to 0.00.
    // Rounding the raw sum (0.01497) instead would give 0.01.
    expect(lineTotalCents("0.001", "4.99")).toBe(0n);
    const lines = Array.from({ length: 3 }, () => ({ quantity: "0.001", unit_price: "4.99" }));
    expect(computeTotals(lines, "0", "0").subtotal).toBe(0n);
  });

  it("rounds half cents up", () => {
    expect(lineTotalCents("0.5", "0.01")).toBe(1n); // 0.005 -> 0.01
    expect(lineTotalCents("1.5", "0.03")).toBe(5n); // 0.045 -> 0.05
  });

  it("calculates tax after the discount, then rounds", () => {
    const totals = computeTotals([{ quantity: "1", unit_price: "19.99" }], "0", "8.875");
    expect(totals.tax).toBe(177n);
    expect(totals.total).toBe(2176n);
  });

  it("never lets the preview go negative when the discount exceeds the subtotal", () => {
    const totals = computeTotals([{ quantity: "1", unit_price: "10" }], "25", "10");
    expect(totals.total).toBe(0n);
  });

  it("treats unfinished input as zero", () => {
    const totals = computeTotals([{ quantity: "", unit_price: "abc" }], "", "");
    expect(totals.total).toBe(0n);
  });
});

describe("parsing and formatting", () => {
  it("parses plain decimals only", () => {
    expect(parseScaled("12.5", 2)).toBe(1250n);
    expect(parseScaled(".5", 2)).toBe(50n);
    expect(parseScaled("-1", 2)).toBeNull();
    expect(parseScaled("1e3", 2)).toBeNull();
    expect(parseScaled("1.234", 2)).toBeNull();
  });

  it("formats cents and decimals for display", () => {
    expect(formatCents(123456789n)).toBe("$1,234,567.89");
    expect(formatCents(5n)).toBe("$0.05");
    expect(formatDecimal("6.50")).toBe("6.5");
    expect(formatDecimal("1200")).toBe("1,200");
  });

  it("sanitizes typed input", () => {
    expect(sanitizeDecimalInput("-12.3.4")).toBe("12.34");
    expect(sanitizeDecimalInput("$1,000")).toBe("1000");
  });
});
