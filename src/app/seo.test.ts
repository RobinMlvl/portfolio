// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('seo', () => {
  it('robots allows everything and points to the sitemap', () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(String(r.sitemap)).toMatch(/\/sitemap\.xml$/);
  });
  it('sitemap has the single page', () => {
    const s = sitemap();
    expect(s).toHaveLength(1);
    expect(s[0].url).toMatch(/^https?:\/\//);
  });
});

describe('SITE_URL', () => {
  it('falls back to the Vercel production URL when NEXT_PUBLIC_SITE_URL is unset', async () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'example.vercel.app');
    vi.resetModules();
    const { SITE_URL } = await import('@/lib/siteUrl');
    expect(SITE_URL).toBe('https://example.vercel.app');
    vi.unstubAllEnvs();
  });
});
