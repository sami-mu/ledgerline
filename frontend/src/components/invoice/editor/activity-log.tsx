import type { InvoiceEvent } from "@/api/invoices";
import { cn } from "@/lib/utils";
import { formatIsoDate, formatTimestamp } from "@/lib/dates";
import { EditorSection } from "@/components/invoice/editor/editor-section";

function describe(event: InvoiceEvent): string {
  switch (event.kind) {
    case "created":
      return "Invoice created";
    case "edited_after_sent":
      return "Edited after it was sent";
    case "sent":
      return `Sent to ${event.detail}`;
    case "resent":
      return `Resent to ${event.detail}`;
    case "paid":
      return `Marked as paid, payment on ${formatIsoDate(event.detail)}`;
    case "reopened":
      return "Marked as unpaid";
  }
}

const DOT: Record<InvoiceEvent["kind"], string> = {
  created: "bg-ink-4",
  edited_after_sent: "bg-warning",
  sent: "bg-ink-2",
  resent: "bg-ink-2",
  paid: "bg-accent",
  reopened: "bg-ink-4",
};

export function ActivityLog({ events }: { events: InvoiceEvent[] }) {
  return (
    <EditorSection id="activity" title="Activity">
      {events.length === 0 ? (
        <p className="text-xs text-ink-3">No activity recorded yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3px] before:w-px before:bg-line">
          {events.map((event) => (
            <li key={event.id} className="relative flex gap-3 pl-0">
              <span
                aria-hidden
                className={cn("relative mt-1.5 size-[7px] shrink-0 rounded-full", DOT[event.kind])}
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] text-ink">{describe(event)}</span>
                <time dateTime={event.created_at} className="text-xs text-ink-3">
                  {formatTimestamp(event.created_at)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </EditorSection>
  );
}
