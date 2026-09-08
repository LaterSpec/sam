export type SamyChartSpec = {
  type: "bar" | "line" | "donut";
  title?: string;
  unit?: string;
  items: Array<{ label: string; value: number }>;
};

export function parseSamyChart(source: string): SamyChartSpec | null {
  try {
    const parsed = JSON.parse(source) as Partial<SamyChartSpec>;
    if (parsed.type !== "bar" && parsed.type !== "line" && parsed.type !== "donut") return null;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    const items = parsed.items
      .map((item) => ({
        label: String(item?.label ?? "").slice(0, 40),
        value: Number(item?.value),
      }))
      .filter((item) => item.label && Number.isFinite(item.value))
      .slice(0, 20);
    if (!items.length) return null;
    return {
      type: parsed.type,
      title: typeof parsed.title === "string" ? parsed.title.slice(0, 80) : undefined,
      unit: typeof parsed.unit === "string" ? parsed.unit.slice(0, 12) : undefined,
      items,
    };
  } catch {
    return null;
  }
}

export function greetingPeriod(now: Date, timeZone: string): "morning" | "afternoon" | "evening" {
  let hour = now.getHours();
  try {
    const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).formatToParts(now);
    const found = parts.find((part) => part.type === "hour");
    if (found) hour = Number(found.value);
  } catch {
    hour = now.getHours();
  }
  if (hour < 12) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

export function safeMarkdownHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("#")) return href;
  try {
    const url = new URL(href, "https://sam.invalid");
    if (url.protocol === "http:" || url.protocol === "https:") return href;
  } catch {
    return undefined;
  }
  return undefined;
}

function byteLength(value: unknown): number {
  return JSON.stringify(value).length;
}

export function truncateToolResult(value: unknown, maxChars: number): unknown {
  if (byteLength(value) <= maxChars) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["transactions", "occurrences", "categories", "accounts", "items"]) {
      const list = record[key];
      if (!Array.isArray(list) || list.length === 0) continue;
      let keep = list.length;
      while (keep > 1) {
        keep = Math.max(1, Math.floor(keep / 2));
        const next = { ...record, [key]: list.slice(0, keep), truncated: true };
        if (byteLength(next) <= maxChars) return next;
      }
    }
  }
  return {
    truncated: true,
    message: "Result too large. Narrow the date range or lower the limit and retry.",
  };
}
