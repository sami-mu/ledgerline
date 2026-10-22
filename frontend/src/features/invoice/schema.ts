import { z } from "zod";
import {
  MONEY_DECIMALS,
  QUANTITY_DECIMALS,
  TAX_RATE_DECIMALS,
  formatCents,
  parseScaled,
  subtotalCents,
} from "./money";

/*
 * Form schema. Field names and limits match the API (backend/app/schemas/invoice.py), so
 * server field errors map straight onto form paths. Numbers stay strings, exactly as typed.
 */

function decimalField(opts: { decimals: number; max: number; unit?: string }) {
  return z.string().superRefine((raw, ctx) => {
    const value = raw.trim();
    if (value === "") return ctx.addIssue({ code: "custom", message: "Required" });
    if (value.startsWith("-"))
      return ctx.addIssue({ code: "custom", message: "Can't be negative" });
    if (!/^\d*\.?\d*$/.test(value) || value === ".")
      return ctx.addIssue({ code: "custom", message: "Enter a number" });
    const fraction = value.split(".")[1] ?? "";
    if (fraction.length > opts.decimals)
      return ctx.addIssue({
        code: "custom",
        message: `Use up to ${opts.decimals} decimal places`,
      });
    if (Number(value) > opts.max)
      ctx.addIssue({
        code: "custom",
        message: `Must be ${opts.max.toLocaleString("en-US")}${opts.unit ?? ""} or less`,
      });
  });
}

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address");

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Keep it under ${max} characters`);

const isoDate = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Pick a ${label.toLowerCase()}`);

export const lineItemSchema = z.object({
  description: required("Description", 200),
  quantity: decimalField({ decimals: QUANTITY_DECIMALS, max: 1_000_000 }),
  unit_price: decimalField({ decimals: MONEY_DECIMALS, max: 100_000_000 }),
});

export const customFieldSchema = z.object({
  label: required("Label", 60),
  value: z.string().trim().max(200, "Keep it under 200 characters"),
  visible: z.boolean(),
});

export const invoiceFormSchema = z
  .object({
    number: required("Invoice number", 32),
    business_name: required("Business name", 120),
    business_email: optionalEmail,
    business_address: z.string().max(500),
    customer_name: required("Customer name", 120),
    customer_email: optionalEmail,
    customer_address: z.string().max(500),
    issue_date: isoDate("Issue date"),
    due_date: isoDate("Due date"),
    notes: z.string().max(2000, "Keep notes under 2,000 characters"),
    discount: decimalField({ decimals: MONEY_DECIMALS, max: 100_000_000 }),
    tax_rate: decimalField({ decimals: TAX_RATE_DECIMALS, max: 100, unit: "%" }),
    line_items: z.array(lineItemSchema).max(100, "An invoice can have up to 100 lines"),
    custom_fields: z.array(customFieldSchema).max(30, "Up to 30 custom fields"),
  })
  .superRefine((invoice, ctx) => {
    if (invoice.issue_date && invoice.due_date && invoice.due_date < invoice.issue_date) {
      ctx.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Due date can't be before the issue date",
      });
    }
    const discount = parseScaled(invoice.discount, MONEY_DECIMALS);
    const subtotal = subtotalCents(invoice.line_items);
    if (discount !== null && discount > subtotal) {
      ctx.addIssue({
        code: "custom",
        path: ["discount"],
        message: `Discount can't exceed the ${formatCents(subtotal)} subtotal`,
      });
    }
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type LineItemValues = z.infer<typeof lineItemSchema>;
export type CustomFieldValues = z.infer<typeof customFieldSchema>;
