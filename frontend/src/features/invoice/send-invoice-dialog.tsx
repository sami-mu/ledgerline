import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Send, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type SendInvoiceIn } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { formatIsoDate } from "./dates";
import { formatCents, type Totals } from "./money";
import type { InvoiceFormValues } from "./schema";

const sendSchema = z.object({
  to: z.string().trim().min(1, "Add a recipient").pipe(z.email("Enter a valid email address")),
  subject: z.string().trim().min(1, "Add a subject").max(200, "Keep it under 200 characters"),
  message: z.string().max(2000, "Keep the message under 2,000 characters"),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceFormValues;
  totals: Totals;
  /** True when the invoice has unsaved edits, which are saved before sending. */
  needsSave: boolean;
  onSend: (body: SendInvoiceIn) => Promise<void>;
};

function defaults(invoice: InvoiceFormValues, totals: Totals): SendInvoiceIn {
  const from = invoice.business_name.trim() || "us";
  const greeting = invoice.customer_name.trim() ? `Hi ${invoice.customer_name.trim()},` : "Hi,";
  const due = formatIsoDate(invoice.due_date);
  return {
    to: invoice.customer_email,
    subject: `Invoice ${invoice.number} from ${from}`,
    message: `${greeting}\n\nPlease find invoice ${invoice.number} for ${formatCents(totals.total)} attached${due ? `, due ${due}` : ""}.\n\nThank you,\n${from}`,
  };
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  totals,
  needsSave,
  onSend,
}: Props) {
  const health = useQuery({ queryKey: queryKeys.health, queryFn: api.health, enabled: open });
  const form = useForm<SendInvoiceIn>({
    resolver: zodResolver(sendSchema),
    defaultValues: defaults(invoice, totals),
  });
  const { errors, isSubmitting } = form.formState;

  // Fresh defaults every time the dialog opens, from the invoice as it is now.
  useEffect(() => {
    if (open) form.reset(defaults(invoice, totals));
    // Only on open: re-running on every keystroke in the editor would wipe the user's draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const emailOff = health.data?.email_configured === false;

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent
        title={`Send invoice ${invoice.number}`}
        description="Your customer gets a short email with the invoice attached as a PDF."
      >
        <form noValidate onSubmit={form.handleSubmit(onSend)} className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pt-5 pb-6">
            {emailOff && (
              <div
                role="alert"
                className="flex gap-2.5 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-[13px] text-warning"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  Email isn't set up on the server. Add the SMTP settings to{" "}
                  <code className="num text-xs">backend/.env</code> and restart the backend.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md bg-subtle px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-xs text-ink-3">Amount due</span>
                <span className="num text-[15px] font-medium">{formatCents(totals.total)}</span>
              </div>
              <div className="text-right text-xs text-ink-3">
                {invoice.customer_name || "No customer"}
                <br />
                Due {formatIsoDate(invoice.due_date) || "date not set"}
              </div>
            </div>

            <Field label="To" error={errors.to?.message}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="customer@example.com"
                {...form.register("to")}
              />
            </Field>
            <Field label="Subject" error={errors.subject?.message}>
              <Input {...form.register("subject")} />
            </Field>
            <Field label="Message" optional error={errors.message?.message}>
              <Textarea rows={6} {...form.register("message")} />
            </Field>
          </div>

          <DialogFooter className="sm:justify-between">
            <p className="text-xs text-ink-3">
              {needsSave ? "Your changes are saved first." : "Hidden custom fields are left out."}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || emailOff}>
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Send />}
                {isSubmitting ? "Sending" : needsSave ? "Save and send" : "Send invoice"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
