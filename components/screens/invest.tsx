"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { PerfChart } from "@/components/charts/perf-chart";
import { buildPerfSeries } from "@/lib/charts/build-perf-series";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function InvestScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const holdings = state.holdings || [];
  const market = state.market || {};

  const priceOf = (h: (typeof holdings)[0]) => {
    const q = market[h.sym] as { price?: number } | undefined;
    return q && q.price != null ? q.price : h.avgCost;
  };
  const prevOf = (h: (typeof holdings)[0]) => {
    const q = market[h.sym] as { price?: number; prevClose?: number } | undefined;
    if (q && q.prevClose != null) return q.prevClose;
    return q && q.price != null ? q.price : h.avgCost;
  };

  const value = holdings.reduce((a, h) => a + h.qty * priceOf(h), 0);
  const prevValue = holdings.reduce((a, h) => a + h.qty * prevOf(h), 0);
  const cost = holdings.reduce((a, h) => a + h.qty * h.avgCost, 0);
  const dayGain = value - prevValue;
  const dayPct = prevValue > 0 ? (dayGain / prevValue) * 100 : 0;
  const totalPnl = value - cost;
  const totalPct = cost > 0 ? (totalPnl / cost) * 100 : 0;
  const dayUp = dayGain >= 0;

  const perf = holdings.length ? buildPerfSeries(state.portfolioSnapshots, value) : { points: [], intraday: false };
  const perfSeries = perf.points;
  const liveActive = !!(market as { __liveActive?: boolean }).__liveActive;

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["portfolio", "market", "analysis"]} active="portfolio" onChange={(t) => setState((s) => ({ ...s, investTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Invest" cmd="portfolio" />
        <Comment>
          {holdings.length} holdings · {liveActive ? "live feed" : "delayed"} · tap to buy/sell
        </Comment>
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: `1px solid ${sam.border}`,
            background: sam.overlay,
          }}
        >
          <div style={{ fontSize: 11, color: sam.comment }}>
            <Mono c={sam.cyan}>◇</Mono> portfolio_value
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: sam.cyan, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            ${Math.floor(value).toLocaleString()}
            <span style={{ color: sam.comment, fontSize: 20 }}>
              .{String(Math.round((value % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
          {holdings.length > 0 ? (
            <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: dayUp ? sam.green : sam.red }}>
                {dayUp ? "+" : "-"}${Math.abs(dayGain).toFixed(2)} today{" "}
                <Mono c={dayUp ? sam.green : sam.red}>
                  {dayUp ? "▲" : "▼"} {Math.abs(dayPct).toFixed(2)}%
                </Mono>
              </span>
              <span style={{ fontSize: 11, color: sam.comment }}>
                P&L{" "}
                <Mono c={totalPnl >= 0 ? sam.green : sam.red} b>
                  {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)} ({totalPct >= 0 ? "+" : ""}
                  {totalPct.toFixed(2)}%)
                </Mono>
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: sam.comment, marginTop: 6 }}>
              {`// $0 invested · buy from the market tab to start`}
            </div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600, marginBottom: 8 }}>
            ▸ performance
            <Mono c={sam.comment} style={{ fontWeight: 400, marginLeft: 8, fontSize: 10 }}>
              {perf.intraday ? "today · ~10m points" : "since day 0 · daily"}
            </Mono>
          </div>
          {perfSeries.length >= 2 ? (
            <div style={{ border: `1px solid ${sam.border}`, background: sam.overlay, padding: "8px 6px 2px" }}>
              <PerfChart points={perfSeries} height={160} intraday={perf.intraday} />
            </div>
          ) : (
            <div
              style={{
                border: `1px dashed ${sam.border}`,
                padding: "26px 12px",
                textAlign: "center",
                color: sam.comment,
                fontSize: 12,
              }}
            >
              {"// "}your value chart starts when you buy · it grows from there
            </div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Holdings
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{holdings.length}] ▾</span>
          </div>
          {holdings.length === 0 && (
            <div
              style={{
                marginTop: 10,
                padding: "20px 12px",
                textAlign: "center",
                border: `1px dashed ${sam.border}`,
                color: sam.comment,
                fontSize: 12,
              }}
            >
              // no positions · open the market tab and tap a ticker to buy
            </div>
          )}
          {holdings.map((h, i) => {
            const q = (market[h.sym] || {}) as { price?: number; pct?: number };
            const price = q.price != null ? q.price : h.avgCost;
            const pct = q.pct || 0;
            const val = h.qty * price;
            const up = pct >= 0;
            const isLast = i === holdings.length - 1;
            return (
              <div
                key={h.sym}
                onClick={() => openSheet({ kind: "trade", holding: h })}
                style={{ marginTop: 10, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginLeft: -6, marginRight: -6 }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono c={sam.yellow} b>
                    {h.sym}
                  </Mono>
                  <Mono c={sam.comment}>{h.name}</Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={up ? sam.green : sam.red} b>
                    {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: sam.comment, marginTop: 2 }}>
                  {h.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })} @ $
                  {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {" · "}
                  <Mono c={sam.text}>${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Mono>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, fontSize: 10, color: sam.comment }}>
          {liveActive
            ? `// live feed active · simulated positions · not financial advice`
            : `// data delayed / last close · simulated positions · not financial advice`}
        </div>
      </div>
    </div>
  );
}
