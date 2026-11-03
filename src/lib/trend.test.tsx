import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TrendChart } from '../components/TrendChart.tsx';
import type { AtlasData, DatasetSeries } from '../domain/atlas.ts';
import { METRICS, getMetric } from '../domain/metrics.ts';
import { trendLines } from './trend.ts';

const population = getMetric('population');
const social = getMetric('socialIncreaseRate');
const series: DatasetSeries = {
  frequency: 'month',
  periods: ['2026-08', '2026-09'],
  provenance: [],
  metrics: {
    population: { values: { national: [23_220_000, 23_213_251], '63000': [2_480_000, 2_479_000] } },
    socialIncreaseRate: { values: { national: [-0.1, 0.2], '63000': [-1, 1] } },
  },
};
const colors = ['#c1', '#c2', '#c3', '#c4'];

describe('trendLines', () => {
  // Regression: with no county selected, 人口數 drew nothing (the national total was always left out).
  it('draws the national line on its own when no county is shown, even for a total', () => {
    const lines = trendLines({ metric: population, series, county: null, compare: [], colors });
    expect(lines.map((l) => [l.key, l.role])).toEqual([['national', 'focus']]);
  });

  it('leaves a national total out next to counties, but keeps a national rate as reference', () => {
    expect(trendLines({ metric: population, series, county: '63000', compare: [], colors }).map((l) => l.key)).toEqual(['63000']);
    expect(trendLines({ metric: social, series, county: '63000', compare: [], colors }).map((l) => [l.key, l.role])).toEqual([
      ['63000', 'focus'],
      ['national', 'reference'],
    ]);
  });

  it('colours compared counties by their slot', () => {
    const lines = trendLines({ metric: social, series, county: null, compare: [null, '63000'], colors });
    expect(lines[0]).toMatchObject({ key: '63000', color: '#c2', role: 'compare' });
  });

  it('has something to draw for every metric with the real data and no county selected', () => {
    const atlas = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/atlas.json'), 'utf8')) as AtlasData;
    for (const metric of METRICS) {
      const lines = trendLines({ metric, series: atlas.datasets[metric.dataset], county: null, compare: [], colors });
      expect(lines.length, metric.id).toBe(1);
      expect(lines[0]?.values.some((v) => v !== null), metric.id).toBe(true);
    }
  });
});

describe('TrendChart', () => {
  // happy-dom has no layout; give the chart a width so it draws.
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  beforeEach(() => Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 360 }));
  afterEach(() => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', descriptor);
  });

  it('draws the national population with axis labels in 萬, not a 0–1 axis', () => {
    const lines = trendLines({ metric: population, series, county: null, compare: [], colors });
    const { container } = render(<TrendChart metric={population} periods={series.periods} series={lines} current="2026-09" onPick={() => {}} />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toMatch(/^M/);
    const ticks = [...container.querySelectorAll('text')].map((t) => t.textContent ?? '');
    expect(ticks.some((t) => t.includes('萬'))).toBe(true);
    expect(ticks).not.toContain('1');
  });

  it('says there is nothing to draw instead of inventing an axis', () => {
    const { container } = render(<TrendChart metric={population} periods={series.periods} series={[]} current="2026-09" onPick={() => {}} />);
    expect(screen.getByText('尚無資料可以畫成趨勢圖。')).toBeInTheDocument();
    expect(container.querySelector('svg[role="img"]')).toBeNull();
  });
});
