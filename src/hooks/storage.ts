/**
 * Per-browser preferences (theme, sound). Storage can be missing or blocked
 * (private windows, embedded previews), so every access is guarded and the app
 * works without it.
 */
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not saved; the setting still applies until the page is closed.
  }
}
