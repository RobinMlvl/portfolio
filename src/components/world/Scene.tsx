'use client';
/**
 * The WebGL world, Commits direction: the product covers stand on a circle in front of the
 * camera on the charcoal backdrop (the canvas is transparent over the page's sweep), each
 * with a thin graphite bezel and a soft shadow on the floor. Inside a product
 * the screens lift one by one. All continuous motion reads the state machine from
 * `world.ref` each frame.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { PublicRoom, Screen } from '@/content/schema';
import type { WorldHandle } from '@/lib/world/useWorld';
import type { FrameBus } from '@/lib/world/frameBus';
import { flightProgress, ringAngle } from '@/lib/world/state';
import { CAMERA_HOME, CAROUSEL, STACK_GAP, frontWeight, homeCamera, panelPlacement, panelYaw, riseOf, zoomCamera } from '@/lib/world/layout';
import { panelSize, stackOf } from '@/lib/world/screens';

/** far covers fade into the backdrop */
const FOG = '#0E0F11';
const BEZEL = '#2A2D33';
const PLACEHOLDER = '#1A1C20';
/** how far the bezel shows around a screen, in scene units */
const BEZEL_MARGIN = 0.11;
/** opacity of a cover standing at the side of the carousel */
const SIDE_OPACITY = 0.55;

export interface SceneProps {
  world: WorldHandle;
  rooms: PublicRoom[];
  bus: FrameBus;
  onRoomClick(index: number): void;
}

/* ---------- one loop: tick the machine, then notify DOM layers ---------- */
function Ticker({ world, bus }: { world: WorldHandle; bus: FrameBus }) {
  useFrame((_, delta) => {
    world.tick(delta * 1000);
    bus.emit();
  });
  return null;
}

/* ---------- camera ---------- */
function CameraRig({ world }: { world: WorldHandle }) {
  const pointer = useThree((s) => s.pointer);
  const look = useRef(new THREE.Vector3(...CAMERA_HOME.look));
  const tmp = useRef({ p: new THREE.Vector3(), l: new THREE.Vector3(), zp: new THREE.Vector3(), zl: new THREE.Vector3(), home: new THREE.Vector3(...CAMERA_HOME.position), homeLook: new THREE.Vector3(...CAMERA_HOME.look) });

  useFrame(({ camera, size }) => {
    const s = world.ref.current;
    const { p, l, zp, zl, home, homeLook } = tmp.current;
    const aspect = size.width / Math.max(1, size.height);
    const zoom = zoomCamera(size.width, size.height);
    zp.set(...zoom.position); zl.set(...zoom.look);
    const h = homeCamera(aspect);
    home.set(...h.position); homeLook.set(...h.look);
    switch (s.phase) {
      case 'room':
        p.copy(zp); l.copy(zl);
        p.x += pointer.x * 0.04; p.y += pointer.y * 0.03;
        break;
      case 'entering': {
        const e = flightProgress(s);
        p.lerpVectors(home, zp, e); l.lerpVectors(homeLook, zl, e);
        break;
      }
      case 'leaving': {
        const e = flightProgress(s);
        p.lerpVectors(zp, home, e); l.lerpVectors(zl, homeLook, e);
        break;
      }
      default:
        p.copy(home); p.x += pointer.x * 0.5; p.y += pointer.y * 0.25;
        l.copy(homeLook);
    }
    const k = s.phase === 'entering' || s.phase === 'leaving' ? 1 : 0.1;
    camera.position.lerp(p, k);
    look.current.lerp(l, k);
    camera.lookAt(look.current);
  });
  return null;
}

/* ---------- the carousel group: turns so the active product stands at the front ---------- */
function Carousel({ world, children }: { world: WorldHandle; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = -ringAngle(world.ref.current, world.config); });
  return <group ref={ref} position={CAROUSEL.centre}>{children}</group>;
}

/**
 * How present the products other than the open one are: 1 in the carousel, fading out
 * during the flight in, 0 inside a product, back to 1 during the flight out. The zoomed
 * screen gets the stage to itself.
 */
