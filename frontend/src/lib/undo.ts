import { createElement } from "react";
import { toast } from "sonner";
import { UndoToast } from "@/components/ui/undo-toast";

type UndoOptions = {
  message: string;
  detail?: string;
  onUndo: () => void | Promise<void>;
  seconds?: number;
};

export function showUndoToast({ message, detail, onUndo, seconds = 5 }: UndoOptions) {
  toast.custom((id) => createElement(UndoToast, { id, message, detail, seconds, onUndo }), {
    duration: Number.POSITIVE_INFINITY,
  });
}
