"use client";

import { useEffect, useState } from "react";

export function useCountUp(target: number, dur = 1100, key = 0, skip = false) {
  const [v, setV] = useState(skip ? target : 0);

  useEffect(() => {
    if (skip) {
      setV(target);
      return;
    }
    setV(0);
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, key, skip]);

  return v;
}
