import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayback, stepInterval } from './usePlayback.ts';

const PERIODS = ['a', 'b', 'c'];

function usePlayer(start: string) {
  const [period, setPeriod] = useState(start);
  return { period, ...usePlayback(PERIODS, period, setPeriod) };
}

describe('usePlayback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const tick = () => act(() => vi.advanceTimersByTime(stepInterval(PERIODS.length, 1)));

  it('plays to the last period and stops there', () => {
    const { result } = renderHook(() => usePlayer('a'));
    act(() => result.current.toggle());
    tick();
    expect(result.current.period).toBe('b');
    tick();
    expect(result.current.period).toBe('c');
    expect(result.current.playing).toBe(false);
  });

  // Regression: the flag used to stay on at the end, so the first press did nothing.
  it('starts over with a single press once it has reached the end', () => {
    const { result } = renderHook(() => usePlayer('b'));
    act(() => result.current.toggle());
    tick();
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.period).toBe('a');
    expect(result.current.playing).toBe(true);
  });
});
