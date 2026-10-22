import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  Copy,
  EllipsisVertical,
  Menu,
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
import type { InvoiceOut } from "@/lib/api/client";
import { InvoiceEditor } from "./editor/invoice-editor";
import { applyServerErrors } from "./form-errors";
import { toFormValues, toPayload } from "./form-mapping";
import { InvoiceListDrawer } from "./invoice-list-drawer";
import { PreviewPane, PrintableInvoice } from "./preview/preview-pane";
import { SaveStatus, type SaveState } from "./save-status";
import { invoiceFormSchema, type InvoiceFormValues } from "./schema";
import { StatusBadge } from "./status-badge";
import { useDeleteInvoice, useSaveInvoice } from "./use-invoice-mutations";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const save = (afterSave?: () => void) =>
    form.handleSubmit(
      async (values) => {
        try {
          const saved = await saveMutation.mutateAsync(toPayload(values));
          form.reset(toFormValues(saved));
          if (afterSave) {
            afterSave();
          } else if (!invoice) {
            allowLeave.current = true;
            toast.success(`Invoice ${saved.number} created`);
            navigate(`/invoices/${saved.id}`, { replace: true });
          }
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
        }
      },
      () => {
        // Close the leave dialog so the highlighted fields are visible.
        if (blocker.state === "blocked") blocker.reset();
        toast.error("Fix the highlighted fields to save");
      },
    )();

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
              <SaveStatus state={saveState} className="mr-1 hidden md:inline-flex" />
              <Tooltip content={`Save (${isMac ? "Cmd" : "Ctrl"}+S)`}>
                <Button
                  onClick={() => void save()}
                  disabled={saveMutation.isPending || (!isDirty && !!invoice)}
                >
                  <Save /> Save
                </Button>
              </Tooltip>
              <Button onClick={() => window.print()} className="hidden sm:inline-flex">
                <Printer /> Print
              </Button>
              <Button variant="primary">
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

        <div className="flex min-h-0 flex-1">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            aria-label="Invoice editor"
            className="w-[clamp(460px,42vw,600px)] shrink-0 overflow-y-auto border-r border-line bg-surface"
          >
            <InvoiceEditor />
          </form>
          <section aria-label="Invoice preview" className="min-w-0 flex-1 overflow-y-auto">
            <PreviewPane />
          </section>
        </div>
      </div>
      <PrintableInvoice />

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Leave without saving?"
        description="Your changes to this invoice haven't been saved."
        confirmLabel="Discard changes"
        onConfirm={() => blocker.proceed?.()}
        extra={
          <Button
            variant="primary"
            disabled={saveMutation.isPending}
            onClick={() => void save(() => blocker.proceed?.())}
          >
            Save and leave
          </Button>
        }
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete invoice ${invoice?.number ?? ""}?`}
        description="This permanently removes the invoice and its line items. It can't be undone."
        confirmLabel="Delete invoice"
        busy={deleteMutation.isPending}
        onConfirm={() => void deleteInvoice()}
      />
    </FormProvider>
  );
}

function InvoiceNumber() {
  const number = useWatch<InvoiceFormValues, "number">({ name: "number" });
  return (
    <h1 className="truncate num text-[13px] font-medium text-ink-2">{number || "Untitled"}</h1>
  );
}
