'use client';
/**
 * DOM layers over the canvas, Commits direction: the smoked-glass label card (the product in
 * the carousel and on its first screen, the chapter's caption after), the chapter track under
 * a zoomed product, the product list, the back pill and the hint. Pure functions of the
 * discrete snapshot; nothing here runs per frame.
 */
import Image from 'next/image';
import type { PublicRoom } from '@/content/schema';
import { screenCaption, stackOf, type StackEntry } from '@/lib/world/screens';
import type { WorldActions, WorldSnapshot } from '@/lib/world/useWorld';

function Logo({ room, height }: { room: PublicRoom; height: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image src={room.logo.src} alt={room.logo.alt} width={Math.round(height * room.logo.ratio)} height={height} style={{ height, width: 'auto' }} unoptimized={room.logo.src.endsWith('.svg')} />
      {room.logo.suffix ? <span className="display" style={{ fontSize: height * 0.95 }}>{room.logo.suffix}</span> : null}
    </span>
  );
}

function Figures({ metrics, column = false }: { metrics: { value: string; label: string }[]; column?: boolean }) {
  return (
    <ul className={column ? 'grid gap-1 text-right max-md:text-left' : 'flex flex-wrap gap-x-6 gap-y-1'}>
      {metrics.map((m) => (
        <li key={m.label} className="text-[13px] text-fg-2"><b className="mr-1.5 text-[18px] font-semibold tracking-[-0.02em] text-fg">{m.value}</b>{m.label}</li>
      ))}
    </ul>
  );
}

export type CardMode = 'product' | 'screen';

/**
 * The one label card of the world, anchored at the bottom centre. It shows the product in
 * the carousel and on the first screen of a product, then the chapter's caption from the
 * second screen on. It never moves; only its content swaps, with a short fade.
 */
export function LabelCard({ room, index, total, entry, stackTotal, mode, enterable, visible, onEnter }: { room: PublicRoom; index: number; total: number; entry: StackEntry; stackTotal: number; mode: CardMode; /** the carousel: Open is offered; inside a product the same card carries a scroll hint instead */ enterable: boolean; visible: boolean; onEnter(): void }) {
  const contentKey = mode === 'product' ? `product-${room.slug}-${enterable ? 'open' : 'in'}` : `screen-${room.slug}-${entry.index}`;
  return (
    <div aria-hidden={!visible} className="label-card flex h-[344px] w-[min(820px,92vw)] items-center px-7 py-5 transition-[opacity,transform] duration-500 md:h-[200px] max-md:items-start max-md:px-5 max-md:py-4" style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 14}px)` }}>
      <div key={contentKey} className="swap w-full">
        {mode === 'product' ? (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-7 gap-y-3 max-md:grid-cols-1">
            <Logo room={room} height={Math.round(room.logo.height * 0.45)} />
            <div>
              <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.025em]"><span className="sr-only">{room.name}, </span>{room.kicker}</h2>
              <p className="mt-1 text-[14px] leading-[1.45] text-fg-2 max-md:line-clamp-3">{room.oneLiner}</p>
              <div className="mt-2.5"><Figures metrics={room.metrics} /></div>
            </div>
            {enterable
              ? <button type="button" onClick={onEnter} tabIndex={visible ? 0 : -1} className={`play text-[14px] max-md:justify-self-start ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}>Open<span className="sr-only"> {room.name}, {index + 1} of {total}</span></button>
              : <p className="kicker text-muted">Scroll for the next screen</p>}
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-2 max-md:grid-cols-1">
            <div>
              <p className="kicker flex flex-wrap gap-x-3 text-muted"><span className="text-fg-2">{entry.index + 1} of {stackTotal}</span><span>{screenCaption(entry.screen)}</span></p>
              <h2 className="display mt-2 text-[clamp(24px,2.4vw,34px)]">{entry.stop.title}</h2>
              <p className="mt-2 text-[14px] leading-[1.5] text-fg-2 max-md:line-clamp-7">{entry.stop.body}</p>
            </div>
            {entry.stop.metrics ? <><div className="max-md:hidden"><Figures metrics={entry.stop.metrics} column /></div><div className="md:hidden"><Figures metrics={entry.stop.metrics} /></div></> : null}
          </div>
        )}
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
  const visible = snapshot.phase === 'room';
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

/** The products, on the right of the carousel. Inside a product the chapter slider takes over. */
export function Rail({ rooms, snapshot, actions }: { rooms: PublicRoom[]; snapshot: WorldSnapshot; actions: WorldActions }) {
  const visible = snapshot.worldVisible && snapshot.phase !== 'room' && snapshot.phase !== 'entering' && snapshot.phase !== 'leaving';
  return (
    <nav aria-label="Products" className="absolute right-10 top-1/2 z-10 flex -translate-y-1/2 flex-col items-end gap-3 transition-opacity duration-500 max-md:hidden" style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      {rooms.map((r, i) => (
        <button key={r.slug} type="button" tabIndex={visible ? 0 : -1} onClick={() => actions.goToRoom(i)} aria-current={i === snapshot.room ? 'true' : undefined} className={`kicker flex items-center gap-2 ${i === snapshot.room ? 'text-fg' : 'text-muted hover:text-fg'}`}>
          {i === snapshot.room ? <span aria-hidden className="dot" /> : null}{r.name}
        </button>
      ))}
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

export function Hint({ visible }: { visible: boolean }) {
  return (
    <p aria-hidden className="kicker pointer-events-none absolute bottom-10 left-10 z-10 max-w-[200px] text-muted transition-opacity duration-500 max-xl:hidden" style={{ opacity: visible ? 1 : 0 }}>
      Scroll to browse, click a product to open it
    </p>
  );
}
