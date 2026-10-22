import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { InvoiceOut } from "@/api/invoices";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteInvoice, useRestoreInvoice } from "@/hooks/api/use-invoice-mutations";
import { showUndoToast } from "@/lib/undo";

type Props = {
  invoice: InvoiceOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called before leaving the deleted invoice, so the leave guard lets it through. */
  onDeleted: () => void;
};

/** Confirm, then soft delete; Undo restores it for a few seconds. */
export function InvoiceDeleteAction({ invoice, open, onOpenChange, onDeleted }: Props) {
  const navigate = useNavigate();
  const deleteMutation = useDeleteInvoice();
  const restoreMutation = useRestoreInvoice();

  const restore = async (id: number, number: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success(`Invoice ${number} restored`, {
        action: { label: "Open", onClick: () => navigate(`/invoices/${id}`) },
      });
    } catch (error) {
      toast.error("Couldn't restore the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const remove = async () => {
    const { id, number } = invoice;
    try {
      await deleteMutation.mutateAsync(id);
      onDeleted();
      onOpenChange(false);
      navigate("/invoices", { replace: true });
      showUndoToast({ message: `Invoice ${number} deleted`, onUndo: () => restore(id, number) });
    } catch (error) {
      toast.error("Couldn't delete the invoice", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      title={`Delete invoice ${invoice.number}?`}
      description="The invoice will be removed from your list. You can undo this for a few seconds afterwards."
      confirm={{
        label: "Delete invoice",
        busy: deleteMutation.isPending,
        onClick: () => void remove(),
      }}
    />
  );
}
