/**
 * Turns wheel, touch and keyboard events into world gestures (spec §3.2). Wheel and
 * finger pixels are fed continuously to `onScroll`; a pause longer than `idleMs` calls
 * `onSettle` so the machine can finish the move. A finger moves the world along its main
 * direction (sideways too, where the world allows it); when it lifts, `onRelease` says how
 * much further its flick would carry. Keys step one unit at a time. DOM only; no knowledge
 * of the state machine. Returns a detach function.
 */

export type KeyAction = 'enter' | 'escape';
export type StepDir = 1 | -1;

export interface WorldInputHandlers {
  /** gesture pixels, positive = forward; return `false` when the machine refused them */
  onScroll(px: number): boolean | void;
  /** the gesture paused: let the machine finish the move */
  onSettle(): void;
  /** the finger lifted; `px` is how much further its flick would carry (0 when it had stopped) */
  onRelease(px: number): void;
  /** one discrete step (keyboard); return `false` when the machine refused it */
  onStep(dir: StepDir): boolean | void;
  /** true when the browser should keep events in that direction (native scroll inside the sheet) */
  isNative(dir: StepDir): boolean;
  /** true when a sideways swipe moves the world as well (the carousel turns under the finger) */
  sideways(): boolean;
  onKey(action: KeyAction): void;
}

export interface WorldInputOptions {
  /** a pause longer than this ends the gesture and calls `onSettle` */
  idleMs: number;
  /** cap on the pixels of a single event, so a flick cannot jump a whole screen */
  maxEventPx: number;
  /** after a key step, further key steps are absorbed for this long (auto-repeat) */
  keyLockMs: number;
  /** multiplier applied to finger travel */
  touchScale: number;
  /** finger travel before a gesture picks its direction */
  axisPx: number;
  /** a flick carries on as far as the finger would go in this long at its last speed */
  flickMs: number;
}

export const DEFAULT_INPUT: WorldInputOptions = { idleMs: 160, maxEventPx: 120, keyLockMs: 400, touchScale: 2.4, axisPx: 6, flickMs: 190 };

/** a finger still for longer than this before lifting is not a flick */
const FLICK_MS = 80;

const INTERACTIVE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && (INTERACTIVE.has(target.tagName) || target.closest('[contenteditable="true"]') !== null);
}

/** Normalise a wheel delta to pixels regardless of deltaMode. */
export function wheelPixels(e: { deltaY: number; deltaMode: number }, viewportHeight: number): number {
  if (e.deltaMode === 1) return e.deltaY * 16; // lines
  if (e.deltaMode === 2) return e.deltaY * viewportHeight; // pages
  return e.deltaY;
}

export function attachWorldInput(target: Window, h: WorldInputHandlers, opts: WorldInputOptions = DEFAULT_INPUT, now: () => number = () => Date.now()): () => void {
  let keyLockedUntil = 0;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  /** the finger: where it was last, the direction it picked, when it last moved */
  let touch: { x: number; y: number; axis: 'x' | 'y' | null; at: number } | null = null;
  /** gesture pixels per millisecond, smoothed over the last moves */
  let velocity = 0;

  const armIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idleTimer = null; h.onSettle(); }, opts.idleMs);
  };

  /** feed gesture pixels; returns true when the world consumed them (event must be cancelled) */
  const feed = (px: number): boolean => {
    if (px === 0) return true;
    const dir: StepDir = px > 0 ? 1 : -1;
    if (h.isNative(dir)) return false;
    const capped = dir * Math.min(Math.abs(px), opts.maxEventPx);
    const consumed = h.onScroll(capped) !== false;
    if (consumed) armIdle();
    return consumed;
  };

  const onWheel = (e: WheelEvent) => {
    if (feed(wheelPixels(e, target.innerHeight))) e.preventDefault();
  };
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch = t ? { x: t.clientX, y: t.clientY, axis: null, at: now() } : null;
    velocity = 0;
  };
  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!touch || !t) return;
    // finger travel since the last move, positive = forward (up, or to the left)
    const dx = touch.x - t.clientX, dy = touch.y - t.clientY;
    if (!touch.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < opts.axisPx) return;
      touch.axis = Math.abs(dx) > Math.abs(dy) && h.sideways() ? 'x' : 'y';
    }
    const px = (touch.axis === 'x' ? dx : dy) * opts.touchScale;
    const at = now();
    velocity = 0.6 * (px / Math.max(8, at - touch.at)) + 0.4 * velocity;
    touch.x = t.clientX; touch.y = t.clientY; touch.at = at;
    feed(px);
  };
  const onTouchEnd = () => {
    const ended = touch;
    touch = null;
    if (!ended?.axis) return; // a tap, not a gesture
    h.onRelease(now() - ended.at > FLICK_MS ? 0 : velocity * opts.flickMs);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { h.onKey('escape'); return; }
    if (isInteractive(e.target)) return; // let buttons, links and fields keep Space/Enter/arrows
    const dir: StepDir | 0 = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : 0;
    if (dir !== 0) {
      if (h.isNative(dir)) return;
      e.preventDefault();
      if (now() >= keyLockedUntil && h.onStep(dir) !== false) keyLockedUntil = now() + opts.keyLockMs;
      return;
    }
    if (e.key === 'Enter') h.onKey('enter');
  };

  target.addEventListener('wheel', onWheel, { passive: false });
  target.addEventListener('touchstart', onTouchStart, { passive: true });
  target.addEventListener('touchmove', onTouchMove, { passive: true });
  target.addEventListener('touchend', onTouchEnd, { passive: true });
  target.addEventListener('keydown', onKey);

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    target.removeEventListener('wheel', onWheel);
    target.removeEventListener('touchstart', onTouchStart);
    target.removeEventListener('touchmove', onTouchMove);
    target.removeEventListener('touchend', onTouchEnd);
    target.removeEventListener('keydown', onKey);
  };
}
