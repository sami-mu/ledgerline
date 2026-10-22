import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlStyles } from "./styles";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input data-slot="input" className={cn(controlStyles, "h-8 px-2.5", className)} {...props} />
  );
}
