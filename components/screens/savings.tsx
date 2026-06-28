"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BarH, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function SavingsScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const buckets = state.buckets;
  const total = buckets.reduce((a, b) => a + b.balance, 0);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["goals", "savings"]} active="savings" onChange={(t) => setState((s) => ({ ...s, goalsTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Savings" cmd="buckets" />
        <Comment>{t("{n} configured buckets", { n: buckets.length })}</Comment>
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: `1px solid ${sam.green}33`,
            background: sam.overlay,
          }}
        >
          <div style={{ fontSize: 11, color: sam.comment }}>
            <Mono c={sam.green}>◉</Mono> total_saved
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: sam.green, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            ${total.toLocaleString()}
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("Buckets")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{buckets.length}] ▾</span>
          </div>
          {buckets.map((b) => (
            <div
              key={b.id}
              onClick={() => openSheet({ kind: "bucket", bucket: b })}
              style={{
                marginTop: 10,
                padding: 10,
                cursor: "pointer",
                border: `1px solid ${sam.border}`,
                transition: "all 140ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                <Mono c={b.c} b>
                  {b.icon}
                </Mono>
                <Mono c={sam.text} b>
                  {b.name}
                </Mono>
                <span style={{ flex: 1 }} />
                <Mono c={b.c} b style={{ fontVariantNumeric: "tabular-nums" }}>
                  ${b.balance.toLocaleString()}
                </Mono>
              </div>
              <div style={{ paddingLeft: 2, marginTop: 6 }}>
                <BarH pct={Math.min(100, (b.balance / b.target) * 100)} c={b.c} />
                <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
                  {t("target")} ${b.target.toLocaleString()} · {Math.round((b.balance / b.target) * 100)}% · apy {b.apy}%
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <Mono c={sam.green} b>{t("[+ new bucket]")}</Mono>
        </div>
      </div>
    </div>
  );
}
