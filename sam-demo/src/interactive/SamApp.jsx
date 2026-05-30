import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IOSDevice } from '../shared/ios-frame.jsx';
import {
  FRAME_W, FRAME_H, CONTENT_TOP, CONTENT_BOTTOM_NAV, computeFrameScale,
} from '../shared/frame-layout.js';
import {
  SAM, Mono, applySamPalette, BootScreen, ScreenErrorBoundary,
  BottomNav, BottomSheet, initialState, resolveScreen, portfolioValue,
  TAB_ORDER, SHELL_THEME_VARS,
} from './sam-ui.jsx';

const MAIN_MS = 280;
const SUB_MS = 220;

const SUBTAB_ORDER = {
  home: ['home', 'activity', 'cards'],
  expenses: ['expenses', 'income', 'budget'],
  invest: ['portfolio', 'market', 'analysis'],
  goals: ['goals', 'savings'],
  profile: ['profile', 'stats', 'help', 'settings'],
};

function subTabFor(state, tab) {
  if (tab === 'home') return state.homeTab;
  if (tab === 'expenses') return state.expTab;
  if (tab === 'invest') return state.investTab;
  if (tab === 'goals') return state.goalsTab;
  return state.profileTab;
}

function subTabKey(tab, sub) {
  return `${tab}:${sub}`;
}

