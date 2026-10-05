import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '@/app/page';

describe('Page', () => {
  // the hero asks for its commit history; the request never answers here
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {}))));
  afterEach(() => vi.unstubAllGlobals());

  it('renders exactly one h1', () => {
    render(<Page />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders six h2 section headings: four rooms, Also, Contact', () => {
    render(<Page />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6);
  });

  it('never repeats an id attribute', () => {
    const { container } = render(<Page />);
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the nav landmark outside main', () => {
    const { container } = render(<Page />);
    const main = container.querySelector('main');
    if (!main) throw new Error('expected a <main> element');
    expect(main.querySelector('nav')).toBeNull();
  });
});
