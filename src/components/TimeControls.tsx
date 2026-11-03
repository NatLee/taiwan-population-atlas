import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { formatPeriod, type Period } from '../domain/periods.ts';
import type { PlaybackSpeed } from '../hooks/usePlayback.ts';

interface Props {
  periods: readonly Period[];
  period: Period;
  onChange: (period: Period) => void;
  onStep: (delta: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: PlaybackSpeed;
  onCycleSpeed: () => void;
}

/** Previous / play / next and the time slider. The arrows wrap around at both ends, as in 2017. */
export function TimeControls({ periods, period, onChange, onStep, playing, onTogglePlay, speed, onCycleSpeed }: Props) {
  const index = Math.max(periods.indexOf(period), 0);
  const first = periods[0] ?? period;
  const last = periods[periods.length - 1] ?? period;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <div className="flex items-center gap-1">
          <RoundButton label="上一期" onClick={() => onStep(-1)}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </RoundButton>
          <RoundButton label={playing ? '暫停' : '播放'} onClick={onTogglePlay} primary>
            {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          </RoundButton>
          <RoundButton label="下一期" onClick={() => onStep(1)}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </RoundButton>
          <button
            type="button"
            onClick={onCycleSpeed}
            aria-label={`播放速度 ${speed} 倍，按一下切換`}
            className="ml-1 h-8 min-w-11 rounded-full border border-line px-2 text-xs tabular-nums text-ink-2 hover:bg-surface-2"
          >
            {speed}×
          </button>
        </div>
        <output aria-live={playing ? 'off' : 'polite'} className="min-w-28 text-right text-lg font-semibold sm:hidden">
          {formatPeriod(period)}
        </output>
      </div>
      <div className="flex flex-1 flex-col">
        <input
          type="range"
          min={0}
          max={Math.max(periods.length - 1, 0)}
          step={1}
          value={index}
          onChange={(e) => {
            const next = periods[Number(e.target.value)];
            if (next) onChange(next);
          }}
          aria-label="時間"
          aria-valuetext={formatPeriod(period)}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs tabular-nums text-ink-2">
          <span>{formatPeriod(first)}</span>
          <span>{formatPeriod(last)}</span>
        </div>
      </div>
      <output aria-hidden="true" className="hidden min-w-28 text-right text-xl font-semibold sm:block">
        {formatPeriod(period)}
      </output>
    </div>
  );
}

function RoundButton({ label, onClick, primary, children }: { label: string; onClick: () => void; primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        primary ? 'bg-accent text-on-accent hover:opacity-90' : 'text-ink hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  );
}
