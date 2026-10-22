import type { InvoiceStatus } from "@/api/invoices";

/** What the user sees: "overdue" is derived (sent and past due), not stored. */
export type DisplayStatus = InvoiceStatus | "overdue";

export function displayStatus(status: InvoiceStatus, isOverdue: boolean): DisplayStatus {
  return isOverdue ? "overdue" : status;
}
