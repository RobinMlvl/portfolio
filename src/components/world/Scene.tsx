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
import { REPO_COLOR, dayLabel, type History } from '@/lib/commits';
import { useHistory } from '@/lib/history';
import type { WorldHandle } from '@/lib/world/useWorld';
import type { FrameBus } from '@/lib/world/frameBus';
import { activeRoom, flightProgress, ringAngle } from '@/lib/world/state';
import { CAMERA_HOME, CAROUSEL, FLOOR, FRONT_SPOT, PANEL, STACK_GAP, frontWeight, homeFraming, panelPlacement, panelYaw, riseOf, zoomCamera } from '@/lib/world/layout';
import { panelSize, stackOf, zoomFrameOf } from '@/lib/world/screens';

/** far covers fade into the backdrop */
const FOG = '#0E0F11';
/** where the fog begins and ends, past the front product (scene units) */
const FOG_RANGE = [5, 25] as const;
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
function CameraRig({ world, rooms }: { world: WorldHandle; rooms: PublicRoom[] }) {
  const pointer = useThree((s) => s.pointer);
  // inside a product the camera frames its tallest screen; a film takes the card's room too
  const frames = useMemo(() => rooms.map(zoomFrameOf), [rooms]);
  // at home it frames the tallest cover of all, so it does not breathe from product to product
  const coverHeight = useMemo(() => Math.max(...rooms.map((r) => panelSize(stackOf(r)[0].screen).height)), [rooms]);
  const look = useRef(new THREE.Vector3(...CAMERA_HOME.look));
  const tmp = useRef({ p: new THREE.Vector3(), l: new THREE.Vector3(), zp: new THREE.Vector3(), zl: new THREE.Vector3(), home: new THREE.Vector3(...CAMERA_HOME.position), homeLook: new THREE.Vector3(...CAMERA_HOME.look), front: new THREE.Vector3(FRONT_SPOT[0], CAROUSEL.height, FRONT_SPOT[2]), offset: { x: 0, y: 0 } });

  useFrame(({ camera, size, scene }) => {
    const s = world.ref.current;
    const { p, l, zp, zl, home, homeLook, front, offset } = tmp.current;
    const zoom = zoomCamera(size.width, size.height, frames[s.roomIdx]);
    zp.set(...zoom.position); zl.set(...zoom.look);
    const h = homeFraming(size.width, size.height, coverHeight);
    home.set(...h.position); homeLook.set(...h.look);
    // the view shift that puts the front product in its band, none once a product is open
    let [ox, oy] = h.offset;
    switch (s.phase) {
      case 'room':
        p.copy(zp); l.copy(zl);
        p.x += pointer.x * 0.04; p.y += pointer.y * 0.03;
        ox = 0; oy = 0;
        break;
      case 'entering': {
        const e = flightProgress(s);
        p.lerpVectors(home, zp, e); l.lerpVectors(homeLook, zl, e);
        ox *= 1 - e; oy *= 1 - e;
        break;
      }
      case 'leaving': {
        const e = flightProgress(s);
        p.lerpVectors(zp, home, e); l.lerpVectors(zl, homeLook, e);
        ox *= e; oy *= e;
        break;
      }
      default:
        p.copy(home); p.x += pointer.x * 0.35; p.y += pointer.y * 0.2;
        l.copy(homeLook);
    }
    const k = s.phase === 'entering' || s.phase === 'leaving' ? 1 : 0.1;
    camera.position.lerp(p, k);
    look.current.lerp(l, k);
    camera.lookAt(look.current);
    offset.x += (ox - offset.x) * k; offset.y += (oy - offset.y) * k;
    const cam = camera as THREE.PerspectiveCamera;
    cam.setViewOffset(size.width, size.height, -offset.x, -offset.y, size.width, size.height);
    cam.updateProjectionMatrix();
    // the fog starts just behind the front product, however far the camera stands (phones stand far back)
    if (scene.fog instanceof THREE.Fog) {
      const d = camera.position.distanceTo(front);
      scene.fog.near = d + FOG_RANGE[0]; scene.fog.far = d + FOG_RANGE[1];
    }
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

/* ---------- the commit history under each cover ---------- */
/** One product's commits as a waveform: a column per day, a line per commit, its dates and total under it. */
function drawFloor(history: History, repo: number): THREE.CanvasTexture | null {
  const own = history.commits.filter((c) => c[4] === repo);
  if (!own.length) return null;
  const first = own[0][0], last = own[own.length - 1][0];
  const counts = new Array<number>(last - first + 1).fill(0);
  for (const c of own) counts[c[0] - first]++;
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = Math.round((2048 * FLOOR.height) / PANEL.width);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const W = canvas.width, H = canvas.height, label = 46, band = H - label - 8;
    const colW = W / counts.length, bw = Math.max(2, colW * 0.66), lineH = band / Math.max(...counts);
    ctx.fillStyle = REPO_COLOR[repo] ?? '#ECEDEE';
    counts.forEach((n, i) => {
      const x = i * colW + (colW - bw) / 2;
      if (!n) { ctx.globalAlpha = 0.22; ctx.fillRect(x, 4 + band / 2 - 1, bw, 2); ctx.globalAlpha = 1; return; }
      const y = 4 + band / 2 - (n * lineH) / 2;
      for (let k = 0; k < n; k++) ctx.fillRect(x, y + k * lineH, bw, Math.max(1, lineH * 0.72));
    });
    const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono').trim() || 'monospace';
    ctx.fillStyle = 'rgba(236,237,238,.2)'; ctx.fillRect(0, H - label + 2, W, 2);
    ctx.font = `500 26px ${mono}`; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(236,237,238,.6)';
    ctx.textAlign = 'left'; ctx.fillText(dayLabel(history.first, first).toUpperCase(), 0, H - label + 14);
    ctx.textAlign = 'right'; ctx.fillText(dayLabel(history.first, last).toUpperCase(), W, H - label + 14);
    ctx.fillStyle = 'rgba(236,237,238,.92)';
    ctx.textAlign = 'center'; ctx.fillText(`${own.length.toLocaleString('en-US')} COMMITS`, W / 2, H - label + 14);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The floor texture, redrawn once the web font is ready so the labels never keep a fallback face. */
function useFloorTexture(history: History | null, repo: number): THREE.CanvasTexture | null {
  const gl = useThree((s) => s.gl);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!history || repo < 0) return;
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    const draw = () => {
      if (!alive) return;
      made?.dispose();
      made = drawFloor(history, repo);
      if (made) made.anisotropy = gl.capabilities.getMaxAnisotropy();
      setTexture(made);
    };
    draw();
    document.fonts?.ready.then(draw);
    return () => { alive = false; made?.dispose(); };
  }, [history, repo, gl]);
  return texture;
}

/**
 * The product's commit history, standing under its cover and leaning with it. It fades with
 * the cover in the carousel and steps aside once a product is open.
 */
function CommitFloor({ world, roomIndex, coverHeight, history, repo }: { world: WorldHandle; roomIndex: number; coverHeight: number; history: History | null; repo: number }) {
  const texture = useFloorTexture(history, repo);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const s = world.ref.current;
    const w = frontWeight(s.vy, roomIndex, world.config.rooms.length);
    if (material.current) material.current.opacity = (SIDE_OPACITY + (1 - SIDE_OPACITY) * w) * othersPresence(s);
  });
  if (!texture) return null;
  return (
    <mesh position={[0, -coverHeight / 2 - FLOOR.gap - FLOOR.height / 2, 0]} raycast={() => null}>
      <planeGeometry args={[PANEL.width, FLOOR.height]} />
      <meshBasicMaterial key={texture.uuid} ref={material} map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
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

type Look = ReturnType<typeof screenLook>;

/**
 * One screen of a product's stack: a plane and its bezel, lifted and faded by `screenLook`
 * every frame. `map` is the image, the film or the label; null shows a plain graphite slab.
 */
function Panel({ world, roomIndex, index, width, height, map, onClick, onLook, children }: Omit<ScreenPanelProps, 'screen'> & { width: number; height: number; map: THREE.Texture | null; onLook?(look: Look): void; /** drawn on the screen, e.g. a play button */ children?: React.ReactNode }) {
  const fill = useRef<THREE.MeshBasicMaterial>(null);
  const bezel = useRef<THREE.MeshBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const look = screenLook(world, roomIndex, index);
    if (group.current) { group.current.visible = look.visible; group.current.position.y = look.y * height; }
    if (fill.current) fill.current.opacity = look.opacity;
    if (bezel.current) bezel.current.opacity = look.opacity;
    onLook?.(look);
  });
  return (
    <group ref={group} position={[0, 0, -index * STACK_GAP]} visible={false}>
      {/* a swipe that starts and ends on the cover turns the carousel; it does not open the product */}
      <mesh onClick={onClick ? (e) => { e.stopPropagation(); if (e.delta <= 10) onClick(); } : undefined} onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer'; } : undefined} onPointerOut={onClick ? () => { document.body.style.cursor = ''; } : undefined}>
        <planeGeometry args={[width, height]} />
        {/* a new material when the map changes: three.js compiles the map into the shader only at creation */}
        <meshBasicMaterial key={map ? map.uuid : 'plain'} ref={fill} map={map} color={map ? '#ffffff' : PLACEHOLDER} transparent opacity={0} toneMapped={false} />
      </mesh>
      <Bezel w={width} h={height} matRef={bezel} />
      {children}
    </group>
  );
}

