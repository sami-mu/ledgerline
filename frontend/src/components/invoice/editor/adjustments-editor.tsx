import { useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatCents, formatDecimal } from "@/lib/money";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { useTotals } from "@/components/invoice/use-totals";
import { EditorSection } from "@/components/invoice/editor/editor-section";
import { DecimalField } from "@/components/invoice/editor/form-fields";

export function AdjustmentsEditor() {
  const totals = useTotals();
  const taxRate = useWatch<InvoiceFormValues, "tax_rate">({ name: "tax_rate" });

  return (
    <EditorSection
      id="adjustments"
      title="Discount and tax"
      description="The discount comes off the subtotal first. Tax is charged on what remains."
    >
      <div className="grid grid-cols-2 gap-3">
        <DecimalField name="discount" label="Discount" prefix="$" placeholder="0.00" />
        <DecimalField name="tax_rate" label="Tax rate" suffix="%" placeholder="0" />
      </div>

      <dl className="mt-5 flex flex-col gap-1.5 rounded-md bg-subtle px-4 py-3 text-[13px]">
        <Row label="Subtotal" value={formatCents(totals.subtotal)} />
        <Row
          label="Discount"
          value={totals.discount ? `-${formatCents(totals.discount)}` : formatCents(0n)}
          muted={!totals.discount}
        />
        <Row
          label={`Tax (${formatDecimal(taxRate || "0")}%)`}
          value={formatCents(totals.tax)}
          muted={!totals.tax}
        />
        <div className="mt-1 flex items-baseline justify-between border-t border-line-strong pt-2">
          <dt className="font-semibold">Total due</dt>
          <dd className="num text-[15px] font-medium" aria-live="polite">
            {formatCents(totals.total)}
          </dd>
        </div>
      </dl>
    </EditorSection>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className={cn("num", muted && "text-ink-3")}>{value}</dd>
    </div>
  );
}
