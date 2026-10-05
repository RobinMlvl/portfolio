import { describe, it, expect } from 'vitest';
import {
  CAMERA_HOME,
  CAROUSEL,
  FRONT_SPOT,
  PANEL,
  RISE_TRAVEL,
  dot,
  frontWeight,
  homeCamera,
  normalize,
  panelPlacement,
  panelYaw,
  ringAngleForRoom,
  riseOf,
  rotateY,
  sub,
  ZOOM_RESERVE,
  zoomCamera,
  zoomDistance,
  wrapAngle,
  type Vec3,
} from '@/lib/world/layout';

const N = 4;

describe('carousel', () => {
  it('puts product 0 at the front spot, facing the camera', () => {
    const { position } = panelPlacement(0, N);
    expect(position.map((v) => +v.toFixed(6))).toEqual([0, CAROUSEL.height, CAROUSEL.radius]);
    expect(panelYaw(0, N, 0)).toBe(0);
    expect(FRONT_SPOT).toEqual([0, 0, CAROUSEL.centre[2] + CAROUSEL.radius]);
    expect(CAMERA_HOME.look[0]).toBe(0);
    expect(CAMERA_HOME.look[2]).toBe(FRONT_SPOT[2]);
    expect(CAMERA_HOME.look[1]).toBeLessThan(CAROUSEL.height); // the cover sits high in the frame, above the label card
    expect(CAMERA_HOME.position[2]).toBeGreaterThan(FRONT_SPOT[2]);
  });

  it('whichever product is at the front faces the camera exactly, whatever the carousel has turned', () => {
    for (let k = 0; k < N; k++) {
      const ring = ringAngleForRoom(k, N);
      const worldYaw = panelYaw(k, N, ring) - ring; // the group turns by minus the ring angle
      expect(wrapAngle(worldYaw)).toBeCloseTo(0, 6);
    }
  });

  it('the products at the sides lean only part of the way, so they show their face, not their edge', () => {
    // product 1 stands at +90° while product 0 is at the front
    const worldYaw = panelYaw(1, N, 0);
    expect(worldYaw).toBeCloseTo((Math.PI / 2) * CAROUSEL.facing, 6);
    const normal = rotateY([0, 0, 1], worldYaw);
    const { position } = panelPlacement(1, N);
    const outward = normalize([position[0], 0, position[2]]);
    expect(dot(normal, outward)).toBeGreaterThan(0.3); // still leaning outward
    expect(normal[2]).toBeGreaterThan(0.4); // with a clear component toward the camera
  });

  it('turning the carousel by minus ringAngleForRoom(k) brings product k to the front', () => {
    for (let k = 0; k < N; k++) {
      const { position } = panelPlacement(k, N);
      const moved = rotateY(position, -ringAngleForRoom(k, N));
      expect(moved[0]).toBeCloseTo(0, 6);
      expect(moved[2]).toBeCloseTo(CAROUSEL.radius, 6);
    }
  });

  it('the neighbours of the front product stand to its sides, the last one behind the centre', () => {
    const z = (i: number) => panelPlacement(i, N).position[2];
    const x = (i: number) => panelPlacement(i, N).position[0];
    expect(x(1)).toBeGreaterThan(PANEL.width / 2);
    expect(x(3)).toBeCloseTo(-x(1), 6);
    expect(z(1)).toBeCloseTo(0, 6);
    expect(z(2)).toBeLessThan(0);
  });

  it('frontWeight is 1 at the front, 0 one unit away, and clamps at both ends of the ring', () => {
    expect(frontWeight(1, 0, N)).toBe(1);
    expect(frontWeight(1.5, 0, N)).toBeCloseTo(0.5, 6);
    expect(frontWeight(1.5, 1, N)).toBeCloseTo(0.5, 6);
    expect(frontWeight(2, 0, N)).toBe(0);
    expect(frontWeight(0, 0, N)).toBe(1); // hero: product 0 already in front
    expect(frontWeight(N + 1, N - 1, N)).toBe(1); // sheet: the last product stays in front
  });
});

describe('home camera', () => {
  it('is the fixed home on landscape viewports and backs off on portrait ones so the cover fits the width', () => {
    expect(homeCamera(1.6)).toEqual(CAMERA_HOME);
    const phone = homeCamera(0.46);
    expect(phone.position[2]).toBeGreaterThan(CAMERA_HOME.position[2]);
    expect(phone.look[1]).toBeLessThan(CAMERA_HOME.look[1]); // aims lower: the cover rises above the card
    const tanHalf = Math.tan((50 * Math.PI) / 360);
    const d = phone.position[2] - FRONT_SPOT[2];
    expect(PANEL.width / (2 * d * tanHalf * 0.46)).toBeLessThanOrEqual(0.86 + 1e-9);
  });
});

