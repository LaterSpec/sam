"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Prompt, TabBar } from "@/components/ui/sam-primitives";
import { accountColor, accountLabel } from "@/lib/accounts/account-types";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function AccountsScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const accounts = state.accounts || [];
  const total = accounts.reduce((a, x) => a + x.balance, 0);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar
        tabs={["home", "activity", "accounts"]}
        active="accounts"
        onChange={(t) => setState((s) => ({ ...s, homeTab: t }))}
      />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Accounts" cmd="ls --accounts" />
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: `1px solid ${sam.border}`,
            background: "rgba(88,166,255,0.04)",
          }}
        >
          <div style={{ fontSize: 11, color: sam.comment }}>
            <Mono c={sam.cyan}>∑</Mono> net_worth <Mono c={sam.comment}>--all</Mono>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: total >= 0 ? sam.cyan : sam.red,
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {total < 0 ? "-" : ""}$
            {Math.abs(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Accounts
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{accounts.length}] ▾</span>
          </div>
          {accounts.map((a) => {
            const color = accountColor(a.type);
            return (
              <div key={a.id} style={{ marginTop: 12 }}>
                <div
                  onClick={() => openSheet({ kind: "account", accountId: a.id })}
                  style={{
                    padding: 12,
                    border: `1px solid ${color}55`,
                    background: `${color}0d`,
                    cursor: "pointer",
                    transition: "all 160ms",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                    <Mono c={color} b>
                      {a.icon}
                    </Mono>
                    <Mono c={color} b>
                      {accountLabel(a.type)}
                    </Mono>
                    <Mono c={sam.text} b>
                      {a.name}
                    </Mono>
                    <span style={{ flex: 1 }} />
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: a.balance < 0 ? sam.red : color,
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 6,
                    }}
                  >
                    {a.balance < 0 ? "-" : ""}$
                    {Math.abs(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-account" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>[+ create account]</Mono>
          </span>
          <Mono c={sam.comment}> · </Mono>
          <span onClick={() => openSheet({ kind: "transfer" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.cyan}>[transfer]</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}

/** @deprecated use AccountsScreen */
export const CardsScreen = AccountsScreen;
