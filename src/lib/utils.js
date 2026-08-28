import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui class combiner — used by src/components/ui/*
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
