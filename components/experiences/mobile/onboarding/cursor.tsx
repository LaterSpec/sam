"use client";

import { useSam } from "@/lib/theme/sam-theme";

export function Cursor({ c }: { c?: string }) {
  const { sam } = useSam();
  const color = c ?? sam.yellow;
  return (
    <span
      className="sam-cursor"
      style={{
        display: "inline-block",
        width: 8,
        height: 14,
        marginLeft: 2,
        background: color,
        verticalAlign: "-2px",
      }}
    />
  );
}
