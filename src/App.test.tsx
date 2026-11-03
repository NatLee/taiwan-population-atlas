import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.tsx';

/** Serve the real generated files from public/data, as the deployed site does. */
function mockData() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const file = resolve(process.cwd(), 'public/data', String(url).split('/data/')[1] ?? '');
      return new Response(readFileSync(file, 'utf8'), { status: 200 });
    }),
  );
}

describe('App', () => {
  beforeEach(() => {
    mockData();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens on the latest month and keeps the view in the address bar', async () => {
    render(<App />);
    await screen.findByText('請點選地圖任意地方，選取一個縣市。');
    expect(screen.getByRole('slider', { name: '時間' })).toHaveAttribute('aria-valuetext', expect.stringMatching(/^\d{4}年\d{1,2}月$/));

    await userEvent.click(screen.getByRole('tab', { name: '排名' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThanOrEqual(22);
    await userEvent.click(within(table).getByRole('button', { name: '嘉義市' }));

    expect(screen.getByRole('tab', { name: '嘉義市' })).toHaveAttribute('aria-selected', 'true');
    expect(window.location.search).toBe('?county=10020');
  });

  it('restores a shared link and converts the period when the metric changes', async () => {
    window.history.replaceState(null, '', '/?metric=savings&period=2015&county=09020');
    render(<App />);
    // Kinmen is not covered by the household survey.
    await screen.findByRole('tab', { name: '金門縣' });
    expect(screen.getAllByText('尚無資料').length).toBeGreaterThan(0);
    expect(screen.getByRole('slider', { name: '時間' })).toHaveAttribute('aria-valuetext', '2015年');

    await userEvent.click(screen.getByRole('radio', { name: '人口數' }));
    expect(screen.getByRole('slider', { name: '時間' })).toHaveAttribute('aria-valuetext', '2015年1月');
    expect(window.location.search).toBe('?period=2015-01&county=09020');
  });

  it('wraps from the first period to the last with the previous button', async () => {
    window.history.replaceState(null, '', '/?period=1997-01');
    render(<App />);
    const slider = await screen.findByRole('slider', { name: '時間' });
    expect(slider).toHaveAttribute('aria-valuetext', '1997年1月');
    await userEvent.click(screen.getByRole('button', { name: '上一期' }));
    expect(slider.getAttribute('aria-valuetext')).not.toBe('1997年1月');
    expect(window.location.search).not.toContain('1997-01');
  });
});
