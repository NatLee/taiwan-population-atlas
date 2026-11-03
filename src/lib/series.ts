import type { AtlasData, DatasetSeries, NewsData, NewsEvent, NewsYear } from '../domain/atlas.ts';
import { COUNTIES } from '../domain/counties.ts';
import type { MetricDef } from '../domain/metrics.ts';
import { previousYear, yearOf, type Period } from '../domain/periods.ts';

export function datasetOf(atlas: AtlasData, metric: MetricDef): DatasetSeries {
  return atlas.datasets[metric.dataset];
}

/** Value of one region at one period, or null when the source has none. */
export function valueAt(series: DatasetSeries, metric: MetricDef, region: string, period: Period): number | null {
  const index = series.periods.indexOf(period);
  if (index < 0) return null;
  return series.metrics[metric.id]?.values[region]?.[index] ?? null;
}

export interface RankedCounty {
  code: string;
  name: string;
  value: number | null;
  /** 1 = highest; null when there is no value. */
  rank: number | null;
}

/** All counties for one period, highest value first; counties without data come last. */
export function rankCounties(series: DatasetSeries, metric: MetricDef, period: Period): RankedCounty[] {
  const rows = COUNTIES.map((c) => ({ code: c.code, name: c.name, value: valueAt(series, metric, c.code, period) }));
  const withValues = rows
    .filter((r): r is typeof r & { value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const without = rows.filter((r) => r.value === null).map((r) => ({ ...r, rank: null }));
  return [...withValues, ...without];
}

/** Change against the same period a year earlier; null when either side is missing. */
export function yearOverYear(series: DatasetSeries, metric: MetricDef, region: string, period: Period): { diff: number; ratio: number | null } | null {
  const now = valueAt(series, metric, region, period);
  const before = valueAt(series, metric, region, previousYear(period));
  if (now === null || before === null) return null;
  return { diff: now - before, ratio: before !== 0 ? (now - before) / Math.abs(before) : null };
}

export interface PeriodEvents {
  /** Events naming the county (empty when no county is selected). */
  county: NewsEvent[];
  /** Events that name no county: the 2017 page's 「當期焦點新聞」. */
  national: NewsEvent[];
  /** Where the year's events come from, for attribution. */
  source: NewsYear | undefined;
}

/**
 * Events of a month (`YYYY-MM`) or, for yearly metrics, of the whole year (`YYYY`),
 * which is what the 2017 page showed when an income metric was selected.
 */
export function eventsFor(news: NewsData | null, period: Period, county: string | null): PeriodEvents {
  const source = news?.years[String(yearOf(period))];
  const inPeriod = (source?.events ?? []).filter((e) => e.date.startsWith(period));
  return {
    county: county ? inPeriod.filter((e) => e.counties.includes(county)) : [],
    national: inPeriod.filter((e) => e.counties.length === 0),
    source,
  };
}
