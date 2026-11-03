import type { DatasetSeries, Provenance } from '../../../src/domain/atlas.ts';
import { COUNTIES, NATIONAL } from '../../../src/domain/counties.ts';
import { DATASETS, metricsOf, type DatasetId, type MetricId } from '../../../src/domain/metrics.ts';
import { frequencyOf } from '../../../src/domain/periods.ts';
import type { ValueRecord } from './records.ts';

export interface Layer {
  input: Provenance['input'];
  records: ValueRecord[];
}

export interface Difference {
  metric: MetricId;
  period: string;
  region: string;
  older: number;
  newer: number;
}

export interface MergeReport {
  /** Cells where an older and a newer input both had a number. */
  overlapping: number;
  /** Of those, the cells where the numbers disagree. */
  differences: Difference[];
}

interface Cell {
  value: number | null;
  input: Layer['input'];
}

const REGIONS = [NATIONAL, ...COUNTIES.map((c) => c.code)];

/**
 * Stack inputs from oldest to newest. A newer input replaces a cell only when it
 * has a number for it, so a gap in a fresh download never erases an older value.
 * Every replaced number is compared with its replacement for the report.
 */
export function mergeLayers(dataset: DatasetId, layers: readonly Layer[]): {
  series: DatasetSeries;
  report: MergeReport;
} {
  const { frequency } = DATASETS[dataset];
  const metricIds = new Set(metricsOf(dataset).map((m) => m.id));
  const cells = new Map<string, Cell>();
  const periods = new Set<string>();
  const report: MergeReport = { overlapping: 0, differences: [] };

  for (const layer of layers) {
    for (const r of layer.records) {
      if (!metricIds.has(r.metric)) continue;
      if (frequencyOf(r.period) !== frequency) {
        throw new Error(`${layer.input}: ${r.period} is not a ${frequency} period`);
      }
      const key = `${r.metric}|${r.period}|${r.region}`;
      const old = cells.get(key);
      if (old && r.value === null) continue;
      if (old && old.value !== null && r.value !== null) {
        report.overlapping++;
        if (old.value !== r.value) {
          report.differences.push({ metric: r.metric, period: r.period, region: r.region, older: old.value, newer: r.value });
        }
      }
      cells.set(key, { value: r.value, input: layer.input });
      periods.add(r.period);
    }
  }

  const sortedPeriods = [...periods].sort();
  const metrics: DatasetSeries['metrics'] = {};
  const usedBy = new Map<Layer['input'], string[]>();

  for (const metric of metricIds) {
    const values: Record<string, (number | null)[]> = {};
    for (const region of REGIONS) {
      const row = sortedPeriods.map((period) => {
        const cell = cells.get(`${metric}|${period}|${region}`);
        if (cell && cell.value !== null) {
          const list = usedBy.get(cell.input) ?? [];
          list.push(period);
          usedBy.set(cell.input, list);
        }
        return cell?.value ?? null;
      });
      // Regions a survey does not cover (Kinmen and Matsu in the household survey) are left out.
      if (row.some((v) => v !== null)) values[region] = row;
    }
    if (Object.keys(values).length > 0) metrics[metric] = { values };
  }

  const provenance: Provenance[] = [...usedBy.entries()].map(([input, used]) => {
    const sorted = [...new Set(used)].sort();
    return { input, first: sorted[0] ?? '', last: sorted[sorted.length - 1] ?? '' };
  });

  return { series: { frequency, periods: sortedPeriods, metrics, provenance }, report };
}
