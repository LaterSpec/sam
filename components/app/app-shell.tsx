"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { SamThemeProvider, SHELL_THEME_VARS } from "@/lib/theme/sam-theme";
import { BottomNav, BootScreen } from "@/components/app/bottom-nav";
import { BottomSheet } from "@/components/app/bottom-sheet";
import {
  HomeScreen,
  ActivityScreen,
  AccountsScreen,
  ExpensesScreen,
  IncomeScreen,
  BudgetScreen,
  InvestScreen,
  MarketScreen,
  AnalysisScreen,
  GoalsScreen,
  SavingsScreen,
  ProfileScreen,
  StatsScreen,
  HelpScreen,
  AjustesScreen,
  type ClientAppState,
  type SheetPayload,
} from "@/components/screens";
import type { AppState } from "@/lib/db/queries/load-user-data";
import {
  fetchUserDataAction,
  fetchMarketQuotesAction,
  recordSnapshotAction,
  updatePrefsAction,
} from "@/lib/actions/data-actions";
import { portfolioValue } from "@/lib/market/build-market";
import { Mono } from "@/components/ui/sam-primitives";
import { useSam } from "@/lib/theme/sam-theme";

const TAB_ORDER = ["home", "expenses", "invest", "goals", "profile"];

// Scroll panes reserve top/side safe areas; bottom padding is light because
// BottomNav is an in-flow flex sibling (not fixed) and consumes its own height.
const SCREEN_SAFE_PAD =
  "pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-3";

const UI_DEFAULTS = {
  tab: "home",
  homeTab: "home",
  expTab: "expenses",
  goalsTab: "goals",
  investTab: "portfolio",
  profileTab: "profile",
  selectedDay: new Date().getDate(),
  selectedGoal: null as string | null,
  pending: 3,
  hiddenCards: [] as string[],
  autoSave: { enabled: true, amount: 50 },
};

function resolveScreen(tab: string, subTab: string) {
  if (tab === "home") {
    if (subTab === "activity") return ActivityScreen;
    if (subTab === "accounts") return AccountsScreen;
    return HomeScreen;
  }
  if (tab === "expenses") {
    if (subTab === "income") return IncomeScreen;
    if (subTab === "budget") return BudgetScreen;
    return ExpensesScreen;
  }
  if (tab === "invest") {
    if (subTab === "market") return MarketScreen;
    if (subTab === "analysis") return AnalysisScreen;
    return InvestScreen;
  }
  if (tab === "goals") {
    if (subTab === "savings") return SavingsScreen;
    return GoalsScreen;
  }
  if (tab === "profile") {
    if (subTab === "stats") return StatsScreen;
    if (subTab === "help") return HelpScreen;
    if (subTab === "settings") return AjustesScreen;
    return ProfileScreen;
  }
  return HomeScreen;
}

class ScreenErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onReset={this.props.onReset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { sam } = useSam();
  return (
    <div style={{ padding: "28px 18px", fontFamily: sam.font, color: sam.text }}>
      <Mono c={sam.red} b>
        ✗ screen crashed
      </Mono>
      <div style={{ marginTop: 10, fontSize: 12, color: sam.comment }}>{`// ${error.message}`}</div>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 border-0 bg-transparent p-0 text-[13px]"
        style={{ color: sam.yellow, cursor: "pointer" }}
      >
        [reload data ▸]
      </button>
    </div>
  );
}

