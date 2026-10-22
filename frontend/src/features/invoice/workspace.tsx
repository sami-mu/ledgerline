import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  Copy,
  EllipsisVertical,
  Eye,
  Menu,
  PencilLine,
  Printer,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Link, useBlocker, useNavigate } from "react-router";
import { toast } from "sonner";
import { BrandMark } from "@/components/app/brand";
import { TopBar } from "@/components/app/top-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { ShortcutsButton } from "@/features/shortcuts/shortcuts-dialog";
import { modKey } from "@/lib/platform";
import type { InvoiceOut, SendInvoiceIn } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { InvoiceEditor } from "./editor/invoice-editor";
import { applyServerErrors } from "./form-errors";
import { formatCents } from "./money";
import { toFormValues, toPayload } from "./form-mapping";
import { InvoiceListDrawer } from "./invoice-list-drawer";
import { PreviewPane, PrintableInvoice } from "./preview/preview-pane";
import { SaveStatus, type SaveState } from "./save-status";
import { invoiceFormSchema, type InvoiceFormValues } from "./schema";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { displayStatus } from "./status";
import { StatusBadge } from "./status-badge";
import { StatusBanner } from "./status-banner";
import { SendInvoiceDialog } from "./send-invoice-dialog";
import { useTotals } from "./use-totals";
import {
  useDeleteInvoice,
  useMarkPaid,
  useMarkUnpaid,
  useSaveInvoice,
  useSendInvoice,
} from "./use-invoice-mutations";

type Props = {
  invoice?: InvoiceOut;
  defaultValues: InvoiceFormValues;
};

// Key caps on the dark tooltip need inverted colours.
const TOOLTIP_KBD = "border-white/20 bg-white/10 text-white shadow-none";

