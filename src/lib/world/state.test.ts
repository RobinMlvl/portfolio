import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  activeRoom,
  createWorld,
  enterRoom,
  flightProgress,
  goTo,
  goToRoom,
  goToStop,
  heroLift,
  leaveRoom,
  ringAngle,
  release,
  scroll,
  settle as magnet,
  sheetRise,
  step,
  tick,
  type WorldConfig,
  type WorldState,
} from '@/lib/world/state';

const config: WorldConfig = {
  ...DEFAULT_CONFIG,
  rooms: [
    { slug: 'dewex', stops: 3 },
    { slug: 'dewex-os', stops: 1 },
    { slug: 'swiss', stops: 1 },
    { slug: 'drinxlab', stops: 1 },
    { slug: 'riview', stops: 1 },
  ],
};
const N = config.rooms.length;

/** Run ticks until everything settles (or 10 s of simulated time). */
function settle(state: WorldState): WorldState {
  let s = state;
  for (let i = 0; i < 600; i++) s = tick(s, 1000 / 60, config);
  return s;
}
const forward = (s: WorldState, times = 1) => { for (let i = 0; i < times; i++) s = step(s, 1, config); return s; };
const back = (s: WorldState, times = 1) => { for (let i = 0; i < times; i++) s = step(s, -1, config); return s; };
const { scrollPx, roomScrollPx } = DEFAULT_CONFIG;

describe('continuous scroll and magnet', () => {
  it('moves the target in proportion to the pixels, scrollPx per unit', () => {
    let s = scroll(createWorld(), scrollPx / 4, config);
    expect(s.vyTarget).toBeCloseTo(0.25, 6);
    expect(s.phase).toBe('hero');
    s = scroll(s, scrollPx, config);
    expect(s.vyTarget).toBeCloseTo(1.25, 6);
    expect(s.phase).toBe('carousel');
    s = scroll(s, -scrollPx / 2, config);
    expect(s.vyTarget).toBeCloseTo(0.75, 6);
    expect(s.phase).toBe('hero');
  });

  it('clamps at the hero and past the last room, and refuses (same object) when nothing moves', () => {
    const s = createWorld();
    expect(scroll(s, -100, config)).toBe(s);
    expect(scroll(s, 0, config)).toBe(s);
    const end = scroll(s, scrollPx * 100, config);
    expect(end.vyTarget).toBe(N + 1);
    expect(end.phase).toBe('sheet');
  });

  it('any forward move lifts the hero; going back into it takes half the way', () => {
    const up = scroll(createWorld(), scrollPx * 0.1, config);
    const lifted = magnet(up, config);
    expect(lifted.vyTarget).toBe(1);
    expect(lifted.phase).toBe('carousel');
    expect(magnet(lifted, config)).toBe(lifted);
    expect(magnet(scroll(lifted, -scrollPx * 0.3, config), config).vyTarget).toBe(1);
    const down = magnet(scroll(lifted, -scrollPx * 0.6, config), config);
    expect(down.vyTarget).toBe(0);
    expect(down.phase).toBe('hero');
  });

  it('a pause finishes the move on the next product in its direction; only a nudge goes back', () => {
    const at1 = settle(forward(createWorld()));
    expect(magnet(scroll(at1, scrollPx * 0.3, config), config).vyTarget).toBe(2);
    expect(magnet(scroll(at1, scrollPx * 0.02, config), config).vyTarget).toBe(1);
    const at2 = settle(forward(createWorld(), 2));
    const back = magnet(scroll(at2, -scrollPx * 0.3, config), config);
    expect(back.vyTarget).toBe(1);
    expect(back.lastDir).toBe(0);
    expect(magnet(back, config)).toBe(back);
  });

  it('a flick carries the carousel on and lands in its direction, never past the first product nor into the sheet', () => {
    const at1 = settle(forward(createWorld()));
    const moving = scroll(at1, scrollPx * 0.3, config);
    expect(release(moving, scrollPx * 1.5, config).vyTarget).toBe(3);
    expect(release(moving, -scrollPx * 2, config).vyTarget).toBe(1); // the hero stays lifted
    expect(release(moving, 0, config).vyTarget).toBe(2); // no flick: like a pause
    expect(release(scroll(at1, scrollPx * (N - 1.2), config), scrollPx * 5, config).vyTarget).toBe(N); // the sheet stays down
    expect(release(scroll(createWorld(), scrollPx * 0.5, config), scrollPx * 3, config).vyTarget).toBe(1); // out of the hero: the first product
    const inside = settle(enterRoom(at1, 0, config));
    expect(release(inside, scrollPx, config)).toBe(inside);
  });

  it('a key step counts from the nearest unit of a scrolled target', () => {
    const s = scroll(createWorld(), scrollPx * 1.3, config);
    expect(step(s, 1, config).vyTarget).toBe(2);
    expect(step(s, -1, config).vyTarget).toBe(0);
  });

  it('is ignored while flying', () => {
    const flying = enterRoom(settle(forward(createWorld())), 0, config);
    expect(scroll(flying, 100, config)).toBe(flying);
    expect(magnet(flying, config)).toBe(flying);
  });

  it('inside a room, moves between stops at roomScrollPx per stop and the magnet lands on a stop', () => {
    const inside = settle(enterRoom(settle(forward(createWorld())), 0, config)); // 3 stops
    let s = scroll(inside, roomScrollPx * 0.6, config);
    expect(s.roomProgTarget).toBeCloseTo(0.6, 6);
    expect(magnet(s, config).roomProgTarget).toBe(1);
    s = scroll(s, roomScrollPx * 10, config);
    expect(s.roomProgTarget).toBe(2);
    expect(scroll(s, 100, config)).toBe(s);
    expect(magnet(s, config)).toBe(s);
  });

  it('in the sheet, forward pixels are native; backward pixels from its top lower it, and closing takes half the way', () => {
    const open = settle(scroll(createWorld(), scrollPx * (N + 1), config));
    expect(open.phase).toBe('sheet');
    expect(scroll(open, 100, config)).toBe(open);
    expect(scroll(open, -100, config, false)).toBe(open);
    const lowered = scroll(open, -scrollPx * 0.3, config, true);
    expect(lowered.phase).toBe('carousel');
    expect(sheetRise(settle(lowered), config)).toBeCloseTo(0.7, 6);
    expect(magnet(lowered, config).phase).toBe('sheet');
    const closed = magnet(scroll(open, -scrollPx * 0.6, config, true), config);
    expect(closed.phase).toBe('carousel');
    expect(closed.vyTarget).toBe(N);
  });
});

