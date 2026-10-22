import { createElement, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { UndoToast } from "@/components/ui/undo-toast";

type UndoOptions = { message: string; detail?: string; onUndo: () => void; seconds?: number };

/** Undo toasts close when the owning component unmounts, so Undo never acts on a stale form. */
export function useUndoToast() {
  const ids = useRef(new Set<string | number>());

  useEffect(() => {
    const open = ids.current;
    return () => open.forEach((id) => toast.dismiss(id));
  }, []);

  return useCallback(({ message, detail, onUndo, seconds = 5 }: UndoOptions) => {
    const id = toast.custom(
      (toastId) => createElement(UndoToast, { id: toastId, message, detail, seconds, onUndo }),
      { duration: Number.POSITIVE_INFINITY, onDismiss: (t) => ids.current.delete(t.id) },
    );
    ids.current.add(id);
  }, []);
}
