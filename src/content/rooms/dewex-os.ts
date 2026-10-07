import { repoOf } from '@/content/commits';
import type { Room } from '@/content/schema';
import { periodOf } from '@/lib/commits';

const history = repoOf('dewex-os');

// Sources: facts-dewex-os.md (extracted 2026-09-17 from the dewex-os repo), spec §5.2 (stops proposed, to confirm with Robin).
// One film shows the product (Robin's cut, 2026-10-07: the web picture with the full cut's sound; the leads in it are fictional, on .example domains);
// the other stops keep their text for the plain page.
export const dewexOs: Room = {
  slug: 'dewex-os',
  index: 2,
  name: 'Dewex OS',
  status: 'internal',
  logo: { src: '/logos/dewex.svg', alt: 'Dewex', height: 52, ratio: 5.01, suffix: 'OS' },
  kicker: 'Internal platform, 2026',
  oneLiner:
    'The machine that runs the company: lead analysis, human QA, AI demo factory, outreach, finance. 13 BullMQ queues, 9 supervised LLM agents.',
  role: 'Solo, for my own company',
  period: periodOf(history),
  stack: ['Next.js', 'BullMQ', 'Redis', 'OpenAI'],
  url: null,
  metrics: [
    { value: '3,438', label: 'tests green', source: 'facts-dewex-os.md §8 (AGENTS.md:245, latest commit gate line)' },
    { value: '49', label: 'migrations, each tested', source: 'facts-dewex-os.md §8 (49 migrations, 49 paired test files)' },
    { value: '$4.38', label: 'busiest LLM day', source: 'facts-dewex-os.md §10 (2026-09-05, 766 paid calls)' },
  ],
  stops: [
    {
      key: 'workspace',
      label: 'Workspace',
      title: 'Thirteen desks, nine heads.',
      body:
        'One worker process runs every queue; each LLM agent is a row in a registry, not a process. Concurrency per queue is measured, not guessed. A graceful SIGTERM handler and a stall budget mean a deploy no longer kills a job mid-flight.',
      metrics: [
        { value: '13', label: 'BullMQ queues', source: 'facts-dewex-os.md §4 (lib/queue.mjs)' },
        { value: '9', label: 'LLM agents in the registry', source: 'facts-dewex-os.md §7 (AGENT_REGISTRY)' },
      ],
      screens: [
        {
          kind: 'video',
          key: 'overview',
          src: '/screens/dewex-os/overview.mp4',
          poster: '/screens/dewex-os/overview-poster.webp',
          alt: 'Product film, 58 seconds: the platform finds an outdoor operator with an outdated website, builds it a demo site, sends the outreach and flags the reply; it also writes the blog, tracks search rankings every week, and its agents scrape, analyse, build demos and send on autopilot',
          caption: 'Dewex OS in 58 seconds: prospecting, SEO and analytics in one OS',
          width: 1440,
          height: 810,
        },
      ],
    },
    {
      key: 'factory',
      label: 'Demo factory & QA',
      title: 'Nothing ships unreviewed.',
      body:
        'A demo site is never ready without an agent verdict or a human one at the same content hash. The prompt forbids inventing any fact the scraped page does not contain. The writer and its reviewer run on different models, because the same model on both sides is one opinion.',
      screens: [],
    },
    {
      key: 'ops',
      label: 'Money & ops',
      title: 'A circuit breaker, shipped in shadow mode.',
      body:
        'Two fuses on every paid call: a per-lead loop detector and a daily cap, calibrated on measured days and watched for two days before enforcement. Every deploy validates the environment and diffs each database insert against the live schema before building, then restarts only the processes whose files changed.',
      metrics: [
        { value: '150', label: 'calls per lead per day, fuse 1', source: 'facts-dewex-os.md §6d (callsPerProspect)' },
        { value: '$100', label: 'daily cap, fuse 2', source: 'facts-dewex-os.md §6d (dailyCapCents)' },
      ],
      screens: [],
    },
  ],
};
