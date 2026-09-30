"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleHelp, LoaderCircle, Pause, Play, ShieldCheck, X } from "lucide-react";
import type { Lang } from "@/lib/i18n/i18n-context";
import type { DesktopCopy } from "../desktop-copy";
import { useTourStore } from "./tour-store";
import {
  TOUR_CHAPTERS,
  TOUR_STEPS,
  TOUR_UI,
  chapterIndex,
  chapterSteps,
  fill,
  type TourEnsure,
  type TourPlacement,
  type TourStepDef,
} from "./tour-steps";

export type TourBridge = {
  open: (overlay: TourEnsure) => void;
  /** Close inspector, action drawer and Samy, except the overlay the step keeps. */
  closeOverlays: (keep?: TourEnsure) => void;
};

const LAST_STEP = TOUR_STEPS.length - 1;
const MISSING_AFTER_MS = 2400;

function normalizePath(pathname: string | null) {
  if (!pathname) return "/app";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "/app/overview" ? "/app" : trimmed || "/app";
}

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable=true]");
}

function useTourController(userId: string) {
  const [state, set] = useTourStore(userId);
  const router = useRouter();
  const pathname = normalizePath(usePathname());

  const arrived = state.pendingStep !== null && state.navigatingTo === pathname;
  const stepIndex = arrived ? state.pendingStep! : state.step;
  const navigating = state.pendingStep !== null && !arrived;

  const goTo = useCallback((index: number) => {
    const target = Math.max(0, Math.min(LAST_STEP, index));
    const route = TOUR_STEPS[target].route;
    if (route === pathname) {
      set((current) => ({
        status: "running",
        step: target,
        furthest: Math.max(current.furthest, target),
        roadmapOpen: false,
        introduced: true,
        navigatingTo: null,
        navigatingFrom: null,
        pendingStep: null,
      }));
      return;
    }
    set({ status: "running", roadmapOpen: false, introduced: true, navigatingTo: route, navigatingFrom: pathname, pendingStep: target });
    router.push(route);
  }, [pathname, router, set]);

  const finish = useCallback(() => {
    set({ status: "idle", completed: true, furthest: LAST_STEP, step: 0, roadmapOpen: false, navigatingTo: null, navigatingFrom: null, pendingStep: null });
  }, [set]);

  const next = useCallback(() => {
    if (navigating) return;
    if (stepIndex >= LAST_STEP) finish();
    else goTo(stepIndex + 1);
  }, [finish, goTo, navigating, stepIndex]);

  const prev = useCallback(() => {
    if (!navigating) goTo(Math.max(0, stepIndex - 1));
  }, [goTo, navigating, stepIndex]);
  const pause = useCallback(() => set({ status: "paused", navigatingTo: null, navigatingFrom: null, pendingStep: null }), [set]);
  const exit = useCallback(() => set({ status: "idle", roadmapOpen: false, navigatingTo: null, navigatingFrom: null, pendingStep: null }), [set]);

  return { state, set, router, pathname, stepIndex, navigating, arrived, goTo, next, prev, pause, exit, finish };
}

function sectionLabel(route: string, copy: DesktopCopy) {
  const section = route.split("/")[2] as keyof DesktopCopy | undefined;
  if (!section) return copy.overview;
  return copy[section] ?? section;
}

/* ------------------------------------------------------------------------ */
/* Help button + roadmap                                                    */
/* ------------------------------------------------------------------------ */

