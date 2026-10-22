import { CircleCheck, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/api/client";
import { type InvoiceOut } from "@/api/invoices";
import { formatMoney } from "@/lib/money";
import { isoDate } from "@/components/invoice/form-mapping";

type Props = {
  invoice: InvoiceOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paidOn: string) => Promise<void>;
};

export function MarkPaidDialog({ invoice, open, onOpenChange, onConfirm }: Props) {
  // The parent remounts this dialog each time it opens (via `key`), so state starts fresh.
  const [today] = useState(() => isoDate(new Date()));
  const [paidOn, setPaidOn] = useState(today);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm(paidOn);
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.fieldErrors.paid_on ?? err.message) : "Couldn't save that.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        title={`Mark ${invoice.number} as paid`}
        description={`Record that ${invoice.customer_name} paid ${formatMoney(invoice.totals.total)}. The invoice is then locked.`}
        className="max-w-md"
      >
        <div className="px-6 pt-5 pb-6">
          <Field label="Payment date" error={error}>
            <DatePicker value={paidOn} onChange={setPaidOn} min={invoice.issue_date} max={today} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !paidOn}>
            {busy ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
            Mark as paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
