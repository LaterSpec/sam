"use client";

import { useEffect, useState } from "react";

const APP_BUILD_VERSION = "sam@0.1.0";

type DebugRect = {
  top: number;
  bottom: number;
  height: number;
} | null;

type DebugState = {
  appVersion: string;
  nextStaticId: string;
  viewportMeta: string | null;
  documentClientHeight: number;
  bodyHeight: number;
  innerHeight: number;
  visualViewportHeight: number | null;
  standaloneMode: boolean;
  iosStandalone: boolean | null;
  safeAreaBottom: string;
  appShellRect: DebugRect;
  viewportGapToShell: number | null;
  bottomNavRect: DebugRect;
  bottomNavInnerRect: DebugRect;
  bottomNavPaddingBottom: string;
  bottomNavInnerPaddingBottom: string;
  bottomNavHeight: string;
  bottomNavInnerHeight: string;
  onboardingFooterPaddingBottom: string;
  onboardingFooterMarginBottom: string;
  onboardingButtonMarginBottom: string;
  onboardingHintMarginBottom: string;
};

function toDebugRect(rect?: DOMRect): DebugRect {
  if (!rect) return null;
  return {
    top: Math.round(rect.top * 100) / 100,
    bottom: Math.round(rect.bottom * 100) / 100,
    height: Math.round(rect.height * 100) / 100,
  };
}

function readComputed(element: Element | null | undefined, property: string): string {
  return element ? getComputedStyle(element).getPropertyValue(property) || "0px" : "n/a";
}

