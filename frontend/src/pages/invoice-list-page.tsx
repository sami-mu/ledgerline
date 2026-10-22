import { Link } from "react-router";
import { Brand } from "@/components/app/brand";
import { ShortcutsButton } from "@/components/app/shortcuts-dialog";
import { TopBar } from "@/components/app/top-bar";
import { InvoiceStats } from "@/components/invoices/invoice-stats";
import { InvoicesFilter } from "@/components/invoices/invoices-filter";
import { InvoicesHeader } from "@/components/invoices/invoices-header";
import { InvoicesResults } from "@/components/invoices/invoices-results";
import { useInvoiceListState } from "@/components/invoices/use-invoice-list-state";

/** Searched, filtered, sorted and paged on the server; the state lives in the URL. */
export function InvoiceListPage() {
  const { state, list, stats, today, update, reset } = useInvoiceListState();

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <TopBar
        start={
          <Link to="/invoices" aria-label="Ledgerline, all invoices" className="rounded-sm">
            <Brand />
          </Link>
        }
        end={<ShortcutsButton page="list" />}
      />
      <main className="relative min-h-0 flex-1 scroll-pane overflow-y-auto">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
          <InvoicesHeader />
          <InvoiceStats stats={stats.data} today={today} />
          <section aria-label="Invoices" className="flex flex-col">
            <InvoicesFilter state={state} counts={stats.data?.counts} onChange={update} />
            <InvoicesResults
              list={list}
              state={state}
              today={today}
              onChange={update}
              onReset={reset}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
