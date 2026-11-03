import { useCallback, useState } from 'react';
import { readPreference, writePreference } from './storage.ts';

/**
 * The 2017 page played these when its phone menu opened, closed and when a
 * metric was picked. They are kept, with a switch to turn them off.
 */
export type SoundName = 'fadeIn' | 'fadeOut' | 'press';
const KEY = 'sound';

export function useSound() {
  const [enabled, setEnabled] = useState(() => readPreference(KEY) !== 'off');
  const play = useCallback(
    (name: SoundName) => {
      if (!enabled || typeof Audio === 'undefined') return;
      const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${name}.wav`);
      // Browsers may refuse to play before the first tap; a missing sound is not an error.
      audio.play()?.catch(() => undefined);
    },
    [enabled],
  );
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    writePreference(KEY, next ? 'on' : 'off');
  };
  return { enabled, toggle, play };
}
