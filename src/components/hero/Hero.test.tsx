import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Hero } from '@/components/hero/Hero';
import { site } from '@/content/site';
import { heroCopyOf } from '@/content/schema';
import { repos } from '@/content/commits';

const copy = heroCopyOf(site);

/** a request that never answers: the tests read what renders before the history arrives */
const serve = () => { const fetch = vi.fn<(url: string) => Promise<Response>>(() => new Promise(() => {})); vi.stubGlobal('fetch', fetch); return fetch; };

afterEach(() => vi.unstubAllGlobals());

describe('Hero', () => {
  it('renders the name, the paragraph and the way to the work', () => {
    serve();
    render(<Hero copy={copy} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Robin Malaval');
    expect(screen.getByText(/I made this site because a CV can't show how things hold under load/)).toBeInTheDocument();
    expect(screen.getByText(copy.kickerNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See the work/ })).toHaveAttribute('href', '#work');
  });

  it('describes the combined history in words and offers to keep one product', () => {
    serve();
    render(<Hero copy={copy} />);
    const total = repos.reduce((n, r) => n + r.total, 0).toLocaleString('en-US');
    expect(screen.getByText(new RegExp(`Commit history of ${repos.map((r) => r.name).join(', ').replace('.', '\\.')}: ${total} commits`))).toBeInTheDocument();
    const products = screen.getByRole('group', { name: 'Products in the history' });
    expect(within(products).getAllByRole('button').map((b) => b.textContent)).toEqual(repos.map((r) => r.name));
  });

  it('keeps one product of the legend alone, and releases it', () => {
    serve();
    render(<Hero copy={copy} />);
    const os = screen.getByRole('button', { name: 'Dewex OS' });
    fireEvent.click(os);
    expect(os).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(os);
    expect(os).toHaveAttribute('aria-pressed', 'false');
  });
});
