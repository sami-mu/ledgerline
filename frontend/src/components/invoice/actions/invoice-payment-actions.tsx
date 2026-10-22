import { useState } from "react";
import { toast } from "sonner";
import type { InvoiceOut } from "@/api/invoices";
import { StatusBanner } from "@/components/invoice/status-banner";
import { useMarkPaid, useMarkUnpaid } from "@/hooks/api/use-invoice-mutations";
import { MarkPaidDialog } from "./mark-paid-dialog";

type Props = {
  invoice: InvoiceOut;
  isDirty: boolean;
  onResend: () => void;
};

/** The status banner and the payment actions it offers: mark paid and mark unpaid. */
export function InvoicePaymentActions({ invoice, isDirty, onResend }: Props) {
  const markPaidMutation = useMarkPaid();
  const markUnpaidMutation = useMarkUnpaid();
  const [markPaidOpen, setMarkPaidOpen] = useState(false);

  const markPaid = async (paidOn: string) => {
    const paid = await markPaidMutation.mutateAsync({ id: invoice.id, paidOn });
    setMarkPaidOpen(false);
    toast.success(`Invoice ${paid.number} marked as paid`);
  };

  const markUnpaid = async () => {
    try {
      await markUnpaidMutation.mutateAsync(invoice.id);
      toast.success(`Invoice ${invoice.number} is open again`);
    } catch (error) {
      toast.error("Couldn't update the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <>
      <StatusBanner
        invoice={invoice}
        isDirty={isDirty}
        busy={markPaidMutation.isPending || markUnpaidMutation.isPending}
        onMarkPaid={() => setMarkPaidOpen(true)}
        onMarkUnpaid={() => void markUnpaid()}
        onResend={onResend}
      />
      <MarkPaidDialog
        key={markPaidOpen ? "open" : "closed"}
        invoice={invoice}
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        onConfirm={markPaid}
      />
    </>
  );
}
