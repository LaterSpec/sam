"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export const SAM_THEME_SWATCHES = {
  "solarized-cream": ["#1a1610", "#b58900", "#268bd2", "#cb4b16"],
  "ayu-mirage": ["#1f2430", "#ffd580", "#73d0ff", "#ffa759"],
  "catppuccin-latte": ["#eff1f5", "#40a02b", "#8839ef", "#df8e1d"],
  "github-light": ["#ffffff", "#1a7f37", "#0969da", "#9a6700"],
} as const;

export const SAM_PALETTES = {
  "solarized-cream": {
    name: "Solarized Cream",
    pageBg: "linear-gradient(160deg, #fdf6e3 0%, #eee8d5 58%, #e6dcc3 100%)",
    bg: "#fdf6e3",
    bgAlt: "#eee8d5",
    surface: "#f7f0dc",
    surfaceRaised: "#fff8e8",
    sheet: "#fff8e8",
    input: "#fffaf0",
    border: "rgba(101,86,40,0.24)",
    borderStrong: "rgba(101,86,40,0.42)",
    text: "#1a1610",
    textDim: "#586e75",
    muted: "#657b83",
    comment: "#657b83",
    yellow: "#b58900",
    cyan: "#268bd2",
    green: "#2aa198",
    red: "#dc322f",
    magenta: "#d33682",
    orange: "#cb4b16",
    accent: "#b58900",
    success: "#2aa198",
    danger: "#dc322f",
    warning: "#b58900",
    info: "#268bd2",
    chartA: "#268bd2",
    chartB: "#2aa198",
    chartC: "#cb4b16",
    track: "rgba(101,123,131,0.20)",
    progressTrack: "#eee8d5",
    progressBorder: "rgba(101,86,40,0.38)",
    progressEmpty: "#cfc7b2",
    overlay: "rgba(101,86,40,0.055)",
    active: "rgba(181,137,0,0.14)",
    hover: "rgba(38,139,210,0.10)",
  },
  "ayu-mirage": {
    name: "Ayu Mirage",
    pageBg: "radial-gradient(ellipse at top, #2b3140, #1f2430 62%)",
    bg: "#1f2430",
    bgAlt: "#242936",
    surface: "#242936",
    surfaceRaised: "#2a303d",
    sheet: "#2a303d",
    input: "#1b202b",
    border: "rgba(203,213,224,0.12)",
    borderStrong: "rgba(203,213,224,0.24)",
    text: "#cbccc6",
    textDim: "#a6aebd",
    muted: "#707a8c",
    comment: "#707a8c",
    yellow: "#ffd580",
    cyan: "#73d0ff",
    green: "#bae67e",
    red: "#ff6666",
    magenta: "#d4bfff",
    orange: "#ffa759",
    accent: "#ffd580",
    success: "#bae67e",
    danger: "#ff6666",
    warning: "#ffd580",
    info: "#73d0ff",
    chartA: "#73d0ff",
    chartB: "#bae67e",
    chartC: "#ffa759",
    track: "rgba(203,213,224,0.14)",
    progressTrack: "rgba(15,20,28,0.56)",
    progressBorder: "rgba(203,213,224,0.28)",
    progressEmpty: "rgba(112,122,140,0.82)",
    overlay: "rgba(255,255,255,0.035)",
    active: "rgba(255,213,128,0.13)",
    hover: "rgba(115,208,255,0.10)",
  },
  "catppuccin-latte": {
    name: "Catppuccin Latte",
    pageBg: "linear-gradient(160deg, #eff1f5 0%, #e6e9ef 62%, #dce0e8 100%)",
    bg: "#eff1f5",
    bgAlt: "#e6e9ef",
    surface: "#f7f8fb",
    surfaceRaised: "#ffffff",
    sheet: "#ffffff",
    input: "#ffffff",
    border: "rgba(76,79,105,0.18)",
    borderStrong: "rgba(76,79,105,0.34)",
    text: "#1e1e2e",
    textDim: "#5c5f77",
    muted: "#6c6f85",
    comment: "#6c6f85",
    yellow: "#df8e1d",
    cyan: "#209fb5",
    green: "#40a02b",
    red: "#d20f39",
    magenta: "#8839ef",
    orange: "#fe640b",
    accent: "#8839ef",
    success: "#40a02b",
    danger: "#d20f39",
    warning: "#df8e1d",
    info: "#209fb5",
    chartA: "#8839ef",
    chartB: "#40a02b",
    chartC: "#df8e1d",
    track: "rgba(76,79,105,0.14)",
    progressTrack: "#dce0e8",
    progressBorder: "rgba(76,79,105,0.30)",
    progressEmpty: "#bcc0cc",
    overlay: "rgba(76,79,105,0.045)",
    active: "rgba(136,57,239,0.12)",
    hover: "rgba(32,159,181,0.10)",
  },
  "github-light": {
    name: "GitHub Light",
    pageBg: "linear-gradient(160deg, #ffffff 0%, #f6f8fa 62%, #eef2f6 100%)",
    bg: "#ffffff",
    bgAlt: "#f6f8fa",
    surface: "#ffffff",
    surfaceRaised: "#ffffff",
    sheet: "#ffffff",
    input: "#ffffff",
    border: "rgba(31,35,40,0.15)",
    borderStrong: "rgba(31,35,40,0.30)",
    text: "#1f2328",
    textDim: "#57606a",
    muted: "#6e7781",
    comment: "#6e7781",
    yellow: "#9a6700",
    cyan: "#0969da",
    green: "#1a7f37",
    red: "#cf222e",
    magenta: "#8250df",
    orange: "#bc4c00",
    accent: "#0969da",
    success: "#1a7f37",
    danger: "#cf222e",
    warning: "#9a6700",
    info: "#0969da",
    chartA: "#0969da",
    chartB: "#1a7f37",
    chartC: "#9a6700",
    track: "rgba(31,35,40,0.12)",
    progressTrack: "#d8dee4",
    progressBorder: "rgba(31,35,40,0.28)",
    progressEmpty: "#afb8c1",
    overlay: "rgba(31,35,40,0.035)",
    active: "rgba(9,105,218,0.10)",
    hover: "rgba(31,35,40,0.055)",
  },
} as const;

