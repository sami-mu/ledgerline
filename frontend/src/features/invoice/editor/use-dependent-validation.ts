import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { InvoiceFormValues } from "../schema";
import { useTotals } from "../use-totals";

/** Re-check cross-field rules (discount, due date) when what they depend on changes. */
export function useDependentValidation() {
  const { trigger, getFieldState, formState } = useFormContext<InvoiceFormValues>();
  const { subtotal } = useTotals();
  const issueDate = useWatch<InvoiceFormValues, "issue_date">({ name: "issue_date" });

  useEffect(() => {
    const { isTouched, error } = getFieldState("discount", formState);
    if (isTouched || error || formState.isSubmitted) void trigger("discount");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  useEffect(() => {
    const { isTouched, error } = getFieldState("due_date", formState);
    if (isTouched || error || formState.isSubmitted) void trigger("due_date");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueDate]);
}
