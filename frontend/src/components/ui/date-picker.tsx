import { CalendarDays } from "lucide-react";
import { useState, type Ref } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { controlStyles } from "./styles";

type Props = {
  /** ISO calendar date, "YYYY-MM-DD", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  ref?: Ref<HTMLButtonElement>;
  /** Earliest selectable date (ISO). Earlier days are greyed out. */
  min?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const display = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function parseIsoDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

function toIso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Button that opens a themed calendar. Same size and states as a text input. */
export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  placeholder = "Pick a date",
  ref,
  ...trigger
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const minDate = min ? parseIsoDate(min) : undefined;
  const [today] = useState(() => toIso(new Date()));
  const todayAllowed = !min || today >= min;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          {...trigger}
          className={cn(
            controlStyles,
            "flex h-8 items-center justify-between gap-2 px-2.5 text-left",
            "data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--color-accent-soft)]",
            !selected && "text-ink-4",
          )}
        >
          <span className="truncate">{selected ? display.format(selected) : placeholder}</span>
          <CalendarDays className="size-4 shrink-0 text-ink-3" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(date) => {
            if (date) onChange(toIso(date));
            setOpen(false);
          }}
          autoFocus
        />
        <div className="flex justify-between border-t border-line px-3 py-2">
          <button
            type="button"
            disabled={!todayAllowed}
            onClick={() => {
              onChange(today);
              setOpen(false);
            }}
            className="rounded-sm px-1.5 py-1 text-xs font-medium text-accent hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-40"
          >
            Today
          </button>
          <span className="py-1 text-xs text-ink-3">
            {selected ? display.format(selected) : "No date"}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
