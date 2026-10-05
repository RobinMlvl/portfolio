import { describe, expect, it } from 'vitest';
import { decideWorldMode, LITE_MAX_WIDTH } from '@/lib/world/support';

describe('decideWorldMode', () => {
  it('gives the full world to a wide WebGL viewport', () => {
    expect(decideWorldMode({ webgl: true, reducedMotion: false, viewportWidth: 1440 })).toBe('full');
  });
  it('goes lite under the mobile breakpoint', () => {
    expect(decideWorldMode({ webgl: true, reducedMotion: false, viewportWidth: LITE_MAX_WIDTH - 1 })).toBe('lite');
    expect(decideWorldMode({ webgl: true, reducedMotion: false, viewportWidth: LITE_MAX_WIDTH })).toBe('full');
  });
  it('falls back to the plain page without WebGL or with reduced motion, whatever the width', () => {
    expect(decideWorldMode({ webgl: false, reducedMotion: false, viewportWidth: 1440 })).toBe('none');
    expect(decideWorldMode({ webgl: true, reducedMotion: true, viewportWidth: 1440 })).toBe('none');
    expect(decideWorldMode({ webgl: false, reducedMotion: true, viewportWidth: 390 })).toBe('none');
  });
});
