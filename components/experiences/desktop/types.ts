import type { AppState } from "@/lib/db/queries/load-user-data";
import type { Currency } from "@/lib/finance/currency";
import type { DesktopSection } from "@/lib/presentation/experience";

export type DesktopSelection =
  | { kind: "transaction"; id: string }
  | { kind: "account"; id: string }
  | { kind: "budget"; id: string }
  | { kind: "goal"; id: string }
  | { kind: "recurring"; id: string }
  | null;

export type DesktopCreateAction =
  | "expense"
  | "income"
  | "account"
  | "transfer"
  | "goal"
  | "budget"
  | "recurring"
  | "mcp"
  | "integrations";

export type DesktopEditAction = {
  edit: "budget" | "account" | "goal" | "recurring";
  id: string;
};

export type DesktopAction = DesktopCreateAction | DesktopEditAction | null;

export type DesktopSectionProps = {
  state: AppState;
  section: DesktopSection;
  currency: Currency;
  onSelect: (selection: DesktopSelection) => void;
  onAction: (action: DesktopAction) => void;
};
