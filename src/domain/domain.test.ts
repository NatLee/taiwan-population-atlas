import { describe, expect, it } from 'vitest';
import { COUNTIES, NATIONAL, countiesMentioned, countyByCode, normaliseName, regionCodeForName, reorganisationNote } from './counties.ts';
import { METRICS } from './metrics.ts';
import { convertPeriod, formatPeriod, nearestPeriod, parseLegacyPeriod, parseRocMonth, previousYear, stepPeriod } from './periods.ts';

describe('county registry', () => {
  it('has the 22 current counties with unique five-digit codes', () => {
    expect(COUNTIES).toHaveLength(22);
    expect(new Set(COUNTIES.map((c) => c.code)).size).toBe(22);
    expect(COUNTIES.every((c) => /^\d{5}$/.test(c.code))).toBe(true);
  });

  it('normalises spellings and column suffixes', () => {
    expect(normaliseName(' 台北市_統計')).toBe('臺北市');
    expect(normaliseName('新北市-元')).toBe('新北市');
    expect(normaliseName('臺　中市')).toBe('臺中市');
  });

  it('maps former counties to the county that absorbed them (2010, 2014)', () => {
    expect(regionCodeForName('台北縣')).toBe('65000');
    expect(regionCodeForName('臺中縣')).toBe('66000');
    expect(regionCodeForName('臺南縣')).toBe('67000');
    expect(regionCodeForName('高雄縣')).toBe('64000');
    expect(regionCodeForName('桃園縣')).toBe('68000');
    expect(regionCodeForName('區域別總計')).toBe(NATIONAL);
    expect(regionCodeForName('臺灣地區')).toBe(NATIONAL);
    expect(regionCodeForName('火星市')).toBeUndefined();
  });

  it('explains how a reorganised county came to be', () => {
    expect(reorganisationNote(countyByCode('66000')!)).toBe('2010-12-25 由臺中縣與原臺中市合併升格');
    expect(reorganisationNote(countyByCode('68000')!)).toBe('2014-12-25 由桃園縣升格為桃園市');
    expect(reorganisationNote(countyByCode('63000')!)).toBeUndefined();
  });
});

describe('countiesMentioned', () => {
  it('finds full names, unambiguous short names and former names', () => {
    expect(countiesMentioned('花蓮外海地震，宜蘭縣有感')).toEqual(['10002', '10015']);
    expect(countiesMentioned('台中市長')).toEqual(['66000']);
    expect(countiesMentioned('臺北縣立委補選')).toEqual(['65000']);
    expect(countiesMentioned('馬祖機場')).toEqual(['09007']);
  });

  it('does not guess for ambiguous or misleading names', () => {
    expect(countiesMentioned('臺北地方法院')).toEqual([]);
    expect(countiesMentioned('新竹科學園區')).toEqual([]);
    expect(countiesMentioned('新北投溫泉')).toEqual([]);
  });
});

describe('periods', () => {
  it('parses the three label styles', () => {
    expect(parseLegacyPeriod('1997年1月')).toBe('1997-01');
    expect(parseLegacyPeriod('1998年')).toBe('1998');
    expect(parseRocMonth('86年 1月')).toBe('1997-01');
    expect(parseRocMonth('114年12月')).toBe('2025-12');
    expect(parseRocMonth('86年')).toBeUndefined();
    expect(formatPeriod('1997-01')).toBe('1997年1月');
    expect(formatPeriod('1998')).toBe('1998年');
  });

  it('converts between monthly and yearly data like the 2017 page', () => {
    const months = ['1997-01', '1997-02', '1998-01'];
    const years = ['1998', '1999'];
    expect(convertPeriod('1999-07', years)).toBe('1999');
    expect(convertPeriod('1998', months)).toBe('1998-01');
    // 1997 has no household survey: snap to the first year that has one.
    expect(convertPeriod('1997-05', years)).toBe('1998');
    expect(convertPeriod('2030', months)).toBe('1998-01');
    expect(convertPeriod('1997-02', months)).toBe('1997-02');
  });

  it('wraps around at both ends when stepping', () => {
    const p = ['a', 'b', 'c'];
    expect(stepPeriod('c', p, 1)).toBe('a');
    expect(stepPeriod('a', p, -1)).toBe('c');
    expect(stepPeriod('b', p, 1)).toBe('c');
  });

  it('finds neighbours and the previous year', () => {
    expect(nearestPeriod('1997-03', ['1997-01', '1997-05'])).toBe('1997-05');
    expect(previousYear('2008-05')).toBe('2007-05');
    expect(previousYear('2008')).toBe('2007');
  });
});

describe('metrics', () => {
  it('keeps the six 2017 metrics first, in their original order', () => {
    expect(METRICS.slice(0, 6).map((m) => m.label)).toEqual(['人口數', '總增加率', '自然增加率', '社會增加率', '可支配所得', '每戶儲蓄']);
  });

  it('colours every rate with a scale centred on zero', () => {
    for (const m of METRICS) expect(m.scale === 'diverging').toBe(m.unit === '‰');
  });
});
