/**
 * Shared formatting utilities used across all pages.
 * Numbers: comma-separated (1,000)
 * Currency: EGP suffix
 * Dates: DD/MM/YYYY
 */

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtCurrency(n: number): string {
  return `${fmtNum(Math.round(n))} EGP`;
}

export function fmtPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
