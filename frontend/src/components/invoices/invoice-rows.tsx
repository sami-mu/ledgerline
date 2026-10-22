import { Link } from "react-router";
import type { InvoiceSummary } from "@/api/invoices";
import { displayStatus } from "@/components/invoice/status";
import { StatusBadge } from "@/components/invoice/status-badge";
import { formatMoney } from "@/lib/money";
import { DueCell } from "./due-cell";

/** Phones and tablets: two-line rows instead of the table. */
export function InvoiceRows({ invoices, today }: { invoices: InvoiceSummary[]; today: string }) {
  return (
    <ul className="flex flex-col lg:hidden">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="border-b border-line">
          <Link
            to={`/invoices/${invoice.id}`}
            className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-3.5 text-[13px] focus-visible:outline-offset-0"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="num font-medium">{invoice.number}</span>
              <StatusBadge status={displayStatus(invoice.status, invoice.is_overdue)} />
            </span>
            <span className="text-right num font-medium">{formatMoney(invoice.total)}</span>
            <span className="truncate text-ink-2">{invoice.customer_name}</span>
            <span className="text-right text-xs">
              <DueCell invoice={invoice} today={today} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
