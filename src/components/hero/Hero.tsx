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
      <div className="absolute left-10 top-[14vh] w-[min(44vw,620px)] max-md:inset-x-5 max-md:top-[11vh] max-md:w-auto">
        <h1 className="display text-[clamp(52px,min(7.4vw,12vh),136px)]">{h.name[0]} <br />{h.name[1]}</h1>
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
