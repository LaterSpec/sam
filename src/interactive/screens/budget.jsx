// EXPENSES › BUDGET screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function BudgetScreen({ state, setState, openSheet }) {
  const byCat = {};
  state.expenses.forEach(e => { byCat[e.catKey] = (byCat[e.catKey] || 0) + e.amount; });

  const budgets = state.budgets;
  const totalCap = budgets.reduce((a, b) => a + b.cap, 0);
  const totalSpent = budgets.reduce((a, b) => a + (byCat[b.key] || 0), 0);

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['expenses', 'income', 'budget']} active="budget"
        onChange={t => setState(s => ({ ...s, expTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Budget" cmd="config --month"/>
        <Comment>{budgets.length} envelopes · ${Math.max(0, totalCap - totalSpent).toLocaleString()} unallocated · rollover: {state.prefs.rollover ? 'on' : 'off'}</Comment>

        <div style={{
          marginTop: 16, padding: 14,
          border: `1px solid ${SAM.border}`,
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>{`// budget · spent · remaining`}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 18 }}>${totalCap.toLocaleString()}</Mono>
            <Mono c={SAM.comment}>·</Mono>
            <Mono c={SAM.red} b style={{ fontSize: 14 }}>${totalSpent.toFixed(0)}</Mono>
            <Mono c={SAM.comment}>·</Mono>
            <Mono c={SAM.green} b style={{ fontSize: 14 }}>${Math.max(0, totalCap - totalSpent).toFixed(0)}</Mono>
          </div>
          <div style={{ marginTop: 10 }}>
            <BlockBar pct={Math.min(100, Math.round(totalSpent/totalCap*100))} width={24} c={SAM.yellow}/>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Envelopes
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{budgets.length}] ▾
            </span>
          </div>
          <Comment>tap to adjust cap</Comment>

          {budgets.map((b, i) => {
            const spent = byCat[b.key] || 0;
            const pct = Math.min(200, Math.round(spent / b.cap * 100));
            const warn = pct > 90;
            const over = pct > 100;
            const left = b.cap - spent;
            return (
              <div key={b.key}
                onClick={() => openSheet({ kind: 'edit-budget', budget: b, spent })}
                style={{
                  marginTop: 10, padding: '10px 12px', cursor: 'pointer',
                  border: `1px solid ${over ? SAM.red : SAM.border}`,
                  background: warn ? 'rgba(248,81,73,0.04)' : 'transparent',
                  transition: 'all 140ms',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <Mono>{b.icon}</Mono>
                  <Mono c={b.c} b>{b.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={over ? SAM.red : (left > 0 ? SAM.green : SAM.yellow)} b>
                    ${Math.abs(left).toFixed(0)}
                  </Mono>
                  <Mono c={SAM.comment}>{over ? 'over' : 'left'}</Mono>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BlockBar pct={Math.min(100, pct)} width={14} c={over ? SAM.red : (warn ? SAM.yellow : b.c)}/>
                  <span style={{ color: SAM.comment }}>
                    ${spent.toFixed(0)} / ${b.cap} · {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13 }}>
          <Mono c={SAM.comment}>├─</Mono>
          <Mono c={SAM.text}>rollover unspent</Mono>
          <span style={{ flex: 1 }}/>
          <span onClick={() => setState(s => ({ ...s, prefs: { ...s.prefs, rollover: !s.prefs.rollover } }))}
            style={{ cursor: 'pointer' }}>
            <Mono c={state.prefs.rollover ? SAM.cyan : SAM.comment} b={state.prefs.rollover}>
              [{state.prefs.rollover ? 'on' : 'off'}]
            </Mono>
          </span>
        </div>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ new envelope]</Mono>
        </div>
      </div>
    </div>
  );
}

window.BudgetScreen = BudgetScreen;
