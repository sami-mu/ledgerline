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
  /** Main action, placed last. */
  confirm: Action;
  /** Optional destructive choice, placed before the main action (e.g. "Discard changes"). */
  alternative?: Action;
};

/** AlertDialog: focus starts on Cancel and an outside click doesn't dismiss. */
export function ConfirmDialog({
  open,
  onOpenChange,
  tone,
  title,
  description,
  confirm,
  alternative,
}: Props) {
  const Icon = tone === "danger" ? Trash2 : TriangleAlert;
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayStyles} />
        <AlertDialog.Content className={cn(modalPanelStyles, "max-w-[440px]")}>
          <header className="flex items-center gap-3 px-6 pt-5">
            <span
              aria-hidden
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full",
                tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
              )}
            >
              <Icon className="size-4" />
            </span>
            <AlertDialog.Title className="text-base leading-6 font-semibold tracking-[-0.01em]">
              {title}
            </AlertDialog.Title>
          </header>
          <AlertDialog.Description className="px-6 pt-3 pb-6 text-[13px] leading-5 text-ink-2">
            {description}
          </AlertDialog.Description>

          <DialogFooter>
            <AlertDialog.Cancel asChild>
              <Button disabled={confirm.busy}>Cancel</Button>
            </AlertDialog.Cancel>
            {alternative && (
              <Button
                onClick={alternative.onClick}
                disabled={alternative.busy || confirm.busy}
                className="text-danger hover:border-danger/40 hover:bg-danger-soft"
              >
                {alternative.label}
              </Button>
            )}
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
