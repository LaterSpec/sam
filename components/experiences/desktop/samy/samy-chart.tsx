export function SamyChart({ spec }: { spec: { type: "bar" | "line" | "donut"; title?: string; unit?: string; items: Array<{ label: string; value: number }> } }) {
  const width = 280;
  const height = 132;
  const max = Math.max(...spec.items.map((item) => Math.abs(item.value)), 1);
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  return (
    <figure className="samy-chart">
      {spec.title ? <figcaption>{spec.title}</figcaption> : null}
      {spec.type === "donut" ? (
        <Donut items={spec.items} max={max} unit={spec.unit} />
      ) : spec.type === "line" ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title ?? "chart"}>
          {spec.items.map((item, index) => {
            const x = padL + (spec.items.length === 1 ? innerW / 2 : (index / (spec.items.length - 1)) * innerW);
            return <line key={`g-${item.label}`} x1={x} x2={x} y1={padT} y2={padT + innerH} className="desk-chart-grid" />;
          })}
          <polyline
            fill="none"
            stroke="var(--desk-info)"
            strokeWidth="2"
            points={spec.items
              .map((item, index) => {
                const x = padL + (spec.items.length === 1 ? innerW / 2 : (index / (spec.items.length - 1)) * innerW);
                const y = padT + innerH - (Math.abs(item.value) / max) * innerH;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {spec.items.map((item, index) => {
            const x = padL + (spec.items.length === 1 ? innerW / 2 : (index / (spec.items.length - 1)) * innerW);
            const y = padT + innerH - (Math.abs(item.value) / max) * innerH;
            return (
              <g key={item.label}>
                <circle cx={x} cy={y} r="2.5" fill="var(--desk-info)" />
                <text x={x} y={height - 6} textAnchor="middle" className="desk-chart-label">{item.label}</text>
              </g>
            );
          })}
        </svg>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title ?? "chart"}>
          {spec.items.map((item, index) => {
            const gap = 6;
            const barW = Math.max(8, (innerW - gap * (spec.items.length - 1)) / spec.items.length);
            const x = padL + index * (barW + gap);
            const h = Math.max(2, (Math.abs(item.value) / max) * innerH);
            const y = padT + innerH - h;
            return (
              <g key={item.label}>
                <rect x={x} y={y} width={barW} height={h} fill="var(--desk-info)" opacity="0.85" />
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="desk-chart-label">{item.label}</text>
              </g>
            );
          })}
        </svg>
      )}
      <table>
        <tbody>
          {spec.items.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{spec.unit ? `${item.value} ${spec.unit}` : item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Donut({
  items,
  max,
  unit,
}: {
  items: Array<{ label: string; value: number }>;
  max: number;
  unit?: string;
}) {
  const total = items.reduce((sum, item) => sum + Math.abs(item.value), 0) || max;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 132" role="img">
      <g transform="translate(80 62)">
        {items.map((item, index) => {
          const frac = Math.abs(item.value) / total;
          const dash = frac * c;
          const el = (
            <circle
              key={item.label}
              r={r}
              fill="none"
              stroke={index % 2 === 0 ? "var(--desk-info)" : "var(--desk-positive)"}
              strokeWidth="12"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90)"
            />
          );
          offset += dash;
          return el;
        })}
        <text textAnchor="middle" className="desk-chart-value" y="4">{unit ?? ""}</text>
      </g>
    </svg>
  );
}
