import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPeriod(d: Date): string {
  const str = format(d, "MMM-yy", { locale: es });
  return str.charAt(0).toUpperCase() + str.slice(1);
}
