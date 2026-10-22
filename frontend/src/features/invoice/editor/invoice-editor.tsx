import type { InvoiceEvent } from "@/lib/api/client";
import { ActivityLog } from "./activity-log";
import { AdjustmentsEditor } from "./adjustments-editor";
import { CustomFieldsEditor } from "./custom-fields-editor";
import { CustomerNameField } from "./customer-name-field";
import { DetailsSection } from "./details-section";
import { EditorSection } from "./editor-section";
import { TextAreaField, TextField } from "./form-fields";
import { FromSection } from "./from-section";
import { LineItemsEditor } from "./line-items-editor";
import { useDependentValidation } from "./use-dependent-validation";

export function InvoiceEditor({ events }: { events?: InvoiceEvent[] }) {
  useDependentValidation();
  return (
    <div className="@container">
      <FromSection />

      <EditorSection id="bill-to" title="Bill to">
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
          <CustomerNameField />
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
      <DetailsSection />
      <CustomFieldsEditor />

      <EditorSection
        id="notes"
        title="Notes"
        description="Thank you note, bank details, anything else for your customer."
      >
        <TextAreaField name="notes" label="Notes" srOnlyLabel optional rows={3} />
      </EditorSection>
      {events && <ActivityLog events={events} />}
    </div>
  );
}
