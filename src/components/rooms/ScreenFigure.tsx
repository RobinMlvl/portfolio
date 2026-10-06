import Image from 'next/image';
import type { Screen } from '@/content/schema';

export function ScreenFigure({ screen }: { screen: Screen }) {
  if (screen.kind === 'placeholder') {
    return (
      <figure className="flex aspect-[16/7] items-end rounded-xl bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/.06)]">
        <figcaption className="kicker text-muted">{screen.label}, screen to come</figcaption>
      </figure>
    );
  }
  if (screen.kind === 'video') {
    // the plain page never starts a film by itself: the visitor presses play, with sound
    return (
      <figure className="overflow-hidden rounded-xl bg-surface p-1.5 shadow-[0_10px_30px_-12px_rgb(0_0_0/.35)]">
        <video src={screen.src} poster={screen.poster} width={screen.width} height={screen.height} playsInline controls preload="none" aria-label={screen.alt} className="h-auto w-full rounded-lg" />
        <figcaption className="kicker px-3 py-2.5 text-fg-2">{screen.caption}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-xl bg-surface p-1.5 shadow-[0_10px_30px_-12px_rgb(0_0_0/.35)]">
      <Image src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} sizes="(max-width: 900px) 100vw, 800px" className="h-auto w-full" />
      <figcaption className="kicker px-3 py-2.5 text-fg-2">{screen.caption}</figcaption>
    </figure>
  );
}
