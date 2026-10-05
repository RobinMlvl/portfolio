import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from '@/components/nav/Nav';
import { site } from '@/content/site';

describe('Nav', () => {
  it('shows "Open to work" in hero mode and the name in world mode', () => {
    const { rerender } = render(<Nav mode="hero" nav={site.nav} />);
    expect(screen.getByText('Open to work')).toBeInTheDocument();
    rerender(<Nav mode="world" nav={site.nav} />);
    expect(screen.getByText('Robin Malaval')).toBeInTheDocument();
  });

  it('renders the four links with their hrefs', () => {
    render(<Nav mode="hero" nav={site.nav} />);
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '#work');
    expect(screen.getByRole('link', { name: 'CV' })).toHaveAttribute('href', '/Robin_Malaval_CV.pdf');
  });

  it('shows no clock and no location', () => {
    const { container } = render(<Nav mode="hero" nav={site.nav} />);
    expect(container.textContent).not.toMatch(/Reykjav|\d{2}:\d{2}:\d{2}/);
  });
});
