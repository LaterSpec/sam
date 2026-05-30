// SAM — Onboarding (landing slides + auth)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IOSDevice } from '../shared/ios-frame.jsx';
import { FRAME_W, FRAME_H, CONTENT_TOP, computeFrameScale } from '../shared/frame-layout.js';
import SamDemoDB from '../demo-db.js';

const SAM = {
  bg: '#0a0e14',
  bgAlt: '#0d1117',
  sheet: '#10151c',
  border: 'rgba(240,246,252,0.08)',
  borderStrong: 'rgba(240,246,252,0.18)',
  text: '#c9d1d9',
  textDim: '#8b949e',
  comment: '#6e7681',
  yellow: '#e3b341',
  cyan: '#58a6ff',
  green: '#56d364',
  red: '#f85149',
  magenta: '#bc8cff',
  orange: '#e8824a',
  font: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
};

// ───────────── primitives ─────────────
const Mono = ({ children, c, b, style }) => (
  <span style={{ color: c || SAM.text, fontWeight: b ? 600 : 400, ...style }}>{children}</span>
);

// blinking cursor
const Cursor = ({ c = SAM.yellow }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 14, marginLeft: 2,
    background: c, verticalAlign: '-2px',
    animation: 'sam-cursor 1s steps(2) infinite',
  }}/>
);

// hook: typewriter that types `text` over `dur` ms, restarts when key changes
function useTypewriter(text, dur = 1200, key = 0) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(p * text.length));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, dur, key]);
  return text.slice(0, n);
}

// hook: counts up from 0 to `target` over `dur`, restarts on key change
function useCountUp(target, dur = 1100, key = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(0);
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      // ease-out cubic
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, key]);
  return v;
}

// hook: progress 0→1 over `dur`, key restarts
function useProgress(dur = 1400, key = 0) {
  const [p, setP] = useState(0);
  useEffect(() => {
    setP(0);
    const start = performance.now();
    let raf;
    const step = (t) => {
      const v = Math.min(1, (t - start) / dur);
      setP(v);
      if (v < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dur, key]);
  return p;
}

// ───────────── Slide illustrations ─────────────

// slide 0 — track everything (terminal log animating)
function SlideTrack({ active, slideKey }) {
  const lines = [
    { t: 800, text: 'you@sam $ tx --add', c: SAM.cyan },
    { t: 1200, text: '› starbucks · -$6.50', c: SAM.text, indent: true },
    { t: 1600, text: 'you@sam $ tx --add', c: SAM.cyan },
    { t: 2000, text: '› uber · -$14.20', c: SAM.text, indent: true },
    { t: 2400, text: 'you@sam $ tx --add', c: SAM.cyan },
    { t: 2800, text: '› payroll · +$3,200', c: SAM.green, indent: true },
    { t: 3200, text: '✓ logged · synced · categorized', c: SAM.green },
  ];
  const k = active ? slideKey : -1;
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) { setT(0); return; }
    setT(0);
    const start = performance.now();
    let raf;
    const step = (now) => {
      setT(now - start);
      if (now - start < 4000) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [k]);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bgAlt,
      border: `1px solid ${SAM.border}`,
      padding: '14px 16px',
      fontFamily: SAM.font, fontSize: 13,
      color: SAM.text, overflow: 'hidden',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* terminal chrome */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SAM.red }}/>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SAM.yellow }}/>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SAM.green }}/>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: SAM.comment }}>
          ~/sam — bash
        </span>
      </div>
      <div style={{ flex: 1, lineHeight: 1.7 }}>
        {lines.map((line, i) => (
          t >= line.t && (
            <div key={i} style={{
              animation: 'sam-fade-in 240ms ease-out',
              opacity: 1,
              paddingLeft: line.indent ? 14 : 0,
            }}>
              <Mono c={line.c} b={!line.indent}>{line.text}</Mono>
            </div>
          )
        ))}
        {t > 4000 && <Cursor/>}
        {t < 4000 && <Cursor c={SAM.text}/>}
      </div>
    </div>
  );
}

