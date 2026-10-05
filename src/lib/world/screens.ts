/**
 * The stack of screens behind each product cover. A product's screens are read in stop
 * order and flattened: screen 0 is the cover shown in the carousel, scrolling inside the
 * product lifts one screen after the other (`riseOf` in layout.ts).
 */
import type { PublicRoom, PublicStop, Screen } from '@/content/schema';
import { PANEL } from './layout';

export interface StackEntry {
  screen: Screen;
  /** the stop this screen belongs to, for the caption */
  stop: PublicStop;
  stopIndex: number;
  /** index in the product's stack (0 = cover) */
  index: number;
}

/** image width / height; placeholders default to the cover's landscape shape */
export function screenAspect(screen: Screen): number {
  return screen.kind === 'image' ? screen.width / screen.height : PANEL.width / PANEL.height;
}

/** Plane size of a screen: landscape screens take the cover's width, portrait ones its height. */
export function panelSize(screen: Screen): { width: number; height: number } {
  const aspect = screenAspect(screen);
  return aspect >= 1 ? { width: PANEL.width, height: PANEL.width / aspect } : { width: PANEL.height * aspect, height: PANEL.height };
}

/** Every screen of a product, in reading order, with its stop. */
export function stackOf(room: Pick<PublicRoom, 'stops'>): StackEntry[] {
  return room.stops.flatMap((stop, stopIndex) => stop.screens.map((screen) => ({ screen, stop, stopIndex, index: 0 }))).map((e, index) => ({ ...e, index }));
}

/** One line under a screen: the image caption, or the placeholder's label. */
export function screenCaption(screen: Screen): string {
  return screen.kind === 'image' ? screen.caption : screen.label;
}
