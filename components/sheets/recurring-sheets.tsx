"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ClientAppState, SheetPayload } from "@/components/screens/types";
import { Comment, Mono } from "@/components/ui/sam-primitives";
import { useSam } from "@/lib/theme/sam-theme";
import { useT } from "@/lib/i18n/i18n-context";
import {
  archiveRecurringRuleAction,
  createRecurringRuleAction,
  pauseRecurringRuleAction,
  resumeRecurringRuleAction,
  retryRecurringOccurrenceAction,
  updateRecurringRuleAction,
} from "@/lib/actions/recurring-actions";
import { fetchUserDataAction } from "@/lib/actions/data-actions";
import {
  countOccurrencesThrough,
  previewOccurrences,
  todayInTimeZone,
  type RecurrenceUnit,
} from "@/lib/finance/recurrence";

type Props = {
  sheet: Extract<SheetPayload, { kind: "new-recurring" | "recurring-rule" }>;
  state: ClientAppState;
  setState: Dispatch<SetStateAction<ClientAppState>>;
  onClose: () => void;
};

type Kind = "expense" | "income";

export function RecurringSheet({ sheet, state, setState, onClose }: Props) {
  const { sam } = useSam();
  const t = useT();
  const existing =
    sheet.kind === "recurring-rule"
      ? state.recurringRules.find((rule) => rule.id === sheet.ruleId)
      : undefined;
  const defaultAccount = state.accounts[0];
  const defaultCategory = state.budgets[0];
  const [kind, setKind] = useState<Kind>(existing?.kind ?? "expense");
  const [name, setName] = useState(existing?.name ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [accountId, setAccountId] = useState(existing?.accountId ?? defaultAccount?.id ?? "");
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? defaultCategory?.id ?? ""
  );
  const [unit, setUnit] = useState<RecurrenceUnit>(existing?.frequencyUnit ?? "month");
  const [interval, setIntervalValue] = useState(existing?.frequencyInterval ?? 1);
  const [startDate, setStartDate] = useState(
    existing?.startDate ?? todayInTimeZone("America/Lima")
  );
  const [endDate, setEndDate] = useState(existing?.endDate ?? "");
  const [timezone, setTimezone] = useState(existing?.timezone ?? "America/Lima");
  const [confirmCatchUp, setConfirmCatchUp] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const previews = useMemo(() => {
    try {
      return previewOccurrences({
        startDate,
        unit,
        interval,
        endDate: endDate || null,
        limit: 6,
      });
    } catch {
      return [];
    }
  }, [endDate, interval, startDate, unit]);
  const today = todayInTimeZone(timezone);
  const catchUpCount = useMemo(() => {
    if (existing) return 0;
    try {
      return countOccurrencesThrough({
        startDate,
        unit,
        interval,
        throughDate: today,
        endDate: endDate || null,
        cap: 100,
      });
    } catch {
      return 0;
    }
  }, [endDate, existing, interval, startDate, today, unit]);
  const parsedAmount = Number(amount);
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    Boolean(accountId) &&
    (kind === "income" || Boolean(categoryId)) &&
    interval >= 1 &&
    Boolean(startDate) &&
    (!endDate || endDate >= startDate) &&
    (!catchUpCount || confirmCatchUp);
  const occurrences = existing
    ? state.recurringOccurrences.filter((occurrence) => occurrence.ruleId === existing.id)
    : [];

  const refresh = async () => {
    const data = await fetchUserDataAction();
    if (data) setState((current) => ({ ...current, ...data }));
  };

  const save = async () => {
    if (!canSave || busy) return;
    setBusy("save");
    setError("");
    try {
      const payload = {
        kind,
        name: name.trim(),
        amount: parsedAmount,
        accountId,
        categoryId: kind === "expense" ? categoryId : null,
        frequencyUnit: unit,
        frequencyInterval: interval,
        startDate,
        endDate: endDate || null,
        timezone,
      };
      if (existing) {
        await updateRecurringRuleAction({ id: existing.id, ...payload });
      } else {
        await createRecurringRuleAction({ ...payload, confirmCatchUp });
      }
      await refresh();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("could not save"));
    } finally {
      setBusy("");
    }
  };

  const changeStatus = async (action: "pause" | "resume" | "archive") => {
    if (!existing || busy) return;
    setBusy(action);
    setError("");
    try {
      if (action === "pause") await pauseRecurringRuleAction(existing.id);
      if (action === "resume") await resumeRecurringRuleAction(existing.id);
      if (action === "archive") await archiveRecurringRuleAction(existing.id);
      await refresh();
      if (action === "archive") onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("could not save"));
    } finally {
      setBusy("");
    }
  };

  const retry = async (id: string) => {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      await retryRecurringOccurrenceAction(id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("retry failed"));
    } finally {
      setBusy("");
    }
  };

  const fieldStyle = {
    width: "100%",
    marginTop: 6,
    padding: "9px 10px",
    border: `1px solid ${sam.border}`,
    background: sam.bgAlt,
    color: sam.text,
    fontFamily: sam.font,
    fontSize: 13,
    outline: "none",
  } as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={Boolean(busy)}
          style={{ border: 0, background: "transparent", color: sam.comment, fontFamily: sam.font }}
        >
          {t("[cancel]")}
        </button>
        <Mono c={sam.cyan} b style={{ flex: 1, textAlign: "center" }}>
          {existing ? "$ recurring --edit" : "$ recurring --new"}
        </Mono>
        <button
          type="button"
          onClick={save}
          disabled={!canSave || Boolean(busy)}
          style={{
            border: 0,
            background: "transparent",
            color: canSave && !busy ? sam.green : sam.comment,
            fontFamily: sam.font,
            fontWeight: 700,
          }}
        >
          {busy === "save" ? t("[saving...]") : t("[save]")}
        </button>
      </div>

      {existing && (
        <Comment>{t("changes apply only to future occurrences")}</Comment>
      )}
      {existing?.needsReview && (
        <div style={{ marginTop: 8, color: sam.yellow, fontSize: 11 }}>
          ! {t("review account and schedule, then save before resuming")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        {(["expense", "income"] as Kind[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            style={{
              padding: 9,
              border: `1px solid ${kind === value ? (value === "income" ? sam.green : sam.red) : sam.border}`,
              background: kind === value ? sam.active : "transparent",
              color: kind === value ? (value === "income" ? sam.green : sam.red) : sam.comment,
              fontFamily: sam.font,
              cursor: "pointer",
            }}
          >
            [{value === "income" ? "+" : "-"}] {t(value)}
          </button>
        ))}
      </div>

      <label style={{ display: "block", marginTop: 14 }}>
        <Comment>{t("name")}</Comment>
        <input value={name} onChange={(event) => setName(event.target.value)} style={fieldStyle} />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        <Comment>{t("amount")}</Comment>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
          style={fieldStyle}
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        <Comment>{t("account")}</Comment>
        <select value={accountId} onChange={(event) => setAccountId(event.target.value)} style={fieldStyle}>
          {state.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
      </label>

      {kind === "expense" && (
        <label style={{ display: "block", marginTop: 12 }}>
          <Comment>{t("category")}</Comment>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            style={fieldStyle}
          >
            {state.budgets.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, marginTop: 12 }}>
        <label>
          <Comment>{t("every")}</Comment>
          <input
            type="number"
            min={1}
            max={365}
            value={interval}
            onChange={(event) => setIntervalValue(Math.max(1, Number(event.target.value) || 1))}
            style={fieldStyle}
          />
        </label>
        <label>
          <Comment>{t("frequency")}</Comment>
          <select value={unit} onChange={(event) => setUnit(event.target.value as RecurrenceUnit)} style={fieldStyle}>
            {(["day", "week", "month", "year"] as RecurrenceUnit[]).map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <label>
          <Comment>{t("start date")}</Comment>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={fieldStyle} />
        </label>
        <label>
          <Comment>{t("end date (optional)")}</Comment>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={fieldStyle} />
        </label>
      </div>

      <label style={{ display: "block", marginTop: 12 }}>
        <Comment>{t("timezone")}</Comment>
        <select value={timezone} onChange={(event) => setTimezone(event.target.value)} style={fieldStyle}>
          <option value="America/Lima">America/Lima</option>
          <option value="America/Mexico_City">America/Mexico_City</option>
          <option value="America/Bogota">America/Bogota</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Europe/Madrid">Europe/Madrid</option>
          <option value="UTC">UTC</option>
        </select>
      </label>

      <div style={{ marginTop: 14, padding: 10, border: `1px dashed ${sam.border}` }}>
        <Mono c={sam.cyan} b>{t("next dates")}</Mono>
        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {previews.map((date) => (
            <Mono key={date} c={sam.comment}>[{date}]</Mono>
          ))}
        </div>
      </div>

      {catchUpCount > 0 && (
        <label
          style={{
            display: "block",
            marginTop: 12,
            padding: 10,
            border: `1px solid ${sam.yellow}`,
            color: sam.yellow,
            fontSize: 11,
          }}
        >
          <input
            type="checkbox"
            checked={confirmCatchUp}
            onChange={(event) => setConfirmCatchUp(event.target.checked)}
            style={{ marginRight: 8 }}
          />
          {t("confirm posting {count} due movements totaling {total}", {
            count: catchUpCount,
            total: (catchUpCount * (Number.isFinite(parsedAmount) ? parsedAmount : 0)).toFixed(2),
          })}
        </label>
      )}

      {error && <div style={{ color: sam.red, fontSize: 11, marginTop: 10 }}>! {error}</div>}

      {existing && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {existing.status === "active" ? (
              <button
                type="button"
                onClick={() => changeStatus("pause")}
                disabled={Boolean(busy)}
                style={{ flex: 1, padding: 9, border: `1px solid ${sam.yellow}`, background: "transparent", color: sam.yellow, fontFamily: sam.font }}
              >
                {busy === "pause" ? "..." : t("[pause]")}
              </button>
            ) : existing.status === "paused" && !existing.needsReview ? (
              <button
                type="button"
                onClick={() => changeStatus("resume")}
                disabled={Boolean(busy)}
                style={{ flex: 1, padding: 9, border: `1px solid ${sam.green}`, background: "transparent", color: sam.green, fontFamily: sam.font }}
              >
                {busy === "resume" ? "..." : t("[resume]")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                confirmArchive ? changeStatus("archive") : setConfirmArchive(true)
              }
              disabled={Boolean(busy)}
              style={{ flex: 1, padding: 9, border: `1px solid ${sam.red}`, background: confirmArchive ? sam.red : "transparent", color: confirmArchive ? sam.bg : sam.red, fontFamily: sam.font }}
            >
              {busy === "archive"
                ? "..."
                : confirmArchive
                  ? t("[confirm archive]")
                  : t("[archive]")}
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <Mono c={sam.cyan} b>▸ {t("Occurrence history")}</Mono>
            {occurrences.length === 0 && (
              <div style={{ marginTop: 8, color: sam.comment, fontSize: 11 }}>
                // {t("no occurrences yet")}
              </div>
            )}
            {occurrences.map((occurrence) => {
              const color =
                occurrence.status === "posted"
                  ? sam.green
                  : occurrence.status === "failed"
                    ? sam.red
                    : sam.comment;
              return (
                <div key={occurrence.id} style={{ marginTop: 8, padding: 9, border: `1px solid ${sam.border}`, fontSize: 11 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Mono c={color}>
                      {occurrence.status === "posted" ? "✓" : occurrence.status === "failed" ? "!" : "○"} {t(occurrence.status)}
                    </Mono>
                    <span style={{ flex: 1 }} />
                    <Mono c={sam.comment}>{occurrence.scheduledDate}</Mono>
                  </div>
                  {occurrence.errorMessage && (
                    <div style={{ marginTop: 4, color: sam.comment }}>
                      // {t(occurrence.errorMessage)}
                    </div>
                  )}
                  {occurrence.transactionId && (
                    <div style={{ marginTop: 4, color: sam.comment }}>
                      tx {occurrence.transactionId.slice(0, 8)}
                    </div>
                  )}
                  {occurrence.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => retry(occurrence.id)}
                      disabled={Boolean(busy)}
                      style={{ marginTop: 6, padding: 0, border: 0, background: "transparent", color: sam.green, fontFamily: sam.font, cursor: "pointer" }}
                    >
                      {busy === occurrence.id ? t("[retrying...]") : t("[retry]")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
