import { useFormState, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { InvoiceOut, SendInvoiceIn } from "@/api/invoices";
import { useTotals } from "@/components/invoice/use-totals";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { useSendInvoice } from "@/hooks/api/use-invoice-mutations";
import { SendInvoiceDialog } from "./send-invoice-dialog";

type Props = {
  invoice?: InvoiceOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saves pending edits first; resolves to null if saving failed. */
  persist: () => Promise<InvoiceOut | null>;
  openSaved: (saved: InvoiceOut) => void;
};

/** The send dialog, fed with live form values. Unsaved edits are saved before sending. */
export function InvoiceSendAction({ invoice, open, onOpenChange, persist, openSaved }: Props) {
  const values = useWatch<InvoiceFormValues>() as InvoiceFormValues;
  const { isDirty } = useFormState<InvoiceFormValues>();
  const totals = useTotals();
  const sendMutation = useSendInvoice();

  const send = async (body: SendInvoiceIn) => {
    const target = invoice && !isDirty ? invoice : await persist();
    if (!target) {
      onOpenChange(false);
      return;
    }
    // Keep the URL in step with the saved invoice even if sending then fails.
    if (!invoice) openSaved(target);
    try {
      const sent = await sendMutation.mutateAsync({ id: target.id, body });
      onOpenChange(false);
      toast.success(`Invoice ${sent.number} sent`, { description: `Sent to ${body.to}` });
    } catch (error) {
      toast.error("Couldn't send the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <SendInvoiceDialog
      open={open}
      onOpenChange={onOpenChange}
      invoice={values}
      totals={totals}
      needsSave={isDirty || !invoice}
      onSend={send}
    />
  );
}
