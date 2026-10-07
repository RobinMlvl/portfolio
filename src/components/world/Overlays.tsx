'use client';
/**
 * DOM layers over the canvas, Commits direction. In the carousel: the product sheet (beside the
 * carousel on a wide viewport, under it elsewhere) and the legend of the products with their
 * commits week by week. Inside a product: the chapter track and the caption card for screens
 * that are not a film, and the back pill. Pure functions of the discrete snapshot; nothing here
 * runs per frame.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { PublicRoom } from '@/content/schema';
import { ProductLogo } from '@/components/rooms/ProductLogo';
import { REPO_COLOR, weeklyCounts, type History } from '@/lib/commits';
import { screenCaption, stackOf, type StackEntry } from '@/lib/world/screens';
import type { WorldActions, WorldSnapshot } from '@/lib/world/useWorld';

const two = (n: number) => String(n).padStart(2, '0');
const STATUS_DOT: Record<PublicRoom['status'], string> = { live: 'bg-test', internal: 'bg-fix', prototype: 'bg-muted' };
const hostOf = (url: string) => new URL(url).host.replace(/^www\./, '');

/**
 * The product facing the camera: where it stands among the others, what it is, what Robin did,
 * when, with what, three numbers, and the way in (or to the live site). On a wide viewport it
 * stands on the left of the carousel; elsewhere it sits under the screen, at a fixed height.
 */
