/**
 * Pure state machine for the 3D world (spec §3.2). No DOM, no three.js.
 *
 * Interaction model: a continuous virtual scroll with a magnet (spec §3.2). The input
 * layer feeds wheel and touch pixels to `scroll(dy)`, which moves the virtual target in
 * proportion (`scrollPx` per unit); after a pause it calls `settle()`, which finishes
 * toward the nearest unit (hero down or up, room in front, stop, sheet open). Keys use
 * `step(±1)`, one unit at a time. `tick` eases the visible values toward the target.
 *
 * Virtual position `vy`:
 *   0        hero in place
 *   1        hero lifted, room 0 in front
 *   1 + k    room k in front (k in 0..N-1)
 *   N + 1    final sheet fully risen (N = number of rooms)
 * The sheet rises between N and N + 1, mirroring the hero lift between 0 and 1.
 */

export type Phase = 'hero' | 'carousel' | 'entering' | 'room' | 'leaving' | 'sheet';

export interface RoomSpec {
  slug: string;
  /** number of camera stops inside the room (1..3) */
  stops: number;
}

export interface WorldConfig {
  rooms: RoomSpec[];
  /** smoothing factor per 60 fps frame for vy */
  lerp: number;
  /** smoothing factor per 60 fps frame for roomProg */
  roomLerp: number;
  /** duration of the enter/leave camera flight */
  tweenMs: number;
  /** gesture pixels that move vy by one unit (one screen, one room) */
  scrollPx: number;
  /** gesture pixels that move roomProg by one stop */
  roomScrollPx: number;
  /** gesture pixels pushed past the first or last screen of a product before it lets go of the visitor */
  exitPx: number;
}

export const DEFAULT_CONFIG: Omit<WorldConfig, 'rooms'> = {
  lerp: 0.09,
  roomLerp: 0.08,
  tweenMs: 1400,
  scrollPx: 900,
  roomScrollPx: 700,
  exitPx: 260,
};

export interface Transition {
  to: 'room' | 'carousel';
  /** 0..1 */
  t: number;
  /** applied when the transition completes (used by goTo from inside a room) */
  thenVyTarget?: number;
}

export interface WorldState {
  phase: Phase;
  vy: number;
  vyTarget: number;
  roomIdx: number;
  roomProg: number;
  roomProgTarget: number;
  /** pixels pushed past an end of the product's screens, signed; the product lets go past `exitPx` */
  overscroll: number;
  transition: Transition | null;
}

export type NavTarget = 'work' | 'contact';
export type StepDir = 1 | -1;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createWorld(): WorldState {
  return { phase: 'hero', vy: 0, vyTarget: 0, roomIdx: 0, roomProg: 0, roomProgTarget: 0, overscroll: 0, transition: null };
}

/** Phase implied by a vyTarget when no transition is running. */
export function phaseForVyTarget(vyTarget: number, config: WorldConfig): Phase {
  const n = config.rooms.length;
  if (vyTarget >= n + 1) return 'sheet';
  if (vyTarget >= 1) return 'carousel';
  return 'hero';
}

function moveVy(state: WorldState, vyTarget: number, config: WorldConfig): WorldState {
  const clamped = clamp(vyTarget, 0, config.rooms.length + 1);
  if (clamped === state.vyTarget) return state;
  return { ...state, vyTarget: clamped, phase: phaseForVyTarget(clamped, config) };
}

/**
 * Continuous gesture pixels (positive = forward). Returns the same state object when
 * the gesture is refused, which the input layer reads as "let the browser keep this
 * event" (native scroll in the sheet). `sheetAtTop` tells the machine the sheet's
 * native scroller is at 0.
 */
