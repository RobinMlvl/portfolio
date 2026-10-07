'use client';
/**
 * React glue for the world state machine. The mutable state lives in a ref and is
 * advanced by `tick()` from the render loop (one requestAnimationFrame, owned by the
 * scene). React only re-renders on discrete changes (phase, room, stop), published
 * as `snapshot`; continuous values (lift, rise, angle) are read from the ref each frame.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attachWorldInput } from './input';
import {
  DEFAULT_CONFIG,
  activeRoom,
  createWorld,
  enterRoom,
  goTo,
  goToRoom,
  goToStop,
  leaveRoom,
  release,
  scroll,
  settle,
  step,
  tick,
  type NavTarget,
  type RoomSpec,
  type WorldConfig,
  type WorldState,
} from './state';

export interface WorldSnapshot {
  phase: WorldState['phase'];
  /** room facing the camera (carousel) or entered (room) */
  room: number;
  /** current stop inside the room */
  stop: number;
  /** vy has crossed 0.75: the world is meant to be seen */
  worldVisible: boolean;
}

export interface WorldActions {
  enter(room: number): void;
  leave(): void;
  goToRoom(room: number): void;
  goToStop(stop: number): void;
  nav(target: NavTarget): void;
}

export interface WorldHandle {
  config: WorldConfig;
  /** mutable, read per frame by the scene and imperative DOM updates */
  ref: React.MutableRefObject<WorldState>;
  snapshot: WorldSnapshot;
  actions: WorldActions;
  /** advance the machine by `dtMs`; call once per rendered frame */
  tick(dtMs: number): void;
  /** the sheet reports whether its native scroller is at the top */
  setSheetAtTop(atTop: boolean): void;
}

function snapshotOf(s: WorldState, config: WorldConfig): WorldSnapshot {
  return { phase: s.phase, room: activeRoom(s, config), stop: Math.round(s.roomProg), worldVisible: s.vy > 0.75 };
}

function sameSnapshot(a: WorldSnapshot, b: WorldSnapshot): boolean {
  return a.phase === b.phase && a.room === b.room && a.stop === b.stop && a.worldVisible === b.worldVisible;
}

export function useWorld(rooms: RoomSpec[]): WorldHandle {
  const config = useMemo<WorldConfig>(() => ({ ...DEFAULT_CONFIG, rooms }), [rooms]);
  const ref = useRef<WorldState>(createWorld());
  const sheetAtTop = useRef(true);
  const [snapshot, setSnapshot] = useState<WorldSnapshot>(() => snapshotOf(createWorld(), config));
  const publish = useCallback(() => {
    const next = snapshotOf(ref.current, config);
    setSnapshot((prev) => (sameSnapshot(prev, next) ? prev : next));
  }, [config]);

  const set = useCallback((next: WorldState) => { ref.current = next; publish(); }, [publish]);

  useEffect(() => {
    // a gesture the machine refuses returns the same object: the input layer leaves the event to the browser
    const apply = (after: WorldState): boolean => {
      if (after === ref.current) return false;
      set(after);
      return true;
    };
    return attachWorldInput(window, {
      onScroll: (px) => apply(scroll(ref.current, px, config, sheetAtTop.current)),
      onRelease: (px) => { apply(release(ref.current, px, config)); },
      onSettle: () => { apply(settle(ref.current, config)); },
      onStep: (dir) => apply(step(ref.current, dir, config, sheetAtTop.current)),
      isNative: (dir) => ref.current.phase === 'sheet' && (dir > 0 || !sheetAtTop.current),
      sideways: () => ref.current.phase === 'carousel',
      onKey: (action) => {
        const s = ref.current;
        if (action === 'escape') set(leaveRoom(s));
        else if (action === 'enter' && s.phase === 'carousel') set(enterRoom(s, activeRoom(s, config), config));
      },
    });
  }, [config, set]);

  const actions = useMemo<WorldActions>(() => ({
    enter: (room) => set(enterRoom(ref.current, room, config)),
    leave: () => set(leaveRoom(ref.current)),
    goToRoom: (room) => set(goToRoom(ref.current, room, config)),
    goToStop: (stop) => set(goToStop(ref.current, stop, config)),
    nav: (target) => set(goTo(ref.current, target, config)),
  }), [config, set]);

  const tickFn = useCallback((dtMs: number) => {
    ref.current = tick(ref.current, Math.min(dtMs, 100), config);
    publish();
  }, [config, publish]);

  const setSheetAtTop = useCallback((atTop: boolean) => { sheetAtTop.current = atTop; }, []);

  return { config, ref, snapshot, actions, tick: tickFn, setSheetAtTop };
}
