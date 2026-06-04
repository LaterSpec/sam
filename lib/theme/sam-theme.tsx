"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export const SAM_PALETTES = {
  dark: {
    bg: "#0a0e14",
    bgAlt: "#0d1117",
    sheet: "#10151c",
    border: "rgba(240,246,252,0.08)",
    borderStrong: "rgba(240,246,252,0.18)",
    text: "#c9d1d9",
    textDim: "#8b949e",
    comment: "#6e7681",
    yellow: "#e3b341",
    cyan: "#58a6ff",
    green: "#56d364",
    red: "#f85149",
    magenta: "#bc8cff",
    orange: "#e8824a",
    track: "rgba(240,246,252,0.14)",
    overlay: "rgba(255,255,255,0.02)",
  },
  light: {
    bg: "#f6f8fa",
    bgAlt: "#ffffff",
    sheet: "#ffffff",
    border: "rgba(27,31,36,0.15)",
    borderStrong: "rgba(27,31,36,0.30)",
    text: "#1f2328",
    textDim: "#57606a",
    comment: "#6e7781",
    yellow: "#9a6700",
    cyan: "#0969da",
    green: "#1a7f37",
    red: "#cf222e",
    magenta: "#8250df",
    orange: "#bc4c00",
    track: "rgba(27,31,36,0.12)",
    overlay: "rgba(27,31,36,0.035)",
  },
} as const;

export type SamTheme = keyof typeof SAM_PALETTES;
export type SamPalette = (typeof SAM_PALETTES)[SamTheme] & { font: string };

const SAM_FONT = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace';

type SamContextValue = {
  sam: SamPalette & { font: string };
  theme: SamTheme;
};

const SamContext = createContext<SamContextValue>({
  sam: { ...SAM_PALETTES.dark, font: SAM_FONT },
  theme: "dark",
});

export function SamThemeProvider({
  theme = "dark",
  children,
}: {
  theme?: SamTheme;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      sam: { ...SAM_PALETTES[theme], font: SAM_FONT },
      theme,
    }),
    [theme]
  );
  return <SamContext.Provider value={value}>{children}</SamContext.Provider>;
}

export function useSam() {
  return useContext(SamContext);
}

export const SHELL_THEME_VARS = {
  dark: {
    pageBg: "radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)",
    navBorder: "rgba(240,246,252,0.08)",
  },
  light: {
    pageBg: "linear-gradient(160deg, #eaf0fb 0%, #f6f8fa 60%)",
    navBorder: "rgba(27,31,36,0.14)",
  },
} as const;
