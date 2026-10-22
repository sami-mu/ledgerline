import type { InvoiceStats as Stats } from "@/api/invoices";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const monthName = new Intl.DateTimeFormat("en-US", { month: "long" });

export function InvoiceStats({ stats, today }: { stats: Stats | undefined; today: string }) {
  const month = monthName.format(new Date(`${today}T00:00:00`));
  return (
    <section
      aria-label="Summary"
      className="grid grid-cols-2 overflow-hidden rounded-lg border border-line lg:grid-cols-4"
    >
      <Stat label="Outstanding" bucket={stats?.outstanding} />
      <Stat label="Overdue" bucket={stats?.overdue} danger={(stats?.overdue.count ?? 0) > 0} />
      <Stat label={`Paid in ${month}`} bucket={stats?.paid_this_month} />
      <Stat label="Drafts" bucket={stats?.drafts} />
    </section>
  );
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
      <span className="text-xs text-ink-3">
        {bucket
          ? `${bucket.count.toLocaleString("en-US")} ${bucket.count === 1 ? "invoice" : "invoices"}`
          : " "}
      </span>
    </div>
  );
}
