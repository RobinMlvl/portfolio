'use client';
/**
 * The hero's commit history: every commit of every product on one timeline, each line of the
 * waveform one real commit, coloured by product, stacked in the order of the day. The most
 * recent days have a column each; the older ones are gathered in a first column behind an axis
 * break. The pointer picks a day and a commit; the log above prints it. With no pointer the
 * history plays by itself; a click replays it fast from the commit under the pointer, a second
 * click stops. The legend keeps one product only. Data: public/commits/all.json (useHistory),
 * written by tools/commits.mjs.
 */
import { useEffect, useRef, useState } from 'react';
import { repos } from '@/content/commits';
import { REPO_COLOR, columnLabel, columnOf, dayLabel, logWindow, monthStarts, onlyRepo, pick, splitSubject, timelineOf } from '@/lib/commits';
import { useHistory } from '@/lib/history';

/** commits per second while nobody points at the history, and after a click */
const IDLE_RATE = 24;
const PLAY_RATE = 160;

type Row = { index: number; hash: string; time: string; repo: number; prefix: string | null; rest: string };
type View = { solo: number | null; header: string; rows: Row[]; current: number };

const fmt = (n: number) => n.toLocaleString('en-US');
const total = repos.reduce((n, r) => n + r.total, 0);
const first = repos.reduce((min, r) => (r.first < min ? r.first : min), repos[0].first);
const last = repos.reduce((max, r) => (r.last > max ? r.last : max), repos[0].last);
const DAY = 86_400_000;
const span = Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY);

