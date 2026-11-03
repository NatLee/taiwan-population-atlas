import type { Frequency } from './metrics.ts';

/**
 * A period is `YYYY-MM` for monthly data and `YYYY` for yearly data.
 * Strings sort chronologically, so plain string comparison orders them.
 */
export type Period = string;

const MONTH = /^(\d{4})-(\d{2})$/;
const YEAR = /^(\d{4})$/;

/** Offset between the Republic of China calendar and the Gregorian year (民國 1 年 = 1912). */
export const ROC_YEAR_OFFSET = 1911;

export function monthPeriod(year: number, month: number): Period {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function frequencyOf(period: Period): Frequency | undefined {
  if (MONTH.test(period)) return 'month';
  if (YEAR.test(period)) return 'year';
  return undefined;
}

export function yearOf(period: Period): number {
  return Number(period.slice(0, 4));
}

/** `1997-01` → `1997年1月`, `1998` → `1998年`: the labels the 2017 page used. */
export function formatPeriod(period: Period): string {
  const m = MONTH.exec(period);
  if (m) return `${m[1]}年${Number(m[2])}月`;
  return `${period}年`;
}

/** Parse the 2017 page's labels (`1997年1月`, `1998年`) back into periods. */
export function parseLegacyPeriod(label: string): Period | undefined {
  const m = /^(\d{4})年(?:(\d{1,2})月)?$/.exec(label.trim());
  if (!m) return undefined;
  return m[2] ? monthPeriod(Number(m[1]), Number(m[2])) : m[1];
}

/**
 * Parse a ROC-calendar label from the Ministry of the Interior (`86年 1月`).
 * Yearly totals (`86年`) return undefined: the app shows months.
 */
export function parseRocMonth(label: string): Period | undefined {
  const m = /^(\d{2,3})年\s*(\d{1,2})月$/.exec(label.trim());
  if (!m) return undefined;
  return monthPeriod(Number(m[1]) + ROC_YEAR_OFFSET, Number(m[2]));
}

/**
 * Convert a period to another frequency, the way the 2017 page did when the
 * metric changed: a month becomes its year, a year becomes its January.
 * The result is then snapped to the nearest period that has data.
 */
export function convertPeriod(period: Period, available: readonly Period[]): Period | undefined {
  const target = frequencyOf(available[0] ?? '');
  if (!target) return undefined;
  const from = frequencyOf(period);
  let wanted = period;
  if (target === 'year' && from === 'month') wanted = String(yearOf(period));
  if (target === 'month' && from === 'year') wanted = monthPeriod(yearOf(period), 1);
  return available.includes(wanted) ? wanted : nearestPeriod(wanted, available);
}

/** The available period closest to `period` (ties go to the earlier one). */
export function nearestPeriod(period: Period, available: readonly Period[]): Period | undefined {
  const first = available[0];
  const last = available[available.length - 1];
  if (first === undefined || last === undefined) return undefined;
  if (period <= first) return first;
  if (period >= last) return last;
  return available.find((p) => p >= period) ?? last;
}

/** Step through a list of periods, wrapping around at both ends like the 2017 arrows. */
export function stepPeriod(period: Period, available: readonly Period[], delta: number): Period | undefined {
  const n = available.length;
  if (n === 0) return undefined;
  const index = available.indexOf(period);
  const from = index === -1 ? 0 : index;
  return available[(((from + delta) % n) + n) % n];
}

/** The same period one year earlier, used for year-over-year change. */
export function previousYear(period: Period): Period {
  const m = MONTH.exec(period);
  if (m) return `${Number(m[1]) - 1}-${m[2]}`;
  return String(yearOf(period) - 1);
}
