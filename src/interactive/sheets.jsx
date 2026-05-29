// Extra bottom sheet content (edit-budget, income-src, new-income, card, bucket, trade,
// ticker-detail, add-ticker). Loaded after sam-interactive.jsx; exposed to window.
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar,
        makeSeries, seriesToPrices, symbolSeed } = window;

function ExtraSheetContent({ sheet, state, setState, onClose }) {
  if (sheet.kind === 'edit-budget') {
    const { budget: b, spent } = sheet;
    const [cap, setCap] = React.useState(b.cap);
    const save = () => {
      setState(s => ({
        ...s,
        budgets: s.budgets.map(x => x.key === b.key ? { ...x, cap } : x),
      }));
      if (window.SamDB && b.id) window.SamDB.setBudgetCap(b.id, cap);
      onClose();
    };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ budget --edit {b.key}</Mono>
          <span onClick={save} style={{ cursor: 'pointer', color: SAM.green, fontWeight: 600 }}>[save]</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 34, color: b.c }}>{b.icon}</div>
          <div style={{ fontSize: 15, color: SAM.text, fontWeight: 600, marginTop: 4 }}>{b.name}</div>
          <div style={{ fontSize: 11, color: SAM.comment, marginTop: 2 }}>
            spent ${spent.toFixed(0)} this month
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={SAM.yellow}>◎</Mono> <Mono c={SAM.yellow} b> monthly cap</Mono>
        </div>
        <div style={{
          marginTop: 10, padding: 14, border: `1px solid ${SAM.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span onClick={() => setCap(Math.max(0, cap - 25))}
            style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[-]</span>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
              ${cap}
            </Mono>
          </div>
          <span onClick={() => setCap(cap + 25)}
            style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[+]</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[100, 250, 500, 1000].map(v => (
            <div key={v} onClick={() => setCap(v)}
              style={{
                flex: 1, textAlign: 'center', padding: '6px 0',
                border: `1px solid ${cap === v ? SAM.yellow : SAM.border}`,
                color: cap === v ? SAM.yellow : SAM.text,
                cursor: 'pointer', fontSize: 13,
                background: cap === v ? 'rgba(227,179,65,0.06)' : 'transparent',
              }}>
              ${v}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: SAM.comment }}>
          {`// ${cap >= spent ? `$${cap - spent} left this month` : `$${spent - cap} over budget`}`}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'income-src') {
    const s = sheet.src;
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[close]</span>
          <Mono c={SAM.cyan} b>$ income --view</Mono>
          <span style={{ color: SAM.yellow, cursor: 'pointer' }}>[edit]</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 18 }}>
          <div style={{ fontSize: 34, color: s.c }}>{s.icon}</div>
          <div style={{ fontSize: 15, color: SAM.text, fontWeight: 600, marginTop: 4 }}>{s.name}</div>
          <div style={{
            fontSize: 28, fontWeight: 700, color: SAM.green, marginTop: 8,
            fontVariantNumeric: 'tabular-nums',
          }}>
            +${(s.amt || s.amount || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: SAM.comment, marginTop: 2 }}>
            {s.freq || 'recurring'} · next {s.next || 'tbd'}
          </div>
        </div>
        <div style={{ fontSize: 13, borderTop: `1px solid ${SAM.border}`, paddingTop: 12 }}>
          <Mono c={SAM.cyan} b>▸ last 6 payments</Mono>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', marginTop: 6, fontSize: 12 }}>
              <Mono c={SAM.comment}>{i === 5 ? '└─ ' : '├─ '}</Mono>
              <Mono c={SAM.text}>{['Apr','Mar','Feb','Jan','Dec','Nov'][i]} 1</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.green} b>+${(s.amt || s.amount || 0).toLocaleString()}</Mono>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'new-income') {
    const [name, setName] = React.useState('');
    const [amt, setAmt] = React.useState('');
    const canSave = name && amt && !isNaN(parseFloat(amt));
    const save = async () => {
      if (!canSave) return;
      if (window.SamDB) {
        const res = await window.SamDB.addIncome({
          name, amt: parseFloat(amt), icon: '◆', color: SAM.cyan, freq: 'one-time', next: '—',
        });
        if (res && res.row) {
          setState(st => ({ ...st, incomeSources: [...st.incomeSources, res.row] }));
        }
      }
      onClose();
    };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ income --new</Mono>
          <span onClick={canSave ? save : null}
            style={{ cursor: canSave ? 'pointer' : 'default', color: canSave ? SAM.green : SAM.comment, fontWeight: 600 }}>
            [save]
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
          <Mono c={SAM.green}>✎</Mono> <Mono c={SAM.green} b> source name</Mono>
        </div>
        <div style={{ marginTop: 6, padding: '10px 12px', border: `1px solid ${SAM.border}` }}>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Client X · consulting"
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: SAM.text, fontFamily: SAM.font, fontSize: 14,
            }}/>
        </div>
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600 }}>
          <Mono c={SAM.yellow}>$</Mono> <Mono c={SAM.yellow} b> amount</Mono>
        </div>
        <div style={{
          marginTop: 6, padding: '10px 12px', border: `1px solid ${SAM.border}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Mono c={SAM.yellow} b style={{ fontSize: 20 }}>$</Mono>
          <input value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g,''))}
            placeholder="0.00"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: SAM.text, fontFamily: SAM.font, fontSize: 22, fontWeight: 600,
            }}/>
        </div>
      </div>
    );
  }

  if (sheet.kind === 'card') {
    const c = sheet.card;
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[close]</span>
          <Mono c={SAM.cyan} b>$ account --view {c.digits}</Mono>
          <span style={{ color: SAM.yellow, cursor: 'pointer' }}>[edit]</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 34, color: c.color }}>{c.icon}</div>
          <div style={{ fontSize: 15, color: SAM.text, fontWeight: 600, marginTop: 4 }}>
            {c.bank} {c.label}
          </div>
          <div style={{ fontSize: 11, color: SAM.comment, marginTop: 2 }}>····{c.digits}</div>
          <div style={{
            fontSize: 28, fontWeight: 700, marginTop: 10,
            color: c.balance < 0 ? SAM.red : c.color,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {c.balance < 0 ? '-' : ''}${Math.abs(c.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
          {c.limit && (
            <div style={{ fontSize: 12, color: SAM.comment, marginTop: 4 }}>
              limit ${c.limit.toLocaleString()} · {Math.round(Math.abs(c.balance)/c.limit*100)}% used
            </div>
          )}
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, fontSize: 13 }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px 0',
            border: `1px solid ${SAM.border}`, cursor: 'pointer',
            color: SAM.cyan,
          }}>[transfer]</div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px 0',
            border: `1px solid ${SAM.border}`, cursor: 'pointer',
            color: SAM.yellow,
          }}>[sync now]</div>
        </div>
        <div style={{ marginTop: 18, fontSize: 13 }}>
          <Mono c={SAM.cyan} b>▸ balance history</Mono>
          <pre style={{
            fontFamily: SAM.font, fontSize: 10, color: c.color,
            lineHeight: 1.2, margin: '8px 0 0', opacity: 0.8,
          }}>{`  hi ┤        ╭──╮ ╭────
     │    ╭───╯  ╰─╯
  lo ┤────╯
     └──────────────────
       M  T  W  T  F  S  S`}</pre>
        </div>
      </div>
    );
  }

  if (sheet.kind === 'bucket') {
    const b = sheet.bucket;
    const [amount, setAmount] = React.useState(50);
    const add = (delta) => {
      const newBal = Math.max(0, b.balance + delta);
      setState(s => ({
        ...s,
        buckets: s.buckets.map(x => x.id === b.id ? { ...x, balance: newBal } : x),
      }));
      if (window.SamDB) window.SamDB.setBucketBalance(b.id, newBal);
      onClose();
    };
    const pct = Math.min(100, Math.round(b.balance / b.target * 100));
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[close]</span>
          <Mono c={SAM.cyan} b>$ bucket --view</Mono>
          <span style={{ color: SAM.yellow, cursor: 'pointer' }}>[edit]</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 34, color: b.c }}>{b.icon}</div>
          <div style={{ fontSize: 15, color: SAM.text, fontWeight: 600, marginTop: 4 }}>{b.name}</div>
          <div style={{
            fontSize: 26, fontWeight: 700, color: b.c, marginTop: 8,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${b.balance.toLocaleString()} <Mono c={SAM.comment} style={{ fontSize: 14 }}>/ ${b.target.toLocaleString()}</Mono>
          </div>
          <div style={{ fontSize: 12, color: SAM.comment, marginTop: 2 }}>{pct}% · {b.apy}% apy</div>
          <div style={{ marginTop: 10, padding: '0 10px' }}>
            <BlockBar pct={pct} width={20} c={b.c}/>
          </div>
        </div>
        <div style={{ marginTop: 18, fontSize: 13 }}>
          <Mono c={SAM.green} b>▸ move money</Mono>
          <div style={{
            marginTop: 10, padding: 12, border: `1px solid ${SAM.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span onClick={() => setAmount(Math.max(10, amount - 25))}
              style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[-]</span>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Mono c={SAM.yellow} b style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>${amount}</Mono>
            </div>
            <span onClick={() => setAmount(amount + 25)}
              style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[+]</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div onClick={() => add(-amount)} style={{
              flex: 1, textAlign: 'center', padding: '10px 0',
              background: SAM.red, color: SAM.bg, fontWeight: 700, cursor: 'pointer',
            }}>[withdraw ${amount}]</div>
            <div onClick={() => add(amount)} style={{
              flex: 1, textAlign: 'center', padding: '10px 0',
              background: SAM.green, color: SAM.bg, fontWeight: 700, cursor: 'pointer',
            }}>[deposit ${amount}]</div>
          </div>
        </div>
      </div>
    );
  }

  if (sheet.kind === 'trade') {
    const h = sheet.holding;
    const q = (state.market && state.market[h.sym]) || {};
    const price = q.price != null ? q.price : (h.avgCost || 0);
    const pct = q.pct || 0;
    const [mode, setMode] = React.useState('buy');
    const [qty, setQty] = React.useState(1);
    const totalCost = qty * price;
    const confirm = async () => {
      if (!(price > 0)) { onClose(); return; }
      if (window.SamDB) {
        if (mode === 'buy') {
          const res = await window.SamDB.buyHolding({ symbol: h.sym, name: h.name, amount: qty * price, price });
          if (res && res.row) {
            setState(s => ({
              ...s,
              holdings: [...s.holdings.filter(x => x.sym !== h.sym), res.row],
              watchlist: (s.watchlist || []).filter(w => w.sym !== h.sym),
            }));
          }
        } else {
          const res = await window.SamDB.sellHolding({ symbol: h.sym, qty, price });
          if (res && !res.error) {
            setState(s => res.removed
              ? { ...s, holdings: s.holdings.filter(x => x.sym !== h.sym) }
              : { ...s, holdings: s.holdings.map(x => x.sym === h.sym ? res.row : x) });
          }
        }
      }
      onClose();
    };
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ trade {h.sym}</Mono>
          <span style={{ color: q.live ? SAM.green : SAM.comment }}>{q.live ? 'live' : 'delayed'}</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: SAM.yellow, fontFamily: SAM.font }}>{h.sym}</div>
          <div style={{ fontSize: 12, color: SAM.comment, marginTop: 2 }}>{h.name}</div>
          <div style={{
            fontSize: 26, fontWeight: 700, color: pct >= 0 ? SAM.green : SAM.red, marginTop: 8,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <Mono style={{ fontSize: 13, marginLeft: 8 }} c={pct >= 0 ? SAM.green : SAM.red}>
              {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
            </Mono>
          </div>
          <div style={{ fontSize: 11, color: SAM.comment, marginTop: 2 }}>
            you own {h.qty} @ avg ${(h.avgCost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 6 }}>
          {['buy','sell'].map(m => (
            <div key={m} onClick={() => setMode(m)} style={{
              flex: 1, textAlign: 'center', padding: '8px 0', cursor: 'pointer',
              border: `1px solid ${mode === m ? (m === 'buy' ? SAM.green : SAM.red) : SAM.border}`,
              color: mode === m ? (m === 'buy' ? SAM.green : SAM.red) : SAM.comment,
              fontWeight: mode === m ? 700 : 400, fontSize: 13,
              background: mode === m ? (m === 'buy' ? 'rgba(86,211,100,0.06)' : 'rgba(248,81,73,0.06)') : 'transparent',
            }}>[{m}]</div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>
          <Mono c={SAM.magenta}>◎</Mono> <Mono c={SAM.magenta} b> shares</Mono>
        </div>
        <div style={{
          marginTop: 6, padding: 12, border: `1px solid ${SAM.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span onClick={() => setQty(Math.max(0.1, +(qty - 0.5).toFixed(2)))}
            style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[-]</span>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{qty.toFixed(1)}</Mono>
          </div>
          <span onClick={() => setQty(+(qty + 0.5).toFixed(2))}
            style={{ cursor: 'pointer', color: SAM.comment, fontSize: 18 }}>[+]</span>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, display: 'flex' }}>
          <Mono c={SAM.comment}>est {mode} cost</Mono>
          <span style={{ flex: 1 }}/>
          <Mono c={mode === 'buy' ? SAM.red : SAM.green} b>
            {mode === 'buy' ? '-' : '+'}${totalCost.toLocaleString(undefined, {maximumFractionDigits: 2})}
          </Mono>
        </div>

        <div onClick={confirm} style={{
          marginTop: 18, padding: '12px 0', textAlign: 'center',
          background: mode === 'buy' ? SAM.green : SAM.red,
          color: SAM.bg, fontWeight: 700, cursor: 'pointer', fontSize: 14,
        }}>
          [confirm {mode}] {qty.toFixed(1)} × {h.sym}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'ticker-detail') {
    const { sym, name, price, pct, qty, owned } = sheet;
    const RANGES = [
      { k: '1D', len: 48, vol: 0.04, labels: ['09:30','11:00','12:30','14:00','15:30'] },
      { k: '1W', len: 56, vol: 0.06, labels: ['Mon','Tue','Wed','Thu','Fri'] },
      { k: '1M', len: 60, vol: 0.09, labels: ['W1','W2','W3','W4','now'] },
      { k: '3M', len: 64, vol: 0.14, labels: ['Mar','Apr','May','Jun','now'] },
      { k: '1Y', len: 72, vol: 0.22, labels: ['Q1','Q2','Q3','Q4','now'] },
    ];
    const [rangeKey, setRangeKey] = React.useState('1D');
    const [amount, setAmount]   = React.useState('100');
    const [hover, setHover]     = React.useState(null); // index of hovered point

    const range  = RANGES.find(r => r.k === rangeKey);
    const seed   = symbolSeed(sym);
    const realBars = (state.dailyBars && state.dailyBars[sym]) || [];
    // Real daily closes for ranges we have history for; synthetic intraday otherwise.
    let prices;
    let realRange = false;
    if ((rangeKey === '1M' || rangeKey === '3M' || rangeKey === '1Y') && realBars.length >= 5) {
      const n = rangeKey === '1M' ? 22 : rangeKey === '3M' ? 66 : realBars.length;
      prices = realBars.slice(-n).map(b => b.close);
      if (price != null) prices[prices.length - 1] = price; // pin to current price
      realRange = true;
    } else {
      const series = makeSeries(seed, range.len, 0, range.vol);
      prices = seriesToPrices(series, price, range.vol);
    }

    const up = pct >= 0;
    const lineColor = up ? SAM.green : SAM.red;

    // Chart layout
    const W = 320, H = 180;
    const padL = 40, padR = 8, padT = 8, padB = 22;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const rng = max - min || 1;
    const xStep = innerW / (prices.length - 1);
    const pts = prices.map((v, i) => [
      padL + i * xStep,
      padT + innerH * (1 - (v - min) / rng),
    ]);
    const linePath = pts.map(([x, y], i) =>
      `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const lastX = pts[pts.length - 1][0];
    const firstX = pts[0][0];
    const areaPath = `${linePath} L${lastX.toFixed(1)},${padT + innerH} L${firstX.toFixed(1)},${padT + innerH} Z`;
    const gradId = `td-grad-${sym}`;

    const yLabels = [0, 0.25, 0.5, 0.75, 1].map(t => min + rng * (1 - t));

    const amt = parseFloat(amount) || 0;
    const sharesAtAmt = price > 0 ? amt / price : 0;

    const trade = async (mode) => {
      if (amt <= 0 || !(price > 0)) return;
      if (mode === 'sell' && !owned) return;
      if (window.SamDB) {
        if (mode === 'buy') {
          const res = await window.SamDB.buyHolding({ symbol: sym, name, amount: amt, price });
          if (res && res.row) {
            setState(s => ({
              ...s,
              holdings: [...s.holdings.filter(h => h.sym !== sym), res.row],
              watchlist: (s.watchlist || []).filter(w => w.sym !== sym),
            }));
          }
        } else {
          const res = await window.SamDB.sellHolding({ symbol: sym, amount: amt, price });
          if (res && !res.error) {
            setState(s => res.removed
              ? { ...s, holdings: s.holdings.filter(h => h.sym !== sym) }
              : { ...s, holdings: s.holdings.map(h => h.sym === sym ? res.row : h) });
          }
        }
      }
      onClose();
    };

    const hoverPt   = hover != null ? pts[hover] : null;
    const hoverPrice = hover != null ? prices[hover] : null;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[close]</span>
          <Mono c={SAM.cyan} b>$ {sym.toLowerCase()} --detail</Mono>
          <Mono c={up ? SAM.green : SAM.red} b>
            {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
          </Mono>
        </div>

        {/* Header: name + big price */}
        <div style={{ marginBottom: 10 }}>
          <Mono c={SAM.comment} style={{ fontSize: 12 }}>{name}</Mono>
          <div style={{
            fontSize: 30, fontWeight: 700, color: lineColor,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 2,
          }}>
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {owned && (
            <div style={{ fontSize: 11, color: SAM.comment, marginTop: 2 }}>
              <Mono c={SAM.textDim}>{qty}</Mono>
              <Mono c={SAM.comment}> shares · </Mono>
              <Mono c={SAM.text} b>${(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Mono>
              <Mono c={SAM.comment}> position</Mono>
            </div>
          )}
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {RANGES.map(r => (
            <div key={r.k} onClick={() => setRangeKey(r.k)} style={{
              flex: 1, textAlign: 'center', padding: '4px 0',
              border: `1px solid ${rangeKey === r.k ? lineColor : SAM.border}`,
              color: rangeKey === r.k ? lineColor : SAM.comment,
              cursor: 'pointer', fontSize: 11,
              fontWeight: rangeKey === r.k ? 700 : 400,
              background: rangeKey === r.k ? `${lineColor}10` : 'transparent',
              transition: 'all 140ms',
            }}>{r.k}</div>
          ))}
        </div>

        {/* SVG chart with X/Y axes */}
        <div style={{
          border: `1px solid ${SAM.border}`,
          background: 'rgba(255,255,255,0.012)',
          padding: 4,
        }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}
            onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={lineColor} stopOpacity="0.28"/>
                <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
              </linearGradient>
            </defs>

            {/* Y grid + labels */}
            {yLabels.map((v, i) => {
              const y = padT + (innerH / (yLabels.length - 1)) * i;
              return (
                <g key={'y'+i}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y}
                    stroke={SAM.border} strokeWidth="1" strokeDasharray="2 3"/>
                  <text x={padL - 6} y={y + 3} fill={SAM.comment} fontSize="9"
                    fontFamily={SAM.font} textAnchor="end">
                    ${v.toFixed(v < 10 ? 2 : 0)}
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {range.labels.map((lbl, i) => {
              const x = padL + (innerW / (range.labels.length - 1)) * i;
              return (
                <text key={'x'+i} x={x} y={H - 6}
                  fill={SAM.comment} fontSize="9" fontFamily={SAM.font}
                  textAnchor={i === 0 ? 'start' : i === range.labels.length - 1 ? 'end' : 'middle'}>
                  {lbl}
                </text>
              );
            })}

            {/* Axis lines */}
            <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={SAM.border} strokeWidth="1"/>
            <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke={SAM.border} strokeWidth="1"/>

            {/* Area + line */}
            <path d={areaPath} fill={`url(#${gradId})`} stroke="none"/>
            <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>

            {/* Last-point dot */}
            <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3"
              fill={lineColor} stroke={SAM.bg} strokeWidth="1.5"/>

            {/* Hover crosshair + tooltip */}
            {hoverPt && (
              <g>
                <line x1={hoverPt[0]} y1={padT} x2={hoverPt[0]} y2={padT + innerH}
                  stroke={SAM.comment} strokeWidth="1" strokeDasharray="2 2"/>
                <circle cx={hoverPt[0]} cy={hoverPt[1]} r="3.5"
                  fill={SAM.bg} stroke={lineColor} strokeWidth="2"/>
                <g transform={`translate(${Math.min(W - padR - 70, Math.max(padL, hoverPt[0] - 35))}, ${Math.max(padT, hoverPt[1] - 28)})`}>
                  <rect width="70" height="22" fill={SAM.bg} stroke={lineColor} strokeWidth="1"/>
                  <text x="6" y="9" fill={SAM.comment} fontSize="8" fontFamily={SAM.font}>{`t: ${hover}`}</text>
                  <text x="6" y="18" fill={lineColor} fontSize="10" fontFamily={SAM.font} fontWeight="700">
                    {`$${hoverPrice.toFixed(2)}`}
                  </text>
                </g>
              </g>
            )}

            {/* Invisible hit areas for hover */}
            {pts.map(([x, y], i) => (
              <rect key={'h'+i} x={x - xStep/2} y={padT} width={xStep} height={innerH}
                fill="transparent" style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHover(i)}/>
            ))}
          </svg>
        </div>

        {/* Stat grid */}
        <div style={{
          marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
          fontSize: 11,
        }}>
          {[
            { l: 'open',   v: `$${(price * 0.992).toFixed(2)}` },
            { l: 'high',   v: `$${max.toFixed(2)}`, c: SAM.green },
            { l: 'low',    v: `$${min.toFixed(2)}`, c: SAM.red },
            { l: 'volume', v: `${(Math.abs(Math.sin(seed)) * 9 + 0.3).toFixed(1)}M` },
          ].map(s => (
            <div key={s.l} style={{ padding: '6px 4px', border: `1px solid ${SAM.border}`, textAlign: 'center' }}>
              <div style={{ color: SAM.comment, fontSize: 9 }}>// {s.l}</div>
              <Mono c={s.c || SAM.text} b style={{ fontVariantNumeric: 'tabular-nums' }}>{s.v}</Mono>
            </div>
          ))}
        </div>

        {/* Inline buy / sell */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: SAM.comment, marginBottom: 4 }}>
            <Mono c={SAM.text} b>AMOUNT $</Mono>
            <Mono c={SAM.comment}>  · ≈ {sharesAtAmt.toFixed(4)} shares</Mono>
          </div>
          <div style={{
            padding: '10px 12px', border: `1px solid ${SAM.border}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 18 }}>$</Mono>
            <input value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="100"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: SAM.text, fontFamily: SAM.font, fontSize: 20, fontWeight: 600,
              }}/>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div onClick={() => trade('buy')} style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              background: SAM.green, color: SAM.bg, fontWeight: 700,
              cursor: amt > 0 ? 'pointer' : 'default', opacity: amt > 0 ? 1 : 0.4,
              fontSize: 14, letterSpacing: 1,
            }}>[ BUY ]</div>
            <div onClick={() => trade('sell')} style={{
              flex: 1, padding: '12px 0', textAlign: 'center',
              background: SAM.red, color: SAM.bg, fontWeight: 700,
              cursor: amt > 0 && owned ? 'pointer' : 'default',
              opacity: amt > 0 && owned ? 1 : 0.4,
              fontSize: 14, letterSpacing: 1,
            }}>[ SELL ]</div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 9, color: SAM.comment, textAlign: 'center' }}>
          {`// simulated price · orders execute against fake market data`}
        </div>
      </div>
    );
  }

  if (sheet.kind === 'add-ticker') {
    const [query, setQuery] = React.useState('');
    const pool = state.tickerPool || [];
    const ownedSyms = new Set(state.holdings.map(h => h.sym));
    const watchedSyms = new Set((state.watchlist || []).map(w => w.sym));

    const q = query.trim().toUpperCase();
    const candidates = pool
      .filter(p => !ownedSyms.has(p.sym) && !watchedSyms.has(p.sym))
      .filter(p => !q
        || p.sym.includes(q)
        || p.name.toUpperCase().includes(q))
      .slice(0, 16);

    const add = (item) => {
      setState(s => ({
        ...s,
        watchlist: [...(s.watchlist || []), { sym: item.sym, name: item.name }],
      }));
      if (window.SamDB) {
        window.SamDB.addWatch({ symbol: item.sym, name: item.name });
        // Pull this symbol's daily bars so its sparkline/detail chart works
        // immediately (initial load only fetches owned + watched symbols).
        if (window.SamDB.getBarsFor) {
          window.SamDB.getBarsFor([item.sym]).then((bars) => {
            if (bars && bars[item.sym]) {
              setState(s => ({ ...s, dailyBars: { ...(s.dailyBars || {}), ...bars } }));
            }
          });
        }
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.comment }}>[cancel]</span>
          <Mono c={SAM.cyan} b>$ ticker --add</Mono>
          <span onClick={onClose} style={{ cursor: 'pointer', color: SAM.green, fontWeight: 600 }}>[done]</span>
        </div>

        {/* Search input */}
        <div style={{
          padding: '10px 12px', border: `1px solid ${SAM.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12,
        }}>
          <Mono c={SAM.yellow} b style={{ fontSize: 14 }}>⌕</Mono>
          <input value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search ticker or name (e.g. AAPL, bitcoin)"
            autoFocus
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: SAM.text, fontFamily: SAM.font, fontSize: 13,
            }}/>
          {query && (
            <span onClick={() => setQuery('')} style={{ cursor: 'pointer', color: SAM.comment, fontSize: 12 }}>
              [clr]
            </span>
          )}
        </div>

        <Comment>{`tap a ticker to add it to your watchlist`}</Comment>

        {/* Candidate list */}
        <div style={{ marginTop: 10, maxHeight: 320, overflowY: 'auto' }}>
          {candidates.length === 0 && (
            <div style={{
              padding: '20px', textAlign: 'center',
              color: SAM.comment, fontSize: 12,
              border: `1px dashed ${SAM.border}`,
            }}>
              // no matches · try a different query
            </div>
          )}
          {candidates.map((c, i) => {
            const seed = symbolSeed(c.sym);
            const sample = makeSeries(seed, 24, 0, 0.08);
            const dir = sample[sample.length - 1] - sample[0];
            const color = dir >= 0 ? SAM.green : SAM.red;
            const min = Math.min(...sample);
            const max = Math.max(...sample);
            const rng = max - min || 1;
            const W = 56, H = 18, pad = 1;
            const linePts = sample.map((v, idx) => {
              const x = pad + idx * ((W - pad * 2) / (sample.length - 1));
              const y = pad + (H - pad * 2) * (1 - (v - min) / rng);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            return (
              <div key={c.sym}
                onClick={() => add(c)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 60px 28px',
                  alignItems: 'center', gap: 8,
                  padding: '10px 10px', cursor: 'pointer',
                  borderBottom: `1px solid ${SAM.border}`,
                  transition: 'background 140ms',
                }}>
                <Mono c={SAM.yellow} b style={{ fontSize: 13 }}>{c.sym}</Mono>
                <Mono c={SAM.comment} style={{ fontSize: 11 }}>{c.name}</Mono>
                <svg width={W} height={H} style={{ display: 'block' }}>
                  <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <Mono c={SAM.green} b style={{ fontSize: 16, textAlign: 'center' }}>+</Mono>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: SAM.comment, textAlign: 'center' }}>
          {`// owned + watched tickers are filtered out automatically`}
        </div>
      </div>
    );
  }

  return null;
}

Object.assign(window, { ExtraSheetContent });

// All screens are loaded — mount the app
const AppRoot = window.App;
ReactDOM.createRoot(document.getElementById('root')).render(<AppRoot/>);
