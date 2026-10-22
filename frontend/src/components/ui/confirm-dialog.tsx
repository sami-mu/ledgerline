import type { ReactNode } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogFooter } from "./dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  /** Optional third action, e.g. "Save and leave". */
  extra?: ReactNode;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "danger",
  busy,
  onConfirm,
  extra,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} className="max-w-md">
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          {extra}
          <Button
            variant={tone === "danger" ? "secondary" : "primary"}
            className={tone === "danger" ? "border-danger/40 text-danger hover:bg-danger-soft" : ""}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
