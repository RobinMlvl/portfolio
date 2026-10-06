import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RoomsList } from '@/components/rooms/RoomsList';
import { rooms } from '@/content/rooms';

describe('RoomsList', () => {
  it('renders the four rooms in order with their logos', () => {
    render(<RoomsList rooms={rooms} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(4);
    expect(within(articles[0]).getByRole('img', { name: 'Dewex' })).toBeInTheDocument();
    expect(within(articles[1]).getByText('OS')).toBeInTheDocument();
    expect(within(articles[3]).getByRole('img', { name: 'riview.me' })).toBeInTheDocument();
  });
  it('renders the films with a player that never starts by itself, the capture of the Swiss site, and the screen still to come', () => {
    const { container } = render(<RoomsList rooms={rooms} />);
    const films = Array.from(container.querySelectorAll('video'));
    expect(films.map((f) => f.getAttribute('src'))).toEqual(['/screens/dewex/overview.mp4', '/screens/riview/overview.mp4']);
    for (const film of films) {
      expect(film).toHaveAttribute('controls');
      expect(film).not.toHaveAttribute('autoplay');
    }
    expect(screen.getByRole('img', { name: /Swiss Local Adventures home page/ })).toBeInTheDocument();
    expect(screen.getAllByText(/screen to come/i)).toHaveLength(1); // Dewex OS, until its film
  });
  it('reserves logo space from the real aspect ratio', () => {
    render(<RoomsList rooms={rooms} />);
    const swiss = screen.getByRole('img', { name: 'Swiss Local Adventures' });
    expect(swiss).toHaveAttribute('width', '148'); // 96 × 1.544, the trimmed light logo
    expect(swiss).toHaveAttribute('height', '96');
  });
  it('does not duplicate the room name in the heading accessible name', () => {
    render(<RoomsList rooms={rooms} />);
    const articles = screen.getAllByRole('article');
    const heading = within(articles[1]).getByRole('heading', { level: 2 });
    expect(heading).toHaveAccessibleName('Dewex OS');
    expect(heading.querySelector('.sr-only')).toBeNull();
  });
});
