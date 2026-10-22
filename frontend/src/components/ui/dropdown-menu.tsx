import { DropdownMenu as Menu } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-44 animate-pop-in rounded-md border border-line bg-surface p-1 shadow-pop",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone = "default",
  ...props
}: ComponentProps<typeof Menu.Item> & { tone?: "default" | "danger" }) {
  return (
    <Menu.Item
      className={cn(
        "flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-[13px] outline-none select-none",
        "data-[disabled]:opacity-45 [&_svg]:size-4 [&_svg]:text-ink-3",
        tone === "danger"
          ? "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger"
          : "text-ink data-[highlighted]:bg-sunken",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="-mx-1 my-1 h-px bg-line" />;
}
