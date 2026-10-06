import { z } from 'zod';

export const MetricSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  /** Where the number comes from (file path, doc, commit). Never invent a number. */
  source: z.string().min(1),
});

export const ImageScreenSchema = z.object({
  kind: z.literal('image'),
  key: z.string().min(1),
  src: z.string().regex(/^\/screens\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|jpg|png)$/),
  alt: z.string().min(1),
  caption: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** A product film: plays muted and in a loop in the world, with a still (the poster) until it can. */
export const VideoScreenSchema = z.object({
  kind: z.literal('video'),
  key: z.string().min(1),
  src: z.string().regex(/^\/screens\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/),
  poster: z.string().regex(/^\/screens\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|jpg|png)$/),
  /** what the film shows, for assistive tech */
  alt: z.string().min(1),
  caption: z.string().min(1),
  /** of the film and of its poster (same size) */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const PlaceholderScreenSchema = z.object({
  kind: z.literal('placeholder'),
  key: z.string().min(1),
  label: z.string().min(1),
  /** who provides the capture: Robin (internal tools) or me (public pages) */
  owner: z.enum(['robin', 'me']),
});

export const ScreenSchema = z.discriminatedUnion('kind', [ImageScreenSchema, VideoScreenSchema, PlaceholderScreenSchema]);

export const StopSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  metrics: z.array(MetricSchema).max(3).optional(),
  /** may be empty: a product shown by one film keeps the text of its other stops for the plain page */
  screens: z.array(ScreenSchema),
});

export const LogoSchema = z.object({
  src: z.string().regex(/^\/logos\/[a-z0-9-]+\.(svg|png)$/),
  alt: z.string().min(1),
  /** display height in px at desktop size */
  height: z.number().int().positive(),
  /** intrinsic width / height of the asset, used by next/image to reserve space */
  ratio: z.number().positive(),
  /** optional text appended after the logo, e.g. "OS" */
  suffix: z.string().optional(),
});

export const RoomSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  index: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  name: z.string().min(1),
  logo: LogoSchema,
  kicker: z.string().min(1),
  oneLiner: z.string().min(1),
  /** what Robin did, one short line */
  role: z.string().min(1),
  /** "Since Jul 2026", from the commit history (periodOf) */
  period: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1).max(4),
  /** the product online, when it is public */
  url: z.string().url().nullable(),
  metrics: z.tuple([MetricSchema, MetricSchema, MetricSchema]),
  stops: z.array(StopSchema).min(1).max(4),
  status: z.enum(['live', 'internal', 'prototype']),
}).refine((r) => r.stops.some((s) => s.screens.length > 0), { message: 'a product needs at least one screen, its cover' });

const LinkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) });

export const SiteSchema = z.object({
  nav: z.object({
    openToWork: z.string().min(1),
    name: z.string().min(1),
    links: z.array(LinkSchema).min(3),
  }),
  hero: z.object({
    kicker: z.string().min(1),
    kickerNote: z.string().min(1),
    name: z.tuple([z.string().min(1), z.string().min(1)]),
    sub: z.object({ lead: z.string().min(1), emphasis: z.string().min(1), tail: z.string().min(1) }),
    cta: z.string().min(1),
  }),
  also: z.object({
    kicker: z.string().min(1),
    items: z.array(z.object({ name: z.string().min(1), year: z.string().min(1), url: z.string().url().nullable(), body: z.string().min(1) })).min(1),
  }),
  contact: z.object({
    kicker: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    languages: z.string().min(1),
    cvHref: z.string().min(1),
    github: z.string().url(),
    linkedin: z.string().url().nullable(),
    portraitAlt: z.string().min(1),
  }),
});

export type Metric = z.infer<typeof MetricSchema>;
export type ImageScreen = z.infer<typeof ImageScreenSchema>;
export type VideoScreen = z.infer<typeof VideoScreenSchema>;
export type PlaceholderScreen = z.infer<typeof PlaceholderScreenSchema>;
export type Screen = z.infer<typeof ScreenSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type Logo = z.infer<typeof LogoSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Site = z.infer<typeof SiteSchema>;

/**
 * Client-safe hero copy: no `source` field, so this type (and the client
 * components that use it) never carries build notes into the browser bundle.
 */
export type HeroCopy = {
  kicker: string;
  kickerNote: string;
  name: [string, string];
  sub: { lead: string; emphasis: string; tail: string };
  cta: string;
};

export type NavCopy = Site['nav'];

/** The hero's copy, as plain strings for the client. */
export function heroCopyOf(site: Site): HeroCopy {
  return {
    kicker: site.hero.kicker,
    kickerNote: site.hero.kickerNote,
    name: site.hero.name,
    sub: site.hero.sub,
    cta: site.hero.cta,
  };
}

/**
 * Client-safe room shapes: the same rooms without any `source` field, so the world
 * components (client bundle) never carry build notes. The plain rendering keeps `Room`.
 */
export type PublicMetric = Omit<Metric, 'source'>;
export type PublicStop = Omit<Stop, 'metrics'> & { metrics?: PublicMetric[] };
export type PublicRoom = Omit<Room, 'metrics' | 'stops'> & {
  metrics: [PublicMetric, PublicMetric, PublicMetric];
  stops: PublicStop[];
};

const publicMetricOf = ({ value, label }: Metric): PublicMetric => ({ value, label });

/** Strips `source` from every metric of every room and stop. */
export function publicRoomsOf(rooms: Room[]): PublicRoom[] {
  return rooms.map(({ metrics, stops, ...room }) => ({
    ...room,
    metrics: [publicMetricOf(metrics[0]), publicMetricOf(metrics[1]), publicMetricOf(metrics[2])],
    stops: stops.map(({ metrics: stopMetrics, ...stop }) => ({
      ...stop,
      ...(stopMetrics ? { metrics: stopMetrics.map(publicMetricOf) } : {}),
    })),
  }));
}
