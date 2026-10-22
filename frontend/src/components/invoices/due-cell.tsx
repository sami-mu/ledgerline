import type { InvoiceSummary } from "@/api/invoices";
import { daysBetween, formatIsoDate } from "@/lib/dates";

export function DueCell({ invoice, today }: { invoice: InvoiceSummary; today: string }) {
  if (invoice.status === "paid") {
    return (
      <span className="num text-ink-3">
        Paid {invoice.paid_on ? formatIsoDate(invoice.paid_on) : ""}
      </span>
    );
  }
  if (invoice.is_overdue) {
    const days = daysBetween(invoice.due_date, today);
    return (
      <span className="num whitespace-nowrap text-danger">
        {formatIsoDate(invoice.due_date)} · {days}d late
      </span>
    );
  }
  return <span className="num text-ink-2">{formatIsoDate(invoice.due_date)}</span>;
}
