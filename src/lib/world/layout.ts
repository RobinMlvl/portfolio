/**
 * Pure geometry of the world: a carousel of product panels in front of the camera, the
 * stack of screens behind each cover, and the camera presets. Right-handed three.js
 * axes: +x right, +y up, +z toward the viewer. All values in scene units.
 */

export type Vec3 = [number, number, number];

/** A landscape cover panel; portrait screens share its height (see `panelSize`). */
export const PANEL = { width: 9, height: (9 * 7) / 16 } as const;
/**
 * The carousel circle: its centre, its radius, the height of the panel centres, and how much
 * a panel turns with its place on the circle (1 = facing straight out, 0 = all facing the
 * camera). Under 1 the neighbours show their face instead of their edge.
 */
export const CAROUSEL = { centre: [0, 0, -12] as Vec3, radius: 10, height: 2.9, facing: 0.62 } as const;
/** z between two stacked screens of one product, enough to never z-fight */
export const STACK_GAP = 0.08;
/** how far a screen travels up when it leaves the stack, relative to its height */
export const RISE_TRAVEL = 1.45;

/** The point of the circle nearest the camera: the front panel stands here. */
export const FRONT_SPOT: Vec3 = [CAROUSEL.centre[0], 0, CAROUSEL.centre[2] + CAROUSEL.radius];

/** Where the camera starts, before the first frame frames the front product (homeFraming). */
export const CAMERA_HOME: { position: Vec3; look: Vec3 } = {
  position: [0, 2.5, FRONT_SPOT[2] + 11],
  look: [FRONT_SPOT[0], CAROUSEL.height - 1.1, FRONT_SPOT[2]],
};

/** The commit history drawn under each cover: the gap under the cover, then its height (scene units). */
export const FLOOR = { gap: 0.34, height: 1.45 } as const;

/**
 * The page around the carousel, in px. On a wide viewport the product sheet stands on the
 * left and the legend on the right; elsewhere the sheet sits under the screen, `phoneSheet` tall.
 */
export const CAROUSEL_PAGE = { top: 104, bottom: 40, side: 40, sheetShare: 0.3, sheetMax: 440, legend: 224, gap: 36, maxScreen: 1100, phoneSheet: 300, phoneSide: 16 } as const;

/** A viewport wide enough for the sheet beside the carousel. */
export function isWide(width: number, height: number): boolean {
  return width >= 1024 && width / Math.max(1, height) >= 1.15;
}

/** Width of the product sheet on a wide viewport, in px. */
export function sheetWidth(width: number): number {
  return Math.min(width * CAROUSEL_PAGE.sheetShare, CAROUSEL_PAGE.sheetMax);
}

/** The band, in px, where the front product (its screen and its commit history) is framed. */
export function carouselBand(width: number, height: number): { left: number; right: number; top: number; bottom: number } {
  const P = CAROUSEL_PAGE;
  if (isWide(width, height)) return { left: P.side + sheetWidth(width) + P.gap, right: width - P.side - P.legend - P.gap, top: P.top, bottom: height - P.bottom };
  return { left: P.phoneSide, right: width - P.phoneSide, top: P.top - 8, bottom: height - P.phoneSheet - 24 };
}

/**
 * The home camera for a viewport: straight in front of the front product, at the distance
 * that fits its screen and its commit history in the band, the view shifted (`offset`, px) so
 * they sit in the middle of the band. `screenHeight` is the tallest cover, in scene units.
 */
export function homeFraming(width: number, height: number, screenHeight: number = PANEL.height, fovDeg = 50): { position: Vec3; look: Vec3; offset: [number, number] } {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const band = carouselBand(width, height);
  const bw = Math.min(CAROUSEL_PAGE.maxScreen, Math.max(80, band.right - band.left));
  const bh = Math.max(80, band.bottom - band.top);
  const stack = screenHeight + FLOOR.gap + FLOOR.height;
  // a scene unit is height / (2 d tanHalf) px at distance d
  const d = Math.max((PANEL.width * height) / (2 * tanHalf * bw * 0.94), (stack * height) / (2 * tanHalf * bh * 0.9));
  const y = CAROUSEL.height + screenHeight / 2 - stack / 2;
  return {
    position: [FRONT_SPOT[0], y, FRONT_SPOT[2] + d],
    look: [FRONT_SPOT[0], y, FRONT_SPOT[2]],
    offset: [(band.left + band.right) / 2 - width / 2, (band.top + band.bottom) / 2 - height / 2],
  };
}

