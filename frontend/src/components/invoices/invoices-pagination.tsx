import { ChevronLeft, ChevronRight } from "lucide-react";
import type { InvoicePage } from "@/api/invoices";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { PAGE_SIZE, pageRange } from "./list-params";

export function InvoicesPagination({
  data,
  onPage,
}: {
  data: InvoicePage;
  onPage: (page: number) => void;
}) {
  const { page, pages, total } = data;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + data.items.length - 1;
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
        Total <span className="num font-semibold text-ink">{formatMoney(data.total_amount)}</span>
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
