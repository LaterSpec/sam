"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, BarH, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function GoalsScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = state.goals.reduce((a, g) => a + g.target, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const activeCount = state.goals.filter((g) => !g.done).length;

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["goals", "savings"]} active={state.goalsTab} onChange={(t) => setState((s) => ({ ...s, goalsTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Goals" cmd="status" />
        <Comment>
          {t("{n} goals tracked. {m} completed. tap any to contribute.", {
            n: state.goals.length,
            m: state.goals.filter((g) => g.done).length,
          })}
        </Comment>
        <div style={{ marginTop: 14, display: "flex", gap: 10, fontSize: 12, color: sam.comment }}>
          <span>
            ◎ <Mono c={sam.text} b>{activeCount}</Mono> {t("active")}
          </span>
          <span>
            ◆ <Mono c={sam.green} b>${totalSaved.toLocaleString()}</Mono> {t("saved")}
          </span>
        </div>
        <div style={{ marginTop: 14, padding: 12, border: `1px solid ${sam.border}` }}>
          <div style={{ fontSize: 11, color: sam.comment, marginBottom: 4 }}>// {t("total progress")}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <Mono c={sam.yellow} b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>
              ${totalSaved.toLocaleString()}
            </Mono>
            <Mono c={sam.comment}>
              {t("of")} ${totalTarget.toLocaleString()} · {overallPct}%
            </Mono>
          </div>
          <div style={{ marginTop: 8 }}>
            <BlockBar pct={overallPct} width={24} c={sam.yellow} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("All goals")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{state.goals.length}] ▾</span>
          </div>
          {state.goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / Math.max(1, g.target)) * 100));
            const isActive = state.selectedGoal === g.id;
            return (
              <div
                key={g.id}
                onClick={() => {
                  setState((s) => ({ ...s, selectedGoal: g.id }));
                  openSheet({ kind: "goal", goal: g });
                }}
                style={{
                  marginTop: 12,
                  padding: 10,
                  cursor: "pointer",
                  border: `1px solid ${isActive ? sam.yellow : sam.border}`,
                  background: isActive ? sam.active : sam.surface,
                  transition: "all 180ms",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                  <Mono c={g.done ? sam.green : isActive ? sam.yellow : sam.comment} b>
                    {g.done ? "[✓]" : isActive ? "[▸]" : "[ ]"}
                  </Mono>
                  <Mono c={g.c} b style={{ fontSize: 14 }}>
                    {g.icon}
                  </Mono>
                  <Mono c={sam.text} b>
                    {g.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={g.done ? sam.green : sam.comment}>{pct}%</Mono>
                </div>
                <div style={{ paddingLeft: 26, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: sam.comment, marginBottom: 4 }}>
                    <Mono c={g.done ? sam.green : sam.text}>${g.saved.toLocaleString()}</Mono>
                    <span> / ${g.target.toLocaleString()} · {t("eta")} </span>
                    <Mono c={g.done ? sam.green : sam.text}>{g.eta}</Mono>
                  </div>
                  <BarH pct={pct} c={g.done ? sam.green : g.c} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 18, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-goal" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>{t("[+ new goal]")}</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
