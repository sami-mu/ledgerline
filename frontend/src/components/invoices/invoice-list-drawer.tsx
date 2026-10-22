import { ArrowRight, FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { DialogClose, DrawerContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type InvoiceSummary } from "@/api/invoices";
import { useInvoiceList } from "@/hooks/api/use-invoices";
import { cn } from "@/lib/utils";
import { formatIsoDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { displayStatus } from "@/components/invoice/status";
import { StatusBadge } from "@/components/invoice/status-badge";

export function InvoiceListDrawer({ activeId }: { activeId?: number }) {
  // Children mount only while open, so nothing is fetched until then.
  return (
    <DrawerContent title="Invoices" description="All saved invoices, most recent first.">
      <DrawerBody activeId={activeId} />
    </DrawerContent>
  );
}

function DrawerBody({ activeId }: { activeId?: number }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const params = { q, sort: "updated_at", direction: "desc", page_size: 25 } as const;
  const invoices = useInvoiceList(params);
  const filtered = invoices.data?.items ?? [];
  const more = (invoices.data?.total ?? 0) - filtered.length;

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line p-3">
        <DialogClose asChild>
          <Button variant="primary" className="w-full" onClick={() => navigate("/invoices/new")}>
            <Plus /> New invoice
          </Button>
        </DialogClose>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search number or customer"
            aria-label="Search invoices"
            className="pl-8"
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 scroll-pane overflow-y-auto">
        {invoices.isPending ? (
          <ul aria-label="Loading invoices" className="flex flex-col">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex flex-col gap-2 border-b border-line px-4 py-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-40" />
              </li>
            ))}
          </ul>
        ) : invoices.isError ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="text-[13px] font-medium">Couldn't load invoices</p>
            <p className="text-xs text-ink-3">{invoices.error.message}</p>
            <Button size="sm" className="mt-1" onClick={() => invoices.refetch()}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <FileText className="size-5 text-ink-4" aria-hidden />
            <p className="text-[13px] font-medium">
              {query ? "No matching invoices" : "No saved invoices yet"}
            </p>
            <p className="text-xs text-ink-3">
              {query ? "Try a different number or customer." : "Saved invoices show up here."}
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col">
              {filtered.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} active={invoice.id === activeId} />
              ))}
            </ul>
            {more > 0 && (
              <DialogClose asChild>
                <Link
                  to={q ? `/invoices?q=${encodeURIComponent(q)}` : "/invoices"}
                  className="flex items-center justify-between px-4 py-3 text-[13px] text-accent hover:bg-subtle"
                >
                  {more} more {more === 1 ? "invoice" : "invoices"}
                  <span className="flex items-center gap-1 font-medium">
                    View all <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </DialogClose>
            )}
          </>
        )}
      </div>
    </>
  );
}

function InvoiceRow({ invoice, active }: { invoice: InvoiceSummary; active: boolean }) {
  return (
    <li>
      <DialogClose asChild>
        <Link
          to={`/invoices/${invoice.id}`}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-line px-4 py-3",
            "transition-colors hover:bg-subtle focus-visible:-outline-offset-2",
            active &&
              "bg-subtle before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent",
          )}
        >
          <span className="flex items-center gap-2">
            <span className="num text-[13px] font-medium">{invoice.number}</span>
            <StatusBadge status={displayStatus(invoice.status, invoice.is_overdue)} />
          </span>
          <span className="text-right num text-[13px]">{formatMoney(invoice.total)}</span>
          <span className="truncate text-xs text-ink-3">{invoice.customer_name}</span>
          <span className="text-right text-xs text-ink-3">
            Due {formatIsoDate(invoice.due_date)}
          </span>
        </Link>
      </DialogClose>
    </li>
  );
}
