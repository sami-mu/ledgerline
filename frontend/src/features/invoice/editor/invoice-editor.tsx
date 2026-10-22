import { AdjustmentsEditor } from "./adjustments-editor";
import { CustomFieldsEditor } from "./custom-fields-editor";
import { EditorSection } from "./editor-section";
import { TextAreaField, TextField } from "./form-fields";
import { LineItemsEditor } from "./line-items-editor";

export function InvoiceEditor() {
  return (
    <div className="@container">
      <EditorSection id="details" title="Invoice">
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-3">
          <TextField name="number" label="Invoice number" autoComplete="off" spellCheck={false} />
          <TextField name="issue_date" label="Issue date" type="date" />
          <TextField name="due_date" label="Due date" type="date" />
        </div>
      </EditorSection>

      <EditorSection
        id="from"
        title="From"
        description="Your business, as it appears on the invoice."
      >
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
          <TextField name="business_name" label="Business name" autoComplete="organization" />
          <TextField
            name="business_email"
            label="Email"
            type="email"
            optional
            autoComplete="email"
          />
          <TextAreaField
            name="business_address"
            label="Address"
            optional
            rows={2}
            className="@sm:col-span-2"
          />
        </div>
      </EditorSection>

      <EditorSection id="bill-to" title="Bill to">
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
          <TextField name="customer_name" label="Customer name" autoComplete="off" />
          <TextField
            name="customer_email"
            label="Email"
            type="email"
            optional
            hint="Used when you send the invoice."
            autoComplete="off"
          />
          <TextAreaField
            name="customer_address"
            label="Address"
            optional
            rows={2}
            className="@sm:col-span-2"
          />
        </div>
      </EditorSection>

      <LineItemsEditor />
      <AdjustmentsEditor />
      <CustomFieldsEditor />

      <EditorSection
        id="notes"
        title="Notes"
        description="Payment terms, thank you note, bank details."
      >
        <TextAreaField name="notes" label="Notes" srOnlyLabel optional rows={3} />
      </EditorSection>
    </div>
  );
}
