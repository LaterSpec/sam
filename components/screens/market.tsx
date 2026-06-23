"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { MiniLineChart } from "@/components/charts/mini-line-chart";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

type MarketQuote = { price?: number; pct?: number; source?: string; live?: boolean };

export function MarketScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const market = state.market || {};
  const dailyBars = state.dailyBars || {};
  const holdings = state.holdings || [];
  const watchlist = state.watchlist || [];
  const liveActive = !!(market as { __liveActive?: boolean }).__liveActive;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const isOpen =
    now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() >= 9 && now.getHours() < 16;

  const quote = (sym: string): MarketQuote | null => (market[sym] as MarketQuote) || null;

  const sparkline = (sym: string, price: number | null) => {
    const bars = dailyBars[sym];
    if (bars && bars.length >= 2) {
      const closes = bars.slice(-24).map((b) => b.close);
      if (price != null) closes.push(price);
      return closes;
    }
    return null;
  };

  const moverList = Object.keys(market)
    .filter((s) => s !== "__liveActive" && market[s] && (market[s] as MarketQuote).price)
    .map((s) => ({ sym: s, pct: (market[s] as MarketQuote).pct ?? 0 }));
  const gainers = [...moverList].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const losers = [...moverList].sort((a, b) => a.pct - b.pct).slice(0, 3);

  function TickerCard({ sym, name, owned }: { sym: string; name: string; owned: boolean }) {
    const q = quote(sym);
    const price = q?.price ?? null;
    const pct = q?.pct ?? 0;
    const up = pct >= 0;
    const pctColor = up ? sam.green : sam.red;
    const prices = sparkline(sym, price);
    const pos = owned ? holdings.find((h) => h.sym === sym) : null;
    const qty = pos?.qty ?? null;
    const val = qty != null && price != null ? qty * price : null;
    const dayGain = val != null ? val * (pct / 100) : null;
    const noData = price == null;

    return (
      <div
        onClick={() =>
          price != null &&
          openSheet({
            kind: "ticker-detail",
            sym,
            name,
            price,
            pct,
            qty,
            owned: !!owned,
            source: q?.source ?? "yahoo",
          })
        }
        style={{
          marginBottom: 10,
          cursor: noData ? "default" : "pointer",
          border: `1px solid ${noData ? sam.border : (up ? sam.green + "30" : sam.red + "30")}`,
          background: noData ? "transparent" : up ? `${sam.green}0a` : `${sam.red}0a`,
          transition: "border-color 180ms, background 180ms",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "78px 1fr 110px",
            alignItems: "center",
            padding: "10px 12px",
            gap: 10,
          }}
        >
          <div>
            <Mono c={sam.yellow} b style={{ fontSize: 14 }}>
              {sym}
            </Mono>
            <div style={{ fontSize: 10, color: sam.comment, marginTop: 1 }}>{name}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {prices ? (
              <MiniLineChart prices={prices} color={noData ? sam.comment : pctColor} width={110} height={34} />
            ) : (
              <Mono c={sam.comment} style={{ fontSize: 10 }}>
                no data
              </Mono>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            {noData ? (
              <Mono c={sam.comment} style={{ fontSize: 11 }}>
                —
              </Mono>
            ) : (
              <>
                <Mono c={sam.text} b style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                  ${price!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Mono>
                <div style={{ marginTop: 2 }}>
                  <Mono c={pctColor} b style={{ fontSize: 11 }}>
                    {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                  </Mono>
                </div>
              </>
            )}
          </div>
        </div>
        {owned && val != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 12px 9px",
              fontSize: 10,
              color: sam.comment,
              borderTop: `1px solid ${sam.border}`,
            }}
          >
            <span>
              <Mono c={sam.textDim}>{qty!.toLocaleString(undefined, { maximumFractionDigits: 4 })}</Mono>
              <Mono c={sam.comment}> shares</Mono>
            </span>
            <span>
              <Mono c={sam.comment}>val </Mono>
              <Mono c={sam.text} b style={{ fontVariantNumeric: "tabular-nums" }}>
                ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Mono>
            </span>
            <span>
              <Mono c={pctColor} b>
                {up ? "+" : "-"}${Math.abs(dayGain!).toFixed(2)} today
              </Mono>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["portfolio", "market", "analysis"]} active="market" onChange={(t) => setState((s) => ({ ...s, investTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Market" cmd="ticker --live" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            border: `1px solid ${(isOpen ? sam.green : sam.comment) + "44"}`,
            background: isOpen ? `${sam.green}10` : sam.overlay,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isOpen ? sam.green : sam.comment,
              boxShadow: isOpen ? `0 0 6px ${sam.green}` : "none",
            }}
          />
          <Mono c={isOpen ? sam.green : sam.comment} b style={{ fontSize: 11 }}>
            {isOpen ? "MARKET OPEN" : "MARKET CLOSED"}
          </Mono>
          <Mono c={sam.comment} style={{ fontSize: 11 }}>
            · NYSE {hh}:{mm} EST
          </Mono>
          <span style={{ flex: 1 }} />
          {liveActive ? (
            <Mono c={sam.green} b style={{ fontSize: 10 }}>
              ● LIVE
            </Mono>
          ) : (
            <Mono c={sam.comment} style={{ fontSize: 10 }}>
              ~15m delay
            </Mono>
          )}
        </div>
        <div style={{ fontSize: 10, color: sam.comment, marginBottom: 14 }}>
          {liveActive
            ? "// source: IBKR live feed · real-time"
            : "// source: Yahoo Finance · last close / delayed snapshot"}
        </div>
        <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600, marginBottom: 10 }}>
          ▸ your holdings
          <Mono c={sam.comment} style={{ fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
            {holdings.length} positions · tap for detail
          </Mono>
        </div>
        {holdings.length === 0 && (
          <div
            style={{
              padding: "14px 12px",
              textAlign: "center",
              border: `1px dashed ${sam.border}`,
              color: sam.comment,
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            // no positions yet · tap a watchlist ticker to buy
          </div>
        )}
        {holdings.map((h) => (
          <TickerCard key={h.sym} sym={h.sym} name={h.name} owned />
        ))}
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 18, marginBottom: 10 }}>
          <Mono c={sam.cyan} b style={{ fontSize: 13 }}>
            ▸ watchlist
          </Mono>
          <Mono c={sam.comment} style={{ marginLeft: 8, fontSize: 11 }}>
            {watchlist.length} tracked
          </Mono>
          <span style={{ flex: 1 }} />
          <span onClick={() => openSheet({ kind: "add-ticker" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b style={{ fontSize: 12 }}>
              [+ add]
            </Mono>
          </span>
        </div>
        {watchlist.length === 0 && (
          <div
            style={{
              padding: "14px 12px",
              textAlign: "center",
              border: `1px dashed ${sam.border}`,
              color: sam.comment,
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            // no tickers yet · tap [+ add] to start tracking
          </div>
        )}
        {watchlist.map((w) => (
          <TickerCard key={w.sym} sym={w.sym} name={w.name} owned={false} />
        ))}
        <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
          ▸ top movers today
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: sam.green, fontWeight: 600, marginBottom: 6 }}>// gainers</div>
            {gainers.map((m) => (
              <div key={m.sym} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 5 }}>
                <Mono c={sam.text} b>
                  {m.sym}
                </Mono>
                <Mono c={sam.green} b>
                  +{m.pct.toFixed(2)}%
                </Mono>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: sam.red, fontWeight: 600, marginBottom: 6 }}>// losers</div>
            {losers.map((m) => (
              <div key={m.sym} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 5 }}>
                <Mono c={sam.text} b>
                  {m.sym}
                </Mono>
                <Mono c={sam.red} b>
                  {m.pct.toFixed(2)}%
                </Mono>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, color: sam.comment, marginBottom: 24 }}>
          {`// orders are simulated · not financial advice · do your own research`}
        </div>
      </div>
    </div>
  );
}
