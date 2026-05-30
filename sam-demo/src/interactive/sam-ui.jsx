// SAM Interactive — shell, state, navigation, primitives
import React, { useState, useEffect, useRef } from 'react';
import { IOSDevice } from '../shared/ios-frame.jsx';

// SAM is a *live* theme object: every component reads SAM.<token> at render
// time, so swapping its values in place (applySamPalette) re-themes the whole
// app on the next render. `track` = empty progress-bar fill, `overlay` = faint
// surface fill — both are tuned per theme so nothing goes invisible.
const SAM_PALETTES = {
  dark: {
    bg: '#0a0e14', bgAlt: '#0d1117', sheet: '#10151c',
    border: 'rgba(240,246,252,0.08)', borderStrong: 'rgba(240,246,252,0.18)',
    text: '#c9d1d9', textDim: '#8b949e', comment: '#6e7681',
    yellow: '#e3b341', cyan: '#58a6ff', green: '#56d364', red: '#f85149',
    magenta: '#bc8cff', orange: '#e8824a',
    track: 'rgba(240,246,252,0.14)', overlay: 'rgba(255,255,255,0.02)',
  },
  light: {
    bg: '#f6f8fa', bgAlt: '#ffffff', sheet: '#ffffff',
    border: 'rgba(27,31,36,0.15)', borderStrong: 'rgba(27,31,36,0.30)',
    text: '#1f2328', textDim: '#57606a', comment: '#6e7781',
    yellow: '#9a6700', cyan: '#0969da', green: '#1a7f37', red: '#cf222e',
    magenta: '#8250df', orange: '#bc4c00',
    track: 'rgba(27,31,36,0.12)', overlay: 'rgba(27,31,36,0.035)',
  },
};

const SAM = {
  font: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
  ...SAM_PALETTES.dark,
};

function applySamPalette(theme) {
  Object.assign(SAM, SAM_PALETTES[theme] || SAM_PALETTES.dark);
}

// ───────────────────── Primitives ─────────────────────

const Mono = ({ children, c, b, style }) => (
  <span style={{ color: c || SAM.text, fontWeight: b ? 600 : 400, ...style }}>{children}</span>
);

const Comment = ({ children, style }) => (
  <div style={{ color: SAM.comment, fontSize: 12, lineHeight: 1.5, ...style }}>{'// '}{children}</div>
);

const Prompt = ({ user, host, cmd }) => (
  <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6, wordBreak: 'break-word' }}>
    <Mono c={SAM.text} b>{user || window.SAM_USER || 'you'}</Mono>
    <Mono c={SAM.text} b>@{host}</Mono>
    <Mono c={SAM.yellow} b> $ </Mono>
    <Mono c={SAM.cyan} b>{cmd}</Mono>
  </div>
);

const BlockBar = ({ pct, width = 10, c = SAM.green }) => {
  // Clamp so over-budget (pct > 100), negative, or NaN values can never
  // feed a negative count to String.repeat (which throws RangeError).
  const safePct = Number.isFinite(pct) ? pct : 0;
  const filled = Math.max(0, Math.min(width, Math.round((safePct / 100) * width)));
  const empty = Math.max(0, width - filled);
  return (
    <span style={{ color: c, letterSpacing: -1, fontFamily: SAM.font }}>
      {'█'.repeat(filled)}
      <span style={{ color: SAM.track }}>{'░'.repeat(empty)}</span>
    </span>
  );
};

const BarH = ({ pct, c = SAM.yellow }) => (
  <div style={{
    width: '100%', height: 4, background: SAM.track,
    overflow: 'hidden',
  }}>
    <div style={{
      width: `${Math.min(100, pct)}%`, height: '100%', background: c,
      transition: 'width 420ms cubic-bezier(.2,.9,.2,1)',
    }}/>
  </div>
);

