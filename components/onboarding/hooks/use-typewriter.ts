"use client";

import { useEffect, useState } from "react";

export function useTypewriter(text: string, dur = 1200, key = 0, skip = false) {
  const [n, setN] = useState(skip ? text.length : 0);

  useEffect(() => {
    if (skip) {
      setN(text.length);
      return;
    }
    setN(0);
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(p * text.length));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, dur, key, skip]);

  return text.slice(0, n);
}
