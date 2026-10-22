import { Pencil } from "lucide-react";
import { useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { InvoiceFormValues } from "@/form-schemas/invoice";
import { EditorSection } from "@/components/invoice/editor/editor-section";
import { TextAreaField, TextField } from "@/components/invoice/editor/form-fields";

/** Collapsed to a summary; opens when empty or invalid. */
export function FromSection() {
  const [name = "", email = "", address = ""] = useWatch<InvoiceFormValues>({
    name: ["business_name", "business_email", "business_address"],
  }) as [string?, string?, string?];
  const { errors } = useFormState<InvoiceFormValues>({
    name: ["business_name", "business_email", "business_address"],
  });
  const hasError = Boolean(
    errors.business_name || errors.business_email || errors.business_address,
  );
  const [opened, setOpened] = useState(false);
  const expanded = opened || hasError || !name.trim();

  const summary = [email.trim(), address.trim().split("\n")[0]].filter(Boolean).join(" · ");

  if (!expanded) {
    return (
      <EditorSection id="from" title="From" className="py-4">
        <div className="-mt-2 flex items-center justify-between gap-3 rounded-md border border-line bg-subtle px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{name}</p>
            {summary && <p className="truncate text-xs text-ink-3">{summary}</p>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setOpened(true)} className="shrink-0">
            <Pencil /> Edit
          </Button>
        </div>
      </EditorSection>
    );
  }

  return (
    <EditorSection
      id="from"
      title="From"
      description="Your business, as it appears on the invoice."
      action={
        name.trim() && !hasError ? (
          <Button size="sm" variant="ghost" onClick={() => setOpened(false)}>
            Done
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <TextField name="business_name" label="Business name" autoComplete="organization" />
        <TextField name="business_email" label="Email" type="email" optional autoComplete="email" />
        <TextAreaField
          name="business_address"
          label="Address"
          optional
          rows={2}
          className="@sm:col-span-2"
        />
      </div>
    </EditorSection>
  );
}
