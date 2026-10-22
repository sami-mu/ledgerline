import { ArrowDown, ArrowUp, Copy, EllipsisVertical, Plus, Trash2, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { emptyLineItem } from "../form-mapping";
import { formatCents, lineTotalCents } from "../money";
import type { InvoiceFormValues } from "../schema";
import { EditorSection } from "./editor-section";
import { DecimalField, TextField } from "./form-fields";
import { useFieldError } from "./use-field-error";

const MAX_LINES = 100;

// One grid for header and rows so columns always line up.
const ROW_GRID =
  "grid grid-cols-3 gap-x-2 gap-y-2 @lg:grid-cols-[minmax(0,1fr)_3.75rem_6.25rem_5.75rem_3.5rem]";

export function LineItemsEditor() {
  const { control, getValues } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: "line_items" });
  const offerUndo = useUndoToast();

  const removeLine = (index: number) => {
    const removed = { ...getValues(`line_items.${index}`) };
    remove(index);
    offerUndo({
      message: "Line removed",
      detail: removed.description || undefined,
      onUndo: () => insert(Math.min(index, getValues("line_items").length), removed),
    });
  };
  const listError = useFieldError("line_items");

  const addLine = () =>
    append(emptyLineItem(), { focusName: `line_items.${fields.length}.description` });

  const onPriceKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && index === fields.length - 1 && fields.length < MAX_LINES) {
      event.preventDefault();
      addLine();
    }
  };

  return (
    <EditorSection
      id="line-items"
      title="Line items"
      description={
        <>
          Each line is rounded to the cent.{" "}
          <span className="max-sm:hidden">
            Press <Kbd>Enter</Kbd> in the last price to add a line.
          </span>
        </>
      }
    >
      <div className="@container">
        <div
          aria-hidden
          className={`${ROW_GRID} mb-1.5 hidden border-b border-line pb-1.5 text-ink-3 @lg:grid`}
        >
          <span className="label-caps">Description</span>
          <span className="text-right label-caps">Qty</span>
          <span className="text-right label-caps">Unit price</span>
          <span className="text-right label-caps">Amount</span>
          <span />
        </div>

        {fields.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center">
            <p className="text-[13px] font-medium">No line items yet</p>
            <p className="mt-0.5 text-xs text-ink-3">Add what you're billing for.</p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {fields.map((field, index) => (
              <li key={field.id} className="border-b border-line py-2.5 last:border-b-0 @lg:py-1.5">
                <div className={ROW_GRID}>
                  <TextField
                    name={`line_items.${index}.description`}
                    label={<LineLabel index={index} text="Description" />}
                    labelClassName="@lg:sr-only"
                    placeholder="What you did or sold"
                    autoComplete="off"
                    className="col-span-2 @lg:col-span-1"
                  />
                  <DecimalField
                    name={`line_items.${index}.quantity`}
                    label={<LineLabel index={index} text="Qty" />}
                    labelClassName="@lg:sr-only"
                    placeholder="0"
                  />
                  <DecimalField
                    name={`line_items.${index}.unit_price`}
                    label={<LineLabel index={index} text="Unit price" />}
                    labelClassName="@lg:sr-only"
                    prefix="$"
                    placeholder="0.00"
                    onKeyDown={onPriceKeyDown(index)}
                  />
                  <LineAmount index={index} />
                  <div className="col-start-3 row-start-1 flex items-end justify-end @lg:col-start-auto @lg:row-start-auto @lg:items-start">
                    <LineActions
                      index={index}
                      count={fields.length}
                      onMove={(to) => move(index, to)}
                      onDuplicate={(values) => insert(index + 1, values)}
                      onRemove={() => removeLine(index)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {listError && <p className="mt-2 text-xs text-danger">{listError}</p>}

        <Button
          variant="ghost"
          size="sm"
          onClick={addLine}
          disabled={fields.length >= MAX_LINES}
          className="mt-2 -ml-2 text-accent hover:bg-accent-soft hover:text-accent-ink"
        >
          <Plus /> Add line
        </Button>
      </div>
    </EditorSection>
  );
}

function LineLabel({ index, text }: { index: number; text: string }) {
  return (
    <>
      <span className="sr-only">Line {index + 1} </span>
      {text}
    </>
  );
}

function LineAmount({ index }: { index: number }) {
  const [quantity = "", unitPrice = ""] = useWatch<InvoiceFormValues>({
    name: [`line_items.${index}.quantity`, `line_items.${index}.unit_price`],
  }) as [string?, string?];
  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden className="text-right text-xs font-medium text-ink-2 @lg:hidden">
        Amount
      </span>
      <output
        aria-label={`Line ${index + 1} amount`}
        className="flex h-8 items-center justify-end num text-[13px] text-ink"
      >
        {formatCents(lineTotalCents(quantity, unitPrice))}
      </output>
    </div>
  );
}

type LineActionsProps = {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onDuplicate: (values: InvoiceFormValues["line_items"][number]) => void;
  onRemove: () => void;
};

function LineActions({ index, count, onMove, onDuplicate, onRemove }: LineActionsProps) {
  const { getValues } = useFormContext<InvoiceFormValues>();
  const label = `line ${index + 1}`;
  return (
    <div className="flex h-8 items-center">
      <DropdownMenu>
        <Tooltip content="More actions">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${label}`}>
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
          <DropdownMenuItem onSelect={() => onDuplicate({ ...getValues(`line_items.${index}`) })}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger" onSelect={onRemove}>
            <Trash2 /> Remove line
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip content="Remove line">
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onClick={onRemove}>
          <X />
        </Button>
      </Tooltip>
    </div>
  );
}
