"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { signIn, signUp } from "@/lib/auth/client";
import { signInWithGoogle } from "@/lib/auth/client";

const FEATURES = [
  { command: "flow.inspect --month=current", title: "Entiende el movimiento, no solo el saldo.", copy: "SAM enlaza ingresos, compromisos, gasto flexible y ahorro en una lectura continua.", view: "flow" },
  { command: "budget.pressure --sort=desc", title: "Detecta presión antes de pasarte.", copy: "Cada presupuesto muestra cuánto margen queda y dónde conviene actuar primero.", view: "budget" },
  { command: "schedule.next --active", title: "Mira lo que viene antes de que llegue.", copy: "Pagos e ingresos recurrentes actualizan el cierre estimado del periodo.", view: "schedule" },
  { command: "goal.runway --all", title: "Convierte tus metas en trayectorias.", copy: "Visualiza avance, distancia y reservas sin perder el contexto de tu día a día.", view: "goals" },
] as const;

export function DesktopOnboarding({ authSuccess, userName }: { authSuccess: boolean; userName: string }) {
  const [feature, setFeature] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (authSuccess) { const timer = window.setTimeout(() => window.location.assign("/app"), 900); return () => window.clearTimeout(timer); }
  }, [authSuccess]);
  useEffect(() => {
    if (paused || authSuccess) return;
    const timer = window.setInterval(() => setFeature((value) => (value + 1) % FEATURES.length), 6800);
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [authSuccess, paused]);

  return <main className="sam-desktop-auth" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <section className="desk-auth-story" aria-live="polite">
      <div className="desk-auth-brand"><span>S</span><strong>SAM</strong><small>living ledger</small></div>
      <div className="desk-auth-feature" key={feature}>
        <span className="desk-command">$ {FEATURES[feature].command}</span>
        <h1>{FEATURES[feature].title}</h1>
        <p>{FEATURES[feature].copy}</p>
        <FeaturePreview view={FEATURES[feature].view}/>
      </div>
      <div className="desk-auth-pager" aria-label="Funciones destacadas">{FEATURES.map((item, index) => <button key={item.command} type="button" className={index === feature ? "is-active" : ""} onClick={() => setFeature(index)} aria-label={`Ver función ${index + 1}`}><i/></button>)}</div>
      <small className="desk-auth-security"><ShieldCheck size={13}/> Tus credenciales y datos permanecen protegidos.</small>
    </section>
    <section className="desk-auth-access">
      {authSuccess ? <div className="desk-auth-success"><span><Check size={22}/></span><h2>Sesión verificada</h2><p>Hola, {userName}. Preparando tu libro financiero…</p><i/></div> : <DesktopAuthForm/>}
    </section>
  </main>;
}

function DesktopAuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const submit = async (form: FormData) => {
    setBusy(true); setError("");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    try {
      const result = mode === "login" ? await signIn.email({ email, password }) : await signUp.email({ email, password, name: name || email.split("@")[0] });
      if (result.error) throw new Error(result.error.message || "No se pudo iniciar la sesión.");
      window.location.assign("/app");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar la sesión."); setBusy(false); }
  };
  const google = async () => { setBusy(true); setError(""); try { await signInWithGoogle(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Google no respondió."); setBusy(false); } };
  return <div className="desk-auth-form-wrap">
    <span className="desk-command">sam://auth/session</span><h2>{mode === "login" ? "Vuelve a tu libro" : "Crea tu espacio financiero"}</h2><p>{mode === "login" ? "Accede a tu contexto completo desde el navegador." : "Configura tu bóveda personal en menos de un minuto."}</p>
    <div className="desk-auth-tabs" role="tablist"><button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Iniciar sesión</button><button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Crear cuenta</button></div>
    <button type="button" className="desk-google-button" onClick={() => void google()} disabled={busy}><b>G</b> Continuar con Google</button>
    <div className="desk-auth-separator"><span>o usa tu correo</span></div>
    <form action={submit} className="desk-auth-form">
      {mode === "signup" && <label><span>Nombre</span><input name="name" autoComplete="name" required minLength={2} placeholder="Tu nombre"/></label>}
      <label><span>Correo</span><input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com"/></label>
      <label><span>Contraseña</span><div><LockKeyhole size={14}/><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} placeholder="8 caracteres o más"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></label>
      {mode === "login" && <button type="button" className="desk-forgot" onClick={() => setForgot(true)}>¿Olvidaste tu contraseña?</button>}
      {forgot && <p className="desk-auth-note">Escríbenos desde tu correo de acceso para verificar y recuperar tu cuenta.</p>}
      {error && <p className="desk-form-error" role="alert">{error}</p>}
      <button type="submit" className="desk-auth-submit" disabled={busy}>{busy ? <LoaderCircle className="desk-spin" size={16}/> : <ArrowRight size={16}/>} {busy ? "Verificando…" : mode === "login" ? "Entrar a SAM" : "Crear mi cuenta"}</button>
    </form>
    <small className="desk-auth-legal">Al continuar aceptas los términos y la política de privacidad de SAM.</small>
  </div>;
}

function FeaturePreview({ view }: { view: (typeof FEATURES)[number]["view"] }) {
  if (view === "flow") return <div className="desk-auth-preview desk-auth-flow"><div><span>income</span><i/><b>+4.8k</b></div><div><span>commitments</span><i/><b>−1.6k</b></div><div><span>flexible</span><i/><b>−860</b></div><em/><strong>close 2.3k</strong></div>;
  if (view === "budget") return <div className="desk-auth-preview desk-auth-budget">{[["Home",42],["Food",73],["Travel",91]].map(([label, value]) => <div key={String(label)}><span>{label}</span><i><em style={{ width: `${value}%` }}/></i><b>{value}%</b></div>)}</div>;
  if (view === "schedule") return <div className="desk-auth-preview desk-auth-schedule">{[["08 AUG","Rent","−1,200"],["12 AUG","Payroll","+3,400"],["16 AUG","Cloud","−29"]].map((row) => <div key={row[1]}><time>{row[0]}</time><strong>{row[1]}</strong><b className={row[2].startsWith("+") ? "is-positive" : ""}>{row[2]}</b></div>)}</div>;
  return <div className="desk-auth-preview desk-auth-goals"><div><span>Emergency runway</span><i><em style={{ width: "64%" }}/></i><b>64%</b></div><div><span>Next trip</span><i><em style={{ width: "38%" }}/></i><b>38%</b></div></div>;
}
