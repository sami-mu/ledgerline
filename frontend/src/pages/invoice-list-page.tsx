import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Brand } from "@/components/app/brand";
import { TopBar } from "@/components/app/top-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShortcutsButton } from "@/features/shortcuts/shortcuts-dialog";
import { daysBetween, formatIsoDate } from "@/features/invoice/dates";
import {
  DEFAULT_STATE,
  PAGE_SIZE,
  nextSort,
  pageRange,
  parseListState,
  toApiParams,
  toSearchParams,
  type ListFilter,
  type ListState,
  type SortKey,
} from "@/features/invoice/list/list-params";
import { formatMoney } from "@/features/invoice/money";
import { SearchField } from "@/features/invoice/list/search-field";
import { displayStatus } from "@/features/invoice/status";
import { StatusBadge } from "@/features/invoice/status-badge";
import { useHotkey } from "@/hooks/use-hotkey";
import { api, type InvoiceStats, type InvoiceSummary } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { cn } from "@/lib/utils";

const FILTERS: { value: ListFilter; label: string; count: keyof InvoiceStats["counts"] }[] = [
  { value: "all", label: "All", count: "all" },
  { value: "draft", label: "Drafts", count: "draft" },
  { value: "outstanding", label: "Outstanding", count: "outstanding" },
  { value: "overdue", label: "Overdue", count: "overdue" },
  { value: "paid", label: "Paid", count: "paid" },
];

const monthName = new Intl.DateTimeFormat("en-US", { month: "long" });

