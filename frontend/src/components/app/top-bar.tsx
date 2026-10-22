import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TopBar({
  start,
  end,
  className,
}: {
  start: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-4 print:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">{start}</div>
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </header>
  );
}
