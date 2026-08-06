"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { AppState } from "@/lib/db/queries/load-user-data";
import { fetchUserDataAction, updatePrefsAction } from "@/lib/actions/data-actions";
import { normalizeCurrency, type Currency } from "@/lib/finance/currency";
import { useI18n, type Lang } from "@/lib/i18n/i18n-context";
import { resolveSamTheme, SAM_PALETTES, SamThemeProvider, type SamTheme } from "@/lib/theme/sam-theme";
import type { DesktopSection } from "@/lib/presentation/experience";
import { DESKTOP_COPY } from "./desktop-copy";
import { DesktopShell } from "./desktop-shell";
import { DesktopInspector } from "./desktop-inspector";
import { DesktopActionDrawer } from "./desktop-action-drawer";
import { DesktopSectionContent } from "./sections";
import type { DesktopAction, DesktopSelection } from "./types";

export function DesktopApp({ initialData, section }: { initialData: AppState; section: DesktopSection }) {
  const [state, setState] = useState(initialData);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<DesktopSelection>(null);
  const [action, setAction] = useState<DesktopAction>(null);
  const [theme, setTheme] = useState<SamTheme>(resolveSamTheme(initialData.prefs.theme));
  const [currency, setCurrency] = useState<Currency>(normalizeCurrency(initialData.prefs.defaultCurrency));
  const { lang, setLang } = useI18n();
  const language: Lang = initialData.prefs.language ?? lang;
  const [activeLanguage, setActiveLanguage] = useState<Lang>(language);
  const copy = DESKTOP_COPY[activeLanguage];
  const locale = activeLanguage === "es" ? "es-PE" : "en-US";
  const hydrate = useCallback(async () => { const data = await fetchUserDataAction(); if (data) setState(data); }, []);

  useEffect(() => { setLang(activeLanguage); }, [activeLanguage, setLang]);
  useEffect(() => { document.body.style.background = theme === "ayu-mirage" ? "#07131c" : SAM_PALETTES[theme].bg; }, [theme]);

  const persistPrefs = useCallback(async (patch: Partial<AppState["prefs"]>) => {
    const prefs = { ...state.prefs, ...patch };
    setState((current) => ({ ...current, prefs }));
    await updatePrefsAction(prefs);
  }, [state.prefs]);
  const changeTheme = useCallback((next: SamTheme) => { setTheme(next); void persistPrefs({ theme: next }); }, [persistPrefs]);
  const changeLanguage = useCallback((next: Lang) => { setActiveLanguage(next); void persistPrefs({ language: next }); }, [persistPrefs]);
  const changeCurrency = useCallback((next: Currency) => { setCurrency(next); setSelection(null); void persistPrefs({ defaultCurrency: next }); }, [persistPrefs]);
  const openAction = useCallback((next: DesktopAction) => setAction(next), []);
  const vars = useMemo(() => desktopThemeVars(theme), [theme]);

  return <SamThemeProvider theme={theme}><div className="sam-desktop" style={vars} data-theme={theme}>
    <DesktopShell section={section} copy={copy} query={query} currency={currency} userName={state.user.full_name} hasInspector={Boolean(selection)} onQuery={setQuery} onCurrency={changeCurrency} onAction={openAction}
      inspector={<DesktopInspector state={state} selection={selection} currency={currency} locale={locale} copy={copy} onClose={() => setSelection(null)} onAction={openAction}/>} actionDrawer={<DesktopActionDrawer action={action} state={state} currency={currency} copy={copy} onClose={() => setAction(null)} onDone={hydrate}/>}
    >
      <DesktopSectionContent state={state} section={section} currency={currency} query={query} onSelect={setSelection} onAction={openAction} copy={copy} locale={locale} theme={theme} language={activeLanguage} onTheme={changeTheme} onLanguage={changeLanguage} onCurrency={changeCurrency}/>
    </DesktopShell>
  </div></SamThemeProvider>;
}

function desktopThemeVars(theme: SamTheme): CSSProperties {
  const palette = SAM_PALETTES[theme];
  const living = theme === "ayu-mirage";
  return {
    ["--desk-canvas" as string]: living ? "#07131c" : palette.bg,
    ["--desk-index" as string]: living ? "#0b1822" : palette.bgAlt,
    ["--desk-surface" as string]: living ? "#10212d" : palette.surface,
    ["--desk-inspector" as string]: living ? "#0d1c27" : palette.surfaceRaised,
    ["--desk-ink" as string]: living ? "#e6f0f2" : palette.text,
    ["--desk-muted" as string]: living ? "#9cb0b8" : palette.comment,
    ["--desk-line" as string]: living ? "#24404b" : palette.borderStrong,
    ["--desk-line-soft" as string]: palette.border,
    ["--desk-info" as string]: living ? "#54d8e4" : palette.info,
    ["--desk-positive" as string]: living ? "#a8e63b" : palette.success,
    ["--desk-pending" as string]: living ? "#f3b63f" : palette.warning,
    ["--desk-risk" as string]: living ? "#ff6b5e" : palette.danger,
    ["--desk-overlay" as string]: palette.overlay,
    ["--desk-active" as string]: palette.active,
    ["--desk-hover" as string]: palette.hover,
  } as CSSProperties;
}
