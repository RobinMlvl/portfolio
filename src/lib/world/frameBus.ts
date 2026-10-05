/**
 * One render loop, many imperative listeners. The scene's `useFrame` calls `emit()`
 * once per frame after ticking the state machine; DOM layers (hero lift, sheet rise)
 * subscribe to write their transforms without re-rendering React.
 */
export interface FrameBus {
  subscribe(fn: () => void): () => void;
  emit(): void;
}

export function createFrameBus(): FrameBus {
  const subs = new Set<() => void>();
  return {
    subscribe(fn) {
      subs.add(fn);
      return () => { subs.delete(fn); };
    },
    emit() {
      for (const fn of subs) fn();
    },
  };
}