export type SamTheme = keyof typeof SAM_PALETTES;
export type SamPalette = (typeof SAM_PALETTES)[SamTheme] & { font: string };

const SAM_FONT = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace';

type SamContextValue = {
  sam: SamPalette & { font: string };
  theme: SamTheme;
};

export const DEFAULT_SAM_THEME: SamTheme = "ayu-mirage";

export function resolveSamTheme(theme?: string | null): SamTheme {
  if (theme === "dark") return "ayu-mirage";
  if (theme === "light") return "github-light";
  if (theme && theme in SAM_PALETTES) return theme as SamTheme;
  return DEFAULT_SAM_THEME;
}

const SamContext = createContext<SamContextValue>({
  sam: { ...SAM_PALETTES[DEFAULT_SAM_THEME], font: SAM_FONT },
  theme: DEFAULT_SAM_THEME,
});

export function SamThemeProvider({
  theme = DEFAULT_SAM_THEME,
  children,
}: {
  theme?: SamTheme | string | null;
  children: ReactNode;
}) {
  const resolvedTheme = resolveSamTheme(theme);
  const value = useMemo(
    () => ({
      sam: { ...SAM_PALETTES[resolvedTheme], font: SAM_FONT },
      theme: resolvedTheme,
    }),
    [resolvedTheme]
  );
  return <SamContext.Provider value={value}>{children}</SamContext.Provider>;
}

export function useSam() {
  return useContext(SamContext);
}

export const SHELL_THEME_VARS = {
  "solarized-cream": {
    pageBg: SAM_PALETTES["solarized-cream"].pageBg,
    navBorder: SAM_PALETTES["solarized-cream"].border,
  },
  "ayu-mirage": {
    pageBg: SAM_PALETTES["ayu-mirage"].pageBg,
    navBorder: SAM_PALETTES["ayu-mirage"].border,
  },
  "catppuccin-latte": {
    pageBg: SAM_PALETTES["catppuccin-latte"].pageBg,
    navBorder: SAM_PALETTES["catppuccin-latte"].border,
  },
  "github-light": {
    pageBg: SAM_PALETTES["github-light"].pageBg,
    navBorder: SAM_PALETTES["github-light"].border,
  },
} as const;
