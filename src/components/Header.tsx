import { Check, Link2, Monitor, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import type { ThemePreference } from '../hooks/useTheme.ts';

interface Props {
  theme: ThemePreference;
  onTheme: (next: ThemePreference) => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

const THEMES: ReadonlyArray<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'system', label: '跟隨系統', icon: Monitor },
  { value: 'light', label: '淺色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
];
/** How long the 「已複製」 confirmation stays. */
const COPIED_MS = 2000;

export function Header({ theme, onTheme, soundOn, onToggleSound }: Props) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0]!;
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]!;
  const ThemeIcon = current.icon;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied('idle'), COPIED_MS);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">人口變遷視覺分析工具</h1>
        <p className="text-sm text-ink-2">Taiwan Population Atlas・臺灣 22 縣市的人口與家庭收支</p>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label={copied === 'done' ? '已複製連結' : copied === 'failed' ? '無法複製，請直接複製網址列' : '複製這個畫面的連結'} onClick={share}>
          {copied === 'done' ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
          <span className="hidden sm:inline">{copied === 'done' ? '已複製' : '分享'}</span>
        </IconButton>
        <IconButton label={soundOn ? '關閉音效' : '開啟音效'} onClick={onToggleSound} pressed={soundOn}>
          {soundOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
        </IconButton>
        <IconButton label={`外觀：${current.label}（按一下改成${next.label}）`} onClick={() => onTheme(next.value)}>
          <ThemeIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{current.label}</span>
        </IconButton>
      </div>
      <span role="status" className="sr-only">
        {copied === 'done' ? '已複製連結' : copied === 'failed' ? '無法複製連結' : ''}
      </span>
    </header>
  );
}

function IconButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-sm text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}
