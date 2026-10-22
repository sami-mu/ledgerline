import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const controlStyles = [
  "w-full min-w-0 rounded-md border border-line-strong bg-surface text-[13px] text-ink",
  "placeholder:text-ink-4 transition-[border-color,box-shadow] duration-100",
  "hover:border-ink-4",
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--color-accent-soft)] focus-visible:outline-none",
  "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--color-danger-soft)]",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-3",
].join(" ");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input data-slot="input" className={cn(controlStyles, "h-8 px-2.5", className)} {...props} />
  );
}
