import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center rounded-full",
        "bg-line-strong transition-colors duration-150 data-[state=checked]:bg-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-3.5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)]",
          "transition-transform duration-150 data-[state=checked]:translate-x-[14px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
