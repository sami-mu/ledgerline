import { Eye, PencilLine } from "lucide-react";
import { useTotals } from "@/components/invoice/use-totals";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { SaveStatus, type SaveState } from "./save-status";

export type PaneView = "edit" | "preview";

type Props = {
  view: PaneView;
  onViewChange: (view: PaneView) => void;
  saveState: SaveState;
};

export function MobileBar({ view, onViewChange, saveState }: Props) {
  const totals = useTotals();
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-3 lg:hidden">
      <div role="group" aria-label="Show" className="flex rounded-md bg-sunken p-0.5">
        {(["edit", "preview"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => onViewChange(option)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium text-ink-2 transition-colors",
              view === option && "bg-surface text-ink shadow-[0_1px_2px_rgb(14_18_23/0.12)]",
            )}
          >
            {option === "edit" ? <PencilLine className="size-3.5" /> : <Eye className="size-3.5" />}
            {option === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col items-end">
        <span className="num text-[13px] font-medium">{formatCents(totals.total)}</span>
        <SaveStatus state={saveState} className="text-2xs" />
      </div>
    </div>
  );
}
