import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency: string = "MWK") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbols: Record<string, string> = {
    MWK: "MWK ",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };
  const symbol = symbols[currency] || currency + " ";
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function calculateProgress(raised: number | string, target: number | string) {
  const r = typeof raised === "string" ? parseFloat(raised) : raised;
  const t = typeof target === "string" ? parseFloat(target) : target;
  if (t <= 0) return 0;
  return Math.min(100, Math.round((r / t) * 100));
}
