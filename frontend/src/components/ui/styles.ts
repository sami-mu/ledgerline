import { cn } from "@/lib/utils";

export const controlStyles = [
  // 16px on phones stops iOS Safari from zooming in when an input gets focus.
  "w-full min-w-0 rounded-md border border-line-strong bg-surface text-base text-ink sm:text-[13px]",
  "placeholder:text-ink-4 transition-[border-color,box-shadow] duration-100",
  "hover:border-ink-4",
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--color-accent-soft)] focus-visible:outline-none",
  "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--color-danger-soft)]",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-3",
].join(" ");

export const overlayStyles = "fixed inset-0 z-40 animate-fade-in bg-ink/40";

/** Centered slightly above the middle; the max height keeps a gap at the top. */
export const modalPanelStyles = cn(
  "fixed top-[44dvh] left-1/2 z-50 flex max-h-[calc(88dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
  "animate-pop-in overflow-hidden rounded-lg border border-line bg-surface shadow-pop focus:outline-none",
);
