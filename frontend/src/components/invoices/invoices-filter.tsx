import { useRef } from "react";
import type { InvoiceStats } from "@/api/invoices";
import { useHotkey } from "@/hooks/use-hotkey";
import { cn } from "@/lib/utils";
import type { ListFilter, ListState } from "./list-params";
import { SearchField } from "./search-field";

const FILTERS: { value: ListFilter; label: string; count: keyof InvoiceStats["counts"] }[] = [
  { value: "all", label: "All", count: "all" },
  { value: "draft", label: "Drafts", count: "draft" },
  { value: "outstanding", label: "Outstanding", count: "outstanding" },
  { value: "overdue", label: "Overdue", count: "overdue" },
  { value: "paid", label: "Paid", count: "paid" },
];

type Props = {
  state: ListState;
  counts: InvoiceStats["counts"] | undefined;
  onChange: (next: Partial<ListState>, options?: { replace?: boolean }) => void;
};

/** Status tabs and search. */
export function InvoicesFilter({ state, counts, onChange }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkey("/", () => searchRef.current?.focus());

  return (
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
              onClick={() => onChange({ status: option.value })}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                selected
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {option.label}
              <span className="min-w-3 num text-xs font-normal text-ink-3">
                {counts?.[option.count] ?? ""}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mb-2.5 sm:w-72">
        <SearchField
          value={state.q}
          inputRef={searchRef}
          onCommit={(q, options) => onChange({ q }, options)}
        />
      </div>
    </div>
  );
}
