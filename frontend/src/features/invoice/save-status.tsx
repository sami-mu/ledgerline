import { CircleAlert, LoaderCircle } from "lucide-react";
import { formatRelative, useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export type SaveState =
  | { kind: "new" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "error" }
  | { kind: "saved"; at: string };

export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  const now = useNow();
  const content = {
    new: { dot: "bg-ink-4", text: "Not saved yet" },
    dirty: { dot: "bg-warning", text: "Unsaved changes" },
    saving: { dot: null, text: "Saving" },
    error: { dot: null, text: "Save failed" },
    saved: {
      dot: "bg-accent",
      text: state.kind === "saved" ? `Saved ${formatRelative(state.at, now)}` : "",
    },
  }[state.kind];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs whitespace-nowrap",
        state.kind === "error" ? "text-danger" : "text-ink-3",
        className,
      )}
    >
      {state.kind === "saving" && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
      {state.kind === "error" && <CircleAlert className="size-3.5" aria-hidden />}
      {content.dot && <span aria-hidden className={cn("size-1.5 rounded-full", content.dot)} />}
      {content.text}
    </span>
  );
}
