import type { DatasetSeries } from '../domain/atlas.ts';
import { NATIONAL, countyByCode } from '../domain/counties.ts';
import { DATASETS, type MetricDef } from '../domain/metrics.ts';

/** One line of the trend chart. */
export interface TrendLine {
  key: string;
  label: string;
  /** Stroke colour (a CSS colour or var()). */
  color: string;
  values: readonly (number | null)[];
  /** `focus` = the selected county, `compare` = a compared county, `reference` = the national line beside them. */
  role: 'focus' | 'compare' | 'reference';
}

interface Options {
  metric: MetricDef;
  series: DatasetSeries;
  /** The selected county, if any. */
  county: string | null;
  /** Compared counties by colour slot. */
  compare: readonly (string | null)[];
  /** Categorical colours, one per slot. */
  colors: readonly string[];
}

/**
 * Lines for the 「歷年變化」 chart: compared counties in their slot colours, the
 * selected county in ink when it is not compared, and the national line.
 *
 * The national line is a reference next to county lines only when it is an
 * average or a rate. A national total (23 million people) would flatten every
 * county to the floor, so it is left out then. With no county to show, the
 * national line is the subject itself and is always drawn, whatever its kind.
 */
export function trendLines({ metric, series, county, compare, colors }: Options): TrendLine[] {
  const values = series.metrics[metric.id]?.values ?? {};
  const empty = series.periods.map(() => null);
  const lines: TrendLine[] = [];

  compare.forEach((code, slot) => {
    const c = code ? countyByCode(code) : undefined;
    if (!c) return;
    lines.push({ key: c.code, label: c.name, color: colors[slot] ?? 'var(--ink)', values: values[c.code] ?? empty, role: c.code === county ? 'focus' : 'compare' });
  });
  const selected = county ? countyByCode(county) : undefined;
  if (selected && !compare.includes(selected.code)) {
    lines.unshift({ key: selected.code, label: selected.name, color: 'var(--ink)', values: values[selected.code] ?? empty, role: 'focus' });
  }

  const national = values[NATIONAL];
  const label = DATASETS[metric.dataset].nationalLabel;
  if (national && lines.length === 0) {
    lines.push({ key: NATIONAL, label, color: 'var(--ink)', values: national, role: 'focus' });
  } else if (national && metric.national === 'average') {
    lines.push({ key: NATIONAL, label, color: 'var(--muted)', values: national, role: 'reference' });
  }
  return lines;
}
