import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DatasetSeries } from '../domain/atlas.ts';
import { getMetric } from '../domain/metrics.ts';
import { rankCounties } from '../lib/series.ts';
import { MetricPicker } from './MetricPicker.tsx';
import { MobileMetricMenu } from './MobileMetricMenu.tsx';
import { NO_NEWS } from './NewsList.tsx';
import { SidePanel, type PanelProps } from './SidePanel.tsx';
import { TimeControls } from './TimeControls.tsx';

describe('TimeControls', () => {
  const periods = ['1997-01', '1997-02', '1997-03'];

  it('steps, plays and jumps with the slider', async () => {
    const onStep = vi.fn();
    const onChange = vi.fn();
    const onTogglePlay = vi.fn();
    render(
      <TimeControls periods={periods} period="1997-02" onChange={onChange} onStep={onStep} playing={false} onTogglePlay={onTogglePlay} speed={1} onCycleSpeed={() => {}} />,
    );
    await userEvent.click(screen.getByRole('button', { name: '上一期' }));
    await userEvent.click(screen.getByRole('button', { name: '下一期' }));
    await userEvent.click(screen.getByRole('button', { name: '播放' }));
    fireEvent.change(screen.getByRole('slider', { name: '時間' }), { target: { value: '2' } });
    expect(onStep.mock.calls).toEqual([[-1], [1]]);
    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('1997-03');
    expect(screen.getByRole('slider', { name: '時間' })).toHaveAttribute('aria-valuetext', '1997年2月');
  });
});

describe('MetricPicker', () => {
  it('shows a hint on hover and reports the chosen metric', async () => {
    const onChange = vi.fn();
    render(<MetricPicker value="population" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: '人口數' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.hover(screen.getByRole('radio', { name: '每戶儲蓄' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('每戶儲蓄（元）');
    await userEvent.click(screen.getByRole('radio', { name: '每戶儲蓄' }));
    expect(onChange).toHaveBeenCalledWith('savings');
  });
});

describe('MobileMetricMenu', () => {
  it('opens over a mask with the 2017 sounds and closes on pick', async () => {
    const onChange = vi.fn();
    const playSound = vi.fn();
    render(<MobileMetricMenu value="population" onChange={onChange} playSound={playSound} />);
    await userEvent.click(screen.getByRole('button', { name: /展開指標選單/ }));
    expect(screen.getByTestId('menu-mask')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(9);
    await userEvent.click(screen.getByRole('menuitemradio', { name: '社會增加率' }));
    expect(onChange).toHaveBeenCalledWith('socialIncreaseRate');
    expect(playSound.mock.calls).toEqual([['fadeIn'], ['press']]);
    expect(screen.queryByTestId('menu-mask')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /展開指標選單/ }));
    await userEvent.click(screen.getByTestId('menu-mask'));
    expect(playSound).toHaveBeenLastCalledWith('fadeOut');
  });
});

describe('SidePanel', () => {
  const metric = getMetric('population');
  const series: DatasetSeries = {
    frequency: 'month',
    periods: ['2008-05'],
    provenance: [],
    metrics: { population: { values: { national: [23000000], '63000': [2600000] } } },
  };
  const base: PanelProps = {
    tab: 'county',
    onTab: () => {},
    metric,
    series,
    period: '2008-05',
    county: null,
    compare: [],
    colors: ['#000'],
    ranked: rankCounties(series, metric, '2008-05'),
    events: { county: [], national: [], source: undefined },
    yoy: null,
    onSelect: () => {},
    onToggleCompare: () => {},
    onPickPeriod: () => {},
  };

  it('asks for a county first, with the 2017 wording', () => {
    render(<SidePanel {...base} />);
    expect(screen.getByRole('tab', { name: '縣市資訊' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('請點選地圖任意地方，選取一個縣市。')).toBeInTheDocument();
  });

  it('names the tab after the county and says when there is no data or news', () => {
    render(<SidePanel {...base} county="09007" />);
    expect(screen.getByRole('tab', { name: '連江縣' })).toBeInTheDocument();
    expect(screen.getByText('尚無資料')).toBeInTheDocument();
    expect(screen.getByText(NO_NEWS)).toBeInTheDocument();
  });

  it('lets the ranking select and compare counties', async () => {
    const onSelect = vi.fn();
    const onToggleCompare = vi.fn();
    render(<SidePanel {...base} tab="ranking" onSelect={onSelect} onToggleCompare={onToggleCompare} />);
    await userEvent.click(screen.getByRole('button', { name: '臺北市' }));
    await userEvent.click(screen.getByRole('button', { name: '加入比較：臺北市' }));
    expect(onSelect).toHaveBeenCalledWith('63000');
    expect(onToggleCompare).toHaveBeenCalledWith('63000');
  });
});
