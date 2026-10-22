import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useId, useState, type KeyboardEvent, type Ref } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { controlStyles } from "@/components/ui/styles";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, type Customer } from "@/lib/api/client";
import { queryKeys } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { InvoiceFormValues } from "../schema";
import { useFieldError } from "./use-field-error";

/** Customer name with suggestions from past customers (WAI-ARIA combobox). */
export function CustomerNameField() {
  const { control, setValue } = useFormContext<InvoiceFormValues>();
  const error = useFieldError("customer_name");

  const choose = (customer: Customer) => {
    const options = { shouldDirty: true, shouldValidate: true } as const;
    setValue("customer_name", customer.name, options);
    setValue("customer_email", customer.email, options);
    setValue("customer_address", customer.address, options);
  };

  return (
    <Controller
      control={control}
      name="customer_name"
      render={({ field }) => (
        <Field label="Customer name" error={error}>
          <CustomerCombobox
            ref={field.ref}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            onChoose={choose}
          />
        </Field>
      )}
    />
  );
}

type ComboboxProps = {
  ref?: Ref<HTMLInputElement>;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onChoose: (customer: Customer) => void;
  // Supplied by <Field>.
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function CustomerCombobox({
  ref,
  value,
  onChange,
  onBlur,
  onChoose,
  ...inputProps
}: ComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = useDebouncedValue(value.trim(), 200);

  const suggestions = useQuery({
    queryKey: queryKeys.customers(query),
    queryFn: ({ signal }) => api.searchCustomers(query, 6, signal),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const options = open ? (suggestions.data ?? []) : [];
  const expanded = options.length > 0;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = (customer: Customer) => {
    onChoose(customer);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        setActive((i) => (options.length ? (i + 1) % options.length : -1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
        break;
      case "Enter": {
        const option = options[active];
        if (expanded && option) {
          event.preventDefault();
          pick(option);
        }
        break;
      }
      case "Escape":
        if (expanded) {
          event.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={ref}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          close();
          onBlur();
        }}
        onKeyDown={onKeyDown}
        className={cn(controlStyles, "h-8 px-2.5")}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Previous customers"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 animate-pop-in overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-pop"
      >
        <li role="presentation" className="px-2 pt-1 pb-1.5 text-xs text-ink-3">
          {query ? "Matching customers" : "Recent customers"}
        </li>
        {options.map((customer, index) => (
          <li
            key={customer.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            // Keep focus in the input so the field never blurs mid-choice.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => pick(customer)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5",
              index === active && "bg-sunken",
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink">
                <Highlight text={customer.name} query={query} />
              </span>
              {customer.email && (
                <span className="block truncate text-xs text-ink-3">
                  <Highlight text={customer.email} query={query} />
                </span>
              )}
            </span>
            <span className="shrink-0 num text-xs text-ink-3">
              {customer.invoice_count} {customer.invoice_count === 1 ? "invoice" : "invoices"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-accent-ink">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}
