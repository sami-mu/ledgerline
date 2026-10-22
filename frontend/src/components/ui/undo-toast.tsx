import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const TICK_MS = 100;

type Props = {
  id: string | number;
  message: string;
  detail?: string;
  seconds: number;
  onUndo: () => void | Promise<void>;
};

/** The countdown pauses on hover or focus. */
export function UndoToast({ id, message, detail, seconds, onUndo }: Props) {
  const total = seconds * 1000;
  const [remaining, setRemaining] = useState(total);
  const [paused, setPaused] = useState(false);
  const undone = useRef(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setRemaining((ms) => Math.max(0, ms - TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (remaining === 0) toast.dismiss(id);
  }, [remaining, id]);

  return (
    <div
      role="status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-3 overflow-hidden rounded-md border border-line bg-surface py-2.5 pr-2.5 pl-3.5 text-[13px] text-ink shadow-pop"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{message}</p>
        {detail && <p className="truncate text-xs text-ink-3">{detail}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          if (undone.current) return;
          undone.current = true;
          void onUndo();
          toast.dismiss(id);
        }}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-sm px-2 font-medium text-accent transition-colors hover:bg-accent-soft"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Undo
        <span className="w-5 text-left num text-xs font-normal text-ink-3" aria-hidden>
          {Math.ceil(remaining / 1000)}s
        </span>
      </button>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 bg-accent/60"
        style={{ width: `${(remaining / total) * 100}%`, transition: `width ${TICK_MS}ms linear` }}
      />
    </div>
  );
}
