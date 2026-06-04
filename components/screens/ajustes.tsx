"use client";

import { useState, useEffect } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar } from "@/components/ui/sam-primitives";
import { updatePrefsAction } from "@/lib/actions/data-actions";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

const THEMES = {
  dark: {
    name: "DARK",
    icon: "☾",
    pageBg: "radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)",
    bg: "#0a0e14",
    bgAlt: "#0d1117",
    text: "#c9d1d9",
    textDim: "#8b949e",
    comment: "#6e7681",
    border: "rgba(240,246,252,0.08)",
    borderNav: "rgba(240,246,252,0.08)",
    accentHue: 43,
    desc: "terminal · dark",
  },
  light: {
    name: "LIGHT",
    icon: "☼",
    pageBg: "linear-gradient(160deg, #eaf0fb 0%, #f6f8fa 60%)",
    bg: "#f6f8fa",
    bgAlt: "#ffffff",
    text: "#1c2128",
    textDim: "#57606a",
    comment: "#8c959f",
    border: "rgba(27,31,36,0.12)",
    borderNav: "rgba(27,31,36,0.14)",
    accentHue: 212,
    desc: "clean · bright",
  },
} as const;

type ThemeKey = keyof typeof THEMES;

function hueToAccent(hue: number, theme: ThemeKey) {
  if (theme === "light") return `hsl(${hue}, 80%, 38%)`;
  return `hsl(${hue}, 75%, 62%)`;
}

function applyThemeVars(themeName: ThemeKey, overrides: { accentHue?: number; radius?: number; scanline?: number } = {}) {
  const t = THEMES[themeName] || THEMES.dark;
  const accentHue = overrides.accentHue !== undefined ? overrides.accentHue : t.accentHue;
  const accent = hueToAccent(accentHue, themeName);
  const radius = overrides.radius !== undefined ? overrides.radius : 0;
  const scanline = overrides.scanline !== undefined ? overrides.scanline : 0;

  const vars: Record<string, string> = {
    "--sam-bg": t.bg,
    "--sam-bg-alt": t.bgAlt,
    "--sam-text": t.text,
    "--sam-text-dim": t.textDim,
    "--sam-comment": t.comment,
    "--sam-border": t.border,
    "--sam-border-nav": t.borderNav,
    "--sam-accent": accent,
    "--sam-page-bg": t.pageBg,
    "--sam-radius": `${radius}px`,
    "--sam-scanline": `${scanline / 100}`,
  };

  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}