export function InvoiceWorkspace({ invoice, defaultValues }: Props) {
  const navigate = useNavigate();
  const form = useForm<InvoiceFormValues>({
    defaultValues,
    resolver: zodResolver(invoiceFormSchema),
    mode: "onTouched",
  });
  const { isDirty } = form.formState;
  const saveMutation = useSaveInvoice(invoice?.id);
  const deleteMutation = useDeleteInvoice();
  const sendMutation = useSendInvoice();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const markPaidMutation = useMarkPaid();
  const markUnpaidMutation = useMarkUnpaid();
  const [sendOpen, setSendOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [confirmSentEdit, setConfirmSentEdit] = useState(false);
  const [view, setView] = useState<PaneView>("edit");
  const isPaid = invoice?.status === "paid";

  // `allowLeave` lets our own redirects (after create or delete) past the guard.
  const allowLeave = useRef(false);
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeave.current &&
      dirtyRef.current &&
      currentLocation.pathname + currentLocation.search !==
        nextLocation.pathname + nextLocation.search,
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  /** Resolves to the saved invoice, or null if it couldn't be saved. */
  const persist = () =>
    new Promise<InvoiceOut | null>((resolve) => {
      void form.handleSubmit(
        async (values) => {
          try {
            const saved = await saveMutation.mutateAsync(toPayload(values));
            form.reset(toFormValues(saved));
            resolve(saved);
          } catch (error) {
            if (blocker.state === "blocked") blocker.reset();
            if (applyServerErrors(error, form.setError)) {
              toast.error("Some fields need attention", {
                description: "The server rejected a value. Check the highlighted fields.",
              });
            } else {
              toast.error("Couldn't save the invoice", {
                description: error instanceof Error ? error.message : undefined,
              });
            }
            resolve(null);
          }
        },
        () => {
          // Close the leave dialog so the highlighted fields are visible.
          if (blocker.state === "blocked") blocker.reset();
          toast.error("Fix the highlighted fields to save");
          resolve(null);
        },
      )();
    });

  const openSaved = (saved: InvoiceOut) => {
    allowLeave.current = true;
    navigate(`/invoices/${saved.id}`, { replace: true });
  };

  const save = async (afterSave?: () => void) => {
    const saved = await persist();
    if (!saved) return;
    if (afterSave) {
      afterSave();
    } else if (!invoice) {
      toast.success(`Invoice ${saved.number} created`);
      openSaved(saved);
    }
  };

  /** The first edit to a sent invoice asks first; paid invoices are locked. */
  const requestSave = () => {
    if (isPaid) {
      toast.error("Paid invoices are locked", { description: "Mark it as unpaid to edit it." });
      return;
    }
    if (invoice?.status === "sent" && !invoice.changed_since_sent && isDirty) {
      setConfirmSentEdit(true);
      return;
    }
    void save();
  };

  const markPaid = async (paidOn: string) => {
    if (!invoice) return;
    const paid = await markPaidMutation.mutateAsync({ id: invoice.id, paidOn });
    setMarkPaidOpen(false);
    toast.success(`Invoice ${paid.number} marked as paid`);
  };

  const markUnpaid = async () => {
    if (!invoice) return;
    try {
      await markUnpaidMutation.mutateAsync(invoice.id);
      toast.success(`Invoice ${invoice.number} is open again`);
    } catch (error) {
      toast.error("Couldn't update the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const send = async (body: SendInvoiceIn) => {
    const target = invoice && !form.formState.isDirty ? invoice : await persist();
    if (!target) {
      setSendOpen(false);
      return;
    }
    // Keep the URL in step with the saved invoice even if sending then fails.
    if (!invoice) openSaved(target);
    try {
      const sent = await sendMutation.mutateAsync({ id: target.id, body });
      setSendOpen(false);
      toast.success(`Invoice ${sent.number} sent`, { description: `Sent to ${body.to}` });
    } catch (error) {
      toast.error("Couldn't send the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const saveRef = useRef(requestSave);
  useEffect(() => {
    saveRef.current = requestSave;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const deleteInvoice = async () => {
    if (!invoice) return;
    try {
      await deleteMutation.mutateAsync(invoice.id);
      allowLeave.current = true;
      setConfirmDelete(false);
      toast.success(`Invoice ${invoice.number} deleted`);
      navigate("/invoices", { replace: true });
    } catch (error) {
      toast.error("Couldn't delete the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const saveState: SaveState = saveMutation.isPending
    ? { kind: "saving" }
    : saveMutation.isError && isDirty
      ? { kind: "error" }
      : isDirty
        ? { kind: "dirty" }
        : invoice
          ? { kind: "saved", at: invoice.updated_at }
          : { kind: "new" };

  return (
    <FormProvider {...form}>
      <div className="flex h-dvh flex-col print:hidden">
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
                  onClick={requestSave}
                  disabled={saveMutation.isPending || isPaid || (!isDirty && !!invoice)}
                  aria-label="Save"
                  className="max-sm:w-8 max-sm:px-0"
                >
                  <Save /> <span className="max-sm:sr-only">Save</span>
                </Button>
              </Tooltip>
              <Button onClick={() => window.print()} className="hidden sm:inline-flex">
                <Printer /> Print
              </Button>
              <Button
                variant={invoice?.sent_at ? "secondary" : "primary"}
                onClick={() => setSendOpen(true)}
              >
                <Send /> {invoice?.sent_at ? "Resend" : "Send"}
              </Button>
              <ShortcutsButton page="editor" />
              <DropdownMenu>
                <Tooltip content="More">
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="More invoice actions">
                      <EllipsisVertical />
                    </Button>
                  </DropdownMenuTrigger>
                </Tooltip>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => window.print()} className="sm:hidden">
                    <Printer /> Print or save PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!invoice}
                    onSelect={() => invoice && navigate(`/invoices/new?from=${invoice.id}`)}
                  >
                    <Copy /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    tone="danger"
                    disabled={!invoice || isPaid}
                    onSelect={() => setConfirmDelete(true)}
                  >
                    <Trash2 /> {isPaid ? "Paid invoices can't be deleted" : "Delete invoice"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
        {invoice && (
          <StatusBanner
            invoice={invoice}
            isDirty={isDirty}
            busy={markPaidMutation.isPending || markUnpaidMutation.isPending}
            onMarkPaid={() => setMarkPaidOpen(true)}
            onMarkUnpaid={() => void markUnpaid()}
            onResend={() => setSendOpen(true)}
          />
        )}

        <main className="flex min-h-0 flex-1">
          <form
            id="invoice-editor"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              requestSave();
            }}
            aria-label="Invoice editor"
            className={cn(
              "relative w-full shrink-0 scroll-pane overflow-y-auto bg-surface lg:w-[clamp(460px,42vw,600px)] lg:border-r lg:border-line",
              view === "preview" && "max-lg:hidden",
            )}
          >
            {/* A disabled fieldset locks every control at once for paid invoices. */}
            <fieldset disabled={isPaid} className="m-0 min-w-0 border-0 p-0">
              <InvoiceEditor events={invoice?.events} />
            </fieldset>
          </form>
          <section
            aria-label="Invoice preview"
            className={cn(
              "relative min-w-0 flex-1 scroll-pane overflow-y-auto",
              view === "edit" && "max-lg:hidden",
            )}
          >
            <PreviewPane paidOn={invoice?.paid_on ?? undefined} />
          </section>
        </main>

        <MobileBar view={view} onViewChange={setView} saveState={saveState} />
      </div>
      <PrintableInvoice paidOn={invoice?.paid_on ?? undefined} />
      <ConnectedSendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        needsSave={isDirty || !invoice}
        onSend={send}
      />

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
        tone="warning"
        title="Leave without saving?"
        description="Your changes to this invoice haven't been saved. Save them before you go, or discard them."
        confirm={{
          label: "Save and leave",
          busy: saveMutation.isPending,
          onClick: () => void save(() => blocker.proceed?.()),
        }}
        alternative={{ label: "Discard changes", onClick: () => blocker.proceed?.() }}
      />
      <ConfirmDialog
        open={confirmSentEdit}
        onOpenChange={setConfirmSentEdit}
        tone="warning"
        title="Save changes to a sent invoice?"
        description={`${invoice?.number ?? "This invoice"} was already sent${
          invoice?.last_sent_to ? ` to ${invoice.last_sent_to}` : ""
        }. Saving updates your copy only. Resend it afterwards so your customer has the latest version.`}
        confirm={{
          label: "Save changes",
          busy: saveMutation.isPending,
          onClick: () => {
            setConfirmSentEdit(false);
            void save();
          },
        }}
      />
      {invoice && (
        <MarkPaidDialog
          key={markPaidOpen ? "open" : "closed"}
          invoice={invoice}
          open={markPaidOpen}
          onOpenChange={setMarkPaidOpen}
          onConfirm={markPaid}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="danger"
        title={`Delete invoice ${invoice?.number ?? ""}?`}
        description="This permanently removes the invoice, its line items and custom fields. It can't be undone."
        confirm={{
          label: "Delete invoice",
          busy: deleteMutation.isPending,
          onClick: () => void deleteInvoice(),
        }}
      />
    </FormProvider>
  );
}

type PaneView = "edit" | "preview";

function MobileBar({
  view,
  onViewChange,
  saveState,
}: {
  view: PaneView;
  onViewChange: (view: PaneView) => void;
  saveState: SaveState;
}) {
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

function ConnectedSendDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needsSave: boolean;
  onSend: (body: SendInvoiceIn) => Promise<void>;
}) {
  const values = useWatch<InvoiceFormValues>() as InvoiceFormValues;
  const totals = useTotals();
  return <SendInvoiceDialog {...props} invoice={values} totals={totals} />;
}

function InvoiceNumber() {
  const number = useWatch<InvoiceFormValues, "number">({ name: "number" });
  return (
    <h1 className="truncate num text-[13px] font-medium text-ink-2">{number || "Untitled"}</h1>
  );
}