function AppShellInner({
  initialData,
  onThemeChange,
}: {
  initialData: AppState;
  onThemeChange: (t: "dark" | "light") => void;
}) {
  const [state, setState] = useState<ClientAppState>({
    ...UI_DEFAULTS,
    ...initialData,
    selectedGoal: initialData.goals[0]?.id ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sheet, setSheet] = useState<SheetPayload | null>(null);
  const [prevTab, setPrevTab] = useState(state.tab);
  const [animDir, setAnimDir] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const hydrate = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const data = await fetchUserDataAction();
      if (!data) {
        setAuthError("could not load your data");
        return;
      }
      setState((s) => ({ ...s, ...data, selectedGoal: data.goals[0]?.id ?? s.selectedGoal }));
    } catch {
      setAuthError("connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onThemeChange((state.prefs?.theme as "dark" | "light") || "dark");
  }, [state.prefs?.theme, onThemeChange]);

  useEffect(() => {
    const t = (state.prefs?.theme as "dark" | "light") || "dark";
    const vars = SHELL_THEME_VARS[t] || SHELL_THEME_VARS.dark;
    document.documentElement.style.setProperty("--sam-page-bg", vars.pageBg);
    document.documentElement.style.setProperty("--sam-bg", t === "light" ? "#f6f8fa" : "#0a0e14");
    document.documentElement.style.setProperty("--sam-border-nav", vars.navBorder);
  }, [state.prefs?.theme]);

  useEffect(() => {
    if (loading || !state.user) return;
    void updatePrefsAction(state.prefs);
  }, [state.prefs, loading, state.user]);

  useEffect(() => {
    if (!state.user) return;
    let alive = true;
    const SNAP_MS = 10 * 60 * 1000;
    const tick = async () => {
      try {
        const m = await fetchMarketQuotesAction();
        if (!alive || !m) return;
        const s = stateRef.current;
        const value = portfolioValue(s.holdings, m);
        const snaps = s.portfolioSnapshots || [];
        const lastT = snaps.length ? new Date(snaps[snaps.length - 1].t).getTime() : 0;
        const due = value > 0 && (snaps.length === 0 || Date.now() - lastT >= SNAP_MS);
        let appended: { t: string; v: number } | null = null;
        if (due) {
          appended = { t: new Date().toISOString(), v: Math.round(value * 100) / 100 };
          void recordSnapshotAction(appended.v);
        }
        if (!alive) return;
        setState((prev) => ({
          ...prev,
          market: m,
          portfolioSnapshots: appended
            ? [...(prev.portfolioSnapshots || []), appended]
            : prev.portfolioSnapshots,
        }));
      } catch {
        /* ignore poll errors */
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [state.user]);

  const setTab = (t: string) => {
    if (t === state.tab) return;
    const from = TAB_ORDER.indexOf(state.tab);
    const to = TAB_ORDER.indexOf(t);
    setAnimDir(to > from ? 1 : -1);
    setPrevTab(state.tab);
    setState((s) => ({ ...s, tab: t }));
  };

  const subTab =
    state.tab === "home"
      ? state.homeTab
      : state.tab === "expenses"
        ? state.expTab
        : state.tab === "invest"
          ? state.investTab
          : state.tab === "goals"
            ? state.goalsTab
            : state.profileTab;

  const prevSubTab =
    prevTab === "home"
      ? state.homeTab
      : prevTab === "expenses"
        ? state.expTab
        : prevTab === "invest"
          ? state.investTab
          : prevTab === "goals"
            ? state.goalsTab
            : state.profileTab;

  const ActiveScreen = resolveScreen(state.tab, subTab);
  const PrevScreen = resolveScreen(prevTab, prevSubTab);
  const transitioning = state.tab !== prevTab;

  useEffect(() => {
    if (transitioning) {
      const id = setTimeout(() => setPrevTab(state.tab), 340);
      return () => clearTimeout(id);
    }
  }, [state.tab, transitioning]);

  if (loading || authError) {
    return <BootScreen error={authError} onRetry={hydrate} />;
  }

  return (
    <div
      className="flex h-dvh flex-col"
      style={{
        background: "var(--sam-page-bg)",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <main
        className="relative flex-1 overflow-hidden"
        style={{ background: "var(--sam-bg, #0a0e14)" }}
      >
        {transitioning && (
          <div
            key={`${prevTab}-out`}
            className={`pointer-events-none absolute inset-0 overflow-y-auto ${SCREEN_SAFE_PAD}`}
            style={{
              animation: `slide-out-${animDir > 0 ? "left" : "right"} 320ms cubic-bezier(.2,.9,.2,1) forwards`,
            }}
          >
            <PrevScreen state={state} setState={setState} openSheet={setSheet} />
          </div>
        )}
        <div
          key={`${state.tab}-in`}
          className="absolute inset-0 overflow-hidden"
          style={{
            animation: transitioning
              ? `slide-in-${animDir > 0 ? "right" : "left"} 320ms cubic-bezier(.2,.9,.2,1) forwards`
              : undefined,
          }}
        >
          <div
            key={subTab}
            className={`absolute inset-0 overflow-y-auto overscroll-contain ${SCREEN_SAFE_PAD}`}
            style={{ animation: "sam-subtab-in 240ms cubic-bezier(.2,.9,.2,1)" }}
          >
            <ScreenErrorBoundary onReset={hydrate} key={`${state.tab}:${subTab}`}>
              <ActiveScreen state={state} setState={setState} openSheet={setSheet} />
            </ScreenErrorBoundary>
          </div>
        </div>
      </main>

      <BottomNav active={state.tab} onChange={setTab} />
      <BottomSheet sheet={sheet} onClose={() => setSheet(null)} state={state} setState={setState} openSheet={setSheet} />
    </div>
  );
}

export function AppShell({ initialData }: { initialData: AppState }) {
  return <AppShellWithTheme initialData={initialData} />;
}

function AppShellWithTheme({ initialData }: { initialData: AppState }) {
  const [theme, setTheme] = useState<"dark" | "light">(
    (initialData.prefs?.theme as "dark" | "light") || "dark"
  );

  return (
    <SamThemeProvider theme={theme}>
      <AppShellInner initialData={initialData} onThemeChange={setTheme} />
    </SamThemeProvider>
  );
}
