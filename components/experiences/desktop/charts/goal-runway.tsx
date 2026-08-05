import type { AppState } from "@/lib/db/queries/load-user-data";
import { formatMoney } from "../desktop-data";
import type { Currency } from "@/lib/finance/currency";

export function GoalRunway({
  goals,
  currency,
  locale,
  onSelect,
}: {
  goals: AppState["goals"];
  currency: Currency;
  locale: string;
  onSelect?: (id: string) => void;
}) {
  if (goals.length === 0) return <p className="desk-empty-inline">Create a goal to start a runway.</p>;

  return (
    <div className="desk-runways">
      {goals.map((goal) => {
        const progress = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
        return (
          <button key={goal.id} type="button" className="desk-runway" onClick={() => onSelect?.(goal.id)}>
            <span className="desk-runway__icon" style={{ color: goal.c }}>{goal.icon}</span>
            <span className="desk-runway__copy">
              <strong>{goal.name}</strong>
              <span>{formatMoney(goal.saved, currency, locale)} of {formatMoney(goal.target, currency, locale)}</span>
            </span>
            <span className="desk-runway__track" aria-hidden="true">
              <i style={{ width: `${progress}%`, background: goal.c }} />
              <b style={{ left: `${progress}%` }} />
            </span>
            <span className="desk-runway__value">{progress}%</span>
          </button>
        );
      })}
    </div>
  );
}
