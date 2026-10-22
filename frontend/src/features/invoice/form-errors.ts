import type { FieldPath, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api/client";
import type { InvoiceFormValues } from "./schema";

/**
 * Puts server errors next to the fields they belong to. Returns true when every error found a
 * field, so the caller can skip the generic toast.
 */
export function applyServerErrors(
  error: unknown,
  setError: UseFormSetError<InvoiceFormValues>,
): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === "conflict") {
    setError("number", { type: "server", message: error.message }, { shouldFocus: true });
    return true;
  }
  const entries = Object.entries(error.fieldErrors);
  entries.forEach(([path, message], index) =>
    setError(
      path as FieldPath<InvoiceFormValues>,
      { type: "server", message },
      { shouldFocus: index === 0 },
    ),
  );
  return entries.length > 0;
}
