import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommitHistory } from '@/components/hero/CommitHistory';

// its own file: the history is fetched once per page, so a failure must come first
afterEach(() => vi.unstubAllGlobals());

describe('CommitHistory', () => {
  it('says so when the history cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    render(<CommitHistory />);
    expect(await screen.findByText('The history could not be loaded.')).toBeInTheDocument();
  });
});
