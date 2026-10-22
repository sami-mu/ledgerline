import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { InvoiceFormValues } from "../schema";
import { useTotals } from "../use-totals";

/**
 * Cross-field rules live on one field (discount, due date) but depend on others. Re-check them
 * when what they depend on changes, but only once the user has already seen that field's state.
 */
export function useDependentValidation() {
  const { trigger, getFieldState, formState } = useFormContext<InvoiceFormValues>();
  const { subtotal } = useTotals();
  const issueDate = useWatch<InvoiceFormValues, "issue_date">({ name: "issue_date" });

  useEffect(() => {
    const { isTouched, error } = getFieldState("discount", formState);
    if (isTouched || error || formState.isSubmitted) void trigger("discount");
    // formState is read through a proxy; subtotal is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  useEffect(() => {
    const { isTouched, error } = getFieldState("due_date", formState);
    if (isTouched || error || formState.isSubmitted) void trigger("due_date");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueDate]);
}