export default function SamApp() {
  const navigate = useNavigate();
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [sheet, setSheet] = useState(null);
  const [prevTab, setPrevTab] = useState(state.tab);
  const [animDir, setAnimDir] = useState(0);
  const [subAnimDir, setSubAnimDir] = useState(0);
  const [prevSubKey, setPrevSubKey] = useState(
    () => subTabKey(state.tab, subTabFor(state, state.tab)),
  );
  const [scale, setScale] = useState(1);
  const [edgeToEdge, setEdgeToEdge] = useState(false);

  const hydrate = async () => {
    if (!window.SamDB) {
      setAuthError('demo unavailable');
      setLoading(false);
      return;
    }
    const session = await window.SamDB.getSession();
    if (!session) {
      navigate('/');
      return;
    }
    const data = await window.SamDB.loadUserData();
    if (!data) {
      setAuthError('could not load demo data');
      setLoading(false);
      return;
    }
    setState((s) => ({
      ...s,
      ...data,
      selectedGoal: (data.goals[0] && data.goals[0].id) || null,
    }));
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (alive) await hydrate();
    })();
    const unsub = window.SamDB?.onSessionChange?.((session) => {
      if (!session) navigate('/');
    });
    return () => {
      alive = false;
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    const calc = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      setScale(computeFrameScale());
      setEdgeToEdge(w <= 520);
    };
    calc();
    window.addEventListener('resize', calc);
    window.visualViewport?.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.visualViewport?.removeEventListener('resize', calc);
    };
  }, []);

  useEffect(() => {
    const vars = SHELL_THEME_VARS[state.prefs.theme] || SHELL_THEME_VARS.dark;
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [state.prefs.theme]);

  useEffect(() => {
    if (loading || !state.user || !window.SamDB) return;
    window.SamDB.updatePrefs(state.prefs);
  }, [state.prefs, loading]);

  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (loading || !state.user || !window.SamDB) return;
    let alive = true;
    const SNAP_MS = 10 * 60 * 1000;
    const tick = async () => {
      const m = await window.SamDB.getMarketQuotes();
      if (!alive || !m) return;
      const s = stateRef.current;
      const value = portfolioValue(s.holdings, m);
      const snaps = s.portfolioSnapshots || [];
      const lastT = snaps.length ? new Date(snaps[snaps.length - 1].t).getTime() : 0;
      const due = value > 0 && (snaps.length === 0 || Date.now() - lastT >= SNAP_MS);
      let appended = null;
      if (due) {
        appended = { t: new Date().toISOString(), v: Math.round(value * 100) / 100 };
        window.SamDB.recordSnapshot(appended.v);
      }
      if (!alive) return;
      setState((prev) => ({
        ...prev,
        market: m,
        portfolioSnapshots: appended
          ? [...(prev.portfolioSnapshots || []), appended]
          : prev.portfolioSnapshots,
      }));
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loading, state.user]);

  const setTab = (t) => {
    if (t === state.tab) return;
    const from = TAB_ORDER.indexOf(state.tab);
    const to = TAB_ORDER.indexOf(t);
    setAnimDir(to > from ? 1 : -1);
    setPrevTab(state.tab);
    setState((s) => ({ ...s, tab: t }));
  };

  const subTab = subTabFor(state, state.tab);
  const currentSubKey = subTabKey(state.tab, subTab);
  const [prevSubTabTab, prevSubTabName] = prevSubKey.split(':');

  const ActiveScreen = resolveScreen(state.tab, subTab);
  const PrevScreen = resolveScreen(prevTab, subTabFor(state, prevTab));
  const PrevSubScreen = resolveScreen(prevSubTabTab, prevSubTabName);
  const mainTransitioning = state.tab !== prevTab;
  const subTransitioning = !mainTransitioning && currentSubKey !== prevSubKey;
  const screenBusy = mainTransitioning || subTransitioning;
  const layerBg = 'var(--sam-bg, #0a0e14)';

  useEffect(() => {
    if (!mainTransitioning) return;
    const id = setTimeout(() => {
      setPrevTab(state.tab);
      setPrevSubKey(currentSubKey);
    }, MAIN_MS + 24);
    return () => clearTimeout(id);
  }, [state.tab, mainTransitioning, currentSubKey]);

  useEffect(() => {
    if (mainTransitioning || currentSubKey === prevSubKey) return;
    const order = SUBTAB_ORDER[state.tab];
    if (order) {
      const from = order.indexOf(prevSubTabName);
      const to = order.indexOf(subTab);
      if (from >= 0 && to >= 0) setSubAnimDir(to > from ? 1 : -1);
    }
    const id = setTimeout(() => setPrevSubKey(currentSubKey), SUB_MS + 24);
    return () => clearTimeout(id);
  }, [currentSubKey, prevSubKey, mainTransitioning, state.tab, subTab, prevSubTabName]);

  applySamPalette((state.prefs && state.prefs.theme) || 'dark');
  {
    const u = state.user || {};
    const base = u.username || u.full_name || (u.email || '').split('@')[0] || '';
    window.SAM_USER = (String(base).trim().split(/\s+/)[0] || 'you').toLowerCase();
  }

  if (loading || authError) {
    return (
      <BootScreen
        error={authError}
        onRetry={() => {
          setAuthError('');
          setLoading(true);
          hydrate();
        }}
      />
    );
  }

  return (
    <div
      data-screen-label="SAM Demo"
      style={{
        width: '100%',
        height: '100dvh',
        background: 'var(--sam-page-bg, radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SAM.font,
        overflow: 'hidden',
        padding: edgeToEdge
          ? 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
          : 0,
      }}
    >
      <div style={{
        width: FRAME_W * scale,
        height: FRAME_H * scale,
        position: 'relative',
        flexShrink: 0,
      }}
      >
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: FRAME_W,
          height: FRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        >
        <IOSDevice
          dark={state.prefs.theme !== 'light'}
          width={FRAME_W}
          height={FRAME_H}
          edgeToEdge={edgeToEdge}
        >
          <div style={{
            position: 'relative',
            height: '100%',
            background: 'var(--sam-bg, #0a0e14)',
            overflow: 'hidden',
          }}
          >
            <div style={{
              position: 'absolute',
              top: CONTENT_TOP,
              left: 0,
              right: 0,
              bottom: CONTENT_BOTTOM_NAV,
              overflow: 'hidden',
            }}
            >
              {mainTransitioning && PrevScreen && (
                <div
                  key={`${prevTab}-out`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    overflowY: 'auto',
                    zIndex: animDir < 0 ? 2 : 1,
                    background: layerBg,
                    pointerEvents: 'none',
                    willChange: 'transform',
                    animation: animDir > 0
                      ? `sam-parallax-out-left ${MAIN_MS}ms cubic-bezier(.4,0,.2,1) forwards`
                      : `sam-push-out-right ${MAIN_MS}ms cubic-bezier(.4,0,.2,1) forwards`,
                  }}
                >
                  <PrevScreen state={state} setState={setState} openSheet={setSheet} />
                </div>
              )}
              {subTransitioning && PrevSubScreen && (
                <div
                  key={`${prevSubKey}-out`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    overflowY: 'auto',
                    zIndex: subAnimDir < 0 ? 2 : 1,
                    background: layerBg,
                    pointerEvents: 'none',
                    willChange: 'transform',
                    animation: subAnimDir > 0
                      ? `sam-parallax-out-left ${SUB_MS}ms cubic-bezier(.4,0,.2,1) forwards`
                      : `sam-push-out-right ${SUB_MS}ms cubic-bezier(.4,0,.2,1) forwards`,
                  }}
                >
                  <PrevSubScreen state={state} setState={setState} openSheet={setSheet} />
                </div>
              )}
              <div
                key={`${state.tab}:${subTab}-in`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  zIndex: (mainTransitioning ? animDir : subAnimDir) > 0 ? 2 : 1,
                  background: layerBg,
                  pointerEvents: screenBusy ? 'none' : 'auto',
                  willChange: screenBusy ? 'transform' : 'auto',
                  animation: mainTransitioning
                    ? (animDir > 0
                      ? `sam-push-in-right ${MAIN_MS}ms cubic-bezier(.4,0,.2,1) forwards`
                      : undefined)
                    : subTransitioning
                      ? (subAnimDir > 0
                        ? `sam-push-in-right ${SUB_MS}ms cubic-bezier(.4,0,.2,1) forwards`
                        : undefined)
                      : 'none',
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  overflowY: 'auto',
                }}
                >
                  <ScreenErrorBoundary
                    key={`${state.tab}:${subTab}`}
                    onReset={() => {
                      setLoading(true);
                      hydrate();
                    }}
                  >
                    {ActiveScreen && (
                      <ActiveScreen state={state} setState={setState} openSheet={setSheet} />
                    )}
                  </ScreenErrorBoundary>
                </div>
              </div>
            </div>

            <BottomNav active={state.tab} onChange={setTab} />
            <BottomSheet sheet={sheet} onClose={() => setSheet(null)} state={state} setState={setState} />
          </div>
        </IOSDevice>
        </div>
      </div>

      <style>{`
        :root {
          --sam-page-bg: radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%);
          --sam-bg: #0a0e14;
          --sam-border-nav: rgba(240,246,252,0.08);
          --sam-accent: #e3b341;
          --sam-radius: 0px;
          --sam-scanline: 0;
        }
        @keyframes sam-push-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes sam-push-out-right {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes sam-parallax-out-left {
          from { transform: translateX(0); }
          to { transform: translateX(-16%); }
        }
        input::placeholder { color: ${SAM.comment}; }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}
