/**
 * What the reader is looking at, and how it is written into the address bar so a
 * view can be shared: `?metric=savings&period=2015&county=10020&compare=63000,64000`.
 */
import { isCountyCode } from '../domain/counties.ts';
import { DEFAULT_METRIC, metricById, type MetricId } from '../domain/metrics.ts';
import { frequencyOf, type Period } from '../domain/periods.ts';
import { MAX_COMPARED } from './palette.ts';

export interface ViewState {
  metric: MetricId;
  /** null = the latest period of the metric's dataset. */
  period: Period | null;
  /** The county whose details are open. */
  county: string | null;
  /**
   * Compared counties by colour slot. A county keeps its slot (and colour) when
   * another one is removed, so lines never swap colours under the reader.
   */
  compare: (string | null)[];
}

export const DEFAULT_VIEW: ViewState = { metric: DEFAULT_METRIC, period: null, county: null, compare: [] };

/** Read a view from a query string; anything unknown falls back to the default. */
export function parseViewState(search: string): ViewState {
  const params = new URLSearchParams(search);
  const metric = metricById(params.get('metric') ?? '')?.id ?? DEFAULT_METRIC;
  const rawPeriod = params.get('period');
  const period = rawPeriod && frequencyOf(rawPeriod) ? rawPeriod : null;
  const rawCounty = params.get('county');
  const county = rawCounty && isCountyCode(rawCounty) ? rawCounty : null;
  const compare = [...new Set((params.get('compare') ?? '').split(',').filter(isCountyCode))].slice(0, MAX_COMPARED);
  return { metric, period, county, compare };
}

/** Write a view as a query string, leaving out defaults to keep links short. */
export function serialiseViewState(state: ViewState): string {
  const params = new URLSearchParams();
  if (state.metric !== DEFAULT_METRIC) params.set('metric', state.metric);
  if (state.period) params.set('period', state.period);
  if (state.county) params.set('county', state.county);
  const compared = state.compare.filter((c): c is string => c !== null);
  if (compared.length > 0) params.set('compare', compared.join(','));
  const text = params.toString().replaceAll('%2C', ',');
  return text ? `?${text}` : '';
}

/** Put a county in the first free colour slot; no-op when full or already there. */
export function addCompared(compare: readonly (string | null)[], code: string): (string | null)[] {
  if (compare.includes(code)) return [...compare];
  const next = [...compare];
  const free = next.indexOf(null);
  if (free >= 0) next[free] = code;
  else if (next.length < MAX_COMPARED) next.push(code);
  return next;
}

/** Free a county's slot without moving the others. */
export function removeCompared(compare: readonly (string | null)[], code: string): (string | null)[] {
  const next = compare.map((c) => (c === code ? null : c));
  while (next.length > 0 && next[next.length - 1] === null) next.pop();
  return next;
}

export function comparedCount(compare: readonly (string | null)[]): number {
  return compare.filter((c) => c !== null).length;
}
