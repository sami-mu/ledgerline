import type { InvoiceIn, InvoiceOut } from "@/lib/api/client";
import type { InvoiceFormValues, LineItemValues } from "./schema";

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

/** A blank invoice. Business details carry over from the last invoice, since they rarely change. */
export function newInvoiceValues(number: string, previous?: InvoiceOut): InvoiceFormValues {
  const today = isoDate(new Date());
  return {
    number,
    business_name: previous?.business_name ?? "",
    business_email: previous?.business_email ?? "",
    business_address: previous?.business_address ?? "",
    customer_name: "",
    customer_email: "",
    customer_address: "",
    issue_date: today,
    due_date: addDays(today, 14),
    notes: previous?.notes ?? "",
    discount: "0",
    tax_rate: previous?.tax_rate ?? "0",
    line_items: [emptyLineItem()],
    custom_fields: [],
  };
}

/** A copy of an invoice with a new number and fresh dates. Status always starts as draft. */
export function duplicateValues(source: InvoiceOut, number: string): InvoiceFormValues {
  const today = isoDate(new Date());
  return { ...toFormValues(source), number, issue_date: today, due_date: addDays(today, 14) };
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
  return {
    ...values,
    business_address: values.business_address.trim(),
    customer_address: values.customer_address.trim(),
    notes: values.notes.trim(),
  };
}
