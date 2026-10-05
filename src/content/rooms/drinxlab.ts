import type { Room } from '@/content/schema';

// Sources: facts-drinxlab.md (extracted 2026-09-17 from the DrinkxLab folder), the ESP32 firmware at
// ~/Documents/PlatformIO/Projects/Drinxlab (platformio.ini + src/main.cpp, 2024-02), spec §5.4 (stops proposed, to confirm with Robin).
export const drinxlab: Room = {
  slug: 'drinxlab',
  index: 4,
  name: 'Drinxlab',
  status: 'prototype',
  logo: { src: '/logos/drinxlab-light.png', alt: 'Drinxlab', height: 72, ratio: 3.249 },
  kicker: 'Hardware prototype, 2023 to 2024',
  oneLiner:
    'A cocktail machine: 3D-printed body, standard bottles as reservoirs, ESP32 firmware in C++, an app that maps eight pumps to recipes.',
  metrics: [
    { value: '8', label: 'pumps', source: 'facts-drinxlab.md §3 (pump housing, 8 mount points; app parameter.js)' },
    { value: 'C++', label: 'PlatformIO, ESP32', source: '~/Documents/PlatformIO/Projects/Drinxlab/platformio.ini, src/main.cpp (2024-02)' },
    { value: '1', label: 'working prototype', source: 'facts-drinxlab.md §3 (Design/Photo/IMG_3859.jpeg)' },
  ],
  stops: [
    {
      key: 'machine',
      label: 'The machine',
      title: 'Built, wired, poured.',
      body:
        "A countertop dispenser with a printed housing, pumps on top, lit tubing down to the glass. Standard bottles sit in as reservoirs, no proprietary pods. Pitched through Station F's Launch programme; the crowdfunding campaign was designed but never launched.",
      screens: [{ kind: 'placeholder', key: 'photo', label: 'Prototype photo', owner: 'me' }],
    },
    {
      key: 'app',
      label: 'The app',
      title: 'Tell the software which bottle sits where.',
      body:
        'The same eight-slot schematic that numbers the physical pumps is the setup screen: tap a slot, pick an ingredient. A recipe only becomes pourable when every ingredient it needs is mapped, and the strength slider sets the volume per pump.',
      screens: [{ kind: 'placeholder', key: 'pumps', label: 'Pump mapping screen', owner: 'me' }],
    },
    {
      key: 'firmware',
      label: 'The firmware',
      title: '161 lines of C++ between the app and the pumps.',
      body:
        'An ESP32 that provisions WiFi through a captive portal, opens a TLS WebSocket to the server, and executes a small JSON command protocol: pinMode, digitalWrite, digitalRead, with an error message back for anything it does not understand.',
      screens: [{ kind: 'placeholder', key: 'code', label: 'main.cpp excerpt', owner: 'me' }],
    },
  ],
};
