import Image from 'next/image';
import { site } from '@/content/site';
import type { SideProject } from '@/content/schema';

/** The projects outside the products, as a journal: when, a picture, what and with what, where to see it. */
export function SideProjects() {
  const s = site.sideProjects;
  return (
    <section id="side-projects" aria-labelledby="side-projects-title" className="px-10 pt-28 max-md:px-5 max-md:pt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <h2 id="side-projects-title" className="display text-[clamp(30px,2.6vw,40px)]">{s.title}</h2>
        <p className="kicker text-muted">{s.items.length} more, outside the products</p>
      </div>
      <ul>
        {s.items.map((p) => <Row key={p.name} project={p} />)}
      </ul>
    </section>
  );
}

/** One line per project: on a large screen, four columns; below, the picture beside the rest. */
function Row({ project: p }: { project: SideProject }) {
  return (
    <li className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-b border-line py-5 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[112px_168px_minmax(0,1fr)_auto] lg:items-center lg:gap-x-8">
      <p className="kicker col-start-2 row-start-1 text-muted lg:col-start-1">
        {p.year}<span className="lg:hidden">, </span><span className="lg:block">{p.kind}</span>
      </p>
      <Picture picture={p.picture} />
      <div className="col-start-2 row-start-2 lg:col-start-3 lg:row-start-1">
        <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{p.name}</h3>
        <p className="mt-1 text-[14.5px] leading-[1.5] text-fg-2">{p.line}</p>
        <ul aria-label="Stack" className="mt-2.5 flex flex-wrap gap-1.5">
          {p.tags.map((t) => <li key={t} className="chip">{t}</li>)}
        </ul>
      </div>
      {p.url ? (
        <a href={p.url} target="_blank" rel="noreferrer" className="kicker col-start-2 row-start-3 mt-1 inline-flex items-center gap-1.5 justify-self-start whitespace-nowrap text-[13px] text-fg-2 hover:text-fg lg:col-start-4 lg:row-start-1 lg:mt-0">
          <span aria-hidden>↗</span><span className="text-fg">{new URL(p.url).host.replace(/^www\./, '')}</span>
        </a>
      ) : null}
    </li>
  );
}

/** A capture, or for private code a sketch of the flow, scaled to the width of the thumbnail. */
function Picture({ picture }: { picture: SideProject['picture'] }) {
  return (
    <div className="@container relative col-start-1 row-span-3 row-start-1 aspect-video self-start overflow-hidden rounded-md border border-line bg-surface lg:col-start-2 lg:row-span-1 lg:self-center">
      {picture.kind === 'image' ? (
        <Image src={picture.src} alt="" width={picture.width} height={picture.height} sizes="168px" className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden className="flex h-full items-center justify-center gap-[2.6cqw] bg-linear-to-br from-[#1A1C20] to-[#121316] font-mono text-[6.4cqw] text-fg-2">
          {picture.steps.map((s, i) => (
            <span key={s} className="contents">
              {i ? <span className="text-accent">→</span> : null}
              <span className="rounded-[1.6cqw] border border-[#2f3238] px-[2.4cqw] py-[1cqw] text-fg">{s}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
