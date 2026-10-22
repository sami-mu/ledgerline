/** Value is the number of days, or "custom". */
export const PAYMENT_TERMS = [
  { value: "0", label: "Due on receipt", short: "Due on receipt" },
  { value: "7", label: "Net 7", short: "Net 7" },
  { value: "14", label: "Net 14", short: "Net 14" },
  { value: "15", label: "Net 15", short: "Net 15" },
  { value: "30", label: "Net 30", short: "Net 30" },
  { value: "45", label: "Net 45", short: "Net 45" },
  { value: "60", label: "Net 60", short: "Net 60" },
  { value: "custom", label: "Custom due date", short: "" },
] as const;

export type PaymentTerms = (typeof PAYMENT_TERMS)[number]["value"];

export const DEFAULT_TERMS: PaymentTerms = "14";

export function termsFromDays(days: number | null | undefined): PaymentTerms {
  const match = PAYMENT_TERMS.find((t) => t.value === String(days));
  return days === null || days === undefined || !match ? "custom" : match.value;
}

export function daysFromTerms(terms: string): number | null {
  return terms === "custom" ? null : Number(terms);
}

export function termsLabel(terms: string): string {
  return PAYMENT_TERMS.find((t) => t.value === terms)?.short ?? "";
}
