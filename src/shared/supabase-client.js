// SAM · Supabase data layer
// Plain JS (no JSX) — loaded as a normal <script> BEFORE the Babel scripts so
// window.sb / window.SamDB are ready by the time any React code runs.
//
// Local stack (supabase start):
//   API  : http://127.0.0.1:54321
//   Studio: http://127.0.0.1:54323
// The anon key below is the shared local-dev key printed by `supabase status`.
// It is safe to commit for a LOCAL MVP only — never use a hosted key here.

(function () {
  const SUPABASE_URL = 'http://127.0.0.1:54321';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  const ONBOARDING_URL = 'SAM-Onboarding.html';
  const APP_URL = 'SAM-Interactive.html';

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[SAM] supabase-js failed to load from CDN.');
    return;
  }

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'sam-auth',
    },
  });

  // ───────────────────────── helpers ─────────────────────────
  const num = (v) => (v == null ? 0 : Number(v));
  const logErr = (tag, error) => { if (error) console.error('[SAM] ' + tag + ' failed:', error.message || error); return error; };

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  // Map a DB transaction row (+ category lookup) into the app's expense shape.
  function mapExpense(t, catById) {
    const cat = t.category_id ? catById[t.category_id] : null;
    return {
      id: t.id,
      name: t.name,
      amount: num(t.amount),
      category: cat ? cat.key : 'misc',
      catKey: cat ? cat.key : 'misc',
      catColor: cat ? cat.color : '#8b949e',
      icon: t.icon || (cat ? cat.icon : '●'),
      time: formatTime(t.occurred_at),
      occurred_at: t.occurred_at,
      kind: t.kind,
    };
  }

  // ───────────────────────── auth ─────────────────────────
  async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }
  function signIn(email, password) {
    return sb.auth.signInWithPassword({ email, password });
  }
  function signUp(email, password, fullName) {
    return sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  }
  async function signOut() {
    await sb.auth.signOut();
  }
  async function deleteAccount() {
    const { error } = await sb.rpc('delete_user');
    if (!error) await sb.auth.signOut();
    return { error };
  }

  // ───────────────────────── load ─────────────────────────
  // Returns an object shaped exactly like the legacy in-memory state so the
  // screens need no shape changes — only the source changes (DB instead of mock).
  async function loadUserData() {
    const { data: userRes } = await sb.auth.getUser();
    const user = userRes && userRes.user;
    if (!user) return null;

    const barsCutoff = new Date(Date.now() - 50 * 864e5).toISOString().slice(0, 10);
    const snapCutoff = new Date(Date.now() - 40 * 864e5).toISOString();

    const [profileR, accountsR, categoriesR, txR, goalsR, incomeR, bucketsR,
           holdingsR, watchlistR, symbolsR, quotesR, snapshotsR] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('accounts').select('*').order('sort', { ascending: true }),
      sb.from('categories').select('*').order('sort', { ascending: true }),
      sb.from('transactions').select('*').order('occurred_at', { ascending: true }),
      sb.from('goals').select('*').order('sort', { ascending: true }),
      sb.from('income_sources').select('*').order('sort', { ascending: true }),
      sb.from('savings_buckets').select('*').order('sort', { ascending: true }),
      sb.from('holdings').select('*').order('opened_at', { ascending: true }),
      sb.from('watchlist').select('*').order('sort', { ascending: true }),
      sb.from('market_symbols').select('symbol,name,curated,sort').eq('active', true).order('sort', { ascending: true }),
      sb.from('market_quotes').select('*').gte('session_date', isoDay(-1)),
      sb.from('portfolio_snapshots').select('value,captured_at').gte('captured_at', snapCutoff).order('captured_at', { ascending: true }),
    ]);

    // Only the user-owned/profile reads are fatal. Market reads degrade to empty.
    const firstError = [profileR, accountsR, categoriesR, txR, goalsR, incomeR, bucketsR]
      .map((r) => r.error)
      .find(Boolean);
    if (firstError) {
      console.error('[SAM] loadUserData error:', firstError);
      return null;
    }
    [holdingsR, watchlistR, symbolsR, quotesR, snapshotsR].forEach((r) => logErr('market load', r.error));

    // Daily bars only for the symbols we actually display (holdings + watchlist
    // + SPY benchmark). Fetching all ~85 symbols hits PostgREST's 1000-row cap
    // and silently drops bars for later symbols (e.g. NVO -> "no data").
    const barSyms = Array.from(new Set([
      ...(holdingsR.data || []).map((h) => h.symbol),
      ...(watchlistR.data || []).map((w) => w.symbol),
      'SPY',
    ]));
    const barsR = await sb.from('market_daily_bars')
      .select('symbol,bar_date,close')
      .in('symbol', barSyms)
      .gte('bar_date', barsCutoff)
      .order('bar_date', { ascending: true });
    logErr('bars load', barsR.error);

    const market = buildMarket(quotesR.data || [], barsR.data || []);
    const dailyBars = buildDailyBars(barsR.data || []);
    const portfolioSnapshots = (snapshotsR.data || []).map((r) => ({ t: r.captured_at, v: num(r.value) }));

    const profile = profileR.data || {};
    const categories = categoriesR.data || [];
    const catById = {};
    categories.forEach((c) => (catById[c.id] = c));

    const allTx = (txR.data || []).map((t) => mapExpense(t, catById));

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: profile.full_name || (user.email || '').split('@')[0],
        username: profile.username || null,
        plan: profile.plan || 'pro',
        streak: profile.streak || 0,
        member_since: profile.member_since || null,
      },
      prefs: profile.prefs || { notifications: true, biometric: true, theme: 'dark', rollover: false },
      streak: profile.streak || 0,

      accounts: (accountsR.data || []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: num(a.balance),
        creditLimit: a.credit_limit != null ? num(a.credit_limit) : null,
        last4: a.last4 || null,
        icon: a.icon,
        color: a.color,
      })),

      budgets: categories.map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        icon: c.icon,
        c: c.color,
        cap: num(c.monthly_cap),
      })),

      expenses: allTx.filter((t) => t.kind === 'expense'),
      incomeTx: allTx.filter((t) => t.kind === 'income'),

      goals: (goalsR.data || []).map((g) => ({
        id: g.id,
        name: g.name,
        target: num(g.target),
        saved: num(g.saved),
        eta: g.eta,
        icon: g.icon,
        c: g.color,
        done: g.done,
      })),

      incomeSources: (incomeR.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        amt: num(s.amount),
        icon: s.icon,
        c: s.color,
        freq: s.freq,
        next: s.next_date,
      })),

      buckets: (bucketsR.data || []).map((b) => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        c: b.color,
        balance: num(b.balance),
        target: num(b.target),
        apy: num(b.apy),
      })),

      // ── invest ──
      holdings: (holdingsR.data || []).map(mapHolding),
      watchlist: (watchlistR.data || []).map((w) => ({ sym: w.symbol, name: w.name })),
      tickerPool: (symbolsR.data || []).map((s) => ({ sym: s.symbol, name: s.name })),
      market,
      dailyBars,
      portfolioSnapshots,
    };
  }

  // ───────────────────── invest helpers ─────────────────────
  function isoDay(offsetDays) {
    return new Date(Date.now() + (offsetDays || 0) * 864e5).toISOString().slice(0, 10);
  }

  function mapHolding(h) {
    return {
      id: h.id,
      sym: h.symbol,
      name: h.name,
      qty: num(h.qty),
      avgCost: num(h.avg_cost),
      openedAt: h.opened_at,
    };
  }

  // Merge live + yahoo quote rows (+ daily-bar fallback) into a per-symbol map
  // the screens read: { SYM: { price, prevClose, dayOpen, bid, ask, pct, source, live } }
  function buildMarket(quoteRows, barRows) {
    const today = isoDay(0);
    const latestBar = {};
    (barRows || []).forEach((b) => {
      const cur = latestBar[b.symbol];
      if (!cur || b.bar_date > cur.date) latestBar[b.symbol] = { date: b.bar_date, close: num(b.close) };
    });

    const live = {};
    const yahoo = {};
    (quoteRows || []).forEach((q) => {
      const bucket = q.source === 'live' ? live : yahoo;
      const cur = bucket[q.symbol];
      if (!cur || q.session_date > cur.session_date) bucket[q.symbol] = q;
    });

    const out = {};
    const syms = new Set([...Object.keys(live), ...Object.keys(yahoo), ...Object.keys(latestBar)]);
    const nowMs = Date.now();
    syms.forEach((sym) => {
      const l = live[sym];
      const y = yahoo[sym];
      const liveToday = l && l.session_date === today;
      const liveFresh = liveToday && l.captured_at && (nowMs - new Date(l.captured_at).getTime() < 120000);
      const price = num((liveToday && l.price) || (y && y.price) || (latestBar[sym] && latestBar[sym].close));
      if (!price) return;
      const prevClose = y && y.prev_close != null ? num(y.prev_close) : null;
      const pct = prevClose ? ((price - prevClose) / prevClose) * 100 : (y ? num(y.change_pct) : 0);
      out[sym] = {
        price,
        prevClose,
        dayOpen: y && y.day_open != null ? num(y.day_open) : null,
        bid: num((l && l.bid) || (y && y.bid)) || null,
        ask: num((l && l.ask) || (y && y.ask)) || null,
        pct,
        source: liveToday ? 'live' : 'yahoo',
        live: !!liveFresh,
      };
    });
    out.__liveActive = Object.values(out).some((q) => q && q.live);
    return out;
  }

  function buildDailyBars(barRows) {
    const bySym = {};
    (barRows || []).forEach((b) => {
      (bySym[b.symbol] || (bySym[b.symbol] = [])).push({ date: b.bar_date, close: num(b.close) });
    });
    Object.values(bySym).forEach((arr) => arr.sort((a, b) => (a.date < b.date ? -1 : 1)));
    return bySym;
  }

  async function getMarketData() {
    const barsCutoff = new Date(Date.now() - 50 * 864e5).toISOString().slice(0, 10);
    const [quotesR, barsR] = await Promise.all([
      sb.from('market_quotes').select('*').gte('session_date', isoDay(-1)),
      sb.from('market_daily_bars').select('symbol,bar_date,close').gte('bar_date', barsCutoff),
    ]);
    logErr('getMarketData', quotesR.error || barsR.error);
    return {
      market: buildMarket(quotesR.data || [], barsR.data || []),
      dailyBars: buildDailyBars(barsR.data || []),
    };
  }

  async function getMarketQuotes() {
    const quotesR = await sb.from('market_quotes').select('*').gte('session_date', isoDay(-1));
    logErr('getMarketQuotes', quotesR.error);
    // bars not needed for a light refresh; pass [] (fallback only affects unseen symbols)
    return buildMarket(quotesR.data || [], []);
  }

  // Daily bars for an arbitrary symbol set (used when a ticker is added to the
  // watchlist after the initial load so its sparkline/detail chart has data).
  async function getBarsFor(symbols) {
    if (!symbols || !symbols.length) return {};
    const cutoff = new Date(Date.now() - 50 * 864e5).toISOString().slice(0, 10);
    const { data, error } = await sb.from('market_daily_bars')
      .select('symbol,bar_date,close')
      .in('symbol', symbols)
      .gte('bar_date', cutoff)
      .order('bar_date', { ascending: true });
    logErr('getBarsFor', error);
    return buildDailyBars(data || []);
  }

  // Append a portfolio-value snapshot (forward-growing performance series).
  async function recordSnapshot(value) {
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes || !userRes.user) return { error: 'no session' };
    const { error } = await sb.from('portfolio_snapshots')
      .insert({ user_id: userRes.user.id, value });
    return { error: logErr('recordSnapshot', error) };
  }

  // ───────────────────────── mutations ─────────────────────────
  async function addExpense({ amount, name, catKey, budgets, accounts }) {
    const { data: userRes } = await sb.auth.getUser();
    const uid = userRes.user.id;
    const cat = (budgets || []).find((b) => b.key === catKey);
    const acc = (accounts || []).find((a) => a.type === 'checking') || (accounts || [])[0];
    const { data, error } = await sb
      .from('transactions')
      .insert({
        user_id: uid,
        name,
        amount,
        kind: 'expense',
        category_id: cat ? cat.id : null,
        account_id: acc ? acc.id : null,
        icon: cat ? cat.icon : '●',
        occurred_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { error: logErr('addExpense', error) };
    return {
      row: {
        id: data.id,
        name: data.name,
        amount: num(data.amount),
        category: cat ? cat.key : 'misc',
        catKey: cat ? cat.key : 'misc',
        catColor: cat ? cat.c : '#8b949e',
        icon: data.icon,
        time: 'now',
        occurred_at: data.occurred_at,
        kind: 'expense',
      },
    };
  }

  async function deleteExpense(id) {
    const { error } = await sb.from('transactions').delete().eq('id', id);
    return { error: logErr('deleteExpense', error) };
  }

  async function addGoal({ name, target, icon, color }) {
    const { data: userRes } = await sb.auth.getUser();
    const { data, error } = await sb
      .from('goals')
      .insert({
        user_id: userRes.user.id,
        name,
        target,
        saved: 0,
        eta: 'tbd',
        icon: icon || '◆',
        color: color || '#58a6ff',
        done: false,
      })
      .select()
      .single();
    if (error) return { error: logErr('addGoal', error) };
    return {
      row: {
        id: data.id,
        name: data.name,
        target: num(data.target),
        saved: num(data.saved),
        eta: data.eta,
        icon: data.icon,
        c: data.color,
        done: data.done,
      },
    };
  }

  async function setGoalSaved(goalId, saved, done) {
    const patch = { saved };
    if (typeof done === 'boolean') patch.done = done;
    const { error } = await sb.from('goals').update(patch).eq('id', goalId);
    return { error: logErr('setGoalSaved', error) };
  }

  async function setBudgetCap(categoryId, cap) {
    const { error } = await sb.from('categories').update({ monthly_cap: cap }).eq('id', categoryId);
    return { error: logErr('setBudgetCap', error) };
  }

  async function addIncome({ name, amt, icon, color, freq, next }) {
    const { data: userRes } = await sb.auth.getUser();
    const { data, error } = await sb
      .from('income_sources')
      .insert({
        user_id: userRes.user.id,
        name,
        amount: amt,
        icon: icon || '◆',
        color: color || '#58a6ff',
        freq: freq || 'one-time',
        next_date: next || '—',
      })
      .select()
      .single();
    if (error) return { error: logErr('addIncome', error) };
    return {
      row: {
        id: data.id,
        name: data.name,
        amt: num(data.amount),
        icon: data.icon,
        c: data.color,
        freq: data.freq,
        next: data.next_date,
      },
    };
  }

  async function setBucketBalance(bucketId, balance) {
    const { error } = await sb.from('savings_buckets').update({ balance }).eq('id', bucketId);
    return { error: logErr('setBucketBalance', error) };
  }

  async function updatePrefs(prefs) {
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes || !userRes.user) return { error: 'no session' };
    const { error } = await sb.from('profiles').update({ prefs }).eq('id', userRes.user.id);
    return { error: logErr('updatePrefs', error) };
  }

  // Simulated buy: records/updates a real holding row + a trade log entry, and
  // drops the symbol from the watchlist (watchlist -> holdings transition).
  async function buyHolding({ symbol, name, amount, price }) {
    const amt = Number(amount);
    const px = Number(price);
    if (!(amt > 0) || !(px > 0)) return { error: 'invalid buy' };
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes || !userRes.user) return { error: 'no session' };
    const uid = userRes.user.id;
    const qty = amt / px;

    const { data: existing } = await sb
      .from('holdings').select('*').eq('user_id', uid).eq('symbol', symbol).maybeSingle();

    let row;
    if (existing) {
      const newQty = num(existing.qty) + qty;
      const newAvg = newQty > 0
        ? (num(existing.qty) * num(existing.avg_cost) + amt) / newQty
        : px;
      const { data, error } = await sb.from('holdings')
        .update({ qty: newQty, avg_cost: newAvg, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) return { error: logErr('buyHolding', error) };
      row = data;
    } else {
      const { data, error } = await sb.from('holdings')
        .insert({ user_id: uid, symbol, name: name || symbol, qty, avg_cost: px })
        .select().single();
      if (error) return { error: logErr('buyHolding', error) };
      row = data;
    }

    await sb.from('trades').insert({ user_id: uid, symbol, side: 'buy', qty, price: px, amount: amt });
    await sb.from('watchlist').delete().eq('user_id', uid).eq('symbol', symbol);
    return { row: mapHolding(row), removedFromWatch: symbol };
  }

  // Simulated sell: reduces (or closes) the holding and logs the trade.
  async function sellHolding({ symbol, amount, qty, price }) {
    const px = Number(price);
    if (!(px > 0)) return { error: 'invalid sell' };
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes || !userRes.user) return { error: 'no session' };
    const uid = userRes.user.id;

    const { data: existing } = await sb
      .from('holdings').select('*').eq('user_id', uid).eq('symbol', symbol).maybeSingle();
    if (!existing) return { error: 'not held' };

    const sellQty = qty != null ? Number(qty) : Number(amount) / px;
    if (!(sellQty > 0)) return { error: 'invalid qty' };
    const newQty = num(existing.qty) - sellQty;
    const amt = Math.min(sellQty, num(existing.qty)) * px;

    let removed = false;
    let row = null;
    if (newQty <= 1e-6) {
      const { error } = await sb.from('holdings').delete().eq('id', existing.id);
      if (error) return { error: logErr('sellHolding', error) };
      removed = true;
    } else {
      const { data, error } = await sb.from('holdings')
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) return { error: logErr('sellHolding', error) };
      row = mapHolding(data);
    }

    await sb.from('trades').insert({ user_id: uid, symbol, side: 'sell', qty: Math.min(sellQty, num(existing.qty)), price: px, amount: amt });
    return { row, removed, symbol };
  }

  async function addWatch({ symbol, name }) {
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes || !userRes.user) return { error: 'no session' };
    const { error } = await sb.from('watchlist')
      .upsert({ user_id: userRes.user.id, symbol, name: name || symbol }, { onConflict: 'user_id,symbol' });
    if (error) return { error: logErr('addWatch', error) };
    return { row: { sym: symbol, name: name || symbol } };
  }

  async function removeWatch(symbol) {
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes || !userRes.user) return { error: 'no session' };
    const { error } = await sb.from('watchlist').delete().eq('user_id', userRes.user.id).eq('symbol', symbol);
    return { error: logErr('removeWatch', error) };
  }

  function goOnboarding() { window.location.href = ONBOARDING_URL; }
  function goApp() { window.location.href = APP_URL; }

  window.sb = sb;
  window.SamDB = {
    sb,
    getSession,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    loadUserData,
    addExpense,
    deleteExpense,
    addGoal,
    setGoalSaved,
    setBudgetCap,
    addIncome,
    setBucketBalance,
    updatePrefs,
    buyHolding,
    sellHolding,
    addWatch,
    removeWatch,
    getMarketData,
    getMarketQuotes,
    getBarsFor,
    recordSnapshot,
    goOnboarding,
    goApp,
    URLS: { ONBOARDING_URL, APP_URL },
  };
})();
