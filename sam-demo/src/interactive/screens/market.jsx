import React from 'react';
// INVEST › MARKET screen — real quotes from Supabase (live SSE -> yahoo fallback)
const { SAM, Mono, Comment, Prompt, TabBar, MiniLineChart } = window;

function MarketScreen({ state, setState, openSheet }) {
  const market    = state.market || {};
  const dailyBars = state.dailyBars || {};
  const holdings  = state.holdings || [];
  const watchlist = state.watchlist || [];
  const liveActive = !!market.__liveActive;

  // Fresh quotes arrive from the always-on poller in <App> (state.market),
  // so this screen just renders whatever is current.
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const isOpen = now.getDay() >= 1 && now.getDay() <= 5
               && now.getHours() >= 9 && now.getHours() < 16;

  const quote = (sym) => market[sym] || null;

  const sparkline = (sym, price) => {
    const bars = dailyBars[sym];
    if (bars && bars.length >= 2) {
      const closes = bars.slice(-24).map(b => b.close);
      if (price != null) closes.push(price);
      return closes;
    }
    return null;
  };

  // Top movers across the catalog (real % change)
  const moverList = Object.keys(market)
    .filter(s => s !== '__liveActive' && market[s] && market[s].price)
    .map(s => ({ sym: s, pct: market[s].pct }));
  const gainers = [...moverList].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const losers  = [...moverList].sort((a, b) => a.pct - b.pct).slice(0, 3);

  const TickerCard = ({ sym, name, owned }) => {
    const q       = quote(sym);
    const price   = q ? q.price : null;
    const pct     = q ? q.pct : 0;
    const up      = pct >= 0;
    const pctColor = up ? SAM.green : SAM.red;
    const prices  = sparkline(sym, price);
    const pos     = owned ? holdings.find(h => h.sym === sym) : null;
    const qty     = pos ? pos.qty : null;
    const val     = (qty != null && price != null) ? qty * price : null;
    const dayGain = val != null ? val * (pct / 100) : null;
    const noData  = price == null;

    return (
      <div
        onClick={() => price != null && openSheet && openSheet({
          kind: 'ticker-detail',
          sym, name,
          price, pct,
          qty,
          owned: !!owned,
          source: q ? q.source : 'yahoo',
        })}
        style={{
          marginBottom: 10, cursor: noData ? 'default' : 'pointer',
          border: `1px solid ${noData ? SAM.border : (up ? SAM.green + '30' : SAM.red + '30')}`,
          background: noData ? 'transparent' : (up ? 'rgba(86,211,100,0.025)' : 'rgba(248,81,73,0.025)'),
          transition: 'border-color 180ms, background 180ms',
        }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '78px 1fr 110px',
          alignItems: 'center',
          padding: '10px 12px',
          gap: 10,
        }}>
          <div>
            <Mono c={SAM.yellow} b style={{ fontSize: 14 }}>{sym}</Mono>
            <div style={{ fontSize: 10, color: SAM.comment, marginTop: 1 }}>{name}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {prices
              ? <MiniLineChart prices={prices} color={noData ? SAM.comment : pctColor} width={110} height={34}/>
              : <Mono c={SAM.comment} style={{ fontSize: 10 }}>no data</Mono>}
          </div>
          <div style={{ textAlign: 'right' }}>
            {noData ? (
              <Mono c={SAM.comment} style={{ fontSize: 11 }}>—</Mono>
            ) : (
              <>
                <Mono c={SAM.text} b style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Mono>
                <div style={{ marginTop: 2 }}>
                  <Mono c={pctColor} b style={{ fontSize: 11 }}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </Mono>
                </div>
              </>
            )}
          </div>
        </div>

        {owned && val != null && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '6px 12px 9px',
            fontSize: 10, color: SAM.comment,
            borderTop: `1px solid ${SAM.border}`,
          }}>
            <span>
              <Mono c={SAM.textDim}>{qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</Mono>
              <Mono c={SAM.comment}> shares</Mono>
            </span>
            <span>
              <Mono c={SAM.comment}>val </Mono>
              <Mono c={SAM.text} b style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Mono>
            </span>
            <span>
              <Mono c={pctColor} b>
                {up ? '+' : '-'}${Math.abs(dayGain).toFixed(2)} today
              </Mono>
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['portfolio', 'market', 'analysis']} active="market"
        onChange={t => setState(s => ({ ...s, investTab: t }))}/>

      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Market" cmd="ticker --live"/>

        {/* Market status + data source banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          border: `1px solid ${(isOpen ? SAM.green : SAM.comment) + '44'}`,
          background: isOpen ? 'rgba(86,211,100,0.04)' : 'rgba(110,118,129,0.06)',
          marginBottom: 14,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOpen ? SAM.green : SAM.comment,
            boxShadow: isOpen ? `0 0 6px ${SAM.green}` : 'none',
          }}/>
          <Mono c={isOpen ? SAM.green : SAM.comment} b style={{ fontSize: 11 }}>
            {isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </Mono>
          <Mono c={SAM.comment} style={{ fontSize: 11 }}>· NYSE {hh}:{mm} EST</Mono>
          <span style={{ flex: 1 }}/>
          {liveActive
            ? <Mono c={SAM.green} b style={{ fontSize: 10 }}>● LIVE</Mono>
            : <Mono c={SAM.comment} style={{ fontSize: 10 }}>~15m delay</Mono>}
        </div>

        {/* Data source line */}
        <div style={{ fontSize: 10, color: SAM.comment, marginBottom: 10 }}>
          {liveActive
            ? '// source: simulated live feed'
            : '// source: simulated market · delayed snapshot'}
        </div>

        {/* Buying power */}
        <div style={{
          padding: '10px 12px', marginBottom: 14,
          border: `1px solid ${SAM.green}44`,
          background: 'rgba(86,211,100,0.05)',
          display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8,
        }}>
          <Mono c={SAM.green} b style={{ fontSize: 12 }}>◇ buying_power</Mono>
          <Mono c={SAM.green} b style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
            ${(state.investCash != null ? state.investCash : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Mono>
          <Mono c={SAM.comment} style={{ fontSize: 11 }}>
            disponible · pool ${(state.inefficienciesTotal != null ? state.inefficienciesTotal : 0).toFixed(0)}
          </Mono>
          <span style={{ flex: 1 }} />
          <Mono c={SAM.cyan} b style={{ fontSize: 11 }}>
            portfolio ${(window.portfolioValue
              ? window.portfolioValue(holdings, market)
              : holdings.reduce((a, h) => {
                const q = market[h.sym];
                const px = q && q.price != null ? q.price : h.avgCost;
                return a + h.qty * px;
              }, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Mono>
        </div>

        {/* Holdings */}
        <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600, marginBottom: 10 }}>
          ▸ your holdings
          <Mono c={SAM.comment} style={{ fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
            {holdings.length} positions · tap for detail
          </Mono>
        </div>
        {holdings.length === 0 && (
          <div style={{
            padding: '14px 12px', textAlign: 'center',
            border: `1px dashed ${SAM.border}`,
            color: SAM.comment, fontSize: 12, marginBottom: 14,
          }}>
            // no positions yet · tap a watchlist ticker to buy
          </div>
        )}
        {holdings.map(h => <TickerCard key={h.sym} sym={h.sym} name={h.name} owned={true}/>)}

        {/* Watchlist */}
        <div style={{
          display: 'flex', alignItems: 'baseline',
          marginTop: 18, marginBottom: 10,
        }}>
          <Mono c={SAM.cyan} b style={{ fontSize: 13 }}>▸ watchlist</Mono>
          <Mono c={SAM.comment} style={{ marginLeft: 8, fontSize: 11 }}>
            {watchlist.length} tracked
          </Mono>
          <span style={{ flex: 1 }}/>
          <span
            onClick={() => openSheet && openSheet({ kind: 'add-ticker' })}
            style={{ cursor: 'pointer' }}>
            <Mono c={SAM.green} b style={{ fontSize: 12 }}>[+ add]</Mono>
          </span>
        </div>
        {watchlist.length === 0 && (
          <div style={{
            padding: '14px 12px', textAlign: 'center',
            border: `1px dashed ${SAM.border}`,
            color: SAM.comment, fontSize: 12, marginBottom: 14,
          }}>
            // no tickers yet · tap [+ add] to start tracking
          </div>
        )}
        {watchlist.map(w => <TickerCard key={w.sym} sym={w.sym} name={w.name} owned={false}/>)}

        {/* Top movers */}
        <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
          ▸ top movers today
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: SAM.green, fontWeight: 600, marginBottom: 6 }}>
              // gainers
            </div>
            {gainers.map(m => (
              <div key={m.sym} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 5 }}>
                <Mono c={SAM.text} b>{m.sym}</Mono>
                <Mono c={SAM.green} b>+{m.pct.toFixed(2)}%</Mono>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: SAM.red, fontWeight: 600, marginBottom: 6 }}>
              // losers
            </div>
            {losers.map(m => (
              <div key={m.sym} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 5 }}>
                <Mono c={SAM.text} b>{m.sym}</Mono>
                <Mono c={SAM.red} b>{m.pct.toFixed(2)}%</Mono>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 10, color: SAM.comment, marginBottom: 24 }}>
          {`// orders are simulated · not financial advice · do your own research`}
        </div>
      </div>
    </div>
  );
}

window.MarketScreen = MarketScreen;
