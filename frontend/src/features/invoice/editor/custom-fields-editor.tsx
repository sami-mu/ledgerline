import { ArrowDown, ArrowUp, EllipsisVertical, EyeOff, Plus, Trash2, X } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { cn } from "@/lib/utils";
import type { InvoiceFormValues } from "../schema";
import { EditorSection } from "./editor-section";
import { TextField } from "./form-fields";

const MAX_FIELDS = 30;
const SUGGESTIONS = ["PO number", "Project", "Tax ID", "Reference"];

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-2 @lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_2.75rem_3.5rem]";

export function CustomFieldsEditor() {
  const { control, getValues } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove, move, insert } = useFieldArray({
    control,
    name: "custom_fields",
  });
  const offerUndo = useUndoToast();

  const removeField = (index: number) => {
    const removed = { ...getValues(`custom_fields.${index}`) };
    remove(index);
    offerUndo({
      message: "Custom field removed",
      detail: removed.label || undefined,
      onUndo: () => insert(Math.min(index, getValues("custom_fields").length), removed),
    });
  };

  const add = (label = "") =>
    append(
      { label, value: "", visible: true },
      { focusName: `custom_fields.${fields.length}.${label ? "value" : "label"}` },
    );

  return (
    <EditorSection
      id="custom-fields"
      title="Custom fields"
      description="Extra details like a PO number. Hidden fields are kept but never printed."
    >
      <div className="@container">
        {fields.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong px-4 py-5">
            <p className="text-[13px] font-medium">No custom fields</p>
            <p className="mt-0.5 text-xs text-ink-3">Start from a common one or add your own.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((label) => (
                <Button key={label} size="sm" onClick={() => add(label)}>
                  <Plus /> {label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div
              aria-hidden
              className={`${ROW_GRID} mb-1.5 hidden border-b border-line pb-1.5 text-ink-3 @lg:grid`}
            >
              <span className="label-caps">Label</span>
              <span className="label-caps">Value</span>
              <span className="text-center label-caps">Show</span>
              <span />
            </div>
            <ol className="flex flex-col">
              {fields.map((field, index) => (
                <CustomFieldRow
                  key={field.id}
                  index={index}
                  count={fields.length}
                  onMove={(to) => move(index, to)}
                  onRemove={() => removeField(index)}
                />
              ))}
            </ol>
          </>
        )}

        {fields.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => add()}
            disabled={fields.length >= MAX_FIELDS}
            className="mt-2 -ml-2 text-accent hover:bg-accent-soft hover:text-accent-ink"
          >
            <Plus /> Add field
          </Button>
        )}
      </div>
    </EditorSection>
  );
}

type RowProps = {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
};

function CustomFieldRow({ index, count, onMove, onRemove }: RowProps) {
  const { control } = useFormContext<InvoiceFormValues>();
  const [label = "", visible = true] = useWatch<InvoiceFormValues>({
    name: [`custom_fields.${index}.label`, `custom_fields.${index}.visible`],
  }) as [string?, boolean?];
  const name = label.trim() || `field ${index + 1}`;

  return (
    <li className="border-b border-line py-2.5 last:border-b-0 @lg:py-1.5">
      <div className={ROW_GRID}>
        <TextField
          name={`custom_fields.${index}.label`}
          label={
            <>
              <span className="sr-only">Custom field {index + 1} </span>Label
            </>
          }
          labelClassName="@lg:sr-only"
          placeholder="Label"
          autoComplete="off"
          className={cn(!visible && "opacity-60")}
        />
        <div className="row-span-2 flex items-start justify-end gap-1 pt-[22px] @lg:contents">
          <div className="flex h-8 items-center justify-center @lg:order-3">
            <Controller
              control={control}
              name={`custom_fields.${index}.visible`}
              render={({ field }) => (
                <Tooltip content={field.value ? "Shown on invoice" : "Hidden from invoice"}>
                  <span className="inline-flex">
                    <Switch
                      ref={field.ref}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-label={`Show ${name} on invoice`}
                    />
                  </span>
                </Tooltip>
              )}
            />
          </div>
          <div className="flex h-8 items-center @lg:order-4">
            <DropdownMenu>
              <Tooltip content="More actions">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${name}`}>
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent>
                <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(index - 1)}>
                  <ArrowUp /> Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMove(index + 1)}>
                  <ArrowDown /> Move down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onSelect={onRemove}>
                  <Trash2 /> Remove field
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip content="Remove field">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${name}`}
                onClick={onRemove}
              >
                <X />
              </Button>
            </Tooltip>
          </div>
        </div>
        <TextField
          name={`custom_fields.${index}.value`}
          label={
            <>
              <span className="sr-only">Custom field {index + 1} </span>Value
            </>
          }
          labelClassName="@lg:sr-only"
          placeholder="Value"
          autoComplete="off"
          className={cn("@lg:order-2", !visible && "opacity-60")}
        />
      </div>
      {!visible && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-3">
          <EyeOff className="size-3.5" aria-hidden /> Hidden. Kept with the invoice, not printed or
          emailed.
        </p>
      )}
    </li>
  );
}
