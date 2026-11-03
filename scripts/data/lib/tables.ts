/**
 * Parsers for the three table layouts the project reads. All of them return
 * the same flat records, keyed by current county code.
 */
import { regionCodeForName } from '../../../src/domain/counties.ts';
import type { MetricId } from '../../../src/domain/metrics.ts';
import { parseLegacyPeriod, parseRocMonth } from '../../../src/domain/periods.ts';
import { parseCsv } from './csv.ts';
import { parseCell, type ParseResult, type ValueRecord } from './records.ts';

/** Column names of the population table, without their unit suffix. */
export const POPULATION_COLUMNS: Record<string, MetricId> = {
  人口數: 'population',
  總增加率: 'totalIncreaseRate',
  自然增加率: 'naturalIncreaseRate',
  社會增加率: 'socialIncreaseRate',
};

/** Column names of the five household-survey tables in the 2017 JSON. */
export const HOUSEHOLD_COLUMNS: Record<string, MetricId> = {
  可支配所得: 'disposableIncome',
  每戶儲蓄: 'savings',
  所得收入總計: 'incomeReceipts',
  所得總額: 'totalIncome',
  消費支出: 'consumption',
};

/** `人口數(人)` and `總增加率(o/oo)` both become the bare name. */
function columnName(header: string): string {
  return header.trim().replace(/\(.*\)$/, '');
}

class Collector {
  readonly records: ValueRecord[] = [];
  private readonly unknown = new Set<string>();

  add(metric: MetricId, period: string, regionName: string, raw: string | undefined): void {
    const region = regionCodeForName(regionName);
    if (!region) {
      this.unknown.add(regionName);
      return;
    }
    this.records.push({ metric, period, region, value: parseCell(raw) });
  }

  result(): ParseResult {
    return { records: this.records, unknownRegions: [...this.unknown] };
  }
}

type LegacyTable = Record<string, Array<Record<string, string>>>;

/**
 * The 2017 JSON: `{ "1997年1月": [{ "地區": "新北市", "人口數(人)": "3358415", … }] }`.
 * Columns not listed in `columns` are ignored.
 */
export function parseLegacyTable(json: LegacyTable, columns: Record<string, MetricId>): ParseResult {
  const out = new Collector();
  for (const [label, rows] of Object.entries(json)) {
    const period = parseLegacyPeriod(label);
    if (!period) throw new Error(`Unrecognised period label in the 2017 data: ${label}`);
    for (const row of rows) {
      const region = row['地區'] ?? '';
      for (const [header, raw] of Object.entries(row)) {
        const metric = columns[columnName(header)];
        if (metric) out.add(metric, period, region, raw);
      }
    }
  }
  return out.result();
}

/**
 * The Ministry of the Interior's long table:
 * `"86年 1月/ 新北市",3358415,0.93,0.86,0.07`. Yearly total rows (`86年/ …`) are skipped.
 */
export function parseMoiPopulationCsv(text: string): ParseResult {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error('The population CSV is empty');
  const metrics = header.map((h) => POPULATION_COLUMNS[columnName(h)]);
  if (!metrics.includes('population')) {
    throw new Error(`The population CSV has unexpected columns: ${header.join(', ')}`);
  }
  const out = new Collector();
  for (const row of rows) {
    const [label = '', ...cells] = row;
    const [when = '', where = ''] = label.split('/');
    const period = parseRocMonth(when);
    if (!period) continue;
    cells.forEach((cell, i) => {
      const metric = metrics[i + 1];
      if (metric) out.add(metric, period, where, cell);
    });
  }
  return out.result();
}

/**
 * The household survey's wide table: one row per year, one column per region
 * (`"年","臺灣地區-元","新北市-元",…`).
 */
export function parseYearByRegionCsv(text: string, metric: MetricId): ParseResult {
  const [header, ...rows] = parseCsv(text);
  if (!header || header[0]?.trim() !== '年') {
    throw new Error(`Expected a "年" column first, got: ${header?.join(', ') ?? 'nothing'}`);
  }
  const out = new Collector();
  for (const row of rows) {
    const year = row[0]?.trim() ?? '';
    if (!/^\d{4}$/.test(year)) continue;
    header.slice(1).forEach((regionName, i) => out.add(metric, year, regionName, row[i + 1]));
  }
  return out.result();
}