export function CommitHistory() {
  const loaded = useHistory();
  const history = loaded === 'failed' ? null : loaded;
  const failed = loaded === 'failed';
  const [solo, setSolo] = useState<number | null>(null);
  const [view, setView] = useState<View | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !history) return;
    const h = solo === null ? history : onlyRepo(history, solo);
    const t = timelineOf(h);
    const months = monthStarts(h, t);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mono = getComputedStyle(canvas).fontFamily;
    const s = { W: 0, H: 0, px: 0, py: 0, inside: false, g: reduced ? h.total - 1 : 0, playing: false, column: null as number | null, visible: true, rows: 12, key: '', ripples: [] as { x: number; y: number; at: number }[] };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      s.W = r.width; s.H = r.height; s.rows = r.width < 768 ? 5 : 12;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; }); io.observe(canvas);

    // the gathered first column is followed by an empty slot that carries the axis break
    const gap = t.earlier ? 1 : 0;
    const geo = () => {
      const pad = s.W < 768 ? 20 : 40, x0 = pad, x1 = s.W - pad, colW = (x1 - x0) / (t.columns + gap);
      const top = 46, axis = s.H - 30, bottom = axis - 8, mid = (top + bottom) / 2, half = (bottom - top) / 2;
      return { x0, x1, colW, top, axis, mid, half, lineH: (2 * half) / t.tallest };
    };
    const xOf = (G: ReturnType<typeof geo>, column: number) => G.x0 + (column + (column >= 1 ? gap : 0)) * G.colW;
    const columnAt = (G: ReturnType<typeof geo>, x: number) => {
      const slot = Math.floor((x - G.x0) / G.colW);
      const column = gap ? (slot <= 0 ? 0 : Math.max(1, slot - gap)) : slot;
      return Math.min(t.columns - 1, Math.max(0, column));
    };
    const pointAt = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); s.px = e.clientX - r.left; s.py = e.clientY - r.top; s.inside = true; };
    const onMove = (e: PointerEvent) => pointAt(e);
    const onLeave = () => { s.inside = false; };
    const onDown = (e: PointerEvent) => { pointAt(e); s.playing = !s.playing; s.ripples.push({ x: s.px, y: s.py, at: performance.now() }); };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);

    const publish = (gi: number) => {
      const key = `${gi}|${s.column}|${s.rows}`;
      if (key === s.key) return;
      s.key = key;
      const rows: Row[] = [];
      if (h.total) {
        const [from, to] = logWindow(t, gi, s.column, s.rows);
        for (let i = from; i < to; i++) { const [, time, hash, subject, repo] = h.commits[i]; rows.push({ index: i, hash, time, repo, ...splitSubject(subject) }); }
      }
      const col = s.column ?? columnOf(t, gi);
      const header = s.column !== null ? `${columnLabel(h.first, t, col)}, ${fmt(t.count[col])} commit${t.count[col] === 1 ? '' : 's'}` : `${columnLabel(h.first, t, col)}, commit ${fmt(gi + 1)}`;
      setView({ solo, header, rows, current: gi });
    };

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      raf = requestAnimationFrame(frame);
      if (!s.visible || !s.W || !h.total) return;
      const G = geo();
      // where the playhead is: a fast replay, the pointer, or the slow replay of the whole history
      if (s.playing) { s.g += dt * PLAY_RATE; if (s.g >= h.total - 1) { s.g = h.total - 1; s.playing = false; } s.column = null; }
      else if (s.inside) {
        const col = columnAt(G, s.px), n = t.count[col];
        s.column = col;
        const hit = pick(t, col, (s.py - (G.mid - (n * G.lineH) / 2)) / Math.max(1, n * G.lineH));
        if (hit !== null) s.g = hit;
      } else { s.column = null; if (!reduced) { s.g += dt * IDLE_RATE; if (s.g >= h.total) s.g = 0; } }
      const gi = Math.min(h.total - 1, Math.floor(s.g));
      const col = s.column ?? columnOf(t, gi);

      ctx.clearRect(0, 0, s.W, s.H);
      // the columns: one line per commit, centred like a waveform, lit up to the playhead
      const bw = Math.max(1, G.colW * 0.7), lh = Math.max(0.6, G.lineH * 0.74);
      for (let c = 0; c < t.columns; c++) {
        const n = t.count[c], x = xOf(G, c) + (G.colW - bw) / 2;
        if (!n) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(236,237,238,.14)'; ctx.fillRect(x, G.mid - 0.5, bw, 1); continue; }
        const top = G.mid - (n * G.lineH) / 2;
        for (let k = 0; k < n; k++) {
          const i = t.start[c] + k;
          ctx.globalAlpha = i <= gi ? 1 : 0.24;
          ctx.fillStyle = REPO_COLOR[h.commits[i][4]];
          ctx.fillRect(x, top + k * G.lineH, bw, lh);
        }
      }
      ctx.globalAlpha = 1;
      // the axis break between the gathered first column and the days
      if (gap) {
        const bx = G.x0 + 1.5 * G.colW;
        ctx.strokeStyle = 'rgba(236,237,238,.55)'; ctx.lineWidth = 1;
        for (const y of [G.mid, G.axis - 3]) for (const dx of [-2, 2]) { ctx.beginPath(); ctx.moveTo(bx + dx - 2.5, y + 5); ctx.lineTo(bx + dx + 2.5, y - 5); ctx.stroke(); }
      }
      // the playhead and the current commit
      const px = xOf(G, col) + G.colW / 2, ptop = G.top - 12;
      ctx.fillStyle = '#FF4F3A';
      ctx.fillRect(px - 0.75, ptop, 1.5, G.axis - ptop);
      ctx.beginPath(); ctx.arc(px, ptop, 3.2, 0, Math.PI * 2); ctx.fill();
      if (columnOf(t, gi) === col && t.count[col]) {
        const n = t.count[col], y = G.mid - (n * G.lineH) / 2 + (gi - t.start[col]) * G.lineH;
        ctx.fillRect(px - bw / 2 - 4, y - 1, bw + 8, Math.max(2.5, lh + 2));
      }
      // axis: weeks, months, the gathered days and the counter
      ctx.font = `500 11.5px ${mono}`; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(236,237,238,.16)';
      for (let c = 1; c < t.columns; c += 7) ctx.fillRect(xOf(G, c), G.axis - 4, 1, 4);
      for (const m of months) ctx.fillRect(xOf(G, m.column), G.axis - 9, 1, 9);
      const counter = `${fmt(gi + 1)} / ${fmt(h.total)} commits`, before = gap ? 'EARLIER' : '';
      const free = [G.x0 + ctx.measureText(before).width + 16, G.x1 - ctx.measureText(counter).width - 16];
      ctx.fillStyle = 'rgba(236,237,238,.45)'; ctx.textAlign = 'left';
      if (before) ctx.fillText(before, G.x0, G.axis + 8);
      if (s.W >= 768) for (const m of months) { const x = xOf(G, m.column) + 4; if (x > free[0] && x + ctx.measureText(m.label).width < free[1]) ctx.fillText(m.label, x, G.axis + 8); }
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(236,237,238,.85)';
      ctx.fillText(counter, G.x1, G.axis + 8);
      // a click rings out from the pointer
      s.ripples = s.ripples.filter((r) => now - r.at < 900);
      for (const r of s.ripples) {
        const k = (now - r.at) / 900;
        ctx.strokeStyle = `rgba(255,79,58,${0.6 * (1 - k)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, 6 + k * 60, 0, Math.PI * 2); ctx.stroke();
      }
      publish(gi);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('pointerdown', onDown);
    };
  }, [history, solo]);

  const shown = view && view.solo === solo ? view : null;

  return (
    <>
      <div className="absolute right-10 top-[13vh] w-[min(44vw,640px)] font-mono text-[13px] leading-[1.78] text-fg-2 max-md:inset-x-5 max-md:bottom-[calc(28vh+16px)] max-md:top-auto max-md:w-auto max-md:text-[12px]">
        <div className="flex items-baseline justify-between gap-4 border-b border-line px-2 pb-2">
          <span className="text-fg">git log</span>
          <span className="truncate">{shown ? shown.header : ''}</span>
        </div>
        <p className="sr-only">Commit history of {repos.map((r) => r.name).join(', ')}: {fmt(total)} commits from {dayLabel(first, 0)} to {dayLabel(first, span)}.</p>
        <ol aria-label="Commits" className="mt-1.5 min-h-[calc(12*1.78em)] max-md:min-h-[calc(5*1.78em)]">
          {failed ? <li className="px-2 text-muted">The history could not be loaded.</li> : null}
          {shown?.rows.map((r) => (
            <li key={r.index} className={`flex items-center gap-4 whitespace-nowrap rounded px-2 max-md:gap-3 ${r.index === shown.current ? 'bg-accent/15' : ''}`}>
              <span className={r.index === shown.current ? 'text-accent' : 'text-muted'}>{r.hash}</span>
              <span className="text-muted max-md:hidden">{r.time}</span>
              <span aria-hidden className="h-2 w-2 flex-none rounded-[2px]" style={{ background: REPO_COLOR[r.repo] }} />
              <span className="sr-only">{repos[r.repo]?.name}: </span>
              <span className={`overflow-hidden text-ellipsis ${r.index === shown.current ? 'text-fg' : 'text-[#c9ccd1]'}`}>
                {r.prefix ? <><span className="text-fg-2">{r.prefix}</span>: </> : null}{r.rest}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[34vh] min-h-[200px] max-md:h-[28vh]">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full cursor-crosshair font-mono" />
        <div role="group" aria-label="Products in the history" className="absolute right-10 top-0 flex gap-5 font-mono text-[12px] max-md:left-5 max-md:right-5 max-md:gap-3 max-md:text-[11px]">
          {repos.map((r, i) => (
            <button key={r.slug} type="button" onClick={() => setSolo((v) => (v === i ? null : i))} aria-pressed={solo === i} className={`flex items-center gap-2 whitespace-nowrap transition-opacity ${solo === null || solo === i ? 'text-fg-2 opacity-100' : 'text-muted opacity-50'} hover:text-fg`}>
              <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: REPO_COLOR[i] }} />
              {r.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
