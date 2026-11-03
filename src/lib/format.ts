import type { MetricDef } from '../domain/metrics.ts';

const LOCALE = 'zh-TW';
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, options);
    formatters.set(key, f);
  }
  return f;
}

/** Full value with thousands separators and the metric's decimals, e.g. `3,358,415`. */
export function formatNumber(metric: MetricDef, value: number): string {
  return formatter(`n${metric.decimals}`, {
    minimumFractionDigits: metric.decimals,
    maximumFractionDigits: metric.decimals,
  }).format(value);
}

/** Value with unit, or the 2017 page's 「尚無資料」 when there is none. */
export function formatValue(metric: MetricDef, value: number | null | undefined): string {
  if (value === null || value === undefined) return '尚無資料';
  const number = formatNumber(metric, value);
  return metric.unit === '‰' ? `${number}‰` : `${number} ${metric.unit}`;
}

/** Short form for axis ticks and the legend: `407萬`, `1.2`, `-0.5`. */
export function formatCompact(metric: MetricDef, value: number): string {
  if (Math.abs(value) >= 10_000) {
    return formatter('compact', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  return formatter(`c${metric.decimals}`, { maximumFractionDigits: metric.decimals }).format(value);
}

/** Signed percentage change, e.g. `+1.2%`. */
export function formatChange(ratio: number): string {
  return formatter('pct', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(ratio);
}

/** Signed difference with the metric's unit, e.g. `+0.35‰`. */
export function formatDifference(metric: MetricDef, diff: number): string {
  const text = formatter(`d${metric.decimals}`, {
    minimumFractionDigits: metric.decimals,
    maximumFractionDigits: metric.decimals,
    signDisplay: 'exceptZero',
  }).format(diff);
  return metric.unit === '‰' ? `${text}‰` : `${text} ${metric.unit}`;
}
