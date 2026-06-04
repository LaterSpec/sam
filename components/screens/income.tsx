"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar } from "@/components/ui/sam-primitives";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function IncomeScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const sources = state.incomeSources;
  const total = sources.reduce((a, s) => a + s.amt, 0);
  const values = [2850, 2980, 2920, 3100, 3050, total];
  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const max = Math.max(...values);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar tabs={["expenses", "income", "budget"]} active="income" onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Income" cmd="sources" />
        <Comment>
          {sources.length} sources · {sources.filter((s) => s.freq !== "one-time").length} recurring · projected +$
          {total.toLocaleString()} this month
        </Comment>
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: `1px solid ${sam.green}33`,
            background: "rgba(86,211,100,0.04)",
          }}
        >
          <div style={{ fontSize: 11, color: sam.comment }}>
            <Mono c={sam.green}>+</Mono> total_income <Mono c={sam.comment}>--month</Mono>
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: sam.green,
              letterSpacing: -0.5,
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            +${total.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
            +12.4% <Mono c={sam.green}>▲</Mono> vs last month
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600 }}>▸ last 6 months</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 72 }}>
              {values.map((v, i) => {
                const h = Math.max(6, Math.round((v / max) * 64));
                const active = i === values.length - 1;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        height: h,
                        background: active ? sam.green : sam.textDim,
                        opacity: active ? 1 : 0.3,
                        borderTop: active ? `2px solid ${sam.green}` : "none",
                        transition: "height 420ms cubic-bezier(.2,.9,.2,1)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {labels.map((l, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: i === 5 ? 600 : 400,
                    color: i === 5 ? sam.green : sam.comment,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              {values.map((v, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 9,
                    fontVariantNumeric: "tabular-nums",
                    color: i === 5 ? sam.text : sam.comment,
                    opacity: i === 5 ? 1 : 0.6,
                  }}
                >
                  {(v / 1000).toFixed(1)}k
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Sources
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{sources.length}] ▾</span>
          </div>
          <Comment>tap to view payment history</Comment>
          {sources.map((s, i) => {
            const isLast = i === sources.length - 1;
            return (
              <div
                key={s.id}
                onClick={() => openSheet({ kind: "income-src", src: s })}
                style={{ marginTop: 12, padding: "6px 8px", marginLeft: -8, marginRight: -8, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono c={s.c}>{s.icon}</Mono>
                  <Mono c={sam.text} b>
                    {s.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={sam.green} b>
                    +${s.amt.toLocaleString()}
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: sam.comment, marginTop: 2 }}>
                  {`// ${s.freq} · next ${s.next}`}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-income" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>[+ new source]</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
