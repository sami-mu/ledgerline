import { CircleAlert } from "lucide-react";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type FieldProps = {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  /** Hide the label visually but keep it for screen readers. */
  srOnlyLabel?: boolean;
  labelClassName?: string;
  children: ReactElement<ControlProps>;
};

export function Field({
  label,
  error,
  hint,
  optional,
  className,
  srOnlyLabel,
  labelClassName,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = children.props.id ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className={cn(srOnlyLabel && "sr-only", labelClassName)}>
        {label}
        {optional && <span className="ml-1 font-normal text-ink-3">optional</span>}
      </Label>
      {isValidElement(children) &&
        cloneElement(children, {
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
        })}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-xs leading-4 text-danger"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs leading-4 text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
