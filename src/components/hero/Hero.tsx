'use client';
import type { HeroCopy } from '@/content/schema';
import { CommitHistory } from './CommitHistory';

/**
 * Commits hero: the name, one paragraph, the way to the work, and the real commit history
 * of the products below them (CommitHistory), a waveform where every line is a commit.
 */
export function Hero({ copy }: { copy: HeroCopy }) {
  const h = copy;
  return (
    <section id="top" aria-label="Introduction" className="sweep relative h-screen min-h-[560px] overflow-hidden">
      {/* centred between the nav and the history below (on a phone: its log), so the space falls evenly above and under */}
      <div className="@container absolute left-10 top-[88px] bottom-[calc(max(34vh,200px)+16px)] flex w-[min(44vw,620px)] flex-col items-start justify-center-safe max-md:inset-x-5 max-md:top-[76px] max-md:bottom-[calc(max(28vh,200px)+190px)] max-md:w-auto">
        {/* one line, as wide as its column: "Robin Malaval" is 6.15 em in the display face */}
        <h1 className="display whitespace-nowrap text-[min(16cqw,14vh)]">{h.name}</h1>
        <p className="mt-[3.2vh] max-w-[560px] text-[clamp(15px,1.25vw,19px)] leading-[1.5] text-fg-2">
          {h.kicker}. {h.sub.lead}<span className="text-fg">{h.sub.emphasis}</span>{h.sub.tail}
        </p>
        <p className="kicker mt-3 text-muted">{h.kickerNote}</p>
        <a href="#work" className="play mt-[3.4vh] text-[15px]">{h.cta}</a>
      </div>
      <CommitHistory />
    </section>
  );
}
