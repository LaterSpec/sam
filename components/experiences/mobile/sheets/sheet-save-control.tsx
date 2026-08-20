"use client";

import { LoaderCircle } from "lucide-react";
import { useSam } from "@/lib/theme/sam-theme";
import { useT } from "@/lib/i18n/i18n-context";

export function SheetSaveControl({
  enabled,
  busy,
  onSave,
  idleLabel,
  busyLabel,
}: {
  enabled: boolean;
  busy: boolean;
  onSave: () => void;
  idleLabel?: string;
  busyLabel?: string;
}) {
  const { sam } = useSam();
  const t = useT();
  const canPress = enabled && !busy;

  return (
    <button
      type="button"
      onClick={canPress ? onSave : undefined}
      disabled={!canPress}
      aria-busy={busy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        margin: 0,
        padding: 0,
        border: 0,
        background: "transparent",
        color: canPress || busy ? sam.green : sam.comment,
        fontFamily: sam.font,
        fontSize: 13,
        fontWeight: 600,
        cursor: canPress ? "pointer" : "default",
        pointerEvents: canPress ? "auto" : "none",
      }}
    >
      {busy ? <LoaderCircle size={12} className="sam-spin" aria-hidden /> : null}
      {busy ? busyLabel ?? t("[saving...]") : idleLabel ?? t("[save]")}
    </button>
  );
}
