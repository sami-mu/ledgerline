import type { InvoiceIn, InvoiceOut } from "@/api/invoices";
import type { InvoiceFormValues, LineItemValues } from "@/form-schemas/invoice";
import { DEFAULT_TERMS, daysFromTerms, termsFromDays } from "@/lib/terms";

export const emptyLineItem = (): LineItemValues => ({
  description: "",
  quantity: "1",
  unit_price: "",
});

/** Local date as YYYY-MM-DD (toISOString would shift the day in western time zones). */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y!, m! - 1, d! + days));
}

/** Business details and terms carry over from the last invoice. */
export function newInvoiceValues(number: string, previous?: InvoiceOut): InvoiceFormValues {
  const today = isoDate(new Date());
  const terms = previous ? termsFromDays(previous.payment_terms_days) : DEFAULT_TERMS;
  const days = daysFromTerms(terms) ?? Number(DEFAULT_TERMS);
  return {
    number,
    business_name: previous?.business_name ?? "",
    business_email: previous?.business_email ?? "",
    business_address: previous?.business_address ?? "",
    customer_name: "",
    customer_email: "",
    customer_address: "",
    issue_date: today,
    due_date: addDays(today, days),
    payment_terms: terms === "custom" ? DEFAULT_TERMS : terms,
    notes: previous?.notes ?? "",
    discount: "0",
    tax_rate: previous?.tax_rate ?? "0",
    line_items: [emptyLineItem()],
    custom_fields: [],
  };
}

/** A copy with a new number and today's dates. */
export function duplicateValues(source: InvoiceOut, number: string): InvoiceFormValues {
  const today = isoDate(new Date());
  const values = toFormValues(source);
  const days = daysFromTerms(values.payment_terms) ?? Number(DEFAULT_TERMS);
  return {
    ...values,
    number,
    issue_date: today,
    due_date: addDays(today, days),
    payment_terms: values.payment_terms === "custom" ? DEFAULT_TERMS : values.payment_terms,
  };
}

export function toFormValues(invoice: InvoiceOut): InvoiceFormValues {
  return {
    number: invoice.number,
    business_name: invoice.business_name,
    business_email: invoice.business_email,
    business_address: invoice.business_address,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    customer_address: invoice.customer_address,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    payment_terms: termsFromDays(invoice.payment_terms_days),
    notes: invoice.notes,
    discount: invoice.discount,
    tax_rate: invoice.tax_rate,
    line_items: invoice.line_items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    custom_fields: invoice.custom_fields.map((field) => ({
      label: field.label,
      value: field.value,
      visible: field.visible,
    })),
  };
}

export function toPayload(values: InvoiceFormValues): InvoiceIn {
  const { payment_terms, ...rest } = values;
  return {
    ...rest,
    payment_terms_days: daysFromTerms(payment_terms),
    business_address: values.business_address.trim(),
    customer_address: values.customer_address.trim(),
    notes: values.notes.trim(),
  };
}
