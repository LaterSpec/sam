"use client";

// Adapted from the ThoughtLine source supplied by the user (React Bits).
import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { ToolProgress } from "@/lib/samy/progress";
import { toolProgressLabel } from "@/lib/samy/progress";
import "./thought-line.css";

export function ThoughtLine({ working, steps, language, phase, elapsed, failed = false }: {
  working: boolean;
  steps: ToolProgress[];
  language: "es" | "en";
  phase: "preparing" | "responding";
  elapsed?: number;
  failed?: boolean;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const [open, setOpen] = useState(working);
  const [seconds, setSeconds] = useState(0);
  const started = useRef(0);
  const es = language === "es";
  useEffect(() => {
    setOpen(working);
    if (!working) return;
    started.current = performance.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds((performance.now() - started.current) / 1000), 100);
    return () => clearInterval(timer);
  }, [working]);
  const active = steps.filter(step => step.status === "running");
  const label = working
    ? active.length ? toolProgressLabel(active[active.length - 1].name, language)
      : phase === "responding" ? (es ? "Redactando respuesta" : "Writing response") : (es ? "Preparando respuesta" : "Preparing response")
    : failed ? (es ? "Respuesta interrumpida" : "Response interrupted") : (es ? "Proceso finalizado" : "Finished");
  const duration = elapsed ?? seconds;
  const showTimer = working || elapsed !== undefined;
  const head = <>
    <motion.span className="thought-line__glyph" aria-hidden="true" animate={{ opacity: working && !reduce ? [1, 0.55, 1] : 1 }} transition={{ duration: 1.6, repeat: working && !reduce ? Infinity : 0 }}>
      <HugeiconsIcon icon={SparklesIcon} size={15}/>
    </motion.span>
    <span className="thought-line__label">{label}</span>
    {showTimer && <span className="thought-line__timer" aria-hidden="true">{duration < 60 ? `${duration.toFixed(1)}s` : `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`}</span>}
    {steps.length > 0 && <HugeiconsIcon icon={ArrowDown01Icon} size={13} className="thought-line__chevron" aria-hidden="true"/>}
  </>;
  return <div className="thought-line" data-working={working || undefined} data-open={open || undefined}>
    {steps.length ? <button className="thought-line__head" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>{head}</button> : <div className="thought-line__head">{head}</div>}
    <span className="thought-line__sr" role="status" aria-live="polite">{label}</span>
    {steps.length > 0 && <div id={id} className="thought-line__trace" hidden={!open}>
      <ol>{steps.map(step => <li key={step.id} data-state={step.status}>
        <span className="thought-line__mark" aria-hidden="true">{step.status === "done" ? <HugeiconsIcon icon={Tick02Icon} size={13}/> : step.status === "running" ? <i/> : "!"}</span>
        <span>{toolProgressLabel(step.name, language)}<small>{step.status === "error" ? (es ? "No se pudo completar" : "Could not complete") : step.status === "confirmation" ? (es ? "Requiere tu confirmación" : "Needs your confirmation") : step.status === "interrupted" ? (es ? "Sin resultado confirmado" : "No confirmed result") : step.status === "done" ? (es ? "Completado" : "Completed") : (es ? "En curso" : "In progress")}</small></span>
      </li>)}</ol>
    </div>}
  </div>;
}
