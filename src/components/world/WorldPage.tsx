'use client';
/**
 * The 3D experience (spec §3.1): persistent nav, the hero as a layer that lifts on
 * virtual scroll, the world behind it, and the final sheet rising over it.
 * Chosen by the page only when `detectWorldSupport()` is 'full' or 'lite'.
 */
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef } from 'react';
import { Nav } from '@/components/nav/Nav';
import { Hero } from '@/components/hero/Hero';
import type { HeroCopy, NavCopy, PublicRoom } from '@/content/schema';
import { createFrameBus } from '@/lib/world/frameBus';
import { heroLift } from '@/lib/world/state';
import { useWorld } from '@/lib/world/useWorld';
import { stackOf } from '@/lib/world/screens';
import type { NavTarget } from '@/lib/world/state';
import { SheetOverlay } from './SheetOverlay';

const World = dynamic(() => import('./World').then((m) => m.World), { ssr: false });

const NAV_TARGETS: Record<string, NavTarget> = { '#work': 'work', '#contact': 'contact' };

export interface WorldPageProps {
  rooms: PublicRoom[];
  mode: 'full' | 'lite';
  /** client-safe copy, mapped by the server page (no `source` fields) */
  hero: HeroCopy;
  nav: NavCopy;
}

export function WorldPage({ rooms, mode, hero, nav }: WorldPageProps) {
  // one machine stop per screen: scrolling inside a product lifts the screens one by one
  const specs = useMemo(() => rooms.map((r) => ({ slug: r.slug, stops: stackOf(r).length })), [rooms]);
  const world = useWorld(specs);
  const bus = useMemo(() => createFrameBus(), []);
  const heroLayer = useRef<HTMLDivElement>(null);

  // the hero lifts imperatively, once per frame, from the state machine
  useEffect(() => bus.subscribe(() => {
    const el = heroLayer.current;
    if (!el) return;
    const lift = heroLift(world.ref.current);
    el.style.transform = `translateY(${(-lift * 100).toFixed(2)}vh)`;
    el.style.visibility = lift >= 0.999 ? 'hidden' : 'visible';
  }), [bus, world]);

  // dev-only inspection hook for smoke scripts
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as Window & { __worldRef?: typeof world.ref };
    w.__worldRef = world.ref;
    return () => { delete w.__worldRef; };
  }, [world]);

  // the document must not scroll natively while the world owns the wheel
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  // nav anchors and the hero CTA drive the machine instead of jumping the document
  const onNavClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"]');
    if (!a) return;
    const target = NAV_TARGETS[a.getAttribute('href') ?? ''];
    if (!target) return;
    e.preventDefault();
    world.actions.nav(target);
  };

  return (
    <>
      <div onClickCapture={onNavClick}><Nav mode={world.snapshot.worldVisible ? 'world' : 'hero'} nav={nav} /></div>
      <main data-phase={world.snapshot.phase} data-room={world.snapshot.room} data-stop={world.snapshot.stop} data-world-visible={world.snapshot.worldVisible ? 'true' : 'false'}>
        <World world={world} rooms={rooms} mode={mode} bus={bus} />
        <div ref={heroLayer} onClickCapture={onNavClick} className="fixed inset-0 z-20 will-change-transform"><Hero copy={hero} /></div>
        <SheetOverlay world={world} frame={bus.subscribe} />
      </main>
    </>
  );
}
