"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarClock, ChartNoAxesCombined, ChevronDown, Flag, Landmark, LayoutDashboard, LogOut, Menu, ReceiptText, Search, Settings, Tags, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions/data-actions";
import type { Currency } from "@/lib/finance/currency";
import type { DesktopSection } from "@/lib/presentation/experience";
import { allTransactions, formatMoney, transactionCurrency } from "./desktop-data";
import type { DesktopCopy } from "./desktop-copy";
import type { DesktopAction, DesktopSelection } from "./types";
import type { AppState } from "@/lib/db/queries/load-user-data";

const NAV: Array<{ label: string; items: Array<{ section: DesktopSection; icon: React.ReactNode; key: keyof DesktopCopy }> }> = [
  { label: "daily", items: [
    { section: "overview", icon: <LayoutDashboard size={15}/>, key: "overview" },
    { section: "transactions", icon: <ReceiptText size={15}/>, key: "transactions" },
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

export function DesktopShell({
  section,
  copy,
  query,
  currency,
  locale,
  state,
  userName,
  hasInspector,
  children,
  inspector,
  actionDrawer,
  onQuery,
  onCurrency,
  onAction,
  onSelect,
}: {
  section: DesktopSection;
  copy: DesktopCopy;
  query: string;
  currency: Currency;
  locale: string;
  state: AppState;
  userName: string;
  hasInspector: boolean;
  children: React.ReactNode;
  inspector: React.ReactNode;
  actionDrawer: React.ReactNode;
  onQuery: (value: string) => void;
  onCurrency: (currency: Currency) => void;
  onAction: (action: DesktopAction) => void;
  onSelect: (selection: DesktopSelection) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchHits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return allTransactions(state)
      .filter((tx) => transactionCurrency(state, tx) === currency)
      .filter((tx) => `${tx.name} ${tx.category} ${tx.source ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [currency, query, state]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable=true]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (!editing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        onAction("expense");
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onAction]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    window.addEventListener("mousedown", handlePointer);
    return () => window.removeEventListener("mousedown", handlePointer);
  }, []);

  return <div className={`desk-shell ${hasInspector ? "has-inspector" : ""}`}>
    <a href="#desk-main" className="desk-skip">Skip to content</a>
    <aside className="desk-index">
      <Link href="/app" className="desk-brand" aria-label="SAM home"><span>S</span><strong>SAM</strong><small>living ledger</small></Link>
      <nav aria-label="Primary">{NAV.map((group) => <div key={group.label} className="desk-nav-group"><span>{group.label}</span>{group.items.map((item) => <Link key={item.section} href={item.section === "overview" ? "/app" : `/app/${item.section}`} className={section === item.section ? "is-active" : ""} aria-current={section === item.section ? "page" : undefined}>{item.icon}<b>{copy[item.key]}</b><i/></Link>)}</div>)}</nav>
      <div className="desk-index-footer"><Link href="/app/settings" className={section === "settings" ? "is-active" : ""}><Settings size={15}/><b>{copy.settings}</b></Link><button type="button" onClick={async () => { await signOutAction(); window.location.assign("/onboarding"); }}><LogOut size={15}/><b>Sign out</b></button></div>
    </aside>

    <header className="desk-topbar">
      <button type="button" className="desk-menu-button" aria-label="Open navigation"><Menu size={17}/></button>
      <div className="desk-search-wrap" ref={searchWrapRef}>
        <label className="desk-search">
          <Search size={15}/>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => { onQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder={copy.search}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={searchOpen && query.trim().length > 0}
            aria-controls="desk-search-results"
            aria-haspopup="listbox"
          />
          <kbd>⌘K</kbd>
        </label>
        {searchOpen && query.trim() ? (
          searchHits.length ? (
            <ul id="desk-search-results" className="desk-search-results" role="listbox">
              {searchHits.map((tx) => (
                <li key={tx.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onSelect({ kind: "transaction", id: tx.id });
                      onQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <i style={{ color: tx.catColor }}>{tx.icon}</i>
                    <span>
                      <strong>{tx.name}</strong>
                      <small>{tx.category} · {new Date(tx.occurred_at).toLocaleDateString(locale, { month: "short", day: "2-digit" })}</small>
                    </span>
                    <b className={tx.kind === "income" ? "is-positive" : undefined}>
                      {tx.kind === "income" ? "+" : "−"}{formatMoney(tx.amount, currency, locale)}
                    </b>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div id="desk-search-results" className="desk-search-results desk-search-empty" role="status">{copy.noSearchResults}</div>
          )
        ) : null}
      </div>
      <span className="desk-top-status"><i/> {copy.syncReady}</span>
      <label className="desk-currency"><span className="sr-only">{copy.currency}</span><select value={currency} onChange={(event) => onCurrency(event.target.value as Currency)}><option value="USD">USD</option><option value="PEN">PEN</option></select><ChevronDown size={12}/></label>
      <Link href="/app/settings" className="desk-user"><span><UserRound size={14}/></span><b>{userName}</b></Link>
    </header>

    <main id="desk-main" className="desk-main">{children}</main>
    {inspector}
    <footer className="desk-tray" aria-label={copy.actionTray}>
      <TrayAction icon={<ArrowUpRight size={15}/>} label={copy.addExpense} shortcut="N" onClick={() => onAction("expense")}/>
      <TrayAction icon={<ArrowDownLeft size={15}/>} label={copy.addIncome} onClick={() => onAction("income")}/>
      <TrayAction icon={<ArrowLeftRight size={15}/>} label={copy.transfer} onClick={() => onAction("transfer")}/>
      <TrayAction icon={<Landmark size={15}/>} label={copy.addAccount} onClick={() => onAction("account")}/>
      <TrayAction icon={<Flag size={15}/>} label={copy.addGoal} onClick={() => onAction("goal")}/>
      <TrayAction icon={<CalendarClock size={15}/>} label={copy.addRecurring} onClick={() => onAction("recurring")}/>
      <TrayAction icon={<Tags size={15}/>} label={copy.addBudget} onClick={() => onAction("budget")}/>
    </footer>
    {actionDrawer}
  </div>;
}

function TrayAction({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}>{icon}<span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>;
}
