import type { Site } from '@/content/schema';

// Hero copy: Robin, 2026-09-17, made generalist on 2026-10-04 (no addressee, no location). The hero's numbers are the commits themselves (src/content/commits.ts).
export const site: Site = {
  nav: {
    openToWork: 'Open to work',
    name: 'Robin Malaval',
    links: [
      { label: 'Work', href: '#work' },
      { label: 'Contact', href: '#contact' },
      { label: 'CV', href: '/Robin_Malaval_CV.pdf' },
    ],
  },
  hero: {
    kicker: 'Full-stack engineer',
    kickerNote: 'Next.js, Node, PostgreSQL, Stripe',
    name: ['Robin', 'Malaval'],
    sub: {
      lead: 'I build software end to end, then I run it. Five products, one pair of hands, from the first commit to the server bill. ',
      emphasis: "I made this site because a CV can't show how things hold under load",
      tail: '.',
    },
    cta: 'See the work',
  },
  also: {
    kicker: 'Also',
    items: [
      {
        name: 'Algoritmi',
        year: '2026, volunteer',
        url: 'https://algoritmigroup.com',
        body:
          'Guest portal in three languages for hostels with no front desk in Takayama, Japan. I built the "call staff" flow: the guest rings from a phone, reception picks up, a real-time layer on server-sent events and WebRTC carries the call. Private code, no screenshots.',
      },
      {
        // Sources: facts-drinxlab.md (2026-09-17), the ESP32 firmware at ~/Documents/PlatformIO/Projects/Drinxlab (src/main.cpp, 161 lines)
        name: 'Drinxlab',
        year: '2023 to 2024, prototype',
        url: null,
        body:
          'A cocktail machine I designed and built: a printed housing, standard bottles as reservoirs, eight pumps, an ESP32 running 161 lines of C++ over a TLS WebSocket, and an app that maps every pump to a recipe. Pitched through Station F\'s Launch programme.',
      },
      {
        name: 'Nicolas Vivaudou',
        year: '2025',
        url: 'https://nicolasvivaudou.com',
        body:
          'Bilingual portfolio for a Montreal drone photographer: galleries, light and dark theme, and an admin area behind a JWT session so he manages his own images and inbox. No CMS, no framework beyond Next.js.',
      },
    ],
  },
  contact: {
    kicker: 'Contact',
    email: 'malaval.robin@hotmail.fr',
    phone: '+33 6 13 03 85 19',
    languages: 'French (native), English (fluent), Spanish (conversational)',
    cvHref: '/Robin_Malaval_CV.pdf',
    github: 'https://github.com/RobinMlvl',
    linkedin: null,
    portraitAlt: 'Portrait of Robin Malaval',
  },
};
