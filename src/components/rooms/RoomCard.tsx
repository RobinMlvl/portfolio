import type { Room } from '@/content/schema';
import { ProductLogo } from './ProductLogo';
import { StopBlock } from './StopBlock';

export function RoomCard({ room }: { room: Room }) {
  return (
    <article id={`room-${room.slug}`} aria-labelledby={`room-${room.slug}-title`} className="px-10 py-[12vh] max-md:px-5">
      <p className="kicker mb-6 text-fg-2">{room.kicker}</p>
      <h2 id={`room-${room.slug}-title`} className="flex items-center gap-4"><ProductLogo logo={room.logo} /></h2>
      <p className="mt-6 max-w-[560px] font-body text-[17px] leading-[1.55] text-fg-2">{room.oneLiner}</p>
      <ul className="mt-6 flex flex-wrap gap-8">
        {room.metrics.map((m) => (<li key={m.label}><span className="display block text-[28px]">{m.value}</span><span className="kicker mt-2 block text-muted">{m.label}</span></li>))}
      </ul>
      <div className="mt-12">{room.stops.map((s, i) => <StopBlock key={s.key} stop={s} index={i + 1} total={room.stops.length} />)}</div>
    </article>
  );
}
