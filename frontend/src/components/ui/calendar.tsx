import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

/** Month calendar (react-day-picker), styled entirely with the app's tokens. */
export function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col",
        month: "flex flex-col gap-2",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-[13px] font-semibold tracking-[-0.005em] text-ink",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40",
        button_next:
          "grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-9 pb-1 text-center text-2xs font-medium text-ink-3",
        week: "mt-0.5 flex",
        day: "size-9 p-0 text-center",
        day_button: cn(
          "num size-9 rounded-md text-[13px] text-ink transition-colors",
          "hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent",
        ),
        selected:
          "[&>button]:bg-accent [&>button]:font-medium [&>button]:text-white [&>button]:hover:bg-accent-hover",
        today:
          "[&>button]:font-semibold [&>button]:text-accent [&[aria-selected]>button]:text-white",
        outside: "[&>button]:text-ink-4",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          ),
      }}
      {...props}
    />
  );
}
