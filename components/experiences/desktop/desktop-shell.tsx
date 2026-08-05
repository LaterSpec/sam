"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarClock, ChartNoAxesCombined, ChevronDown, Flag, Landmark, LayoutDashboard, LogOut, Menu, Plus, ReceiptText, Search, Settings, Tags, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions/data-actions";
import type { Currency } from "@/lib/finance/currency";
import type { DesktopSection } from "@/lib/presentation/experience";
import type { DesktopAction } from "./types";
import type { DesktopCopy } from "./desktop-copy";

const NAV: Array<{ label: string; items: Array<{ section: DesktopSection; icon: React.ReactNode; key: keyof DesktopCopy }> }> = [
  { label: "daily", items: [
    { section: "overview", icon: <LayoutDashboard size={15}/>, key: "overview" },
    { section: "transactions", icon: <ReceiptText size={15}/>, key: "transactions" },
    { section: "income", icon: <ArrowDownLeft size={15}/>, key: "income" },
    { section: "expenses", icon: <ArrowUpRight size={15}/>, key: "expenses" },
  ] },
  { label: "plan", items: [
    { section: "budgets", icon: <Tags size={15}/>, key: "budgets" },
    { section: "accounts", icon: <Landmark size={15}/>, key: "accounts" },
    { section: "goals", icon: <Flag size={15}/>, key: "goals" },
    { section: "recurring", icon: <CalendarClock size={15}/>, key: "recurring" },
  ] },
  { label: "review", items: [
    { section: "reports", icon: <ChartNoAxesCombined size={15}/>, key: "reports" },
    { section: "activity", icon: <Activity size={15}/>, key: "activity" },
  ] },
];

export function DesktopShell({ section, copy, query, currency, userName, hasInspector, children, inspector, actionDrawer, onQuery, onCurrency, onAction }: { section: DesktopSection; copy: DesktopCopy; query: string; currency: Currency; userName: string; hasInspector: boolean; children: React.ReactNode; inspector: React.ReactNode; actionDrawer: React.ReactNode; onQuery: (value: string) => void; onCurrency: (currency: Currency) => void; onAction: (action: DesktopAction) => void }) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable=true]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
      if (!editing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "n") { event.preventDefault(); onAction("expense"); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onAction]);

  return <div className={`desk-shell ${hasInspector ? "has-inspector" : ""}`}>
    <a href="#desk-main" className="desk-skip">Skip to content</a>
    <aside className="desk-index">
      <Link href="/app" className="desk-brand" aria-label="SAM home"><span>S</span><strong>SAM</strong><small>living ledger</small></Link>
      <nav aria-label="Primary">{NAV.map((group) => <div key={group.label} className="desk-nav-group"><span>{group.label}</span>{group.items.map((item) => <Link key={item.section} href={item.section === "overview" ? "/app" : `/app/${item.section}`} className={section === item.section ? "is-active" : ""} aria-current={section === item.section ? "page" : undefined}>{item.icon}<b>{copy[item.key]}</b><i/></Link>)}</div>)}</nav>
      <div className="desk-index-footer"><Link href="/app/settings" className={section === "settings" ? "is-active" : ""}><Settings size={15}/><b>{copy.settings}</b></Link><button type="button" onClick={async () => { await signOutAction(); window.location.assign("/onboarding"); }}><LogOut size={15}/><b>Sign out</b></button></div>
    </aside>

    <header className="desk-topbar">
      <button type="button" className="desk-menu-button" aria-label="Open navigation"><Menu size={17}/></button>
      <label className="desk-search"><Search size={15}/><input ref={searchRef} value={query} onChange={(event) => onQuery(event.target.value)} placeholder={copy.search}/><kbd>⌘K</kbd></label>
      <span className="desk-top-status"><i/> {copy.syncReady}</span>
      <label className="desk-currency"><span className="sr-only">{copy.currency}</span><select value={currency} onChange={(event) => onCurrency(event.target.value as Currency)}><option value="USD">USD</option><option value="PEN">PEN</option></select><ChevronDown size={12}/></label>
      <Link href="/app/settings" className="desk-user"><span><UserRound size={14}/></span><b>{userName}</b></Link>
    </header>

    <main id="desk-main" className="desk-main">{children}</main>
    {inspector}
    <footer className="desk-tray" aria-label={copy.actionTray}>
      <span className="desk-tray-label"><i>$</i> {copy.actionTray}</span>
      <TrayAction icon={<ArrowUpRight size={15}/>} label={copy.addExpense} shortcut="N" onClick={() => onAction("expense")}/>
      <TrayAction icon={<ArrowDownLeft size={15}/>} label={copy.addIncome} onClick={() => onAction("income")}/>
      <TrayAction icon={<ArrowLeftRight size={15}/>} label={copy.transfer} onClick={() => onAction("transfer")}/>
      <TrayAction icon={<Landmark size={15}/>} label={copy.addAccount} onClick={() => onAction("account")}/>
      <TrayAction icon={<Flag size={15}/>} label={copy.addGoal} onClick={() => onAction("goal")}/>
      <TrayAction icon={<CalendarClock size={15}/>} label={copy.addRecurring} onClick={() => onAction("recurring")}/>
      <button type="button" className="desk-tray-more" onClick={() => onAction("budget")} aria-label={copy.addBudget}><Plus size={16}/></button>
    </footer>
    {actionDrawer}
  </div>;
}

function TrayAction({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) { return <button type="button" onClick={onClick}>{icon}<span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>; }
