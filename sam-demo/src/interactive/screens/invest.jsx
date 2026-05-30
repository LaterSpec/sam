import React from 'react';
// INVEST › PORTFOLIO screen — real holdings valued with live/yahoo quotes
const { SAM, Mono, Comment, Prompt, TabBar, PerfChart, fmtMoneyShort } = window;

// Build the performance series from REAL recorded value snapshots, starting at
// day 0 (your first purchase) and growing forward in time. The live current
// value is always pinned as the final point so the tip tracks the market.
// Granularity adapts to how much data exists:
//   • span <= ~2 days  -> intraday points (~10 min apart)
//   • longer           -> one point per day (last value of each day, last 30d)
function buildPerfSeries(snapshots, liveValue) {
  let pts = (snapshots || []).map(s => ({ t: s.t, v: s.v })).filter(p => p.v != null);

  // Pin the latest live value as the final point (or the only point right
  // after a buy, before the first snapshot lands).
  if (liveValue != null && liveValue > 0) {
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.v - liveValue) > 0.005) {
      pts = [...pts, { t: new Date().toISOString(), v: liveValue }];
    }
  }
  if (!pts.length) return { points: [], intraday: false };

  // A single anchor can't draw a line — mirror it so the chart shows a flat
  // start that will diverge as new snapshots arrive.
  if (pts.length === 1) {
    return { points: [{ ...pts[0] }, { t: new Date().toISOString(), v: pts[0].v }], intraday: true };
  }

  const first = new Date(pts[0].t).getTime();
  const last = new Date(pts[pts.length - 1].t).getTime();
  const spanDays = (last - first) / 864e5;

  if (spanDays <= 2) {
    // Intraday: keep raw snapshots, downsample if there are a lot.
    let series = pts;
    if (series.length > 72) {
      const step = Math.ceil(series.length / 72);
      series = series.filter((_, i) => i % step === 0 || i === series.length - 1);
    }
    return { points: series, intraday: true };
  }

  // Daily: last snapshot of each calendar day, keep the last 30 days.
  const byDay = {};
  pts.forEach(p => { byDay[p.t.slice(0, 10)] = p; });
  const days = Object.keys(byDay).sort().slice(-30);
  return { points: days.map(d => byDay[d]), intraday: false };
}

