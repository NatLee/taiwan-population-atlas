/**
 * Shape of the generated files in public/data/. The data scripts write them and
 * the app reads them, so both sides share these types.
 */
import type { DatasetId, Frequency, MetricId } from './metrics.ts';
import type { Period } from './periods.ts';
import type { RegionCode } from './counties.ts';
import type { SourceId } from './sources.ts';

export const ATLAS_FORMAT_VERSION = 1;

/** One value per period, aligned with `DatasetSeries.periods`; null = no data. */
export type ValueSeries = (number | null)[];

export interface MetricSeries {
  /** Keyed by county code, plus `national` for the whole-country row. */
  values: Record<RegionCode, ValueSeries>;
}

/** Which input supplied which periods, for the README and the footer. */
export interface Provenance {
  input: SourceId | 'legacy-2017';
  first: Period;
  last: Period;
}

export interface DatasetSeries {
  frequency: Frequency;
  periods: Period[];
  metrics: Partial<Record<MetricId, MetricSeries>>;
  provenance: Provenance[];
}

export interface AtlasData {
  version: typeof ATLAS_FORMAT_VERSION;
  datasets: Record<DatasetId, DatasetSeries>;
}

export interface NewsEvent {
  /** `YYYY-MM-DD`, or `YYYY-MM` when the source gives no day. */
  date: string;
  text: string;
  /** Counties the text names; empty means a national event (the 2017 page's 其他). */
  counties: string[];
}

export interface NewsYear {
  /** Wikipedia page and revision the events come from; absent for the 2017 snapshot. */
  page?: { title: string; revision: number; url: string };
  input: 'wikipedia-events' | 'legacy-2017';
  events: NewsEvent[];
}

export interface NewsData {
  version: typeof ATLAS_FORMAT_VERSION;
  years: Record<string, NewsYear>;
}
