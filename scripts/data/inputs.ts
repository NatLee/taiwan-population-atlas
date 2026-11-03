/**
 * Every input file the build reads, in one place: the 2017 snapshot and the
 * files `npm run data:fetch` downloads. Paths are relative to the repo root.
 */
import type { MetricId } from '../../src/domain/metrics.ts';
import type { SourceId } from '../../src/domain/sources.ts';
import { HOUSEHOLD_COLUMNS, POPULATION_COLUMNS } from './lib/tables.ts';

export const LEGACY_DIR = 'data/legacy-2017';
export const SOURCES_DIR = 'data/sources';
export const WIKIPEDIA_DIR = `${SOURCES_DIR}/wikipedia`;
export const MANIFEST_FILE = `${SOURCES_DIR}/manifest.json`;
export const OUTPUT_DIR = 'public/data';

/** The 2017 JSON files. `originalName` is what they were called in `datas/`. */
export const LEGACY_TABLES: ReadonlyArray<{
  file: string;
  originalName: string;
  columns: Record<string, MetricId>;
}> = [
  { file: 'population-change.json', originalName: '人口增加─按區域別分.json', columns: POPULATION_COLUMNS },
  { file: 'household-disposable-income.json', originalName: '各縣市別平均每戶可支配所得.json', columns: HOUSEHOLD_COLUMNS },
  { file: 'household-savings.json', originalName: '各縣市別平均每戶儲蓄.json', columns: HOUSEHOLD_COLUMNS },
  { file: 'household-income-receipts.json', originalName: '各縣市別平均每戶所得收入總計.json', columns: HOUSEHOLD_COLUMNS },
  { file: 'household-total-income.json', originalName: '各縣市別平均每戶所得總額.json', columns: HOUSEHOLD_COLUMNS },
  { file: 'household-consumption.json', originalName: '各縣市別平均每戶消費支出.json', columns: HOUSEHOLD_COLUMNS },
];

export const LEGACY_EVENTS = { file: 'taiwan-events.json', originalName: '臺灣大事件.json' };

/** Downloaded statistics tables: which source, which file, which layout. */
export type StatisticsInput =
  | { source: SourceId; file: string; layout: 'moi-population' }
  | { source: SourceId; file: string; layout: 'year-by-region'; metric: MetricId };

export const STATISTICS_INPUTS: readonly StatisticsInput[] = [
  { source: 'moi-population', file: 'moi-population.csv', layout: 'moi-population' },
  { source: 'dgbas-disposable-income', file: 'dgbas-disposable-income.csv', layout: 'year-by-region', metric: 'disposableIncome' },
  { source: 'dgbas-savings', file: 'dgbas-savings.csv', layout: 'year-by-region', metric: 'savings' },
  { source: 'dgbas-income-receipts', file: 'dgbas-income-receipts.csv', layout: 'year-by-region', metric: 'incomeReceipts' },
  { source: 'dgbas-total-income', file: 'dgbas-total-income.csv', layout: 'year-by-region', metric: 'totalIncome' },
  { source: 'dgbas-consumption', file: 'dgbas-consumption.csv', layout: 'year-by-region', metric: 'consumption' },
];

/** What `data:fetch` records about each download, so a build can be traced to its inputs. */
export interface ManifestEntry {
  file: string;
  url: string;
  fetchedAt: string;
  sha256: string;
  bytes: number;
  /** Wikipedia only: the page title and the revision that was read. */
  title?: string;
  revision?: number;
}

export interface Manifest {
  statistics: Partial<Record<SourceId, ManifestEntry>>;
  wikipedia: Record<string, ManifestEntry>;
}
