"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Synchronous in-flight lock for money mutations. React `busy` state is one
 * render too late for a double-click; the ref blocks the second call on the
 * same tick.
 */
export function useMutationLock() {
  const lockRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");

  const run = useCallback(async (task: () => Promise<void>, actionKey = "save") => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setKey(actionKey);
    try {
      await task();
    } finally {
      lockRef.current = false;
      setBusy(false);
      setKey("");
    }
  }, []);

  return { busy, key, run };
}
