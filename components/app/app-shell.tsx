"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  SamThemeProvider,
  resolveSamTheme,
  SHELL_THEME_VARS,
  type SamTheme,
} from "@/lib/theme/sam-theme";
import { BottomNav, BootScreen } from "@/components/app/bottom-nav";
import { BottomSheet } from "@/components/app/bottom-sheet";
import {
  HomeScreen,
  ActivityScreen,
  AccountsScreen,
  ExpensesScreen,
  IncomeScreen,
  RecurringScreen,
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
import { useI18n, useT } from "@/lib/i18n/i18n-context";

const TAB_ORDER = ["home", "expenses", "invest", "goals", "profile"];

// Scroll panes reserve safe areas and the fixed bottom nav.
const SCREEN_SAFE_PAD = "app-scroll-pane";

const UI_DEFAULTS = {
  tab: "home",
  homeTab: "home",
  expTab: "expenses",
  goalsTab: "goals",
  investTab: "portfolio",
  profileTab: "profile",
  selectedDay: new Date().getDate(),
  selectedGoal: null as string | null,
  hiddenCards: [] as string[],
};

function resolveScreen(tab: string, subTab: string) {
  if (tab === "home") {
    if (subTab === "activity") return ActivityScreen;
    if (subTab === "accounts") return AccountsScreen;
    return HomeScreen;
  }
  if (tab === "expenses") {
    if (subTab === "income") return IncomeScreen;
    if (subTab === "recurring") return RecurringScreen;
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

function PullToRefreshIndicator({
  pullY,
  refreshing,
  threshold,
}: {
  pullY: number;
  refreshing: boolean;
  threshold: number;
}) {
  const { sam } = useSam();
  const t = useT();
  const visible = pullY > 0 || refreshing;
  if (!visible) return null;
  const ready = pullY >= threshold;
  const top = refreshing ? 8 : Math.max(0, pullY - 26);
  const label = refreshing
    ? t("refreshing")
    : ready
      ? t("release to refresh")
      : t("pull to refresh");
  return (
    <div
      aria-hidden={!refreshing}
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        transition: "top 180ms cubic-bezier(.2,.9,.2,1)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px",
          fontFamily: sam.font,
          fontSize: 11,
          color: sam.comment,
          background: sam.surface,
          border: `1px solid ${sam.border}`,
          borderRadius: 999,
          boxShadow: `0 4px 14px ${sam.bg}99`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            color: ready || refreshing ? sam.accent : sam.comment,
            animation: refreshing ? "sam-spin 700ms linear infinite" : undefined,
            transform: refreshing ? undefined : `rotate(${Math.min(180, pullY * 2)}deg)`,
          }}
        >
          {refreshing ? "◍" : "↓"}
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
}

function AppShellInner({
  initialData,
  onThemeChange,
}: {
  initialData: AppState;
  onThemeChange: (t: SamTheme) => void;
}) {
  const { sam } = useSam();
  const { setLang } = useI18n();
  const [state, setState] = useState<ClientAppState>({
    ...UI_DEFAULTS,
    ...initialData,
    selectedGoal: initialData.goals[0]?.id ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const pull = useRef({ startY: 0, active: false });
  const [authError, setAuthError] = useState("");
  const [sheet, setSheet] = useState<SheetPayload | null>(null);
  const [prevTab, setPrevTab] = useState(state.tab);
  const [animDir, setAnimDir] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const scrollPaneRef = useRef<HTMLDivElement | null>(null);

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

  const PULL_THRESHOLD = 64;
  const PULL_MAX = 96;

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const data = await fetchUserDataAction();
      if (data) {
        setState((s) => ({ ...s, ...data, selectedGoal: data.goals[0]?.id ?? s.selectedGoal }));
      }
      if (stateRef.current.tab === "invest") {
        const m = await fetchMarketQuotesAction();
        if (m) setState((s) => ({ ...s, market: m }));
      }
    } catch {
      /* keep current data on failure */
    } finally {
      setRefreshing(false);
    }
  };

  const onPullStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const pane = scrollPaneRef.current;
    if (pane && pane.scrollTop <= 0) {
      pull.current = { startY: e.touches[0].clientY, active: true };
    }
  };

  const onPullMove = (e: React.TouchEvent) => {
    if (!pull.current.active || refreshing) return;
    const dy = e.touches[0].clientY - pull.current.startY;
    if (dy > 0 && (scrollPaneRef.current?.scrollTop ?? 0) <= 0) {
      setPullY(Math.min(dy * 0.5, PULL_MAX));
    } else {
      pull.current.active = false;
      setPullY(0);
    }
  };

  const onPullEnd = () => {
    if (!pull.current.active) return;
    pull.current.active = false;
    if (pullY >= PULL_THRESHOLD) void doRefresh();
    setPullY(0);
  };

  useEffect(() => {
    onThemeChange(resolveSamTheme(state.prefs?.theme));
  }, [state.prefs?.theme, onThemeChange]);

  useEffect(() => {
    const lang = state.prefs?.language;
    if (lang === "en" || lang === "es") setLang(lang);
  }, [state.prefs?.language, setLang]);

  useEffect(() => {
    const t = resolveSamTheme(state.prefs?.theme);
    const shell = SHELL_THEME_VARS[t];
    document.documentElement.style.setProperty("--sam-page-bg", shell.pageBg);
    document.documentElement.style.setProperty("--sam-bg", sam.bg);
    document.documentElement.style.setProperty("--sam-nav-bg", shell.navBg);
    document.documentElement.style.setProperty("--sam-border-nav", shell.navBorder);
    document.documentElement.style.setProperty("--sam-text", sam.text);
    document.documentElement.style.setProperty("--sam-comment", sam.comment);
    document.documentElement.style.setProperty("--sam-accent", sam.accent);
    document.body.style.background = sam.bg;
  }, [sam.accent, sam.bg, sam.comment, sam.text, state.prefs?.theme]);

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

  const SUBTAB_KEY: Record<string, keyof typeof UI_DEFAULTS> = {
    home: "homeTab",
    expenses: "expTab",
    invest: "investTab",
    goals: "goalsTab",
    profile: "profileTab",
  };

  const setTab = (t: string) => {
    // Double-tap on the already-active nav item returns to that section's first
    // sub-page and scrolls back to the top.
    if (t === state.tab) {
      const subKey = SUBTAB_KEY[t];
      if (subKey) {
        const def = UI_DEFAULTS[subKey] as string;
        setState((s) => (s[subKey] === def ? s : { ...s, [subKey]: def }));
      }
      scrollPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
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
      className="app-shell authenticated-shell flex flex-col"
      data-app-shell="authenticated"
      style={{
        ["--sam-page-bg" as string]: sam.pageBg,
        ["--sam-bg" as string]: sam.bg,
        ["--sam-nav-bg" as string]: sam.bg,
        ["--sam-border-nav" as string]: sam.border,
        ["--sam-text" as string]: sam.text,
        ["--sam-comment" as string]: sam.comment,
        ["--sam-accent" as string]: sam.accent,
        background: "var(--sam-bg)",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <main
        className="app-main relative flex-1 overflow-hidden"
        style={{
          background: "var(--sam-bg)",
        }}
      >
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} threshold={PULL_THRESHOLD} />
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
            ref={scrollPaneRef}
            onTouchStart={onPullStart}
            onTouchMove={onPullMove}
            onTouchEnd={onPullEnd}
            className={`absolute inset-0 overflow-y-auto overscroll-contain ${SCREEN_SAFE_PAD}`}
            style={{
              animation: "sam-subtab-in 240ms cubic-bezier(.2,.9,.2,1)",
              transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
              transition: pull.current.active ? "none" : "transform 220ms cubic-bezier(.2,.9,.2,1)",
            }}
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
  const [theme, setTheme] = useState<SamTheme>(resolveSamTheme(initialData.prefs?.theme));

  return (
    <SamThemeProvider theme={theme}>
      <AppShellInner initialData={initialData} onThemeChange={setTheme} />
    </SamThemeProvider>
  );
}
