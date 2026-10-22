import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { InvoiceOut } from "@/api/invoices";
import { InvoiceActionsMenu } from "@/components/invoice/actions/invoice-actions-menu";
import { InvoicePaymentActions } from "@/components/invoice/actions/invoice-payment-actions";
import { InvoiceSendAction } from "@/components/invoice/actions/invoice-send-action";
import { InvoiceEditor } from "@/components/invoice/editor/invoice-editor";
import { PreviewPane, PrintableInvoice } from "@/components/invoice/preview/preview-pane";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { invoiceFormSchema, type InvoiceFormValues } from "@/form-schemas/invoice";
import { cn } from "@/lib/utils";
import { MobileBar, type PaneView } from "./mobile-bar";
import { useLeaveGuard } from "./use-leave-guard";
import { useSaveInvoiceFlow } from "./use-save-invoice-flow";
import { WorkspaceTopBar } from "./workspace-top-bar";

type Props = {
  invoice?: InvoiceOut;
  defaultValues: InvoiceFormValues;
};

export function InvoiceWorkspace({ invoice, defaultValues }: Props) {
  const form = useForm<InvoiceFormValues>({
    defaultValues,
    resolver: zodResolver(invoiceFormSchema),
    mode: "onTouched",
  });
  const { isDirty } = form.formState;
  const leave = useLeaveGuard(isDirty);
  const flow = useSaveInvoiceFlow({
    form,
    invoice,
    allowLeave: leave.allowLeave,
    cancelLeave: leave.cancelLeave,
  });
  const [sendOpen, setSendOpen] = useState(false);
  const [view, setView] = useState<PaneView>("edit");
  const paidOn = invoice?.paid_on ?? undefined;

  return (
    <FormProvider {...form}>
      <div className="flex h-dvh flex-col print:hidden">
        <WorkspaceTopBar
          invoice={invoice}
          saveState={flow.saveState}
          canSave={flow.canSave}
          onSave={flow.requestSave}
          onSend={() => setSendOpen(true)}
          actions={<InvoiceActionsMenu invoice={invoice} onDeleted={leave.allowLeave} />}
        />
        {invoice && (
          <InvoicePaymentActions
            invoice={invoice}
            isDirty={isDirty}
            onResend={() => setSendOpen(true)}
          />
        )}

        <main className="flex min-h-0 flex-1">
          <form
            id="invoice-editor"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              flow.requestSave();
            }}
            aria-label="Invoice editor"
            className={cn(
              "relative w-full shrink-0 scroll-pane overflow-y-auto bg-surface lg:w-[clamp(460px,42vw,600px)] lg:border-r lg:border-line",
              view === "preview" && "max-lg:hidden",
            )}
          >
            {/* A disabled fieldset locks every control at once for paid invoices. */}
            <fieldset disabled={invoice?.status === "paid"} className="m-0 min-w-0 border-0 p-0">
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
            <PreviewPane paidOn={paidOn} />
          </section>
        </main>

        <MobileBar view={view} onViewChange={setView} saveState={flow.saveState} />
      </div>
      <PrintableInvoice paidOn={paidOn} />

      <InvoiceSendAction
        invoice={invoice}
        open={sendOpen}
        onOpenChange={setSendOpen}
        persist={flow.persist}
        openSaved={flow.openSaved}
      />
      <ConfirmDialog
        open={leave.blocker.state === "blocked"}
        onOpenChange={(open) => !open && leave.blocker.reset?.()}
        tone="warning"
        title="Leave without saving?"
        description="Your changes to this invoice haven't been saved. Save them before you go, or discard them."
        confirm={{
          label: "Save and leave",
          busy: flow.isSaving,
          onClick: () => void flow.save(() => leave.blocker.proceed?.()),
        }}
        alternative={{ label: "Discard changes", onClick: () => leave.blocker.proceed?.() }}
      />
      <ConfirmDialog
        open={flow.sentEdit.open}
        onOpenChange={flow.sentEdit.onOpenChange}
        tone="warning"
        title="Save changes to a sent invoice?"
        description={`${invoice?.number ?? "This invoice"} was already sent${
          invoice?.last_sent_to ? ` to ${invoice.last_sent_to}` : ""
        }. Saving updates your copy only. Resend it afterwards so your customer has the latest version.`}
        confirm={{ label: "Save changes", busy: flow.isSaving, onClick: flow.sentEdit.confirm }}
      />
    </FormProvider>
  );
}
