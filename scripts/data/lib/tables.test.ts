import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv.ts';
import { parseCell } from './records.ts';
import { HOUSEHOLD_COLUMNS, POPULATION_COLUMNS, parseLegacyTable, parseMoiPopulationCsv, parseYearByRegionCsv } from './tables.ts';

const BOM = String.fromCharCode(0xfeff);

describe('parseCsv', () => {
  it('handles a byte-order mark, quotes, doubled quotes and CRLF', () => {
    const text = `${BOM}"a","b, c"\r\n"say ""hi""",2\r\n\r\n`;
    expect(parseCsv(text)).toEqual([
      ['a', 'b, c'],
      ['say "hi"', '2'],
    ]);
  });
});

describe('parseCell', () => {
  it('reads 「-」 as zero, empty as unknown, numbers as numbers', () => {
    expect(parseCell('-')).toBe(0);
    expect(parseCell('')).toBeNull();
    expect(parseCell('…')).toBeNull();
    expect(parseCell('1,234')).toBe(1234);
    expect(parseCell('-0.25')).toBe(-0.25);
  });
});

describe('parseMoiPopulationCsv', () => {
  const csv = [
    '"人口增加","人口數(人)","總增加率(o/oo)","自然增加率(o/oo)","社會增加率(o/oo)"',
    '"86年/ 新北市",3420535,19.26,10.04,9.21',
    '"86年 1月/ 區域別總計",21537860,0.58,0.79,-0.21',
    '"86年 1月/ 新北市",3358415,0.93,0.86,0.07',
    '"87年 1月/ 連江縣",8281,-16.53,-,-16.53',
  ].join('\n');

  it('keeps months, skips yearly totals and converts ROC years', () => {
    const { records, unknownRegions } = parseMoiPopulationCsv(csv);
    expect(unknownRegions).toEqual([]);
    expect(new Set(records.map((r) => r.period))).toEqual(new Set(['1997-01', '1998-01']));
    expect(records).toContainEqual({ metric: 'population', period: '1997-01', region: '65000', value: 3358415 });
    expect(records).toContainEqual({ metric: 'population', period: '1997-01', region: 'national', value: 21537860 });
    expect(records).toContainEqual({ metric: 'naturalIncreaseRate', period: '1998-01', region: '09007', value: 0 });
  });

  it('refuses a table whose columns it does not know', () => {
    expect(() => parseMoiPopulationCsv('"x","y"\n"1",2')).toThrow(/unexpected columns/);
  });
});

describe('parseYearByRegionCsv', () => {
  it('reads one row per year and one column per region, including 臺灣地區', () => {
    const csv = '"年","臺灣地區-元","台北市-元","新北市-元"\n"1998","873175","1196141","875751"\n';
    const { records } = parseYearByRegionCsv(csv, 'disposableIncome');
    expect(records).toEqual([
      { metric: 'disposableIncome', period: '1998', region: 'national', value: 873175 },
      { metric: 'disposableIncome', period: '1998', region: '63000', value: 1196141 },
      { metric: 'disposableIncome', period: '1998', region: '65000', value: 875751 },
    ]);
  });

  it('reports region names it cannot place instead of guessing', () => {
    const { unknownRegions } = parseYearByRegionCsv('"年","火星市-元"\n"1998","1"\n', 'savings');
    expect(unknownRegions).toEqual(['火星市-元']);
  });
});

describe('parseLegacyTable (the 2017 JSON)', () => {
  it('maps labels, columns and keeps empty cells unknown', () => {
    const json = {
      '1997年1月': [
        { 地區: '區域別總計', '人口數(人)': '21537860', 總增加率: '0.58', 自然增加率: '0.79', 社會增加率: '-0.21' },
        { 地區: '連江縣', '人口數(人)': '5958', 總增加率: '-17.14', 自然增加率: '', 社會增加率: '-17.97' },
      ],
    };
    const { records } = parseLegacyTable(json, POPULATION_COLUMNS);
    expect(records).toHaveLength(8);
    expect(records).toContainEqual({ metric: 'naturalIncreaseRate', period: '1997-01', region: '09007', value: null });
  });

  it('reads the yearly household tables', () => {
    const { records } = parseLegacyTable({ '1998年': [{ 地區: '臺灣地區', 每戶儲蓄: '226831' }] }, HOUSEHOLD_COLUMNS);
    expect(records).toEqual([{ metric: 'savings', period: '1998', region: 'national', value: 226831 }]);
  });
});

describe('the committed population table', () => {
  // Evidence for reading 「-」 as zero: total increase = natural + social, so when the
  // natural rate is 「-」 the total should equal the social rate.
  it('agrees that 「-」 means zero in nearly every month it appears', () => {
    const rows = parseCsv(readFileSync(resolve(process.cwd(), 'data/sources/moi-population.csv'), 'utf8'));
    const dashed = rows.filter((r) => /月\//.test(r[0] ?? '') && r[3] === '-');
    const consistent = dashed.filter((r) => Math.abs(Number(r[2]) - Number(r[4] === '-' ? 0 : r[4])) <= 0.011);
    expect(dashed.length).toBeGreaterThan(30);
    expect(consistent.length / dashed.length).toBeGreaterThan(0.95);
  });
});
