import type { Dispatch, SetStateAction } from "react";
import type { AppState } from "@/lib/db/queries/load-user-data";

export type ClientAppState = AppState & {
  tab: string;
  homeTab: string;
  expTab: string;
  goalsTab: string;
  profileTab: string;
  selectedDay: number;
  selectedGoal: string | null;
  hiddenCards: string[];
};

export type SheetPayload =
  | { kind: "tx"; tx: AppState["expenses"][number] }
  | {
      kind: "category";
      cat: { key: string; icon: string; name: string; budget: number; c: string };
      spent: number;
      pct: number;
    }
  | { kind: "goal"; goal: AppState["goals"][number] }
  | { kind: "new-expense" }
  | { kind: "new-goal" }
  | { kind: "edit-budget"; budget: AppState["budgets"][number]; spent: number }
  | { kind: "new-budget" }
  | { kind: "income-src"; src: AppState["incomeSources"][number] | Record<string, unknown> }
  | { kind: "new-income" }
  | { kind: "new-recurring" }
  | { kind: "recurring-rule"; ruleId: string }
  | { kind: "account"; accountId: string }
  | { kind: "new-account" }
  | { kind: "edit-account"; accountId: string }
  | { kind: "transfer"; fromId?: string }
  | { kind: "change-credentials" }
  | { kind: "mcp-connect" }
  | { kind: "bucket"; bucket: AppState["buckets"][number] };

export type ScreenProps = {
  state: ClientAppState;
  setState: Dispatch<SetStateAction<ClientAppState>>;
  openSheet: (sheet: SheetPayload | null) => void;
};

export const SCREEN_PAD = "0 var(--screen-pad-x)" as const;
