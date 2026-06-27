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
  outerHeight: number;
  screenHeight: number;
  devicePixelRatio: number;
  visualViewportHeight: number | null;
  visualViewportOffsetTop: number | null;
  visualViewportScale: number | null;
  standaloneMode: boolean;
  iosStandalone: boolean | null;
  safeAreaTop: string;
  safeAreaBottom: string;
  bottomGap: number | null;
  appRoot: ElementDebug;
  appShell: ElementDebug;
  screenHeader: ElementDebug;
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

function readSafeAreaInset(edge: "top" | "bottom"): string {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingTop = edge === "top" ? "env(safe-area-inset-top, 0px)" : "0px";
  probe.style.paddingBottom = edge === "bottom" ? "env(safe-area-inset-bottom, 0px)" : "0px";
  document.body.appendChild(probe);
  const styles = getComputedStyle(probe);
  const inset = edge === "top" ? styles.paddingTop : styles.paddingBottom;
  probe.remove();
  return inset;
}

function readDebugState(): DebugState {
  const bottomNav = document.querySelector("[data-bottom-nav]");
  const bottomNavRect = bottomNav?.getBoundingClientRect();

  return {
    appVersion: APP_BUILD_VERSION,
    nextStaticId: readNextStaticId(),
    viewportMeta:
      document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
    documentClientHeight: document.documentElement.clientHeight,
    bodyHeight: document.body.getBoundingClientRect().height,
    innerHeight: window.innerHeight,
    outerHeight: window.outerHeight,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    visualViewportHeight: window.visualViewport?.height ?? null,
    visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
    visualViewportScale: window.visualViewport?.scale ?? null,
    standaloneMode: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone:
      "standalone" in navigator
        ? (navigator as Navigator & { standalone?: boolean }).standalone === true
        : null,
    safeAreaTop: readSafeAreaInset("top"),
    safeAreaBottom: readSafeAreaInset("bottom"),
    bottomGap: bottomNavRect
      ? Math.round((window.innerHeight - bottomNavRect.bottom) * 100) / 100
      : null,
    appRoot: readElement(document.querySelector(".app-root")),
    appShell: readElement(document.querySelector("[data-app-shell]")),
    screenHeader: readElement(document.querySelector(".sam-screen-header")),
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
    const debugParam = new URLSearchParams(window.location.search).get("layoutDebug");
    if (debugParam === "1") localStorage.setItem("sam-layout-debug", "1");
    if (debugParam === "0") localStorage.removeItem("sam-layout-debug");
    const hasDebugFlag =
      debugParam === "1" ||
      (debugParam !== "0" && localStorage.getItem("sam-layout-debug") === "1");
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
      <div>inner/outer/screen: {debug.innerHeight}/{debug.outerHeight}/{debug.screenHeight}</div>
      <div>visual/doc/body: {debug.visualViewportHeight ?? "n/a"}/{debug.documentClientHeight}/{debug.bodyHeight}</div>
      <div>visual top/scale/dpr: {debug.visualViewportOffsetTop ?? "n/a"}/{debug.visualViewportScale ?? "n/a"}/{debug.devicePixelRatio}</div>
      <div>standalone: {String(debug.standaloneMode)}/{debug.iosStandalone === null ? "n/a" : String(debug.iosStandalone)}</div>
      <div>safe-area top/bottom: {debug.safeAreaTop}/{debug.safeAreaBottom}</div>
      <div>bottom gap: {debug.bottomGap ?? "n/a"}</div>
      {formatElement("appRoot", debug.appRoot)}
      {formatElement("appShell", debug.appShell)}
      {formatElement("screenHeader", debug.screenHeader)}
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