describe('hero and carousel stepping (keyboard)', () => {
  it('starts in the hero with everything at zero', () => {
    const s = createWorld();
    expect(s.phase).toBe('hero');
    expect(heroLift(s)).toBe(0);
    expect(ringAngle(s, config)).toBe(0);
    expect(sheetRise(s, config)).toBe(0);
  });

  it('one step lifts the hero and puts room 0 in front; stepping back brings it down', () => {
    const up = forward(createWorld());
    expect(up.vyTarget).toBe(1);
    expect(up.phase).toBe('carousel');
    expect(heroLift(settle(up))).toBe(1);
    const down = back(up);
    expect(down.vyTarget).toBe(0);
    expect(down.phase).toBe('hero');
  });

  it('refuses to go below the hero and returns the same object (input may pass the event on)', () => {
    const s = createWorld();
    expect(back(s)).toBe(s);
  });

  it('each forward step is exactly one room, and back steps retrace', () => {
    let s = forward(createWorld(), 3); // vy 3 → room 2
    expect(s.vyTarget).toBe(3);
    expect(activeRoom(settle(s), config)).toBe(2);
    s = back(s);
    expect(activeRoom(settle(s), config)).toBe(1);
  });

  it('rotates the ring by 2π/N per room, forward', () => {
    const s = settle(goToRoom(forward(createWorld()), 1, config));
    expect(ringAngle(s, config)).toBeCloseTo((2 * Math.PI) / N, 5);
  });

  it('a step mid-animation counts from the target, not from the eased value', () => {
    let s = forward(createWorld(), 2); // target 2
    s = tick(s, 50, config); // vy barely moved
    s = forward(s);
    expect(s.vyTarget).toBe(3);
  });
});

describe('sheet', () => {
  it('opens one step after the last room, and closes back to the last room from its top', () => {
    let s = forward(createWorld(), N); // last room
    expect(s.phase).toBe('carousel');
    s = forward(s);
    expect(s.vyTarget).toBe(N + 1);
    expect(s.phase).toBe('sheet');
    expect(sheetRise(settle(s), config)).toBe(1);
    const open = settle(s);
    expect(step(open, 1, config)).toBe(open); // forward: native scroll
    expect(step(open, -1, config, false)).toBe(open); // back but not at top: native scroll
    const closed = step(open, -1, config, true);
    expect(closed.phase).toBe('carousel');
    expect(closed.vyTarget).toBe(N);
  });

  it('nav links open the sheet from anywhere outside a room', () => {
    const s = goTo(createWorld(), 'contact', config);
    expect(s.phase).toBe('sheet');
    expect(s.vyTarget).toBe(N + 1);
  });
});

