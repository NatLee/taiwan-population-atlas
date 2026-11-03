import { hcl } from 'd3-color';
import { describe, expect, it } from 'vitest';
import type { DatasetSeries, NewsData } from '../domain/atlas.ts';
import { getMetric } from '../domain/metrics.ts';
import { stepInterval, PLAYBACK_STEP_MS } from '../hooks/usePlayback.ts';
import { formatChange, formatCompact, formatValue } from './format.ts';
import { BLUE_STEP, MAX_COMPARED, RED } from './palette.ts';
import { colorDomain, colorScale } from './scales.ts';
import { eventsFor, rankCounties, yearOverYear } from './series.ts';
import { addCompared, parseViewState, removeCompared, serialiseViewState } from './viewState.ts';

const population = getMetric('population');
const social = getMetric('socialIncreaseRate');

const series: DatasetSeries = {
  frequency: 'month',
  periods: ['2007-05', '2008-05'],
  provenance: [],
  metrics: {
    population: { values: { national: [300, 330], '63000': [100, 110], '65000': [200, 220], '09007': [null, null] } },
    socialIncreaseRate: {
      values: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`1000${i}`, [i - 10, i % 2 === 0 ? 0.5 : -0.5]])),
    },
  },
};

describe('palette', () => {
  it('gives both arms of the diverging scale the same lightness at each step', () => {
    for (const step of [150, 300, 450, 500, 600, 700] as const) {
      expect(Math.abs(hcl(RED[step]).l - hcl(BLUE_STEP[step]).l)).toBeLessThan(1);
    }
  });
});

describe('colour scales', () => {
  it('uses one range for all periods, starting a log scale at 1 or more', () => {
    expect(colorDomain(population, series)).toEqual({ min: 100, max: 220, clamped: false });
  });

  it('centres rates on zero and clamps the outliers', () => {
    const d = colorDomain(social, series);
    expect(d.min).toBe(-d.max);
    expect(d.clamped).toBe(true);
    const scale = colorScale(social, d, 'light');
    expect(scale(0)).toBe(colorScale(social, d, 'light')(0));
    expect(scale(d.max * 10)).toBe(scale(d.max));
  });

  it('flips the sequential ramp in dark mode so low values sit near the surface', () => {
    const d = colorDomain(population, series);
    const light = hcl(colorScale(population, d, 'light')(d.min)).l;
    const dark = hcl(colorScale(population, d, 'dark')(d.min)).l;
    expect(light).toBeGreaterThan(dark);
  });
});

describe('format', () => {
  it('writes values with units and the 2017 「尚無資料」', () => {
    expect(formatValue(population, 3358415)).toBe('3,358,415 人');
    expect(formatValue(social, 0.4)).toBe('0.40‰');
    expect(formatValue(population, null)).toBe('尚無資料');
    expect(formatCompact(population, 4_050_000)).toBe('405萬');
    expect(formatChange(0.0123)).toBe('+1.2%');
  });
});

describe('series helpers', () => {
  it('ranks counties high to low with missing values last', () => {
    const ranked = rankCounties(series, population, '2008-05');
    expect(ranked.slice(0, 2).map((r) => [r.name, r.rank])).toEqual([
      ['新北市', 1],
      ['臺北市', 2],
    ]);
    expect(ranked.at(-1)?.rank).toBeNull();
  });

  it('compares with the same month a year earlier', () => {
    expect(yearOverYear(series, population, '63000', '2008-05')).toEqual({ diff: 10, ratio: 0.1 });
    expect(yearOverYear(series, population, '09007', '2008-05')).toBeNull();
  });

  it('picks events of the month, or of the whole year for yearly data', () => {
    const news: NewsData = {
      version: 1,
      years: {
        '2008': {
          input: 'wikipedia-events',
          events: [
            { date: '2008-05-20', text: '總統就職', counties: [] },
            { date: '2008-05-10', text: '臺北市事件', counties: ['63000'] },
            { date: '2008-07-01', text: '七月', counties: [] },
          ],
        },
      },
    };
    const may = eventsFor(news, '2008-05', '63000');
    expect(may.county.map((e) => e.text)).toEqual(['臺北市事件']);
    expect(may.national.map((e) => e.text)).toEqual(['總統就職']);
    expect(eventsFor(news, '2008', null).national).toHaveLength(2);
    expect(eventsFor(news, '1990-01', null).national).toEqual([]);
  });
});

describe('view state in the URL', () => {
  it('round-trips a view and drops defaults', () => {
    const view = { metric: 'savings' as const, period: '2015', county: '10020', compare: ['63000', null, '64000'] };
    expect(serialiseViewState(view)).toBe('?metric=savings&period=2015&county=10020&compare=63000,64000');
    expect(parseViewState(serialiseViewState(view))).toEqual({ ...view, compare: ['63000', '64000'] });
    expect(serialiseViewState(parseViewState(''))).toBe('');
  });

  it('ignores values it does not know', () => {
    expect(parseViewState('?metric=nope&period=abc&county=99999&compare=63000,x,63000')).toEqual({
      metric: 'population',
      period: null,
      county: null,
      compare: ['63000'],
    });
  });

  it('keeps each compared county in its colour slot', () => {
    let slots = addCompared([], 'a');
    slots = addCompared(slots, 'b');
    slots = addCompared(slots, 'c');
    slots = removeCompared(slots, 'b');
    expect(slots).toEqual(['a', null, 'c']);
    expect(addCompared(slots, 'd')).toEqual(['a', 'd', 'c']);
    const full = ['a', 'b', 'c', 'd'].slice(0, MAX_COMPARED);
    expect(addCompared(full, 'e')).toEqual(full);
  });
});

describe('playback speed', () => {
  it('runs any dataset in about the same time, within readable bounds', () => {
    expect(stepInterval(357, 1)).toBeCloseTo(84, 0);
    expect(stepInterval(5000, 1)).toBe(PLAYBACK_STEP_MS.min);
    expect(stepInterval(28, 1)).toBeCloseTo(1071, 0);
    expect(stepInterval(2, 1)).toBe(PLAYBACK_STEP_MS.max);
    expect(stepInterval(28, 2)).toBeCloseTo(536, 0);
  });
});
