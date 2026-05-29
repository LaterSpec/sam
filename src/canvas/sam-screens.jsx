// SAM — Financial terminal screens
// Monospace terminal aesthetic, dark theme

const SAM = {
  bg: '#0a0e14',
  bgAlt: '#0d1117',
  panel: 'rgba(255,255,255,0.02)',
  border: 'rgba(240,246,252,0.08)',
  text: '#c9d1d9',
  textDim: '#8b949e',
  comment: '#6e7681',
  yellow: '#e3b341',
  cyan: '#58a6ff',
  green: '#56d364',
  red: '#f85149',
  magenta: '#bc8cff',
  orange: '#e8824a',
  font: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
};

// ───────────────────────── Primitives ─────────────────────────

const Mono = ({ children, c, b, style }) => (
  <span style={{ color: c || SAM.text, fontWeight: b ? 600 : 400, ...style }}>{children}</span>
);

const Comment = ({ children }) => (
  <div style={{ color: SAM.comment, fontSize: 12, lineHeight: 1.5 }}>{`// ${children}`}</div>
);

const Prompt = ({ user = 'sam', host = 'init.Finance', cmd, children }) => (
  <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6, wordBreak: 'break-word' }}>
    <Mono c={SAM.text} b>{user}</Mono>
    <Mono c={SAM.comment}>[pro]</Mono>
    <Mono c={SAM.text} b>@{host}</Mono>
    <Mono c={SAM.yellow} b> $ </Mono>
    <Mono c={SAM.cyan} b>{cmd}</Mono>
    {children}
  </div>
);

const Bracket = ({ children, active, c = SAM.textDim }) => (
  <span style={{
    color: active ? SAM.yellow : c,
    fontWeight: active ? 600 : 400,
  }}>[{children}]</span>
);

// Top tab bar
const TabBar = ({ tabs, active }) => (
  <div style={{
    display: 'flex', fontSize: 15,
    borderBottom: `1px solid ${SAM.border}`,
    padding: '0 0 12px',
    gap: 0,
  }}>
    {tabs.map((t, i) => {
      const isActive = t === active;
      return (
        <div key={t} style={{
          flex: 1, textAlign: 'center',
          color: isActive ? SAM.yellow : SAM.comment,
          fontWeight: isActive ? 600 : 400,
          position: 'relative',
          paddingBottom: 4,
        }}>
          {t}
          {isActive && (
            <div style={{
              position: 'absolute', bottom: -12, left: '20%', right: '20%',
              height: 2, background: SAM.yellow,
            }}/>
          )}
        </div>
      );
    })}
  </div>
);

// Bottom nav (tabbar at bottom)
const BottomNav = ({ active }) => {
  const items = [
    { k: 'home', label: 'home', icon: '⌂' },
    { k: 'expenses', label: 'expenses', icon: '$' },
    { k: 'goals', label: 'goals', icon: '◎' },
    { k: 'profile', label: 'profile', icon: '@' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: SAM.bg,
      borderTop: `1px solid ${SAM.border}`,
      padding: '10px 0 30px',
      display: 'flex',
      fontFamily: SAM.font,
      zIndex: 40,
    }}>
      {items.map(it => {
        const isActive = it.k === active;
        return (
          <div key={it.k} style={{
            flex: 1, textAlign: 'center',
            color: isActive ? SAM.yellow : SAM.comment,
          }}>
            <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 3, fontWeight: isActive ? 600 : 400 }}>{it.icon}</div>
            <div style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>
              {isActive ? `[${it.label}]` : it.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Page wrapper
const Page = ({ children, active, pad = 16 }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: SAM.bg,
    color: SAM.text,
    fontFamily: SAM.font,
    fontSize: 13,
    lineHeight: 1.55,
    display: 'flex', flexDirection: 'column',
    paddingTop: 54, // below dynamic island
  }}>
    <div style={{ flex: 1, overflow: 'hidden', padding: `16px ${pad}px 100px` }}>
      {children}
    </div>
    <BottomNav active={active} />
  </div>
);

// Horizontal bar
const BarH = ({ pct, c = SAM.yellow, w = '100%' }) => (
  <div style={{
    width: w, height: 6, background: 'rgba(255,255,255,0.06)',
    borderRadius: 1, overflow: 'hidden',
  }}>
    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: c }}/>
  </div>
);