function PreviewCard({
  themeName,
  accentHue,
  radius,
  font,
}: {
  themeName: ThemeKey;
  accentHue: number;
  radius: number;
  font: string;
}) {
  const t = THEMES[themeName] || THEMES.dark;
  const accent = hueToAccent(accentHue, themeName);
  const borderR = `${radius}px`;

  return (
    <div
      style={{
        background: t.bgAlt,
        border: `1px solid ${t.border}`,
        borderRadius: borderR,
        padding: "12px 14px",
        fontFamily: font,
      }}
    >
      <div style={{ fontSize: 10, color: t.comment, marginBottom: 4 }}>// preview · {t.desc}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: accent, fontVariantNumeric: "tabular-nums" }}>$8,420</span>
        <span style={{ fontSize: 11, color: t.comment }}>balance</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: t.comment, marginBottom: 3 }}>april budget</div>
        <div style={{ height: 4, background: t.border, borderRadius: borderR, overflow: "hidden" }}>
          <div style={{ width: "68%", height: "100%", background: accent, borderRadius: borderR }} />
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        {["food", "rent", "tx"].map((l) => (
          <div
            key={l}
            style={{
              flex: 1,
              padding: "4px 0",
              textAlign: "center",
              border: `1px solid ${t.border}`,
              borderRadius: borderR,
              fontSize: 9,
              color: t.comment,
            }}
          >
            // {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AjustesScreen({ state, setState }: ScreenProps) {
  const { sam } = useSam();
  const currentTheme = (state.prefs.theme === "light" ? "light" : "dark") as ThemeKey;

  const defaultHue = (THEMES[currentTheme] || THEMES.dark).accentHue;
  const [accentHue, setAccentHue] = useState<number>(defaultHue);
  const [radius, setRadius] = useState(0);
  const [scanline, setScanline] = useState(0);

  useEffect(() => {
    const t = THEMES[currentTheme] || THEMES.dark;
    setAccentHue(t.accentHue);
    setRadius(0);
    setScanline(0);
  }, [currentTheme]);

  useEffect(() => {
    applyThemeVars(currentTheme, { accentHue, radius, scanline });
  }, [currentTheme, accentHue, radius, scanline]);

  const selectTheme = (name: ThemeKey) => {
    const prefs = { ...state.prefs, theme: name };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };

  const resetDefaults = () => {
    const t = THEMES[currentTheme] || THEMES.dark;
    setAccentHue(t.accentHue);
    setRadius(0);
    setScanline(0);
  };

  const accent = hueToAccent(accentHue, currentTheme);
  const t = THEMES[currentTheme] || THEMES.dark;

  const SliderRow = ({
    label,
    icon,
    value,
    onChange,
    min,
    max,
    unit = "",
  }: {
    label: string;
    icon: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    unit?: string;
  }) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12, marginBottom: 6 }}>
        <Mono c={sam.comment}>{icon}</Mono>
        <Mono c={sam.text} b>
          {label}
        </Mono>
        <span style={{ flex: 1 }} />
        <Mono c={accent} b style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
          {unit}
        </Mono>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: sam.comment, minWidth: 8 }}>{min}</span>
        <div style={{ flex: 1, position: "relative", height: 4 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 4,
              background: `linear-gradient(to right, ${accent} ${((value - min) / (max - min)) * 100}%, ${sam.track} ${((value - min) / (max - min)) * 100}%)`,
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: -6,
              width: "100%",
              height: 16,
              opacity: 0,
              cursor: "pointer",
              margin: 0,
              padding: 0,
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: sam.comment, minWidth: 16, textAlign: "right" }}>
          {max}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: SCREEN_PAD, paddingBottom: 24 }}>
      <TabBar tabs={["profile", "stats", "help", "settings"]} active="settings" onChange={(t) => setState((s) => ({ ...s, profileTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="sam" cmd="theme --configure" />
        <Comment>style editor · changes apply instantly · stored locally</Comment>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ base theme</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            {(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([key, th]) => {
              const isActive = currentTheme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectTheme(key)}
                  style={{
                    flex: 1,
                    padding: "12px 6px",
                    cursor: "pointer",
                    background: isActive ? "rgba(227,179,65,0.1)" : "transparent",
                    border: `1.5px solid ${isActive ? sam.yellow : sam.border}`,
                    color: isActive ? sam.yellow : sam.textDim,
                    fontFamily: sam.font,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 400,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 160ms",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{th.icon}</span>
                  <span style={{ letterSpacing: 1 }}>{th.name}</span>
                  <span style={{ fontSize: 9, color: sam.comment, fontWeight: 400 }}>{th.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ token overrides</div>
          <Comment>drag sliders to fine-tune</Comment>
          <div style={{ marginTop: 12, padding: "14px 14px", border: `1px solid ${sam.border}`, background: sam.overlay }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 8,
                  background:
                    "linear-gradient(to right, hsl(0,75%,62%), hsl(60,75%,62%), hsl(120,75%,62%), hsl(180,75%,62%), hsl(240,75%,62%), hsl(300,75%,62%), hsl(360,75%,62%))",
                }}
              />
              <span style={{ fontSize: 10, color: sam.comment }}>// hue spectrum</span>
            </div>
            <SliderRow label="accent" icon="◈" value={accentHue} onChange={setAccentHue} min={0} max={359} unit="°" />
            <SliderRow label="radius" icon="◻" value={radius} onChange={setRadius} min={0} max={20} unit="px" />
            <SliderRow label="scanline" icon="≡" value={scanline} onChange={setScanline} min={0} max={80} unit="%" />
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ live preview</div>
          <Comment>reacts to every slider change</Comment>
          <div style={{ marginTop: 10 }}>
            <PreviewCard themeName={currentTheme} accentHue={accentHue} radius={radius} font={sam.font} />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ active tokens</div>
          <div style={{ marginTop: 8, padding: "10px 12px", border: `1px solid ${sam.border}`, fontSize: 11, lineHeight: 1.8 }}>
            {(
              [
                ["--sam-bg", t.bg],
                ["--sam-text", t.text],
                ["--sam-accent", accent],
                ["--sam-radius", `${radius}px`],
                ["--sam-scanline", `${(scanline / 100).toFixed(2)}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 8 }}>
                <Mono c={sam.comment}>{k}</Mono>
                <span style={{ flex: 1 }} />
                <Mono c={sam.yellow}>{v}</Mono>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={resetDefaults}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "transparent",
              border: `1px solid ${sam.border}`,
              color: sam.comment,
              fontFamily: sam.font,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 160ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = sam.yellow;
              e.currentTarget.style.color = sam.yellow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = sam.border;
              e.currentTarget.style.color = sam.comment;
            }}
          >
            [reset to defaults]
          </button>
          <div style={{ marginTop: 8, fontSize: 10, color: sam.comment, textAlign: "center" }}>
            {`// restores factory tokens for ${t.name}`}
          </div>
        </div>
        <style>{`
          body::after {
            content: '';
            position: fixed;
            inset: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,var(--sam-scanline, 0)) 2px,
              rgba(0,0,0,var(--sam-scanline, 0)) 4px
            );
            pointer-events: none;
            z-index: 9999;
          }
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px; height: 14px;
            background: var(--sam-accent, #e3b341);
            border-radius: 0;
            cursor: pointer;
          }
          input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: transparent;
          }
        `}</style>
      </div>
    </div>
  );
}
