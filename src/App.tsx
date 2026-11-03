import { useCallback, useMemo, useState } from 'react';
import { ChoroplethMap, type MapCounty } from './components/ChoroplethMap.tsx';
import { Footer } from './components/Footer.tsx';
import { Header } from './components/Header.tsx';
import { Legend } from './components/Legend.tsx';
import { MetricPicker } from './components/MetricPicker.tsx';
import { MobileMetricMenu } from './components/MobileMetricMenu.tsx';
import { SidePanel, type PanelTab } from './components/SidePanel.tsx';
import { TimeControls } from './components/TimeControls.tsx';
import { COUNTIES } from './domain/counties.ts';
import { getMetric, type MetricId } from './domain/metrics.ts';
import { convertPeriod, formatPeriod, stepPeriod, yearOf, type Period } from './domain/periods.ts';
import { useAtlasData, type LoadedData } from './hooks/useAtlasData.ts';
import { usePlayback } from './hooks/usePlayback.ts';
import { useSound } from './hooks/useSound.ts';
import { useTheme } from './hooks/useTheme.ts';
import { useViewState } from './hooks/useViewState.ts';
import { formatValue } from './lib/format.ts';
import { PALETTES } from './lib/palette.ts';
import { colorDomain, colorScale, legendStops } from './lib/scales.ts';
import { datasetOf, eventsFor, rankCounties, yearOverYear } from './lib/series.ts';
import { addCompared, removeCompared } from './lib/viewState.ts';

export default function App() {
  const load = useAtlasData();
  const theme = useTheme();
  const sound = useSound();

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1480px] flex-col gap-3 px-4 py-4 lg:px-6">
      <Header theme={theme.preference} onTheme={theme.choose} soundOn={sound.enabled} onToggleSound={sound.toggle} />
      {load.status === 'ready' ? (
        <Atlas data={load.data} theme={theme.resolved} playSound={sound.play} />
      ) : (
        <p role="status" className="py-24 text-center text-ink-2">
          {load.status === 'loading' ? '載入資料中…' : `資料載入失敗：${load.message}`}
        </p>
      )}
    </div>
  );
}

interface AtlasProps {
  data: LoadedData;
  theme: ReturnType<typeof useTheme>['resolved'];
  playSound: ReturnType<typeof useSound>['play'];
}

function Atlas({ data, theme, playSound }: AtlasProps) {
  const [view, update] = useViewState();
  const [tab, setTab] = useState<PanelTab>('county');

  const metric = getMetric(view.metric);
  const series = datasetOf(data.atlas, metric);
  const periods = series.periods;
  const latest = periods[periods.length - 1] ?? '';
  // Shared links may name a period this dataset does not have; snap to the closest one.
  const period = (view.period && convertPeriod(view.period, periods)) || latest;
  const index = periods.indexOf(period);

  const domain = useMemo(() => colorDomain(metric, series), [metric, series]);
  const color = useMemo(() => colorScale(metric, domain, theme), [metric, domain, theme]);
  const palette = PALETTES[theme];
  const values = useMemo(() => series.metrics[metric.id]?.values ?? {}, [series, metric]);

  const mapCounties = useMemo(() => {
    const out: Record<string, MapCounty> = {};
    for (const c of COUNTIES) {
      const v = values[c.code]?.[index] ?? null;
      out[c.code] = { fill: v === null ? undefined : color(v), label: `${c.name}：${formatValue(metric, v)}` };
    }
    return out;
  }, [values, index, color, metric]);

  const outlines = useMemo(() => {
    const out: Record<string, string> = {};
    view.compare.forEach((code, i) => {
      const c = palette.categorical[i];
      if (code && c) out[code] = c;
    });
    return out;
  }, [view.compare, palette]);

  const ranked = useMemo(() => rankCounties(series, metric, period), [series, metric, period]);
  const events = useMemo(() => eventsFor(data.news, period, view.county), [data.news, period, view.county]);
  const yoy = view.county ? yearOverYear(series, metric, view.county, period) : null;

  const setPeriod = useCallback((p: Period) => update({ period: p }), [update]);
  const playback = usePlayback(periods, period, setPeriod);

  const step = (delta: number) => {
    playback.stop();
    const next = stepPeriod(period, periods, delta);
    if (next) setPeriod(next);
  };
  const changeMetric = (id: MetricId) => {
    const next = getMetric(id);
    update({ metric: id, period: convertPeriod(period, datasetOf(data.atlas, next).periods) ?? null });
  };
  const select = (code: string | null) => {
    update({ county: code });
    if (code) setTab('county');
  };
  const toggleCompare = (code: string) =>
    update({ compare: view.compare.includes(code) ? removeCompared(view.compare, code) : addCompared(view.compare, code) });

  const years = periods.map(yearOf);
  const rangeLabel = `${years[0]}–${years[years.length - 1]}`;
  const legend = (
    <Legend
      metric={metric}
      domain={domain}
      stops={legendStops(metric, theme)}
      showNoData={COUNTIES.some((c) => (values[c.code]?.[index] ?? null) === null)}
      rangeLabel={rangeLabel}
    />
  );

  return (
    <>
      <div className="hidden md:block">
        <MetricPicker value={metric.id} onChange={changeMetric} />
      </div>
      <main className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:h-[calc(100dvh-12rem)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="relative h-[62vh] min-h-[360px] rounded-xl border border-line bg-surface lg:h-auto lg:flex-1">
            <ChoroplethMap
              topology={data.topology}
              counties={mapCounties}
              selected={view.county}
              outlines={outlines}
              onSelect={select}
              overlay={<div className="hidden md:block">{legend}</div>}
            />
            <div className="md:hidden">
              <MobileMetricMenu value={metric.id} onChange={changeMetric} playSound={playSound} />
            </div>
          </div>
          <div className="md:hidden">{legend}</div>
          <TimeControls
            periods={periods}
            period={period}
            onChange={(p) => {
              playback.stop();
              setPeriod(p);
            }}
            onStep={step}
            playing={playback.playing}
            onTogglePlay={playback.toggle}
            speed={playback.speed}
            onCycleSpeed={playback.cycleSpeed}
          />
        </div>
        <SidePanel
          tab={tab}
          onTab={setTab}
          metric={metric}
          series={series}
          period={period}
          county={view.county}
          compare={view.compare}
          colors={palette.categorical}
          ranked={ranked}
          events={events}
          yoy={yoy}
          onSelect={select}
          onToggleCompare={toggleCompare}
          onPickPeriod={(p) => {
            playback.stop();
            setPeriod(p);
          }}
        />
      </main>
      <p className="sr-only" aria-live="polite">
        {playback.playing ? '' : `${formatPeriod(period)}，${metric.label}`}
      </p>
      <Footer atlas={data.atlas} />
    </>
  );
}
