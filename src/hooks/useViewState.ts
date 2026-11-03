import { useCallback, useEffect, useState } from 'react';
import { parseViewState, serialiseViewState, type ViewState } from '../lib/viewState.ts';

/**
 * The current view, kept in sync with the address bar. Changes replace the
 * history entry instead of adding one, so playing through 30 years does not
 * fill the back button with hundreds of steps.
 */
export function useViewState() {
  const [state, setState] = useState<ViewState>(() => parseViewState(window.location.search));

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const query = serialiseViewState(state);
    if (query !== search) window.history.replaceState(null, '', `${pathname}${query}${hash}`);
  }, [state]);

  useEffect(() => {
    const onPop = () => setState(parseViewState(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch: Partial<ViewState>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update] as const;
}
