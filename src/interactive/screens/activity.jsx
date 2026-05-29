// HOME › ACTIVITY screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function ActivityScreen({ state, setState, openSheet }) {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const income = (state.incomeTx || []).map(e => ({
    id: e.id, name: e.name, amount: e.amount, type: 'income',
    icon: e.icon || '⬢', c: SAM.green, tag: 'income', day: e.time, time: '—',
  }));
  const expenses = state.expenses.map(e => ({
    id: e.id, name: e.name, amount: e.amount, type: 'expense',
    icon: e.icon, c: e.catColor, tag: e.category, day: e.time, time: '—',
  }));
  let all = [...income, ...expenses];
  if (filter !== 'all') all = all.filter(r => r.type === filter.slice(0, -1));
  if (query) all = all.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));

  const counts = {
    all: income.length + expenses.length,
    income: income.length,
    expenses: expenses.length,
  };

  const groups = {};
  all.forEach(r => { (groups[r.day] = groups[r.day] || []).push(r); });
  const orderedDays = Object.keys(groups);

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['home', 'activity', 'cards']} active="activity"
        onChange={t => setState(s => ({ ...s, homeTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Activity" cmd="log --all"/>
        <Comment>{counts.all} tx · filter live · tap to view</Comment>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
          {['all', 'income', 'expenses'].map(f => (
            <span key={f} onClick={() => setFilter(f)} style={{ cursor: 'pointer' }}>
              <Mono c={filter === f ? SAM.yellow : SAM.comment} b={filter === f}>
                [{f}]
              </Mono>
              <Mono c={SAM.comment} style={{ fontSize: 10 }}> {counts[f]}</Mono>
            </span>
          ))}
        </div>

        <div style={{
          marginTop: 12, padding: '8px 10px',
          border: `1px solid ${SAM.border}`,
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Mono c={SAM.green}>→</Mono>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="grep tx ..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', color: SAM.text, fontFamily: SAM.font, fontSize: 13,
            }}/>
          {query && (
            <span onClick={() => setQuery('')} style={{ cursor: 'pointer', color: SAM.comment }}>×</span>
          )}
        </div>

        {orderedDays.length === 0 && (
          <div style={{ marginTop: 24, fontSize: 12, color: SAM.comment, textAlign: 'center' }}>
            {`// no matches for "${query}"`}
          </div>
        )}

        {orderedDays.map(day => {
          const rows = groups[day];
          const net = rows.reduce((a, r) => a + (r.type === 'income' ? r.amount : -r.amount), 0);
          return (
            <div key={day} style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, color: SAM.cyan, fontWeight: 600 }}>
                ▸ {day}
                <span style={{ float: 'right', color: net >= 0 ? SAM.green : SAM.comment, fontWeight: 400 }}>
                  {net >= 0 ? '+' : '-'}${Math.abs(net).toFixed(0)}
                </span>
              </div>
              {rows.map(r => (
                <div key={r.id}
                  onClick={() => r.type === 'expense'
                    ? openSheet({ kind: 'tx', tx: state.expenses.find(e => e.id === r.id) })
                    : openSheet({ kind: 'income-src', src: r })
                  }
                  style={{
                    marginTop: 10, fontSize: 13, cursor: 'pointer',
                    padding: '4px 6px', marginLeft: -6, marginRight: -6,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <Mono c={r.type === 'income' ? SAM.green : SAM.red} b>
                      {r.type === 'income' ? '[+]' : '[-]'}
                    </Mono>
                    <Mono c={r.c}>{r.icon}</Mono>
                    <Mono c={SAM.text} b>{r.name}</Mono>
                    <span style={{ flex: 1 }}/>
                    <Mono c={r.type === 'income' ? SAM.green : SAM.red} b>
                      {r.type === 'income' ? '+' : '-'}${r.amount.toFixed(2)}
                    </Mono>
                  </div>
                  <div style={{ paddingLeft: 26, color: SAM.comment, fontSize: 11 }}>
                    {`// ${r.tag}`}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.ActivityScreen = ActivityScreen;
