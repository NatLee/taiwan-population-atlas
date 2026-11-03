import { describe, expect, it } from 'vitest';
import { mergeLayers } from './merge.ts';
import type { ValueRecord } from './records.ts';

const rec = (period: string, region: string, value: number | null, metric: ValueRecord['metric'] = 'population'): ValueRecord => ({
  metric,
  period,
  region,
  value,
});

describe('mergeLayers', () => {
  it('lets newer inputs win and reports every changed number', () => {
    const { series, report } = mergeLayers('population', [
      { input: 'legacy-2017', records: [rec('1997-01', '63000', 100), rec('1997-02', '63000', 101)] },
      { input: 'moi-population', records: [rec('1997-01', '63000', 100), rec('1997-02', '63000', 102), rec('1997-03', '63000', 103)] },
    ]);
    expect(series.periods).toEqual(['1997-01', '1997-02', '1997-03']);
    expect(series.metrics.population?.values['63000']).toEqual([100, 102, 103]);
    expect(report.overlapping).toBe(2);
    expect(report.differences).toEqual([{ metric: 'population', period: '1997-02', region: '63000', older: 101, newer: 102 }]);
    expect(series.provenance).toEqual([{ input: 'moi-population', first: '1997-01', last: '1997-03' }]);
  });

  it('never lets a gap in a newer input erase an older number', () => {
    const { series } = mergeLayers('population', [
      { input: 'legacy-2017', records: [rec('1997-01', '63000', 100)] },
      { input: 'moi-population', records: [rec('1997-01', '63000', null)] },
    ]);
    expect(series.metrics.population?.values['63000']).toEqual([100]);
  });

  it('leaves out regions a survey does not cover and fills gaps with null', () => {
    const { series } = mergeLayers('household', [
      { input: 'dgbas-savings', records: [rec('1998', '63000', 5, 'savings'), rec('1999', 'national', 6, 'savings')] },
    ]);
    const values = series.metrics.savings?.values ?? {};
    expect(Object.keys(values).sort()).toEqual(['63000', 'national']);
    expect(values['63000']).toEqual([5, null]);
    expect(values['09020']).toBeUndefined();
  });

  it('ignores metrics of the other dataset and rejects the wrong time step', () => {
    const { series } = mergeLayers('population', [{ input: 'dgbas-savings', records: [rec('1998', '63000', 5, 'savings')] }]);
    expect(series.periods).toEqual([]);
    expect(() => mergeLayers('household', [{ input: 'dgbas-savings', records: [rec('1998-01', '63000', 5, 'savings')] }])).toThrow(/not a year period/);
  });
});
