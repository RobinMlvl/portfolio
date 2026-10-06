import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ok = { ok: true, json: async () => ({ total: 1 }) } as Response;

describe('loadHistory', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('fetches every commit once, whoever asks', async () => {
    const fetch = vi.fn(async () => ok);
    vi.stubGlobal('fetch', fetch);
    const { loadHistory } = await import('@/lib/history');
    const [a, b] = await Promise.all([loadHistory(), loadHistory()]);
    expect(a).toBe(b);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/commits/all.json');
  });

  it('forgets a failed request so the next caller tries again', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 } as Response).mockResolvedValueOnce(ok);
    vi.stubGlobal('fetch', fetch);
    const { loadHistory } = await import('@/lib/history');
    await expect(loadHistory()).rejects.toThrow('503');
    await expect(loadHistory()).resolves.toEqual({ total: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
