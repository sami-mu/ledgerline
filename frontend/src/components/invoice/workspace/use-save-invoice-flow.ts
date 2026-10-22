import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { InvoiceOut } from "@/api/invoices";
import { applyServerErrors } from "@/components/invoice/form-errors";
import { toFormValues, toPayload } from "@/components/invoice/form-mapping";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { useSaveInvoice } from "@/hooks/api/use-invoice-mutations";
import type { SaveState } from "./save-status";

type Options = {
  form: UseFormReturn<InvoiceFormValues>;
  invoice?: InvoiceOut;
  allowLeave: () => void;
  cancelLeave: () => void;
};

export function useSaveInvoiceFlow({ form, invoice, allowLeave, cancelLeave }: Options) {
  const navigate = useNavigate();
  const mutation = useSaveInvoice(invoice?.id);
  const [confirmSentEdit, setConfirmSentEdit] = useState(false);
  const { isDirty } = form.formState;
  const isPaid = invoice?.status === "paid";

  /** Resolves to the saved invoice, or null if it couldn't be saved. */
  const persist = () =>
    new Promise<InvoiceOut | null>((resolve) => {
      void form.handleSubmit(
        async (values) => {
          try {
            const saved = await mutation.mutateAsync(toPayload(values));
            form.reset(toFormValues(saved));
            resolve(saved);
          } catch (error) {
            cancelLeave();
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
          cancelLeave();
          toast.error("Fix the highlighted fields to save");
          resolve(null);
        },
      )();
    });

  const openSaved = (saved: InvoiceOut) => {
    allowLeave();
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

  const requestSaveRef = useRef(requestSave);
  useEffect(() => {
    requestSaveRef.current = requestSave;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        requestSaveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const saveState: SaveState = mutation.isPending
    ? { kind: "saving" }
    : mutation.isError && isDirty
      ? { kind: "error" }
      : isDirty
        ? { kind: "dirty" }
        : invoice
          ? { kind: "saved", at: invoice.updated_at }
          : { kind: "new" };

  return {
    persist,
    save,
    requestSave,
    openSaved,
    saveState,
    isSaving: mutation.isPending,
    canSave: !mutation.isPending && !isPaid && (isDirty || !invoice),
    sentEdit: {
      open: confirmSentEdit,
      onOpenChange: setConfirmSentEdit,
      confirm: () => {
        setConfirmSentEdit(false);
        void save();
      },
    },
  };
}
