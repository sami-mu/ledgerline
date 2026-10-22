import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-100",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.18)] hover:bg-accent-hover active:bg-accent-ink",
        secondary:
          "border border-line-strong bg-surface text-ink hover:border-ink-4 hover:bg-subtle active:bg-sunken",
        ghost: "text-ink-2 hover:bg-sunken hover:text-ink active:bg-line",
        danger: "text-danger hover:bg-danger-soft",
      },
      size: {
        sm: "h-7 px-2.5 text-[13px]",
        md: "h-8 px-3 text-[13px]",
        lg: "h-10 px-4 text-sm",
        icon: "size-8",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...(!asChild && { type: props.type ?? "button" })}
      {...props}
    />
  );
}

export { buttonVariants };