describe('zoom', () => {
  const tanHalf = Math.tan((50 * Math.PI) / 360);

  it('fills 78% of the width on a landscape viewport', () => {
    const d = zoomDistance(1.6);
    expect((PANEL.width / (2 * d * tanHalf * 1.6))).toBeCloseTo(0.78, 6);
  });

  it('backs off on a portrait viewport so the cover still fits', () => {
    const d = zoomDistance(0.5);
    expect(PANEL.width / (2 * d * tanHalf * 0.5)).toBeLessThanOrEqual(0.78 + 1e-9);
    expect(PANEL.height / (2 * d * tanHalf)).toBeLessThanOrEqual(0.78 + 1e-9);
  });

  /** where the zoomed cover lands on screen, in px */
  function projected(width: number, height: number) {
    const cam = zoomCamera(width, height);
    const d = cam.position[2] - FRONT_SPOT[2];
    const worldPerPx = (2 * d * tanHalf) / height;
    return { cam, widthPx: PANEL.width / worldPerPx, heightPx: PANEL.height / worldPerPx, centreYPx: height / 2 - (CAROUSEL.height - cam.position[1]) / worldPerPx };
  }

  it('looks straight ahead at the front spot', () => {
    const { cam } = projected(1440, 900);
    const forward = normalize(sub(cam.look, cam.position));
    expect(forward.map((v) => +v.toFixed(6))).toEqual([0, 0, -1]);
    expect(cam.look[0]).toBe(FRONT_SPOT[0]);
    expect(cam.look[2]).toBe(FRONT_SPOT[2]);
  });

  it('on a desktop viewport, fills 62% of the width and sits in the band between the nav and the card', () => {
    const p = projected(1440, 900);
    expect(p.widthPx).toBeCloseTo(1440 * 0.62, 3);
    expect(p.centreYPx - p.heightPx / 2).toBeGreaterThanOrEqual(ZOOM_RESERVE.top - 1e-6);
    expect(p.centreYPx + p.heightPx / 2).toBeLessThanOrEqual(900 - ZOOM_RESERVE.bottom + 1e-6);
  });

  it('on a short viewport, shrinks to the band height rather than slide under the card', () => {
    const p = projected(1440, 700);
    expect(p.heightPx).toBeCloseTo(700 - ZOOM_RESERVE.top - ZOOM_RESERVE.bottom, 3);
    expect(p.centreYPx + p.heightPx / 2).toBeLessThanOrEqual(700 - ZOOM_RESERVE.bottom + 1e-6);
  });

  it('on a phone, takes nearly the whole width and stays above the taller card', () => {
    const p = projected(390, 844);
    expect(p.widthPx).toBeCloseTo(390 * 0.92, 3);
    expect(p.centreYPx + p.heightPx / 2).toBeLessThanOrEqual(844 - ZOOM_RESERVE.bottomPortrait + 1e-6);
  });
});

describe('riseOf', () => {
  it('keeps a screen in place before its turn and removes it after', () => {
    expect(riseOf(-2)).toEqual({ y: 0, opacity: 1, gone: false });
    expect(riseOf(0)).toEqual({ y: 0, opacity: 1, gone: false });
    expect(riseOf(1)).toEqual({ y: RISE_TRAVEL, opacity: 0, gone: true });
  });

  it('rises monotonically and fades out only at the end', () => {
    let prev = riseOf(0);
    for (let t = 0.05; t < 1; t += 0.05) {
      const cur = riseOf(t);
      expect(cur.y).toBeGreaterThan(prev.y);
      expect(cur.opacity).toBeLessThanOrEqual(prev.opacity);
      expect(cur.gone).toBe(false);
      prev = cur;
    }
    expect(riseOf(0.5).opacity).toBe(1);
    expect(riseOf(0.9).opacity).toBeLessThan(0.5);
  });
});

describe('vector helpers', () => {
  it('rotateY follows the three.js convention', () => {
    const v: Vec3 = [0, 0, 1];
    const r = rotateY(v, Math.PI / 2);
    expect(r[0]).toBeCloseTo(1, 6);
    expect(r[2]).toBeCloseTo(0, 6);
  });
});