export function TourHelpButton({ userId, lang }: { userId: string; lang: Lang }) {
  const ui = TOUR_UI[lang];
  const { state, set, goTo, stepIndex } = useTourController(userId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const open = state.roadmapOpen;

  useEffect(() => {
    set((current) => (current.introduced || current.status !== "idle" ? {} : { roadmapOpen: true, introduced: true }));
  }, [set]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) set({ roadmapOpen: false });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") set({ roadmapOpen: false });
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, set]);

  const toggle = () => {
    set((current) => ({
      roadmapOpen: !current.roadmapOpen,
      status: current.status === "running" ? "paused" : current.status,
    }));
  };

  const inProgress = state.status !== "idle";
  const cta = inProgress
    ? fill(ui.resume, { n: stepIndex + 1 })
    : state.completed ? ui.replay : ui.start;

  return (
    <div className="tour-help" ref={wrapRef}>
      <button
        type="button"
        className="tour-help-button"
        data-tour="help"
        aria-label={ui.open}
        title={ui.open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <CircleHelp size={16} />
        {state.status === "paused" && <i className="tour-help-dot" aria-hidden="true" />}
      </button>
      {open && (
        <section id={panelId} className="tour-roadmap" role="dialog" aria-labelledby={titleId}>
          <header className="tour-roadmap-head">
            <div>
              <span className="tour-kicker">{ui.kicker}</span>
              <h2 id={titleId}>{ui.title}</h2>
            </div>
            <button type="button" className="tour-icon-button" onClick={() => set({ roadmapOpen: false })} aria-label={ui.close}>
              <X size={15} />
            </button>
          </header>
          <p className="tour-roadmap-intro">{ui.intro}</p>
          <ol className="tour-roadmap-list">
            {TOUR_CHAPTERS.map((chapter, index) => {
              const range = chapterSteps(chapter.id);
              const done = state.completed || state.furthest > range.last;
              const current = inProgress && stepIndex >= range.first && stepIndex <= range.last;
              return (
                <li key={chapter.id}>
                  <button
                    type="button"
                    className={current ? "is-current" : done ? "is-done" : undefined}
                    onClick={() => goTo(range.first)}
                  >
                    <span className="tour-roadmap-mark" aria-hidden="true">
                      {done && !current ? <Check size={12} /> : String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="tour-roadmap-copy">
                      <strong>{chapter.title[lang]}</strong>
                      <small>{current ? ui.chapterCurrent : chapter.summary[lang]}</small>
                    </span>
                    <span className="tour-roadmap-count">
                      {done && !current ? <span className="sr-only">{ui.chapterDone}</span> : null}
                      {fill(ui.steps, { n: range.count })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <footer className="tour-roadmap-foot">
            <span>{ui.footnote}</span>
            <div>
              <button type="button" className="desk-secondary-button" onClick={() => set({ roadmapOpen: false })}>{ui.later}</button>
              <button
                type="button"
                className="desk-primary-button"
                onClick={() => goTo(inProgress ? stepIndex : 0)}
              >
                {inProgress ? <Play size={14} /> : <ArrowRight size={14} />} {cta}
              </button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Spotlight, step card and paused pill                                     */
/* ------------------------------------------------------------------------ */

type Rect = { top: number; left: number; width: number; height: number };

const SPOT_PAD = 6;
const CARD_GAP = 14;
const VIEW_MARGIN = 12;

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

function placeCard(rect: Rect | null, card: { w: number; h: number }, preferred: TourPlacement, vw: number, vh: number) {
  const clampX = (x: number) => Math.max(VIEW_MARGIN, Math.min(vw - card.w - VIEW_MARGIN, x));
  const clampY = (y: number) => Math.max(VIEW_MARGIN, Math.min(vh - card.h - VIEW_MARGIN, y));
  if (!rect) return { x: clampX((vw - card.w) / 2), y: clampY((vh - card.h) / 2) };

  const spot = {
    top: rect.top - SPOT_PAD,
    left: rect.left - SPOT_PAD,
    right: rect.left + rect.width + SPOT_PAD,
    bottom: rect.top + rect.height + SPOT_PAD,
  };
  const centerX = rect.left + rect.width / 2 - card.w / 2;
  const centerY = rect.top + rect.height / 2 - card.h / 2;
  const candidates: Record<TourPlacement, { x: number; y: number; fits: boolean }> = {
    bottom: { x: clampX(centerX), y: spot.bottom + CARD_GAP, fits: spot.bottom + CARD_GAP + card.h <= vh - VIEW_MARGIN },
    top: { x: clampX(centerX), y: spot.top - CARD_GAP - card.h, fits: spot.top - CARD_GAP - card.h >= VIEW_MARGIN },
    right: { x: spot.right + CARD_GAP, y: clampY(centerY), fits: spot.right + CARD_GAP + card.w <= vw - VIEW_MARGIN },
    left: { x: spot.left - CARD_GAP - card.w, y: clampY(centerY), fits: spot.left - CARD_GAP - card.w >= VIEW_MARGIN },
  };
  const order: TourPlacement[] = [preferred, ...(["bottom", "top", "right", "left"] as TourPlacement[]).filter((p) => p !== preferred)];
  const hit = order.find((placement) => candidates[placement].fits);
  if (hit) return { x: candidates[hit].x, y: candidates[hit].y };
  return { x: clampX(vw - card.w - VIEW_MARGIN * 2), y: clampY(vh - card.h - VIEW_MARGIN * 2) };
}

export function TourLayer({
  userId,
  lang,
  copy,
  bridge,
}: {
  userId: string;
  lang: Lang;
  copy: DesktopCopy;
  bridge: TourBridge;
}) {
  const ui = TOUR_UI[lang];
  const { state, set, router, pathname, stepIndex, navigating, arrived, goTo, next, prev, pause, exit } = useTourController(userId);
  const step: TourStepDef = TOUR_STEPS[stepIndex];
  const running = state.status === "running";
  const onRoute = step.route === pathname;
  const active = running && onRoute;

  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;
  const nextRef = useRef(next);
  nextRef.current = next;

  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const titleId = useId();

  // The destination page is mounted: only now does the tour move to the pending step.
  useEffect(() => {
    if (arrived) {
      set((current) => current.pendingStep === null ? {} : {
        step: current.pendingStep,
        furthest: Math.max(current.furthest, current.pendingStep),
        pendingStep: null,
        navigatingTo: null,
        navigatingFrom: null,
      });
    } else if (state.pendingStep !== null && pathname !== state.navigatingFrom && pathname !== state.navigatingTo) {
      set({ pendingStep: null, navigatingTo: null, navigatingFrom: null });
    }
  }, [arrived, pathname, set, state.navigatingFrom, state.navigatingTo, state.pendingStep]);

  // Warm up the neighbouring pages so moving between them is immediate.
  useEffect(() => {
    if (state.status === "idle") return;
    for (const index of [stepIndex - 1, stepIndex + 1, stepIndex + 2]) {
      const route = TOUR_STEPS[index]?.route;
      if (route && route !== pathname) router.prefetch(route);
    }
  }, [pathname, router, state.status, stepIndex]);

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // A practice overlay must not outlive practice mode, or its forms would save for real.
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (wasActiveRef.current && !active && step.sandbox) bridgeRef.current.closeOverlays();
    wasActiveRef.current = active;
  }, [active, step]);

  // Entering a step resets the page to a clean state, then opens what the step needs.
  useEffect(() => {
    if (!active) return;
    doneRef.current = false;
    setDone(false);
    setMissing(false);
    setRect(null);
    bridgeRef.current.closeOverlays(step.keep);
    if (step.ensure) bridgeRef.current.open(step.ensure);
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    const startedAt = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doneWhen = step.task?.doneWhen;
    let scrolled = false;
    // A task only counts once its condition flips from false to true, so leftovers
    // from the previous step (an open drawer while going back) never tick it.
    let sawAbsent = false;
    let frame = 0;

    const tick = () => {
      const element = document.querySelector<HTMLElement>(step.target);
      const box = element?.getBoundingClientRect();
      if (!element || !box || box.width === 0 || box.height === 0) {
        setRect((current) => (current === null ? current : null));
        if (performance.now() - startedAt > MISSING_AFTER_MS) setMissing(true);
      } else {
        setMissing(false);
        if (!scrolled) {
          scrolled = true;
          const outOfView = box.top < 60 || box.bottom > window.innerHeight - 70;
          if (outOfView && box.height < window.innerHeight * 0.7) {
            element.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
          }
        }
        const nextRect: Rect = { top: box.top, left: box.left, width: box.width, height: box.height };
        setRect((current) => (sameRect(current, nextRect) ? current : nextRect));
      }

      if (doneWhen && !doneRef.current) {
        const present = Boolean(document.querySelector(doneWhen));
        if (!present) sawAbsent = true;
        else if (sawAbsent) {
          doneRef.current = true;
          setDone(true);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, step]);

  // Practice mode: forms inside the highlighted element never reach their handlers.
  useEffect(() => {
    if (!active || !step.sandbox) return;
    const inside = (target: EventTarget | null) => {
      const root = document.querySelector(step.target);
      return Boolean(root && target instanceof Node && root.contains(target));
    };
    const intercept = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      doneRef.current = true;
      setDone(true);
    };
    const onSubmit = (event: Event) => {
      if (inside(event.target)) intercept(event);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === "Enter" && !event.shiftKey && target instanceof HTMLTextAreaElement
        && inside(target) && target.value.trim()
      ) intercept(event);
    };
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [active, step]);

  useEffect(() => {
    if (!running) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditable(event.target)) return;
      if (event.key === "ArrowRight") { event.preventDefault(); nextRef.current(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); prev(); }
      else if (event.key === "Escape") { event.preventDefault(); pause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pause, prev, running]);

  useEffect(() => {
    if (!running) return;
    cardRef.current?.focus({ preventScroll: true });
  }, [running, stepIndex]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !viewport.w) return;
    const spotRect = active ? rect : null;
    setCardPos(placeCard(spotRect, { w: card.offsetWidth, h: card.offsetHeight }, step.placement, viewport.w, viewport.h));
  }, [active, done, missing, navigating, rect, step, viewport]);

  if (state.status === "paused") {
    if (state.roadmapOpen) return null;
    const chapter = TOUR_CHAPTERS[chapterIndex(step.chapter)];
    return (
      <div className="tour-paused" role="status">
        <CircleHelp size={16} aria-hidden="true" />
        <span>
          <strong>{ui.paused}</strong>
          <small>{fill(ui.stepOf, { n: stepIndex + 1, total: TOUR_STEPS.length })} · {chapter.title[lang]}</small>
        </span>
        <button type="button" className="desk-primary-button" onClick={() => goTo(stepIndex)}>
          <Play size={13} /> {ui.continue}
        </button>
        <button type="button" className="tour-icon-button" onClick={exit} aria-label={ui.exit} title={ui.exit}>
          <X size={15} />
        </button>
      </div>
    );
  }

  if (!running) return null;

  const chapterPos = chapterIndex(step.chapter);
  const chapter = TOUR_CHAPTERS[chapterPos];
  const spot = active ? rect : null;
  const interactive = Boolean(step.task);
  const spotStyle: CSSProperties | undefined = spot
    ? {
        transform: `translate(${spot.left - SPOT_PAD}px, ${spot.top - SPOT_PAD}px)`,
        width: spot.width + SPOT_PAD * 2,
        height: spot.height + SPOT_PAD * 2,
      }
    : undefined;
  const cardStyle: CSSProperties = cardPos
    ? { transform: `translate(${Math.round(cardPos.x)}px, ${Math.round(cardPos.y)}px)` }
    : { visibility: "hidden" };
  const destination = state.navigatingTo ? sectionLabel(state.navigatingTo, copy) : "";

  return (
    <div className="tour-layer">
      {spot ? (
        <div key={step.id} className={`tour-spot${interactive && !done ? " is-task" : ""}`} style={spotStyle} aria-hidden="true" />
      ) : (
        <div className="tour-dim" aria-hidden="true" />
      )}
      <div
        ref={cardRef}
        className="tour-card"
        style={cardStyle}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-busy={navigating}
        tabIndex={-1}
      >
        <header className="tour-card-head">
          <span className="tour-kicker">
            {String(chapterPos + 1).padStart(2, "0")} · {chapter.title[lang]}
          </span>
          <span className="tour-count">{stepIndex + 1}/{TOUR_STEPS.length}</span>
          <button type="button" className="tour-icon-button" onClick={pause} aria-label={ui.pause} title={ui.pause}>
            <Pause size={14} />
          </button>
          <button type="button" className="tour-icon-button" onClick={exit} aria-label={ui.exit} title={ui.exit}>
            <X size={15} />
          </button>
        </header>
        <div className="tour-segments" aria-hidden="true">
          {TOUR_CHAPTERS.map((item, index) => {
            const range = chapterSteps(item.id);
            const fraction = index < chapterPos ? 1 : index > chapterPos ? 0 : (stepIndex - range.first + 1) / range.count;
            return <i key={item.id} className={index < chapterPos ? "is-done" : undefined}><b style={{ transform: `scaleX(${fraction})` }} /></i>;
          })}
        </div>

        <div className="tour-card-body" aria-live="polite">
          <h2 id={titleId}>{step.title[lang]}</h2>
          <p className="tour-body">{step.body[lang]}</p>

          {navigating ? (
            <p className="tour-status"><LoaderCircle size={14} className="desk-spin" /> {fill(ui.loading, { section: destination })}</p>
          ) : !onRoute ? (
            <p className="tour-status">
              {fill(ui.offRoute, { section: sectionLabel(step.route, copy) })}
              <button type="button" className="desk-text-button" onClick={() => goTo(stepIndex)}>{ui.goThere} <ArrowRight size={12} /></button>
            </p>
          ) : missing ? (
            <p className="tour-status">{ui.notFound}</p>
          ) : null}

          {step.task && onRoute && (
            <div className={`tour-task${done ? " is-done" : ""}`}>
              <span className="tour-task-mark" aria-hidden="true">{done ? <Check size={12} /> : null}</span>
              <span>
                <small>{ui.tryIt} · {ui.optional}</small>
                <strong>{done ? step.task.done[lang] : step.task.label[lang]}</strong>
              </span>
            </div>
          )}
          {step.sandbox && onRoute && (
            <p className="tour-practice"><ShieldCheck size={13} aria-hidden="true" /> {ui.practice}</p>
          )}
        </div>

        <footer className="tour-card-foot">
          <span className="tour-keys">{ui.keys}</span>
          <button type="button" className="desk-secondary-button" onClick={prev} disabled={stepIndex === 0 || navigating}>
            <ArrowLeft size={14} /> {ui.back}
          </button>
          <button type="button" className="desk-primary-button" onClick={next} disabled={navigating}>
            {navigating
              ? <><LoaderCircle size={14} className="desk-spin" /> {ui.preparing}</>
              : stepIndex >= LAST_STEP ? <><Check size={14} /> {ui.finish}</> : <>{ui.next} <ArrowRight size={14} /></>}
          </button>
        </footer>
      </div>
    </div>
  );
}
