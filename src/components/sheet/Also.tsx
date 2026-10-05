import { site } from '@/content/site';

export function Also() {
  const a = site.also;
  return (
    <section id="also" aria-labelledby="also-title" className="px-10 pb-[8vh] pt-[14vh] max-md:px-5">
      <h2 id="also-title" className="display text-[clamp(40px,4.2vw,64px)]">{a.kicker}</h2>
      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {a.items.map((it) => (
          <li key={it.name} className="rounded-[16px] border border-line bg-surface px-7 py-6">
            <h3 className="text-[24px] font-semibold tracking-[-0.03em]">{it.url ? <a href={it.url} target="_blank" rel="noreferrer" className="hover:underline hover:underline-offset-4">{it.name}</a> : it.name}</h3>
            <p className="kicker mt-0.5 text-muted">{it.year}</p>
            <p className="mt-3 text-[15px] leading-[1.55] text-fg-2">{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