function othersPresence(s: WorldHandle['ref']['current']): number {
  switch (s.phase) {
    case 'entering': return 1 - flightProgress(s);
    case 'room': return 0;
    case 'leaving': return flightProgress(s);
    default: return 1;
  }
}

/* ---------- a soft shadow on the floor under each cover ---------- */
const SHADOW_VERTEX = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SHADOW_FRAGMENT = `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = length((vUv - 0.5) * 2.0);
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * uOpacity);
}
`;

function FloorShadow({ world, roomIndex, width }: { world: WorldHandle; roomIndex: number; width: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);
  useFrame(() => {
    const s = world.ref.current;
    const inRoom = (s.phase === 'room' || s.phase === 'entering' || s.phase === 'leaving') && s.roomIdx === roomIndex;
    // every shadow fades while a product is open: the zoomed screen floats, and its shadow would sit under the slider
    const w = inRoom ? 1 : frontWeight(s.vy, roomIndex, world.config.rooms.length);
    if (material.current) material.current.uniforms.uOpacity.value = 0.34 * (0.45 + 0.55 * w) * othersPresence(s);
  });
  return (
    <mesh position={[0, -CAROUSEL.height + 0.02, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width * 1.15, 2.6]} />
      <shaderMaterial ref={material} vertexShader={SHADOW_VERTEX} fragmentShader={SHADOW_FRAGMENT} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}

/* ---------- screens ---------- */
interface ScreenPanelProps {
  world: WorldHandle;
  roomIndex: number;
  /** index in the product's stack, 0 = cover */
  index: number;
  screen: Screen;
  onClick?(): void;
}

/**
 * Per-frame look of a screen: in the carousel only the cover shows, dimmed on the sides;
 * inside the product each screen rises out of the stack in turn.
 */
function screenLook(world: WorldHandle, roomIndex: number, index: number): { visible: boolean; y: number; opacity: number } {
  const s = world.ref.current;
  const inRoom = (s.phase === 'room' || s.phase === 'entering' || s.phase === 'leaving') && s.roomIdx === roomIndex;
  if (!inRoom) {
    if (index !== 0) return { visible: false, y: 0, opacity: 0 };
    const w = frontWeight(s.vy, roomIndex, world.config.rooms.length);
    const opacity = (SIDE_OPACITY + (1 - SIDE_OPACITY) * w) * othersPresence(s);
    return { visible: opacity > 0.01, y: 0, opacity };
  }
  const rise = riseOf(s.roomProg - index);
  return { visible: !rise.gone, y: rise.y, opacity: rise.opacity };
}

/** The graphite bezel behind a screen, like the edge of a device. */
function Bezel({ w, h, matRef }: { w: number; h: number; matRef: React.MutableRefObject<THREE.MeshBasicMaterial | null> }) {
  return (
    <mesh position={[0, 0, -0.012]}>
      <planeGeometry args={[w + BEZEL_MARGIN * 2, h + BEZEL_MARGIN * 2]} />
      <meshBasicMaterial ref={matRef} color={BEZEL} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

/** Writes one frame of `screenLook` onto the objects of a screen. */
function applyScreenLook(look: ReturnType<typeof screenLook>, height: number, group: THREE.Group | null, fill: THREE.Material | null, bezel: THREE.Material | null) {
  if (group) { group.visible = look.visible; group.position.y = look.y * height; }
  if (fill) fill.opacity = look.opacity;
  if (bezel) bezel.opacity = look.opacity;
}

function ImageScreen({ world, roomIndex, index, screen, onClick }: ScreenPanelProps & { screen: Extract<Screen, { kind: 'image' }> }) {
  const gl = useThree((s) => s.gl);
  const texture = useTexture(screen.src, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = gl.capabilities.getMaxAnisotropy(); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true; });
  const { width, height } = panelSize(screen);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const bezel = useRef<THREE.MeshBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);
  useFrame(() => applyScreenLook(screenLook(world, roomIndex, index), height, group.current, mat.current, bezel.current));
  return (
    <group ref={group} position={[0, 0, -index * STACK_GAP]} visible={false}>
      <mesh onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined} onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer'; } : undefined} onPointerOut={onClick ? () => { document.body.style.cursor = ''; } : undefined}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={mat} map={texture} transparent opacity={0} toneMapped={false} />
      </mesh>
      <Bezel w={width} h={height} matRef={bezel} />
    </group>
  );
}

