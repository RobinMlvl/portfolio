import type { Stop } from '@/content/schema';
import { ScreenFigure } from './ScreenFigure';

export function StopBlock({ stop, index, total }: { stop: Stop; index: number; total: number }) {
  return (
    <div className="grid gap-8 border-t border-line py-10 md:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="kicker mb-4 text-fg-2">{stop.label}, {index} of {total}</p>
        <h3 className="display text-[clamp(30px,3.6vw,54px)]">{stop.title}</h3>
        <p className="mt-5 max-w-[480px] font-body text-[15.5px] leading-[1.55] text-fg-2">{stop.body}</p>
        {stop.metrics ? (
          <ul className="mt-6 flex flex-wrap gap-8">
            {stop.metrics.map((m) => (<li key={m.label}><span className="display block text-[26px]">{m.value}</span><span className="kicker mt-2 block text-muted">{m.label}</span></li>))}
          </ul>
        ) : null}
      </div>
      <div className="grid gap-4">{stop.screens.map((s) => <ScreenFigure key={s.key} screen={s} />)}</div>
    </div>
  );
}
