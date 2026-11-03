import { quantile } from 'd3-array';
import { interpolateLab, piecewise } from 'd3-interpolate';
import { scaleDiverging, scaleSequential, scaleSequentialLog } from 'd3-scale';
import type { DatasetSeries } from '../domain/atlas.ts';
import { NATIONAL } from '../domain/counties.ts';
import type { MetricDef } from '../domain/metrics.ts';
import { PALETTES, type ThemeName } from './palette.ts';

/**
 * Share of county values a diverging scale covers before it clamps. Kinmen and
 * Matsu are small, so a few hundred people moving is several ‰ there; most of the
 * extreme months are theirs. With 90% coverage the monthly rates span about
 * ±1.3‰ instead of ±5.5‰, and the main island no longer looks uniformly grey.
 * Clamped values share the end colour and the legend says ≤ / ≥.
 */
export const DIVERGING_COVERAGE = 0.9;

export interface ColorDomain {
  /** Lowest and highest value the colours distinguish. */
  min: number;
  max: number;
  /** True when some values lie outside [min, max] and share the end colour. */
  clamped: boolean;
}

/** Every county value of a metric, over all periods (the whole-country row is left out). */
export function countyValues(series: DatasetSeries, metricId: MetricDef['id']): number[] {
  const values = series.metrics[metricId]?.values ?? {};
  return Object.entries(values)
    .filter(([region]) => region !== NATIONAL)
    .flatMap(([, row]) => row.filter((v): v is number => v !== null));
}

/**
 * One colour range per metric, computed from all periods at once, so a colour
 * means the same number while the map plays through time.
 */
export function colorDomain(metric: MetricDef, series: DatasetSeries): ColorDomain {
  const values = countyValues(series, metric.id);
  if (values.length === 0) return { min: 0, max: 1, clamped: false };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (metric.scale !== 'diverging') {
    return { min: metric.scale === 'sequential-log' ? Math.max(lo, 1) : lo, max: hi, clamped: false };
  }
  const reach = quantile(values.map(Math.abs), DIVERGING_COVERAGE) ?? Math.max(Math.abs(lo), Math.abs(hi));
  const bound = reach > 0 ? reach : 1;
  return { min: -bound, max: bound, clamped: lo < -bound || hi > bound };
}

export type ColorScale = (value: number) => string;

export function colorScale(metric: MetricDef, domain: ColorDomain, theme: ThemeName): ColorScale {
  const palette = PALETTES[theme];
  if (metric.scale === 'diverging') {
    const scale = scaleDiverging(piecewise(interpolateLab, [...palette.diverging]))
      .domain([domain.min, 0, domain.max])
      .clamp(true);
    return (v) => scale(v);
  }
  const interpolator = piecewise(interpolateLab, [...palette.sequential]);
  if (metric.scale === 'sequential-log') {
    const scale = scaleSequentialLog(interpolator).domain([domain.min, domain.max]).clamp(true);
    return (v) => scale(Math.max(v, domain.min));
  }
  const scale = scaleSequential(interpolator).domain([domain.min, domain.max]).clamp(true);
  return (v) => scale(v);
}

/** Evenly spaced colour stops for drawing the legend gradient. */
export function legendStops(metric: MetricDef, theme: ThemeName): string[] {
  const palette = PALETTES[theme];
  return [...(metric.scale === 'diverging' ? palette.diverging : palette.sequential)];
}