/** A still, sharp at an angle. */
function useStill(src: string): THREE.Texture {
  const gl = useThree((s) => s.gl);
  return useTexture(src, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = gl.capabilities.getMaxAnisotropy(); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true; });
}

function ImageScreen({ screen, ...panel }: ScreenPanelProps & { screen: Extract<Screen, { kind: 'image' }> }) {
  const texture = useStill(screen.src);
  return <Panel {...panel} {...panelSize(screen)} map={texture} />;
}

/**
 * A product film. In the carousel it shows its poster and stays still; a click on the cover
 * (or entering the product) plays it with sound, the play starting inside the click so the
 * browser lets the sound through. Inside, a click pauses or resumes it; leaving stops it and
 * brings the poster back.
 */
/** The play button drawn on a film: a red disc and a white triangle, like the site's play mark. */
function drawPlay(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(128, 134, 110, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF4F3A'; ctx.beginPath(); ctx.arc(128, 128, 104, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(104, 84); ctx.lineTo(104, 172); ctx.lineTo(178, 128); ctx.closePath(); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** diameter of the play button, in scene units (the cover is 9 wide) */
const PLAY_SIZE = 1.15;

function VideoScreen({ screen, world, roomIndex, index, onClick }: ScreenPanelProps & { screen: Extract<Screen, { kind: 'video' }> }) {
  const poster = useStill(screen.poster);
  const playIcon = useMemo(() => drawPlay(), []);
  useEffect(() => () => playIcon.dispose(), [playIcon]);
  const badge = useRef<THREE.MeshBasicMaterial>(null);
  /** 1 while the film is still, 0 while it plays; eased so the button fades */
  const badgeOn = useRef(1);
  const video = useRef<HTMLVideoElement | null>(null);
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  const [shown, setShown] = useState(false);
  /** the film has been started during this visit of the product */
  const started = useRef(false);
  useEffect(() => {
    const v = Object.assign(document.createElement('video'), { src: screen.src, playsInline: true, preload: 'metadata', crossOrigin: 'anonymous' });
    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    const onPlaying = () => setShown(true);
    v.addEventListener('playing', onPlaying);
    video.current = v;
    const init = () => setTexture(t);
    init();
    return () => { v.removeEventListener('playing', onPlaying); v.pause(); v.removeAttribute('src'); v.load(); t.dispose(); video.current = null; };
  }, [screen.src]);

  const inside = () => { const s = world.ref.current; return (s.phase === 'room' || s.phase === 'entering') && s.roomIdx === roomIndex; };
  const play = (v: HTMLVideoElement) => { started.current = true; v.muted = false; v.play().catch(() => { /* refused outside a gesture: a click on the screen starts it */ }); };
  const onLook = (look: Look) => {
    const v = video.current;
    if (v) {
      if (inside()) { if (!started.current) play(v); }
      else if (started.current) { started.current = false; v.pause(); v.currentTime = 0; setShown(false); }
    }
    // the play button shows whenever the film is not playing
    badgeOn.current += ((v && !v.paused ? 0 : 1) - badgeOn.current) * 0.2;
    if (badge.current) badge.current.opacity = look.opacity * badgeOn.current;
  };
  const click = () => {
    const v = video.current, s = world.ref.current;
    if (v && s.phase === 'room' && s.roomIdx === roomIndex) { if (v.paused) play(v); else v.pause(); return; }
    if (v && s.phase === 'carousel' && activeRoom(s, world.config) === roomIndex) play(v);
    onClick?.();
  };
  return (
    <Panel world={world} roomIndex={roomIndex} index={index} {...panelSize(screen)} map={shown && texture ? texture : poster} onLook={onLook} onClick={click}>
      {/* low on the right, clear of the film's titles; the click goes through to the screen behind */}
      <mesh position={[panelSize(screen).width * 0.3, -panelSize(screen).height * 0.2, 0.03]} raycast={() => null}>
        <planeGeometry args={[PLAY_SIZE, PLAY_SIZE]} />
        <meshBasicMaterial ref={badge} map={playIcon} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </Panel>
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

function PlaceholderScreen({ screen, title, subtitle, ...panel }: ScreenPanelProps & { title: string; subtitle: string }) {
  const label = useLabelTexture(title, subtitle);
  return <Panel {...panel} {...panelSize(screen)} map={label} />;
}

/* ---------- a product: its cover and the stack behind it ---------- */
function ProductStack({ world, room, index, count, history, onRoomClick }: { world: WorldHandle; room: PublicRoom; index: number; count: number; history: History | null; onRoomClick(i: number): void }) {
  const { position } = panelPlacement(index, count);
  const stack = useMemo(() => stackOf(room), [room]);
  const coverHeight = panelSize(stack[0].screen).height;
  const repo = history ? history.repos.findIndex((r) => r.slug === room.slug) : -1;
  const group = useRef<THREE.Group>(null);
  // the panel leans toward its current place on the circle: exactly facing the camera when in front
  useFrame(() => { if (group.current) group.current.rotation.y = panelYaw(index, count, ringAngle(world.ref.current, world.config)); });
  const onCoverClick = () => { if (world.ref.current.phase === 'carousel') onRoomClick(index); };
  return (
    <group ref={group} position={position}>
      <CommitFloor world={world} roomIndex={index} coverHeight={coverHeight} history={history} repo={repo} />
      {stack.map(({ screen, index: j }) => screen.kind === 'image'
        ? <Suspense key={screen.key} fallback={null}><ImageScreen world={world} roomIndex={index} index={j} screen={screen} onClick={j === 0 ? onCoverClick : undefined} /></Suspense>
        : screen.kind === 'video'
        ? <Suspense key={screen.key} fallback={null}><VideoScreen world={world} roomIndex={index} index={j} screen={screen} onClick={j === 0 ? onCoverClick : undefined} /></Suspense>
        : <PlaceholderScreen key={screen.key} world={world} roomIndex={index} index={j} screen={screen} title={j === 0 ? room.name : screen.label} subtitle={j === 0 ? room.kicker : room.name} onClick={j === 0 ? onCoverClick : undefined} />)}
    </group>
  );
}

export function Scene({ world, rooms, bus, onRoomClick }: SceneProps) {
  const loaded = useHistory();
  const history = loaded === 'failed' ? null : loaded;
  return (
    <>
      <fog attach="fog" args={[FOG, 16, 36]} />
      <Ticker world={world} bus={bus} />
      <CameraRig world={world} rooms={rooms} />
      <Carousel world={world}>
        {rooms.map((room, i) => (
          <ProductStack key={room.slug} world={world} room={room} index={i} count={rooms.length} history={history} onRoomClick={onRoomClick} />
        ))}
      </Carousel>
    </>
  );
}
