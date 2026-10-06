import { site } from '@/content/site';
import { ClosingWave } from './ClosingWave';
import { CopyEmail } from './CopyEmail';

/** On a phone each action is a full-width row. */
const ROW = 'max-sm:flex max-sm:w-full max-sm:items-center max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:px-4 max-sm:py-3.5';
const LINK = 'kicker text-[14px] text-fg-2 transition-colors hover:text-fg max-sm:text-fg';

/** The end of the site: what Robin is looking for, how to reach him, and the commits up to now. */
export function Contact() {
  const c = site.contact;
  const at = c.email.indexOf('@');
  return (
    <footer id="contact" aria-labelledby="contact-title" className="px-10 pb-8 pt-20 max-md:px-5 max-md:pt-14">
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[1fr_1.05fr] lg:items-end">
        <div>
          <h2 id="contact-title" className="kicker flex items-center gap-2.5 text-[13px] text-fg"><span aria-hidden className="dot" />{c.title}</h2>
          {/* on a phone the address breaks before the @, never inside a word */}
          <a href={`mailto:${c.email}`} aria-label={c.email} className="display mt-4 block w-fit text-[10.5vw] hover:underline hover:decoration-[3px] hover:underline-offset-8 sm:whitespace-nowrap sm:text-[min(6.4vw,56px)] lg:text-[clamp(34px,3.4vw,60px)]">
            {c.email.slice(0, at)}<span className="max-sm:block max-sm:pt-1 max-sm:text-[7vw] max-sm:text-fg-2">{c.email.slice(at)}</span>
          </a>
          <ul className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 max-sm:grid max-sm:gap-2">
            <li><a href={c.cvHref} className={`play text-[14px] ${ROW} max-sm:border-fg max-sm:bg-fg max-sm:text-bg`}>Download CV<span aria-hidden className="ml-auto sm:hidden">↓</span></a></li>
            <li><a href={c.github} target="_blank" rel="noreferrer" className={`${LINK} ${ROW} inline-flex gap-1.5`}>GitHub<span aria-hidden className="max-sm:ml-auto">↗</span></a></li>
            <li><CopyEmail email={c.email} className={`${LINK} ${ROW}`} /></li>
          </ul>
          <p className="kicker mt-7 text-muted">{c.languages}</p>
        </div>
        <ClosingWave className="max-lg:order-first" />
      </div>
      <p className="kicker mt-14 text-muted">© 2026 Robin Malaval</p>
    </footer>
  );
}
