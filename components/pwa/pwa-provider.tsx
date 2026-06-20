"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaProvider() {
  const pathname = usePathname();
  const inApp = pathname?.startsWith("/app") ?? false;
  const bottomOffset = inApp
    ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
    : "bottom-[max(1.5rem,env(safe-area-inset-bottom))]";

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedKey = "sam-pwa-install-dismissed";
    if (sessionStorage.getItem(dismissedKey) === "1") {
      setDismissed(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) {
      const timer = window.setTimeout(() => setShowIosHint(true), 2500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.clearTimeout(timer);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("sam-pwa-install-dismissed", "1");
    setDismissed(true);
    setInstallEvent(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  };

  if (dismissed || isStandalone()) return null;

  if (installEvent) {
    return (
      <div
        role="region"
        aria-label="Instalar aplicación"
        className={`fixed ${bottomOffset} left-3 right-3 z-50 rounded-xl border px-4 py-3 shadow-lg`}
        style={{
          background: "#161b22",
          borderColor: "rgba(240,246,252,0.12)",
          color: "#c9d1d9",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        <p className="m-0 text-[12px] leading-snug" style={{ color: "#8b949e" }}>
          // instala SAM en tu dispositivo
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void install()}
            className="flex-1 rounded-lg border-0 px-3 py-2 text-[13px] font-semibold"
            style={{ background: "#e3b341", color: "#0a0e14", cursor: "pointer" }}
          >
            Instalar app
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border-0 bg-transparent px-2 py-2 text-[12px]"
            style={{ color: "#6e7681", cursor: "pointer" }}
          >
            Ahora no
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div
        role="region"
        aria-label="Añadir a pantalla de inicio"
        className={`fixed ${bottomOffset} left-3 right-3 z-50 rounded-xl border px-4 py-3 shadow-lg`}
        style={{
          background: "#161b22",
          borderColor: "rgba(240,246,252,0.12)",
          color: "#c9d1d9",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        <p className="m-0 text-[12px] leading-snug">
          <span style={{ color: "#e3b341" }}>iOS:</span> Compartir →{" "}
          <strong style={{ color: "#f0f6fc" }}>Añadir a pantalla de inicio</strong>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 rounded-lg border-0 bg-transparent p-0 text-[12px]"
          style={{ color: "#6e7681", cursor: "pointer" }}
        >
          Entendido
        </button>
      </div>
    );
  }

  return null;
}
