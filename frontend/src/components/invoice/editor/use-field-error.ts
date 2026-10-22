import { get, useFormState, type FieldPath } from "react-hook-form";
import type { InvoiceFormValues } from "@/form-schemas/invoice";

export function useFieldError(name: FieldPath<InvoiceFormValues>): string | undefined {
  const { errors } = useFormState<InvoiceFormValues>({ name });
  return get(errors, name)?.message as string | undefined;
}
