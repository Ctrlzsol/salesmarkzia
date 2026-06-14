import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getActiveCurrency = (): { code: string; symbol: string; locale: string } => {
  return { code: "JOD", symbol: "د.أ", locale: "en-US" };
};

export const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} د.أ`;
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercent = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
};
