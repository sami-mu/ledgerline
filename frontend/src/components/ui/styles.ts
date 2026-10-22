/** Shared look for text inputs and textareas. */
export const controlStyles = [
  // 16px on phones stops iOS Safari from zooming in when an input gets focus.
  "w-full min-w-0 rounded-md border border-line-strong bg-surface text-base text-ink sm:text-[13px]",
  "placeholder:text-ink-4 transition-[border-color,box-shadow] duration-100",
  "hover:border-ink-4",
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--color-accent-soft)] focus-visible:outline-none",
  "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--color-danger-soft)]",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-3",
].join(" ");
