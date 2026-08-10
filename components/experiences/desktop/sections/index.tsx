import type { Currency } from "@/lib/finance/currency";
import type { Lang } from "@/lib/i18n/i18n-context";
import type { SamTheme } from "@/lib/theme/sam-theme";
import { AccountsSection } from "./accounts";
import { BudgetsSection } from "./budgets";
import { GoalsSection } from "./goals";
import { LedgerSection } from "./ledger";
import { OverviewSection } from "./overview";
import { RecurringSection } from "./recurring";
import { ReportsSection } from "./reports";
import { SettingsSection } from "./settings";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

type Props = DesktopSectionProps & {
  copy: DesktopCopy;
  locale: string;
  theme: SamTheme;
  language: Lang;
  onTheme: (theme: SamTheme) => void;
  onLanguage: (language: Lang) => void;
  onCurrency: (currency: Currency) => void;
};

export function DesktopSectionContent(props: Props) {
  if (props.section === "overview") return <OverviewSection {...props} />;
  if (props.section === "transactions" || props.section === "activity") return <LedgerSection {...props} />;
  if (props.section === "accounts") return <AccountsSection {...props} />;
  if (props.section === "budgets") return <BudgetsSection {...props} />;
  if (props.section === "goals") return <GoalsSection {...props} />;
  if (props.section === "recurring") return <RecurringSection {...props} />;
  if (props.section === "reports") return <ReportsSection {...props} />;
  return <SettingsSection state={props.state} theme={props.theme} language={props.language} currency={props.currency} copy={props.copy} onTheme={props.onTheme} onLanguage={props.onLanguage} onCurrency={props.onCurrency} onMcp={() => props.onAction("mcp")} />;
}