describe('rooms', () => {
  const atRoom0 = settle(forward(createWorld()));

  it('cannot be entered from the hero or the sheet', () => {
    expect(enterRoom(createWorld(), 0, config).phase).toBe('hero');
    const sheet = goTo(createWorld(), 'contact', config);
    expect(enterRoom(sheet, 0, config).phase).toBe('sheet');
  });

  it('entering turns the ring to the room while the camera flies in', () => {
    const s = enterRoom(atRoom0, 2, config);
    expect(s.phase).toBe('entering');
    expect(s.vy).toBe(atRoom0.vy);
    expect(s.vyTarget).toBe(3);
    expect(s.roomIdx).toBe(2);
    expect(flightProgress(s)).toBe(0);
    const mid = tick(s, DEFAULT_CONFIG.tweenMs / 2, config);
    expect(mid.phase).toBe('entering');
    expect(flightProgress(mid)).toBeCloseTo(0.5, 5);
    const done = tick(mid, DEFAULT_CONFIG.tweenMs / 2 + 1, config);
    expect(done.phase).toBe('room');
    expect(flightProgress(done)).toBe(1);
  });

  it('ignores steps while flying, then steps between stops inside the room', () => {
    const flying = enterRoom(atRoom0, 0, config);
    expect(step(flying, 1, config)).toBe(flying);
    const inside = settle(flying);
    expect(inside.phase).toBe('room');
    let s = forward(inside);
    expect(s.roomProgTarget).toBe(1);
    s = forward(s);
    expect(s.roomProgTarget).toBe(2); // 3 stops → max index 2
    s = back(s, 2);
    expect(s.roomProgTarget).toBe(0);
    expect(s.phase).toBe('room');
    expect(goToStop(s, 2, config).roomProgTarget).toBe(2);
  });

  it('a key past the last screen leaves the product', () => {
    const inside = settle(enterRoom(atRoom0, 1, config)); // one screen
    expect(step(inside, 1, config).phase).toBe('leaving');
    expect(step(inside, -1, config).phase).toBe('leaving');
  });

  it('pushing past the last screen once it is shown leaves the product; a pause forgets the push', () => {
    const { roomScrollPx, exitPx } = DEFAULT_CONFIG;
    const inside = settle(enterRoom(atRoom0, 0, config)); // 3 screens
    let s = settle(goToStop(inside, 2, config)); // on the last screen, settled
    s = scroll(s, exitPx / 2, config);
    expect(s.phase).toBe('room');
    expect(s.overscroll).toBe(exitPx / 2);
    expect(scroll(s, exitPx / 2, config).phase).toBe('leaving');
    // a pause resets the push: the same half push twice with a settle in between does not leave
    const paused = magnet(s, config);
    expect(paused.overscroll).toBe(0);
    expect(scroll(paused, exitPx / 2, config).phase).toBe('room');
    // a flick that only just reached the last screen (eased value still behind) does not leave
    const flick = scroll(inside, roomScrollPx * 2 + exitPx * 2, config);
    expect(flick.roomProgTarget).toBe(2);
    expect(flick.phase).toBe('room');
    expect(flick.overscroll).toBe(0);
    // pushing back before the first screen leaves too
    expect(scroll(inside, -exitPx, config).phase).toBe('leaving');
  });

  it('leaving flies back, folds the screens back into the stack, and lands in the carousel on the same room', () => {
    const inside = goToStop(settle(enterRoom(atRoom0, 0, config)), 2, config);
    const leaving = leaveRoom(inside);
    expect(leaving.phase).toBe('leaving');
    expect(leaving.roomProgTarget).toBe(0);
    expect(settle(leaving).roomProg).toBe(0);
    expect(leaveRoom(leaving).phase).toBe('leaving'); // idempotent
    const out = settle(leaving);
    expect(out.phase).toBe('carousel');
    expect(activeRoom(out, config)).toBe(0);
  });

  it('goTo("work") from inside a room leaves first, then rotates to room 0', () => {
    const inside = settle(enterRoom(atRoom0, 4, config));
    const s = settle(goTo(inside, 'work', config));
    expect(s.phase).toBe('carousel');
    expect(s.vyTarget).toBe(1);
    expect(activeRoom(s, config)).toBe(0);
  });

  it('goTo("contact") from inside a room leaves first, then opens the sheet', () => {
    const inside = settle(enterRoom(atRoom0, 0, config));
    const s = settle(goTo(inside, 'contact', config));
    expect(s.phase).toBe('sheet');
    expect(sheetRise(s, config)).toBe(1);
  });
});

describe('tick smoothing', () => {
  it('lands exactly on its target within 0.75 s, so the sheet can take the scroll over without a freeze', () => {
    let s = forward(createWorld()); // one unit away
    for (let i = 0; i < 45; i++) s = tick(s, 1000 / 60, config);
    expect(s.vy).toBe(1);
    let r = goToStop(settle(enterRoom(s, 0, config)), 2, config);
    for (let i = 0; i < 60; i++) r = tick(r, 1000 / 60, config);
    expect(r.roomProg).toBe(2);
  });

  it('converges to the target and is frame-rate independent', () => {
    const s = forward(createWorld(), 2);
    const at60 = Array.from({ length: 60 }).reduce<WorldState>((acc) => tick(acc, 1000 / 60, config), s);
    const at30 = Array.from({ length: 30 }).reduce<WorldState>((acc) => tick(acc, 1000 / 30, config), s);
    expect(at60.vy).toBeCloseTo(at30.vy, 3);
    expect(settle(s).vy).toBe(2);
  });
});
