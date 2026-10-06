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
    name: 'Robin Malaval',
    sub: {
      lead: 'I build software end to end, then I run it. Five products, one pair of hands, from the first commit to the server bill. ',
      emphasis: "I made this site because a CV can't show how things hold under load",
      tail: '.',
    },
    cta: 'See the work',
  },
  // Sources: spec §5.6 (Algoritmi: EN/JA/zh-TW, call staff on SSE + WebRTC, private code),
  // facts-drinxlab.md (2026-09-17) and the ESP32 firmware at ~/Documents/PlatformIO/Projects/Drinxlab (src/main.cpp).
  sideProjects: {
    title: 'Side projects',
    items: [
      {
        name: 'Algoritmi',
        year: '2026',
        kind: 'volunteer',
        url: 'https://algoritmigroup.com',
        line: 'The "call staff" flow of a guest portal for hostels with no front desk in Takayama, on WebRTC and server-sent events.',
        tags: ['WebRTC', 'SSE', '3 languages'],
        picture: { kind: 'flow', steps: ['phone', 'SSE', 'desk'] },
      },
      {
        name: 'Drinxlab',
        year: '2023 to 2024',
        kind: 'prototype',
        url: null,
        line: 'A cocktail machine: printed housing, eight pumps, an ESP32 in C++ and an app mapping pumps to recipes.',
        tags: ['ESP32', 'C++', 'Station F'],
        picture: { kind: 'image', src: '/screens/side/drinxlab.webp', width: 960, height: 540 },
      },
    ],
  },
  contact: {
    title: 'Open to a full-stack role',
    email: 'malaval.robin@hotmail.fr',
    languages: 'French (native), English (fluent), Spanish (conversational)',
    cvHref: '/Robin_Malaval_CV.pdf',
    github: 'https://github.com/RobinMlvl',
  },
};
