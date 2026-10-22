import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { DialogClose, DrawerContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type InvoiceSummary } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { cn } from "@/lib/utils";
import { formatIsoDate } from "./dates";
import { formatCents, parseScaled } from "./money";
import { StatusBadge } from "./status-badge";

/** Drawer content listing every saved invoice. Render inside a <Dialog>. */
export function InvoiceListDrawer({ activeId }: { activeId?: number }) {
  const navigate = useNavigate();
  const invoices = useQuery({ queryKey: queryKeys.invoices, queryFn: api.listInvoices });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!invoices.data || !q) return invoices.data ?? [];
    return invoices.data.filter(
      (i) => i.number.toLowerCase().includes(q) || i.customer_name.toLowerCase().includes(q),
    );
  }, [invoices.data, query]);

  return (
    <DrawerContent title="Invoices" description="All saved invoices, most recent first.">
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
          <ul className="flex flex-col">
            {filtered.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} active={invoice.id === activeId} />
            ))}
          </ul>
        )}
      </div>
    </DrawerContent>
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
            <StatusBadge status={invoice.status} />
          </span>
          <span className="text-right num text-[13px]">
            {formatCents(parseScaled(invoice.total, 2) ?? 0n)}
          </span>
          <span className="truncate text-xs text-ink-3">{invoice.customer_name}</span>
          <span className="text-right text-xs text-ink-3">
            Due {formatIsoDate(invoice.due_date)}
          </span>
        </Link>
      </DialogClose>
    </li>
  );
}
