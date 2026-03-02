import type { TxType } from "./types";

export function uid(): string {
  return crypto.randomUUID?.() ?? (Math.random().toString(16).slice(2) + "-" + Date.now().toString(16));
}

export function monthKeyFromDate(dateStr: string): string {
  const m = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr.slice(0, 7) : "";
  return m || currentMonthKey();
}

export function currentMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = Math.max(1, Math.min(12, Number(m))) - 1;
  return `${monthNames[idx]}/${y}`;
}

export const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function parseMoneyBR(raw: string): number {
  let s = String(raw ?? "").trim();
  if (!s) return 0;
  s = s.replace(/[R$\s]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");
  }
  s = s.replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function moneyInputValue(n: number): string {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  return v.toFixed(2).replace(".", ",");
}

export function signedAmount(type: TxType, amount: number): number {
  if (type === "income") return Math.abs(amount);
  if (type === "expense") return -Math.abs(amount);
  return Math.abs(amount);
}
