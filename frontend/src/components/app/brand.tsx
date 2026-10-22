export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <rect width="20" height="20" rx="4" fill="var(--color-accent)" />
      <path d="M6 6.5h8M6 10h8M6 13.5h4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className="flex items-center gap-2">
      <BrandMark className="size-5" />
      <span className="text-[14px] font-semibold tracking-[-0.015em] text-ink">Ledgerline</span>
    </span>
  );
}
