import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function EditorSection({ id, title, description, action, children, className }: Props) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn("border-b border-line px-5 py-6 last:border-b-0 sm:px-6", className)}
    >
      <header className="mb-4 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 id={`${id}-title`} className="text-[13px] font-semibold tracking-[-0.005em] text-ink">
            {title}
          </h2>
          {description && <p className="text-xs text-ink-3">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
