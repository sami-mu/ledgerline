import { CircleAlert, CircleCheck, RotateCcw, Send, TriangleAlert } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { InvoiceOut } from "@/api/invoices";
import { cn } from "@/lib/utils";
import { daysBetween, formatIsoDate, formatTimestamp } from "@/lib/dates";
import { isoDate } from "@/components/invoice/form-mapping";

type Props = {
  invoice: InvoiceOut;
  /** Unsaved edits block payment changes, so the recorded state always matches what's saved. */
  isDirty: boolean;
  onMarkPaid: () => void;
  onMarkUnpaid: () => void;
  onResend: () => void;
  busy?: boolean;
};

const TONES = {
  neutral: "border-line bg-subtle text-ink-2 [&_[data-icon]]:text-ink-3",
  warning: "border-warning/20 bg-warning-soft text-warning [&_[data-icon]]:text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger [&_[data-icon]]:text-danger",
  success: "border-accent/15 bg-accent-soft text-accent-ink [&_[data-icon]]:text-accent",
};

export function StatusBanner({
  invoice,
  isDirty,
  onMarkPaid,
  onMarkUnpaid,
  onResend,
  busy,
}: Props) {
  const [today] = useState(() => isoDate(new Date()));
  if (invoice.status === "draft") return null;

  if (invoice.status === "paid") {
    return (
      <Banner
        tone="success"
        icon={<CircleCheck />}
        message={
          <>
            <strong className="font-semibold">
              Paid on {formatIsoDate(invoice.paid_on ?? "")}.
            </strong>{" "}
            Paid invoices are locked. Mark it as unpaid if you need to make changes.
          </>
        }
        actions={
          <BannerAction onClick={onMarkUnpaid} disabled={busy}>
            <RotateCcw /> Mark as unpaid
          </BannerAction>
        }
      />
    );
  }

  const overdueDays = invoice.is_overdue ? daysBetween(invoice.due_date, today) : 0;
  const tone = invoice.is_overdue ? "danger" : invoice.changed_since_sent ? "warning" : "neutral";
  const icon = invoice.is_overdue ? (
    <CircleAlert />
  ) : invoice.changed_since_sent ? (
    <TriangleAlert />
  ) : (
    <Send />
  );

  return (
    <Banner
      tone={tone}
      icon={icon}
      message={
        <>
          {invoice.is_overdue && (
            <strong className="font-semibold">
              Overdue by {overdueDays} {overdueDays === 1 ? "day" : "days"}.{" "}
            </strong>
          )}
          {invoice.sent_at && (
            <>
              Sent {formatTimestamp(invoice.sent_at)}
              {invoice.last_sent_to && (
                <>
                  {" "}
                  to <span className="font-medium">{invoice.last_sent_to}</span>
                </>
              )}
              .
            </>
          )}
          {invoice.changed_since_sent && (
            <> You've edited it since, so resend it to give your customer the latest version.</>
          )}
        </>
      }
      actions={
        <>
          {invoice.changed_since_sent && (
            <BannerAction onClick={onResend}>
              <Send /> Resend
            </BannerAction>
          )}
          <Tooltip content={isDirty ? "Save your changes first" : "Record a payment"}>
            <span className="inline-flex">
              <BannerAction onClick={onMarkPaid} disabled={isDirty || busy} primary>
                <CircleCheck /> Mark as paid
              </BannerAction>
            </span>
          </Tooltip>
        </>
      }
    />
  );
}

function Banner({
  tone,
  icon,
  message,
  actions,
}: {
  tone: keyof typeof TONES;
  icon: ReactNode;
  message: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b px-4 py-2 text-[13px] leading-5 print:hidden",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        TONES[tone],
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span data-icon aria-hidden className="mt-0.5 shrink-0 [&_svg]:size-4">
          {icon}
        </span>
        <p className="min-w-0">{message}</p>
      </div>
      <div className="flex shrink-0 gap-2 pl-6 sm:pl-0">{actions}</div>
    </div>
  );
}

function BannerAction({
  primary,
  ...props
}: ComponentProps<typeof Button> & { primary?: boolean }) {
  return <Button size="sm" variant={primary ? "primary" : "secondary"} {...props} />;
}
