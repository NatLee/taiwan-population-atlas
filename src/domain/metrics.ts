import type { SourceId } from './sources.ts';

/** Two families of statistics with their own time step. */
export type DatasetId = 'population' | 'household';
export type Frequency = 'month' | 'year';

export const DATASETS: Record<DatasetId, { label: string; frequency: Frequency; nationalLabel: string }> = {
  population: { label: '人口', frequency: 'month', nationalLabel: '全國' },
  // The household survey covers Taiwan, Penghu and the cities, but not Kinmen or Matsu.
  household: { label: '家庭收支', frequency: 'year', nationalLabel: '臺灣地區' },
};

export type MetricId =
  | 'population'
  | 'totalIncreaseRate'
  | 'naturalIncreaseRate'
  | 'socialIncreaseRate'
  | 'disposableIncome'
  | 'savings'
  | 'incomeReceipts'
  | 'totalIncome'
  | 'consumption';

/**
 * How a metric is coloured:
 * - `sequential-log`: counts that span orders of magnitude (13 thousand to 4 million people)
 * - `sequential`: amounts with a natural low and high
 * - `diverging`: rates where the sign matters (growth vs decline), centred on zero
 */
export type ScaleKind = 'sequential' | 'sequential-log' | 'diverging';

export interface MetricDef {
  id: MetricId;
  label: string;
  unit: string;
  dataset: DatasetId;
  scale: ScaleKind;
  /** Where the numbers come from (see sources.ts). */
  source: SourceId;
  /** One sentence for the tooltip. */
  description: string;
  /** Number of decimals to show. */
  decimals: number;
  /**
   * What the whole-country row is: a `total` (all people in Taiwan) cannot be drawn
   * next to one county's line, an `average` (a rate, an amount per household) can.
   */
  national: 'total' | 'average';
}

/** In display order: the six metrics of the 2017 page first, then the rest of the household survey. */
export const METRICS: readonly MetricDef[] = [
  {
    id: 'population', label: '人口數', unit: '人', dataset: 'population', scale: 'sequential-log',
    source: 'moi-population', decimals: 0, national: 'total', description: '月底戶籍登記人口。',
  },
  {
    id: 'totalIncreaseRate', label: '總增加率', unit: '‰', dataset: 'population', scale: 'diverging',
    source: 'moi-population', decimals: 2, national: 'average', description: '當月人口增減占人口的千分比，等於自然增加率加社會增加率。',
  },
  {
    id: 'naturalIncreaseRate', label: '自然增加率', unit: '‰', dataset: 'population', scale: 'diverging',
    source: 'moi-population', decimals: 2, national: 'average', description: '出生減死亡，占人口的千分比。',
  },
  {
    id: 'socialIncreaseRate', label: '社會增加率', unit: '‰', dataset: 'population', scale: 'diverging',
    source: 'moi-population', decimals: 2, national: 'average', description: '遷入減遷出，占人口的千分比。',
  },
  {
    id: 'disposableIncome', label: '可支配所得', unit: '元', dataset: 'household', scale: 'sequential',
    source: 'dgbas-disposable-income', decimals: 0, national: 'average', description: '平均每戶一年可以自由運用的所得。',
  },
  {
    id: 'savings', label: '每戶儲蓄', unit: '元', dataset: 'household', scale: 'sequential',
    source: 'dgbas-savings', decimals: 0, national: 'average', description: '平均每戶一年的可支配所得減消費支出。',
  },
  {
    id: 'incomeReceipts', label: '所得收入總計', unit: '元', dataset: 'household', scale: 'sequential',
    source: 'dgbas-income-receipts', decimals: 0, national: 'average', description: '平均每戶一年的所得收入總計。',
  },
  {
    id: 'totalIncome', label: '所得總額', unit: '元', dataset: 'household', scale: 'sequential',
    source: 'dgbas-total-income', decimals: 0, national: 'average', description: '平均每戶一年的所得總額。',
  },
  {
    id: 'consumption', label: '消費支出', unit: '元', dataset: 'household', scale: 'sequential',
    source: 'dgbas-consumption', decimals: 0, national: 'average', description: '平均每戶一年的消費支出。',
  },
];

const byId = new Map(METRICS.map((m) => [m.id, m]));

export const DEFAULT_METRIC: MetricId = 'population';

export function metricById(id: string): MetricDef | undefined {
  return byId.get(id as MetricId);
}

export function getMetric(id: MetricId): MetricDef {
  const metric = byId.get(id);
  if (!metric) throw new Error(`Unknown metric ${id}`);
  return metric;
}

export function metricsOf(dataset: DatasetId): MetricDef[] {
  return METRICS.filter((m) => m.dataset === dataset);
}
