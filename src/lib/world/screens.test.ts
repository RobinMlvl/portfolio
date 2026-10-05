import { describe, expect, it } from 'vitest';
import { rooms } from '@/content/rooms';
import { publicRoomsOf } from '@/content/schema';
import { PANEL } from '@/lib/world/layout';
import { panelSize, screenAspect, screenCaption, stackOf } from '@/lib/world/screens';

const [dewex] = publicRoomsOf(rooms);

describe('stackOf', () => {
  it('flattens the Dewex stops into four screens in reading order, the home page as the cover', () => {
    const stack = stackOf(dewex);
    expect(stack.map((e) => e.screen.key)).toEqual(['home', 'studio', 'activity', 'calendar']);
    expect(stack.map((e) => e.stopIndex)).toEqual([0, 1, 2, 3]);
    expect(stack.map((e) => e.index)).toEqual([0, 1, 2, 3]);
    expect(stack[0].stop.key).toBe('site');
  });

  it('gives every product at least a cover', () => {
    for (const room of publicRoomsOf(rooms)) expect(stackOf(room).length).toBeGreaterThan(0);
  });
});

describe('panelSize', () => {
  it('gives landscape screens the cover width and portrait screens the cover height', () => {
    const calendar = dewex.stops[3].screens[0];
    const phone = { kind: 'image' as const, key: 'phone', src: '/screens/dewex/phone-booking.webp', alt: 'phone', caption: 'phone', width: 856, height: 1712 };
    expect(screenAspect(phone)).toBeLessThan(1);
    expect(panelSize(calendar)).toEqual({ width: PANEL.width, height: PANEL.width / (1600 / 710) });
    expect(panelSize(phone)).toEqual({ width: PANEL.height * (856 / 1712), height: PANEL.height });
  });

  it('shapes a placeholder like the cover', () => {
    expect(panelSize({ kind: 'placeholder', key: 'x', label: 'x', owner: 'me' })).toEqual({ width: PANEL.width, height: PANEL.height });
  });
});

describe('screenCaption', () => {
  it('uses the image caption or the placeholder label', () => {
    expect(screenCaption(dewex.stops[1].screens[0])).toBe('Studio: section editor, live preview');
    expect(screenCaption({ kind: 'placeholder', key: 'x', label: 'Studio, internal', owner: 'robin' })).toBe('Studio, internal');
  });
});
