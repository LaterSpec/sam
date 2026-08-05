"use client";

import { useEffect, useState } from "react";

export function useProgress(dur = 1400, key = 0, skip = false) {
  const [p, setP] = useState(skip ? 1 : 0);

  useEffect(() => {
    if (skip) {
      setP(1);
      return;
    }
    setP(0);
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const v = Math.min(1, (t - start) / dur);
      setP(v);
      if (v < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dur, key, skip]);

  return p;
}
