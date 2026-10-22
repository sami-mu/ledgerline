import { cn } from "@/lib/utils";
import type { DisplayStatus } from "./status";

const STYLES: Record<DisplayStatus, { label: string; badge: string; dot: string }> = {
  draft: { label: "Draft", badge: "border-line-strong bg-surface text-ink-3", dot: "bg-ink-4" },
  sent: { label: "Sent", badge: "border-transparent bg-sunken text-ink-2", dot: "bg-ink-2" },
  overdue: {
    label: "Overdue",
    badge: "border-transparent bg-danger-soft text-danger",
    dot: "bg-danger",
  },
  paid: {
    label: "Paid",
    badge: "border-transparent bg-accent-soft text-accent-ink",
    dot: "bg-accent",
  },
};

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-2xs font-medium",
        style.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
