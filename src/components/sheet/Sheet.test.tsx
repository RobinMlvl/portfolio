import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sheet } from '@/components/sheet/Sheet';
import { site } from '@/content/site';

describe('Sheet', () => {
  it('renders contact with mailto, CV and GitHub, and no LinkedIn when null', () => {
    render(<Sheet mode="static" />);
    expect(screen.getByRole('link', { name: site.contact.email })).toHaveAttribute('href', `mailto:${site.contact.email}`);
    expect(screen.getByRole('link', { name: /Download CV/ })).toHaveAttribute('href', site.contact.cvHref);
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', site.contact.github);
    expect(screen.queryByRole('link', { name: /LinkedIn/ })).toBeNull();
  });
  it('names every section with an h2', () => {
    render(<Sheet mode="static" />);
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([site.also.kicker, site.contact.kicker]);
  });
});
