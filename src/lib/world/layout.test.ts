import { describe, it, expect } from 'vitest';
import {
  CAMERA_HOME,
  CAROUSEL,
  CAROUSEL_PAGE,
  FLOOR,
  FRONT_SPOT,
  PANEL,
  RISE_TRAVEL,
  dot,
  carouselBand,
  frontWeight,
  homeFraming,
  isWide,
  normalize,
  panelPlacement,
  panelYaw,
  ringAngleForRoom,
  riseOf,
  rotateY,
  sub,
  ZOOM_RESERVE,
  zoomCamera,
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

describe('home framing', () => {
  const tanHalf = Math.tan((50 * Math.PI) / 360);
  const film = PANEL.width / (16 / 9);

  /** where the front product lands, in px: its screen, the commit history under it, and its centre */
  function landed(width: number, height: number) {
    const f = homeFraming(width, height, film);
    const d = f.position[2] - FRONT_SPOT[2];
    const px = height / (2 * d * tanHalf); // px per scene unit
    const centreY = height / 2 + f.offset[1] - (CAROUSEL.height - f.position[1]) * px;
    const top = centreY - (film / 2) * px, bottom = centreY + (film / 2 + FLOOR.gap + FLOOR.height) * px;
    return { f, px, left: width / 2 + f.offset[0] - (PANEL.width / 2) * px, right: width / 2 + f.offset[0] + (PANEL.width / 2) * px, top, bottom };
  }

  it('tells a wide viewport from a narrow one', () => {
    expect(isWide(1440, 900)).toBe(true);
    expect(isWide(1024, 768)).toBe(true);
    expect(isWide(900, 700)).toBe(false);
    expect(isWide(390, 844)).toBe(false);
  });

  it('on a wide viewport, frames the front product between the sheet and the legend', () => {
    const band = carouselBand(1440, 900);
    expect(band.left).toBeCloseTo(CAROUSEL_PAGE.side + 432 + CAROUSEL_PAGE.gap, 6); // 30% of 1440 for the sheet
    expect(band.right).toBe(1440 - CAROUSEL_PAGE.side - CAROUSEL_PAGE.legend - CAROUSEL_PAGE.gap);
    const p = landed(1440, 900);
    expect(p.left).toBeGreaterThanOrEqual(band.left - 1e-6);
    expect(p.right).toBeLessThanOrEqual(band.right + 1e-6);
    expect(p.top).toBeGreaterThanOrEqual(band.top - 1e-6);
    expect(p.bottom).toBeLessThanOrEqual(band.bottom + 1e-6);
    expect((p.left + p.right) / 2).toBeCloseTo((band.left + band.right) / 2, 6);
  });

  it('on a short wide viewport, backs off until the screen and its history fit the height', () => {
    const band = carouselBand(1440, 640);
    const p = landed(1440, 640);
    expect(p.bottom - p.top).toBeLessThanOrEqual(band.bottom - band.top + 1e-6);
  });

  it('on a phone, frames the front product across the width, above the sheet', () => {
    const band = carouselBand(390, 844);
    expect(band.bottom).toBe(844 - CAROUSEL_PAGE.phoneSheet - 24);
    const p = landed(390, 844);
    expect(p.left).toBeGreaterThanOrEqual(CAROUSEL_PAGE.phoneSide - 1e-6);
    expect(p.right).toBeLessThanOrEqual(390 - CAROUSEL_PAGE.phoneSide + 1e-6);
    expect(p.bottom).toBeLessThanOrEqual(band.bottom + 1e-6);
  });

  it('looks straight ahead', () => {
    const { f } = landed(1440, 900);
    expect(f.look[1]).toBe(f.position[1]);
    expect(f.look[0]).toBe(f.position[0]);
  });
});

describe('zoom', () => {
  const tanHalf = Math.tan((50 * Math.PI) / 360);

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

  it('frames a film without the card: taller screen, whole free height, a thin margin at the bottom', () => {
    const screenHeight = PANEL.width / (16 / 9);
    const cam = zoomCamera(1440, 900, { screenHeight, film: true });
    const d = cam.position[2] - FRONT_SPOT[2];
    const worldPerPx = (2 * d * tanHalf) / 900;
    const heightPx = screenHeight / worldPerPx, centreYPx = 900 / 2 - (CAROUSEL.height - cam.position[1]) / worldPerPx;
    expect(centreYPx - heightPx / 2).toBeGreaterThanOrEqual(ZOOM_RESERVE.top - 1e-6);
    expect(centreYPx + heightPx / 2).toBeLessThanOrEqual(900 - ZOOM_RESERVE.film.bottom + 1e-6);
    expect(heightPx).toBeGreaterThan(projected(1440, 900).heightPx); // larger than a screen sharing the band with the card
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
