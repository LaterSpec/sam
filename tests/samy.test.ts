import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFinanceToolDefs } from "../lib/tools/catalog";
import { greetingPeriod, parseSamyChart, safeMarkdownHref, truncateToolResult } from "../lib/samy/parse";
import { isBlatantlyOffTopic, offTopicRefusal } from "../lib/samy/topic-guard";

describe("finance tool catalog", () => {
  it("exposes the shared MCP tool names", () => {
    const names = getFinanceToolDefs().map((def) => def.name);
    assert.equal(names.length, 37);
    assert.ok(names.includes("sam_get_latest_transaction"));
    assert.ok(names.includes("sam_get_spending_summary"));
    assert.ok(names.includes("sam_list_transactions"));
    assert.ok(names.includes("sam_transfer_between_accounts"));
    assert.equal(new Set(names).size, names.length);
  });
});

describe("topic guard", () => {
  it("lets finance questions through", () => {
    assert.equal(isBlatantlyOffTopic("en qué categoría gasto más este mes", false), false);
  });

  it("blocks a first-turn poem request", () => {
    assert.equal(isBlatantlyOffTopic("escribe un poema sobre el mar", false), true);
  });

  it("does not block follow-ups", () => {
    assert.equal(isBlatantlyOffTopic("escribe un poema sobre el mar", true), false);
  });

  it("returns a finance-only refusal", () => {
    assert.match(offTopicRefusal("es"), /ledger|gastos|SAM/i);
  });
});

describe("sam-chart parser", () => {
  it("parses a bar spec", () => {
    const spec = parseSamyChart(
      JSON.stringify({
        type: "bar",
        title: "Spend",
        unit: "PEN",
        items: [
          { label: "Food", value: 120 },
          { label: "Transport", value: 40 },
        ],
      })
    );
    assert.deepEqual(spec, {
      type: "bar",
      title: "Spend",
      unit: "PEN",
      items: [
        { label: "Food", value: 120 },
        { label: "Transport", value: 40 },
      ],
    });
  });

  it("rejects invalid json and empty items", () => {
    assert.equal(parseSamyChart("not-json"), null);
    assert.equal(parseSamyChart(JSON.stringify({ type: "bar", items: [] })), null);
  });
});

describe("greetingPeriod", () => {
  it("maps morning hours in Lima", () => {
    const morning = new Date("2026-09-07T14:00:00.000Z");
    assert.equal(greetingPeriod(morning, "America/Lima"), "morning");
  });
});

describe("safeMarkdownHref", () => {
  it("keeps http(s) and fragments", () => {
    assert.equal(safeMarkdownHref("https://example.com/x"), "https://example.com/x");
    assert.equal(safeMarkdownHref("#section"), "#section");
  });

  it("drops javascript and data urls", () => {
    assert.equal(safeMarkdownHref("javascript:alert(1)"), undefined);
    assert.equal(safeMarkdownHref("data:text/html,hi"), undefined);
  });
});

describe("truncateToolResult", () => {
  it("keeps valid JSON instead of slicing mid-string", () => {
    const value = {
      transactions: Array.from({ length: 40 }, (_, i) => ({ id: `tx-${i}`, name: "x".repeat(80), amount: i })),
    };
    const truncated = truncateToolResult(value, 400) as {
      truncated?: boolean;
      transactions?: unknown[];
      message?: string;
    };
    assert.equal(truncated.truncated, true);
    assert.ok(truncated.transactions || truncated.message);
    JSON.stringify(truncated);
  });
});

describe("destructive finance tools", () => {
  it("marks delete and transfer as destructive", () => {
    const defs = getFinanceToolDefs();
    const byName = Object.fromEntries(defs.map((def) => [def.name, def]));
    assert.equal(byName.sam_delete_expense.annotations?.destructiveHint, true);
    assert.equal(byName.sam_transfer_between_accounts.annotations?.destructiveHint, true);
  });
});
