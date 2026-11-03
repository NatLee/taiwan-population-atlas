/**
 * Turn the 「大事記」 section of a zh.wikipedia "YYYY年臺灣" page into dated events.
 *
 * This replaces the 2017 scripts (`python爬WIKI/單年.py`, `批次.py`), which saved the
 * rendered page text. Rendered text glued each citation's link text onto the event
 * ("…總統府大門。中央社蕃薯藤中天新聞網"); working from the wikitext lets us drop
 * citations and keep only the sentence.
 */

/** Section headings that hold the year's events. Older pages still use the simplified 「大事记」. */
export const EVENT_SECTION_HEADINGS = ['大事記', '大事记', '大事', '重大事件', '事件'];

export interface RawEvent {
  /** `YYYY-MM-DD`, or `YYYY-MM` when the text gives no day. */
  date: string;
  text: string;
  /**
   * Pages the text links to. 「[[臺北市|臺北]]」 shows only the ambiguous 臺北, but the
   * link says which county is meant, so tagging reads these too.
   */
  links?: string[];
}

/** Return the body of the first level-2 section whose heading is one of `headings`. */
export function extractSection(wikitext: string, headings: readonly string[] = EVENT_SECTION_HEADINGS): string | undefined {
  const lines = wikitext.split(/\r?\n/);
  const level2 = /^==(?!=)\s*(.*?)\s*==\s*$/;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = level2.exec(lines[i] ?? '');
    if (!m) continue;
    if (start >= 0) return lines.slice(start, i).join('\n');
    if (headings.includes(cleanInline(m[1] ?? ''))) start = i + 1;
  }
  return start >= 0 ? lines.slice(start).join('\n') : undefined;
}

/**
 * Templates whose output is reader-facing text, and which parameter holds it.
 * Everything else (citations, {{Wayback}}, {{Dead link}}…) renders to nothing.
 */
const TEXT_TEMPLATES: Record<string, (params: string[]) => string> = {
  lang: (p) => p[1] ?? '',
  le: (p) => p[0] ?? '',
  ill: (p) => p[0] ?? '',
  tsl: (p) => p[2] ?? p[1] ?? '',
  nowrap: (p) => p[0] ?? '',
};

function expandTemplate(body: string): string {
  const parts = body.split('|').map((s) => s.trim());
  const name = (parts[0] ?? '').toLowerCase().replace(/_/g, ' ');
  const positional = parts.slice(1).filter((p) => !/^[\w\s-]+=/.test(p));
  // {{lang-en|…}}, {{link-en|中文|English}}: the first argument is the visible text.
  if (name.startsWith('lang-') || name.startsWith('link-')) return positional[0] ?? '';
  const render = TEXT_TEMPLATES[name];
  return render ? render(positional) : '';
}

/** Replace innermost matches of `pattern` until none are left (handles nesting). */
function replaceInnermost(text: string, pattern: RegExp, replace: (inner: string) => string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(pattern, (_, inner: string) => replace(inner));
  } while (current !== previous);
  return current;
}

const NON_ARTICLE_NAMESPACES = /^:?(file|image|檔案|文件|图像|圖像|category|分類|分类)\s*:/i;