export function scroll(state: WorldState, dy: number, config: WorldConfig, sheetAtTop = true): WorldState {
  if (dy === 0) return state;
  switch (state.phase) {
    case 'entering':
    case 'leaving':
      return state;
    case 'room': {
      const max = config.rooms[state.roomIdx].stops - 1;
      const next = clamp(state.roomProgTarget + dy / config.roomScrollPx, 0, max);
      if (next !== state.roomProgTarget) return { ...state, roomProgTarget: next, overscroll: 0 };
      // at an end, once the last (or first) screen is actually shown: keep pushing and the product lets go
      const shown = dy > 0 ? Math.abs(state.roomProg - max) < 0.05 : Math.abs(state.roomProg) < 0.05;
      if (!shown) return state;
      const overscroll = Math.sign(state.overscroll) === Math.sign(dy) ? state.overscroll + dy : dy;
      if (Math.abs(overscroll) >= config.exitPx) return leaveRoom({ ...state, overscroll: 0 });
      return { ...state, overscroll };
    }
    case 'sheet':
      if (dy > 0 || !sheetAtTop) return state; // native scroll owns the sheet
      return moveVy(state, state.vyTarget + dy / config.scrollPx, config);
    case 'hero':
    case 'carousel':
      return moveVy(state, state.vyTarget + dy / config.scrollPx, config);
  }
}

/** The magnet: after a pause, finish toward the nearest unit. Same object when already there. */
export function settle(state: WorldState, config: WorldConfig): WorldState {
  switch (state.phase) {
    case 'room': {
      const next = Math.round(state.roomProgTarget);
      if (next === state.roomProgTarget && state.overscroll === 0) return state;
      return { ...state, roomProgTarget: next, overscroll: 0 }; // a pause also forgets the push past the end
    }
    case 'hero':
    case 'carousel':
      return moveVy(state, Math.round(state.vyTarget), config);
    default:
      return state;
  }
}

/**
 * One discrete step (keyboard). Counts from the nearest unit of the target. Same refusal
 * contract as `scroll`.
 */
export function step(state: WorldState, dir: StepDir, config: WorldConfig, sheetAtTop = true): WorldState {
  const n = config.rooms.length;
  switch (state.phase) {
    case 'entering':
    case 'leaving':
      return state;
    case 'room': {
      const max = config.rooms[state.roomIdx].stops - 1;
      const next = clamp(Math.round(state.roomProgTarget) + dir, 0, max);
      if (next !== state.roomProgTarget) return { ...state, roomProgTarget: next, overscroll: 0 };
      return leaveRoom(state); // a key past the last (or first) screen leaves the product
    }
    case 'sheet': {
      if (dir > 0 || !sheetAtTop) return state; // native scroll owns the sheet
      return { ...state, vyTarget: n, phase: 'carousel' };
    }
    case 'hero':
    case 'carousel':
      return moveVy(state, Math.round(state.vyTarget) + dir, config);
  }
}

/**
 * Ease `value` toward `target`: exponential smoothing while the visitor scrubs (a
 * fractional target), with a floor on the speed once the magnet or a key has set a whole
 * target, so the tail of the motion does not linger (a pure lerp spends a second on its
 * last percent, which reads as a freeze when the sheet has to take the scroll over).
 */
function ease(value: number, target: number, lerp: number, frames: number): number {
  const d = target - value;
  const smooth = Math.abs(d) * (1 - Math.pow(1 - lerp, frames));
  const step = Math.min(Math.abs(d), Number.isInteger(target) ? Math.max(smooth, MIN_STEP * frames) : smooth);
  return value + Math.sign(d) * step;
}
/** units per 60 fps frame, the floor of the easing speed */
const MIN_STEP = 0.008;

/** Advance smoothing and transitions by `dtMs`. Frame-rate independent. */
export function tick(state: WorldState, dtMs: number, config: WorldConfig): WorldState {
  const frames = dtMs / (1000 / 60);
  let next: WorldState = {
    ...state,
    vy: ease(state.vy, state.vyTarget, config.lerp, frames),
    roomProg: ease(state.roomProg, state.roomProgTarget, config.roomLerp, frames),
  };
  if (next.transition) {
    const t = Math.min(1, next.transition.t + dtMs / config.tweenMs);
    if (t >= 1) {
      const { to, thenVyTarget } = next.transition;
      next = { ...next, transition: null, phase: to };
      if (thenVyTarget !== undefined) next = { ...next, vyTarget: thenVyTarget, phase: phaseForVyTarget(thenVyTarget, config) };
    } else {
      next = { ...next, transition: { ...next.transition, t } };
    }
  }
  return next;
}

