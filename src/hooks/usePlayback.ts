import { useEffect, useState } from 'react';
import type { Period } from '../domain/periods.ts';

/**
 * A full run through a dataset takes about this long at 1×, whatever its
 * length: 357 months step quickly, 28 years step slowly.
 */
export const PLAYBACK_RUN_MS = 30_000;
/** Bounds so monthly data stays readable and yearly data does not crawl. */
export const PLAYBACK_STEP_MS = { min: 80, max: 1200 } as const;
export const PLAYBACK_SPEEDS = [1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function stepInterval(periodCount: number, speed: PlaybackSpeed): number {
  const base = PLAYBACK_RUN_MS / Math.max(periodCount, 1);
  return Math.min(PLAYBACK_STEP_MS.max, Math.max(PLAYBACK_STEP_MS.min, base)) / speed;
}

/** Advance through `periods` while playing; stops on the last one. */
export function usePlayback(periods: readonly Period[], current: Period, onStep: (p: Period) => void) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const index = periods.indexOf(current);
  const atEnd = index === periods.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const timer = window.setTimeout(() => {
      const next = periods[index + 1];
      if (next) onStep(next);
      // Stop on arrival, so a later metric change (new, longer period list) does not resume playback.
      if (index + 1 >= periods.length - 1) setPlaying(false);
    }, stepInterval(periods.length, speed));
    return () => window.clearTimeout(timer);
  }, [playing, atEnd, index, periods, speed, onStep]);

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) {
      // Pressing play on the last period starts over, like a video player.
      const first = periods[0];
      if (first) onStep(first);
    }
    setPlaying(true);
  };
  const cycleSpeed = () =>
    setSpeed((s) => PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(s) + 1) % PLAYBACK_SPEEDS.length] ?? 1);
  return { playing, toggle, stop: () => setPlaying(false), speed, cycleSpeed };
}