function renderLink(inner: string): string {
  if (NON_ARTICLE_NAMESPACES.test(inner)) return '';
  const [target = '', ...labels] = inner.split('|');
  if (labels.length > 0) return labels.join('|');
  // [[:en:Foo]] → Foo, [[Page#Section]] → Page
  return target.replace(/^:/, '').replace(/^[a-z]{2,3}(-[a-z]+)?:/i, '').replace(/#.*$/, '');
}

/** Language-variant markup `-{zh-hans:…;zh-hant:…}-`: prefer the Taiwanese text. */
function renderVariant(inner: string): string {
  if (!/zh-[a-z]+\s*:/.test(inner)) return inner;
  const variants = new Map<string, string>();
  for (const part of inner.split(';')) {
    const m = /^\s*(zh-[a-z]+)\s*:(.*)$/.exec(part);
    if (m?.[1]) variants.set(m[1], (m[2] ?? '').trim());
  }
  return variants.get('zh-tw') ?? variants.get('zh-hant') ?? [...variants.values()][0] ?? '';
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—' };

/** Strip markup from one line of wikitext, keeping only what a reader sees. */
export function cleanInline(text: string): string {
  let s = text;
  s = replaceInnermost(s, /\{\{([^{}]*)\}\}/g, expandTemplate);
  s = replaceInnermost(s, /-\{([^{}]*)\}-/g, renderVariant);
  s = replaceInnermost(s, /\[\[([^[\]]*)\]\]/g, renderLink);
  // External links are citations on these pages ("[http://… 中央社]"); drop them with their label.
  s = s.replace(/\[(?:https?:)?\/\/[^\s\]]+(?:\s[^\]]*)?\]/g, '');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/'{2,}/g, '');
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<\/?[a-z][^>]*>/gi, '');
  s = s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith('#x') || e.startsWith('#X')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
  return s.replace(/\s+/g, ' ').trim();
}

/** Article titles linked from a line of wikitext (files and categories excluded). */
export function linkTargets(wikitext: string): string[] {
  const targets = [...wikitext.matchAll(/\[\[([^[\]|]+)/g)].map((m) => (m[1] ?? '').trim());
  return [...new Set(targets.filter((t) => t && !NON_ARTICLE_NAMESPACES.test(t)))];
}

/** Remove things that may span lines before the text is split into bullets. */
function stripBlocks(wikitext: string): string {
  return wikitext
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<gallery\b[\s\S]*?<\/gallery>/gi, '');
}

const DAY = /^(\d{1,2})月(\d{1,2})日/;
const MONTH_ONLY = /^(\d{1,2})月/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date a line by its own prefix (`3月18日`), or fall back to the given month. */
export function dateEvent(year: number, text: string, fallbackMonth?: number): string | undefined {
  const day = DAY.exec(text);
  if (day) {
    const month = Number(day[1]);
    const date = Number(day[2]);
    if (month >= 1 && month <= 12 && date >= 1 && date <= 31) return `${year}-${pad(month)}-${pad(date)}`;
  }
  const month = MONTH_ONLY.exec(text);
  if (month && Number(month[1]) >= 1 && Number(month[1]) <= 12) return `${year}-${pad(Number(month[1]))}`;
  return fallbackMonth ? `${year}-${pad(fallbackMonth)}` : undefined;
}

/** A bullet that is only a date (`*3月18日：`) introduces the sub-bullets under it. */
function isDateOnly(text: string): boolean {
  return text.replace(DAY, '').replace(MONTH_ONLY, '').replace(/[：:，,、\s]/g, '') === '';
}

/** Read every bullet of the events section into dated events, in page order. */
export function extractEvents(section: string, year: number): RawEvent[] {
  const events: RawEvent[] = [];
  let headingMonth: number | undefined;
  const parentDates: string[] = [];

  for (const line of stripBlocks(section).split(/\r?\n/)) {
    const heading = /^={3,}\s*(.*?)\s*={3,}\s*$/.exec(line);
    if (heading) {
      const m = /(\d{1,2})月/.exec(cleanInline(heading[1] ?? ''));
      headingMonth = m ? Number(m[1]) : headingMonth;
      parentDates.length = 0;
      continue;
    }
    const bullet = /^(\*+)\s*(.*)$/.exec(line);
    if (!bullet) continue;
    const depth = (bullet[1] ?? '').length;
    const text = cleanInline(bullet[2] ?? '');
    parentDates.length = depth - 1;
    const inherited = parentDates[depth - 2];
    const date = DAY.test(text) || MONTH_ONLY.test(text)
      ? dateEvent(year, text, headingMonth)
      : inherited ?? dateEvent(year, text, headingMonth);
    if (!date) continue;
    parentDates[depth - 1] = date;
    if (text === '' || isDateOnly(text)) continue;
    const links = linkTargets(bullet[2] ?? '');
    events.push(links.length > 0 ? { date, text, links } : { date, text });
  }
  return events;
}
