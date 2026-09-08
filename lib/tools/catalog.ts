import { accountToolDefs } from "@/lib/mcp/tools/accounts";
import { categoryToolDefs } from "@/lib/mcp/tools/categories";
import { expenseToolDefs } from "@/lib/mcp/tools/expenses";
import { goalToolDefs } from "@/lib/mcp/tools/goals";
import { incomeToolDefs } from "@/lib/mcp/tools/income";
import { profileToolDefs } from "@/lib/mcp/tools/profile";
import { recurringToolDefs } from "@/lib/mcp/tools/recurring";
import { savingsToolDefs } from "@/lib/mcp/tools/savings";
import { summaryToolDefs } from "@/lib/mcp/tools/summaries";
import type { AnyToolDef } from "@/lib/mcp/tools/helpers";

export function getFinanceToolDefs(): AnyToolDef[] {
  return [
    ...profileToolDefs,
    ...accountToolDefs,
    ...expenseToolDefs,
    ...categoryToolDefs,
    ...summaryToolDefs,
    ...goalToolDefs,
    ...incomeToolDefs,
    ...recurringToolDefs,
    ...savingsToolDefs,
  ];
}
