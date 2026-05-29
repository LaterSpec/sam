// INVEST › ANALYSIS screen — allocation + risk metrics from real holdings
const { SAM, Mono, Comment, Prompt, BlockBar, TabBar } = window;

const ALLOC_COLORS = [
  SAM.cyan, SAM.yellow, SAM.magenta, SAM.orange, SAM.green, SAM.red,
];

// Daily portfolio value series (current holdings valued over historical closes)
function portfolioDailyValues(holdings, dailyBars) {
  if (!holdings.length) return [];
  const closeByDate = {};
  const allDates = new Set();
  holdings.forEach(h => {
    const bars = (dailyBars && dailyBars[h.sym]) || [];
    const m = {};
    bars.forEach(b => { m[b.date] = b.close; allDates.add(b.date); });
    closeByDate[h.sym] = m;
  });
  const dates = Array.from(allDates).sort().slice(-60);
  const lastClose = {};
  return dates.map(d => {
    let v = 0;
    holdings.forEach(h => {
      const c = closeByDate[h.sym][d];
      if (c != null) lastClose[h.sym] = c;
      const use = c != null ? c : lastClose[h.sym];
      if (use != null) v += h.qty * use;
    });
    return { date: d, v };
  });
}

function returnsFrom(values) {
  const r = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) r.push(values[i] / values[i - 1] - 1);
  }
  return r;
}
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function stdev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}
function maxDrawdown(values) {
  let peak = -Infinity, mdd = 0;
  values.forEach(v => { if (v > peak) peak = v; if (peak > 0) mdd = Math.min(mdd, v / peak - 1); });
  return mdd * 100;
}

