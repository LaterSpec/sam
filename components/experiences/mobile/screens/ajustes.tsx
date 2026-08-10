"use client";

import { useSam, SAM_PALETTES, SAM_THEME_SWATCHES, resolveSamTheme, type SamTheme } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { updatePrefsAction } from "@/lib/actions/data-actions";
import { useT } from "@/lib/i18n/i18n-context";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

const THEME_ORDER: SamTheme[] = [
  "solarized-cream",
  "ayu-mirage",
  "kanagawa",
  "ansi-dark",
  "catppuccin-latte",
  "github-light",
  "ayu-light",
];

export function AjustesScreen({ state, setState }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const currentTheme = resolveSamTheme(state.prefs.theme);

  const selectTheme = (theme: SamTheme) => {
    const prefs = { ...state.prefs, theme };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };

  return (
    <div style={{ padding: SCREEN_PAD, paddingBottom: 24 }}>
      <ScreenHeader>
        <TabBar
          tabs={["profile", "stats", "help", "settings"]}
          active="settings"
          onChange={(t) => setState((s) => ({ ...s, profileTab: t }))}
        />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="sam" cmd="theme --select" />
        <Comment>{t("{n} app-wide themes · changes apply everywhere", { n: THEME_ORDER.length })}</Comment>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ {t("Themes")}</div>
          <div style={{ marginTop: 10, border: `1px solid ${sam.border}`, background: sam.surface }}>
            {THEME_ORDER.map((theme, i) => {
              const palette = SAM_PALETTES[theme];
              const active = theme === currentTheme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => selectTheme(theme)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 12px",
                    border: 0,
                    borderBottom: i === THEME_ORDER.length - 1 ? 0 : `1px solid ${sam.border}`,
                    background: active ? sam.active : "transparent",
                    color: active ? sam.accent : sam.text,
                    fontFamily: sam.font,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Mono c={active ? sam.green : sam.comment} b={active}>
                    {active ? "[✓]" : "[ ]"}
                  </Mono>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: active ? 700 : 500 }}>
                    {palette.name}
                  </span>
                  <span style={{ display: "flex", gap: 5 }}>
                    {SAM_THEME_SWATCHES[theme].map((c) => (
                      <span
                        key={c}
                        title={c}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: c,
                          border: `1px solid ${sam.borderStrong}`,
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ {t("Integrations")}</div>
          <div style={{ marginTop: 10, border: `1px solid ${sam.border}`, background: sam.surface }}>
            <button
              type="button"
              onClick={() => setState((s) => ({ ...s, profileTab: "integrations" }))}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 12px",
                border: 0,
                borderBottom: `1px solid ${sam.border}`,
                background: "transparent",
                color: sam.text,
                fontFamily: sam.font,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Mono c={sam.green} b>
                [+]
              </Mono>
              <span style={{ flex: 1 }}>{t("Open marketplace")}</span>
              <Mono c={sam.comment}>→</Mono>
            </button>
            <a
              href="/developers"
              target="_blank"
              rel="noreferrer"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 12px",
                border: 0,
                background: "transparent",
                color: sam.text,
                fontFamily: sam.font,
                textDecoration: "none",
              }}
            >
              <Mono c={sam.cyan} b>
                [?]
              </Mono>
              <span style={{ flex: 1 }}>{t("SAM for Developers")}</span>
              <Mono c={sam.comment}>↗</Mono>
            </a>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ {t("Active theme")}</div>
          <div style={{ marginTop: 8, padding: "10px 12px", border: `1px solid ${sam.border}`, background: sam.overlay, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <Mono c={sam.comment}>{t("theme")}</Mono>
              <span style={{ flex: 1 }} />
              <Mono c={sam.accent} b>{SAM_PALETTES[currentTheme].name}</Mono>
            </div>
            <div style={{ marginTop: 6, color: sam.comment, lineHeight: 1.6 }}>
              {t("primary text, cards, borders, charts, forms, warnings and progress indicators use this shared token set.")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
