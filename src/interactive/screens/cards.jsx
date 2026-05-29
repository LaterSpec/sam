// HOME › CARDS screen
const { SAM, Mono, Comment, Prompt, BlockBar, BarH, TabBar } = window;

function CardsScreen({ state, setState, openSheet }) {
  const cards = (state.accounts || []).map(a => ({
    id: a.id,
    label: a.type === 'card' ? 'credit' : a.type,
    digits: a.last4 || '----',
    color: a.color,
    balance: a.balance,
    bank: a.name,
    icon: a.icon,
    limit: a.creditLimit || undefined,
  }));

  const hiddenSet = new Set(state.hiddenCards || []);
  const visibleTotal = cards
    .filter(c => !hiddenSet.has(c.id))
    .reduce((a, c) => a + c.balance, 0);

  const toggleCard = (id) => {
    setState(s => {
      const h = new Set(s.hiddenCards || []);
      h.has(id) ? h.delete(id) : h.add(id);
      return { ...s, hiddenCards: [...h] };
    });
  };

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <TabBar tabs={['home', 'activity', 'cards']} active="cards"
        onChange={t => setState(s => ({ ...s, homeTab: t }))}/>
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Cards" cmd="ls --accounts"/>
        <Comment>{cards.length - hiddenSet.size} visible · tap to hide/show · long-hold for detail</Comment>

        <div style={{
          marginTop: 14, padding: 12,
          border: `1px solid ${SAM.border}`,
          background: 'rgba(88,166,255,0.04)',
        }}>
          <div style={{ fontSize: 11, color: SAM.comment }}>
            <Mono c={SAM.cyan}>∑</Mono> net_worth <Mono c={SAM.comment}>--visible</Mono>
          </div>
          <div style={{
            fontSize: 26, fontWeight: 700, color: visibleTotal >= 0 ? SAM.cyan : SAM.red,
            marginTop: 4, fontVariantNumeric: 'tabular-nums',
          }}>
            {visibleTotal < 0 ? '-' : ''}${Math.abs(visibleTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: SAM.cyan, fontWeight: 600 }}>
            ▸ Accounts
            <span style={{ float: 'right', color: SAM.textDim, fontWeight: 400 }}>
              [{cards.length}] ▾
            </span>
          </div>

          {cards.map((card) => {
            const hidden = hiddenSet.has(card.id);
            return (
              <div key={card.id} style={{ marginTop: 12 }}>
                <div
                  onClick={() => openSheet({ kind: 'card', card })}
                  style={{
                    padding: 12,
                    border: `1px solid ${hidden ? SAM.border : card.color + '55'}`,
                    background: hidden ? 'transparent' : `${card.color}0d`,
                    opacity: hidden ? 0.4 : 1,
                    cursor: 'pointer', transition: 'all 160ms',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
                    <Mono c={card.color} b>{card.icon}</Mono>
                    <Mono c={SAM.text} b>{card.label}</Mono>
                    <Mono c={SAM.comment}>····{card.digits}</Mono>
                    <span style={{ flex: 1 }}/>
                    <Mono c={SAM.comment}>{card.bank}</Mono>
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 700,
                    color: card.balance < 0 ? SAM.red : card.color,
                    fontVariantNumeric: 'tabular-nums', marginTop: 6,
                  }}>
                    {card.balance < 0 ? '-' : ''}${Math.abs(card.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                  {card.limit && (
                    <div style={{ marginTop: 6 }}>
                      <BarH pct={Math.round(Math.abs(card.balance)/card.limit*100)} c={SAM.magenta}/>
                      <div style={{ fontSize: 10, color: SAM.comment, marginTop: 4 }}>
                        limit ${card.limit.toLocaleString()} · {Math.round(Math.abs(card.balance)/card.limit*100)}% used
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, textAlign: 'right' }}>
                  <span onClick={() => toggleCard(card.id)}
                    style={{ cursor: 'pointer', color: hidden ? SAM.cyan : SAM.comment }}>
                    {hidden ? '[show]' : '[hide]'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          <Mono c={SAM.green} b>[+ link account]</Mono>
          <Mono c={SAM.comment}> · </Mono>
          <Mono c={SAM.cyan}>[transfer]</Mono>
        </div>

        <div style={{ marginTop: 16, fontSize: 10, color: SAM.comment, lineHeight: 1.6 }}>
          {`// 256-bit TLS · read-only · powered by plaid`}
        </div>
      </div>
    </div>
  );
}

window.CardsScreen = CardsScreen;
