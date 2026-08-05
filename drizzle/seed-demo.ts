/**
 * Demo user seed.
 * Login: alex@sam.app / sam12345
 *
 * Requires: npm run db:push
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, and } from "drizzle-orm";
import { getDb, db } from "@/lib/db";
import {
  profiles,
  accounts,
  categories,
  transactions,
  goals,
  incomeSources,
  savingsBuckets,
  user,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";

const DEMO_EMAIL = "alex@sam.app";
const DEMO_PASSWORD = "sam12345";
const DEMO_NAME = "Alex Morris";

async function seedDemo() {
  getDb();

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, DEMO_EMAIL)).limit(1);

  let userId: string;
  if (existing[0]) {
    userId = existing[0].id;
    console.log(`User ${DEMO_EMAIL} already exists (${userId}), enriching data…`);
  } else {
    const res = await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME },
    });
    if (!res.user) throw new Error("signUp failed: " + JSON.stringify(res));
    userId = res.user.id;
    console.log(`✓ Created user ${DEMO_EMAIL}`);
  }

  await db
    .update(profiles)
    .set({
      fullName: DEMO_NAME,
      username: "alex_morris",
      streak: 17,
      memberSince: "2026-01-15",
    })
    .where(eq(profiles.id, userId));

  const accts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const cash = accts.find((a) => a.name === "Cash");
  const card = accts.find((a) => a.name === "Card");
  if (cash) {
    await db.update(accounts).set({ balance: "320", icon: "◉", color: "#56d364" }).where(eq(accounts.id, cash.id));
  }
  if (card) {
    await db
      .update(accounts)
      .set({ balance: "0", creditLimit: "2000", last4: "7741", icon: "▭", color: "#e3b341" })
      .where(eq(accounts.id, card.id));
  }

  const hasChecking = accts.some((a) => a.name === "Checking");
  if (!hasChecking) {
    await db.insert(accounts).values([
      { userId, name: "Checking", type: "checking", balance: "5240.30", last4: "4281", icon: "▤", color: "#58a6ff", sort: 2 },
      { userId, name: "Savings", type: "savings", balance: "2860.20", last4: "9920", icon: "⬢", color: "#bc8cff", sort: 3 },
    ]);
  }

  const cats = await db.select().from(categories).where(eq(categories.userId, userId));
  const catByKey = Object.fromEntries(cats.map((c) => [c.key, c]));
  const checking = (await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.name, "Checking"))))[0];

  const txCount = await db.select().from(transactions).where(eq(transactions.userId, userId));
  if (txCount.length === 0 && checking) {
    const expenses: Array<[string, string, string, string, string]> = [
      ["Starbucks", "6.50", "food", "☕", "2026-05-28T08:12:00Z"],
      ["Uber", "14.20", "transport", "▶", "2026-05-27T18:40:00Z"],
      ["Whole Foods", "87.40", "food", "🛒", "2026-05-26T19:05:00Z"],
      ["Netflix", "15.99", "subs", "⬡", "2026-05-25T06:00:00Z"],
      ["Spotify", "11.99", "subs", "⬡", "2026-05-24T06:00:00Z"],
      ["Chipotle", "14.50", "food", "🌯", "2026-05-23T13:20:00Z"],
      ["Movie night", "28.00", "ent", "✦", "2026-05-22T21:00:00Z"],
      ["Gas", "42.00", "transport", "▶", "2026-05-21T17:30:00Z"],
      ["Trader Joe's", "56.20", "food", "🛒", "2026-05-19T18:10:00Z"],
      ["Electric bill", "64.30", "housing", "⚡", "2026-05-15T09:00:00Z"],
      ["Gym", "39.00", "ent", "🏋", "2026-05-12T07:30:00Z"],
      ["Amazon", "23.99", "misc", "📦", "2026-05-10T14:45:00Z"],
      ["Lyft", "9.80", "transport", "▶", "2026-05-08T22:15:00Z"],
      ["Coffee beans", "18.40", "food", "☕", "2026-05-05T10:30:00Z"],
      ["Rent", "850.00", "housing", "🏠", "2026-05-01T08:00:00Z"],
    ];
    for (const [name, amount, key, icon, occurredAt] of expenses) {
      const cat = catByKey[key];
      await db.insert(transactions).values({
        userId,
        accountId: checking.id,
        categoryId: cat?.id ?? null,
        name,
        amount,
        kind: "expense",
        icon,
        occurredAt: new Date(occurredAt),
      });
    }
    await db.insert(transactions).values({
      userId,
      accountId: checking.id,
      name: "Acme Corp · payroll",
      amount: "3200",
      kind: "income",
      icon: "⬢",
      occurredAt: new Date("2026-05-01T09:00:00Z"),
    });
    console.log("✓ Seeded transactions");
  }

  const goalCount = await db.select().from(goals).where(eq(goals.userId, userId));
  if (goalCount.length === 0) {
    await db.insert(goals).values([
      { userId, name: "Emergency fund", icon: "🛡", color: "#e3b341", target: "10000", saved: "6400", eta: "Sep 2026", sort: 0 },
      { userId, name: "Trip to Japan", icon: "✈", color: "#58a6ff", target: "4500", saved: "1230", eta: "Mar 2027", sort: 1 },
      { userId, name: "New MacBook", icon: "◼", color: "#56d364", target: "2400", saved: "2400", eta: "done", done: true, sort: 2 },
      { userId, name: "House down payment", icon: "⌂", color: "#bc8cff", target: "30000", saved: "4100", eta: "2028", sort: 3 },
    ]);
    console.log("✓ Seeded goals");
  }

  const incomeCount = await db.select().from(incomeSources).where(eq(incomeSources.userId, userId));
  if (incomeCount.length === 0) {
    await db.insert(incomeSources).values([
      { userId, name: "Acme Corp · salary", amount: "3200", icon: "⬢", color: "#56d364", freq: "monthly", nextDate: "Jun 1", sort: 0 },
      { userId, name: "Freelance · design", amount: "450", icon: "◆", color: "#58a6ff", freq: "this month", nextDate: "—", sort: 1 },
      { userId, name: "Savings interest", amount: "28", icon: "◉", color: "#e3b341", freq: "monthly", nextDate: "Jun 15", sort: 2 },
    ]);
    console.log("✓ Seeded income sources");
  }

  const bucketCount = await db.select().from(savingsBuckets).where(eq(savingsBuckets.userId, userId));
  if (bucketCount.length === 0) {
    await db.insert(savingsBuckets).values([
      { userId, name: "Rainy day", icon: "☂", color: "#58a6ff", balance: "1850", target: "3000", sort: 0 },
      { userId, name: "Vacation", icon: "✈", color: "#bc8cff", balance: "620", target: "2000", sort: 1 },
      { userId, name: "Gadgets", icon: "◼", color: "#e3b341", balance: "280", target: "800", sort: 2 },
    ]);
    console.log("✓ Seeded savings buckets");
  }

  console.log(`\nDemo ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seedDemo()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