function readNextStaticId(): string {
  const script = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/"]');
  const src = script?.getAttribute("src") ?? "";
  return src.match(/\/_next\/static\/([^/]+)\//)?.[1] ?? "n/a";
}

function readDebugState(): DebugState {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  document.body.appendChild(probe);
  const safeAreaBottom = getComputedStyle(probe).paddingBottom;
  probe.remove();
  const appShell = document.querySelector<HTMLElement>("[data-app-shell]");
  const bottomNav = document.querySelector<HTMLElement>("[data-bottom-nav]");
  const bottomNavInner = document.querySelector<HTMLElement>(".bottom-nav-inner");
  const onboardingFooter = document.querySelector<HTMLElement>("[data-onboarding-footer]");
  const onboardingButton = document.querySelector<HTMLElement>("[data-onboarding-button]");
  const onboardingHint = document.querySelector<HTMLElement>("[data-onboarding-hint]");
  const appShellRect = appShell?.getBoundingClientRect();
  const bottomNavRect = bottomNav?.getBoundingClientRect();
  const bottomNavInnerRect = bottomNavInner?.getBoundingClientRect();

  return {
    appVersion: APP_BUILD_VERSION,
    nextStaticId: readNextStaticId(),
    viewportMeta:
      document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
    documentClientHeight: document.documentElement.clientHeight,
    bodyHeight: document.body.getBoundingClientRect().height,
    innerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport?.height ?? null,
    standaloneMode: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone:
      "standalone" in navigator
        ? (navigator as Navigator & { standalone?: boolean }).standalone === true
        : null,
    safeAreaBottom,
    appShellRect: toDebugRect(appShellRect),
    viewportGapToShell: appShellRect ? window.innerHeight - appShellRect.bottom : null,
    bottomNavRect: toDebugRect(bottomNavRect),
    bottomNavInnerRect: toDebugRect(bottomNavInnerRect),
    bottomNavPaddingBottom: readComputed(bottomNav, "padding-bottom"),
    bottomNavInnerPaddingBottom: readComputed(bottomNavInner, "padding-bottom"),
    bottomNavHeight: readComputed(bottomNav, "height"),
    bottomNavInnerHeight: readComputed(bottomNavInner, "height"),
    onboardingFooterPaddingBottom: readComputed(onboardingFooter, "padding-bottom"),
    onboardingFooterMarginBottom: readComputed(onboardingFooter, "margin-bottom"),
    onboardingButtonMarginBottom: readComputed(onboardingButton, "margin-bottom"),
    onboardingHintMarginBottom: readComputed(onboardingHint, "margin-bottom"),
  };
}

export function PwaLayoutDebug() {
  const [enabled, setEnabled] = useState(false);
  const [debug, setDebug] = useState<DebugState | null>(null);

  useEffect(() => {
    const hasDebugFlag = new URLSearchParams(window.location.search).get("layoutDebug") === "1";
    setEnabled(hasDebugFlag);
    if (!hasDebugFlag) return;

    const update = () => {
      const next = readDebugState();
      setDebug(next);
      console.log("build:", next.appVersion, next.nextStaticId);
      console.log("viewport:", next.viewportMeta);
      console.log("innerHeight:", next.innerHeight);
      console.log("documentElement.clientHeight:", next.documentClientHeight);
      console.log("body.height:", next.bodyHeight);
      console.log("visualViewport:", next.visualViewportHeight);
      console.log("standalone:", next.standaloneMode, next.iosStandalone);
      console.log("safe-area-bottom:", next.safeAreaBottom);
      console.log("appShell.rect:", next.appShellRect);
      console.log("innerHeight - appShellBottom:", next.viewportGapToShell);
      console.log("bottomNav.rect:", next.bottomNavRect);
      console.log("bottomNavInner.rect:", next.bottomNavInnerRect);
      console.log("bottomNav padding-bottom:", next.bottomNavPaddingBottom);
      console.log("bottomNavInner padding-bottom:", next.bottomNavInnerPaddingBottom);
      console.log("bottomNav height:", next.bottomNavHeight);
      console.log("bottomNavInner height:", next.bottomNavInnerHeight);
      console.log("onboarding footer padding-bottom:", next.onboardingFooterPaddingBottom);
      console.log("onboarding footer margin-bottom:", next.onboardingFooterMarginBottom);
      console.log("onboarding button margin-bottom:", next.onboardingButtonMarginBottom);
      console.log("onboarding hint margin-bottom:", next.onboardingHintMarginBottom);
    };
    update();

    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  if (!enabled || !debug) return null;

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
      <div>build: {debug.appVersion}</div>
      <div>nextStatic: {debug.nextStaticId}</div>
      <div>viewport: {debug.viewportMeta ?? "missing"}</div>
      <div>doc.clientHeight: {debug.documentClientHeight}</div>
      <div>body.height: {debug.bodyHeight}</div>
      <div>innerHeight: {debug.innerHeight}</div>
      <div>visualViewport: {debug.visualViewportHeight ?? "n/a"}</div>
      <div>standalone: {String(debug.standaloneMode)}</div>
      <div>navigator.standalone: {debug.iosStandalone === null ? "n/a" : String(debug.iosStandalone)}</div>
      <div>safe-area-bottom: {debug.safeAreaBottom}</div>
      <div>appShell: {debug.appShellRect ? `${debug.appShellRect.top}/${debug.appShellRect.bottom}/${debug.appShellRect.height}` : "n/a"}</div>
      <div>innerHeight-appShellBottom: {debug.viewportGapToShell ?? "n/a"}</div>
      <div>bottomNav: {debug.bottomNavRect ? `${debug.bottomNavRect.top}/${debug.bottomNavRect.bottom}/${debug.bottomNavRect.height}` : "n/a"}</div>
      <div>bottomNavInner: {debug.bottomNavInnerRect ? `${debug.bottomNavInnerRect.top}/${debug.bottomNavInnerRect.bottom}/${debug.bottomNavInnerRect.height}` : "n/a"}</div>
      <div>nav pb: {debug.bottomNavPaddingBottom}</div>
      <div>nav inner pb: {debug.bottomNavInnerPaddingBottom}</div>
      <div>nav h: {debug.bottomNavHeight}</div>
      <div>nav inner h: {debug.bottomNavInnerHeight}</div>
      <div>footer pb: {debug.onboardingFooterPaddingBottom}</div>
      <div>footer mb: {debug.onboardingFooterMarginBottom}</div>
      <div>button mb: {debug.onboardingButtonMarginBottom}</div>
      <div>hint mb: {debug.onboardingHintMarginBottom}</div>
    </div>
  );
}
