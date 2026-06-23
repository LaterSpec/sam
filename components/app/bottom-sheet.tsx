"use client";

import { useEffect, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { SheetContent } from "@/components/sheets/sheet-content";
import type { ClientAppState, SheetPayload } from "@/components/screens/types";
import type { Dispatch, SetStateAction } from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function BottomSheet({
  sheet,
  onClose,
  state,
  setState,
  openSheet,
}: {
  sheet: SheetPayload | null;
  onClose: () => void;
  state: ClientAppState;
  setState: Dispatch<SetStateAction<ClientAppState>>;
  openSheet: (sheet: SheetPayload | null) => void;
}) {
  const { sam } = useSam();
  const reducedMotion = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, reducedMotion ? 0 : 220);
  };

  useEffect(() => {
    if (!sheet || reducedMotion) {
      setOpening(false);
      return;
    }
    setOpening(true);
    const frame = window.requestAnimationFrame(() => setOpening(false));
    return () => window.cancelAnimationFrame(frame);
  }, [sheet, reducedMotion]);

  if (!sheet) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        role="presentation"
        onClick={close}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          opacity: closing || opening ? 0 : 1,
          transition: reducedMotion ? "none" : "opacity 220ms",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: sam.sheet,
          borderTop: `1px solid ${sam.borderStrong}`,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: "16px 18px max(30px, env(safe-area-inset-bottom))",
          fontFamily: sam.font,
          color: sam.text,
          transform: closing || opening ? "translateY(100%)" : "translateY(0)",
          transition: reducedMotion ? "none" : "transform 260ms cubic-bezier(.2,.9,.2,1)",
          maxHeight: "85%",
          overflowY: "auto",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: sam.border,
            borderRadius: 2,
            margin: "-6px auto 10px",
          }}
        />
        <SheetContent sheet={sheet} state={state} setState={setState} onClose={close} openSheet={openSheet} />
      </div>
    </div>
  );
}