/** Where product `i` of `n` sits on the circle, relative to its centre. */
export function panelPlacement(i: number, n: number, radius = CAROUSEL.radius): { position: Vec3 } {
  const theta = (i * 2 * Math.PI) / n;
  return { position: [radius * Math.sin(theta), CAROUSEL.height, radius * Math.cos(theta)] };
}

/** Wrap an angle to (-π, π]. */
export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Yaw of product `k` inside the carousel group once the carousel has turned by `ringAngle`
 * (the group itself turns by minus that). The panel leans `facing` of the way toward its
 * current place on the circle: the one at the front faces the camera exactly, the ones at
 * the sides show their face rather than their edge.
 */
export function panelYaw(k: number, n: number, ringAngle: number): number {
  const place = wrapAngle(ringAngleForRoom(k, n) - ringAngle); // 0 at the front
  return place * CAROUSEL.facing + ringAngle;
}

/** Angle of product `k` on the circle; the carousel group turns by minus this to bring it to the front. */
export function ringAngleForRoom(k: number, n: number): number {
  return (k * 2 * Math.PI) / n;
}

/** 1 when product `index` is at the front, fading to 0 one unit away. `vy` as in the state machine. */
export function frontWeight(vy: number, index: number, n: number): number {
  const front = Math.min(n - 1, Math.max(0, vy - 1));
  return Math.max(0, 1 - Math.abs(front - index));
}

/**
 * Room kept free around the zoomed screen, in px: the nav above, the chapter slider and the
 * card below. `side` is the share of the width kept free on each side (less on phones).
 * A film plays without the card: it keeps only a thin margin at the bottom (`film`).
 */
export const ZOOM_RESERVE = { top: 112, bottom: 324, bottomPortrait: 440, side: 0.19, sidePortrait: 0.04, film: { bottom: 48, side: 0.07 } } as const;

export type ZoomFrame = {
  /** height of the tallest screen of the product, in scene units */
  screenHeight?: number;
  /** a film: no card under it, so it takes the whole free height */
  film?: boolean;
};

/**
 * Camera preset inside a product for a viewport of `width` × `height` px: straight in front
 * of the cover, as large as the free band allows, the screen centred in that band (above
 * the slider and the card, which never move).
 */
export function zoomCamera(width: number, height: number, { screenHeight = PANEL.height, film = false }: ZoomFrame = {}, fovDeg = 50): { position: Vec3; look: Vec3 } {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const aspect = width / Math.max(1, height);
  const portrait = aspect < 1;
  const side = film ? (portrait ? ZOOM_RESERVE.sidePortrait : ZOOM_RESERVE.film.side) : portrait ? ZOOM_RESERVE.sidePortrait : ZOOM_RESERVE.side;
  const bottom = film ? ZOOM_RESERVE.film.bottom : portrait ? ZOOM_RESERVE.bottomPortrait : ZOOM_RESERVE.bottom;
  const band = Math.max(height * 0.25, height - ZOOM_RESERVE.top - bottom);
  const screenPx = Math.min(width * (1 - 2 * side), (band * PANEL.width) / screenHeight);
  const d = (PANEL.width * width) / (2 * tanHalf * aspect * screenPx);
  // the camera drops by the distance between the viewport centre and the band centre
  const worldPerPx = (2 * d * tanHalf) / height;
  const y = CAROUSEL.height - (height / 2 - (ZOOM_RESERVE.top + band / 2)) * worldPerPx;
  return { position: [FRONT_SPOT[0], y, FRONT_SPOT[2] + d], look: [FRONT_SPOT[0], y, FRONT_SPOT[2]] };
}

/**
 * How far screen `j` has risen out of the stack for a continuous `roomProg`
 * (`t = roomProg - j`): its vertical offset (in panel heights) and its opacity.
 * Below 0 the screen sits in the stack; at 1 it is gone.
 */
export function riseOf(t: number): { y: number; opacity: number; gone: boolean } {
  if (t <= 0) return { y: 0, opacity: 1, gone: false };
  if (t >= 1) return { y: RISE_TRAVEL, opacity: 0, gone: true };
  const e = t * t * (3 - 2 * t);
  return { y: e * RISE_TRAVEL, opacity: t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45, gone: false };
}

/* ---------- small vector helpers (kept here so tests and scene share one definition) ---------- */

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
/** Rotate a vector around +y by `angle` (three.js convention). */
export function rotateY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
