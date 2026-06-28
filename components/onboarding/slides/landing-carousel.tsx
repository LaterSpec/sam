"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";
import {
  SlideTrack,
  SlideOverview,
  SlideGoals,
  SlideInvest,
  SlidePrivacy,
  SlideMcp,
} from "./slide-illustrations";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageToggle } from "@/components/ui/language-toggle";

const SLIDES = [
  {
    Illustration: SlideTrack,
    title: "log every move",
    sub: "tap, type, or just say it. SAM categorizes every transaction in seconds — no spreadsheets, no friction.",
    accentKey: "cyan" as const,
  },
  {
    Illustration: SlideOverview,
    title: "see the whole picture",
    sub: "account balances, budgets tied to your transactions, and charts built from what you log. all in one screen.",
    accentKey: "yellow" as const,
  },
  {
    Illustration: SlideGoals,
    title: "reach what matters",
    sub: "set goals, record progress, and see what remains. keep the plan next to the rest of your finances.",
    accentKey: "magenta" as const,
  },
  {
    Illustration: SlideInvest,
    title: "invest, watch the market",
    sub: "track tickers, build a portfolio, follow live prices — stocks, ETFs and crypto, all in the same terminal.",
    accentKey: "cyan" as const,
  },
  {
    Illustration: SlidePrivacy,
    title: "your money. your machine.",
    sub: "your finance data stays scoped to your authenticated account. PWA-first and ready to install.",
    accentKey: "green" as const,
  },
  {
    Illustration: SlideMcp,
    title: "connect SAM to your AI tools",
    sub: "use MCP to let Cursor, Claude or any agent read and manage your finances — securely, on your terms.",
    accentKey: "magenta" as const,
  },
];

const ProgressBars = memo(function ProgressBars({
  idx,
  accent,
  onJump,
}: {
  idx: number;
  accent: string;
  onJump: (i: number) => void;
}) {
  const { sam } = useSam();
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {SLIDES.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump(i)}
          aria-label={`Slide ${i + 1}`}
          style={{
            width: i === idx ? 60 : 24,
            height: 3,
            background: i === idx ? accent : i < idx ? sam.textDim : "rgba(255,255,255,0.08)",
            cursor: "pointer",
            border: "none",
            padding: 0,
            transition: "width 320ms cubic-bezier(.2,.9,.2,1), background 220ms ease-out",
          }}
        />
      ))}
    </div>
  );
});

export function LandingCarousel({ onDone }: { onDone: () => void }) {
  const { sam } = useSam();
  const { t, lang, setLang } = useI18n();
  const skipMotion = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [idx]);

  const slide = SLIDES[idx];
  const accent = sam[slide.accentKey];

  const next = () => {
    if (idx < SLIDES.length - 1) {
      setDirection(1);
      setIdx(idx + 1);
    } else {
      onDone();
    }
  };

  const prev = () => {
    if (idx > 0) {
      setDirection(-1);
      setIdx(idx - 1);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (dx < -40) next();
    if (dx > 40) prev();
    touchStart.current = null;
  };

  const Illustration = slide.Illustration;

  return (
    <div
      className="landing-carousel"
      style={{ fontFamily: sam.font, color: sam.text, background: sam.bg }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header
        className="onboarding-header"
        style={{
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          fontSize: 11,
          color: sam.comment,
        }}
      >
        <Mono c={sam.yellow} b>
          SAM
        </Mono>
        <span style={{ flex: 1 }} />
        <LanguageToggle value={lang} onChange={setLang} />
        <button type="button" onClick={onDone} style={{ cursor: "pointer", color: sam.comment, background: "none", border: "none", fontFamily: sam.font, fontSize: 11, marginLeft: 12 }}>
          {t("[skip]")}
        </button>
      </header>

      <main className="onboarding-main">
        <div className="onboarding-slide">
          <section
            className="onboarding-visual"
            style={{ padding: "4px 18px 12px", display: "flex", flexDirection: "column" }}
          >
            <div style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.4 }}>
              <Mono c={sam.text} b>
                sam
              </Mono>
              <Mono c={sam.text} b>
                @init.SAM
              </Mono>
              <Mono c={sam.yellow} b>
                {" "}
                ${" "}
              </Mono>
              <Mono c={accent} b>
                ./welcome --slide={idx + 1}
              </Mono>
            </div>
            <div
              key={animKey}
              className={skipMotion ? undefined : direction >= 0 ? "sam-slide-in-r" : "sam-slide-in-l"}
              style={{ flex: 1, minHeight: 0, position: "relative" }}
            >
              <Illustration active={true} slideKey={animKey} skipMotion={skipMotion} />
            </div>
          </section>

          <section className="onboarding-content" style={{ padding: "6px 22px 16px" }}>
            <ProgressBars
              idx={idx}
              accent={accent}
              onJump={(i) => {
                setDirection(i > idx ? 1 : -1);
                setIdx(i);
              }}
            />
            <div key={`t-${animKey}`} className={skipMotion ? undefined : "sam-fade-up"}>
              <div style={{ fontSize: 11, color: sam.comment, marginBottom: 6 }}>
                {`// ${(idx + 1).toString().padStart(2, "0")} ${t("of")} ${SLIDES.length.toString().padStart(2, "0")}`}
              </div>
              <h2
                className="onboarding-title"
                style={{
                  margin: 0,
                  fontFamily: sam.font,
                  fontSize: 26,
                  lineHeight: 1.15,
                  color: sam.text,
                  fontWeight: 700,
                  letterSpacing: -0.5,
                }}
              >
                <span style={{ color: accent }}>›</span> {t(slide.title)}
              </h2>
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: sam.font,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: sam.textDim,
                }}
              >
                <span style={{ color: sam.comment }}>// </span>
                {t(slide.sub)}
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="onboarding-footer" data-onboarding-footer>
        <button
          type="button"
          onClick={next}
          className="onboarding-continue-button"
          data-onboarding-button
          style={{
            background: accent,
            color: sam.bg,
            fontFamily: sam.font,
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            letterSpacing: 0.4,
          }}
        >
          {idx < SLIDES.length - 1 ? t("[continue ▸]") : t("[get started ▸]")}
        </button>
        <p
          className="onboarding-hint"
          data-onboarding-hint
          style={{ fontSize: 10, color: sam.comment, textAlign: "center" }}
        >
          {`// ${t("swipe or tap dots to navigate")}`}
        </p>
      </footer>
    </div>
  );
}
