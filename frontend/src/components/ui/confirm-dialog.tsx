import { AlertDialog } from "radix-ui";
import { LoaderCircle, TriangleAlert, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { DialogFooter } from "./dialog";
import { modalPanelStyles, overlayStyles } from "./styles";

type Action = {
  label: string;
  onClick: () => void;
  busy?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone: "danger" | "warning";
  title: string;
  description: ReactNode;
  /** The main action, placed on the right. Styled destructive for the danger tone. */
  confirm: Action;
  /** Optional destructive escape hatch, set apart on the left (e.g. "Discard changes"). */
  aside?: Action;
};

/**
 * Confirmation for consequential actions. Built on AlertDialog: focus starts on Cancel and
 * clicking outside doesn't dismiss, so nothing irreversible happens by accident.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  tone,
  title,
  description,
  confirm,
  aside,
}: Props) {
  const Icon = tone === "danger" ? Trash2 : TriangleAlert;
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayStyles} />
        <AlertDialog.Content className={cn(modalPanelStyles, "max-w-[440px]")}>
          <div className="flex gap-4 px-6 pt-6 pb-7">
            <span
              aria-hidden
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full",
                tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <div className="flex flex-col gap-1.5 pt-1">
              <AlertDialog.Title className="text-base leading-6 font-semibold tracking-[-0.01em]">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-[13px] leading-5 text-ink-3">
                {description}
              </AlertDialog.Description>
            </div>
          </div>

          <DialogFooter>
            {aside && (
              <Button
                variant="danger"
                onClick={aside.onClick}
                disabled={aside.busy || confirm.busy}
                className="sm:mr-auto sm:-ml-3"
              >
                {aside.label}
              </Button>
            )}
            <AlertDialog.Cancel asChild>
              <Button disabled={confirm.busy}>Cancel</Button>
            </AlertDialog.Cancel>
            <Button
              variant={tone === "danger" ? "destructive" : "primary"}
              onClick={confirm.onClick}
              disabled={confirm.busy}
            >
              {confirm.busy && <LoaderCircle className="animate-spin" />}
              {confirm.label}
            </Button>
          </DialogFooter>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
