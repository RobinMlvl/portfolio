'use client';
/**
 * The final sheet as an overlay that rises from the bottom over the world (spec §3.1.4).
 * Its transform is written imperatively each frame from `sheetRise(state)`; the inner
 * scroller owns native scrolling once the sheet covers the screen and reports whether
 * it sits at the top so the world can take the scroll back.
 */
import { useEffect, useRef } from 'react';
import { Sheet } from '@/components/sheet/Sheet';
import type { WorldHandle } from '@/lib/world/useWorld';
import { sheetRise } from '@/lib/world/state';

export function SheetOverlay({ world, frame }: { world: WorldHandle; frame: (fn: () => void) => () => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => frame(() => {
    const rise = sheetRise(world.ref.current, world.config);
    const el = layer.current;
    if (!el) return;
    el.style.transform = `translateY(${((1 - rise) * 100).toFixed(2)}vh)`;
    el.style.visibility = rise <= 0.001 ? 'hidden' : 'visible';
    el.style.pointerEvents = rise >= 0.999 ? 'auto' : 'none';
  }), [frame, world]);

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
