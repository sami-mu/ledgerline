import { FileText } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <FileText className="size-5 text-ink-4" aria-hidden />
      <p className="text-[13px] font-medium">{title}</p>
      <p className="max-w-sm text-xs text-ink-3">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