function InvestScreen({ state, setState, openSheet }) {
  const holdings = state.holdings || [];
  const market   = state.market || {};

  const priceOf = (h) => {
    const q = market[h.sym];
    return q && q.price != null ? q.price : h.avgCost;
  };
  const prevOf = (h) => {
    const q = market[h.sym];
    if (q && q.prevClose != null) return q.prevClose;
    return q && q.price != null ? q.price : h.avgCost;
  };

  const num = (v) => (v == null ? 0 : Number(v));
  const investCash = num(state.investCash);
  const ineffTotal = num(state.inefficienciesTotal);
  const topSurplus = (state.inefficiencies || [])
    .filter((c) => c.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus)
    .slice(0, 3);

  const value = window.portfolioValue
    ? window.portfolioValue(holdings, market)
    : holdings.reduce((a, h) => a + h.qty * priceOf(h), 0);
  const prevValue = holdings.reduce((a, h) => a + h.qty * prevOf(h), 0);
  const cost      = holdings.reduce((a, h) => a + h.qty * h.avgCost, 0);
  const dayGain   = value - prevValue;
  const dayPct    = prevValue > 0 ? (dayGain / prevValue) * 100 : 0;
  const totalPnl  = value - cost;
  const totalPct  = cost > 0 ? (totalPnl / cost) * 100 : 0;
  const dayUp     = dayGain >= 0;

  const perf = holdings.length ? buildPerfSeries(state.portfolioSnapshots, value) : { points: [], intraday: false };
  const perfSeries = perf.points;
  const liveActive = !!market.__liveActive;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['portfolio', 'market', 'analysis']} active="portfolio"
        onChange={t => setState(s => ({ ...s, investTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Invest" cmd="portfolio"/>
        <Comment>{holdings.length} holdings · {liveActive ? 'live feed' : 'delayed'} · tap to buy/sell</Comment>

        {/* Buying power from budget inefficiencies */}
        <div style={{
          marginTop: 14, padding: 14,
          border: `1px solid ${SAM.green}44`,
          background: 'rgba(86,211,100,0.05)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.green}>◇</Mono> buying_power
            <Mono c={SAM.comment} style={{ marginLeft: 8 }}>// ineficiencias del mes</Mono>
          </div>
          <div style={{
            fontSize: 26, fontWeight: 700, color: SAM.green, marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${investCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ color: SAM.comment, fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
              disponible
            </span>
          </div>
          <div style={{ fontSize: 11, color: SAM.comment, marginTop: 6 }}>
            pool ineficiencias{' '}
            <Mono c={SAM.textDim} b>${ineffTotal.toFixed(2)}</Mono>
            {' '}· gasto {'<'} tope en {topSurplus.length} categorías
          </div>
          {topSurplus.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11 }}>
              {topSurplus.map((c) => (
                <div key={c.key} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <Mono c={c.c}>{c.icon}</Mono>
                  <Mono c={SAM.textDim}>{c.name}</Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={SAM.green} b>+${c.surplus.toFixed(0)}</Mono>
                </div>
              ))}
            </div>
          )}
          {investCash <= 0 && (
            <div style={{ fontSize: 11, color: SAM.comment, marginTop: 8 }}>
              {`// sin caja · gasta menos en presupuesto o vende posiciones`}
            </div>
          )}
        </div>

        {/* Portfolio value (mark-to-market, distinct from buying power) */}
        <div style={{
          marginTop: 12, padding: 14,
          border: `1px solid ${SAM.border}`,
          background: 'rgba(88,166,255,0.04)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.cyan}>◇</Mono> portfolio_value
            <Mono c={SAM.comment} style={{ marginLeft: 8 }}>// posiciones MTM</Mono>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 700, color: SAM.cyan, marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${Math.floor(value).toLocaleString()}
            <span style={{ color: SAM.comment, fontSize: 20 }}>.{String(Math.round((value % 1) * 100)).padStart(2, '0')}</span>
          </div>
          {holdings.length > 0 ? (
            <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: dayUp ? SAM.green : SAM.red }}>
                {dayUp ? '+' : '-'}${Math.abs(dayGain).toFixed(2)} today
                {' '}<Mono c={dayUp ? SAM.green : SAM.red}>{dayUp ? '▲' : '▼'} {Math.abs(dayPct).toFixed(2)}%</Mono>
              </span>
              <span style={{ fontSize: 11, color: SAM.comment }}>
                P&L <Mono c={totalPnl >= 0 ? SAM.green : SAM.red} b>
                  {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)} ({totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}%)
                </Mono>
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: SAM.comment, marginTop: 6 }}>
              {`// $0 invested · buy from the market tab to start`}
            </div>
          )}
        </div>

        {/* performance — full width, grows from day 0 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600, marginBottom: 8 }}>
            ▸ performance
            <Mono c={SAM.comment} style={{ fontWeight: 400, marginLeft: 8, fontSize: 10 }}>
              {perf.intraday ? 'today · ~10m points' : 'since day 0 · daily'}
            </Mono>
          </div>
          {perfSeries.length >= 2 ? (
            <div style={{
              border: `1px solid ${SAM.border}`,
              background: 'rgba(255,255,255,0.012)',
              padding: '8px 6px 2px',
            }}>
              <PerfChart points={perfSeries} height={160} intraday={perf.intraday}/>
            </div>
          ) : (
            <div style={{
              border: `1px dashed ${SAM.border}`,
              padding: '26px 12px', textAlign: 'center',
              color: SAM.comment, fontSize: 12,
            }}>
              {'// '}your value chart starts when you buy · it grows from there
            </div>
          )}
        </div>

        {/* Holdings */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Holdings
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>[{holdings.length}] ▾</span>
          </div>

          {holdings.length === 0 && (
            <div style={{
              marginTop: 10, padding: '20px 12px', textAlign: 'center',
              border: `1px dashed ${SAM.border}`,
              color: SAM.comment, fontSize: 12,
            }}>
              // no positions · open the market tab and tap a ticker to buy
            </div>
          )}

          {holdings.map((h, i) => {
            const q = market[h.sym] || {};
            const price = q.price != null ? q.price : h.avgCost;
            const pct = q.pct || 0;
            const val = h.qty * price;
            const up = pct >= 0;
            const isLast = i === holdings.length - 1;
            return (
              <div key={h.sym}
                onClick={() => openSheet({ kind: 'trade', holding: h })}
                style={{
                  marginTop: 10, fontSize: 13, cursor: 'pointer',
                  padding: '4px 6px', marginLeft: -6, marginRight: -6,
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                  <Mono c={SAM.yellow} b>{h.sym}</Mono>
                  <Mono c={SAM.comment}>{h.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={up ? SAM.green : SAM.red} b>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: SAM.comment, marginTop: 2 }}>
                  {h.qty < 0 && <Mono c={SAM.red} b>SHORT </Mono>}
                  {h.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })} @ ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' · '}<Mono c={SAM.text}>${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Mono>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, fontSize: 10, color: SAM.comment }}>
          {liveActive
            ? `// live feed active · simulated positions · not financial advice`
            : `// data delayed / last close · simulated positions · not financial advice`}
        </div>
      </div>
    </div>
  );
}

window.InvestScreen = InvestScreen;
