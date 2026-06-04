import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function isoDay(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);
}

export function fmtMoneyShort(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${v.toFixed(a < 10 ? 2 : 0)}`;
}

export function formatDateLong(d = new Date()): string {
  return d.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(d = new Date()): string {
  return d.toLocaleDateString("en", { month: "long", year: "numeric" });
}

export function dayOfMonth(iso: string): number {
  return new Date(iso).getDate();
}
