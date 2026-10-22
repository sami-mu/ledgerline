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
import { useBlocker, useNavigate } from "react-router";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
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
import { Tooltip } from "@/components/ui/tooltip";
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
import { StatusBadge } from "./status-badge";
import { SendInvoiceDialog } from "./send-invoice-dialog";
import { useTotals } from "./use-totals";
import { useDeleteInvoice, useSaveInvoice, useSendInvoice } from "./use-invoice-mutations";

type Props = {
  /** The saved invoice, or undefined for a new one. */
  invoice?: InvoiceOut;
  defaultValues: InvoiceFormValues;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

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
  const [sendOpen, setSendOpen] = useState(false);
  const [view, setView] = useState<PaneView>("edit");

  // Navigation guard. `allowLeave` lets our own redirects (after create or delete) through.
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

  /** Validates and saves. Resolves to the saved invoice, or null when it couldn't be saved. */
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

  /** After the first save, a new invoice moves to its own URL. */
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

  // Ctrl/Cmd+S saves from anywhere on the page.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveRef.current();
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
      navigate("/", { replace: true });
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
              <span className="hidden sm:inline-flex">
                <Brand />
              </span>
              <ChevronRight className="hidden size-3.5 text-ink-4 sm:block" aria-hidden />
              <InvoiceNumber />
              {invoice && <StatusBadge status={invoice.status} className="ml-1" />}
            </>
          }
          end={
            <>
              <SaveStatus state={saveState} className="mr-1 hidden lg:inline-flex" />
              <Tooltip content={`Save (${isMac ? "Cmd" : "Ctrl"}+S)`}>
                <Button
                  onClick={() => void save()}
                  disabled={saveMutation.isPending || (!isDirty && !!invoice)}
                  aria-label="Save"
                  className="max-sm:w-8 max-sm:px-0"
                >
                  <Save /> <span className="max-sm:sr-only">Save</span>
                </Button>
              </Tooltip>
              <Button onClick={() => window.print()} className="hidden sm:inline-flex">
                <Printer /> Print
              </Button>
              <Button variant="primary" onClick={() => setSendOpen(true)}>
                <Send /> Send
              </Button>
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
                    disabled={!invoice}
                    onSelect={() => setConfirmDelete(true)}
                  >
                    <Trash2 /> Delete invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        <main className="flex min-h-0 flex-1">
          {/* Side by side on large screens; one pane at a time below, switched from the bottom bar. */}
          <form
            id="invoice-editor"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            aria-label="Invoice editor"
            className={cn(
              "relative w-full shrink-0 scroll-pane overflow-y-auto bg-surface lg:w-[clamp(460px,42vw,600px)] lg:border-r lg:border-line",
              view === "preview" && "max-lg:hidden",
            )}
          >
            <InvoiceEditor />
          </form>
          <section
            aria-label="Invoice preview"
            className={cn(
              "relative min-w-0 flex-1 scroll-pane overflow-y-auto",
              view === "edit" && "max-lg:hidden",
            )}
          >
            <PreviewPane />
          </section>
        </main>

        <MobileBar view={view} onViewChange={setView} saveState={saveState} />
      </div>
      <PrintableInvoice />
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
        aside={{ label: "Discard changes", onClick: () => blocker.proceed?.() }}
      />
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

/** Bottom bar on small screens: switch between editing and the preview, see save state. */
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

/** The send dialog, fed with live form values. Lives inside the FormProvider. */
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
