'use client';
/**
 * Canvas + overlays. Client-only; loaded with next/dynamic (ssr: false) after the hero
 * has painted, so the first paint never waits for WebGL.
 */
import { useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { PublicRoom } from '@/content/schema';
import type { WorldHandle } from '@/lib/world/useWorld';
import type { FrameBus } from '@/lib/world/frameBus';
import { CAMERA_HOME } from '@/lib/world/layout';
import { stackOf } from '@/lib/world/screens';
import { Scene } from './Scene';
import { BackButton, ChapterSlider, Hint, LabelCard, Rail } from './Overlays';

export interface WorldProps {
  world: WorldHandle;
  rooms: PublicRoom[];
  mode: 'full' | 'lite';
  bus: FrameBus;
}

export function World({ world, rooms, mode, bus }: WorldProps) {
  const { snapshot, actions } = world;
  // a lost WebGL context (backgrounded tab, too many contexts in dev) remounts the canvas with a fresh one
  const [epoch, setEpoch] = useState(0);
  const onCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setEpoch((n) => n + 1); }, { once: true });
  }, []);

  const onRoomClick = useCallback((i: number) => {
    if (i === world.snapshot.room) actions.enter(i); else actions.goToRoom(i);
  }, [actions, world.snapshot.room]);

  const room = rooms[snapshot.room];
  const inRoom = snapshot.phase === 'room';
  const stack = stackOf(room);
  const entry = stack[Math.min(snapshot.stop, stack.length - 1)];
  // the card shows the product until the second screen of a product is reached
  const cardMode = inRoom && snapshot.stop >= 1 ? 'screen' : 'product';
  const cardVisible = snapshot.worldVisible && snapshot.phase !== 'hero' && snapshot.phase !== 'sheet';

  return (
    <div className="sweep fixed inset-0 z-0" aria-label="Interactive products" role="region">
      <Canvas key={epoch} onCreated={onCreated} dpr={mode === 'lite' ? [1, 1.5] : [1, 2]} camera={{ fov: 50, near: 0.1, far: 120, position: CAMERA_HOME.position }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} className="!absolute !inset-0">
        <Scene world={world} rooms={rooms} bus={bus} onRoomClick={onRoomClick} />
      </Canvas>
      {/* the slider and the card share one anchor at the bottom; the zoom leaves this band free (ZOOM_RESERVE) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(20px,2.4vw)] z-10 flex flex-col items-center gap-3">
        <ChapterSlider room={room} snapshot={snapshot} actions={actions} />
        <div className="pointer-events-auto"><LabelCard room={room} index={snapshot.room} total={rooms.length} entry={entry} stackTotal={stack.length} mode={cardMode} enterable={snapshot.phase === 'carousel'} visible={cardVisible} onEnter={() => actions.enter(snapshot.room)} /></div>
      </div>
      <Rail rooms={rooms} snapshot={snapshot} actions={actions} />
      <BackButton visible={inRoom} onClick={actions.leave} />
      <Hint visible={snapshot.phase === 'carousel' && snapshot.worldVisible} />
    </div>
  );
}