const TabBar = ({ tabs, active, onChange }) => {
  const idx = Math.max(0, tabs.indexOf(active));
  const pct = 100 / tabs.length;
  return (
    <div style={{
      display: 'flex', fontSize: 15,
      borderBottom: `1px solid ${SAM.border}`,
      padding: '0 0 12px', position: 'relative',
    }}>
      {tabs.map(t => {
        const isActive = t === active;
        return (
          <div key={t}
            onClick={() => onChange && onChange(t)}
            style={{
              flex: 1, textAlign: 'center', cursor: 'pointer',
              color: isActive ? SAM.yellow : SAM.comment,
              fontWeight: isActive ? 600 : 400,
              position: 'relative', paddingBottom: 4,
              transition: 'color 200ms ease-out',
            }}>
            {t}
          </div>
        );
      })}
      {/* sliding underline */}
      <div style={{
        position: 'absolute', bottom: -1, height: 2,
        width: `${pct * 0.6}%`,
        left: `${pct * idx + pct * 0.2}%`,
        background: SAM.yellow,
        boxShadow: `0 0 8px ${SAM.yellow}66`,
        transition: 'left 300ms cubic-bezier(.2,.9,.2,1)',
      }}/>
    </div>
  );
};

// Expose primitives + palette to window so screen files can use them
Object.assign(window, { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar });

// ───────────────────── Chart helpers ─────────────────────
// Deterministic price series — same (seed, length, tick) ⇒ same shape.
// Tick gently shifts the curve so the chart "breathes" without becoming chaotic.
function makeSeries(seed, length, tick = 0, volatility = 0.06) {
  const out = [];
  let v = 0.5;
  for (let i = 0; i < length; i++) {
    const wave =
      0.32 * Math.sin(i * 0.35 + seed + tick * 0.22) +
      0.18 * Math.sin(i * 0.95 + seed * 1.4) +
      0.10 * Math.sin(i * 2.3 + seed * 2.1 + tick * 0.4);
    v = 0.5 + wave * (0.5 + volatility);
    out.push(Math.max(0.04, Math.min(0.96, v)));
  }
  return out;
}

// Scale a normalized [0..1] series into actual prices around a base
function seriesToPrices(series, basePrice, spreadPct = 0.06) {
  const lo = basePrice * (1 - spreadPct);
  const hi = basePrice * (1 + spreadPct);
  return series.map(n => lo + (hi - lo) * n);
}

// String hash → numeric seed
function symbolSeed(sym) {
  let s = 0;
  for (let i = 0; i < sym.length; i++) s = (s * 31 + sym.charCodeAt(i)) >>> 0;
  return (s % 1000) / 31;
}

