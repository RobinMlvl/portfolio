import { Nav } from '@/components/nav/Nav';
import { Hero } from '@/components/hero/Hero';
import { RoomsList } from '@/components/rooms/RoomsList';
import { Sheet } from '@/components/sheet/Sheet';
import { Experience } from '@/components/world/Experience';
import { rooms } from '@/content/rooms';
import { site } from '@/content/site';
import { heroCopyOf, publicRoomsOf } from '@/content/schema';

export default function Page() {
  return (
    <Experience
      rooms={publicRoomsOf(rooms)}
      hero={heroCopyOf(site)}
      nav={site.nav}
      fallback={
        <>
          <Nav mode="hero" nav={site.nav} />
          <main>
            <Hero copy={heroCopyOf(site)} />
            <RoomsList rooms={rooms} />
            <Sheet mode="static" />
          </main>
        </>
      }
    />
  );
}
