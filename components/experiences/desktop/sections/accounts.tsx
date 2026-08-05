import { ArrowLeftRight, CreditCard, Landmark, Plus } from "lucide-react";
import { formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function AccountsSection({ state, currency, query, onSelect, onAction, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const accounts = state.accounts.filter((item) => item.currency === currency && item.name.toLowerCase().includes(query.toLowerCase()));
  const liquid = accounts.filter((item) => item.type !== "card");
  const cards = accounts.filter((item) => item.type === "card");
  const total = liquid.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className="desk-section">
      <div className="desk-section-heading">
        <div><span className="desk-eyebrow">accounts / registry</span><h1>{copy.accounts}</h1></div>
        <div className="desk-heading-actions"><button type="button" className="desk-secondary-button" onClick={() => onAction("transfer")}><ArrowLeftRight size={15} /> {copy.transfer}</button><button type="button" className="desk-primary-button" onClick={() => onAction("account")}><Plus size={15} /> {copy.addAccount}</button></div>
      </div>
      <section className="desk-account-summary" aria-label={copy.availableBalance}>
        <span>liquidity.total --currency={currency}</span><strong>{formatMoney(total, currency, locale)}</strong><small>{liquid.length} active accounts · {cards.length} cards</small>
      </section>
      <AccountGroup title="Cash & bank" icon={<Landmark size={16} />} items={liquid} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "account", id })} />
      <AccountGroup title="Cards" icon={<CreditCard size={16} />} items={cards} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "account", id })} />
    </div>
  );
}

function AccountGroup({ title, icon, items, currency, locale, onSelect }: { title: string; icon: React.ReactNode; items: Array<{ id: string; name: string; type: string; balance: number; color: string; icon: string; last4: string | null; creditLimit: number | null }>; currency: "USD" | "PEN"; locale: string; onSelect: (id: string) => void }) {
  return (
    <section className="desk-panel desk-account-group">
      <div className="desk-panel-heading"><div className="desk-inline-title">{icon}<h2>{title}</h2></div><span className="desk-panel-note">{items.length} records</span></div>
      {items.length ? <div className="desk-account-grid">{items.map((item) => {
        const utilization = item.creditLimit ? Math.max(0, Math.min(100, Math.round((Math.abs(item.balance) / item.creditLimit) * 100))) : null;
        return <button key={item.id} type="button" className="desk-account-row" onClick={() => onSelect(item.id)}>
          <span className="desk-account-mark" style={{ color: item.color, borderColor: item.color }}>{item.icon}</span>
          <span><strong>{item.name}</strong><small>{item.type}{item.last4 ? ` · •••• ${item.last4}` : ""}</small></span>
          {utilization != null && <span className="desk-account-util"><i style={{ width: `${utilization}%` }} /><small>{utilization}% used</small></span>}
          <b>{formatMoney(item.balance, currency, locale)}</b>
        </button>;
      })}</div> : <p className="desk-empty-inline">No accounts in {currency}.</p>}
    </section>
  );
}
