import { useEffect, useState } from 'react';
import type { Topology } from 'topojson-specification';
import { ATLAS_FORMAT_VERSION, type AtlasData, type NewsData } from '../domain/atlas.ts';

export interface LoadedData {
  atlas: AtlasData;
  news: NewsData;
  topology: Topology;
}

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: LoadedData };

/** Files written by `npm run data:build`, served from public/data/. */
const FILES = { atlas: 'atlas.json', news: 'events.json', topology: 'counties.topo.json' } as const;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function useAtlasData(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    Promise.all([getJson<AtlasData>(FILES.atlas), getJson<NewsData>(FILES.news), getJson<Topology>(FILES.topology)])
      .then(([atlas, news, topology]) => {
        if (atlas.version !== ATLAS_FORMAT_VERSION || news.version !== ATLAS_FORMAT_VERSION) {
          throw new Error('資料格式版本不符，請重新整理頁面');
        }
        if (!cancelled) setState({ status: 'ready', data: { atlas, news, topology } });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
