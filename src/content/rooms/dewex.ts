import { repoOf } from '@/content/commits';
import { periodOf } from '@/lib/commits';
import type { Room } from '@/content/schema';

const history = repoOf('dewex');

// Sources: portfolio-brief-dewex.md (answered from the dewex-app repository on 2026-09-17, main@5f81294f),
// sections referenced as "brief §X". Every command quoted there was run on that date.
// One film shows the product (the only screen); the four stops keep their text for the plain page.
export const dewex: Room = {
  slug: 'dewex',
  index: 1,
  name: 'Dewex',
  status: 'live',
  logo: { src: '/logos/dewex.svg', alt: 'Dewex', height: 60, ratio: 5.01 },
  kicker: 'Booking SaaS, in production since July 2026',
  oneLiner:
    "A booking website for every outdoor activity operator: their brand, their calendar, their Stripe account. One Next.js app runs all of them.",
  role: 'Solo: product, code, ops',
  period: periodOf(history),
  stack: ['Next.js', 'PostgreSQL', 'Stripe Connect', 'BullMQ'],
  url: 'https://dewex.io',
  metrics: [
    { value: history.total.toLocaleString('en-US'), label: `commits in ${history.days} days`, source: `git log main, ${history.first} to ${history.last} (src/content/commits.ts, generated ${history.generated})` },
    { value: '8,547', label: 'tests, Postgres in CI', source: 'brief §B: npx vitest run → Tests 8547 passed (782 files); 38 integration suites on PostgreSQL 17 + PostgREST in ci.yml' },
    { value: '100', label: 'SQL migrations', source: 'brief §B: ls migrations/*.sql | wc -l → 100; 86 distinct create function statements, 24 triggers' },
  ],
  stops: [
    {
      key: 'site',
      label: 'dewex.io',
      title: 'Sell on your own website.',
      body:
        'The front door. An operator signs in at app.dewex.io with Google or a magic link, gets a site from the Default template, adds activities by hand, from a description or from a URL, and connects a Stripe account. The site is live at {slug}.dewex.io or on a custom domain with HTTPS issued on demand.',
      screens: [
        {
          kind: 'video',
          key: 'overview',
          src: '/screens/dewex/overview.mp4',
          poster: '/screens/dewex/overview-poster.webp',
          alt: 'Product film, 46 seconds: an operator edits their site in Studio, it switches to Spanish among 21 languages, a guest books and pays, the booking lands in the back office with a notification and the day planning',
          caption: 'Dewex in 46 seconds: build the site, sell, run the day',
          width: 1600,
          height: 900,
        },
      ],
    },
    {
      key: 'studio',
      label: 'Studio',
      title: 'A website builder, no code.',
      body:
        "Every tenant site is a validated JSON document rendered by 75 section components in 18 families; the LLM never writes HTML. Studio edits it section by section with a desktop and a phone preview. Saves are versioned, a conflict is a recoverable state, and the translation worker's writes are rebased silently because it is the only other writer. Content is translated asynchronously into 20 other locales, never on the request path.",
      metrics: [
        { value: '75', label: 'section components', source: 'brief §B: find components/site/sections -name *.jsx → 75' },
        { value: '18', label: 'section families', source: 'brief §B: ls lib/site/catalogue/families → 18' },
        { value: '21', label: 'site locales', source: 'brief §B: lib/schemas/primitives.mjs LOCALES (en fr es de it pt nl zh ja ko pl ru sv da no fi cs hu ro el tr)' },
      ],
      screens: [],
    },
    {
      key: 'client',
      label: 'Client site',
      title: 'Their site, native booking.',
      body:
        "The site Studio builds, with the booking engine inside it: a calendar of open departures, a seat hold, the Stripe payment element. hold_seats is one guarded UPDATE on the departure row; the second traveler on the last seat waits on the row lock, re-evaluates and gets a clean sold_out. The payment is a direct charge on the operator's Stripe account, the commission snapshotted in integer cents when the intent is created.",
      metrics: [
        { value: '2→1', label: 'concurrent holds, last seat', source: 'brief §C1: lib/booking/holds.integration.test.js:32, direct PostgreSQL sessions' },
        { value: '15 min', label: 'hold TTL, swept every 60 s', source: 'brief §C1: lib/booking/constants.mjs HOLD_TTL_MINUTES = 15; sweep in workers/index.mjs' },
        { value: '6%', label: 'Starter fee, none from Pro', source: 'brief §C2: lib/billing/plans.mjs starter: 600 bps; Pro and Premium carry no application_fee_amount' },
      ],
      screens: [],
    },
    {
      key: 'backoffice',
      label: 'Back office',
      title: 'One place to run the business.',
      body:
        'Departures calendar with capacity per slot, bookings, customers, payment status driven by Stripe webhooks: events claimed by id with a takeover window, status transitions compare-and-swap. Bilingual, phone-first, every query scoped by tenant, row level security on all 48 tables with zero browser-facing policies. Deployed on one VPS behind a health-gated deploy that fails loudly; rollback adds one commit.',
      metrics: [
        { value: '48', label: 'tables, all under RLS', source: 'brief §B: 48 create table, 48 enable row level security, 0 policies (deny-by-default), 238 GRANT/REVOKE' },
        { value: '16', label: 'Stripe event types handled', source: 'brief §B: 8 platform + 8 Connect event types across the two webhook routes' },
        { value: '1', label: 'commit to roll back', source: 'brief §C3: rollback.yml, scripts/deploy/rollback-commit.sh' },
      ],
      screens: [],
    },
  ],
};
