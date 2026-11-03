import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useMemo, useRef, useState } from 'react';
import type { MetricDef } from '../domain/metrics.ts';
import { formatPeriod, yearOf, type Period } from '../domain/periods.ts';
import { useElementSize } from '../hooks/useElementSize.ts';
import { formatCompact, formatValue } from '../lib/format.ts';

export interface TrendSeries {
  key: string;
  label: string;
  /** Stroke colour (a CSS colour or var()). */
  color: string;
  values: readonly (number | null)[];
  /** `reference` = the whole-country line, drawn thinner. */
  role?: 'focus' | 'compare' | 'reference';
}

interface Props {
  metric: MetricDef;
  periods: readonly Period[];
  series: readonly TrendSeries[];
  current: Period;
  onPick: (period: Period) => void;
}

const HEIGHT = 220;
const MARGIN = { top: 10, right: 12, bottom: 24, left: 48 };
/** Room for direct labels at the right end of the lines. */
const END_LABEL_WIDTH = 64;
/** End labels closer than this would overlap; the legend carries identity instead. */
const END_LABEL_MIN_GAP = 13;
/** Minimum horizontal space per year label on the x axis. */
const X_TICK_SPACING = 56;
const STROKE = { focus: 2.5, compare: 2, reference: 1.5 } as const;

/** Values over time for the selected and compared counties, with the national line for context. */
export function TrendChart({ metric, periods, series, current, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(box);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // The table has a row per period (357 months), so it is only built while open.
  const [tableOpen, setTableOpen] = useState(false);

  const layout = useMemo(() => {
    if (width === 0 || periods.length === 0) return null;
    const ends = series
      .map((s) => {
        let i = s.values.length - 1;
        while (i >= 0 && s.values[i] === null) i--;
        return { s, index: i, value: i >= 0 ? s.values[i] : null };
      })
      .filter((e): e is typeof e & { value: number } => e.value !== null && e.value !== undefined);

    const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
    const [lo = 0, hi = 1] = extent(all);
    const domain = metric.scale === 'diverging' ? [Math.min(lo, 0), Math.max(hi, 0)] : [lo, hi];
    const y = scaleLinear().domain(domain).nice(4).range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    // Direct labels only when they fit apart; otherwise the legend above does the job.
    const ys = ends.map((e) => y(e.value)).sort((a, b) => a - b);
    const labelsFit = ends.length <= 4 && ys.every((v, i) => i === 0 || v - (ys[i - 1] ?? 0) >= END_LABEL_MIN_GAP);
    const right = MARGIN.right + (labelsFit ? END_LABEL_WIDTH : 0);
    const x = scaleLinear().domain([0, Math.max(periods.length - 1, 1)]).range([MARGIN.left, width - right]);

    const years = [...new Set(periods.map(yearOf))];
    const step = Math.max(1, Math.ceil(years.length / Math.max(1, Math.floor((width - MARGIN.left - right) / X_TICK_SPACING))));
    const xTicks = years
      .filter((_, i) => i % step === 0)
      .map((year) => ({ year, index: periods.findIndex((p) => yearOf(p) === year) }));

    const draw = line<number | null>()
      .defined((v) => v !== null)
      .x((_, i) => x(i))
      .y((v) => y(v ?? 0));

    return { x, y, xTicks, yTicks: y.ticks(4), draw, ends, labelsFit };
  }, [width, periods, series, metric.scale]);

  const currentIndex = periods.indexOf(current);
  const shownIndex = hoverIndex ?? null;

  const indexAt = (clientX: number): number | null => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || !layout) return null;
    const i = Math.round(layout.x.invert(clientX - rect.left));
    return Math.min(Math.max(i, 0), periods.length - 1);
  };

  return (
    <div>
      {series.length >= 2 && (
        <ul className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2" aria-label="圖例">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <svg width="14" height="4" aria-hidden="true">
                <line x1="0" x2="14" y1="2" y2="2" stroke={s.color} strokeWidth={s.role === 'reference' ? 1.5 : 2.5} strokeLinecap="round" />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={box} className="relative" style={{ height: HEIGHT }}>
        {layout && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${metric.label}的變化，${formatPeriod(periods[0] ?? '')}到${formatPeriod(periods[periods.length - 1] ?? '')}。點一下圖表可以跳到該時間。`}
            className="block cursor-crosshair"
            onPointerMove={(e) => setHoverIndex(indexAt(e.clientX))}
            onPointerLeave={() => setHoverIndex(null)}
            onClick={(e) => {
              const i = indexAt(e.clientX);
              const p = i === null ? undefined : periods[i];
              if (p) onPick(p);
            }}
          >
            {layout.yTicks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={layout.y(t)} y2={layout.y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
                <text x={MARGIN.left - 6} y={layout.y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {formatCompact(metric, t)}
                </text>
              </g>
            ))}
            {layout.xTicks.map((t) => (
              <text key={t.year} x={layout.x(t.index)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">
                {t.year}
              </text>
            ))}
            {currentIndex >= 0 && (
              <line x1={layout.x(currentIndex)} x2={layout.x(currentIndex)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke="var(--accent)" strokeWidth={1} />
            )}
            {series.map((s) => (
              <path
                key={s.key}
                d={layout.draw([...s.values]) ?? ''}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE[s.role ?? 'compare']}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {layout.labelsFit &&
              layout.ends.map((e) => (
                <text key={e.s.key} x={layout.x(e.index) + 6} y={layout.y(e.value)} dy="0.32em" className="fill-ink-2 text-[11px]">
                  {e.s.label}
                </text>
              ))}
            {shownIndex !== null && (
              <g pointerEvents="none">
                <line x1={layout.x(shownIndex)} x2={layout.x(shownIndex)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke="var(--ink-2)" strokeWidth={1} />
                {series.map((s) => {
                  const v = s.values[shownIndex];
                  return v === null || v === undefined ? null : (
                    <circle key={s.key} cx={layout.x(shownIndex)} cy={layout.y(v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                  );
                })}
              </g>
            )}
          </svg>
        )}
        {layout && shownIndex !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md"
            style={layout.x(shownIndex) > width / 2 ? { right: width - layout.x(shownIndex) + 8 } : { left: layout.x(shownIndex) + 8 }}
          >
            <div className="mb-1 text-ink-2">{formatPeriod(periods[shownIndex] ?? '')}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <svg width="10" height="4" aria-hidden="true">
                  <line x1="0" x2="10" y1="2" y2="2" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
                </svg>
                <span className="font-semibold tabular-nums text-ink">{formatValue(metric, s.values[shownIndex])}</span>
                <span className="text-ink-2">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="mt-1 text-xs text-ink-2" onToggle={(e) => setTableOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer select-none">以表格檢視</summary>
        {tableOpen && (
        <div className="mt-1 max-h-60 overflow-auto rounded border border-line">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-surface-2 text-ink">
              <tr>
                <th className="px-2 py-1 font-medium">時間</th>
                {series.map((s) => (
                  <th key={s.key} className="px-2 py-1 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...periods.keys()].reverse().map((i) => (
                <tr key={periods[i]} className="border-t border-line">
                  <td className="px-2 py-0.5">{formatPeriod(periods[i] ?? '')}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-0.5 text-right">
                      {formatValue(metric, s.values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </details>
    </div>
  );
}
