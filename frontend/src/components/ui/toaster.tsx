import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[356px] max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3 text-[13px] text-ink shadow-pop",
          title: "font-medium",
          description: "mt-0.5 text-ink-3",
          icon: "mt-px [&_svg]:size-4",
          success: "[&_[data-icon]]:text-accent",
          error: "[&_[data-icon]]:text-danger",
        },
      }}
    />
  );
}
