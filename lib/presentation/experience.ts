export type SamExperience = "mobile" | "desktop";

export const DESKTOP_SECTIONS = [
  "overview",
  "transactions",
  "income",
  "expenses",
  "budgets",
  "accounts",
  "goals",
  "recurring",
  "reports",
  "activity",
  "settings",
] as const;

export type DesktopSection = (typeof DESKTOP_SECTIONS)[number];

export function isDesktopSection(value: string): value is DesktopSection {
  return (DESKTOP_SECTIONS as readonly string[]).includes(value);
}

type HeaderReader = Pick<Headers, "get">;

const PHONE_UA = [
  /iphone/i,
  /ipod/i,
  /windows phone/i,
  /android.+mobile/i,
  /mobile.+firefox/i,
  /opera mini/i,
];

const TABLET_UA = [/ipad/i, /tablet/i, /android(?!.*mobile)/i, /silk/i];

/**
 * Resolve the UI tree from request capabilities. Viewport width is
 * intentionally excluded so resizing a desktop window never swaps React trees.
 */
export function resolveSamExperience(headers: HeaderReader): SamExperience {
  const mobileHint = headers.get("sec-ch-ua-mobile")?.trim();
  if (mobileHint === "?1") return "mobile";
  if (mobileHint === "?0") return "desktop";

  const userAgent = headers.get("user-agent") ?? "";
  if (TABLET_UA.some((pattern) => pattern.test(userAgent))) return "desktop";
  return PHONE_UA.some((pattern) => pattern.test(userAgent)) ? "mobile" : "desktop";
}

export function desktopExperienceEnabled(): boolean {
  return process.env.SAM_DESKTOP_UI_ENABLED !== "false";
}
