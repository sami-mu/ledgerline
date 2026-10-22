import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom text size so it is not dropped as a color.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["2xs"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
