import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | { toString(): string } | null | undefined, currency: string = "MWK") {
  const num = amount == null ? 0 : typeof amount === "string" || typeof amount === "number" 
    ? Number(amount) 
    : Number(amount.toString());
  
  if (isNaN(num)) return `${currency} 0`;

  const symbols: Record<string, string> = {
    MWK: "MWK ",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };
  const symbol = symbols[currency] || currency + " ";
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function calculateProgress(raised: number | string | { toString(): string }, target: number | string | { toString(): string }) {
  const r = typeof raised === "string" || typeof raised === "number" ? Number(raised) : Number(raised.toString());
  const t = typeof target === "string" || typeof target === "number" ? Number(target) : Number(target.toString());
  if (!t || t <= 0 || isNaN(t)) return 0;
  if (isNaN(r)) return 0;
  return Math.min(100, Math.round((r / t) * 100));
}
