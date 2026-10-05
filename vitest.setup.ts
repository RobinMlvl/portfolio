import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// @testing-library/react's own auto-cleanup only registers when a global
// `afterEach` exists at import time; this project's vitest config does not
// set `test.globals: true` (tests import explicitly from 'vitest' instead),
// so we register cleanup explicitly to keep renders isolated between tests.
afterEach(() => {
  cleanup();
});

// Some test files opt into the `node` environment (no DOM globals) via a
// `// @vitest-environment node` directive, so guard these jsdom-only stubs.
if (typeof HTMLCanvasElement !== 'undefined') {
  // jsdom does not implement canvas 2D contexts: an unmocked getContext('2d')
  // prints "Not implemented: HTMLCanvasElement.prototype.getContext" to the
  // console on every call (WaveCanvas guards `if (!ctx) return;`, so behaviour
  // is unaffected). Stub it to return null quietly so test output stays pristine.
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

if (typeof window !== 'undefined') {
  // jsdom does not implement window.matchMedia. Cursor calls it in an effect
  // to detect `pointer: fine`; stub it to report no match (touch-like
  // default) so components under test don't throw.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