// Tiny inline SVG line chart used in cards (no axes)
function MiniLineChart({ prices, color, width = 110, height = 32, fill = true }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;
  const xStep = (width - pad * 2) / (prices.length - 1);
  const pts = prices.map((v, i) => {
    const x = pad + i * xStep;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return [x, y];
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const gradId = `grad-${color.replace('#','')}-${width}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill={`url(#${gradId})`} stroke="none"/>}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Short money formatter for axis labels ($8.4k, $312, $1.2M)
function fmtMoneyShort(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${v.toFixed(a < 10 ? 2 : 0)}`;
}

// Full-width portfolio performance chart with axes, gradient fill and a live
// end dot. `points` = [{ t: 'YYYY-MM-DD' | label, v: number }].
function PerfChart({ points, height = 156, color, intraday }) {
  if (!points || points.length < 2) return null;
  const W = 340, H = height;
  const padL = 52, padR = 12, padT = 12, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const vals = points.map(p => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rng = (max - min) || (Math.abs(max) || 1);
  const lo = min - rng * 0.10;
  const hi = max + rng * 0.10;
  const span = (hi - lo) || 1;

  const xStep = innerW / (points.length - 1);
  const xy = points.map((p, i) => [
    padL + i * xStep,
    padT + innerH * (1 - (p.v - lo) / span),
  ]);
  const up = points[points.length - 1].v >= points[0].v;
  const c = color || (up ? SAM.green : SAM.red);

  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${xy[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  const gid = `perf-grad-${c.replace('#', '')}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => lo + span * (1 - t));
  // Adaptive decimals so a tiny value range (e.g. $250.05–$250.21) shows
  // distinct labels instead of "$250" five times over.
  const tickGap = span / (yTicks.length - 1);
  const fmtAxis = (v) => {
    const a = Math.abs(v);
    if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e4) return `$${(v / 1e3).toFixed(1)}k`;
    const dec = tickGap >= 50 ? 0 : tickGap >= 5 ? 1 : 2;
    return `$${v.toFixed(dec)}`;
  };
  const fmtDate = (s) => {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return intraday
      ? d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };
  const xIdx = Array.from(new Set([0, Math.round((points.length - 1) / 2), points.length - 1]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.30"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {yTicks.map((v, i) => {
        const y = padT + (innerH / (yTicks.length - 1)) * i;
        return (
          <g key={'y' + i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={SAM.border} strokeWidth="1" strokeDasharray="2 3"/>
            <text x={padL - 6} y={y + 3} fill={SAM.comment} fontSize="9"
              fontFamily={SAM.font} textAnchor="end">{fmtAxis(v)}</text>
          </g>
        );
      })}

      {xIdx.map((idx, i) => {
        const x = xy[idx][0];
        return (
          <text key={'x' + i} x={x} y={H - 5} fill={SAM.comment} fontSize="9"
            fontFamily={SAM.font}
            textAnchor={i === 0 ? 'start' : i === xIdx.length - 1 ? 'end' : 'middle'}>
            {fmtDate(points[idx].t)}
          </text>
        );
      })}

      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={SAM.border} strokeWidth="1"/>
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke={SAM.border} strokeWidth="1"/>

      <path d={area} fill={`url(#${gid})`} stroke="none"/>
      <path d={line} fill="none" stroke={c} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3.2"
        fill={c} stroke={SAM.bg} strokeWidth="1.5"/>
    </svg>
  );
}

Object.assign(window, { makeSeries, seriesToPrices, symbolSeed, MiniLineChart, PerfChart, fmtMoneyShort });

// ───────────────────── Bottom Nav ─────────────────────
const BottomNav = ({ active, onChange }) => {
  const items = [
    { k: 'home',     label: 'home',     icon: '⌂' },
    { k: 'expenses', label: 'expenses', icon: '$' },
    { k: 'invest',   label: 'invest',   icon: '▲' },
    { k: 'goals',    label: 'goals',    icon: '◎' },
    { k: 'profile',  label: 'profile',  icon: '@' },
  ];
  const activeIdx = Math.max(0, items.findIndex(it => it.k === active));
  const pct = 100 / items.length;
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--sam-bg, #0a0e14)',
      borderTop: `1px solid var(--sam-border-nav, rgba(240,246,252,0.08))`,
      padding: '8px 0 28px',
      display: 'flex',
      fontFamily: SAM.font,
      zIndex: 40,
    }}>
      {/* sliding active indicator */}
      <div style={{
        position: 'absolute', top: -1,
        height: 2, width: `${pct}%`,
        left: `${pct * activeIdx}%`,
        background: SAM.yellow,
        boxShadow: `0 0 10px ${SAM.yellow}aa`,
        transition: 'left 340ms cubic-bezier(.2,.9,.2,1)',
      }}/>
      {items.map(it => {
        const isActive = it.k === active;
        return (
          <div key={it.k}
            onClick={() => onChange(it.k)}
            style={{
              flex: 1, textAlign: 'center', cursor: 'pointer',
              color: isActive ? SAM.yellow : SAM.comment,
              userSelect: 'none',
              transition: 'color 200ms ease-out',
            }}>
            <div style={{
              fontSize: 16, lineHeight: 1, marginBottom: 2,
              fontWeight: isActive ? 600 : 400,
              transform: isActive ? 'translateY(-2px) scale(1.12)' : 'translateY(0) scale(1)',
              transition: 'transform 280ms cubic-bezier(.2,.9,.2,1)',
              textShadow: isActive ? `0 0 12px ${SAM.yellow}66` : 'none',
            }}>
              {it.icon}
            </div>
            <div style={{
              fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: 0.2,
              opacity: isActive ? 1 : 0.85,
              transition: 'opacity 200ms',
            }}>
              {isActive ? `[${it.label}]` : it.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ───────────────────── Bottom Sheet ─────────────────────

function BottomSheet({ sheet, onClose, state, setState }) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    setClosing(true);
    setTimeout(() => { onClose(); setClosing(false); }, 220);
  };

  if (!sheet) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div
        onClick={close}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          opacity: closing ? 0 : 1,
          transition: 'opacity 220ms',
        }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: SAM.sheet,
        borderTop: `1px solid ${SAM.borderStrong}`,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        padding: '16px 18px 30px',
        fontFamily: SAM.font,
        color: SAM.text,
        transform: closing ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 260ms cubic-bezier(.2,.9,.2,1)',
        maxHeight: '80%', overflowY: 'auto',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width: 36, height: 4, background: SAM.border,
          borderRadius: 2, margin: '-6px auto 10px',
        }}/>
        <CombinedSheetContent sheet={sheet} state={state} setState={setState} onClose={close}/>
      </div>
    </div>
  );
}

