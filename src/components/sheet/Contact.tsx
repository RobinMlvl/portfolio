import { site } from '@/content/site';
import { CopyEmail } from './CopyEmail';

export function Contact() {
  const c = site.contact;
  return (
    <footer id="contact" aria-labelledby="contact-title" className="px-10 pb-10 pt-[8vh] max-md:px-5">
      <h2 id="contact-title" className="kicker text-fg-2">{c.kicker}</h2>
      <a href={`mailto:${c.email}`} className="display mt-3 inline-block break-all text-[clamp(34px,5.6vw,96px)] tracking-[-0.05em] hover:underline hover:decoration-[3px] hover:underline-offset-8">{c.email}</a>
      <p className="mt-4 text-[15px] text-fg-2">{c.phone}</p>
      <ul className="mt-8 flex flex-wrap gap-3">
        <li><a href={c.cvHref} className="pill-ink text-[15px]"><span className="dot" />Download CV</a></li>
        <li><a href={c.github} target="_blank" rel="noreferrer" className="pill px-5 py-3 text-[15px] font-semibold">GitHub</a></li>
        {c.linkedin ? <li><a href={c.linkedin} target="_blank" rel="noreferrer" className="pill px-5 py-3 text-[15px] font-semibold">LinkedIn</a></li> : null}
        <li><CopyEmail email={c.email} /></li>
      </ul>
      <ul className="mt-16 flex flex-wrap justify-between gap-4 kicker text-muted">
        <li>{c.languages}</li><li>© 2026 Robin Malaval</li>
      </ul>
    </footer>
  );
}
