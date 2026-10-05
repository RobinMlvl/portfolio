import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachWorldInput, wheelPixels, type StepDir, type WorldInputHandlers } from '@/lib/world/input';

const OPTS = { idleMs: 160, maxEventPx: 120, keyLockMs: 400, touchScale: 2 };

function handlers(native: (dir: StepDir) => boolean = () => false) {
  const h = {
    scrolls: [] as number[],
    settles: 0,
    steps: [] as number[],
    keys: [] as string[],
    onScroll(px: number) { h.scrolls.push(px); },
    onSettle() { h.settles += 1; },
    onStep(dir: StepDir) { h.steps.push(dir); },
    isNative: native,
    onKey(a: string) { h.keys.push(a); },
  } satisfies WorldInputHandlers & { scrolls: number[]; settles: number; steps: number[]; keys: string[] };
  return h;
}

function wheel(deltaY: number) {
  const e = new WheelEvent('wheel', { deltaY, cancelable: true });
  window.dispatchEvent(e);
  return e;
}
function touch(type: string, clientY: number) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'touches', { value: [{ clientY }] });
  return e;
}

describe('wheelPixels', () => {
  it('normalises lines and pages to pixels', () => {
    expect(wheelPixels({ deltaY: 100, deltaMode: 0 }, 800)).toBe(100);
    expect(wheelPixels({ deltaY: 3, deltaMode: 1 }, 800)).toBe(48);
    expect(wheelPixels({ deltaY: 1, deltaMode: 2 }, 800)).toBe(800);
  });
});

describe('attachWorldInput', () => {
  let detach: () => void;
  let h: ReturnType<typeof handlers>;
  let clock = 0;
  const now = () => clock;
  beforeEach(() => { vi.useFakeTimers(); clock = 0; h = handlers(); detach = attachWorldInput(window, h, OPTS, now); });
  afterEach(() => { detach(); vi.useRealTimers(); });

  it('feeds wheel pixels as they come, and cancels the event', () => {
    const e = wheel(100);
    expect(e.defaultPrevented).toBe(true);
    wheel(-30);
    expect(h.scrolls).toEqual([100, -30]);
  });

  it('caps a single event so a flick cannot jump a screen', () => {
    wheel(900); wheel(-500);
    expect(h.scrolls).toEqual([120, -120]);
  });

  it('settles once after the gesture pauses, not while it runs', () => {
    for (let i = 0; i < 10; i++) { wheel(8); vi.advanceTimersByTime(50); }
    expect(h.settles).toBe(0);
    vi.advanceTimersByTime(200);
    expect(h.settles).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(h.settles).toBe(1);
  });

  it('leaves the browser its event when the world says the direction is native', () => {
    detach();
    h = handlers((dir) => dir > 0);
    detach = attachWorldInput(window, h, OPTS, now);
    const fwd = wheel(120);
    expect(fwd.defaultPrevented).toBe(false);
    expect(h.scrolls).toEqual([]);
    const bwd = wheel(-120);
    expect(bwd.defaultPrevented).toBe(true);
    expect(h.scrolls).toEqual([-120]);
  });

  it('leaves the event to the browser and does not arm the magnet when the machine refused the pixels', () => {
    detach();
    const refusing = handlers();
    refusing.onScroll = () => false;
    h = refusing;
    detach = attachWorldInput(window, h, OPTS, now);
    expect(wheel(100).defaultPrevented).toBe(false);
    vi.advanceTimersByTime(500);
    expect(h.settles).toBe(0);
  });

  it('turns finger travel into pixels scaled by touchScale', () => {
    window.dispatchEvent(touch('touchstart', 500));
    window.dispatchEvent(touch('touchmove', 465)); // 35 px up × 2 = 70 forward
    window.dispatchEvent(touch('touchmove', 475)); // 10 px down × 2 = 20 back
    expect(h.scrolls).toEqual([70, -20]);
    window.dispatchEvent(new Event('touchend'));
    window.dispatchEvent(touch('touchmove', 400)); // no touchstart → ignored
    expect(h.scrolls).toEqual([70, -20]);
    vi.advanceTimersByTime(200);
    expect(h.settles).toBe(1);
  });

  it('maps keys: arrows and space step one unit (with the lock), Enter enters, Escape escapes', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', cancelable: true })); // locked (auto-repeat)
    clock += 500;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true }));
    clock += 500;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    expect(h.steps).toEqual([1, 1, -1]);
    expect(h.scrolls).toEqual([]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(h.keys).toEqual(['enter', 'escape']);
  });

  it('does not lock keys when the machine refused the step', () => {
    detach();
    const refusing = handlers();
    refusing.onStep = (dir) => { refusing.steps.push(dir); return false; };
    h = refusing;
    detach = attachWorldInput(window, h, OPTS, now);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    expect(h.steps).toEqual([-1, -1]);
  });

  it('leaves Space and Enter alone when a button has focus, but Escape still works', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.steps).toEqual([]);
    expect(h.keys).toEqual(['escape']);
    button.remove();
  });

  it('detaches cleanly, pending magnet included', () => {
    wheel(100);
    detach();
    vi.advanceTimersByTime(500);
    wheel(100);
    expect(h.scrolls).toEqual([100]);
    expect(h.settles).toBe(0);
    detach = () => {};
  });
});
