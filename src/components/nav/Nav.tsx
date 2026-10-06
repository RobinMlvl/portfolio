'use client';
import type { NavCopy } from '@/content/schema';

export type NavMode = 'hero' | 'world';

export function Nav({ mode, nav }: { mode: NavMode; nav: NavCopy }) {
  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-linear-to-b from-bg from-60% to-transparent px-10 py-[22px] pb-8 max-md:px-5 max-md:pt-[18px] max-md:pb-7">
      <span className="pointer-events-auto kicker flex items-center gap-2.5 text-[13px] text-fg">
        <span aria-hidden className="dot" />
        <span>{mode === 'hero' ? nav.openToWork : nav.name}</span>
      </span>
      <span className="pointer-events-auto kicker flex justify-end gap-7 text-[13px] text-fg-2 max-md:gap-4">
        {nav.links.map((l) => (
          <a key={l.href} href={l.href} className="relative hover:text-fg after:absolute after:bottom-[-6px] after:left-0 after:h-px after:w-0 after:bg-accent after:transition-[width] after:duration-300 hover:after:w-full">
            {l.label}
          </a>
        ))}
      </span>
    </nav>
  );
}
