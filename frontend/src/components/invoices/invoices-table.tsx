import { ArrowDown, ArrowUp } from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { InvoiceSummary } from "@/api/invoices";
import { displayStatus } from "@/components/invoice/status";
import { StatusBadge } from "@/components/invoice/status-badge";
import { formatIsoDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DueCell } from "./due-cell";
import type { ListState, SortKey } from "./list-params";

const COLUMNS: { key: SortKey; label: string; align?: "right"; className?: string }[] = [
  { key: "number", label: "Invoice", className: "w-[120px]" },
  { key: "customer", label: "Customer" },
  { key: "issue_date", label: "Issued", className: "w-[130px]" },
  { key: "due_date", label: "Due", className: "w-[190px]" },
  { key: "status", label: "Status", className: "w-[110px]" },
  { key: "total", label: "Amount", align: "right", className: "w-[130px]" },
];

type Props = {
  invoices: InvoiceSummary[];
  state: ListState;
  onSort: (key: SortKey) => void;
  today: string;
};

/** Desktop table with sortable headers. */
export function InvoicesTable({ invoices, state, onSort, today }: Props) {
  const navigate = useNavigate();
  return (
    <table className="hidden w-full border-collapse text-[13px] lg:table">
      <thead>
        <tr className="border-b border-line">
          {COLUMNS.map((column) => {
            const active = state.sort === column.key;
            const Icon = state.direction === "asc" ? ArrowUp : ArrowDown;
            return (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  active ? (state.direction === "asc" ? "ascending" : "descending") : "none"
                }
                className={cn(
                  "py-2.5 font-normal",
                  column.align === "right" ? "text-right" : "text-left",
                  column.className,
                )}
              >
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className={cn(
                    "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 text-xs font-medium transition-colors hover:text-ink",
                    active ? "text-ink" : "text-ink-3",
                    column.align === "right" && "flex-row-reverse",
                  )}
                >
                  {column.label}
                  {active && <Icon aria-hidden className="size-3" />}
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr
            key={invoice.id}
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="cursor-pointer border-b border-line transition-colors hover:bg-subtle"
          >
            <td className="py-3 pr-4">
              <Link
                to={`/invoices/${invoice.id}`}
                onClick={(event) => event.stopPropagation()}
                className="rounded-xs num font-medium text-ink"
              >
                {invoice.number}
              </Link>
            </td>
            <td className="max-w-0 truncate py-3 pr-4 text-ink">{invoice.customer_name}</td>
            <td className="py-3 pr-4 num text-ink-2">{formatIsoDate(invoice.issue_date)}</td>
            <td className="py-3 pr-4">
              <DueCell invoice={invoice} today={today} />
            </td>
            <td className="py-3 pr-4">
              <StatusBadge status={displayStatus(invoice.status, invoice.is_overdue)} />
            </td>
            <td className="py-3 text-right num font-medium text-ink">
              {formatMoney(invoice.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
