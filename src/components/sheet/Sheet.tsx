import { Also } from './Also';
import { Contact } from './Contact';

export type SheetMode = 'static' | 'overlay';

/** Plan 1: sections in normal flow. Plan 2 adds `overlay` (rises from the bottom over the world). */
export function Sheet({ mode }: { mode: SheetMode }) {
  return (
    <div data-sheet-mode={mode} className="bg-bg">
      <Also />
      <Contact />
    </div>
  );
}
