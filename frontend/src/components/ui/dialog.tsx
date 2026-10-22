import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay() {
  return (
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-ink/30 backdrop-blur-[1px]" />
  );
}

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  title: ReactNode;
  description?: ReactNode;
};

export function DialogContent({ className, title, description, children, ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2",
          "animate-pop-in rounded-lg border border-line bg-surface shadow-pop focus:outline-none",
          className,
        )}
        {...props}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-[13px] text-ink-3">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mt-1 -mr-2">
              <X />
            </Button>
          </DialogPrimitive.Close>
        </header>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** A dialog that slides in from the left, used for the invoice list. */
export function DrawerContent({ className, title, description, children, ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col",
          "animate-slide-in-left border-r border-line bg-surface shadow-pop focus:outline-none",
          className,
        )}
        {...props}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <DialogPrimitive.Title className="text-[15px] font-semibold tracking-[-0.01em]">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {description ?? title}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          </DialogPrimitive.Close>
        </header>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-2 border-t border-line bg-subtle px-5 py-3",
        "rounded-b-lg",
        className,
      )}
      {...props}
    />
  );
}
