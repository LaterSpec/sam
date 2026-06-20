export const ACCOUNT_TYPES = [
  { key: "cash", label: "cash", color: "#56d364", defaultIcon: "◉" },
  { key: "card", label: "card", color: "#58a6ff", defaultIcon: "▣" },
  { key: "checking", label: "checking", color: "#39c5cf", defaultIcon: "◈" },
  { key: "savings", label: "savings", color: "#bc8cff", defaultIcon: "◎" },
] as const;

export type AccountTypeKey = (typeof ACCOUNT_TYPES)[number]["key"];

export const ACCOUNT_EMOJIS = [
  "◉",
  "▣",
  "◈",
  "◎",
  "◆",
  "●",
  "■",
  "▲",
  "✦",
  "✧",
  "⬡",
  "⬢",
  "⊞",
  "⊟",
  "⌂",
  "₿",
] as const;

const TYPE_MAP = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.key, t])) as Record<
  string,
  (typeof ACCOUNT_TYPES)[number]
>;

export function accountColor(type: string): string {
  return TYPE_MAP[type]?.color ?? "#58a6ff";
}

export function accountDefaultIcon(type: string): string {
  return TYPE_MAP[type]?.defaultIcon ?? "◉";
}

export function accountLabel(type: string): string {
  return TYPE_MAP[type]?.label ?? type;
}
