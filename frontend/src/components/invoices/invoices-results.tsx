import type { UseQueryResult } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import type { InvoicePage } from "@/api/invoices";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { InvoiceRows } from "./invoice-rows";
import { InvoicesPagination } from "./invoices-pagination";
import { InvoicesTable } from "./invoices-table";
import { nextSort, type ListState } from "./list-params";

type Props = {
  list: UseQueryResult<InvoicePage>;
  state: ListState;
  today: string;
  onChange: (next: Partial<ListState>) => void;
  onReset: () => void;
};

/** The list itself, with its loading, error and empty states. */
export function InvoicesResults({ list, state, today, onChange, onReset }: Props) {
  const updating = list.isFetching && list.isPlaceholderData;
  return (
    <div
      aria-busy={updating}
      className={cn("relative transition-opacity", updating && "opacity-60")}
    >
      {updating && (
        <span aria-hidden className="absolute inset-x-0 -top-px h-0.5 animate-pulse bg-accent" />
      )}
      {list.isPending ? (
        <LoadingRows />
      ) : list.isError ? (
        <EmptyState
          title="Couldn't load invoices"
          description={list.error.message}
          action={
            <Button size="sm" onClick={() => list.refetch()}>
              Try again
            </Button>
          }
        />
      ) : list.data.total === 0 ? (
        <NoInvoices state={state} onReset={onReset} />
      ) : (
        <>
          <InvoicesTable
            invoices={list.data.items}
            state={state}
            onSort={(key) => onChange(nextSort(state, key))}
            today={today}
          />
          <InvoiceRows invoices={list.data.items} today={today} />
          <InvoicesPagination data={list.data} onPage={(page) => onChange({ page })} />
        </>
      )}
    </div>
  );
}

function NoInvoices({ state, onReset }: { state: ListState; onReset: () => void }) {
  const navigate = useNavigate();
  if (state.q.trim() !== "" || state.status !== "all") {
    return (
      <EmptyState
        title="No matching invoices"
        description={
          state.q
            ? `Nothing matches "${state.q.trim()}". Try a different search or filter.`
            : "No invoices have this status yet."
        }
        action={
          <Button size="sm" onClick={onReset}>
            Clear search and filters
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      title="No invoices yet"
      description="Create your first invoice. You can keep it as a draft until it's ready to send."
      action={
        <Button variant="primary" size="sm" onClick={() => navigate("/invoices/new")}>
          <Plus /> New invoice
        </Button>
      }
    />
  );
}

function LoadingRows() {
  return (
    <div aria-label="Loading invoices" className="flex flex-col">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-line py-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
