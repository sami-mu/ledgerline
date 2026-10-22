import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { addDays } from "@/components/invoice/form-mapping";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { PAYMENT_TERMS, daysFromTerms } from "@/lib/terms";
import { EditorSection } from "@/components/invoice/editor/editor-section";
import { DateField, SelectField, TextField } from "@/components/invoice/editor/form-fields";

/** Number, dates and terms. Picking terms sets the due date; picking a date makes terms custom. */
export function DetailsSection() {
  const { setValue, getValues } = useFormContext<InvoiceFormValues>();
  const [issueDate = "", terms = "custom"] = useWatch<InvoiceFormValues>({
    name: ["issue_date", "payment_terms"],
  }) as [string?, string?];

  useEffect(() => {
    const days = daysFromTerms(terms);
    if (days === null || !issueDate) return;
    const due = addDays(issueDate, days);
    // Only touch the field when it actually changes, so opening an invoice doesn't make it dirty.
    if (getValues("due_date") !== due) {
      setValue("due_date", due, { shouldDirty: true, shouldValidate: true });
    }
  }, [issueDate, terms, getValues, setValue]);

  return (
    <EditorSection id="details" title="Invoice details">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <TextField name="number" label="Invoice number" autoComplete="off" spellCheck={false} />
        <DateField name="issue_date" label="Issue date" />
        <SelectField name="payment_terms" label="Payment terms" options={PAYMENT_TERMS} />
        <DateField
          name="due_date"
          label="Due date"
          min={issueDate}
          onPick={(picked) => {
            const days = daysFromTerms(getValues("payment_terms"));
            if (days === null || addDays(issueDate, days) !== picked) {
              setValue("payment_terms", "custom", { shouldDirty: true });
            }
          }}
        />
      </div>
    </EditorSection>
  );
}
