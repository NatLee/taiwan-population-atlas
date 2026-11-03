import { useEffect, useState } from 'react';
import type { ThemeName } from '../lib/palette.ts';
import { readPreference, writePreference } from './storage.ts';

export type ThemePreference = 'system' | ThemeName;
// index.html reads the same key before React starts, so the first paint is already in the right theme.
const KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): ThemeName {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Light, dark, or follow the operating system; the resolved theme is stamped on <html>. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const saved = readPreference(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const [system, setSystem] = useState<ThemeName>(systemTheme);

  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) return;
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved: ThemeName = preference === 'system' ? system : preference;
  useEffect(() => {
    document.documentElement.dataset['theme'] = resolved;
  }, [resolved]);

  const choose = (next: ThemePreference) => {
    setPreference(next);
    writePreference(KEY, next);
  };
  return { preference, resolved, choose };
}
