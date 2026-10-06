'use client';
/**
 * The final sheet as an overlay that rises from the bottom over the world (spec §3.1.4).
 * Its transform is written imperatively each frame from `sheetRise(state)`; the inner
 * scroller owns native scrolling once the sheet covers the screen and reports whether
 * it sits at the top so the world can take the scroll back. The nav's Contact scrolls it
 * to the contact; once the sheet has gone back down, it starts again from the top.
 */
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Sheet } from '@/components/sheet/Sheet';
import type { WorldHandle } from '@/lib/world/useWorld';
import { sheetRise } from '@/lib/world/state';

export type SheetOverlayHandle = { showContact(): void };

export function SheetOverlay({ world, frame, ref }: { world: WorldHandle; frame: (fn: () => void) => () => void; ref: Ref<SheetOverlayHandle> }) {
  const layer = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  /** whether the sheet showed on the last frame (kept across renders, which subscribe again) */
  const shown = useRef(false);

  useEffect(() => frame(() => {
    const rise = sheetRise(world.ref.current, world.config);
    const el = layer.current;
    if (!el) return;
    el.style.transform = `translateY(${((1 - rise) * 100).toFixed(2)}vh)`;
    el.style.visibility = rise <= 0.001 ? 'hidden' : 'visible';
    el.style.pointerEvents = rise >= 0.999 ? 'auto' : 'none';
    if (shown.current && rise <= 0.001 && scroller.current) scroller.current.scrollTop = 0;
    shown.current = rise > 0.001;
  }), [frame, world]);

  useImperativeHandle(ref, () => ({
    showContact() {
      const el = scroller.current, contact = el?.querySelector('#contact');
      if (!el || !contact) return;
      // already up: glide there; still rising: be there when it arrives
      const up = sheetRise(world.ref.current, world.config) >= 0.999 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({ top: el.scrollTop + contact.getBoundingClientRect().top - el.getBoundingClientRect().top, behavior: up ? 'smooth' : 'instant' });
    },
  }), [world]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => { world.setSheetAtTop(el.scrollTop <= 0); };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [world]);

  return (
    <div ref={layer} aria-hidden={false} className="fixed inset-0 z-30 will-change-transform bg-bg" style={{ transform: 'translateY(100vh)', visibility: 'hidden' }}>
      <div ref={scroller} className="h-full overflow-y-auto overscroll-contain">
        <Sheet mode="overlay" />
      </div>
    </div>
  );
}
