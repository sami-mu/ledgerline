import { useWatch } from "react-hook-form";
import { computeTotals, type Totals } from "./money";
import type { InvoiceFormValues } from "./schema";

/** Live totals for the current form values. */
export function useTotals(): Totals {
  const [lines = [], discount = "", taxRate = ""] = useWatch<InvoiceFormValues>({
    name: ["line_items", "discount", "tax_rate"],
  }) as [InvoiceFormValues["line_items"]?, string?, string?];
  return computeTotals(lines, discount, taxRate);
}
