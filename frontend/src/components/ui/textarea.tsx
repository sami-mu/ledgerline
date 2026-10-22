import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlStyles } from "./styles";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlStyles, "min-h-16 resize-y px-2.5 py-1.5 leading-5", className)}
      {...props}
    />
  );
}
