"use client";

import { useEffect, useState } from "react";
import { SamBrandIcon } from "@/components/ui/sam-brand-icon";
import type { DesktopCopy } from "../desktop-copy";

const SEEN_KEY = "samy.seen";

export function SamyFab({
  hidden,
  copy,
  onOpen,
}: {
  hidden: boolean;
  copy: DesktopCopy;
  onOpen: () => void;
}) {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    try {
      setUnread(sessionStorage.getItem(SEEN_KEY) !== "1");
    } catch {
      setUnread(true);
    }
  }, []);

  if (hidden) return null;

  return (
    <button
      type="button"
      className={`samy-fab${unread ? " has-unread" : ""}`}
      onClick={() => {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
        setUnread(false);
        onOpen();
      }}
      aria-label={copy.samyOpen}
    >
      <SamBrandIcon size={22} color="var(--desk-canvas)" />
      {unread ? <i className="samy-fab-dot" aria-hidden="true" /> : null}
    </button>
  );
}
