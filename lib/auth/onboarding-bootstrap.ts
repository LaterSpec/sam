import { db } from "@/lib/db";
import {
  profiles,
  accounts,
  categories,
} from "@/lib/db/schema";

const BASE_CATEGORIES = [
  { key: "food", name: "Food & Dining", icon: "◉", color: "#e8824a", monthlyCap: "400", sort: 0 },
  { key: "housing", name: "Housing", icon: "▣", color: "#58a6ff", monthlyCap: "1200", sort: 1 },
  { key: "transport", name: "Transport", icon: "◈", color: "#56d364", monthlyCap: "200", sort: 2 },
  { key: "subs", name: "Subscriptions", icon: "◎", color: "#bc8cff", monthlyCap: "80", sort: 3 },
  { key: "ent", name: "Entertainment", icon: "◆", color: "#e3b341", monthlyCap: "150", sort: 4 },
  { key: "misc", name: "Miscellaneous", icon: "●", color: "#8b949e", monthlyCap: "100", sort: 5 },
];

export async function bootstrapNewUser(userId: string, name: string, email: string) {
  const displayName = name || email.split("@")[0] || "there";

  await db.insert(profiles).values({
    id: userId,
    fullName: displayName,
    username: null,
  });

  await db.insert(accounts).values([
    { userId, name: "Cash", type: "cash", balance: "0", icon: "◉", color: "#56d364", sort: 0 },
    { userId, name: "Card", type: "card", balance: "0", icon: "▣", color: "#58a6ff", sort: 1 },
  ]);

  await db.insert(categories).values(
    BASE_CATEGORIES.map((c) => ({
      userId,
      key: c.key,
      name: c.name,
      icon: c.icon,
      color: c.color,
      monthlyCap: c.monthlyCap,
      sort: c.sort,
    }))
  );

}
