import type { NewsEvent, NewsYear } from '../domain/atlas.ts';
import { CC_BY_SA_4, SOURCES } from '../domain/sources.ts';

/** The 2017 page's message when a period has no events. */
export const NO_NEWS = '很抱歉，尚無重大新聞。';

export function NewsList({ events, source }: { events: readonly NewsEvent[]; source: NewsYear | undefined }) {
  return (
    <div>
      {events.length === 0 ? (
        <p className="text-sm text-ink-2">{NO_NEWS}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={`${e.date}-${e.text.slice(0, 24)}`} className="text-sm leading-relaxed">
              {e.text}
            </li>
          ))}
        </ul>
      )}
      {source && <NewsAttribution source={source} />}
    </div>
  );
}

function NewsAttribution({ source }: { source: NewsYear }) {
  const licence = SOURCES['wikipedia-events'].licence;
  return (
    <p className="mt-3 border-t border-line pt-2 text-xs text-ink-2">
      {source.page ? (
        <>
          資料來源：維基百科
          <a className="underline underline-offset-2 hover:text-ink" href={source.page.url} target="_blank" rel="noreferrer">
            「{source.page.title}」
          </a>
          的大事記，依{' '}
          <a className="underline underline-offset-2 hover:text-ink" href={licence.url} target="_blank" rel="noreferrer">
            {CC_BY_SA_4.name}
          </a>{' '}
          授權使用。
        </>
      ) : (
        <>資料來源：2017 年從維基百科整理的大事記（{CC_BY_SA_4.name}）。</>
      )}
    </p>
  );
}
