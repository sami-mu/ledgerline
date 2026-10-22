import type { ComponentProps, KeyboardEvent, ReactNode } from "react";
import { Controller, useFormContext, type FieldPath } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";
import { controlStyles } from "@/components/ui/styles";
import { cn } from "@/lib/utils";
import { sanitizeDecimalInput } from "../money";
import type { InvoiceFormValues } from "../schema";
import { useFieldError } from "./use-field-error";

type Name = FieldPath<InvoiceFormValues>;

type Common = {
  name: Name;
  label: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  srOnlyLabel?: boolean;
  labelClassName?: string;
  className?: string;
};

export function TextField({
  name,
  label,
  hint,
  optional,
  srOnlyLabel,
  labelClassName,
  className,
  ...input
}: Common & Omit<ComponentProps<"input">, "name">) {
  const { register } = useFormContext<InvoiceFormValues>();
  return (
    <Field
      label={label}
      hint={hint}
      optional={optional}
      srOnlyLabel={srOnlyLabel}
      labelClassName={labelClassName}
      error={useFieldError(name)}
      className={className}
    >
      <Input {...input} {...register(name)} />
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  optional,
  srOnlyLabel,
  className,
  ...textarea
}: Common & Omit<ComponentProps<"textarea">, "name">) {
  const { register } = useFormContext<InvoiceFormValues>();
  return (
    <Field
      label={label}
      hint={hint}
      optional={optional}
      srOnlyLabel={srOnlyLabel}
      error={useFieldError(name)}
      className={className}
    >
      <Textarea {...textarea} {...register(name)} />
    </Field>
  );
}

type DecimalProps = Common & {
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function DecimalField({
  name,
  label,
  hint,
  optional,
  srOnlyLabel,
  labelClassName,
  className,
  prefix,
  suffix,
  placeholder,
  onKeyDown,
}: DecimalProps) {
  const { control } = useFormContext<InvoiceFormValues>();
  const error = useFieldError(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field
          label={label}
          hint={hint}
          optional={optional}
          srOnlyLabel={srOnlyLabel}
          labelClassName={labelClassName}
          error={error}
          className={className}
        >
          <AffixInput
            ref={field.ref}
            name={field.name}
            value={String(field.value ?? "")}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(sanitizeDecimalInput(event.target.value))}
            onKeyDown={onKeyDown}
            prefix={prefix}
            suffix={suffix}
            placeholder={placeholder}
            inputMode="decimal"
            autoComplete="off"
          />
        </Field>
      )}
    />
  );
}

function AffixInput({
  prefix,
  suffix,
  className,
  ...props
}: ComponentProps<"input"> & { prefix?: string; suffix?: string }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[13px] text-ink-3">
          {prefix}
        </span>
      )}
      <Input
        {...props}
        className={cn("text-right num", prefix && "pl-6", suffix && "pr-7", className)}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[13px] text-ink-3">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function DateField({
  name,
  label,
  hint,
  optional,
  className,
  min,
  onPick,
}: Common & { min?: string; onPick?: (value: string) => void }) {
  const { control } = useFormContext<InvoiceFormValues>();
  const error = useFieldError(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} hint={hint} optional={optional} error={error} className={className}>
          <DatePicker
            ref={field.ref}
            name={field.name}
            value={String(field.value ?? "")}
            onChange={(value) => {
              field.onChange(value);
              onPick?.(value);
            }}
            onBlur={field.onBlur}
            min={min}
          />
        </Field>
      )}
    />
  );
}

/** Native select, for keyboard and mobile pickers. */
export function SelectField({
  name,
  label,
  hint,
  className,
  options,
  onValueChange,
}: Common & {
  options: readonly { value: string; label: string }[];
  onValueChange?: (value: string) => void;
}) {
  const { register } = useFormContext<InvoiceFormValues>();
  const registered = register(name, {
    onChange: (event: { target: { value: string } }) => onValueChange?.(event.target.value),
  });
  return (
    <Field label={label} hint={hint} error={useFieldError(name)} className={className}>
      <SelectControl {...registered}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectControl>
    </Field>
  );
}

/** The select receives Field's id and aria props directly, so its label stays attached. */
function SelectControl({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(controlStyles, "h-8 cursor-pointer appearance-none pr-8 pl-2.5", className)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}
