import React from 'react';
// GOALS › SAVINGS screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function SavingsScreen({ state, setState, openSheet }) {
  const buckets = state.buckets;
  const total = buckets.reduce((a, b) => a + b.balance, 0);
  const rule = state.autoSave;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['goals', 'savings']} active="savings"
        onChange={t => setState(s => ({ ...s, goalsTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Savings" cmd="buckets"/>
        <Comment>{buckets.length} buckets · auto-save {rule.enabled ? 'on' : 'off'} · ${rule.amount}/wk</Comment>

        <div style={{
          marginTop: 14, padding: 14,
          border: `1px solid ${SAM.green}33`,
          background: 'rgba(86,211,100,0.04)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.green}>◉</Mono> total_saved
          </div>
          <div style={{
            fontSize: 28, fontWeight: 700, color: SAM.green, marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ${total.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: SAM.comment, marginTop: 4 }}>
            +${(rule.enabled ? rule.amount * 4 : 0)}/mo on schedule
          </div>
        </div>

        <div style={{
          marginTop: 16, padding: 12,
          border: `1px dashed ${SAM.border}`,
        }}>
          <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
            ▸ auto-save rule
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <Mono c={SAM.comment}>every friday</Mono>
            <span onClick={() => setState(s => ({ ...s, autoSave: { ...s.autoSave, amount: Math.max(5, s.autoSave.amount - 5) } }))}
              style={{ cursor: 'pointer', color: SAM.comment }}>[-]</span>
            <Mono c={SAM.yellow} b style={{ fontSize: 18 }}>${rule.amount}</Mono>
            <span onClick={() => setState(s => ({ ...s, autoSave: { ...s.autoSave, amount: s.autoSave.amount + 5 } }))}
              style={{ cursor: 'pointer', color: SAM.comment }}>[+]</span>
            <span style={{ flex: 1 }}/>
            <span onClick={() => setState(s => ({ ...s, autoSave: { ...s.autoSave, enabled: !s.autoSave.enabled } }))}
              style={{ cursor: 'pointer' }}>
              <Mono c={rule.enabled ? SAM.cyan : SAM.comment} b={rule.enabled}>
                [{rule.enabled ? 'on' : 'off'}]
              </Mono>
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: SAM.comment }}>
            → splits evenly across {buckets.length} buckets
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Buckets
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>[{buckets.length}] ▾</span>
          </div>

          {buckets.map((b) => (
            <div key={b.id}
              onClick={() => openSheet({ kind: 'bucket', bucket: b })}
              style={{
                marginTop: 10, padding: 10, cursor: 'pointer',
                border: `1px solid ${SAM.border}`,
                transition: 'all 140ms',
              }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                <Mono c={b.c} b>{b.icon}</Mono>
                <Mono c={SAM.text} b>{b.name}</Mono>
                <span style={{ flex: 1 }}/>
                <Mono c={b.c} b style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${b.balance.toLocaleString()}
                </Mono>
              </div>
              <div style={{ paddingLeft: 2, marginTop: 6 }}>
                <BarH pct={Math.min(100, b.balance / b.target * 100)} c={b.c}/>
                <div style={{ fontSize: 11, color: SAM.comment, marginTop: 4 }}>
                  target ${b.target.toLocaleString()} · {Math.round(b.balance/b.target*100)}% · apy {b.apy}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ new bucket]</Mono>
        </div>
      </div>
    </div>
  );
}

window.SavingsScreen = SavingsScreen;
