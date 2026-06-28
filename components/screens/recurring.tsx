"use client";

import { useMemo, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import {
  Comment,
  Mono,
  Prompt,
  ScreenHeader,
  TabBar,
  userHandleFromState,
} from "@/components/ui/sam-primitives";
import { formatMoney } from "@/lib/finance/currency";
import { useT } from "@/lib/i18n/i18n-context";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

type Filter = "all" | "expense" | "income" | "paused" | "failed";

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function RecurringScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const failedRuleIds = useMemo(
    () =>
      new Set(
        state.recurringOccurrences
          .filter((occurrence) => occurrence.status === "failed")
          .map((occurrence) => occurrence.ruleId)
      ),
    [state.recurringOccurrences]
  );
  const rules = useMemo(() => {
    const visible = state.recurringRules.filter((rule) => rule.status !== "archived");
    if (filter === "all") return visible;
    if (filter === "paused") return visible.filter((rule) => rule.status === "paused");
    if (filter === "failed") return visible.filter((rule) => failedRuleIds.has(rule.id));
    return visible.filter((rule) => rule.kind === filter);
  }, [failedRuleIds, filter, state.recurringRules]);
  const upcoming = state.recurringRules.filter((rule) => {
    const days = daysUntil(rule.nextOccurrenceDate);
    return rule.status === "active" && days >= 0 && days <= 30;
  });

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar
          tabs={["expenses", "income", "recurring", "budget"]}
          active="recurring"
          onChange={(tab) => setState((current) => ({ ...current, expTab: tab }))}
        />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Recurring" cmd="schedule --list" />
        <Comment>
          {t("{active} active · {upcoming} due in the next 30 days", {
            active: state.recurringRules.filter((rule) => rule.status === "active").length,
            upcoming: upcoming.length,
          })}
        </Comment>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
          {(["all", "expense", "income", "paused", "failed"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              style={{
                border: `1px solid ${filter === item ? sam.cyan : sam.border}`,
                background: filter === item ? sam.active : "transparent",
                color: filter === item ? sam.cyan : sam.comment,
                padding: "5px 8px",
                fontFamily: sam.font,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              [{t(item)}]
            </button>
          ))}
        </div>

        {rules.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              border: `1px dashed ${sam.border}`,
              padding: "22px 14px",
              textAlign: "center",
            }}
          >
            <Mono c={sam.comment}>// {t("no recurring movements configured")}</Mono>
            <button
              type="button"
              onClick={() => openSheet({ kind: "new-recurring" })}
              style={{
                display: "block",
                margin: "14px auto 0",
                border: 0,
                background: "transparent",
                color: sam.green,
                fontFamily: sam.font,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("[create recurring movement]")}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <div style={{ color: sam.cyan, fontSize: 13, fontWeight: 700 }}>
              ▸ {t("Recurring movements")}
              <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>
                [{rules.length}]
              </span>
            </div>
            {rules.map((rule, index) => {
              const failed = failedRuleIds.has(rule.id);
              const statusColor =
                failed || rule.needsReview
                  ? sam.red
                  : rule.status === "paused"
                    ? sam.yellow
                    : sam.green;
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => openSheet({ kind: "recurring-rule", ruleId: rule.id })}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "10px 10px",
                    border: `1px solid ${failed ? `${sam.red}88` : sam.border}`,
                    background: failed ? `${sam.red}0d` : sam.surface,
                    color: sam.text,
                    fontFamily: sam.font,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7, fontSize: 13 }}>
                    <Mono c={sam.comment}>{index === rules.length - 1 ? "└─" : "├─"}</Mono>
                    <Mono c={rule.kind === "income" ? sam.green : sam.red}>
                      {rule.kind === "income" ? "[+]" : "[-]"}
                    </Mono>
                    <Mono b>{rule.name}</Mono>
                    <span style={{ flex: 1 }} />
                    <Mono c={rule.kind === "income" ? sam.green : sam.red} b>
                      {formatMoney(rule.amount, rule.accountCurrency)}
                    </Mono>
                  </div>
                  <div
                    style={{
                      paddingLeft: 27,
                      marginTop: 4,
                      display: "flex",
                      gap: 6,
                      fontSize: 10,
                      color: sam.comment,
                    }}
                  >
                    <span>{rule.accountName}</span>
                    <span>·</span>
                    <span>{t("next")} {rule.nextOccurrenceDate}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: statusColor }}>
                      {rule.needsReview
                        ? `! ${t("review")}`
                        : failed
                        ? `! ${t("failed")}`
                        : `${rule.status === "paused" ? "Ⅱ" : "●"} ${t(
                            rule.status === "paused" ? "paused status" : "active status"
                          )}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => openSheet({ kind: "new-recurring" })}
          style={{
            marginTop: 18,
            padding: 0,
            border: 0,
            background: "transparent",
            color: sam.green,
            fontFamily: sam.font,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t("[+ recurring movement]")}
        </button>
      </div>
    </div>
  );
}
