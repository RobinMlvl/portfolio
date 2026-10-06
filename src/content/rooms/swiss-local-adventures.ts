import { repoOf } from '@/content/commits';
import type { Room } from '@/content/schema';
import { periodOf } from '@/lib/commits';

const history = repoOf('swiss-local-adventures');

// Sources: facts-swiss.md (extracted 2026-09-17 from the swisslocalaventures repo), spec §5.3 (stops proposed, to confirm with Robin).
// Marketing case-study figures (€981 saved, 18 bookings in 30 days) are deliberately NOT used here: unverified in the repo.
export const swissLocalAdventures: Room = {
  slug: 'swiss-local-adventures',
  index: 3,
  name: 'Swiss Local Adventures',
  status: 'live',
  logo: { src: '/logos/swiss-local-adventures-light.png', alt: 'Swiss Local Adventures', height: 96, ratio: 1.544 },
  kicker: 'Client platform, live since 2025',
  oneLiner: "Four-language booking site for a Swiss tour operator, with GetYourGuide's Supplier API implemented both ways.",
  role: 'Solo, for a client',
  period: periodOf(history),
  stack: ['Next.js', 'Supabase', 'Stripe', 'GetYourGuide API'],
  url: 'https://www.swisslocaladventures.ch',
  metrics: [
    { value: '4', label: 'locales', source: 'facts-swiss.md §3 (i18n/routing.js: en, fr, de, es)' },
    { value: '6', label: 'OTA endpoints', source: 'facts-swiss.md §5 (app/api/platforms/gyg/1/*)' },
    { value: history.total.toLocaleString('en-US'), label: 'commits, solo', source: `git log main, ${history.first} to ${history.last}, one author (src/content/commits.ts, generated ${history.generated})` },
  ],
  stops: [
    {
      key: 'site',
      label: 'The site',
      title: 'Sell direct, stay on the OTA.',
      body:
        'The operator used to sell only through GetYourGuide. Now the same tours sell on their own site in four languages, and still on the OTA, from one inventory.',
      screens: [
        {
          kind: 'image',
          key: 'home',
          src: '/screens/swiss-local-adventures/home.webp',
          alt: 'Swiss Local Adventures home page: "Explore Switzerland beyond the postcard" over a mountain lake, a Book Now button top right',
          caption: "swisslocaladventures.ch: the operator's own site, in four languages",
          width: 1600,
          height: 900,
        },
      ],
    },
    {
      key: 'booking',
      label: 'The booking',
      title: 'One availability, two storefronts.',
      body:
        'Calendar, time slot, participants, checkout. Availability is computed the same way for the website and for GetYourGuide: capacity minus confirmed bookings minus unexpired holds, bucketed in maps so a month view is one query, not one per day.',
      screens: [],
    },
    {
      key: 'ota',
      label: 'The OTA link',
      title: 'Built against their self-test tool.',
      body:
        'GetYourGuide calls six endpoints on the site: availabilities, pricing categories, a 60-minute reserve, an idempotent book, cancel booking, cancel reservation. After every change on either side the site pushes fresh availability back. Four product configurations, one code path, and the fixes it took to pass their self-test tool are in the commit history.',
      metrics: [
        { value: '60 min', label: 'reservation hold', source: 'facts-swiss.md §5 (reserve route, expiresAt)' },
        { value: '90 days', label: 'availability pushed ahead', source: 'facts-swiss.md §5 (notify-availability-update)' },
      ],
      screens: [],
    },
  ],
};
