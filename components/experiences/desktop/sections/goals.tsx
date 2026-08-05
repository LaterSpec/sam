import { Flag, Plus, Vault } from "lucide-react";
import { GoalRunway } from "../charts/goal-runway";
import { formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function GoalsSection({ state, currency, query, onSelect, onAction, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const goals = state.goals.filter((goal) => goal.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="desk-section">
    <div className="desk-section-heading"><div><span className="desk-eyebrow">goals / runway</span><h1>{copy.goals}</h1></div><button type="button" className="desk-primary-button" onClick={() => onAction("goal")}><Plus size={15} /> {copy.addGoal}</button></div>
    <section className="desk-panel"><div className="desk-panel-heading"><div className="desk-inline-title"><Flag size={16} /><h2>Goal runways</h2></div><span className="desk-panel-note">saved → target</span></div><GoalRunway goals={goals} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "goal", id })} /></section>
    <section className="desk-panel"><div className="desk-panel-heading"><div className="desk-inline-title"><Vault size={16} /><h2>Savings buckets</h2></div><span className="desk-panel-note">segmented reserves</span></div>{state.buckets.length ? <div className="desk-bucket-grid">{state.buckets.map((bucket) => { const pct = bucket.target > 0 ? Math.min(100, Math.round(bucket.balance / bucket.target * 100)) : 0; return <article key={bucket.id} className="desk-bucket"><span style={{ color: bucket.c }}>{bucket.icon}</span><div><strong>{bucket.name}</strong><small>{bucket.apy ? `${bucket.apy}% APY` : "Reserve"}</small></div><b>{formatMoney(bucket.balance, currency, locale)}</b><i><em style={{ width: `${pct}%`, background: bucket.c }} /></i><small>{pct}% of {formatMoney(bucket.target, currency, locale)}</small></article>; })}</div> : <p className="desk-empty-inline">No savings buckets yet.</p>}</section>
  </div>;
}
