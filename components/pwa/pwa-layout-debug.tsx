"use client";

import { useEffect, useState } from "react";

const APP_BUILD_VERSION =
  process.env.NEXT_PUBLIC_APP_BUILD_ID ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "local-build";

type DebugRect = {
  top: number;
  bottom: number;
  height: number;
} | null;

type ElementDebug = {
  rect: DebugRect;
  position: string;
  bottom: string;
  height: string;
  paddingTop: string;
  paddingBottom: string;
  marginBottom: string;
  transform: string;
};

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
  appShell: ElementDebug;
  onboardingMain: ElementDebug;
  onboardingFooter: ElementDebug;
  onboardingButton: ElementDebug;
  onboardingHint: ElementDebug;
  bottomNav: ElementDebug;
  bottomNavInner: ElementDebug;
  bottomNavItem: ElementDebug;
};

const emptyElement: ElementDebug = {
  rect: null,
  position: "n/a",
  bottom: "n/a",
  height: "n/a",
  paddingTop: "n/a",
  paddingBottom: "n/a",
  marginBottom: "n/a",
  transform: "n/a",
};

function toDebugRect(rect?: DOMRect): DebugRect {
  if (!rect) return null;
  return {
    top: Math.round(rect.top * 100) / 100,
    bottom: Math.round(rect.bottom * 100) / 100,
    height: Math.round(rect.height * 100) / 100,
  };
}

function readElement(element: Element | null | undefined): ElementDebug {
  if (!element) return emptyElement;
  const styles = getComputedStyle(element);
  return {
    rect: toDebugRect(element.getBoundingClientRect()),
    position: styles.position,
    bottom: styles.bottom,
    height: styles.height,
    paddingTop: styles.paddingTop,
    paddingBottom: styles.paddingBottom,
    marginBottom: styles.marginBottom,
    transform: styles.transform,
  };
}

function readNextStaticId(): string {
  const script = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/"]');
  const src = script?.getAttribute("src") ?? "";
  return src.match(/\/_next\/static\/([^/]+)\//)?.[1] ?? "n/a";
}

function readSafeAreaBottom(): string {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  document.body.appendChild(probe);
  const safeAreaBottom = getComputedStyle(probe).paddingBottom;
  probe.remove();
  return safeAreaBottom;
}

function readDebugState(): DebugState {
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
    safeAreaBottom: readSafeAreaBottom(),
    appShell: readElement(document.querySelector("[data-app-shell]")),
    onboardingMain: readElement(document.querySelector(".onboarding-main")),
    onboardingFooter: readElement(document.querySelector("[data-onboarding-footer]")),
    onboardingButton: readElement(document.querySelector("[data-onboarding-button]")),
    onboardingHint: readElement(document.querySelector("[data-onboarding-hint]")),
    bottomNav: readElement(document.querySelector("[data-bottom-nav]")),
    bottomNavInner: readElement(document.querySelector("[data-bottom-nav-inner]")),
    bottomNavItem: readElement(document.querySelector(".bottom-nav-item")),
  };
}

function formatRect(rect: DebugRect): string {
  return rect ? `${rect.top}/${rect.bottom}/${rect.height}` : "n/a";
}

function formatElement(label: string, value: ElementDebug) {
  return (
    <>
      <div>{label}: {formatRect(value.rect)}</div>
      <div>{label} pos/bottom: {value.position}/{value.bottom}</div>
      <div>{label} h/pt/pb/mb: {value.height}/{value.paddingTop}/{value.paddingBottom}/{value.marginBottom}</div>
      <div>{label} transform: {value.transform}</div>
    </>
  );
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
      console.log("SAM layout debug:", next);
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
      className="fixed left-2 top-2 z-[60] max-h-[80dvh] max-w-[calc(100vw-1rem)] overflow-auto border px-2 py-1 text-[10px] leading-tight"
      style={{
        background: "rgba(10,14,20,0.92)",
        borderColor: "rgba(240,246,252,0.14)",
        color: "#c9d1d9",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <div>build: {debug.appVersion}</div>
      <div>nextStatic: {debug.nextStaticId}</div>
      <div>viewport: {debug.viewportMeta ?? "missing"}</div>
      <div>inner/visual/doc/body: {debug.innerHeight}/{debug.visualViewportHeight ?? "n/a"}/{debug.documentClientHeight}/{debug.bodyHeight}</div>
      <div>standalone: {String(debug.standaloneMode)}/{debug.iosStandalone === null ? "n/a" : String(debug.iosStandalone)}</div>
      <div>safe-area-bottom: {debug.safeAreaBottom}</div>
      {formatElement("appShell", debug.appShell)}
      {formatElement("onboardingMain", debug.onboardingMain)}
      {formatElement("footer", debug.onboardingFooter)}
      {formatElement("button", debug.onboardingButton)}
      {formatElement("hint", debug.onboardingHint)}
      {formatElement("bottomNav", debug.bottomNav)}
      {formatElement("bottomNavInner", debug.bottomNavInner)}
      {formatElement("bottomNavItem", debug.bottomNavItem)}
    </div>
  );
}