function SheetContent({ sheet, state, setState, onClose }) {
  if (sheet.kind === 'tx') {
    const tx = sheet.tx;
    return (
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 13, marginBottom: 14,
        }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ tx --view</Mono>
          <span style={{ color: SAM.yellow, cursor: 'pointer' }}>[edit]</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 36, color: tx.catColor }}>{tx.icon}</div>
          <div style={{
            fontSize: 30, fontWeight: 700, color: SAM.red,
            fontVariantNumeric: 'tabular-nums', marginTop: 4,
          }}>-${tx.amount.toFixed(2)}</div>
          <div style={{ fontSize: 14, color: SAM.text, marginTop: 2, fontWeight: 600 }}>{tx.name}</div>
        </div>
        <div style={{ fontSize: 13, borderTop: `1px solid ${SAM.border}`, paddingTop: 12 }}>
          {[
            ['├─', 'category', tx.category],
            ['├─', 'account', 'checking ····4281'],
            ['├─', 'date', `Apr 19, ${tx.time}`],
            ['├─', 'merchant', tx.name],
            ['└─', 'notes', 'none'],
          ].map(([t,k,v], i) => (
            <div key={i} style={{ display: 'flex', marginTop: 6 }}>
              <Mono c={SAM.comment}>{t} </Mono>
              <Mono c={SAM.text}>{k}</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.comment}>{v}</Mono>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
          <span style={{ color: SAM.cyan, cursor: 'pointer' }}>[split]</span>
          <span style={{ color: SAM.cyan, cursor: 'pointer' }}>[recategorize]</span>
          <span style={{ flex: 1 }}/>
          <span onClick={async () => {
            if (window.SamDB) await window.SamDB.deleteExpense(tx.id);
            setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== tx.id) }));
            onClose();
          }} style={{ color: SAM.red, cursor: 'pointer' }}>[delete]</span>
        </div>
      </div>
    );
  }

  if (sheet.kind === 'category') {
    const { cat, spent, pct } = sheet;
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[close]</span>
          <Mono c={SAM.cyan} b>$ cat --view {cat.key}</Mono>
          <span style={{ color: SAM.yellow, cursor: 'pointer' }}>[edit]</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13 }}>
            <Mono c={cat.c} b>{cat.icon} {cat.name}</Mono>
          </div>
          <Comment style={{ marginTop: 4 }}>budget ${cat.budget}/month</Comment>
          <div style={{
            marginTop: 14, fontSize: 28, fontWeight: 700,
            color: pct > 90 ? SAM.red : cat.c,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${spent.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: SAM.comment, marginTop: 2 }}>
            {pct}% · ${(cat.budget - spent).toFixed(0)} left
          </div>
          <div style={{ marginTop: 10 }}>
            <BlockBar pct={pct} width={24} c={pct > 90 ? SAM.red : cat.c}/>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Mono c={SAM.cyan} b>▸ transactions</Mono>
          {state.expenses.filter(e => e.catKey === cat.key).map(e => (
            <div key={e.id} style={{ fontSize: 13, marginTop: 8, display: 'flex' }}>
              <Mono c={SAM.comment}>├─ </Mono>
              <Mono c={SAM.text}>{e.name}</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.red} b>-${e.amount.toFixed(2)}</Mono>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'goal') {
    const g = sheet.goal;
    const pct = Math.min(100, Math.round(g.saved / g.target * 100));
    const [amount, setAmount] = useState(50);
    const contribute = () => {
      const newSaved = Math.min(g.target, g.saved + amount);
      const done = newSaved >= g.target;
      setState(s => ({
        ...s,
        goals: s.goals.map(gg => gg.id === g.id ? { ...gg, saved: newSaved, done } : gg),
      }));
      if (window.SamDB) window.SamDB.setGoalSaved(g.id, newSaved, done);
      onClose();
    };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[close]</span>
          <Mono c={SAM.cyan} b>$ goal --view</Mono>
          <span style={{ color: SAM.yellow, cursor: 'pointer' }}>[edit]</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 34 }}>{g.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: SAM.text, marginTop: 4 }}>{g.name}</div>
          <div style={{
            fontSize: 26, fontWeight: 700, color: g.c, marginTop: 8,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${g.saved.toLocaleString()} <Mono c={SAM.comment} style={{ fontSize: 14 }}>/ ${g.target.toLocaleString()}</Mono>
          </div>
          <div style={{ fontSize: 12, color: SAM.comment, marginTop: 2 }}>
            {pct}% · eta {g.eta}
          </div>
          <div style={{ marginTop: 10, padding: '0 10px' }}>
            <BlockBar pct={pct} width={20} c={g.c}/>
          </div>
        </div>

        <div style={{ fontSize: 13, marginTop: 16 }}>
          <Mono c={SAM.green} b>▸ contribute</Mono>
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 10,
            padding: 12, border: `1px solid ${SAM.border}`,
          }}>
            <span onClick={() => setAmount(Math.max(0, amount - 10))}
              style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[-]</span>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Mono c={SAM.yellow} b style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>${amount}</Mono>
            </div>
            <span onClick={() => setAmount(amount + 10)}
              style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[+]</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[25, 50, 100, 250].map(v => (
              <div key={v} onClick={() => setAmount(v)}
                style={{
                  flex: 1, textAlign: 'center', padding: '6px 0',
                  border: `1px solid ${amount === v ? SAM.yellow : SAM.border}`,
                  color: amount === v ? SAM.yellow : SAM.text,
                  cursor: 'pointer', fontSize: 13,
                  background: amount === v ? 'rgba(227,179,65,0.06)' : 'transparent',
                }}>
                ${v}
              </div>
            ))}
          </div>
        </div>

        <div onClick={contribute} style={{
          marginTop: 18, padding: '10px 0', textAlign: 'center',
          background: SAM.green, color: SAM.bg, fontWeight: 700,
          cursor: 'pointer', fontSize: 14,
        }}>
          [confirm] add ${amount} to {g.name.toLowerCase()}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'new-expense') {
    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [catKey, setCatKey] = useState('food');
    const cats = [
      { key: 'food', icon: '🍔', name: 'Food', c: SAM.orange },
      { key: 'housing', icon: '🏠', name: 'Housing', c: SAM.cyan },
      { key: 'transport', icon: '▶', name: 'Transport', c: SAM.magenta },
      { key: 'subs', icon: '⬡', name: 'Subs', c: SAM.yellow },
      { key: 'ent', icon: '✦', name: 'Ent.', c: SAM.green },
    ];
    const cat = cats.find(c => c.key === catKey);
    const canSave = amount && name && !isNaN(parseFloat(amount));
    const save = async () => {
      if (!canSave) return;
      const amt = parseFloat(amount);
      if (window.SamDB) {
        const res = await window.SamDB.addExpense({
          amount: amt, name, catKey,
          budgets: state.budgets, accounts: state.accounts,
        });
        if (res && res.row) {
          setState(s => ({ ...s, expenses: [...s.expenses, res.row] }));
        }
      }
      onClose();
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ expense --new</Mono>
          <span onClick={canSave ? save : null}
            style={{ cursor: canSave ? 'pointer' : 'default', color: canSave ? SAM.green : SAM.comment, fontWeight: 600 }}>
            [save]
          </span>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={SAM.green}>$</Mono> <Mono c={SAM.green} b> amount</Mono>
          </div>
          <div style={{
            marginTop: 6, padding: '10px 12px',
            border: `1px solid ${SAM.border}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 20 }}>$</Mono>
            <input value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g,''))}
              placeholder="0.00"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: SAM.text, fontFamily: SAM.font,
                fontSize: 22, fontWeight: 600,
              }}/>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={SAM.cyan}>✎</Mono> <Mono c={SAM.cyan} b> name</Mono>
          </div>
          <div style={{
            marginTop: 6, padding: '10px 12px',
            border: `1px solid ${SAM.border}`,
          }}>
            <input value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Lunch, Coffee, Uber..."
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', color: SAM.text, fontFamily: SAM.font,
                fontSize: 14,
              }}/>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={SAM.magenta}>◎</Mono> <Mono c={SAM.magenta} b> category</Mono>
          </div>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {cats.map(c => (
              <div key={c.key} onClick={() => setCatKey(c.key)}
                style={{
                  padding: '8px 4px', textAlign: 'center',
                  border: `1px solid ${catKey === c.key ? c.c : SAM.border}`,
                  background: catKey === c.key ? `${c.c}15` : 'transparent',
                  cursor: 'pointer', transition: 'all 140ms',
                }}>
                <div style={{ fontSize: 16 }}>{c.icon}</div>
                <div style={{
                  fontSize: 10, marginTop: 2,
                  color: catKey === c.key ? c.c : SAM.comment,
                }}>
                  {c.name.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: SAM.comment }}>
          {`// will log to ${new Date().toLocaleString('en', { month: 'short', day: 'numeric' })} · checking ····4281`}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'new-goal') {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const canSave = name && target && !isNaN(parseFloat(target));
    const save = async () => {
      if (!canSave) return;
      if (window.SamDB) {
        const res = await window.SamDB.addGoal({
          name, target: parseFloat(target), icon: '◆', color: SAM.cyan,
        });
        if (res && res.row) {
          setState(s => ({ ...s, goals: [...s.goals, res.row] }));
        }
      }
      onClose();
    };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ goal --new</Mono>
          <span onClick={canSave ? save : null}
            style={{ cursor: canSave ? 'pointer' : 'default', color: canSave ? SAM.green : SAM.comment, fontWeight: 600 }}>
            [save]
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={SAM.green}>✎</Mono> <Mono c={SAM.green} b> name</Mono>
          </div>
          <div style={{ marginTop: 6, padding: '10px 12px', border: `1px solid ${SAM.border}` }}>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Trip to Japan"
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', color: SAM.text, fontFamily: SAM.font, fontSize: 14,
              }}/>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={SAM.yellow}>◎</Mono> <Mono c={SAM.yellow} b> target</Mono>
          </div>
          <div style={{
            marginTop: 6, padding: '10px 12px', border: `1px solid ${SAM.border}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 20 }}>$</Mono>
            <input value={target}
              onChange={e => setTarget(e.target.value.replace(/[^0-9.]/g,''))}
              placeholder="5000"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: SAM.text, fontFamily: SAM.font,
                fontSize: 22, fontWeight: 600,
              }}/>
          </div>
        </div>
        <div style={{ marginTop: 18, fontSize: 11, color: SAM.comment }}>
          {`// auto-calculate eta based on monthly savings rate`}
        </div>
      </div>
    );
  }

  return null;
}

function CombinedSheetContent(props) {
  const primary = SheetContent(props);
  if (primary !== null && primary !== undefined) return primary;
  if (window.ExtraSheetContent) return window.ExtraSheetContent(props);
  return null;
}

// ───────────────────── State ─────────────────────

// invest data is hydrated from Supabase after login: the global market_* tables
// (catalog, live/yahoo quotes, daily bars) plus the user's own holdings and
// watchlist. Empty until loadUserData fills them in (no mock).
const INVEST_DEFAULTS = {
  holdings: [],   // [{ sym, name, qty, avgCost }]
  watchlist: [],  // [{ sym, name }]
  tickerPool: [], // [{ sym, name }] — full catalog for [+ add]
  market: {},     // { SYM: { price, prevClose, dayOpen, bid, ask, pct, source, live }, __liveActive }
  dailyBars: {},  // { SYM: [{ date, close }] }
  portfolioSnapshots: [], // [{ t: ISO, v: number }] — real value over time
  investCash: 0,
  inefficiencies: [],
  inefficienciesTotal: 0,
};

// Current mark-to-market value of holdings (live price, falling back to cost).
function portfolioValue(holdings, market) {
  return (holdings || []).reduce((a, h) => {
    const q = market && market[h.sym];
    const px = q && q.price != null ? q.price : h.avgCost;
    return a + h.qty * px;
  }, 0);
}
window.portfolioValue = portfolioValue;

const initialState = {
  // UI / navigation
  tab: 'home',
  homeTab: 'home',
  expTab: 'expenses',
  goalsTab: 'goals',
  investTab: 'portfolio',
  profileTab: 'profile',
  selectedDay: 19,
  selectedGoal: null,
  streak: 0,
  pending: 3,
  prefs: { notifications: true, biometric: true, theme: 'dark', rollover: false },
  hiddenCards: [],
  autoSave: { enabled: true, amount: 50 },

  // identity + DB-backed collections (filled by loadUserData after login)
  user: null,
  accounts: [],
  budgets: [],
  expenses: [],
  incomeTx: [],
  goals: [],
  incomeSources: [],
  buckets: [],

  // invest (mock)
  ...INVEST_DEFAULTS,
};

// ───────────────────── Routing ─────────────────────

const TAB_ORDER = ['home', 'expenses', 'invest', 'goals', 'profile'];

function resolveScreen(tab, subTab) {
  if (tab === 'home') {
    if (subTab === 'activity' && window.ActivityScreen) return window.ActivityScreen;
    if (subTab === 'cards'    && window.CardsScreen)    return window.CardsScreen;
    return window.HomeScreen;
  }
  if (tab === 'expenses') {
    if (subTab === 'income' && window.IncomeScreen) return window.IncomeScreen;
    if (subTab === 'budget' && window.BudgetScreen) return window.BudgetScreen;
    return window.ExpensesScreen;
  }
  if (tab === 'invest') {
    if (subTab === 'market'   && window.MarketScreen)   return window.MarketScreen;
    if (subTab === 'analysis' && window.AnalysisScreen) return window.AnalysisScreen;
    return window.InvestScreen;
  }
  if (tab === 'goals') {
    if (subTab === 'savings' && window.SavingsScreen) return window.SavingsScreen;
    return window.GoalsScreen;
  }
  if (tab === 'profile') {
    if (subTab === 'stats'   && window.StatsScreen)   return window.StatsScreen;
    if (subTab === 'help'    && window.HelpScreen)    return window.HelpScreen;
    if (subTab === 'settings' && window.AjustesScreen) return window.AjustesScreen;
    return window.ProfileScreen;
  }
  return window.HomeScreen;
}

// CSS variable maps for shell theming
const SHELL_THEME_VARS = {
  dark:     { '--sam-page-bg': 'radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)', '--sam-bg': '#0a0e14', '--sam-border-nav': 'rgba(240,246,252,0.08)' },
  light:    { '--sam-page-bg': 'linear-gradient(160deg, #eaf0fb 0%, #f6f8fa 60%)',       '--sam-bg': '#f6f8fa', '--sam-border-nav': 'rgba(27,31,36,0.14)' },
};

// ───────────────────── Boot / loading ─────────────────────
function BootScreen({ error, onRetry }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (error) return;
    const id = setInterval(() => setDots(d => (d + 1) % 4), 320);
    return () => clearInterval(id);
  }, [error]);
  return (
    <div style={{
      width: '100%', height: '100dvh',
      background: 'radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: SAM.font, color: SAM.text,
    }}>
      <div style={{ textAlign: 'left', minWidth: 240 }}>
        <div style={{ fontSize: 13 }}>
          <Mono c={SAM.text} b>{window.SAM_USER || 'sam'}</Mono>
          <Mono c={SAM.text} b>@init.SAM</Mono>
          <Mono c={SAM.yellow} b> $ </Mono>
          <Mono c={SAM.cyan} b>./boot</Mono>
        </div>
        {error ? (
          <>
            <div style={{ marginTop: 12, fontSize: 13, color: SAM.red }}>✗ {error}</div>
            <div onClick={onRetry} style={{ marginTop: 14, fontSize: 13, color: SAM.yellow, cursor: 'pointer' }}>
              [retry ▸]
            </div>
          </>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: SAM.green }}>
            ▸ decrypting vault{'.'.repeat(dots)}
            <span style={{ color: SAM.comment }}>{' '.repeat(3 - dots)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────── Error boundary ─────────────────────
// Keeps a single screen render error from blacking out the whole app.
class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[SAM] screen render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '28px 18px', fontFamily: SAM.font, color: SAM.text }}>
          <div style={{ fontSize: 13 }}>
            <Mono c={SAM.red} b>✗ screen crashed</Mono>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: SAM.comment, lineHeight: 1.6 }}>
            {`// ${String(this.state.error && this.state.error.message || this.state.error)}`}
          </div>
          <div onClick={() => this.props.onReset && this.props.onReset()}
            style={{ marginTop: 16, fontSize: 13, color: SAM.yellow, cursor: 'pointer' }}>
            [reload data ▸]
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export {
  SAM, SAM_PALETTES, applySamPalette, Mono, Comment, Prompt, BlockBar, BarH, TabBar,
  makeSeries, seriesToPrices, symbolSeed, MiniLineChart, PerfChart, fmtMoneyShort,
  BottomNav, BottomSheet, CombinedSheetContent, initialState, resolveScreen,
  portfolioValue, TAB_ORDER, BootScreen, ScreenErrorBoundary, SHELL_THEME_VARS,
};
