import React from 'react';
// HOME screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function HomeScreen({ state, setState, openSheet }) {
  const totalIncome = (state.incomeSources || []).reduce((a, s) => a + s.amt, 0);
  const totalExpenses = state.expenses.reduce((a, e) => a + e.amount, 0);
  const balance = (state.accounts || []).reduce((a, x) => a + x.balance, 0);
  const totalCap = (state.budgets || []).reduce((a, b) => a + b.cap, 0) || 1;
  const budgetPct = Math.round((totalExpenses / totalCap) * 100);
  const accountCount = (state.accounts || []).length;
  const net = totalIncome - totalExpenses;
  const money = (n) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`;
  const recent = state.expenses.slice(-3).reverse();

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['home', 'activity', 'cards']} active={state.homeTab}
        onChange={t => setState(s => ({ ...s, homeTab: t }))}/>

      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Sam" cmd="balance"/>
        <Comment>good morning. tracking {accountCount} accounts, {state.expenses.length} tx this week.</Comment>

        <div style={{ marginTop: 18 }}>
          <div style={{ color: SAM.comment, fontSize: 12, marginBottom: 4 }}>
            📅 Sunday, April 19 2026
          </div>
          <div style={{ color: SAM.comment, fontSize: 13 }}>
            <Mono c={net >= 0 ? SAM.green : SAM.red}>{net >= 0 ? '▲' : '▼'}</Mono> net {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString()} · <Mono c={SAM.cyan}>◆</Mono> {state.streak} days streak
          </div>
        </div>

        <div style={{
          marginTop: 16, padding: '14px 14px 16px',
          border: `1px solid ${SAM.border}`,
          background: 'rgba(227,179,65,0.04)',
        }}>
          <div style={{ color: SAM.comment, fontSize: 11, marginBottom: 2 }}>
            <Mono c={SAM.yellow}>$</Mono> total_balance <Mono c={SAM.comment}>--all</Mono>
          </div>
          <div style={{
            fontSize: 30, fontWeight: 700, color: SAM.yellow,
            letterSpacing: -0.5, lineHeight: 1.1, marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${Math.floor(balance).toLocaleString()}<span style={{ color: SAM.comment, fontSize: 22 }}>.{(balance % 1).toFixed(2).slice(2)}</span>
          </div>
          <div style={{ fontSize: 11, color: SAM.green, marginTop: 4 }}>
            +4.2% <span style={{ color: SAM.comment }}>// vs last month</span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ April budget
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{budgetPct}%] ▾
            </span>
          </div>
          <Comment>spent {totalExpenses.toFixed(0)} of {totalCap.toLocaleString()}</Comment>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            <BlockBar pct={budgetPct} width={22} c={budgetPct > 90 ? SAM.red : SAM.yellow}/>
            <span style={{ color: SAM.comment, marginLeft: 8 }}>11 days left</span>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'income', v: `+$${totalIncome.toLocaleString()}`, c: SAM.green },
            { l: 'expenses', v: `-$${totalExpenses.toLocaleString()}`, c: SAM.red },
            { l: 'savings', v: money(net), c: net >= 0 ? SAM.cyan : SAM.red },
            { l: 'pending', v: `${state.pending} tx`, c: SAM.yellow },
          ].map((s, i) => (
            <div key={i} style={{ border: `1px solid ${SAM.border}`, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: SAM.comment }}>{`// ${s.l}`}</div>
              <div style={{ fontSize: 16, color: s.c, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Recent
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{recent.length}] ▾
            </span>
          </div>
          <Comment>tap to view details</Comment>

          {recent.map((r, i) => (
            <div key={r.id}
              onClick={() => openSheet({ kind: 'tx', tx: r })}
              style={{
                marginTop: 10, fontSize: 13, cursor: 'pointer',
                padding: '4px 6px', marginLeft: -6, marginRight: -6,
                borderRadius: 2,
                transition: 'background 140ms',
              }}
              onMouseDown={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseUp={e => e.currentTarget.style.background = 'transparent'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <Mono c={SAM.red} b>[-]</Mono>
                <Mono c={r.catColor}>{r.icon}</Mono>
                <Mono c={SAM.text} b>{r.name}</Mono>
                <span style={{ flex: 1 }}/>
                <Mono c={SAM.red} b>-${r.amount.toFixed(2)}</Mono>
              </div>
              <div style={{ paddingLeft: 26, color: SAM.comment, fontSize: 11 }}>
                {`// ${r.category} · ${r.time}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;
