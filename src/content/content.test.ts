// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RoomSchema, SiteSchema } from '@/content/schema';
import { collectStrings, forbiddenCopy } from '@/content/rules';
import { rooms } from '@/content/rooms';
import { site } from '@/content/site';
import { repos } from '@/content/commits';

describe('rooms', () => {
  it('has the four rooms in the decided order, Drinxlab listed in Also', () => {
    expect(rooms.map((r) => r.slug)).toEqual(['dewex', 'dewex-os', 'swiss-local-adventures', 'riview']);
    expect(site.also.items.map((i) => i.name)).toContain('Drinxlab');
    expect(rooms.map((r) => r.index)).toEqual([1, 2, 3, 4]);
  });
  it('validates against the schema', () => {
    for (const r of rooms) expect(() => RoomSchema.parse(r)).not.toThrow();
  });
  it('Dewex has its four stops in order: site, studio, client site, back office', () => {
    expect(rooms[0].stops.map((s) => s.key)).toEqual(['site', 'studio', 'client', 'backoffice']);
  });
  it('every referenced logo and image exists in public/ at the declared dimensions', async () => {
    for (const r of rooms) {
      expect(fs.existsSync(path.join('public', r.logo.src)), r.logo.src).toBe(true);
      for (const s of r.stops) {
        for (const sc of s.screens) {
          if (sc.kind === 'image') {
            expect(fs.existsSync(path.join('public', sc.src)), sc.src).toBe(true);
            const meta = await sharp(path.join('public', sc.src)).metadata();
            expect([meta.width, meta.height]).toEqual([sc.width, sc.height]);
          }
          if (sc.kind === 'video') {
            expect(fs.existsSync(path.join('public', sc.src)), sc.src).toBe(true);
            // the poster stands in for the film until it plays: same size
            const meta = await sharp(path.join('public', sc.poster)).metadata();
            expect([meta.width, meta.height]).toEqual([sc.width, sc.height]);
          }
        }
      }
    }
  });
});

describe('site', () => {
  it('validates against the schema', () => {
    expect(() => SiteSchema.parse(site)).not.toThrow();
  });
  it('hero copy is generalist: no addressee, no location', () => {
    expect(site.hero.name).toEqual(['Robin', 'Malaval']);
    expect(collectStrings(site).join(' ')).not.toMatch(/Treble|Reykjav|Iceland|64\.14/);
  });
});

describe('commits', () => {
  const all = JSON.parse(fs.readFileSync('public/commits/all.json', 'utf8'));
  it('the combined history holds every commit of every repository of the summary', () => {
    expect(all.repos.map((r: { slug: string }) => r.slug)).toEqual(repos.map((r) => r.slug));
    expect(all.total).toBe(repos.reduce((n, r) => n + r.total, 0));
    expect(all.commits).toHaveLength(all.total);
    repos.forEach((r, i) => expect(all.commits.filter((c: unknown[]) => c[4] === i)).toHaveLength(r.total));
  });
  it('publishes no email, link or IP address in a commit message', () => {
    for (const c of all.commits) expect(c[3], c[2]).not.toMatch(/[\w.+-]+@[\w-]+\.\w|https?:\/\/|\b\d{1,3}(\.\d{1,3}){3}\b/);
  });
});

describe('copy rules', () => {
  it('no string in the content breaks a copy rule', () => {
    const bad = collectStrings({ rooms, site })
      .map((s) => [s, forbiddenCopy(s)] as const)
      .filter(([, reason]) => reason !== null);
    expect(bad).toEqual([]);
  });
});

describe.skipIf(!process.env.RELEASE_CHECK)('release gate', () => {
  it('has the CV, no placeholder screens, an https site url and a LinkedIn', () => {
    expect(fs.existsSync(path.join('public', site.contact.cvHref))).toBe(true);
    expect(rooms.flatMap((r) => r.stops.flatMap((s) => s.screens)).filter((s) => s.kind === 'placeholder')).toEqual([]);
    expect(process.env.NEXT_PUBLIC_SITE_URL ?? '').toMatch(/^https:\/\//);
    expect(site.contact.linkedin).not.toBeNull();
  });
});
