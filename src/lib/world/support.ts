/**
 * Decides how much of the 3D world a visitor gets (spec §3.3).
 * `full`  desktop with WebGL and no reduced-motion preference
 * `lite`  same scene, cheaper (small viewport)
 * `none`  the Plan 1 page: no WebGL, or reduced motion requested
 */

export type WorldMode = 'full' | 'lite' | 'none';

export interface SupportInputs {
  webgl: boolean;
  reducedMotion: boolean;
  viewportWidth: number;
}

export const LITE_MAX_WIDTH = 900;

export function decideWorldMode({ webgl, reducedMotion, viewportWidth }: SupportInputs): WorldMode {
  if (!webgl || reducedMotion) return 'none';
  return viewportWidth < LITE_MAX_WIDTH ? 'lite' : 'full';
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Client-only. Call it in an effect, never during render. */
export function detectWorldSupport(): WorldMode {
  if (typeof window === 'undefined') return 'none';
  return decideWorldMode({
    webgl: hasWebGL(),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    viewportWidth: window.innerWidth,
  });
}
