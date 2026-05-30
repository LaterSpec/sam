import React from 'react';
// PROFILE screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;
const { useState } = React;

function ProfileScreen({ state, setState }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState('');

  const toggle = (k) => setState(s => ({ ...s, prefs: { ...s.prefs, [k]: !s.prefs[k] } }));
  const setTheme = (t) => setState(s => ({ ...s, prefs: { ...s.prefs, theme: t } }));

  const user = state.user || {};
  const accountCount = (state.accounts || []).length;
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();
  const displayName = user.username || user.full_name || (user.email || '').split('@')[0];
  const memberSince = user.member_since
    ? new Date(user.member_since + 'T00:00:00').toLocaleDateString('en', { month: 'short', year: 'numeric' })
    : '—';

  const signOut = async () => {
    setBusy('out');
    if (window.SamDB) { await window.SamDB.signOut(); window.SamDB.goOnboarding(); }
  };

  const deleteAccount = async () => {
    setBusy('del');
    if (window.SamDB) {
      const { error } = await window.SamDB.deleteAccount();
      if (!error) { window.SamDB.goOnboarding(); return; }
    }
    setBusy('');
    setConfirmDel(false);
  };

  const exportCsv = () => {
    const rows = [['date', 'name', 'type', 'category', 'amount']];
    (state.expenses || []).forEach(e =>
      rows.push([e.occurred_at || '', e.name, 'expense', e.catKey, e.amount]));
    (state.incomeTx || []).forEach(e =>
      rows.push([e.occurred_at || '', e.name, 'income', '', e.amount]));
    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sam-transactions.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const Toggle = ({ value, onChange }) => (
    <span onClick={onChange} style={{ cursor: 'pointer', userSelect: 'none' }}>
      <Mono c={value ? SAM.cyan : SAM.comment} b={value}>[on]</Mono>
      <Mono c={!value ? SAM.text : SAM.comment} b={!value}> off</Mono>
    </span>
  );

  const ThemeToggle = () => (
    <span style={{ userSelect: 'none' }}>
      <span onClick={() => setTheme('dark')} style={{ cursor: 'pointer' }}>
        <Mono c={state.prefs.theme === 'dark' ? SAM.cyan : SAM.comment} b={state.prefs.theme === 'dark'}>[dark]</Mono>
      </span>
      <Mono c={SAM.comment}> </Mono>
      <span onClick={() => setTheme('light')} style={{ cursor: 'pointer' }}>
        <Mono c={state.prefs.theme === 'light' ? SAM.cyan : SAM.text} b={state.prefs.theme === 'light'}>light</Mono>
      </span>
    </span>
  );

  const sections = [
    {
      title: 'account',
      icon: '◉',
      c: SAM.yellow,
      items: [
        { k: 'email', v: <Mono c={SAM.comment}>{user.email || '—'}</Mono> },
        { k: 'handle', v: <Mono c={SAM.comment}>@{(window.SAM_USER) || displayName}</Mono> },
        { k: 'member since', v: <Mono c={SAM.comment}>{memberSince}</Mono> },
      ],
    },
    {
      title: 'preferences',
      icon: '⚙',
      c: SAM.cyan,
      items: [
        { k: 'currency', v: <Mono c={SAM.comment}>USD $</Mono> },
        { k: 'theme', v: <ThemeToggle/> },
        { k: 'notifications', v: <Toggle value={state.prefs.notifications} onChange={() => toggle('notifications')}/> },
        { k: 'biometric lock', v: <Toggle value={state.prefs.biometric} onChange={() => toggle('biometric')}/> },
      ],
    },
    {
      title: 'data',
      icon: '⬢',
      c: SAM.green,
      items: [
        { k: 'export csv', v: <Mono c={SAM.cyan}>→</Mono>, onClick: exportCsv },
        { k: 'sync accounts', v: <Mono c={SAM.comment}>{accountCount} linked</Mono> },
        { k: 'backup', v: <Mono c={SAM.comment}>just now</Mono> },
      ],
    },
  ];

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['profile', 'stats', 'help', 'settings']} active={state.profileTab}
        onChange={t => setState(s => ({ ...s, profileTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Profile" cmd="whoami"/>
        <Comment>member of the 0.3% who budget weekly. keep going.</Comment>

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
          }}>{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: SAM.text }}>{displayName}</div>
            <div style={{ fontSize: 12, color: SAM.comment }}>
              {memberSince} · ${totalSaved.toLocaleString()} saved
            </div>
            <div style={{ fontSize: 11, color: SAM.green, marginTop: 2 }}>
              ◆ {state.streak} day streak
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 12, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        }}>
          {[
            { v: state.expenses.length, l: 'tx logged', c: SAM.text },
            { v: state.goals.length, l: 'goals', c: SAM.cyan },
            { v: accountCount, l: 'accounts', c: SAM.green },
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

        {sections.map((sec, si) => (
          <div key={si} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <Mono c={sec.c}>{sec.icon}</Mono>
              <Mono c={sec.c} b> {sec.title}</Mono>
            </div>
            {sec.items.map((it, i) => {
              const isLast = i === sec.items.length - 1;
              return (
                <div key={i}
                  onClick={it.onClick || undefined}
                  style={{
                    display: 'flex', fontSize: 13, marginTop: 6, alignItems: 'baseline',
                    cursor: it.onClick ? 'pointer' : 'default',
                  }}>
                  <Mono c={SAM.comment}>{isLast ? '└─ ' : '├─ '}</Mono>
                  <Mono c={SAM.text}>{it.k}</Mono>
                  <span style={{ flex: 1 }}/>
                  <span>{it.v}</span>
                </div>
              );
            })}
          </div>
        ))}

        {/* danger zone — functional */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={SAM.red}>⚠</Mono>
            <Mono c={SAM.red} b> danger</Mono>
          </div>

          <div onClick={busy ? undefined : signOut}
            style={{ display: 'flex', fontSize: 13, marginTop: 6, alignItems: 'baseline', cursor: 'pointer' }}>
            <Mono c={SAM.comment}>├─ </Mono>
            <Mono c={SAM.text}>sign out</Mono>
            <span style={{ flex: 1 }}/>
            <Mono c={SAM.red}>{busy === 'out' ? '...' : '→'}</Mono>
          </div>

          {!confirmDel ? (
            <div onClick={() => setConfirmDel(true)}
              style={{ display: 'flex', fontSize: 13, marginTop: 6, alignItems: 'baseline', cursor: 'pointer' }}>
              <Mono c={SAM.comment}>└─ </Mono>
              <Mono c={SAM.red}>delete account</Mono>
              <span style={{ flex: 1 }}/>
              <Mono c={SAM.red}>→</Mono>
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: 10, border: `1px solid ${SAM.red}55`, background: 'rgba(248,81,73,0.05)' }}>
              <div style={{ fontSize: 11, color: SAM.comment }}>
                {`// this wipes your account + all data. cannot be undone.`}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div onClick={busy ? undefined : () => { setConfirmDel(false); }}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0', border: `1px solid ${SAM.border}`, color: SAM.text, cursor: 'pointer' }}>
                  [cancel]
                </div>
                <div onClick={busy ? undefined : deleteAccount}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: SAM.red, color: SAM.bg, fontWeight: 700, cursor: 'pointer' }}>
                  {busy === 'del' ? '[deleting...]' : '[confirm delete]'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 22, fontSize: 11, color: SAM.comment, textAlign: 'center' }}>
          sam v1.0.0 · build 2026.05.29
        </div>
      </div>
    </div>
  );
}

window.ProfileScreen = ProfileScreen;
