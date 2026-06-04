import type { PerfPoint } from "@/components/charts/perf-chart";

export function buildPerfSeries(
  snapshots: Array<{ t: string; v: number }> | undefined,
  liveValue: number | null | undefined
): { points: PerfPoint[]; intraday: boolean } {
  let pts = (snapshots || []).map((s) => ({ t: s.t, v: s.v })).filter((p) => p.v != null);

  if (liveValue != null && liveValue > 0) {
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.v - liveValue) > 0.005) {
      pts = [...pts, { t: new Date().toISOString(), v: liveValue }];
    }
  }
  if (!pts.length) return { points: [], intraday: false };

  if (pts.length === 1) {
    return {
      points: [{ ...pts[0] }, { t: new Date().toISOString(), v: pts[0].v }],
      intraday: true,
    };
  }

  const first = new Date(pts[0].t).getTime();
  const last = new Date(pts[pts.length - 1].t).getTime();
  const spanDays = (last - first) / 864e5;

  if (spanDays <= 2) {
    let series = pts;
    if (series.length > 72) {
      const step = Math.ceil(series.length / 72);
      series = series.filter((_, i) => i % step === 0 || i === series.length - 1);
    }
    return { points: series, intraday: true };
  }

  const byDay: Record<string, PerfPoint> = {};
  pts.forEach((p) => {
    byDay[p.t.slice(0, 10)] = p;
  });
  const days = Object.keys(byDay).sort().slice(-30);
  return { points: days.map((d) => byDay[d]), intraday: false };
}
