import { z } from "zod";

export const moneySchema = z
  .number()
  .finite()
  .nonnegative()
  .max(999999999999)
  .transform((v) => Math.round(v * 100) / 100);

export const positiveMoneySchema = moneySchema.refine((v) => v > 0, "amount must be positive");
export const uuidSchema = z.string().uuid();
export const shortTextSchema = z.string().trim().min(1).max(120);
export const longTextSchema = z.string().trim().max(2000).optional();
export const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .optional();
export const symbolSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9.\-]{1,16}$/);

export const themeSchema = z.enum([
  "solarized-cream",
  "ayu-mirage",
  "catppuccin-latte",
  "github-light",
  "kanagawa",
  "ansi-dark",
  "ayu-light",
  "dark",
  "light",
]);

export const prefsSchema = z
  .object({
    notifications: z.boolean().default(true),
    biometric: z.boolean().default(true),
    theme: themeSchema.default("ayu-mirage"),
    rollover: z.boolean().default(false),
    accentHue: z.number().finite().min(0).max(360).optional(),
  })
  .strip();

export function cleanName(value: string, field = "name") {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} required`);
  return trimmed;
}

export function keyFromName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || `item-${crypto.randomUUID().slice(0, 8)}`;
}

export const ACCOUNT_TYPE_SET = new Set(["cash", "checking", "savings", "card"]);
