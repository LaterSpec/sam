import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { budgetRows, expenseCategoryOptions } from "../components/experiences/desktop/desktop-data";
import type { AppState } from "../lib/db/queries/load-user-data";

const now = new Date().toISOString();

function state(): AppState {
  return {
    budgets: [
      { id: "usd", key: "food-usd", name: "Food", icon: "●", c: "#fff", cap: 100, currency: "USD" },
      { id: "pen", key: "food-pen", name: "Comida", icon: "●", c: "#fff", cap: 80, currency: "PEN" },
    ],
    expenses: [
      {
        id: "e1",
        name: "Lunch",
        amount: 12,
        category: "Food",
        catKey: "food-usd",
        catColor: "#fff",
        icon: "●",
        time: now,
        occurred_at: now,
        kind: "expense",
        currency: "USD",
      },
      {
        id: "e2",
        name: "Almuerzo",
        amount: 20,
        category: "Comida",
        catKey: "food-pen",
        catColor: "#fff",
        icon: "●",
        time: now,
        occurred_at: now,
        kind: "expense",
        currency: "PEN",
      },
    ],
    incomeTx: [],
    accounts: [],
  } as unknown as AppState;
}

describe("budget currency", () => {
  it("shows only the budgets of the selected currency", () => {
    const usd = budgetRows(state(), "USD");
    const pen = budgetRows(state(), "PEN");
    assert.deepEqual(usd.map((row) => row.name), ["Food"]);
    assert.equal(usd[0]?.spent, 12);
    assert.deepEqual(pen.map((row) => row.name), ["Comida"]);
    assert.equal(pen[0]?.spent, 20);
  });

  it("offers expense categories only in the active currency", () => {
    assert.deepEqual(expenseCategoryOptions(state(), "PEN").map((row) => row.key), ["food-pen"]);
  });
});
