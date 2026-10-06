import { repoOf } from '@/content/commits';
import type { Room } from '@/content/schema';
import { periodOf } from '@/lib/commits';

const history = repoOf('riview');

// Sources: facts-riview.md (extracted 2026-09-17 from the riviews repo), the repo's package.json.
// Back among the products on 2026-10-06, in the place of Drinxlab (which moved to Also).
export const riview: Room = {
  slug: 'riview',
  index: 4,
  name: 'riview.me',
  status: 'live',
  logo: { src: '/logos/riview-wide.png', alt: 'riview.me', height: 40, ratio: 7.557 },
  kicker: 'Restaurant review SaaS, live since 2025',
  oneLiner: 'Turns a QR scan at a restaurant table into a Google review or private feedback, gated by a sign-in and a reward wheel.',
  role: 'Solo: product, code, ops',
  period: periodOf(history),
  stack: ['Next.js', 'Prisma', 'Stripe', 'NextAuth'],
  url: 'https://riview.me',
  metrics: [
    { value: '3', label: 'Stripe plans', source: 'facts-riview.md §4 (PLAN_QUOTAS: freemium, starter, pro)' },
    { value: '10', label: 'poster templates', source: 'facts-riview.md §4 Architecture (public/Affiches, DesignQrcode.jsx)' },
    { value: history.total.toLocaleString('en-US'), label: 'commits, solo', source: `git log main, ${history.first} to ${history.last}, one author (src/content/commits.ts, generated ${history.generated})` },
  ],
  stops: [
    {
      key: 'landing',
      label: 'The landing',
      title: 'Three plans, one seven-day trial.',
      body:
        'Freemium, Starter, Pro, monthly or annual, with a card only when needed. Landing, pricing and the Stripe checkout all live in the same Next.js app.',
      screens: [
        {
          kind: 'image',
          key: 'home',
          src: '/screens/riview/home.webp',
          alt: 'riview.me home page: "Reward your customers, grow your visibility", a restaurant\'s QR code poster and three review cards',
          caption: 'riview.me: the landing, a QR code that turns into reviews',
          width: 1600,
          height: 900,
        },
      ],
    },
    {
      key: 'funnel',
      label: 'The funnel',
      title: 'Scan, rate, spin.',
      body:
        'A customer scans, signs in with Google or a magic link, rates the visit. At or above the threshold the venue set, the review goes to Google; below it, it stays private with a comment. Either way the venue gets a contact and the customer spins for a reward, redeemable once at the counter.',
      screens: [],
    },
    {
      key: 'venue',
      label: 'The venue',
      title: 'Quotas recomputed on every scan.',
      body:
        'No mutable counter that drifts from Stripe: on every scan the site counts the reviews since the current billing period start. Annual plans get a monthly anniversary computed on the fly.',
      screens: [],
    },
  ],
};
