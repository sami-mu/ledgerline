import { ChevronRight, Menu, Printer, Save, Send } from "lucide-react";
import type { ReactNode } from "react";
import { useWatch } from "react-hook-form";
import { Link } from "react-router";
import type { InvoiceOut } from "@/api/invoices";
import { BrandMark } from "@/components/app/brand";
import { ShortcutsButton } from "@/components/app/shortcuts-dialog";
import { TopBar } from "@/components/app/top-bar";
import { displayStatus } from "@/components/invoice/status";
import { StatusBadge } from "@/components/invoice/status-badge";
import { InvoiceListDrawer } from "@/components/invoices/invoice-list-drawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { modKey } from "@/lib/platform";
import { SaveStatus, type SaveState } from "./save-status";

// Key caps on the dark tooltip need inverted colours.
const TOOLTIP_KBD = "border-white/20 bg-white/10 text-white shadow-none";

type Props = {
  invoice?: InvoiceOut;
  saveState: SaveState;
  canSave: boolean;
  onSave: () => void;
  onSend: () => void;
  actions: ReactNode;
};

export function WorkspaceTopBar({ invoice, saveState, canSave, onSave, onSend, actions }: Props) {
  return (
    <TopBar
      start={
        <>
          <Dialog>
            <Tooltip content="All invoices">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="All invoices">
                  <Menu />
                </Button>
              </DialogTrigger>
            </Tooltip>
            <InvoiceListDrawer activeId={invoice?.id} />
          </Dialog>
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <li className="hidden sm:flex">
                <Link to="/invoices" aria-label="Ledgerline home" className="rounded-sm">
                  <BrandMark className="size-5" />
                </Link>
              </li>
              <li className="hidden items-center gap-1.5 sm:flex">
                <ChevronRight className="size-3.5 text-ink-4" aria-hidden />
                <Link
                  to="/invoices"
                  className="rounded-sm font-medium text-ink-2 transition-colors hover:text-ink"
                >
                  Invoices
                </Link>
                <ChevronRight className="size-3.5 text-ink-4" aria-hidden />
              </li>
              <li className="min-w-0" aria-current="page">
                <InvoiceNumber />
              </li>
            </ol>
          </nav>
          {invoice && (
            <StatusBadge
              status={displayStatus(invoice.status, invoice.is_overdue)}
              className="ml-1"
            />
          )}
        </>
      }
      end={
        <>
          <SaveStatus state={saveState} className="mr-1 hidden lg:inline-flex" />
          <Tooltip
            content={
              <span className="flex items-center gap-1.5">
                Save
                <span className="flex gap-0.5">
                  <Kbd className={TOOLTIP_KBD}>{modKey}</Kbd>
                  <Kbd className={TOOLTIP_KBD}>S</Kbd>
                </span>
              </span>
            }
          >
            <Button
              onClick={onSave}
              disabled={!canSave}
              aria-label="Save"
              className="max-sm:w-8 max-sm:px-0"
            >
              <Save /> <span className="max-sm:sr-only">Save</span>
            </Button>
          </Tooltip>
          <Button onClick={() => window.print()} className="hidden sm:inline-flex">
            <Printer /> Print
          </Button>
          <Button variant={invoice?.sent_at ? "secondary" : "primary"} onClick={onSend}>
            <Send /> {invoice?.sent_at ? "Resend" : "Send"}
          </Button>
          <ShortcutsButton page="editor" />
          {actions}
        </>
      }
    />
  );
}

function InvoiceNumber() {
  const number = useWatch<InvoiceFormValues, "number">({ name: "number" });
  return (
    <h1 className="truncate num text-[13px] font-medium text-ink-2">{number || "Untitled"}</h1>
  );
}