/** Draws a placeholder: a graphite card with a title and a line under it, in the page's typeface. */
function drawLabel(title: string, subtitle: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const family = getComputedStyle(document.body).fontFamily;
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#1C1E23'); bg.addColorStop(1, '#121316');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ECEDEE'; ctx.font = `650 104px ${family}`;
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 34, canvas.width - 160);
    ctx.fillStyle = '#868A92'; ctx.font = `500 42px ${family}`;
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 62, canvas.width - 160);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A label texture, redrawn once the web font is ready so the canvas never keeps a fallback face. */
function useLabelTexture(title: string, subtitle: string): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    const draw = () => {
      if (!alive) return;
      made?.dispose();
      made = drawLabel(title, subtitle);
      setTexture(made);
    };
    draw();
    document.fonts?.ready.then(draw);
    return () => { alive = false; made?.dispose(); };
  }, [title, subtitle]);
  return texture;
}

function PlaceholderScreen({ world, roomIndex, index, screen, title, subtitle, onClick }: ScreenPanelProps & { title: string; subtitle: string }) {
  const { width, height } = panelSize(screen);
  const label = useLabelTexture(title, subtitle);
  const fill = useRef<THREE.MeshBasicMaterial>(null);
  const bezel = useRef<THREE.MeshBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);
  useFrame(() => applyScreenLook(screenLook(world, roomIndex, index), height, group.current, fill.current, bezel.current));
  return (
    <group ref={group} position={[0, 0, -index * STACK_GAP]} visible={false}>
      <mesh onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined} onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer'; } : undefined} onPointerOut={onClick ? () => { document.body.style.cursor = ''; } : undefined}>
        <planeGeometry args={[width, height]} />
        {/* a new material once the label exists: three.js compiles the map into the shader only at creation */}
        <meshBasicMaterial key={label ? label.uuid : 'plain'} ref={fill} map={label} color={label ? '#ffffff' : PLACEHOLDER} transparent opacity={0} toneMapped={false} />
      </mesh>
      <Bezel w={width} h={height} matRef={bezel} />
    </group>
  );
}

/* ---------- a product: its cover and the stack behind it ---------- */
function ProductStack({ world, room, index, count, onRoomClick }: { world: WorldHandle; room: PublicRoom; index: number; count: number; onRoomClick(i: number): void }) {
  const { position } = panelPlacement(index, count);
  const stack = useMemo(() => stackOf(room), [room]);
  const coverWidth = panelSize(stack[0].screen).width;
  const group = useRef<THREE.Group>(null);
  // the panel leans toward its current place on the circle: exactly facing the camera when in front
  useFrame(() => { if (group.current) group.current.rotation.y = panelYaw(index, count, ringAngle(world.ref.current, world.config)); });
  const onCoverClick = () => { if (world.ref.current.phase === 'carousel') onRoomClick(index); };
  return (
    <group ref={group} position={position}>
      <FloorShadow world={world} roomIndex={index} width={coverWidth} />
      {stack.map(({ screen, index: j }) => screen.kind === 'image'
        ? <Suspense key={screen.key} fallback={null}><ImageScreen world={world} roomIndex={index} index={j} screen={screen} onClick={j === 0 ? onCoverClick : undefined} /></Suspense>
        : <PlaceholderScreen key={screen.key} world={world} roomIndex={index} index={j} screen={screen} title={j === 0 ? room.name : screen.label} subtitle={j === 0 ? room.kicker : room.name} onClick={j === 0 ? onCoverClick : undefined} />)}
    </group>
  );
}

export function Scene({ world, rooms, bus, onRoomClick }: SceneProps) {
  return (
    <>
      <fog attach="fog" args={[FOG, 16, 36]} />
      <Ticker world={world} bus={bus} />
      <CameraRig world={world} />
      <Carousel world={world}>
        {rooms.map((room, i) => (
          <ProductStack key={room.slug} world={world} room={room} index={i} count={rooms.length} onRoomClick={onRoomClick} />
        ))}
      </Carousel>
    </>
  );
}