/** Searched, filtered, sorted and paged on the server; the state lives in the URL. */
export function InvoiceListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = parseListState(searchParams);
  const searchRef = useRef<HTMLInputElement>(null);

  const update = (next: Partial<ListState>, options?: { replace?: boolean }) => {
    // Changing anything but the page goes back to page 1.
    const merged = { ...state, page: 1, ...next };
    setSearchParams(toSearchParams(merged), { replace: options?.replace });
  };

  const apiParams = toApiParams(state);
  const list = useQuery({
    queryKey: queryKeys.invoices.list(apiParams),
    queryFn: ({ signal }) => api.listInvoices(apiParams, signal),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({ queryKey: queryKeys.invoices.stats, queryFn: api.invoiceStats });

  // A page past the end (after deleting the last invoice on it) moves to the last real page.
  const data = list.data;
  useEffect(() => {
    if (data && !list.isPlaceholderData && data.total > 0 && state.page > data.pages) {
      setSearchParams(toSearchParams({ ...state, page: data.pages }), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, list.isPlaceholderData]);

  useHotkey("/", () => searchRef.current?.focus());

  const asOf = stats.data ? new Date(`${stats.data.as_of}T00:00:00`) : new Date();
  const updating = list.isFetching && list.isPlaceholderData;
  const filtered = state.q.trim() !== "" || state.status !== "all";

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
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Invoices</h1>
            <Button variant="primary" onClick={() => navigate("/invoices/new")}>
              <Plus /> New invoice
            </Button>
          </header>

          <section
            aria-label="Summary"
            className="grid grid-cols-2 overflow-hidden rounded-lg border border-line lg:grid-cols-4"
          >
            <Stat label="Outstanding" bucket={stats.data?.outstanding} />
            <Stat
              label="Overdue"
              bucket={stats.data?.overdue}
              danger={(stats.data?.overdue.count ?? 0) > 0}
            />
            <Stat
              label={`Paid in ${monthName.format(asOf)}`}
              bucket={stats.data?.paid_this_month}
            />
            <Stat label="Drafts" bucket={stats.data?.drafts} />
          </section>

          <section aria-label="Invoices" className="flex flex-col">
            <div className="flex flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between">
              <div
                role="tablist"
                aria-label="Filter by status"
                className="-mb-px flex [scrollbar-width:none] gap-6 overflow-x-auto"
              >
                {FILTERS.map((option) => {
                  const selected = state.status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => update({ status: option.value })}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                        selected
                          ? "border-accent text-ink"
                          : "border-transparent text-ink-3 hover:text-ink",
                      )}
                    >
                      {option.label}
                      <span className="min-w-3 num text-xs font-normal text-ink-3">
                        {stats.data?.counts[option.count] ?? ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mb-2.5 sm:w-72">
                <SearchField
                  value={state.q}
                  inputRef={searchRef}
                  onCommit={(q, options) => update({ q }, options)}
                />
              </div>
            </div>

            <div
              aria-busy={updating}
              className={cn("relative transition-opacity", updating && "opacity-60")}
            >
              {updating && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 -top-px h-0.5 animate-pulse bg-accent"
                />
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
                filtered ? (
                  <EmptyState
                    title="No matching invoices"
                    description={
                      state.q
                        ? `Nothing matches "${state.q.trim()}". Try a different search or filter.`
                        : "No invoices have this status yet."
                    }
                    action={
                      <Button
                        size="sm"
                        onClick={() => setSearchParams(toSearchParams(DEFAULT_STATE))}
                      >
                        Clear search and filters
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="No invoices yet"
                    description="Create your first invoice. You can keep it as a draft until it's ready to send."
                    action={
                      <Button variant="primary" size="sm" onClick={() => navigate("/invoices/new")}>
                        <Plus /> New invoice
                      </Button>
                    }
                  />
                )
              ) : (
                <>
                  <InvoiceTable
                    invoices={list.data.items}
                    state={state}
                    onSort={(key) => update(nextSort(state, key))}
                    today={stats.data?.as_of ?? new Date().toISOString().slice(0, 10)}
                  />
                  <InvoiceRows
                    invoices={list.data.items}
                    today={stats.data?.as_of ?? new Date().toISOString().slice(0, 10)}
                  />
                  <Pagination
                    page={list.data.page}
                    pages={list.data.pages}
                    total={list.data.total}
                    shown={list.data.items.length}
                    totalAmount={list.data.total_amount}
                    onPage={(page) => update({ page })}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function plural(count: number, word: string): string {
  return `${count.toLocaleString("en-US")} ${word}${count === 1 ? "" : "s"}`;
}

function Stat({
  label,
  bucket,
  danger,
}: {
  label: string;
  bucket: { count: number; total: string } | undefined;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-line px-5 py-4",
        "max-lg:odd:border-r lg:[&:not(:last-child)]:border-r max-lg:[&:nth-child(n+3)]:border-t",
      )}
    >
      <span className="text-[13px] text-ink-3">{label}</span>
      {bucket ? (
        <span
          className={cn(
            "num text-[22px] leading-8 font-semibold tracking-[-0.02em]",
            danger ? "text-danger" : "text-ink",
          )}
        >
          {formatMoney(bucket.total)}
        </span>
      ) : (
        <Skeleton className="my-1 h-6 w-24" />
      )}
      <span className="text-xs text-ink-3">{bucket ? plural(bucket.count, "invoice") : " "}</span>
    </div>
  );
}

const COLUMNS: { key: SortKey; label: string; align?: "right"; className?: string }[] = [
  { key: "number", label: "Invoice", className: "w-[120px]" },
  { key: "customer", label: "Customer" },
  { key: "issue_date", label: "Issued", className: "w-[130px]" },
  { key: "due_date", label: "Due", className: "w-[190px]" },
  { key: "status", label: "Status", className: "w-[110px]" },
  { key: "total", label: "Amount", align: "right", className: "w-[130px]" },
];

function InvoiceTable({
  invoices,
  state,
  onSort,
  today,
}: {
  invoices: InvoiceSummary[];
  state: ListState;
  onSort: (key: SortKey) => void;
  today: string;
}) {
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

function DueCell({ invoice, today }: { invoice: InvoiceSummary; today: string }) {
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

function InvoiceRows({ invoices, today }: { invoices: InvoiceSummary[]; today: string }) {
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

function Pagination({
  page,
  pages,
  total,
  shown,
  totalAmount,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  shown: number;
  totalAmount: string;
  onPage: (page: number) => void;
}) {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + shown - 1;
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 py-4 text-[13px] sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-ink-3">
        <span className="num text-ink">
          {first.toLocaleString("en-US")}–{last.toLocaleString("en-US")}
        </span>{" "}
        of <span className="num text-ink">{total.toLocaleString("en-US")}</span>
        <span className="mx-2 text-line-strong">|</span>
        Total <span className="num font-semibold text-ink">{formatMoney(totalAmount)}</span>
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft /> <span className="max-sm:sr-only">Previous</span>
          </Button>
          {pageRange(page, pages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} aria-hidden className="w-7 text-center text-ink-4">
                …
              </span>
            ) : (
              <Button
                key={p}
                size="sm"
                variant={p === page ? "primary" : "ghost"}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onPage(p)}
                className="min-w-7 px-2 num"
              >
                {p}
              </Button>
            ),
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <span className="max-sm:sr-only">Next</span> <ChevronRight />
          </Button>
        </div>
      )}
    </nav>
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

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <FileText className="size-5 text-ink-4" aria-hidden />
      <p className="text-[13px] font-medium">{title}</p>
      <p className="max-w-sm text-xs text-ink-3">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