export function ProductSheet({ rooms, index, wide, film, visible, actions }: { rooms: PublicRoom[]; index: number; wide: boolean; /** the product is shown by one film */ film: boolean; visible: boolean; actions: WorldActions }) {
  const room = rooms[index];
  const header = (
    <div className="kicker flex items-center gap-4 text-muted">
      <span className="text-fg">Selected work</span>
      <span>{two(index + 1)} / {two(rooms.length)}</span>
      <span className="ml-auto flex gap-1.5">
        <button type="button" className="arrow" aria-label="Previous product" disabled={index === 0} onClick={() => actions.goToRoom(index - 1)}>←</button>
        <button type="button" className="arrow" aria-label="Next product" disabled={index === rooms.length - 1} onClick={() => actions.goToRoom(index + 1)}>→</button>
      </span>
    </div>
  );
  const status = <p className="kicker flex items-center gap-2 text-fg"><span aria-hidden className={`h-[7px] w-[7px] flex-none rounded-full ${STATUS_DOT[room.status]}`} />{room.kicker}</p>;
  const stack = <ul aria-label="Stack" className="flex flex-wrap gap-1.5">{room.stack.map((t) => <li key={t} className="chip">{t}</li>)}</ul>;
  const ways = (
    <div className="flex items-center gap-7">
      <button type="button" onClick={() => actions.enter(index)} className="play text-[14px]">{film ? 'Play the film' : 'Open'}<span className="sr-only"> {room.name}</span></button>
      {room.url ? <a href={room.url} target="_blank" rel="noreferrer" className="kicker text-fg-2 transition-colors hover:text-fg">Visit {hostOf(room.url)} ↗</a> : null}
    </div>
  );
  const shown = { opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 12}px)` };

  if (wide) {
    return (
      <aside aria-label="Product" inert={!visible} className="absolute bottom-10 left-10 top-[104px] z-10 flex w-[min(30vw,440px)] flex-col transition-[opacity,transform] duration-500" style={shown}>
        {header}
        <div key={room.slug} className="swap my-auto">
          <h2 className="flex items-center gap-3"><ProductLogo logo={room.logo} scale={0.8} /></h2>
          <div className="mt-4">{status}</div>
          <p className="mt-4 text-[15px] leading-[1.55] text-fg-2">{room.oneLiner}</p>
          <dl className="mt-6 grid grid-cols-[64px_1fr] items-baseline gap-x-4 gap-y-2.5 text-[14px]">
            <dt className="kicker text-muted">role</dt><dd>{room.role}</dd>
            <dt className="kicker text-muted">period</dt><dd>{room.period}</dd>
            <dt className="kicker text-muted">stack</dt><dd>{stack}</dd>
          </dl>
          <ul className="mt-7 flex gap-8">
            {room.metrics.map((m) => (<li key={m.label}><b className="block text-[26px] font-semibold leading-none tracking-[-0.03em]">{m.value}</b><span className="mt-1.5 block text-[12.5px] text-fg-2">{m.label}</span></li>))}
          </ul>
          <div className="mt-8">{ways}</div>
        </div>
      </aside>
    );
  }
  return (
    <aside aria-label="Product" inert={!visible} className="label-card absolute inset-x-4 bottom-4 z-10 flex h-[300px] flex-col px-5 py-4 transition-[opacity,transform] duration-500" style={shown}>
      {header}
      <div key={room.slug} className="swap mt-3 flex min-h-0 flex-1 flex-col [&>*]:shrink-0">
        <h2 className="flex items-center gap-2"><ProductLogo logo={room.logo} scale={0.42} /></h2>
        <div className="mt-2">{status}</div>
        <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-fg-2">{room.oneLiner}</p>
        <div className="mt-2.5">{stack}</div>
        <div className="mt-auto pt-2">{ways}</div>
      </div>
    </aside>
  );
}

/** A product's commits week by week, as a small bar line in its colour. */
function Spark({ weeks, color }: { weeks: number[]; color: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current, ctx = c?.getContext('2d');
    if (!c || !ctx || !weeks.length) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const max = Math.max(1, ...weeks), bw = w / weeks.length;
    ctx.fillStyle = color;
    weeks.forEach((n, i) => { const bh = n ? Math.max(1.5, (n / max) * h) : 1; ctx.globalAlpha = n ? 1 : 0.3; ctx.fillRect(i * bw + bw * 0.14, h - bh, Math.max(1, bw * 0.72), bh); });
  }, [weeks, color]);
  return <canvas ref={canvas} aria-hidden className="h-[22px] w-[150px]" />;
}

/**
 * The products, on the right of a wide carousel: number, name, commits week by week, period.
 * The legend of the hero's history, one product at a time.
 */
export function ProductLegend({ rooms, history, snapshot, actions }: { rooms: PublicRoom[]; history: History | null; snapshot: WorldSnapshot; actions: WorldActions }) {
  const visible = snapshot.worldVisible && snapshot.phase === 'carousel';
  const weeks = useMemo(() => (history ? history.repos.map((_, i) => weeklyCounts(history, i)) : []), [history]);
  const shown = { opacity: visible ? 1 : 0 };
  return (
    <>
      {/* the neighbours turn behind the sheet and the legend: they fade into the backdrop there */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-[calc(min(30vw,440px)+70px)] bg-[linear-gradient(to_right,var(--color-bg)_calc(100%-60px),transparent)] transition-opacity duration-500" style={shown} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-[420px] bg-[linear-gradient(to_left,var(--color-bg)_58%,transparent)] transition-opacity duration-500" style={shown} />
      <nav aria-label="Products" inert={!visible} className="absolute right-10 top-1/2 z-10 flex w-[224px] -translate-y-1/2 flex-col gap-5 transition-opacity duration-500" style={shown}>
        {rooms.map((r, i) => {
          const repo = history ? history.repos.findIndex((x) => x.slug === r.slug) : -1;
          const on = i === snapshot.room;
          return (
            <button key={r.slug} type="button" onClick={() => actions.goToRoom(i)} aria-current={on ? 'true' : undefined} className="group grid grid-cols-[24px_1fr] items-center text-left">
              <span className="kicker text-muted">{two(i + 1)}</span>
              <span className={`kicker flex items-center gap-2 transition-colors ${on ? 'text-fg' : 'text-muted group-hover:text-fg'}`}>{on ? <span aria-hidden className="dot" /> : null}{r.name}</span>
              {repo >= 0 ? <span className={`col-start-2 mt-2 transition-opacity ${on ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`}><Spark weeks={weeks[repo]} color={REPO_COLOR[repo] ?? '#ECEDEE'} /></span> : null}
              <span className="col-start-2 mt-1 text-[11.5px] text-muted">{r.period}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

/**
 * Inside a product whose screens are not a film: the caption of the screen in front, its
 * chapter, and the chapter's numbers. It never moves; only its content swaps, with a short fade.
 */
export function LabelCard({ entry, stackTotal, visible }: { entry: StackEntry; stackTotal: number; visible: boolean }) {
  return (
    <div aria-hidden={!visible} className="label-card flex h-[344px] w-[min(820px,92vw)] items-center px-7 py-5 transition-[opacity,transform] duration-500 md:h-[200px] max-md:items-start max-md:px-5 max-md:py-4" style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 14}px)` }}>
      <div key={entry.screen.key} className="swap grid w-full grid-cols-[1fr_auto] gap-x-8 gap-y-2 max-md:grid-cols-1">
        <div>
          <p className="kicker flex flex-wrap gap-x-3 text-muted"><span className="text-fg-2">{entry.index + 1} of {stackTotal}</span><span>{screenCaption(entry.screen)}</span></p>
          <h2 className="display mt-2 text-[clamp(24px,2.4vw,34px)]">{entry.stop.title}</h2>
          <p className="mt-2 text-[14px] leading-[1.5] text-fg-2 max-md:line-clamp-7">{entry.stop.body}</p>
        </div>
        {entry.stop.metrics ? (
          <ul className="grid gap-1 text-right max-md:flex max-md:flex-wrap max-md:gap-x-6 max-md:text-left">
            {entry.stop.metrics.map((m) => (<li key={m.label} className="text-[13px] text-fg-2"><b className="mr-1.5 text-[18px] font-semibold tracking-[-0.02em] text-fg">{m.value}</b>{m.label}</li>))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The chapters of a zoomed product as a playback track: a tick per screen, the part already
 * seen lit, a red playhead on the current screen, the stop's name under the first screen of
 * each stop. It keeps its height when hidden so the card below never moves.
 */
export function ChapterSlider({ room, snapshot, actions }: { room: PublicRoom; snapshot: WorldSnapshot; actions: WorldActions }) {
  const stack = stackOf(room);
  // one screen has no chapters to move between
  const visible = snapshot.phase === 'room' && stack.length > 1;
  const last = Math.max(1, stack.length - 1);
  const at = (Math.min(snapshot.stop, stack.length - 1) / last) * 100;
  return (
    <nav aria-label="Chapters of this product" aria-hidden={!visible} className="relative h-11 w-[min(560px,70vw)] transition-opacity duration-500" style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      <div className="absolute inset-x-0 top-[11px] h-px bg-line">
        <div className="absolute inset-y-0 left-0 bg-fg transition-[width] duration-500" style={{ width: `${at}%` }} />
        <span aria-hidden className="absolute -top-[9px] h-[19px] w-[1.5px] -translate-x-1/2 bg-accent transition-[left] duration-500 before:absolute before:-top-[3px] before:left-1/2 before:h-[7px] before:w-[7px] before:-translate-x-1/2 before:rounded-full before:bg-accent before:shadow-[0_0_10px_var(--color-accent)]" style={{ left: `${at}%` }} />
      </div>
      {stack.map((e, i) => {
        const firstOfStop = i === 0 || stack[i - 1].stopIndex !== e.stopIndex;
        return (
          <button key={e.screen.key} type="button" tabIndex={visible ? 0 : -1} onClick={() => actions.goToStop(i)} aria-current={i === snapshot.stop ? 'true' : undefined} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${(i / last) * 100}%` }}>
            <span aria-hidden className={`mt-[7px] h-[9px] w-px ${i <= snapshot.stop ? 'bg-fg' : 'bg-muted'}`} />
            <span className={`kicker mt-2 whitespace-nowrap ${i === snapshot.stop ? 'text-fg' : 'text-muted'} ${firstOfStop ? '' : 'sr-only'}`}>{e.stop.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function BackButton({ visible, onClick }: { visible: boolean; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} tabIndex={visible ? 0 : -1} aria-hidden={!visible} className="pill kicker absolute left-10 top-[78px] z-10 transition-opacity duration-500 max-md:left-5" style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      All products
    </button>
  );
}