// ASCII block progress bar inline
const BlockBar = ({ pct, width = 10, c = SAM.green }) => {
  const filled = Math.round((pct / 100) * width);
  return (
    <span style={{ color: c, letterSpacing: -1 }}>
      {'█'.repeat(filled)}
      <span style={{ color: SAM.border }}>{'░'.repeat(width - filled)}</span>
    </span>
  );
};

// ─────────────────── 1. HOME / DASHBOARD ───────────────────

const HomeScreen = () => (
  <Page active="home">
    <TabBar tabs={['home', 'activity', 'cards']} active="home"/>
    <div style={{ marginTop: 20 }}>
      <Prompt user="alex" host="init.Sam" cmd="balance"/>
      <Comment>good morning. tracking 3 accounts, 28 tx this week.</Comment>

      <div style={{ marginTop: 18 }}>
        <div style={{ color: SAM.comment, fontSize: 12, marginBottom: 4 }}>
          📅 Sunday, April 19 2026
        </div>
        <div style={{ color: SAM.comment, fontSize: 13 }}>
          <Mono c={SAM.green}>▲</Mono> net +$1,240 · <Mono c={SAM.cyan}>◆</Mono> 17 days streak
        </div>
      </div>

      {/* Balance hero */}
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
        }}>
          $8,420<span style={{ color: SAM.comment, fontSize: 22 }}>.50</span>
        </div>
        <div style={{ fontSize: 11, color: SAM.green, marginTop: 4 }}>
          +4.2% <span style={{ color: SAM.comment }}>// vs last month</span>
        </div>
      </div>

      {/* Month budget */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
          ▸ April budget
          <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
            [62%] ▾
          </span>
        </div>
        <Comment>spent 1,860 of 3,000</Comment>
        <div style={{ marginTop: 6, fontSize: 12, fontFamily: SAM.font }}>
          <BlockBar pct={62} width={22} c={SAM.yellow}/>
          <span style={{ color: SAM.comment, marginLeft: 8 }}>11 days left</span>
        </div>
      </div>

      {/* Quick stats grid */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ border: `1px solid ${SAM.border}`, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: SAM.comment }}>// income</div>
          <div style={{ fontSize: 16, color: SAM.green, fontWeight: 600 }}>+$3,200</div>
        </div>
        <div style={{ border: `1px solid ${SAM.border}`, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: SAM.comment }}>// expenses</div>
          <div style={{ fontSize: 16, color: SAM.red, fontWeight: 600 }}>-$1,860</div>
        </div>
        <div style={{ border: `1px solid ${SAM.border}`, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: SAM.comment }}>// savings</div>
          <div style={{ fontSize: 16, color: SAM.cyan, fontWeight: 600 }}>$1,340</div>
        </div>
        <div style={{ border: `1px solid ${SAM.border}`, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: SAM.comment }}>// pending</div>
          <div style={{ fontSize: 16, color: SAM.yellow, fontWeight: 600 }}>3 tx</div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
          ▸ Recent
          <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
            [5] ▾
          </span>
        </div>
        <Comment>last 24h</Comment>

        {[
          { t: '[-]', n: 'Starbucks', c: SAM.orange, icon: '☕', tag: 'food', amt: '-6.50', ac: SAM.red, time: '08:12' },
          { t: '[+]', n: 'Payroll — Acme', c: SAM.green, icon: '⬢', tag: 'salary', amt: '+3,200.00', ac: SAM.green, time: 'yest' },
          { t: '[-]', n: 'Uber', c: SAM.cyan, icon: '▶', tag: 'transport', amt: '-14.20', ac: SAM.red, time: 'yest' },
        ].map((r, i) => (
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
    </div>
  </Page>
);

// ─────────────────── 2. EXPENSES ───────────────────

const ExpensesScreen = () => {
  const days = [
    { d: 'Mon', n: 13, active: false, pct: 30 },
    { d: 'Tue', n: 14, active: false, pct: 70 },
    { d: 'Wed', n: 15, active: false, pct: 45 },
    { d: 'Thu', n: 16, active: false, pct: 90 },
    { d: 'Fri', n: 17, active: false, pct: 60 },
    { d: 'Sat', n: 18, active: false, pct: 20 },
    { d: 'Sun', n: 19, active: true, pct: 55 },
  ];
  const cats = [
    { icon: '🍔', name: 'Food & Drink', spent: 420, budget: 600, c: SAM.orange, tx: 12 },
    { icon: '🏠', name: 'Housing', spent: 850, budget: 900, c: SAM.cyan, tx: 2 },
    { icon: '▶', name: 'Transport', spent: 180, budget: 250, c: SAM.magenta, tx: 8 },
    { icon: '⬡', name: 'Subscriptions', spent: 64, budget: 80, c: SAM.yellow, tx: 5 },
    { icon: '✦', name: 'Entertainment', spent: 95, budget: 200, c: SAM.green, tx: 3 },
  ];
  return (
    <Page active="expenses">
      <TabBar tabs={['expenses', 'income', 'budget']} active="expenses"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Expenses" cmd="list --month"/>
        <Comment>1,860 logged across 28 tx. on pace.</Comment>

        <div style={{ marginTop: 12, color: SAM.comment, fontSize: 12 }}>
          📊 April 2026
        </div>
        <div style={{ fontSize: 13, marginTop: 2 }}>
          <Mono c={SAM.red} b>-$1,860</Mono>
          <Mono c={SAM.comment}> of </Mono>
          <Mono c={SAM.yellow}>$3,000</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.green}>$1,140 left</Mono>
        </div>

        {/* Week strip */}
        <div style={{
          marginTop: 16, display: 'flex', gap: 4,
          alignItems: 'flex-end', fontSize: 11,
        }}>
          <div style={{ color: SAM.comment, alignSelf: 'center', paddingRight: 2 }}>◂</div>
          {days.map((d, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              padding: '4px 0',
              background: d.active ? 'rgba(227,179,65,0.15)' : 'transparent',
              border: d.active ? `1px solid ${SAM.yellow}` : '1px solid transparent',
            }}>
              <div style={{ color: d.active ? SAM.yellow : SAM.comment, fontWeight: d.active ? 600 : 400 }}>
                {d.d}
              </div>
              <div style={{
                color: d.active ? SAM.yellow : SAM.text,
                fontWeight: 600, fontSize: 12, marginTop: 1,
              }}>
                {d.active ? `*${d.n}` : d.n}
              </div>
              <div style={{
                height: 20, width: 4, margin: '4px auto 0',
                background: 'rgba(255,255,255,0.04)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${d.pct}%`,
                  background: d.active ? SAM.yellow : SAM.textDim,
                }}/>
              </div>
            </div>
          ))}
          <div style={{ color: SAM.comment, alignSelf: 'center', paddingLeft: 2 }}>▸</div>
        </div>

        {/* Categories tree */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Categories
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [5/9] ▾
            </span>
          </div>
          <Comment>by spend, descending</Comment>

          {cats.map((cat, i) => {
            const pct = Math.round(cat.spent / cat.budget * 100);
            const over = pct > 90;
            return (
              <div key={i} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <span>├─</span>
                  <Mono>{cat.icon}</Mono>
                  <Mono c={cat.c} b>{cat.name}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={over ? SAM.red : SAM.text} b>${cat.spent}</Mono>
                  <Mono c={SAM.comment}>/{cat.budget}</Mono>
                </div>
                <div style={{ paddingLeft: 22, marginTop: 3, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BlockBar pct={pct} width={16} c={over ? SAM.red : cat.c}/>
                  <span style={{ color: SAM.comment }}>{pct}% · {cat.tx} tx</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add button */}
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ new expense]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.cyan}>[import]</Mono>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────── 3. GOALS ───────────────────

const GoalsScreen = () => {
  const goals = [
    { name: 'Emergency fund', target: 10000, saved: 6400, eta: 'Sep 2026', icon: '🛡', c: SAM.yellow, active: true },
    { name: 'Trip to Japan', target: 4500, saved: 1230, eta: 'Mar 2027', icon: '✈', c: SAM.cyan, active: false },
    { name: 'New MacBook', target: 2400, saved: 2400, eta: 'done', icon: '◼', c: SAM.green, active: false, done: true },
    { name: 'House down payment', target: 30000, saved: 4100, eta: '2028', icon: '⌂', c: SAM.magenta, active: false },
  ];
  return (
    <Page active="goals">
      <TabBar tabs={['goals', 'savings', 'invest']} active="goals"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Goals" cmd="status"/>
        <Comment>4 goals tracked. 1 completed this month. nice.</Comment>

        <div style={{
          marginTop: 14, display: 'flex', gap: 10,
          fontSize: 12, color: SAM.comment,
        }}>
          <span>◎ <Mono c={SAM.text} b>4</Mono> active</span>
          <span>◆ <Mono c={SAM.green} b>$14,130</Mono> saved</span>
        </div>

        {/* Overall progress */}
        <div style={{
          marginTop: 14, padding: 12,
          border: `1px solid ${SAM.border}`,
        }}>
          <div style={{ fontSize: 11, color: SAM.comment, marginBottom: 4 }}>
            // total progress
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <Mono c={SAM.yellow} b style={{ fontSize: 22 }}>$14,130</Mono>
            <Mono c={SAM.comment}>of $46,900 · 30%</Mono>
          </div>
          <div style={{ marginTop: 8 }}>
            <BlockBar pct={30} width={24} c={SAM.yellow}/>
          </div>
        </div>

        {/* Goals list */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ All goals
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [4] ▾
            </span>
          </div>

          {goals.map((g, i) => {
            const pct = Math.min(100, Math.round(g.saved / g.target * 100));
            return (
              <div key={i} style={{
                marginTop: 12, padding: 10,
                border: `1px solid ${g.active ? SAM.yellow : SAM.border}`,
                background: g.active ? 'rgba(227,179,65,0.04)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                  <Mono c={g.active ? SAM.yellow : SAM.green} b>
                    {g.done ? '[✓]' : g.active ? '[▸]' : '[ ]'}
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
          <Mono c={SAM.green} b>[+ new goal]</Mono>
        </div>
      </div>
    </Page>
  );
};

// ─────────────────── 4. PROFILE ───────────────────

const ProfileScreen = () => {
  const sections = [
    {
      title: 'account',
      icon: '◉',
      c: SAM.yellow,
      items: [
        { k: 'email', v: 'alex@sam.app' },
        { k: 'plan', v: 'pro' },
        { k: 'member since', v: 'Jan 2026' },
      ],
    },
    {
      title: 'preferences',
      icon: '⚙',
      c: SAM.cyan,
      items: [
        { k: 'currency', v: 'USD $', tweak: true },
        { k: 'theme', v: '[dark] light', tweak: true },
        { k: 'notifications', v: '[on] off', tweak: true },
        { k: 'biometric lock', v: '[on] off', tweak: true },
      ],
    },
    {
      title: 'data',
      icon: '⬢',
      c: SAM.green,
      items: [
        { k: 'export csv', v: '→', tweak: true },
        { k: 'sync accounts', v: '3 linked' },
        { k: 'backup', v: '2h ago' },
      ],
    },
    {
      title: 'danger',
      icon: '⚠',
      c: SAM.red,
      items: [
        { k: 'sign out', v: '→', tweak: true },
        { k: 'delete account', v: '→', tweak: true, danger: true },
      ],
    },
  ];

  return (
    <Page active="profile">
      <TabBar tabs={['profile', 'stats', 'help']} active="profile"/>
      <div style={{ marginTop: 20 }}>
        <Prompt user="alex" host="init.Profile" cmd="whoami"/>
        <Comment>member of the 0.3% who budget weekly. keep going.</Comment>

        {/* Identity card */}
        <div style={{
          marginTop: 16, padding: '12px 14px',
          border: `1px solid ${SAM.border}`,
          display: 'flex', gap: 14, alignItems: 'center',
        }}>
          <div style={{
            width: 54, height: 54,
            background: `linear-gradient(135deg, ${SAM.yellow}, ${SAM.orange})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: SAM.bg,
            fontFamily: SAM.font,
          }}>
            A
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: SAM.text }}>
              alex_morris
            </div>
            <div style={{ fontSize: 12, color: SAM.comment }}>
              <Mono c={SAM.yellow}>[pro]</Mono> · $14,130 saved
            </div>
            <div style={{ fontSize: 11, color: SAM.green, marginTop: 2 }}>
              ◆ 17 day streak
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          marginTop: 12, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        }}>
          {[
            { v: '142', l: 'tx logged', c: SAM.text },
            { v: '4', l: 'goals', c: SAM.cyan },
            { v: '3', l: 'accounts', c: SAM.green },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '8px 4px',
              border: `1px solid ${SAM.border}`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: SAM.comment }}>{`// ${s.l}`}</div>
            </div>
          ))}
        </div>

        {/* Sections */}
        {sections.map((sec, si) => (
          <div key={si} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <Mono c={sec.c}>{sec.icon}</Mono>
              <Mono c={sec.c} b> {sec.title}</Mono>
            </div>
            {sec.items.map((it, i) => {
              const isLast = i === sec.items.length - 1;
              return (
                <div key={i} style={{ display: 'flex', fontSize: 13, marginTop: 6 }}>
                  <Mono c={SAM.comment}>{isLast ? '└─ ' : '├─ '}</Mono>
                  <Mono c={it.danger ? SAM.red : SAM.text}>{it.k}</Mono>
                  <span style={{ flex: 1 }}/>
                  <Mono c={it.tweak ? (it.danger ? SAM.red : SAM.cyan) : SAM.comment}>
                    {it.v}
                  </Mono>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 22, fontSize: 11, color: SAM.comment, textAlign: 'center' }}>
          sam v1.0.0 · build 2026.04.19
        </div>
      </div>
    </Page>
  );
};

// ─────────────────── Device wrapper ───────────────────

// Expose primitives to window for extra screens file
Object.assign(window, { SAM, Mono, Comment, Prompt, TabBar, BottomNav, Page, BarH, BlockBar });

// Custom minimal iOS frame — IOSDevice already renders its own status bar
const PhoneFrame = ({ children, label }) => (
  <div data-screen-label={label} style={{ position: 'relative' }}>
    <IOSDevice dark={true} width={380} height={780}>
      {children}
    </IOSDevice>
  </div>
);

// ─────────────────── Canvas ───────────────────

function App() {
  return (
    <DesignCanvas>
      <div style={{ padding: '40px 60px 20px 60px' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 32, fontWeight: 700, color: '#1a1a1a',
          letterSpacing: -1,
        }}>
          sam <span style={{ color: '#999', fontWeight: 400 }}>// financial terminal</span>
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 13, color: '#777', marginTop: 6,
        }}>
          {`// mobile PWA · terminal aesthetic · dark theme · 4 core screens`}
        </div>
      </div>

      <DCSection
        title="01 · Home / Dashboard"
        subtitle="home · activity · cards"
        gap={56}
      >
        <DCArtboard label="home" width={380} height={780}>
          <PhoneFrame label="01 Home"><HomeScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="activity" width={380} height={780}>
          <PhoneFrame label="01a Activity"><ActivityScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="cards" width={380} height={780}>
          <PhoneFrame label="01b Cards"><CardsScreen/></PhoneFrame>
        </DCArtboard>

        <DCPostIt top={-40} left={40} rotate={-3} width={220}>
          Mono font everywhere. Prompts use [pro]@init.Section pattern. Comments in // gray.
        </DCPostIt>
      </DCSection>

      <DCSection
        title="02 · Expenses"
        subtitle="expenses · income · budget"
        gap={56}
      >
        <DCArtboard label="expenses" width={380} height={780}>
          <PhoneFrame label="02 Expenses"><ExpensesScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="income" width={380} height={780}>
          <PhoneFrame label="02a Income"><IncomeScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="budget" width={380} height={780}>
          <PhoneFrame label="02b Budget"><BudgetScreen/></PhoneFrame>
        </DCArtboard>
      </DCSection>

      <DCSection
        title="03 · Goals"
        subtitle="goals · savings · invest"
        gap={56}
      >
        <DCArtboard label="goals" width={380} height={780}>
          <PhoneFrame label="03 Goals"><GoalsScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="savings" width={380} height={780}>
          <PhoneFrame label="03a Savings"><SavingsScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="invest" width={380} height={780}>
          <PhoneFrame label="03b Invest"><InvestScreen/></PhoneFrame>
        </DCArtboard>
      </DCSection>

      <DCSection
        title="04 · Profile"
        subtitle="profile · stats · help"
        gap={56}
      >
        <DCArtboard label="profile" width={380} height={780}>
          <PhoneFrame label="04 Profile"><ProfileScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="stats" width={380} height={780}>
          <PhoneFrame label="04a Stats"><StatsScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard label="help" width={380} height={780}>
          <PhoneFrame label="04b Help"><HelpScreen/></PhoneFrame>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

Object.assign(window, { App });
