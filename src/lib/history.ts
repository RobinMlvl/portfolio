'use client';
/**
 * Every commit of every product (public/commits/all.json), fetched once for the hero and the
 * world. A failed request is forgotten, so the next caller tries again.
 */
import { useEffect, useState } from 'react';
import type { History } from './commits';

let pending: Promise<History> | null = null;

export function loadHistory(): Promise<History> {
  if (!pending) {
    pending = fetch('/commits/all.json').then((res) => {
      if (!res.ok) throw new Error(`commits: ${res.status}`);
      return res.json() as Promise<History>;
    });
    pending.catch(() => { pending = null; });
  }
  return pending;
}

/** The history once loaded; null before, 'failed' when it could not be loaded. */
export function useHistory(): History | null | 'failed' {
  const [history, setHistory] = useState<History | null | 'failed'>(null);
  useEffect(() => {
    let alive = true;
    loadHistory().then((h) => { if (alive) setHistory(h); }, () => { if (alive) setHistory('failed'); });
    return () => { alive = false; };
  }, []);
  return history;
}