// slide 1 — see the picture (animated bars + balance)
function SlideOverview({ active, slideKey }) {
  const k = active ? slideKey : -1;
  const balance = useCountUp(8420.5, 1000, k);
  const p = useProgress(1500, k);
  const cats = [
    { n: 'Food',     v: 380, c: SAM.orange  },
    { n: 'Housing',  v: 850, c: SAM.cyan    },
    { n: 'Transport',v: 220, c: SAM.magenta },
    { n: 'Subs',     v: 28,  c: SAM.yellow  },
    { n: 'Ent.',     v: 112, c: SAM.green   },
  ];
  const max = Math.max(...cats.map(c => c.v));

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bgAlt,
      border: `1px solid ${SAM.border}`,
      padding: '14px 16px',
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column', gap: 12,
      overflow: 'hidden',
    }}>
      <div>
        <div style={{ fontSize: 11, color: SAM.comment }}>
          <Mono c={SAM.yellow}>$</Mono> total_balance
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: SAM.yellow,
          letterSpacing: -0.5, marginTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}>
          ${Math.floor(balance).toLocaleString()}
          <span style={{ color: SAM.comment, fontSize: 18 }}>
            .{((balance%1)*100).toFixed(0).padStart(2,'0')}
          </span>
        </div>
        <div style={{ fontSize: 11, color: SAM.green, marginTop: 2 }}>
          ▲ 4.2% this month
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
          ▸ April spend by category
        </div>
        {cats.map((c, i) => {
          const w = (c.v / max) * 100 * Math.min(1, p * 1.5 - i * 0.08);
          return (
            <div key={i} style={{ fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                <Mono c={c.c}>{c.n}</Mono>
                <span style={{ flex: 1 }}/>
                <Mono c={SAM.text} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${c.v}
                </Mono>
              </div>
              <div style={{
                height: 6, background: 'rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  width: `${Math.max(0, w)}%`, height: '100%',
                  background: c.c, transition: 'none',
                }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// slide 2 — reach goals (progress fills + check)
function SlideGoals({ active, slideKey }) {
  const k = active ? slideKey : -1;
  const p = useProgress(2000, k);
  const goals = [
    { name: 'Emergency fund', icon: '🛡', target: 10000, saved: 6400,  c: SAM.yellow, delay: 0    },
    { name: 'Trip to Japan',  icon: '✈', target: 4500,  saved: 1230,  c: SAM.cyan,   delay: 0.15 },
    { name: 'New MacBook',    icon: '◼', target: 2400,  saved: 2400,  c: SAM.green,  delay: 0.3, done: true },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bgAlt,
      border: `1px solid ${SAM.border}`,
      padding: '14px 16px',
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column', gap: 12,
      overflow: 'hidden',
    }}>
      <div>
        <div style={{ fontSize: 11, color: SAM.comment }}>
          <Mono c={SAM.cyan}>◎</Mono> goals.status
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: SAM.text, marginTop: 2 }}>
          3 active · 1 completed
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {goals.map((g, i) => {
          const localP = Math.max(0, Math.min(1, (p - g.delay) / (1 - g.delay)));
          const pct = Math.round(g.saved / g.target * 100 * localP);
          return (
            <div key={i} style={{
              padding: 10,
              border: `1px solid ${g.done && pct >= 99 ? SAM.green + '55' : SAM.border}`,
              background: g.done && pct >= 99 ? 'rgba(86,211,100,0.04)' : 'transparent',
              transition: 'all 200ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12 }}>
                <Mono c={g.done && pct >= 99 ? SAM.green : SAM.comment} b>
                  {g.done && pct >= 99 ? '[✓]' : '[ ]'}
                </Mono>
                <Mono>{g.icon}</Mono>
                <Mono c={SAM.text} b>{g.name}</Mono>
                <span style={{ flex: 1 }}/>
                <Mono c={g.done && pct >= 99 ? SAM.green : g.c}>{pct}%</Mono>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, fontFamily: SAM.font, letterSpacing: -1 }}>
                {/* block bar */}
                {Array.from({length: 18}).map((_, j) => (
                  <span key={j} style={{
                    color: j < (pct / 100 * 18) ? (g.done && pct >= 99 ? SAM.green : g.c) : 'rgba(240,246,252,0.1)',
                  }}>
                    {j < (pct / 100 * 18) ? '█' : '░'}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// slide 3 — your data, your machine (lock animation + privacy bullets)
function SlidePrivacy({ active, slideKey }) {
  const k = active ? slideKey : -1;
  const p = useProgress(1800, k);
  const bullets = [
    { t: 'AES-256 at rest',     done: p > 0.25, c: SAM.green   },
    { t: 'TLS 1.3 in transit',  done: p > 0.45, c: SAM.green   },
    { t: 'No data sold · ever', done: p > 0.65, c: SAM.cyan    },
    { t: 'Read-only sync',      done: p > 0.85, c: SAM.yellow  },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bgAlt,
      border: `1px solid ${SAM.border}`,
      padding: '14px 16px',
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* big ascii lock */}
        <div style={{
          fontFamily: SAM.font, fontSize: 11, lineHeight: 1.1,
          color: SAM.green, textAlign: 'center',
          textShadow: `0 0 12px ${SAM.green}55`,
          opacity: 0.4 + p * 0.6,
          transform: `scale(${0.85 + p * 0.15})`,
          transition: 'none',
        }}>
          <pre style={{ margin: 0, fontFamily: SAM.font }}>{` ╭───╮ 
 │   │ 
 │   │ 
╭┴───┴╮
│ ▓▓▓ │
│ ▓▓▓ │
╰─────╯`}</pre>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600, marginBottom: 8 }}>
          ▸ encryption.audit
        </div>
        {bullets.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            fontSize: 12, marginTop: 6,
            opacity: b.done ? 1 : 0.25,
            transition: 'opacity 240ms',
          }}>
            <Mono c={b.done ? b.c : SAM.comment} b>
              [{b.done ? '✓' : ' '}]
            </Mono>
            <Mono c={SAM.text}>{b.t}</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

// slide 4 — invest & watch the market (portfolio + tickers)
function SlideInvest({ active, slideKey }) {
  const k = active ? slideKey : -1;
  const value = useCountUp(14820, 1100, k);
  const p = useProgress(1600, k);
  const holdings = [
    { sym: 'VTI',  name: 'Total Market', pct: 1.8,  c: SAM.green },
    { sym: 'BTC',  name: 'Bitcoin',      pct: 3.6,  c: SAM.green },
    { sym: 'VXUS', name: 'Intl ex-US',   pct: -0.4, c: SAM.red   },
    { sym: 'NVDA', name: 'NVIDIA',       pct: 4.8,  c: SAM.green },
  ];
  const spark = [6, 8, 7, 11, 10, 14, 12, 18, 22];
  const max = Math.max(...spark);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bgAlt,
      border: `1px solid ${SAM.border}`,
      padding: '14px 16px',
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column', gap: 12,
      overflow: 'hidden',
    }}>
      <div>
        <div style={{ fontSize: 11, color: SAM.comment }}>
          <Mono c={SAM.cyan}>◈</Mono> portfolio_value
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: SAM.cyan,
          letterSpacing: -0.5, marginTop: 2, fontVariantNumeric: 'tabular-nums',
        }}>
          ${Math.floor(value).toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: SAM.green, marginTop: 2 }}>
          ▲ 2.4% today · ▲ 18.6% all-time
        </div>
      </div>

      {/* sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 38 }}>
        {spark.map((v, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${Math.max(8, (v / max) * 100 * Math.min(1, p * 1.4 - i * 0.04))}%`,
            background: SAM.cyan,
            opacity: 0.3 + (i / spark.length) * 0.7,
          }}/>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
          ▸ holdings · live
        </div>
        {holdings.map((h, i) => {
          const up = h.pct >= 0;
          const show = p > i * 0.12;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12,
              opacity: show ? 1 : 0.2, transition: 'opacity 240ms',
            }}>
              <Mono c={SAM.text} b>{h.sym}</Mono>
              <Mono c={SAM.comment} style={{ fontSize: 11 }}>{h.name}</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={up ? SAM.green : SAM.red} b>
                {up ? '▲' : '▼'} {Math.abs(h.pct).toFixed(1)}%
              </Mono>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── slide content ─────────────
const ProgressBars = React.memo(function ProgressBars({ idx, accent, onJump }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {SLIDES.map((_, i) => (
        <div key={i} onClick={() => onJump(i)} style={{
          width: i === idx ? 60 : 24,
          height: 3,
          background: i === idx ? accent : (i < idx ? SAM.textDim : 'rgba(255,255,255,0.08)'),
          cursor: 'pointer',
          transition: 'width 320ms cubic-bezier(.2,.9,.2,1), background 220ms ease-out',
        }}/>
      ))}
    </div>
  );
});

const SLIDES = [
  {
    Illustration: SlideTrack,
    title: 'log every move',
    sub: 'tap, type, or just say it. SAM categorizes every transaction in seconds — no spreadsheets, no friction.',
    accent: SAM.cyan,
  },
  {
    Illustration: SlideOverview,
    title: 'see the whole picture',
    sub: 'live balance, budgets that update by the second, charts that actually mean something. all in one screen.',
    accent: SAM.yellow,
  },
  {
    Illustration: SlideGoals,
    title: 'reach what matters',
    sub: 'set goals, automate savings, watch the progress bars fill. SAM tells you how many days you have left.',
    accent: SAM.magenta,
  },
  {
    Illustration: SlideInvest,
    title: 'invest, watch the market',
    sub: 'track tickers, build a portfolio, follow live prices — stocks, ETFs and crypto, all in the same terminal.',
    accent: SAM.cyan,
  },
  {
    Illustration: SlidePrivacy,
    title: 'your money. your machine.',
    sub: 'end-to-end encryption, read-only sync, never sold. PWA-first. install once, own forever.',
    accent: SAM.green,
  },
];

// ───────────── Landing (slides + continue) ─────────────
function Landing({ onDone, onTryDemo }) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  // re-trigger animation on slide change
  useEffect(() => { setAnimKey(k => k + 1); }, [idx]);

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
  const skip = () => onDone();

  // touch swipe
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (dx < -40) next();
    if (dx >  40) prev();
    touchStart.current = null;
  };

  const slide = SLIDES[idx];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bg,
      color: SAM.text,
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}>

      {/* top bar */}
      <div style={{
        padding: '12px 18px',
        display: 'flex', alignItems: 'center',
        fontSize: 11, color: SAM.comment,
      }}>
        <Mono c={SAM.yellow} b>SAM</Mono>
        <span style={{ flex: 1 }}/>
        <span onClick={skip} style={{ cursor: 'pointer', color: SAM.comment }}>
          [skip]
        </span>
        {onTryDemo && (
          <span
            onClick={onTryDemo}
            style={{ cursor: 'pointer', color: SAM.green, marginLeft: 12 }}
          >
            [try demo ▸]
          </span>
        )}
      </div>

      {/* illustration — 65% of remaining */}
      <div style={{
        flex: '0 0 62%',
        padding: '4px 18px 12px',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* prompt header */}
        <div style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.4 }}>
          <Mono c={SAM.text} b>sam</Mono>
          <Mono c={SAM.text} b>@init.SAM</Mono>
          <Mono c={SAM.yellow} b> $ </Mono>
          <Mono c={slide.accent} b>./welcome --slide={idx + 1}</Mono>
        </div>

        {/* slide stage with crossfade */}
        <div key={animKey} style={{
          flex: 1, position: 'relative',
          animation: `sam-slide-${direction >= 0 ? 'in-r' : 'in-l'} 360ms cubic-bezier(.2,.9,.2,1)`,
        }}>
          <slide.Illustration active={true} slideKey={animKey}/>
        </div>
      </div>

      {/* text section */}
      <div style={{
        padding: '6px 22px 0',
        flex: 1,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* progress dots / bars */}
        <ProgressBars idx={idx} accent={slide.accent} onJump={(i) => { setDirection(i > idx ? 1 : -1); setIdx(i); }}/>

        <div key={'t-' + animKey} style={{
          animation: 'sam-fade-up 320ms cubic-bezier(.2,.9,.2,1)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment, marginBottom: 6 }}>
            {`// ${(idx + 1).toString().padStart(2, '0')} of ${SLIDES.length.toString().padStart(2, '0')}`}
          </div>
          <h2 style={{
            margin: 0, fontFamily: SAM.font,
            fontSize: 26, lineHeight: 1.15,
            color: SAM.text, fontWeight: 700,
            letterSpacing: -0.5,
          }}>
            <span style={{ color: slide.accent }}>›</span> {slide.title}
          </h2>
          <p style={{
            margin: '10px 0 0', fontFamily: SAM.font,
            fontSize: 13, lineHeight: 1.55,
            color: SAM.textDim,
          }}>
            <span style={{ color: SAM.comment }}>// </span>{slide.sub}
          </p>
        </div>

        <div style={{ flex: 1 }}/>

        {/* continue button */}
        <div style={{ padding: '0 0 24px' }}>
          <button onClick={next} style={{
            width: '100%', padding: '14px 0',
            background: slide.accent, color: SAM.bg,
            fontFamily: SAM.font, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            letterSpacing: 0.4,
            transition: 'all 200ms',
          }}>
            {idx < SLIDES.length - 1 ? '[continue ▸]' : '[get started ▸]'}
          </button>
          <div style={{
            marginTop: 10, fontSize: 10, color: SAM.comment,
            textAlign: 'center',
          }}>
            {`// swipe or tap dots to navigate`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────── Auth Picker (login | signup) ─────────────
function AuthPicker({ onPick, onBack, onTryDemo }) {
  const [hover, setHover] = useState(null);
  const [ssoNote, setSsoNote] = useState(false);
  const tagline = useTypewriter('init.Sam · authenticate to continue', 1400, 0);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bg,
      color: SAM.text,
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      padding: '12px 18px 24px',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: SAM.comment }}>
        <span onClick={onBack} style={{ cursor: 'pointer' }}>◂ back</span>
        <span style={{ flex: 1 }}/>
        <Mono c={SAM.yellow} b>SAM</Mono>
      </div>

      {/* hero */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 11, color: SAM.comment }}>
          <Mono c={SAM.green}>$</Mono> {tagline}<Cursor c={SAM.green}/>
        </div>
        <h1 style={{
          margin: '12px 0 0', fontFamily: SAM.font,
          fontSize: 30, fontWeight: 700, lineHeight: 1.1,
          color: SAM.text, letterSpacing: -0.5,
        }}>
          welcome to <span style={{ color: SAM.yellow }}>SAM</span>
        </h1>
        <div style={{ marginTop: 8, fontSize: 13, color: SAM.textDim, lineHeight: 1.5 }}>
          <span style={{ color: SAM.comment }}>// </span>
          your money, in plain text.
        </div>
      </div>

      {/* art — terminal hint */}
      <div style={{
        marginTop: 22, padding: '14px 16px',
        border: `1px dashed ${SAM.border}`,
        background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ fontSize: 11, color: SAM.comment, marginBottom: 6 }}>
          {`// pick one to continue`}
        </div>
        <pre style={{
          margin: 0, fontFamily: SAM.font, fontSize: 11,
          color: SAM.cyan, lineHeight: 1.3,
        }}>{`  ╭─[ session ]
  ├─ ${hover === 'login' ? '▸' : ' '} returning      → log in
  └─ ${hover === 'signup' ? '▸' : ' '} new to sam     → sign up`}</pre>
      </div>

      <div style={{ flex: 1 }}/>

      {/* buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {onTryDemo && (
          <button
            type="button"
            onClick={onTryDemo}
            style={{
              padding: '14px 16px', cursor: 'pointer',
              background: SAM.green, color: SAM.bg,
              fontFamily: SAM.font, fontSize: 14, fontWeight: 700,
              border: 'none', textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            [ try demo — no password ▸ ]
          </button>
        )}
        <button
          onClick={() => onPick('login')}
          onMouseEnter={() => setHover('login')}
          onMouseLeave={() => setHover(null)}
          style={{
            padding: '14px 16px', cursor: 'pointer',
            background: SAM.yellow, color: SAM.bg,
            fontFamily: SAM.font, fontSize: 14, fontWeight: 700,
            border: 'none', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            letterSpacing: 0.3,
          }}>
          <span>›</span>
          <span>[ log in ]</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, opacity: 0.6 }}>returning</span>
        </button>

        <button
          onClick={() => onPick('signup')}
          onMouseEnter={() => setHover('signup')}
          onMouseLeave={() => setHover(null)}
          style={{
            padding: '14px 16px', cursor: 'pointer',
            background: 'transparent', color: SAM.cyan,
            fontFamily: SAM.font, fontSize: 14, fontWeight: 700,
            border: `1px solid ${SAM.cyan}`,
            textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            letterSpacing: 0.3,
          }}>
          <span>›</span>
          <span>[ sign up ]</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, opacity: 0.7, color: SAM.comment }}>new account</span>
        </button>

        {/* sso */}
        <div style={{
          marginTop: 6, display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, color: SAM.comment,
        }}>
          <div style={{ flex: 1, height: 1, background: SAM.border }}/>
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: SAM.border }}/>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['apple', 'google', 'github'].map(p => (
            <button key={p}
              onClick={() => setSsoNote(true)}
              title="disabled in MVP"
              style={{
                flex: 1, padding: '10px 0', cursor: 'not-allowed',
                background: 'transparent',
                border: `1px solid ${SAM.border}`,
                color: SAM.comment, fontFamily: SAM.font, fontSize: 12,
                opacity: 0.55,
              }}>
              {p}
            </button>
          ))}
        </div>
        {ssoNote && (
          <div style={{ marginTop: 6, fontSize: 10, color: SAM.comment, textAlign: 'center' }}>
            {`// social sign-in is disabled in this local MVP — use email`}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 14, fontSize: 10, color: SAM.comment,
        textAlign: 'center',
      }}>
        {`// by continuing you agree to terms · privacy`}
      </div>
    </div>
  );
}

// ───────────── Login / Signup forms ─────────────
function AuthForm({ mode, onBack, onSubmit, onSwitchMode }) {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [error, setError] = useState('');
  const [forgotNote, setForgotNote] = useState(false);

  const accent = isSignup ? SAM.cyan : SAM.yellow;
  const valid = isSignup
    ? (email.includes('@') && pw.length >= 6 && name.length >= 2)
    : (email.includes('@') && pw.length >= 6);

  // password strength (signup)
  const strength = (() => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  })();
  const strengthLabel = ['too short', 'weak', 'ok', 'good', 'strong', 'fortified'][strength];
  const strengthColor = strength <= 1 ? SAM.red : strength <= 2 ? SAM.yellow : SAM.green;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError('');
    setLogLines([]);
    const push = (text, c) => setLogLines(p => [...p, { text, c }]);

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    push(isSignup ? '› POST /signup' : '› POST /login', SAM.cyan);
    await wait(280);
    push(isSignup ? '› hashing password (argon2)...' : '› verifying credentials...', SAM.comment);
    await wait(400);
    push('› demo mode · local vault', SAM.comment);
    await wait(320);

    try {
      const res = isSignup
        ? await window.SamDB.signUp(email, pw, name)
        : await window.SamDB.signIn(email, pw);
      if (res && res.error) {
        const msg = res.error.message || String(res.error);
        push('✗ ' + msg, SAM.red);
        setError(msg);
        setSubmitting(false);
        return;
      }
    } catch (e) {
      push('✗ ' + String(e.message || e), SAM.red);
      setError(String(e.message || e));
      setSubmitting(false);
      return;
    }

    push(isSignup ? `✓ vault created · ${email}` : '✓ session granted · 30 days', SAM.green);
    await wait(200);
    push(isSignup ? '✓ workspace provisioned' : '✓ vault unlocked', SAM.green);
    await wait(200);
    push(isSignup ? '➜ launching workspace...' : '➜ welcome back', SAM.yellow);
    setTimeout(() => onSubmit && onSubmit(mode), 950);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bg, color: SAM.text,
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        padding: '12px 18px',
        display: 'flex', alignItems: 'center',
        fontSize: 11, color: SAM.comment,
      }}>
        <span onClick={onBack} style={{ cursor: 'pointer' }}>◂ back</span>
        <span style={{ flex: 1 }}/>
        <Mono c={accent} b>{isSignup ? 'sign up' : 'log in'}</Mono>
      </div>

      {/* prompt */}
      <div style={{ padding: '4px 22px 0', fontSize: 12 }}>
        <Mono c={SAM.text} b>guest</Mono>
        <Mono c={SAM.comment}>[anon]</Mono>
        <Mono c={SAM.text} b>@init.Auth</Mono>
        <Mono c={SAM.yellow} b> $ </Mono>
        <Mono c={accent} b>./{isSignup ? 'signup' : 'login'}</Mono>
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <h2 style={{
          margin: 0, fontSize: 24, fontWeight: 700,
          color: SAM.text, letterSpacing: -0.5,
        }}>
          <Mono c={accent}>›</Mono> {isSignup ? 'create your vault' : 'unlock your vault'}
        </h2>
        <div style={{ fontSize: 11, color: SAM.comment, marginTop: 4 }}>
          {`// ${isSignup ? 'less than 30 seconds' : 'tap fingerprint or type'}`}
        </div>
      </div>

      {/* form */}
      <div style={{ padding: '20px 22px 0', flex: 1, overflowY: 'auto' }}>
        {isSignup && (
          <Field label="full_name" hint="how should we call you" accent={SAM.magenta}>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="your name"
              style={inputStyle}
              disabled={submitting}/>
          </Field>
        )}

        <Field label="email" hint="@" accent={SAM.green}>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@domain.com"
            type="email"
            style={inputStyle}
            disabled={submitting}/>
          {email && (
            <div style={{ marginTop: 4, fontSize: 10, color: email.includes('@') ? SAM.green : SAM.comment }}>
              {email.includes('@') ? '✓ valid' : '// add @ to validate'}
            </div>
          )}
        </Field>

        <Field label="password" hint="≥ 6 chars" accent={SAM.yellow}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: `1px solid ${SAM.border}`,
            padding: '0 10px',
          }}>
            <input
              value={pw} onChange={e => setPw(e.target.value)}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              style={{ ...inputStyle, border: 'none', padding: '10px 0' }}
              disabled={submitting}/>
            <span onClick={() => setShowPw(!showPw)}
              style={{ cursor: 'pointer', fontSize: 11, color: SAM.comment }}>
              [{showPw ? 'hide' : 'show'}]
            </span>
          </div>
          {isSignup && pw && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3,
                    background: i < strength ? strengthColor : 'rgba(255,255,255,0.05)',
                    transition: 'background 200ms',
                  }}/>
                ))}
              </div>
              <div style={{ fontSize: 10, color: strengthColor, marginTop: 4 }}>
                {`// strength: ${strengthLabel}`}
              </div>
            </div>
          )}
        </Field>

        {!isSignup && (
          <div style={{ marginTop: -4, marginBottom: 14, fontSize: 11, textAlign: 'right' }}>
            <Mono c={SAM.cyan} style={{ cursor: 'pointer' }}
              onClick={() => setForgotNote(v => !v)}>forgot? ▸</Mono>
            {forgotNote && (
              <div style={{ marginTop: 6, color: SAM.comment, textAlign: 'right' }}>
                {`// password reset is disabled in this local MVP`}
              </div>
            )}
          </div>
        )}

        {/* live log */}
        {logLines.length > 0 && (
          <div style={{
            marginTop: 6, padding: 10,
            background: SAM.bgAlt, border: `1px solid ${SAM.border}`,
            fontSize: 11, lineHeight: 1.7, minHeight: 90,
          }}>
            {logLines.map((l, i) => (
              <div key={i} style={{ animation: 'sam-fade-in 220ms ease-out' }}>
                <Mono c={l.c}>{l.text}</Mono>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* submit */}
      <div style={{ padding: '14px 22px 24px' }}>
        <button onClick={submit} disabled={!valid || submitting}
          style={{
            width: '100%', padding: '14px 0',
            background: valid && !submitting ? accent : 'rgba(255,255,255,0.05)',
            color: valid && !submitting ? SAM.bg : SAM.comment,
            fontFamily: SAM.font, fontSize: 14, fontWeight: 700,
            border: 'none',
            cursor: valid && !submitting ? 'pointer' : 'not-allowed',
            letterSpacing: 0.3,
            transition: 'all 200ms',
          }}>
          {submitting
            ? '[authenticating...]'
            : `[${isSignup ? 'create account' : 'log in'} ▸]`}
        </button>
        <div style={{
          marginTop: 10, fontSize: 11, color: SAM.comment,
          textAlign: 'center',
        }}>
          {isSignup ? '// already in?' : '// new here?'} <Mono c={accent} style={{ cursor: 'pointer' }}
            onClick={() => !submitting && onSwitchMode && onSwitchMode()}>
            {isSignup ? 'log in instead' : 'create account'}
          </Mono>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: 'transparent',
  border: `1px solid ${SAM.border}`,
  outline: 'none',
  color: SAM.text, fontFamily: SAM.font,
  fontSize: 15, padding: '10px 12px',
};

function Field({ label, hint, accent, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <Mono c={accent}>›</Mono>
        <Mono c={accent} b>{label}</Mono>
        {hint && <Mono c={SAM.comment} style={{ fontSize: 10, marginLeft: 6 }}>// {hint}</Mono>}
      </div>
      {children}
    </div>
  );
}

// ───────────── Try demo — mock login terminal (same beats as SAM functional) ─────────────
const DEMO_AUTH_LOG = [
  { t: 0, text: '› POST /login', c: SAM.cyan },
  { t: 300, text: '› verifying credentials...', c: SAM.comment },
  { t: 720, text: '› demo mode · local vault', c: SAM.comment },
  { t: 1080, text: '✓ session granted · 30 days', c: SAM.green },
  { t: 1380, text: '✓ vault unlocked', c: SAM.green },
  { t: 1660, text: '✓ workspace provisioned', c: SAM.green },
  { t: 1940, text: '➜ welcome back', c: SAM.yellow },
  { t: 2480, done: true },
];

function DemoTryAuth({ onComplete }) {
  const [logLines, setLogLines] = useState([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let raf;
    let finished = false;
    const start = performance.now();
    let shown = 0;

    const step = (now) => {
      const elapsed = now - start;
      while (shown < DEMO_AUTH_LOG.length && DEMO_AUTH_LOG[shown].t <= elapsed) {
        const entry = DEMO_AUTH_LOG[shown];
        shown += 1;
        if (entry.done) {
          if (!finished) {
            finished = true;
            onCompleteRef.current?.();
          }
        } else {
          setLogLines((p) => [...p, { text: entry.text, c: entry.c }]);
        }
      }
      if (shown < DEMO_AUTH_LOG.length) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bg, color: SAM.text,
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px',
        display: 'flex', alignItems: 'center',
        fontSize: 11, color: SAM.comment,
      }}>
        <span style={{ flex: 1 }} />
        <Mono c={SAM.yellow} b>log in</Mono>
      </div>

      <div style={{ padding: '4px 22px 0', fontSize: 12 }}>
        <Mono c={SAM.text} b>guest</Mono>
        <Mono c={SAM.comment}>[demo]</Mono>
        <Mono c={SAM.text} b>@init.Auth</Mono>
        <Mono c={SAM.yellow} b> $ </Mono>
        <Mono c={SAM.yellow} b>./login</Mono>
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <h2 style={{
          margin: 0, fontSize: 24, fontWeight: 700,
          color: SAM.text, letterSpacing: -0.5,
        }}>
          <Mono c={SAM.yellow}>›</Mono> unlock your vault
        </h2>
        <div style={{ fontSize: 11, color: SAM.comment, marginTop: 4 }}>
          {`// try demo · loading alex@demo.sam`}
        </div>
      </div>

      <div style={{ flex: 1, padding: '18px 22px 0', overflowY: 'auto' }}>
        <div style={{
          padding: 10,
          background: SAM.bgAlt, border: `1px solid ${SAM.border}`,
          fontSize: 11, lineHeight: 1.7, minHeight: 120,
        }}>
          {logLines.map((l, i) => (
            <div key={i} style={{ animation: 'sam-fade-in 220ms ease-out' }}>
              <Mono c={l.c}>{l.text}</Mono>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 22px 24px' }}>
        <button
          type="button"
          disabled
          style={{
            width: '100%', padding: '14px 0',
            background: 'rgba(255,255,255,0.05)',
            color: SAM.comment,
            fontFamily: SAM.font, fontSize: 14, fontWeight: 700,
            border: 'none', letterSpacing: 0.3,
          }}
        >
          [authenticating...]
        </button>
      </div>
    </div>
  );
}

// ───────────── Success / done view ─────────────
function Success({ mode, onContinue }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const step = (now) => {
      setT(now - start);
      if (now - start < 1500) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: SAM.bg, color: SAM.text,
      fontFamily: SAM.font,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: '0 22px',
    }}>
      <div style={{
        fontSize: 48, color: SAM.green,
        textShadow: `0 0 24px ${SAM.green}55`,
        animation: 'sam-pop 480ms cubic-bezier(.2,1.4,.4,1)',
      }}>✓</div>
      <h2 style={{
        margin: '14px 0 0', fontSize: 24, fontWeight: 700,
        color: SAM.text, textAlign: 'center', letterSpacing: -0.5,
      }}>
        {mode === 'signup' ? 'vault created' : 'welcome back'}
      </h2>
      <div style={{ marginTop: 6, fontSize: 12, color: SAM.comment, textAlign: 'center' }}>
        {`// ${mode === 'signup' ? 'starting fresh' : 'session restored'}`}
      </div>
      <button onClick={onContinue} style={{
        marginTop: 28, padding: '12px 28px',
        background: SAM.green, color: SAM.bg,
        fontFamily: SAM.font, fontSize: 13, fontWeight: 700,
        border: 'none', cursor: 'pointer',
      }}>
        [enter sam ▸]
      </button>
      <div style={{
        marginTop: 18, fontFamily: SAM.font, fontSize: 10,
        color: SAM.comment, textAlign: 'center', lineHeight: 1.6,
      }}>
        {`balance synced · 3 accounts linked`}<br/>
        {`8 transactions in queue`}
      </div>
    </div>
  );
}

// ───────────── App ─────────────
export default function SamOnboarding() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('landing'); // landing | picker | login | signup | done
  const [scale, setScale] = useState(1);
  const [edgeToEdge, setEdgeToEdge] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [prevStage, setPrevStage] = useState(null);
  const [animDir, setAnimDir] = useState(1);
  const [successMode, setSuccessMode] = useState('login');

  useEffect(() => {
    const calc = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      setScale(computeFrameScale());
      setEdgeToEdge(w <= 520);
    };
    calc();
    window.addEventListener('resize', calc);
    window.visualViewport?.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.visualViewport?.removeEventListener('resize', calc);
    };
  }, []);

  const ORDER = ['landing', 'picker', 'login', 'signup', 'demoAuth', 'done'];
  const goto = (s) => {
    if (s === stage) return;
    const from = ORDER.indexOf(stage);
    const to = ORDER.indexOf(s);
    setAnimDir(to >= from ? 1 : -1);
    setPrevStage(stage);
    setTransitioning(true);
    setStage(s);
    setTimeout(() => { setTransitioning(false); setPrevStage(null); }, 360);
  };

  const enterDemo = () => {
    setSuccessMode('login');
    // Session first — animation is cosmetic (no network)
    void SamDemoDB.startGuest().catch(() => {});
    goto('demoAuth');
  };

  const renderStage = (st) => {
    if (st === 'landing') {
      return (
        <Landing
          onDone={() => goto('picker')}
          onTryDemo={enterDemo}
        />
      );
    }
    if (st === 'picker') {
      return (
        <AuthPicker
          onPick={(m) => goto(m)}
          onBack={() => goto('landing')}
          onTryDemo={enterDemo}
        />
      );
    }
    if (st === 'login') {
      return (
        <AuthForm
          mode="login"
          onBack={() => goto('picker')}
          onSubmit={(m) => { setSuccessMode(m); goto('done'); }}
          onSwitchMode={() => goto('signup')}
        />
      );
    }
    if (st === 'signup') {
      return (
        <AuthForm
          mode="signup"
          onBack={() => goto('picker')}
          onSubmit={(m) => { setSuccessMode(m); goto('done'); }}
          onSwitchMode={() => goto('login')}
        />
      );
    }
    if (st === 'demoAuth') {
      return (
        <DemoTryAuth
          key="demo-auth-run"
          onComplete={() => goto('done')}
        />
      );
    }
    if (st === 'done') {
      return (
        <Success
          mode={successMode}
          onContinue={() => navigate('/app')}
        />
      );
    }
    return null;
  };

  return (
    <div data-screen-label="SAM Onboarding" style={{
      width: '100%',
      height: '100dvh',
      background: 'radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: SAM.font, overflow: 'hidden',
      padding: edgeToEdge
        ? 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
        : 0,
    }}>
      <div style={{
        width: FRAME_W * scale,
        height: FRAME_H * scale,
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: FRAME_W,
          height: FRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}>
        <IOSDevice dark={true} width={FRAME_W} height={FRAME_H} edgeToEdge={edgeToEdge}>
          <div style={{
            position: 'relative', height: '100%',
            background: SAM.bg, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: CONTENT_TOP, left: 0, right: 0, bottom: 0,
              overflow: 'hidden',
            }}>
              {transitioning && prevStage && (
                <div key={prevStage + '-out'} style={{
                  position: 'absolute', inset: 0,
                  animation: `sam-stage-out-${animDir > 0 ? 'l' : 'r'} 340ms cubic-bezier(.2,.9,.2,1) forwards`,
                }}>
                  {renderStage(prevStage)}
                </div>
              )}
              <div key={stage + '-in'} style={{
                position: 'absolute', inset: 0,
                animation: transitioning
                  ? `sam-stage-in-${animDir > 0 ? 'r' : 'l'} 340ms cubic-bezier(.2,.9,.2,1) forwards`
                  : 'none',
              }}>
                {renderStage(stage)}
              </div>
            </div>
          </div>
        </IOSDevice>
        </div>
      </div>

      <style>{`
        @keyframes sam-cursor {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        @keyframes sam-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sam-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sam-pop {
          0%   { opacity: 0; transform: scale(0.4); }
          70%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sam-slide-in-r {
          from { opacity: 0.3; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sam-slide-in-l {
          from { opacity: 0.3; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sam-stage-in-r {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes sam-stage-in-l {
          from { transform: translateX(-100%); opacity: 0.5; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes sam-stage-out-l {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(-30%); opacity: 0; }
        }
        @keyframes sam-stage-out-r {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(30%); opacity: 0; }
        }
        input::placeholder { color: ${SAM.comment}; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        button:active:not(:disabled) { transform: scale(0.98); }
      `}</style>
    </div>
  );
}

