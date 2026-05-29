// PROFILE › HELP screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function HelpScreen({ state, setState }) {
  const [query, setQuery] = React.useState('');
  const [openFaq, setOpenFaq] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const copyEmail = () => {
    const email = 'hello@sam.app';
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(done);
    } else { done(); }
  };

  const faqs = [
    { q: 'Where is my data stored?', c: SAM.yellow,
      a: 'Everything lives in your own local Supabase instance — accounts, transactions, goals and budgets stay on your machine. Nothing is sent to a third party.' },
    { q: 'Is my data private?', c: SAM.green,
      a: 'Yes. Row-level security ties every record to your user id, so only your authenticated session can read or write your data.' },
    { q: 'How do I add accounts and expenses?', c: SAM.cyan,
      a: 'Cards → [+ account] to add a cash or card balance. Expenses → [+ new expense] to log spending against a category.' },
    { q: 'How do I export my data?', c: SAM.magenta,
      a: 'Profile → settings is for theming; Profile → data → export csv downloads all your transactions as a CSV file.' },
    { q: 'How do I reset or delete my account?', c: SAM.orange,
      a: 'Profile → danger → delete account wipes your user and all owned rows. This cannot be undone.' },
  ];

  const filtered = query
    ? faqs.filter(f => f.q.toLowerCase().includes(query.toLowerCase()) || f.a.toLowerCase().includes(query.toLowerCase()))
    : faqs;

  const cmds = [
    { k: ':balance', d: 'show total across accounts' },
    { k: ':expense <amt>', d: 'quick add expense' },
    { k: ':goal <name>', d: 'create a new goal' },
    { k: ':sync', d: 'force refresh all feeds' },
    { k: ':export csv', d: 'download transactions' },
  ];

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['profile', 'stats', 'help', 'settings']} active="help"
        onChange={t => setState(s => ({ ...s, profileTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Help" cmd="man sam"/>
        <Comment>type to search · avg response &lt; 4h</Comment>

        <div style={{
          marginTop: 14, padding: '10px 12px',
          border: `1px solid ${SAM.border}`,
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Mono c={SAM.green}>→</Mono>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="grep 'how to...'"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', color: SAM.text, fontFamily: SAM.font, fontSize: 13,
            }}/>
          {query && (
            <span onClick={() => setQuery('')} style={{ cursor: 'pointer', color: SAM.comment }}>×</span>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ FAQ
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{filtered.length}] ▾
            </span>
          </div>
          {filtered.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: SAM.comment, textAlign: 'center' }}>
              {`// no results for "${query}"`}
            </div>
          )}
          {filtered.map((f, i) => {
            const isOpen = openFaq === i;
            const isLast = i === filtered.length - 1;
            return (
              <div key={i}
                onClick={() => setOpenFaq(isOpen ? null : i)}
                style={{
                  marginTop: 10, fontSize: 13, cursor: 'pointer',
                  padding: '4px 0',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─' : '├─'}</Mono>
                  <Mono c={f.c}>?</Mono>
                  <Mono c={SAM.text}>{f.q}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={SAM.comment}>{isOpen ? '▾' : '▸'}</Mono>
                </div>
                {isOpen && (
                  <div style={{
                    marginTop: 6, marginLeft: 26, padding: '8px 10px',
                    fontSize: 12, color: SAM.textDim, lineHeight: 1.5,
                    border: `1px solid ${SAM.border}`,
                    background: SAM.overlay,
                  }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Quick commands
          </div>
          <Comment>shortcuts for power users</Comment>
          <div style={{
            marginTop: 8, padding: 10,
            border: `1px solid ${SAM.border}`,
            background: SAM.overlay,
          }}>
            {cmds.map((c, i) => (
              <div key={i} style={{ fontSize: 12, marginTop: i === 0 ? 0 : 6, display: 'flex', gap: 10 }}>
                <Mono c={SAM.yellow} b style={{ minWidth: 110 }}>{c.k}</Mono>
                <Mono c={SAM.comment}>{c.d}</Mono>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>▸ Contact</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', marginTop: 4 }}>
              <Mono c={SAM.comment}>├─ </Mono>
              <Mono>chat with support</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.cyan}>[open]</Mono>
            </div>
            <div onClick={copyEmail} style={{ display: 'flex', marginTop: 4, cursor: 'pointer' }}>
              <Mono c={SAM.comment}>└─ </Mono>
              <Mono>email hello@sam.app</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={copied ? SAM.green : SAM.cyan}>{copied ? '[copied ✓]' : '[copy]'}</Mono>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HelpScreen = HelpScreen;
