import type { AppState } from "@/lib/db/queries/load-user-data";
import type { Currency } from "@/lib/finance/currency";
import { budgetRows, formatMoney } from "../desktop-data";

export function BudgetPressure({
  state,
  currency,
  locale,
  onSelect,
}: {
  state: AppState;
  currency: Currency;
  locale: string;
  onSelect?: (id: string) => void;
}) {
  const rows = budgetRows(state, currency);

  if (rows.length === 0) {
    return <p className="desk-empty-inline">No budgets are configured for {currency}.</p>;
  }

  return (
    <div className="desk-table-wrap">
      <table className="desk-pressure-table">
        <caption className="sr-only">Budget use by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Used</th>
            <th scope="col">Difference</th>
            <th scope="col">Pressure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const percent = Math.round(row.ratio * 100);
            const level = percent >= 100 ? "risk" : percent >= 80 ? "pending" : "healthy";
            return (
              <tr key={row.id}>
                <th scope="row">
                  <button type="button" className="desk-table-link" onClick={() => onSelect?.(row.id)}>
                    <span style={{ color: row.c }}>{row.icon}</span>
                    {row.name}
                  </button>
                </th>
                <td>{percent}%</td>
                <td className={row.remaining < 0 ? "is-negative" : "is-positive"}>
                  {formatMoney(row.remaining, currency, locale)}
                </td>
                <td>
                  <span className={`desk-pressure desk-pressure--${level}`}>
                    <i style={{ width: `${Math.min(100, percent)}%` }} />
                    <span className="sr-only">{percent}%</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
