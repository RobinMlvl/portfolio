import type { Room } from '@/content/schema';
import { RoomCard } from './RoomCard';

/** Vertical list of the rooms. Plan 1 main content; plan 2 no-3D fallback. */
export function RoomsList({ rooms }: { rooms: Room[] }) {
  return (
    <section id="work" aria-label="Selected work" className="border-t border-line">
      <p className="kicker px-10 pt-10 text-fg-2 max-md:px-5">Selected work, four products</p>
      {rooms.map((r) => <RoomCard key={r.slug} room={r} />)}
    </section>
  );
}
