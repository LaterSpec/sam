"use client";

import { useEffect, useState } from "react";

type DebugState = {
  viewportMeta: string | null;
  innerHeight: number;
  visualViewportHeight: number | null;
  standaloneMode: boolean;
  iosStandalone: boolean | null;
  safeAreaBottom: string;
};

function readDebugState(): DebugState {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  document.body.appendChild(probe);
  const safeAreaBottom = getComputedStyle(probe).paddingBottom;
  probe.remove();

  return {
    viewportMeta:
      document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
    innerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport?.height ?? null,
    standaloneMode: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone:
      "standalone" in navigator
        ? (navigator as Navigator & { standalone?: boolean }).standalone === true
        : null,
    safeAreaBottom,
  };
}

export function PwaLayoutDebug() {
  const [debug, setDebug] = useState<DebugState | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const update = () => {
      const next = readDebugState();
      setDebug(next);
      console.log("viewport:", next.viewportMeta);
      console.log("innerHeight:", next.innerHeight);
      console.log("visualViewport:", next.visualViewportHeight);
      console.log("standalone:", next.standaloneMode, next.iosStandalone);
      console.log("safe-area-bottom:", next.safeAreaBottom);
    };
    update();

    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  if (process.env.NODE_ENV === "production" || !debug) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed left-2 top-2 z-[60] max-w-[calc(100vw-1rem)] border px-2 py-1 text-[10px] leading-tight"
      style={{
        background: "rgba(10,14,20,0.9)",
        borderColor: "rgba(240,246,252,0.14)",
        color: "#c9d1d9",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <div>viewport: {debug.viewportMeta ?? "missing"}</div>
      <div>innerHeight: {debug.innerHeight}</div>
      <div>visualViewport: {debug.visualViewportHeight ?? "n/a"}</div>
      <div>standalone: {String(debug.standaloneMode)}</div>
      <div>navigator.standalone: {debug.iosStandalone === null ? "n/a" : String(debug.iosStandalone)}</div>
      <div>safe-area-bottom: {debug.safeAreaBottom}</div>
    </div>
  );
}
