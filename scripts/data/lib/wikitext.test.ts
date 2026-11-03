import { describe, expect, it } from 'vitest';
import { cleanInline, dateEvent, extractEvents, extractSection, linkTargets } from './wikitext.ts';
import { convertLegacyEvents, tagEvents } from './news.ts';

describe('cleanInline', () => {
  it('drops citations that the 2017 scraper glued onto the text', () => {
    const line =
      '1月25日，[[中華民國總統府|總統府]]在清晨遭砂石車衝撞。[http://news.example/a 中央社]{{Wayback|url=http://x |date=2014}}<ref>{{cite news|title=x}}</ref>';
    expect(cleanInline(line)).toBe('1月25日，總統府在清晨遭砂石車衝撞。');
  });

  it('keeps the visible text of links and text templates, and nothing of files', () => {
    expect(cleanInline("[[File:a.jpg|thumb|說明 [[臺北]]]]'''[[臺北市]]'''{{le|陳水扁|Chen Shui-bian}}")).toBe('臺北市陳水扁');
    expect(cleanInline('{{lang|en|Taiwan}} -{zh-hans:台湾;zh-tw:臺灣}- [[:en:Foo|Foo]]')).toBe('Taiwan 臺灣 Foo');
    expect(cleanInline('A&nbsp;B&amp;C &#20013;')).toBe('A B&C 中');
  });
});

describe('extractSection', () => {
  it('finds the events section under its traditional or simplified heading', () => {
    const page = '==政府==\nx\n== 大事记 ==\n*1月1日：A\n== 出生 ==\n*B';
    expect(extractSection(page)).toBe('*1月1日：A');
    expect(extractSection('==政府==\nx')).toBeUndefined();
  });
});

describe('extractEvents', () => {
  const section = [
    '=== [[2008年1月|1月]] ===',
    '*1月3日，前[[台北市市長|台北市長]]馬英九提告。<ref>x</ref>',
    '*月中，寒流來襲。',
    '=== 3月 ===',
    '*3月18日：',
    '**學生進入[[立法院]]。',
    '**[[臺北市|臺北]]有遊行。',
    '[[File:x.jpg|thumb]]',
    '*沒有日期也沒有月份的標題下面',
  ].join('\n');

  it('dates each bullet by its own prefix, its parent, or the month heading', () => {
    expect(extractEvents(section, 2008)).toEqual([
      { date: '2008-01-03', text: '1月3日，前台北市長馬英九提告。', links: ['台北市市長'] },
      { date: '2008-01', text: '月中，寒流來襲。' },
      { date: '2008-03-18', text: '學生進入立法院。', links: ['立法院'] },
      { date: '2008-03-18', text: '臺北有遊行。', links: ['臺北市'] },
      { date: '2008-03', text: '沒有日期也沒有月份的標題下面' },
    ]);
  });

  it('rejects impossible dates', () => {
    expect(dateEvent(2008, '13月40日，x')).toBeUndefined();
    expect(dateEvent(2008, '沒有日期', 2)).toBe('2008-02');
  });

  it('lists linked article titles without files', () => {
    expect(linkTargets('[[A|a]] [[File:x.png]] [[B]] [[A]]')).toEqual(['A', 'B']);
  });
});

describe('tagging events with counties', () => {
  it('uses link targets, so 「[[臺北市|臺北]]」 counts for Taipei', () => {
    expect(tagEvents([{ date: '2008-03', text: '臺北有遊行。', links: ['臺北市'] }])[0]?.counties).toEqual(['63000']);
    expect(tagEvents([{ date: '2008-03', text: '臺北有遊行。' }])[0]?.counties).toEqual([]);
  });

  it('merges the 2017 lists, which stored a two-county event twice, and re-tags them', () => {
    const legacy = {
      '2008年1月': {
        宜蘭縣: ['1月5日，宜蘭縣漁船在基隆嶼外海遇難。中央社'],
        基隆市: ['1月5日，宜蘭縣漁船在基隆嶼外海遇難。中央社'],
        其他: ['1月14日，臺北縣立委補選。'],
      },
    };
    const year = convertLegacyEvents(legacy).get(2008);
    expect(year?.input).toBe('legacy-2017');
    expect(year?.events).toEqual([
      { date: '2008-01-05', text: '1月5日，宜蘭縣漁船在基隆嶼外海遇難。中央社', counties: ['10002', '10017'] },
      // 臺北縣 became 新北市 in 2010; the 2017 filter missed it and filed this under 其他.
      { date: '2008-01-14', text: '1月14日，臺北縣立委補選。', counties: ['65000'] },
    ]);
  });
});
