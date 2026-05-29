// SAM — additional tab screens (activity, cards, income, budget, savings, invest, stats, help)
// Uses SAM palette + primitives declared globally in sam-screens.jsx

// ─────────────────────── HOME → ACTIVITY ───────────────────────

const ActivityScreen = () => {
  const days = [
    {
      date: 'Today · Apr 19',
      total: 20.70,
      items: [
        { t: '[-]', n: 'Starbucks', icon: '☕', c: SAM.orange, tag: 'food', amt: '-6.50', ac: SAM.red, time: '08:12' },
        { t: '[-]', n: 'Apple Music', icon: '⬡', c: SAM.yellow, tag: 'subs', amt: '-14.20', ac: SAM.red, time: '10:04' },
      ],
    },
    {
      date: 'Yesterday · Apr 18',
      total: 3185.80,
      items: [
        { t: '[+]', n: 'Payroll — Acme', icon: '⬢', c: SAM.green, tag: 'salary', amt: '+3,200.00', ac: SAM.green, time: '09:00' },
        { t: '[-]', n: 'Uber', icon: '▶', c: SAM.magenta, tag: 'transport', amt: '-14.20', ac: SAM.red, time: '19:33' },
      ],
    },
    {
      date: 'Apr 17',
      total: 102.40,
      items: [
        { t: '[-]', n: 'Whole Foods', icon: '🛒', c: SAM.orange, tag: 'food', amt: '-87.40', ac: SAM.red, time: '18:21' },
        { t: '[-]', n: 'Chipotle', icon: '🌯', c: SAM.orange, tag: 'food', amt: '-15.00', ac: SAM.red, time: '13:05' },
      ],
    },
  ];
  return (
    <Page active="home">
      <TabBar tabs={['home', 'activity', 'cards']} active="activity"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Activity" cmd="log --all"/>
        <Comment>28 tx this month · last synced 2m ago</Comment>

        {/* filter chips */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6, fontSize: 12, flexWrap: 'wrap' }}>
          <span style={{ color: SAM.yellow, fontWeight: 600 }}>[all]</span>
          <Mono c={SAM.comment}>income</Mono>
          <Mono c={SAM.comment}>expenses</Mono>
          <Mono c={SAM.comment}>transfers</Mono>
          <span style={{ flex: 1 }}/>
          <Mono c={SAM.cyan}>[filter ▾]</Mono>
        </div>

        {/* search */}
        <div style={{
          marginTop: 12, padding: '8px 10px',
          border: `1px solid ${SAM.border}`,
          fontSize: 13, color: SAM.comment,
        }}>
          <Mono c={SAM.green}>→</Mono> grep tx <Mono c={SAM.comment}>_</Mono>
        </div>

        {/* grouped by day */}
        {days.map((day, di) => (
          <div key={di} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
              ▸ {day.date}
              <span style={{ float: 'right', color: SAM.comment, fontWeight: 400 }}>
                {day.total > 1000 ? `net +$${day.total.toFixed(0)}` : `-$${day.total.toFixed(2)}`}
              </span>
            </div>
            {day.items.map((r, i) => (
              <div key={i} style={{ marginTop: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Mono c={r.ac} b>{r.t}</Mono>
                  <Mono c={r.c}>{r.icon}</Mono>
                  <Mono c={SAM.text} b>{r.n}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={r.ac} b>{r.amt}</Mono>
                </div>
                <div style={{ paddingLeft: 26, color: SAM.comment, fontSize: 11 }}>
                  {`// ${r.tag} · ${r.time}`}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12 }}>
          <Mono c={SAM.cyan}>[load more ▾]</Mono>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── HOME → CARDS ───────────────────────

const CardsScreen = () => {
  const cards = [
    {
      name: 'Chase checking', last: '4281', color: SAM.yellow,
      balance: 4210.50, type: 'checking', active: true,
    },
    {
      name: 'Amex Gold', last: '0021', color: SAM.green,
      balance: -680.40, type: 'credit', active: false, limit: 5000,
    },
    {
      name: 'Ally savings', last: '7762', color: SAM.cyan,
      balance: 4890.00, type: 'savings', active: false,
    },
  ];
  return (
    <Page active="home">
      <TabBar tabs={['home', 'activity', 'cards']} active="cards"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Cards" cmd="list --linked"/>
        <Comment>3 accounts synced · plaid · last check 2h ago</Comment>

        {/* card display */}
        <div style={{ marginTop: 16 }}>
          {cards.map((card, i) => (
            <div key={i} style={{
              marginTop: 12,
              border: `1px solid ${card.active ? card.color : SAM.border}`,
              padding: '14px 14px',
              background: card.active ? `${card.color}0d` : 'transparent',
              position: 'relative',
            }}>
              {/* ascii card */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 44, height: 30,
                  border: `1px solid ${card.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: card.color,
                }}>
                  {card.type === 'credit' ? '◈' : card.type === 'savings' ? '◉' : '▣'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: SAM.text }}>
                    {card.name}
                  </div>
                  <div style={{ fontSize: 11, color: SAM.comment, marginTop: 1 }}>
                    ····{card.last} · <Mono c={card.color}>{card.type}</Mono>
                  </div>
                </div>
                {card.active && <Mono c={card.color} b style={{ fontSize: 11 }}>[active]</Mono>}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${SAM.border}` }}>
                <div style={{ fontSize: 10, color: SAM.comment }}>
                  // {card.type === 'credit' ? 'balance owed' : 'available'}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700,
                  color: card.balance < 0 ? SAM.red : card.color,
                  fontVariantNumeric: 'tabular-nums', marginTop: 2,
                }}>
                  {card.balance < 0 ? '-' : ''}${Math.abs(card.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                {card.limit && (
                  <div style={{ fontSize: 10, color: SAM.comment, marginTop: 2 }}>
                    limit ${card.limit.toLocaleString()} · {Math.round(Math.abs(card.balance) / card.limit * 100)}% used
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* actions */}
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ link account]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.cyan}>[transfer]</Mono>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: SAM.comment, lineHeight: 1.6 }}>
          {`// protected by 256-bit TLS · read-only access`}
          <br/>
          {`// powered by plaid · no credentials stored`}
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── EXPENSES → INCOME ───────────────────────

const IncomeScreen = () => {
  const sources = [
    { icon: '⬢', name: 'Acme Corp · salary', amt: 3200, freq: 'monthly', c: SAM.green, next: 'May 1' },
    { icon: '◆', name: 'Freelance · design', amt: 450, freq: 'this month', c: SAM.cyan, next: '—' },
    { icon: '◉', name: 'Dividends · VTI', amt: 28.40, freq: 'quarterly', c: SAM.yellow, next: 'Jun 15' },
  ];
  const total = sources.reduce((a, s) => a + s.amt, 0);
  return (
    <Page active="expenses">
      <TabBar tabs={['expenses', 'income', 'budget']} active="income"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Income" cmd="sources"/>
        <Comment>3 sources · 1 recurring · projected +$3,678 this month</Comment>

        {/* total in */}
        <div style={{
          marginTop: 16, padding: '14px',
          border: `1px solid ${SAM.green}33`,
          background: 'rgba(86,211,100,0.04)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.green}>+</Mono> total_income <Mono c={SAM.comment}>--month</Mono>
          </div>
          <div style={{
            fontSize: 30, fontWeight: 700, color: SAM.green,
            letterSpacing: -0.5, marginTop: 4, fontVariantNumeric: 'tabular-nums',
          }}>
            +${total.toLocaleString()}<span style={{ color: SAM.comment, fontSize: 22 }}>.40</span>
          </div>
          <div style={{ fontSize: 11, color: SAM.comment, marginTop: 4 }}>
            +12.4% <Mono c={SAM.green}>▲</Mono> vs last month
          </div>
        </div>

        {/* spark chart ascii */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
            ▸ last 6 months
          </div>
          {(() => {
            const values = [2850, 2980, 2920, 3100, 3050, 3200];
            const max = Math.max(...values);
            const labels = ['Nov','Dec','Jan','Feb','Mar','Apr'];
            return (
              <div style={{ marginTop: 10 }}>
                {/* bars */}
                <div style={{
                  display: 'flex', gap: 8,
                  alignItems: 'flex-end', height: 72,
                  paddingBottom: 2,
                }}>
                  {values.map((v, i) => {
                    const h = Math.round((v / max) * 64);
                    const active = i === 5;
                    return (
                      <div key={i} style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        justifyContent: 'flex-end', alignItems: 'stretch',
                        height: '100%',
                      }}>
                        <div style={{
                          height: h,
                          background: active ? SAM.green : SAM.textDim,
                          opacity: active ? 1 : 0.3,
                          borderTop: active ? `2px solid ${SAM.green}` : 'none',
                        }}/>
                      </div>
                    );
                  })}
                </div>
                {/* labels row, separate so bars don't overlap */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {labels.map((l, i) => (
                    <div key={i} style={{
                      flex: 1, textAlign: 'center',
                      fontSize: 10, fontWeight: i === 5 ? 600 : 400,
                      color: i === 5 ? SAM.green : SAM.comment,
                    }}>
                      {l}
                    </div>
                  ))}
                </div>
                {/* values row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  {values.map((v, i) => (
                    <div key={i} style={{
                      flex: 1, textAlign: 'center',
                      fontSize: 9, fontVariantNumeric: 'tabular-nums',
                      color: i === 5 ? SAM.text : SAM.comment,
                      opacity: i === 5 ? 1 : 0.6,
                    }}>
                      {(v/1000).toFixed(1)}k
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* sources list */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Sources
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>[3] ▾</span>
          </div>
          {sources.map((s, i) => {
            const isLast = i === sources.length - 1;
            return (
              <div key={i} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                  <Mono c={s.c}>{s.icon}</Mono>
                  <Mono c={SAM.text} b>{s.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={SAM.green} b>+${s.amt.toLocaleString()}</Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: SAM.comment, marginTop: 2 }}>
                  {`// ${s.freq} · next ${s.next}`}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ new source]</Mono>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── EXPENSES → BUDGET ───────────────────────

const BudgetScreen = () => {
  const budgets = [
    { name: 'Food & Drink', icon: '🍔', c: SAM.orange, cap: 600, spent: 420 },
    { name: 'Housing', icon: '🏠', c: SAM.cyan, cap: 900, spent: 850 },
    { name: 'Transport', icon: '▶', c: SAM.magenta, cap: 250, spent: 180 },
    { name: 'Subscriptions', icon: '⬡', c: SAM.yellow, cap: 80, spent: 64 },
    { name: 'Entertainment', icon: '✦', c: SAM.green, cap: 200, spent: 95 },
    { name: 'Misc', icon: '●', c: SAM.textDim, cap: 150, spent: 45 },
  ];
  const totalCap = budgets.reduce((a, b) => a + b.cap, 0);
  const totalSpent = budgets.reduce((a, b) => a + b.spent, 0);

  return (
    <Page active="expenses">
      <TabBar tabs={['expenses', 'income', 'budget']} active="budget"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Budget" cmd="config --month"/>
        <Comment>6 envelopes · ${(totalCap - totalSpent).toLocaleString()} unallocated · rollover: off</Comment>

        {/* summary */}
        <div style={{
          marginTop: 16, padding: '14px',
          border: `1px solid ${SAM.border}`,
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            // budget · spent · remaining
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 18 }}>${totalCap.toLocaleString()}</Mono>
            <Mono c={SAM.comment}>·</Mono>
            <Mono c={SAM.red} b style={{ fontSize: 14 }}>${totalSpent.toLocaleString()}</Mono>
            <Mono c={SAM.comment}>·</Mono>
            <Mono c={SAM.green} b style={{ fontSize: 14 }}>${(totalCap - totalSpent).toLocaleString()}</Mono>
          </div>
          <div style={{ marginTop: 10 }}>
            <BlockBar pct={Math.round(totalSpent/totalCap*100)} width={24} c={SAM.yellow}/>
          </div>
        </div>

        {/* envelopes */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Envelopes
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{budgets.length}] <Mono c={SAM.yellow}>[edit]</Mono>
            </span>
          </div>
          <Comment>tap to adjust cap</Comment>

          {budgets.map((b, i) => {
            const pct = Math.round(b.spent / b.cap * 100);
            const warn = pct > 90;
            const left = b.cap - b.spent;
            return (
              <div key={i} style={{
                marginTop: 10, padding: '8px 10px',
                border: `1px solid ${SAM.border}`,
                background: warn ? 'rgba(248,81,73,0.04)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <Mono>{b.icon}</Mono>
                  <Mono c={b.c} b>{b.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={warn ? SAM.red : SAM.green} b>${left}</Mono>
                  <Mono c={SAM.comment}>left</Mono>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BlockBar pct={pct} width={12} c={warn ? SAM.red : b.c}/>
                  <span style={{ color: SAM.comment }}>
                    ${b.spent} / ${b.cap} · {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ envelope]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.cyan}>[auto-budget]</Mono>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── GOALS → SAVINGS ───────────────────────

const SavingsScreen = () => {
  const buckets = [
    { name: 'Cash reserve', amt: 6400, rate: '4.25% APY', c: SAM.yellow, icon: '●' },
    { name: 'High yield', amt: 4890, rate: '4.80% APY', c: SAM.green, icon: '▣' },
    { name: 'Roundups', amt: 128.40, rate: '· · ·', c: SAM.cyan, icon: '◇' },
  ];
  const total = buckets.reduce((a, b) => a + b.amt, 0);
  return (
    <Page active="goals">
      <TabBar tabs={['goals', 'savings', 'invest']} active="savings"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Savings" cmd="status"/>
        <Comment>auto-save enabled · next transfer Apr 22 ($200)</Comment>

        {/* hero */}
        <div style={{
          marginTop: 16, padding: 14,
          border: `1px solid ${SAM.border}`,
          background: 'rgba(86,211,100,0.04)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.green}>◆</Mono> total_saved
          </div>
          <div style={{
            fontSize: 30, fontWeight: 700, color: SAM.green,
            letterSpacing: -0.5, marginTop: 4, fontVariantNumeric: 'tabular-nums',
          }}>
            ${Math.floor(total).toLocaleString()}<span style={{ color: SAM.comment, fontSize: 22 }}>.40</span>
          </div>
          <div style={{ fontSize: 11, color: SAM.green, marginTop: 4 }}>
            +$840 this month <span style={{ color: SAM.comment }}>// 26% of income</span>
          </div>
        </div>

        {/* auto-save rule card */}
        <div style={{
          marginTop: 14, padding: 12,
          border: `1px dashed ${SAM.cyan}55`,
        }}>
          <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
            ⚙ auto-save rule
          </div>
          <div style={{ fontSize: 12, color: SAM.text, marginTop: 4, lineHeight: 1.5 }}>
            <Mono c={SAM.comment}>if </Mono>
            <Mono c={SAM.yellow}>payroll.received</Mono>
            <Mono c={SAM.comment}> → transfer </Mono>
            <Mono c={SAM.green} b>$200</Mono>
            <Mono c={SAM.comment}> to </Mono>
            <Mono c={SAM.cyan}>high_yield</Mono>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.green}>[on]</Mono> off · since Jan 2026
          </div>
        </div>

        {/* buckets */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Buckets
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>[3] ▾</span>
          </div>
          {buckets.map((b, i) => {
            const pct = Math.round(b.amt / total * 100);
            const isLast = i === buckets.length - 1;
            return (
              <div key={i} style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                  <Mono c={b.c}>{b.icon}</Mono>
                  <Mono c={SAM.text} b>{b.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={b.c} b style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ${b.amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: SAM.comment, marginTop: 2 }}>
                  {`// ${b.rate} · ${pct}% of total`}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ transfer]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.cyan}>[new bucket]</Mono>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── GOALS → INVEST ───────────────────────

const InvestScreen = () => {
  const holdings = [
    { sym: 'VTI', name: 'Total Market', qty: 12.4, price: 284.20, pct: 1.8, c: SAM.green },
    { sym: 'VXUS', name: 'Intl ex-US', qty: 8.0, price: 64.10, pct: -0.4, c: SAM.red },
    { sym: 'BND', name: 'Total Bond', qty: 15.2, price: 72.90, pct: 0.2, c: SAM.green },
    { sym: 'BTC', name: 'Bitcoin', qty: 0.08, price: 62400, pct: 3.6, c: SAM.green },
  ];
  const value = holdings.reduce((a, h) => a + h.qty * h.price, 0);
  return (
    <Page active="goals">
      <TabBar tabs={['goals', 'savings', 'invest']} active="invest"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Invest" cmd="portfolio"/>
        <Comment>4 holdings · risk: moderate · rebalance due in 18d</Comment>

        {/* value */}
        <div style={{
          marginTop: 16, padding: 14,
          border: `1px solid ${SAM.border}`,
          background: 'rgba(88,166,255,0.04)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.cyan}>◇</Mono> portfolio_value
          </div>
          <div style={{
            fontSize: 30, fontWeight: 700, color: SAM.cyan,
            letterSpacing: -0.5, marginTop: 4, fontVariantNumeric: 'tabular-nums',
          }}>
            ${Math.floor(value).toLocaleString()}<span style={{ color: SAM.comment, fontSize: 22 }}>.{String(Math.round((value%1)*100)).padStart(2,'0')}</span>
          </div>
          <div style={{ fontSize: 11, color: SAM.green, marginTop: 4 }}>
            +$124.80 today <Mono c={SAM.green}>▲ 1.4%</Mono>
          </div>
        </div>

        {/* ascii chart */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
            ▸ 30d performance
          </div>
          <pre style={{
            fontFamily: SAM.font, fontSize: 10, color: SAM.green,
            lineHeight: 1.2, margin: '8px 0 0',
            overflow: 'hidden',
          }}>{`  $9.0k┤                                    ╭─
       │                               ╭───╯
  $8.8k┤                           ╭───╯
       │                     ╭─────╯
  $8.6k┤           ╭────╮ ╭──╯
       │   ╭───────╯    ╰─╯
  $8.4k┤───╯
       └───────────────────────────────────
         Mar 20      Apr 3       Apr 19`}</pre>
        </div>

        {/* holdings */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Holdings
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>[4] ▾</span>
          </div>
          {holdings.map((h, i) => {
            const val = h.qty * h.price;
            const up = h.pct > 0;
            const isLast = i === holdings.length - 1;
            return (
              <div key={i} style={{ marginTop: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                  <Mono c={SAM.yellow} b>{h.sym}</Mono>
                  <Mono c={SAM.comment}>{h.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={up ? SAM.green : SAM.red} b>
                    {up ? '▲' : '▼'} {Math.abs(h.pct).toFixed(1)}%
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: SAM.comment, marginTop: 2 }}>
                  {h.qty} shares @ ${h.price.toLocaleString()} · <Mono c={SAM.text}>${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Mono>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ buy]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.red}>[sell]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.cyan}>[rebalance]</Mono>
        </div>

        <div style={{ marginTop: 14, fontSize: 10, color: SAM.comment }}>
          {`// data delayed 15m · not financial advice`}
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── PROFILE → STATS ───────────────────────

const StatsScreen = () => {
  const months = [
    { m: 'Nov', saved: 520, w: 40 },
    { m: 'Dec', saved: 340, w: 26 },
    { m: 'Jan', saved: 860, w: 66 },
    { m: 'Feb', saved: 920, w: 70 },
    { m: 'Mar', saved: 1100, w: 85 },
    { m: 'Apr', saved: 1340, w: 100 },
  ];
  const catSplit = [
    { n: 'Food', pct: 23, c: SAM.orange },
    { n: 'Housing', pct: 46, c: SAM.cyan },
    { n: 'Transport', pct: 10, c: SAM.magenta },
    { n: 'Subs', pct: 3, c: SAM.yellow },
    { n: 'Ent.', pct: 5, c: SAM.green },
    { n: 'Other', pct: 13, c: SAM.textDim },
  ];
  return (
    <Page active="profile">
      <TabBar tabs={['profile', 'stats', 'help']} active="stats"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Stats" cmd="report --ytd"/>
        <Comment>you've saved 18% more than last quarter. trending up.</Comment>

        {/* highlight grid */}
        <div style={{
          marginTop: 16, display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          {[
            { v: '$5,080', l: 'saved ytd', c: SAM.green },
            { v: '$7,440', l: 'spent ytd', c: SAM.red },
            { v: '32%', l: 'save rate', c: SAM.yellow },
            { v: '17d', l: 'best streak', c: SAM.cyan },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              border: `1px solid ${SAM.border}`,
            }}>
              <div style={{ fontSize: 10, color: SAM.comment }}>{`// ${s.l}`}</div>
              <div style={{
                fontSize: 20, fontWeight: 700, color: s.c,
                fontVariantNumeric: 'tabular-nums', marginTop: 2,
              }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* savings trend */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Savings trend
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>last 6m ▾</span>
          </div>
          <Comment>monthly net to savings</Comment>
          {(() => {
            const max = Math.max(...months.map(m => m.saved));
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{
                  display: 'flex', gap: 8,
                  alignItems: 'flex-end', height: 80,
                }}>
                  {months.map((m, i) => {
                    const h = Math.round((m.saved / max) * 72);
                    const active = i === months.length - 1;
                    return (
                      <div key={i} style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        justifyContent: 'flex-end',
                      }}>
                        <div style={{
                          height: h,
                          background: active ? SAM.green : SAM.textDim,
                          opacity: active ? 1 : 0.3,
                          borderTop: active ? `2px solid ${SAM.green}` : 'none',
                        }}/>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {months.map((m, i) => (
                    <div key={i} style={{
                      flex: 1, textAlign: 'center',
                      fontSize: 10, fontWeight: i === 5 ? 600 : 400,
                      color: i === 5 ? SAM.green : SAM.comment,
                    }}>{m.m}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  {months.map((m, i) => (
                    <div key={i} style={{
                      flex: 1, textAlign: 'center',
                      fontSize: 9, fontVariantNumeric: 'tabular-nums',
                      color: i === 5 ? SAM.text : SAM.comment,
                      opacity: i === 5 ? 1 : 0.6,
                    }}>
                      ${m.saved >= 1000 ? `${(m.saved/1000).toFixed(1)}k` : m.saved}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* category split */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Where it went
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>Apr ▾</span>
          </div>
          {/* single bar stacked */}
          <div style={{
            marginTop: 10, display: 'flex', height: 12,
            border: `1px solid ${SAM.border}`,
          }}>
            {catSplit.map((c, i) => (
              <div key={i} style={{ width: `${c.pct}%`, background: c.c, opacity: 0.85 }}/>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            {catSplit.map((c, i) => {
              const isLast = i === catSplit.length - 1;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, marginTop: 4 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                  <div style={{ width: 8, height: 8, background: c.c, marginRight: 2 }}/>
                  <Mono c={SAM.text}>{c.n}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={SAM.comment}>{c.pct}%</Mono>
                </div>
              );
            })}
          </div>
        </div>

        {/* streak calendar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Activity · April
          </div>
          <div style={{
            marginTop: 10, display: 'grid',
            gridTemplateColumns: 'repeat(14, 1fr)', gap: 3,
          }}>
            {Array.from({length: 28}).map((_, i) => {
              const intensity = [0,0,1,2,1,0,3,2,3,0,1,2,3,2,0,1,3,3,2,0,1,3,2,2,3,3,2,3][i] || 0;
              const colors = ['rgba(255,255,255,0.05)', 'rgba(86,211,100,0.25)', 'rgba(86,211,100,0.55)', SAM.green];
              return (
                <div key={i} style={{
                  aspectRatio: '1', background: colors[intensity],
                }}/>
              );
            })}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: SAM.comment, display: 'flex', alignItems: 'center', gap: 4 }}>
            less
            <div style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.05)' }}/>
            <div style={{ width: 8, height: 8, background: 'rgba(86,211,100,0.25)' }}/>
            <div style={{ width: 8, height: 8, background: 'rgba(86,211,100,0.55)' }}/>
            <div style={{ width: 8, height: 8, background: SAM.green }}/>
            more
          </div>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────────── PROFILE → HELP ───────────────────────

const HelpScreen = () => {
  const faqs = [
    { q: 'How does SAM sync my accounts?', c: SAM.yellow },
    { q: 'Is my data encrypted?', c: SAM.green },
    { q: 'Can I install SAM without an app store?', c: SAM.cyan },
    { q: 'How do I export my data?', c: SAM.magenta },
    { q: 'What do the [pro] features include?', c: SAM.orange },
  ];
  const cmds = [
    { k: ':balance', d: 'show total across accounts' },
    { k: ':expense <amt>', d: 'quick add expense' },
    { k: ':goal <name>', d: 'create a new goal' },
    { k: ':sync', d: 'force refresh all feeds' },
    { k: ':export csv', d: 'download transactions' },
  ];
  return (
    <Page active="profile">
      <TabBar tabs={['profile', 'stats', 'help']} active="help"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Help" cmd="man sam"/>
        <Comment>type a command or tap a topic. avg response &lt; 4h.</Comment>

        {/* search */}
        <div style={{
          marginTop: 14, padding: '10px 12px',
          border: `1px solid ${SAM.border}`,
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Mono c={SAM.green}>→</Mono>
          <Mono c={SAM.comment}>grep 'how to...'</Mono>
          <span style={{
            width: 8, height: 14, background: SAM.yellow,
            display: 'inline-block',
            animation: 'blink 1s infinite',
          }}/>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ FAQ
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{faqs.length}] ▾
            </span>
          </div>
          {faqs.map((f, i) => {
            const isLast = i === faqs.length - 1;
            return (
              <div key={i} style={{
                marginTop: 10, fontSize: 13,
                display: 'flex', alignItems: 'baseline', gap: 6,
              }}>
                <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                <Mono c={f.c}>?</Mono>
                <Mono c={SAM.text}>{f.q}</Mono>
                <span style={{ flex: 1 }}/>
                <Mono c={SAM.comment}>→</Mono>
              </div>
            );
          })}
        </div>

        {/* commands reference */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Quick commands
          </div>
          <Comment>shortcuts for power users</Comment>
          <div style={{
            marginTop: 8, padding: 10,
            border: `1px solid ${SAM.border}`,
            background: 'rgba(255,255,255,0.02)',
          }}>
            {cmds.map((c, i) => (
              <div key={i} style={{ fontSize: 12, marginTop: i === 0 ? 0 : 6, display: 'flex', gap: 10 }}>
                <Mono c={SAM.yellow} b style={{ minWidth: 110 }}>{c.k}</Mono>
                <Mono c={SAM.comment}>{c.d}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* contact */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Contact
          </div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', marginTop: 4 }}>
              <Mono c={SAM.comment}>├─ </Mono>
              <Mono>chat with support</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.cyan}>[open]</Mono>
            </div>
            <div style={{ display: 'flex', marginTop: 4 }}>
              <Mono c={SAM.comment}>├─ </Mono>
              <Mono>email</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.comment}>help@sam.app</Mono>
            </div>
            <div style={{ display: 'flex', marginTop: 4 }}>
              <Mono c={SAM.comment}>└─ </Mono>
              <Mono>status page</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.green}>● all systems ok</Mono>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: SAM.comment, textAlign: 'center' }}>
          sam v1.0.0 · docs at sam.app/docs
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </Page>
  );
};

Object.assign(window, {
  ActivityScreen, CardsScreen,
  IncomeScreen, BudgetScreen,
  SavingsScreen, InvestScreen,
  StatsScreen, HelpScreen,
});

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
