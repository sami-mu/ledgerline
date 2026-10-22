import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatIsoDate } from "@/lib/dates";
import { formatCents, formatDecimal, lineTotalCents, type Totals } from "@/lib/money";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { termsLabel } from "@/lib/terms";

type Props = {
  values: InvoiceFormValues;
  totals: Totals;
  paidOn?: string;
  className?: string;
};

/** The invoice document, for preview and print. Hidden custom fields never appear. */
export function InvoicePaper({ values, totals, paidOn, className }: Props) {
  const customFields = values.custom_fields.filter((f) => f.visible && f.label.trim());
  const lines = values.line_items;
  const dueDate = formatIsoDate(values.due_date);
  const taxRate = formatDecimal(values.tax_rate || "0");

  return (
    <article
      aria-label={`Invoice ${values.number}`}
      className={cn(
        "invoice-paper flex w-[816px] flex-col bg-white px-16 pt-14 pb-12 text-[12.5px] leading-[1.55] text-ink",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-10">
        <div className="min-w-0">
          <p className="text-[19px] leading-tight font-semibold tracking-[-0.02em]">
            <Value placeholder="Your business">{values.business_name}</Value>
          </p>
          <Address text={values.business_address} email={values.business_email} />
        </div>
        <div className="shrink-0 text-right">
          <p className="label-caps text-ink-3">Invoice</p>
          <p className="mt-1 num text-[19px] leading-tight font-medium">
            <Value placeholder="INV-0000">{values.number}</Value>
          </p>
        </div>
      </header>
      <section className="mt-12 grid grid-cols-[1.05fr_1.25fr_0.9fr] gap-8 border-t border-ink pt-5">
        <div className="min-w-0">
          <h3 className="mb-2 label-caps text-ink-3">Billed to</h3>
          <p className="font-medium">
            <Value placeholder="Customer name">{values.customer_name}</Value>
          </p>
          <Address text={values.customer_address} email={values.customer_email} />
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 label-caps text-ink-3">Details</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
            <Detail label="Issued" value={formatIsoDate(values.issue_date)} />
            <Detail label="Due" value={dueDate} />
            {termsLabel(values.payment_terms) && (
              <Detail label="Terms" value={termsLabel(values.payment_terms)} />
            )}
            {customFields.map((field, index) => (
              <Detail key={`${field.label}-${index}`} label={field.label} value={field.value} />
            ))}
          </dl>
        </div>

        <div className="text-right">
          <h3 className="mb-2 label-caps text-ink-3">{paidOn ? "Amount paid" : "Amount due"}</h3>
          <p className="num text-[24px] leading-none font-medium tracking-[-0.02em] text-accent-ink">
            {formatCents(totals.total)}
          </p>
          {paidOn ? (
            <p className="mt-2 inline-flex rounded-sm bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-accent-ink uppercase">
              Paid {formatIsoDate(paidOn)}
            </p>
          ) : (
            dueDate && <p className="mt-2 text-ink-3">Due {dueDate}</p>
          )}
        </div>
      </section>
      <table className="mt-12 w-full border-collapse">
        <thead>
          <tr className="border-b border-ink text-left text-ink-3">
            <th scope="col" className="pb-2 label-caps font-medium">
              Description
            </th>
            <th scope="col" className="w-20 pb-2 text-right label-caps font-medium">
              Qty
            </th>
            <th scope="col" className="w-32 pb-2 text-right label-caps font-medium">
              Unit price
            </th>
            <th scope="col" className="w-32 pb-2 text-right label-caps font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr className="print:hidden">
              <td colSpan={4} className="py-6 text-center text-ink-4">
                Line items you add will appear here.
              </td>
            </tr>
          )}
          {lines.map((line, index) => (
            <tr key={index} className="break-inside-avoid border-b border-line align-top">
              <td className="py-2.5 pr-6">
                <Value placeholder="Description">{line.description}</Value>
              </td>
              <td className="py-2.5 text-right num">{formatDecimal(line.quantity)}</td>
              <td className="py-2.5 text-right num">
                {formatCents(lineTotalCents("1", line.unit_price))}
              </td>
              <td className="py-2.5 text-right num">
                {formatCents(lineTotalCents(line.quantity, line.unit_price))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="mt-6 flex break-inside-avoid justify-end">
        <dl className="w-72">
          <TotalRow label="Subtotal" value={formatCents(totals.subtotal)} />
          {totals.discount > 0n && (
            <TotalRow label="Discount" value={`-${formatCents(totals.discount)}`} />
          )}
          <TotalRow label={`Tax (${taxRate}%)`} value={formatCents(totals.tax)} />
          <div className="mt-2 flex items-baseline justify-between border-t border-ink pt-2.5">
            <dt className="font-semibold">Total due</dt>
            <dd className="num text-[15px] font-medium">{formatCents(totals.total)}</dd>
          </div>
        </dl>
      </section>
      <div className="mt-auto pt-14">
        {values.notes.trim() && (
          <section className="max-w-[60ch] break-inside-avoid">
            <h3 className="mb-1.5 label-caps text-ink-3">Notes</h3>
            <p className="whitespace-pre-line text-ink-2">{values.notes.trim()}</p>
          </section>
        )}
        <footer className="mt-10 flex justify-between border-t border-line pt-3 text-[11px] text-ink-3">
          <span>{values.business_name}</span>
          <span>
            <span className="num">{values.number}</span>
            {dueDate && ` · Due ${dueDate}`}
          </span>
        </footer>
      </div>
    </article>
  );
}

/** Shows the value, or a muted placeholder on screen only (never printed). */
function Value({ children, placeholder }: { children: string; placeholder: string }) {
  if (children.trim()) return <>{children}</>;
  return <span className="text-ink-4 print:hidden">{placeholder}</span>;
}

function Address({ text, email }: { text: string; email: string }) {
  if (!text.trim() && !email.trim()) return null;
  return (
    <div className="mt-1.5 text-ink-2">
      {text.trim() && <p className="whitespace-pre-line">{text.trim()}</p>}
      {email.trim() && <p>{email.trim()}</p>}
    </div>
  );
}

function Detail({ label, value }: { label: ReactNode; value: string }) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{value || <span className="text-ink-4">-</span>}</dd>
    </>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <dt className="text-ink-2">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
