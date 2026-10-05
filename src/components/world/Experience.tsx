'use client';
/**
 * Chooses, on the client, between the 3D world and the plain page (spec §3.3).
 * The first render (SSR, no JS, reduced motion, no WebGL) is always `fallback`;
 * the world replaces it only once `detectWorldSupport()` says 'full' or 'lite'.
 */
import { useEffect, useState } from 'react';
import type { HeroCopy, NavCopy, PublicRoom } from '@/content/schema';
import { detectWorldSupport, type WorldMode } from '@/lib/world/support';
import { WorldPage } from './WorldPage';

export interface ExperienceProps {
  rooms: PublicRoom[];
  hero: HeroCopy;
  nav: NavCopy;
  /** the server-rendered plain page: nav, static hero, rooms list, static sheet */
  fallback: React.ReactNode;
}

export function Experience({ rooms, hero, nav, fallback }: ExperienceProps) {
  const [mode, setMode] = useState<WorldMode | null>(null);
  useEffect(() => {
    const decide = () => setMode(detectWorldSupport());
    decide();
  }, []);
  if (mode === null || mode === 'none') return fallback;
  return <WorldPage rooms={rooms} hero={hero} nav={nav} mode={mode} />;
}
