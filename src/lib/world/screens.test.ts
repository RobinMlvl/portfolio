import { describe, expect, it } from 'vitest';
import { rooms } from '@/content/rooms';
import { publicRoomsOf } from '@/content/schema';
import { PANEL } from '@/lib/world/layout';
import { filmOf, panelSize, screenAspect, screenCaption, stackOf, zoomFrameOf } from '@/lib/world/screens';

const [dewex] = publicRoomsOf(rooms);

describe('stackOf', () => {
  it('shows Dewex by its film alone; the other stops keep their text without a screen', () => {
    const stack = stackOf(dewex);
    expect(stack.map((e) => e.screen.key)).toEqual(['overview']);
    expect(stack[0].stop.key).toBe('site');
    expect(dewex.stops).toHaveLength(4);
  });

  it('numbers the screens across stops in reading order', () => {
    const room = { stops: [{ ...dewex.stops[1], screens: [{ kind: 'placeholder' as const, key: 'a', label: 'a', owner: 'me' as const }] }, { ...dewex.stops[2], screens: [] }, { ...dewex.stops[3], screens: [{ kind: 'placeholder' as const, key: 'b', label: 'b', owner: 'me' as const }] }] };
    expect(stackOf(room).map((e) => [e.screen.key, e.stopIndex, e.index])).toEqual([['a', 0, 0], ['b', 2, 1]]);
  });

  it('gives every product at least a cover', () => {
    for (const room of publicRoomsOf(rooms)) expect(stackOf(room).length).toBeGreaterThan(0);
  });
});

describe('filmOf and zoomFrameOf', () => {
  const filmed = ['dewex', 'riview'];
  it('finds the film of a product shown by one film, and frames it without the card', () => {
    for (const room of publicRoomsOf(rooms).filter((r) => filmed.includes(r.slug))) {
      expect(filmOf(room)?.key).toBe('overview');
      expect(zoomFrameOf(room)).toEqual({ screenHeight: PANEL.width / (1600 / 900), film: true });
    }
  });
  it('frames the other products by their tallest screen, with the card', () => {
    for (const room of publicRoomsOf(rooms).filter((r) => !filmed.includes(r.slug))) {
      expect(filmOf(room)).toBeNull();
      expect(zoomFrameOf(room).film).toBe(false);
    }
  });
});

describe('panelSize', () => {
  it('gives landscape screens the cover width and portrait screens the cover height', () => {
    const calendar = { kind: 'image' as const, key: 'calendar', src: '/screens/dewex/calendar-grid.webp', alt: 'calendar', caption: 'calendar', width: 1600, height: 710 };
    const phone = { kind: 'image' as const, key: 'phone', src: '/screens/dewex/phone-booking.webp', alt: 'phone', caption: 'phone', width: 856, height: 1712 };
    expect(screenAspect(phone)).toBeLessThan(1);
    expect(panelSize(calendar)).toEqual({ width: PANEL.width, height: PANEL.width / (1600 / 710) });
    expect(panelSize(phone)).toEqual({ width: PANEL.height * (856 / 1712), height: PANEL.height });
  });

  it('shapes a film by its own size', () => {
    expect(panelSize(dewex.stops[0].screens[0])).toEqual({ width: PANEL.width, height: PANEL.width / (1600 / 900) });
  });

  it('shapes a placeholder like the cover', () => {
    expect(panelSize({ kind: 'placeholder', key: 'x', label: 'x', owner: 'me' })).toEqual({ width: PANEL.width, height: PANEL.height });
  });
});

describe('screenCaption', () => {
  it('uses the image or film caption, or the placeholder label', () => {
    expect(screenCaption(dewex.stops[0].screens[0])).toBe('Dewex in 46 seconds: build the site, sell, run the day');
    expect(screenCaption({ kind: 'placeholder', key: 'x', label: 'Studio, internal', owner: 'robin' })).toBe('Studio, internal');
  });
});
