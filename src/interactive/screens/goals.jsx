// GOALS screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function GoalsScreen({ state, setState, openSheet }) {
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = state.goals.reduce((a, g) => a + g.target, 0);
  const overallPct = Math.round(totalSaved / totalTarget * 100);
  const activeCount = state.goals.filter(g => !g.done).length;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['goals', 'savings']} active={state.goalsTab}
        onChange={t => setState(s => ({ ...s, goalsTab: t }))}/>

      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Goals" cmd="status"/>
        <Comment>{state.goals.length} goals tracked. {state.goals.filter(g=>g.done).length} completed. tap any to contribute.</Comment>

        <div style={{
          marginTop: 14, display: 'flex', gap: 10,
          fontSize: 12, color: SAM.comment,
        }}>
          <span>◎ <Mono c={SAM.text} b>{activeCount}</Mono> active</span>
          <span>◆ <Mono c={SAM.green} b>${totalSaved.toLocaleString()}</Mono> saved</span>
        </div>

        <div style={{
          marginTop: 14, padding: 12,
          border: `1px solid ${SAM.border}`,
        }}>
          <div style={{ fontSize: 11, color: SAM.comment, marginBottom: 4 }}>
            // total progress
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
              ${totalSaved.toLocaleString()}
            </Mono>
            <Mono c={SAM.comment}>of ${totalTarget.toLocaleString()} · {overallPct}%</Mono>
          </div>
          <div style={{ marginTop: 8 }}>
            <BlockBar pct={overallPct} width={24} c={SAM.yellow}/>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ All goals
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{state.goals.length}] ▾
            </span>
          </div>

          {state.goals.map((g, i) => {
            const pct = Math.min(100, Math.round(g.saved / g.target * 100));
            const isActive = state.selectedGoal === g.id;
            return (
              <div key={g.id}
                onClick={() => {
                  setState(s => ({ ...s, selectedGoal: g.id }));
                  openSheet({ kind: 'goal', goal: g });
                }}
                style={{
                  marginTop: 12, padding: 10, cursor: 'pointer',
                  border: `1px solid ${isActive ? SAM.yellow : SAM.border}`,
                  background: isActive ? 'rgba(227,179,65,0.04)' : 'transparent',
                  transition: 'all 180ms',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <Mono c={g.done ? SAM.green : (isActive ? SAM.yellow : SAM.comment)} b>
                    {g.done ? '[✓]' : isActive ? '[▸]' : '[ ]'}
                  </Mono>
                  <Mono c={g.c} b style={{ fontSize: 14 }}>{g.icon}</Mono>
                  <Mono c={SAM.text} b>{g.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={g.done ? SAM.green : SAM.comment}>{pct}%</Mono>
                </div>
                <div style={{ paddingLeft: 26, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: SAM.comment, marginBottom: 4 }}>
                    <Mono c={g.done ? SAM.green : SAM.text}>${g.saved.toLocaleString()}</Mono>
                    <span> / ${g.target.toLocaleString()} · eta </span>
                    <Mono c={g.done ? SAM.green : SAM.text}>{g.eta}</Mono>
                  </div>
                  <BarH pct={pct} c={g.done ? SAM.green : g.c}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: 'new-goal' })} style={{ cursor: 'pointer' }}>
            <Mono c={SAM.green} b>[+ new goal]</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}

window.GoalsScreen = GoalsScreen;