/** Enter room k. Only from the carousel. Freezes the ring on that room. */
export function enterRoom(state: WorldState, k: number, config: WorldConfig): WorldState {
  if (state.phase !== 'carousel') return state;
  const n = config.rooms.length;
  if (k < 0 || k >= n) return state;
  return { ...state, phase: 'entering', vy: 1 + k, vyTarget: 1 + k, roomIdx: k, roomProg: 0, roomProgTarget: 0, overscroll: 0, transition: { to: 'room', t: 0 } };
}

/** Leave the current room. Only from inside a room. The screens ease back into their stack during the flight. */
export function leaveRoom(state: WorldState, thenVyTarget?: number): WorldState {
  if (state.phase !== 'room') return state;
  return { ...state, phase: 'leaving', roomProgTarget: 0, overscroll: 0, transition: { to: 'carousel', t: 0, thenVyTarget } };
}

/** Jump the in-room progress to a stop (rail click). */
export function goToStop(state: WorldState, stop: number, config: WorldConfig): WorldState {
  if (state.phase !== 'room') return state;
  const max = config.rooms[state.roomIdx].stops - 1;
  return { ...state, roomProgTarget: clamp(stop, 0, max) };
}

/** Rotate the ring so room k is in front (rail click in the carousel or from the hero). */
export function goToRoom(state: WorldState, k: number, config: WorldConfig): WorldState {
  if (state.phase !== 'carousel' && state.phase !== 'hero') return state;
  const n = config.rooms.length;
  if (k < 0 || k >= n) return state;
  return { ...state, vyTarget: 1 + k, phase: 'carousel' };
}

/** Nav links. 'work' shows the carousel; 'contact' opens the sheet. */
export function goTo(state: WorldState, target: NavTarget, config: WorldConfig): WorldState {
  const n = config.rooms.length;
  const wanted = target === 'work' ? 1 : n + 1;
  switch (state.phase) {
    case 'room':
      return leaveRoom(state, wanted);
    case 'entering':
    case 'leaving':
      return { ...state, transition: state.transition ? { ...state.transition, thenVyTarget: wanted } : null };
    default:
      return { ...state, vyTarget: wanted, phase: phaseForVyTarget(wanted, config) };
  }
}

/* ---------- selectors ---------- */

/** Index of the room facing the camera. */
export function activeRoom(state: WorldState, config: WorldConfig): number {
  if (state.phase === 'room' || state.phase === 'entering' || state.phase === 'leaving') return state.roomIdx;
  return clamp(Math.round(state.vy - 1), 0, config.rooms.length - 1);
}

/** 0 = hero in place, 1 = hero fully lifted. */
export function heroLift(state: WorldState): number {
  return clamp(state.vy, 0, 1);
}

/** Ring rotation around Y (radians). Positive brings room 1 to the front after room 0. */
export function ringAngle(state: WorldState, config: WorldConfig): number {
  const n = config.rooms.length;
  return (clamp(state.vy - 1, 0, n - 1) * 2 * Math.PI) / n;
}

/** 0 = sheet hidden, 1 = sheet covering the world. */
export function sheetRise(state: WorldState, config: WorldConfig): number {
  const n = config.rooms.length;
  return clamp(state.vy - n, 0, 1);
}

/** Progress of the current camera flight, 0..1, eased in/out. */
export function flightProgress(state: WorldState): number {
  if (!state.transition) return state.phase === 'room' ? 1 : 0;
  const x = state.transition.t;
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
