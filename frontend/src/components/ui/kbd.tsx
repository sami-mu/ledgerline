import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong bg-subtle px-1",
        "font-sans text-[11px] leading-none font-medium text-ink-3 shadow-[inset_0_-1px_0_var(--color-line)]",
        className,
      )}
      {...props}
    />
  );
}
