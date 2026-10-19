import { trendSegments, type TimelineWeek } from "./build-path";

// Sunucuda çizilen sade SVG grafikler (kütüphane yok, etkileşim yok).

const W = 320;

// Haftalık eğilim: pause öncesi ve sonrası ortalama dürtü (0–10)
export function TrendChart({
  weeks,
  weekLabel,
  ariaLabel,
}: {
  weeks: TimelineWeek[];
  weekLabel: (start: string) => string;
  ariaLabel: string;
}) {
  const H = 170;
  const pad = { l: 26, r: 10, t: 10, b: 26 };
  const n = weeks.length;
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + ((10 - v) * (H - pad.t - pad.b)) / 10;
  const before = trendSegments(weeks.map((w) => w.avgBefore), x, y);
  const after = trendSegments(weeks.map((w) => w.avgAfter), x, y);
  const labelEvery = n > 8 ? 3 : n > 4 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      {[0, 5, 10].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {v}
          </text>
        </g>
      ))}
      {weeks.map((w, i) =>
        i % labelEvery === (n - 1) % labelEvery ? (
          <text
            key={w.start}
            x={x(i)}
            y={H - 8}
            textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}
            className="fill-muted-foreground text-[10px]"
          >
            {weekLabel(w.start)}
          </text>
        ) : null,
      )}
      {before.map((d) => (
        <path key={d} d={d} fill="none" className="stroke-muted-foreground/60" strokeWidth={2} strokeDasharray="4 4" />
      ))}
      {after.map((d) => (
        <path key={d} d={d} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      {weeks.map((w, i) => (
        <g key={w.start}>
          {w.avgBefore != null && <circle cx={x(i)} cy={y(w.avgBefore)} r={3} className="fill-muted-foreground/60" />}
          {w.avgAfter != null && <circle cx={x(i)} cy={y(w.avgAfter)} r={3.5} className="fill-primary" />}
        </g>
      ))}
    </svg>
  );
}

// Haftanın günü × saat: dürtülerin ne zaman geldiği
export function Heatmap({
  heat,
  max,
  dayLabels,
  ariaLabel,
}: {
  heat: number[][];
  max: number;
  dayLabels: string[];
  ariaLabel: string;
}) {
  const left = 30;
  const cell = (W - left) / 24;
  const top = 4;
  const H = top + cell * 7 + 18;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      {heat.map((row, d) => (
        <g key={d}>
          <text x={left - 6} y={top + d * cell + cell * 0.7} textAnchor="end" className="fill-muted-foreground text-[9px]">
            {dayLabels[d]}
          </text>
          {row.map((v, h) => (
            <rect
              key={h}
              x={left + h * cell + 0.75}
              y={top + d * cell + 0.75}
              width={cell - 1.5}
              height={cell - 1.5}
              rx={2.5}
              className={v ? "fill-primary" : "fill-muted"}
              fillOpacity={v && max ? 0.18 + 0.82 * (v / max) : 1}
            />
          ))}
        </g>
      ))}
      {[0, 6, 12, 18].map((h) => (
        <text key={h} x={left + h * cell + cell / 2} y={H - 4} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          {String(h).padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}
