import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names — resolves conflicting Tailwind utilities sanely. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
