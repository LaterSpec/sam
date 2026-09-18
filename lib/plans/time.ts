export type MeteringWindow = {
  key: string;
  start: Date;
  end: Date;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let value = formatterCache.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, value);
  }
  return value;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function partsInTimeZone(date: Date, timeZone: string): DateParts {
  const values = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function zonedDateToUtc(parts: DateParts, timeZone: string): Date {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let candidate = new Date(target);
  for (let pass = 0; pass < 3; pass += 1) {
    const observed = partsInTimeZone(candidate, timeZone);
    const observedUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    );
    const delta = target - observedUtc;
    if (delta === 0) break;
    candidate = new Date(candidate.getTime() + delta);
  }
  return candidate;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function minuteWindow(date: Date, timeZone: string): MeteringWindow {
  const p = partsInTimeZone(date, timeZone);
  const start = zonedDateToUtc({ ...p, second: 0 }, timeZone);
  return {
    key: `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`,
    start,
    end: new Date(start.getTime() + 60_000),
  };
}

export function dayWindow(date: Date, timeZone: string): MeteringWindow {
  const p = partsInTimeZone(date, timeZone);
  const start = zonedDateToUtc({ ...p, hour: 0, minute: 0, second: 0 }, timeZone);
  const nextLocal = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  const end = zonedDateToUtc(
    {
      year: nextLocal.getUTCFullYear(),
      month: nextLocal.getUTCMonth() + 1,
      day: nextLocal.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  );
  return { key: `${p.year}-${pad(p.month)}-${pad(p.day)}`, start, end };
}

export function monthWindow(date: Date, timeZone: string): MeteringWindow {
  const p = partsInTimeZone(date, timeZone);
  const start = zonedDateToUtc(
    { year: p.year, month: p.month, day: 1, hour: 0, minute: 0, second: 0 },
    timeZone
  );
  const next = p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 };
  const end = zonedDateToUtc(
    { year: next.year, month: next.month, day: 1, hour: 0, minute: 0, second: 0 },
    timeZone
  );
  return { key: `${p.year}-${pad(p.month)}`, start, end };
}