function AnalysisScreen({ state, setState }) {
  const holdings  = state.holdings || [];
  const market    = state.market || {};
  const dailyBars = state.dailyBars || {};

  const priceOf = (h) => {
    const q = market[h.sym];
    return q && q.price != null ? q.price : h.avgCost;
  };
  const totalValue = holdings.reduce((a, h) => a + h.qty * priceOf(h), 0);

  // Allocation by position
  const allocation = holdings
    .map((h, i) => ({ label: h.sym, name: h.name, val: h.qty * priceOf(h) }))
    .sort((a, b) => b.val - a.val)
    .map((a, i) => ({ ...a, pct: totalValue > 0 ? (a.val / totalValue) * 100 : 0, c: ALLOC_COLORS[i % ALLOC_COLORS.length] }));

  // Metrics from reconstructed daily series
  const values = portfolioDailyValues(holdings, dailyBars).map(p => p.v);
  const rets = returnsFrom(values);
  const volPct = stdev(rets) * Math.sqrt(252) * 100;
  const mdd = maxDrawdown(values);
  const periodRet = values.length >= 2 && values[0] > 0 ? (values[values.length - 1] / values[0] - 1) * 100 : 0;

  // Beta vs SPY (aligned daily returns)
  const spyBars = dailyBars['SPY'] || [];
  const spyRets = returnsFrom(spyBars.slice(-values.length).map(b => b.close));
  let beta = null;
  if (rets.length >= 5 && spyRets.length === rets.length) {
    const mS = mean(spyRets), mP = mean(rets);
    let cov = 0, varS = 0;
    for (let i = 0; i < rets.length; i++) { cov += (spyRets[i] - mS) * (rets[i] - mP); varS += (spyRets[i] - mS) ** 2; }
    beta = varS > 0 ? cov / varS : null;
  }
  const sharpe = stdev(rets) > 0 ? (mean(rets) / stdev(rets)) * Math.sqrt(252) : 0;

  const hasData = holdings.length > 0 && values.length >= 2;
  const riskScore = hasData ? Math.max(1, Math.min(10, Math.round(volPct / 3))) : 0;
  const riskLabel = riskScore <= 3 ? 'CONSERVATIVE' : riskScore <= 6 ? 'MODERATE' : 'AGGRESSIVE';
  const riskColor = riskScore <= 3 ? SAM.green : riskScore <= 6 ? SAM.yellow : SAM.red;

  const metrics = [
    { label: 'Period return', value: hasData ? `${periodRet >= 0 ? '+' : ''}${periodRet.toFixed(1)}%` : '—', c: periodRet >= 0 ? SAM.green : SAM.red, note: '~60d' },
    { label: 'Volatility',    value: hasData ? `${volPct.toFixed(1)}%` : '—', c: SAM.yellow, note: 'annualized' },
    { label: 'Max drawdown',  value: hasData ? `${mdd.toFixed(1)}%` : '—', c: SAM.red, note: 'period low' },
    { label: 'Sharpe ratio',  value: hasData ? sharpe.toFixed(2) : '—', c: sharpe >= 1 ? SAM.green : SAM.text, note: 'rf=0' },
    { label: 'Beta vs SPY',   value: beta != null ? beta.toFixed(2) : '—', c: SAM.cyan, note: beta != null && beta < 1 ? 'defensive' : 'market' },
  ];

  // Rebalancing signals derived from concentration
  const suggestions = [];
  const top = allocation[0];
  if (top && top.pct > 40) suggestions.push({ icon: '⚠', c: SAM.yellow, text: `${top.label} is ${top.pct.toFixed(0)}% of the book · consider trimming` });
  if (holdings.length === 1) suggestions.push({ icon: '◆', c: SAM.cyan, text: 'single position · diversify across more tickers' });
  if (volPct > 30) suggestions.push({ icon: '⚠', c: SAM.red, text: `high volatility (${volPct.toFixed(0)}%) · size positions carefully` });
  if (suggestions.length === 0 && hasData) suggestions.push({ icon: '◉', c: SAM.green, text: 'allocation looks balanced · maintain positions' });

  if (holdings.length === 0) {
    return (
      <div style={{ padding: '16px 16px 0' }}>
        <TabBar tabs={['portfolio', 'market', 'analysis']} active="analysis"
          onChange={t => setState(s => ({ ...s, investTab: t }))}/>
        <div style={{ marginTop: 20 }}>
          <Prompt host="init.Analysis" cmd="portfolio --analyze"/>
          <div style={{
            marginTop: 16, padding: '26px 12px', textAlign: 'center',
            border: `1px dashed ${SAM.border}`, color: SAM.comment, fontSize: 12,
          }}>
            // no holdings to analyze yet · buy a position from the market tab
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['portfolio', 'market', 'analysis']} active="analysis"
        onChange={t => setState(s => ({ ...s, investTab: t }))}/>

      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Analysis" cmd="portfolio --analyze"/>
        <Comment>based on {holdings.length} holdings · {new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' })}</Comment>

        {/* Risk score */}
        <div style={{
          marginTop: 16, padding: '12px 14px',
          border: `1px solid ${SAM.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 10, color: SAM.comment, marginBottom: 4 }}>// risk score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: riskColor, fontVariantNumeric: 'tabular-nums' }}>
                {riskScore || '—'}
              </span>
              <Mono c={SAM.comment}>/10</Mono>
            </div>
            <Mono c={riskColor} b style={{ fontSize: 11 }}>{riskLabel}</Mono>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6,
                  background: i < riskScore
                    ? (i < 4 ? SAM.green : i < 7 ? SAM.yellow : SAM.red)
                    : SAM.track,
                  transition: 'background 300ms',
                }}/>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: SAM.comment }}>
              <span>conservative</span><span>aggressive</span>
            </div>
          </div>
        </div>

        {/* Asset allocation */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600, marginBottom: 10 }}>
            ▸ allocation
          </div>
          {allocation.map((a) => (
            <div key={a.label} style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, background: a.c }}/>
                  <Mono c={SAM.text}>{a.label}</Mono>
                  <Mono c={SAM.comment} style={{ fontSize: 10 }}>{a.name}</Mono>
                </div>
                <Mono c={a.c} b style={{ fontVariantNumeric: 'tabular-nums' }}>{a.pct.toFixed(1)}%</Mono>
              </div>
              <BlockBar pct={a.pct} width={24} c={a.c}/>
            </div>
          ))}
        </div>

        {/* Risk metrics */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600, marginBottom: 8 }}>
            ▸ risk metrics
          </div>
          <div style={{ border: `1px solid ${SAM.border}`, fontSize: 12 }}>
            {metrics.map((m, i) => (
              <div key={m.label} style={{
                display: 'flex', padding: '8px 12px', alignItems: 'baseline',
                borderBottom: i < metrics.length - 1 ? `1px solid ${SAM.border}` : 'none',
              }}>
                <Mono c={SAM.comment} style={{ flex: 1 }}>├─ {m.label}</Mono>
                <Mono c={m.c} b style={{ fontVariantNumeric: 'tabular-nums', marginRight: 8 }}>{m.value}</Mono>
                <Mono c={SAM.comment} style={{ fontSize: 10 }}>{m.note}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* Rebalancing suggestions */}
        <div style={{ marginTop: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600, marginBottom: 8 }}>
            ▸ rebalancing signals
          </div>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, fontSize: 12, marginTop: 8,
              padding: '8px 10px',
              border: `1px solid ${s.c}33`,
              background: `${s.c}08`,
            }}>
              <Mono c={s.c} b>{s.icon}</Mono>
              <Mono c={SAM.text}>{s.text}</Mono>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 10, color: SAM.comment }}>
            {`// metrics from ~60d reconstructed series · informational only · not financial advice`}
          </div>
        </div>
      </div>
    </div>
  );
}

window.AnalysisScreen = AnalysisScreen;
