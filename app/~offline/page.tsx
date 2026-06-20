export default function OfflinePage() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center text-center pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        background: "radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)",
        color: "#c9d1d9",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <p className="m-0 text-[13px]" style={{ color: "#e3b341" }}>
        // sin conexión
      </p>
      <h1 className="mt-3 text-lg font-semibold" style={{ color: "#f0f6fc" }}>
        SAM está offline
      </h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed" style={{ color: "#8b949e" }}>
        Revisa tu red e inténtalo de nuevo. La interfaz guardada puede seguir disponible cuando vuelvas a
        abrir la app.
      </p>
      <a
        href="/app"
        className="mt-6 inline-block rounded-lg px-4 py-2 text-[13px] font-semibold no-underline"
        style={{ background: "#e3b341", color: "#0a0e14" }}
      >
        Reintentar
      </a>
    </main>
  );
}
