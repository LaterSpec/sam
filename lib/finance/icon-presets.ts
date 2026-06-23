export type FinanceIconPreset = {
  key: string;
  label: string;
  icon: string;
  color: string;
};

export const BUDGET_ICON_PRESETS: FinanceIconPreset[] = [
  { key: "groceries", label: "Groceries", icon: "▦", color: "#40a02b" },
  { key: "rent", label: "Rent", icon: "⌂", color: "#b58900" },
  { key: "utilities", label: "Utilities", icon: "ϟ", color: "#268bd2" },
  { key: "transport", label: "Transport", icon: "⇄", color: "#73d0ff" },
  { key: "health", label: "Health", icon: "+", color: "#d20f39" },
  { key: "dining", label: "Dining", icon: "◒", color: "#ffa759" },
  { key: "entertainment", label: "Entertainment", icon: "◇", color: "#8839ef" },
  { key: "shopping", label: "Shopping", icon: "□", color: "#df8e1d" },
  { key: "savings", label: "Savings", icon: "◆", color: "#1a7f37" },
  { key: "education", label: "Education", icon: "⌁", color: "#0969da" },
  { key: "travel", label: "Travel", icon: "✈", color: "#209fb5" },
  { key: "subscriptions", label: "Subscriptions", icon: "⟳", color: "#8250df" },
  { key: "insurance", label: "Insurance", icon: "▣", color: "#586e75" },
  { key: "pets", label: "Pets", icon: "◌", color: "#cb4b16" },
  { key: "misc", label: "Misc", icon: "●", color: "#6e7781" },
];

export const GOAL_ICON_PRESETS: FinanceIconPreset[] = [
  { key: "emergency", label: "Emergency", icon: "▣", color: "#d20f39" },
  { key: "vacation", label: "Vacation", icon: "✦", color: "#209fb5" },
  { key: "car", label: "Car", icon: "▰", color: "#0969da" },
  { key: "house", label: "House", icon: "⌂", color: "#b58900" },
  { key: "education", label: "Education", icon: "⌁", color: "#8839ef" },
  { key: "investment", label: "Investment", icon: "▲", color: "#1a7f37" },
  { key: "tech", label: "Tech", icon: "▤", color: "#268bd2" },
  { key: "wedding", label: "Wedding", icon: "♡", color: "#d33682" },
  { key: "business", label: "Business", icon: "▧", color: "#9a6700" },
  { key: "debt", label: "Debt payoff", icon: "▼", color: "#cf222e" },
  { key: "gift", label: "Gift", icon: "◇", color: "#df8e1d" },
  { key: "retirement", label: "Retirement", icon: "◈", color: "#40a02b" },
  { key: "health", label: "Health", icon: "+", color: "#d20f39" },
  { key: "travel", label: "Travel", icon: "✈", color: "#73d0ff" },
  { key: "custom", label: "Custom", icon: "◆", color: "#6e7781" },
];

