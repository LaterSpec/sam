"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n/i18n-context";

export function LanguageToggle({
  value,
  onChange,
  size = "sm",
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
  size?: "sm" | "md";
}) {
  const { sam } = useSam();
  const fontSize = size === "md" ? 12 : 11;
  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        border: `1px solid ${sam.border}`,
        borderRadius: 6,
        padding: 2,
        background: sam.input,
        fontFamily: sam.font,
      }}
    >
      {SUPPORTED_LANGS.map((l) => {
        const active = l.code === value;
        return (
          <button
            key={l.code}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(l.code)}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: 4,
              padding: size === "md" ? "4px 9px" : "3px 7px",
              fontFamily: sam.font,
              fontSize,
              fontWeight: active ? 700 : 500,
              letterSpacing: 0.4,
              color: active ? sam.bg : sam.comment,
              background: active ? sam.accent : "transparent",
              transition: "background 160ms ease-out, color 160ms ease-out",
            }}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}
