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

/** Home camera: looks a little under the front cover so it sits in the upper part of the frame, above the label card. */
export const CAMERA_HOME: { position: Vec3; look: Vec3 } = {
  position: [0, 2.5, FRONT_SPOT[2] + 11],
  look: [FRONT_SPOT[0], CAROUSEL.height - 1.1, FRONT_SPOT[2]],
};

/**
 * The home camera for a viewport: backs off on narrow (portrait) viewports so the front
 * cover still fits the width, and aims lower there so the cover clears the taller card.
 */
export function homeCamera(aspect: number): { position: Vec3; look: Vec3 } {
  const d = Math.max(CAMERA_HOME.position[2] - FRONT_SPOT[2], zoomDistance(aspect, 50, 0.86));
  const drop = Math.max(0, 1 - aspect) * 3.5;
  return { position: [CAMERA_HOME.position[0], CAMERA_HOME.position[1], FRONT_SPOT[2] + d], look: [CAMERA_HOME.look[0], CAMERA_HOME.look[1] - drop, CAMERA_HOME.look[2]] };
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
 * Distance at which the cover fills `fill` of the viewport width, capped so its height
 * fits too (portrait viewports). `fovDeg` is the camera's vertical field of view.
 */
export function zoomDistance(aspect: number, fovDeg = 50, fill = 0.78): number {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const forWidth = PANEL.width / (2 * tanHalf * aspect * fill);
  const forHeight = PANEL.height / (2 * tanHalf * fill);
  return Math.max(forWidth, forHeight);
}

/**
 * Room kept free around the zoomed screen, in px: the nav above, the chapter slider and the
 * card below. `side` is the share of the width kept free on each side (less on phones).
 */
export const ZOOM_RESERVE = { top: 112, bottom: 324, bottomPortrait: 440, side: 0.19, sidePortrait: 0.04 } as const;

/**
 * Camera preset inside a product for a viewport of `width` × `height` px: straight in front
 * of the cover, as large as the free band allows, the screen centred in that band (above
 * the slider and the card, which never move).
 */
export function zoomCamera(width: number, height: number, fovDeg = 50): { position: Vec3; look: Vec3 } {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const aspect = width / Math.max(1, height);
  const portrait = aspect < 1;
  const side = portrait ? ZOOM_RESERVE.sidePortrait : ZOOM_RESERVE.side;
  const band = Math.max(height * 0.25, height - ZOOM_RESERVE.top - (portrait ? ZOOM_RESERVE.bottomPortrait : ZOOM_RESERVE.bottom));
  const screenPx = Math.min(width * (1 - 2 * side), (band * PANEL.width) / PANEL.height);
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
