'use client';
/**
 * The last word of the site: the commits of every product over the last days, one line per
 * commit coloured by product, like the hero but without its gathered first column. The red
 * playhead crosses them once when they come into view and stops at now.
 */
import { useEffect, useRef } from 'react';
import { REPO_COLOR, lastDays, timelineOf } from '@/lib/commits';
import { useHistory } from '@/lib/history';

/** how long the playhead takes to cross the days */
const PLAY_MS = 1600;
/** room on the right for the playhead at rest */
const HEAD = 12;

const fmt = (n: number) => n.toLocaleString('en-US');

export function ClosingWave({ className }: { className: string }) {
  const loaded = useHistory();
  const history = loaded === 'failed' ? null : loaded;
  const recent = history ? lastDays(timelineOf(history)) : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = history ? canvas?.getContext('2d') : null;
    if (!canvas || !ctx || !history) return;
    const t = timelineOf(history);
    const { from, days, tallest } = lastDays(t);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, p = reduced ? 1 : 0, raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const colW = (W - HEAD) / days, bw = Math.max(1, colW * 0.66), mid = H / 2, lineH = (H - 14) / tallest, lh = Math.max(0.7, lineH * 0.72);
      const head = p * (W - HEAD / 2);
      for (let c = from; c < t.columns; c++) {
        const x = (c - from) * colW, n = t.count[c];
        ctx.globalAlpha = x + bw / 2 <= head ? 1 : 0.2;
        if (!n) { ctx.fillStyle = 'rgba(236,237,238,.14)'; ctx.fillRect(x, mid - 0.5, bw, 1); continue; }
        const top = mid - (n * lineH) / 2;
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = REPO_COLOR[history.commits[t.start[c] + k][4]];
          ctx.fillRect(x, top + k * lineH, bw, lh);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF4F3A';
      ctx.fillRect(head - 0.75, 4, 1.5, H - 4);
      ctx.beginPath(); ctx.arc(head, 4, 3.2, 0, Math.PI * 2); ctx.fill();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    // the first time the days come into view, the playhead crosses them
    const play = (start: number) => {
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / PLAY_MS);
        p = 1 - (1 - k) ** 3;
        draw();
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      play(performance.now());
    }, { threshold: 0.4 });
    if (!reduced) io.observe(canvas);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [history]);

  if (loaded === 'failed') return null;
  return (
    <figure className={className}>
      <canvas ref={canvasRef} aria-hidden className="block h-[180px] w-full max-lg:h-[150px] max-sm:h-[112px]" />
      <figcaption className="kicker mt-2.5 flex min-h-[1.6em] items-baseline justify-between gap-4 text-muted">
        {recent ? (
          <>
            <span>Last {recent.days} days<span className="max-sm:hidden">, every product</span></span>
            <span className="text-fg-2">{fmt(recent.commits)} commits · <span className="text-accent">now</span></span>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
