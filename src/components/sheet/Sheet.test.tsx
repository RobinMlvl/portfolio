import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Sheet } from '@/components/sheet/Sheet';
import { site } from '@/content/site';

describe('Sheet', () => {
  // the closing waveform asks for the commit history; the request never answers here
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {}))));
  afterEach(() => vi.unstubAllGlobals());

  it('lists every side project with its stack, and links it only when it is online', () => {
    render(<Sheet mode="static" />);
    for (const p of site.sideProjects.items) {
      const row = screen.getByRole('heading', { level: 3, name: p.name }).closest('li');
      if (!row) throw new Error(`expected a row for ${p.name}`);
      const stack = within(row).getByRole('list', { name: 'Stack' });
      expect(within(stack).getAllByRole('listitem').map((li) => li.textContent)).toEqual(p.tags);
      expect(within(row).queryAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(p.url ? [p.url] : []);
    }
    expect(screen.getByRole('link', { name: 'algoritmigroup.com' })).toHaveAttribute('href', 'https://algoritmigroup.com');
  });
  it('ends on the contact: mailto, CV, GitHub and copy, no LinkedIn', () => {
    render(<Sheet mode="static" />);
    expect(screen.getByRole('link', { name: site.contact.email })).toHaveAttribute('href', `mailto:${site.contact.email}`);
    expect(screen.getByRole('link', { name: 'Download CV' })).toHaveAttribute('href', site.contact.cvHref);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', site.contact.github);
    expect(screen.getByRole('button', { name: 'Copy email' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /LinkedIn/ })).toBeNull();
  });
  it('names every section with an h2', () => {
    render(<Sheet mode="static" />);
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([site.sideProjects.title, site.contact.title]);
  });
});
