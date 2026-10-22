import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: "draft" | "sent";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-2xs font-medium",
        status === "sent" ? "bg-accent-soft text-accent-ink" : "bg-sunken text-ink-2",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", status === "sent" ? "bg-accent" : "bg-ink-4")}
      />
      {status === "sent" ? "Sent" : "Draft"}
    </span>
  );
}
