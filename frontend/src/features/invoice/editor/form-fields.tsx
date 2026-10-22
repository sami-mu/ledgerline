import type { ComponentProps, KeyboardEvent, ReactNode } from "react";
import { Controller, get, useFormContext, useFormState, type FieldPath } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sanitizeDecimalInput } from "../money";
import type { InvoiceFormValues } from "../schema";

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

export function useFieldError(name: Name): string | undefined {
  const { errors } = useFormState<InvoiceFormValues>({ name });
  return get(errors, name)?.message as string | undefined;
}

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

/** Numeric text input: digits and one dot only, right aligned in tabular figures. */
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
