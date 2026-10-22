import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Download, Mail, Terminal } from 'lucide-react';
import { CHALLENGE_MAILTO, candidate, mailto } from '../config/candidate';
import { useMotion } from '../hooks/useMotion';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { Button } from './Button';
import { ProjectCard } from './ProjectCard';

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'projects', label: 'Projects' },
  { id: 'challenge', label: 'Contact' },
] as const;

const goTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function SectionHead({ n, title, kicker }: { n: string; title: string; kicker?: string }) {
  return (
    <header className="mb-10 sm:mb-14" data-reveal>
      <p className="eyebrow mb-3">
        <span className="text-accent">{n}</span> — {kicker ?? title}
      </p>
      <h2 className="display text-[clamp(2.4rem,7vw,5.5rem)]">{title}</h2>
    </header>
  );
}

export function RecruiterMode({ onOpenTerminal }: { onOpenTerminal: () => void }) {
  const { reduced } = useMotion();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>('profile');

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      // active-section tracking (state, not motion)
      SECTIONS.forEach(({ id }) => {
        ScrollTrigger.create({
          trigger: `#${id}`,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(id),
        });
      });
      if (reduced) return;

      gsap.from('[data-hero-char]', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.04, delay: 0.1 });
      gsap.from('[data-hero-fade]', { autoAlpha: 0, y: 18, duration: 0.7, ease: 'power2.out', stagger: 0.09, delay: 0.45 });
      gsap.to('[data-parallax]', {
        yPercent: -14,
        ease: 'none',
        scrollTrigger: { trigger: '#profile', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('[data-marquee]', {
        xPercent: -30,
        ease: 'none',
        scrollTrigger: { trigger: '[data-marquee-wrap]', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((node) => {
        gsap.from(node, {
          autoAlpha: 0,
          y: 36,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: node, start: 'top 88%', once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
        gsap.from(group.children, {
          autoAlpha: 0,
          y: 22,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.07,
          scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        });
      });
      gsap.to('[data-progress]', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.2 },
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  /* always start a freshly opened CV at the top */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const letters = (w: string) =>
    w.split('').map((c, i) => (
      <span key={i} data-hero-char className="inline-block">
        {c}
      </span>
    ));

  return (
    <div ref={root} className="relative z-10" data-testid="recruiter-mode">
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-0.5 origin-left scale-x-0 bg-accent" data-progress style={reduced ? { display: 'none' } : undefined} />

      {/* side index */}
      <nav aria-label="Sections" className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 xl:block 2xl:left-8">
        <ul className="space-y-3">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={goTo(s.id)}
                aria-current={active === s.id ? 'true' : undefined}
                className={`group flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${active === s.id ? 'text-accent' : 'text-muted hover:text-ink'}`}
              >
                <span className={`h-px transition-all ${active === s.id ? 'w-8 bg-accent' : 'w-4 bg-current'}`} />
                <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 data-[on=true]:opacity-100" data-on={active === s.id}>
                  {String(i + 1).padStart(2, '0')} {s.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-[1200px] px-5 sm:px-10">
        {/* ───────── 01 profile ───────── */}
        <section id="profile" className="scroll-mt-24 pb-16 pt-10 sm:pt-20">
          <p data-hero-fade className="eyebrow mb-6">
            Candidate profile · {candidate.location} · open to junior roles
          </p>
          <h1 data-parallax className="display text-[clamp(4.2rem,19vw,16rem)]" aria-label={candidate.name}>
            <span aria-hidden>
              <span className="block overflow-hidden pb-[0.06em]">{letters('Noa')}</span>
              <span className="outline-text block overflow-hidden pb-[0.06em] text-accent" style={{ WebkitTextStroke: '2px var(--color-accent)' }}>
                {letters('Rezzik')}
              </span>
            </span>
          </h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <p data-hero-fade className="text-2xl font-medium leading-snug sm:text-4xl">
                {candidate.tagline}
              </p>
              <p data-hero-fade className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                {candidate.summary}
              </p>
              <div data-hero-fade className="mt-8 flex flex-wrap gap-3">
                <Button variant="primary" size="lg" href={candidate.resume.url} download={candidate.resume.downloadName}>
                  <Download size={18} aria-hidden /> Download CV
                </Button>
                <Button size="lg" href={mailto('Hello Noa')}>
                  <Mail size={18} aria-hidden /> {candidate.email}
                </Button>
              </div>
            </div>

            <dl data-hero-fade className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border hairline bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-1">
              {candidate.glance.map((g) => (
                <div key={g.label} className="bg-surface/80 p-4 backdrop-blur">
                  <dt className="eyebrow">{g.label}</dt>
                  <dd className="mt-1 text-base font-medium">{g.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div data-hero-fade className="mt-10 flex flex-wrap gap-2" aria-label="Target roles">
            {candidate.targetRoles.map((r) => (
              <span key={r} className="rounded-full border border-white/15 px-3 py-1.5 font-mono text-xs text-ink/90">
                {r}
              </span>
            ))}
          </div>

          <a
            href="#challenge"
            onClick={goTo('challenge')}
            data-hero-fade
            className="group mt-12 flex items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/[0.06] px-5 py-4 transition-colors hover:bg-accent/[0.12] sm:px-7"
          >
            <span>
              <span className="eyebrow block text-accent">Open invitation</span>
              <span className="mt-1 block text-lg font-semibold sm:text-2xl">Give me a technical challenge.</span>
            </span>
            <ArrowDown className="shrink-0 text-accent transition-transform group-hover:translate-y-1" aria-hidden />
          </a>
        </section>
      </div>

      {/* marquee band (scroll-scrubbed) */}
      <div data-marquee-wrap aria-hidden className="overflow-hidden border-y hairline py-5">
        <div data-marquee className="display flex w-max gap-10 whitespace-nowrap text-[clamp(2rem,6vw,4.5rem)] text-transparent [-webkit-text-stroke:1px_rgba(244,244,240,0.35)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i}>LINUX · NETWORKS · RECON · SCRIPTING · CTF · CURIOSITY ·</span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 sm:px-10">
        {/* ───────── 02 skills ───────── */}
        <section id="skills" className="scroll-mt-24 py-20 sm:py-32">
          <SectionHead n="02" title="Skills" kicker="What I work with" />
          <div className="divide-y divide-white/[0.08] border-y hairline" data-stagger>
            {candidate.skills.map((s) => (
              <div key={s.slug} className="grid gap-3 py-6 sm:grid-cols-[240px_1fr] sm:gap-10 sm:py-8">
                <h3 className="eyebrow pt-2">{s.group}</h3>
                <div>
                  <p className="text-2xl font-semibold leading-tight sm:text-4xl">
                    {s.items.map((it, i) => (
                      <span key={it}>
                        {it}
                        {i < s.items.length - 1 && <span className="px-2 text-accent sm:px-3">/</span>}
                      </span>
                    ))}
                  </p>
                  {s.note && <p className="mt-2 text-sm text-muted">{s.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── 03 experience ───────── */}
        <section id="experience" className="scroll-mt-24 py-12 sm:py-20">
          <SectionHead n="03" title="Experience" kicker="The honest version" />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div data-reveal>
              <p className="text-3xl font-semibold leading-tight sm:text-5xl">
                No professional cybersecurity experience yet.
                <span className="text-accent"> Still building.</span>
              </p>
              <p className="mt-6 max-w-xl text-lg text-muted">
                What I have is practice: hands-on investigation, documented, in authorized environments — and the
                habit of finishing what I start.
              </p>
              {candidate.experience.map((e) => (
                <div key={e.role + e.org} className="mt-6 border-t hairline pt-4">
                  <p className="font-semibold">{e.role} · {e.org}</p>
                  <p className="text-sm text-muted">{e.period}</p>
                </div>
              ))}
            </div>
            <ol className="space-y-px overflow-hidden rounded-2xl border hairline bg-white/[0.06]" data-stagger aria-label="Hands-on practice">
              {candidate.practice.map((p, i) => (
                <li key={p} className="flex gap-4 bg-surface/80 p-5 backdrop-blur">
                  <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ───────── 04 education ───────── */}
        <section id="education" className="scroll-mt-24 py-12 sm:py-20">
          <SectionHead n="04" title="Education" />
          {candidate.education.map((e) => (
            <div key={e.degree} data-reveal className="grid gap-4 border-y hairline py-8 sm:grid-cols-[240px_1fr] sm:gap-10">
              <p className="eyebrow pt-2">{e.period}</p>
              <div>
                <h3 className="text-2xl font-semibold leading-tight sm:text-4xl">{e.degree}</h3>
                <p className="mt-2 text-lg text-muted">
                  {e.school} · {e.location}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ───────── 05 projects ───────── */}
        <section id="projects" className="scroll-mt-24 py-20 sm:py-32">
          <SectionHead n="05" title="Projects" kicker="Verified work only" />
          <p data-reveal className="-mt-6 mb-10 max-w-2xl text-muted">
            Every entry below describes real activity. Nothing is invented; where a public link doesn't exist, the card
            says so. Happy to walk through any of it live.
          </p>
          <div className="space-y-8 sm:space-y-12">
            {candidate.projects.map((p, i) => (
              <div key={p.id} data-reveal>
                <ProjectCard project={p} index={i} variant="editorial" />
              </div>
            ))}
          </div>
        </section>

        {/* ───────── 06 challenge / contact ───────── */}
        <section id="challenge" className="scroll-mt-24 pb-24 pt-8 sm:pb-36">
          <div data-reveal className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-14">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
            <p className="eyebrow mb-4 text-accent">06 — Let's talk</p>
            <h2 className="display text-[clamp(2.6rem,9vw,7.5rem)]">
              Give me a<br />
              <span className="text-accent">technical challenge.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg text-muted">
              A take-home, a lab, a log to read, a box to enumerate. Send one and watch how I think — that is the
              fastest way to find out what I can do.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" href={CHALLENGE_MAILTO}>
                <Mail size={18} aria-hidden /> Send a challenge
              </Button>
              <Button size="lg" href={candidate.resume.url} download={candidate.resume.downloadName}>
                <Download size={18} aria-hidden /> Download CV
              </Button>
              <Button size="lg" onClick={onOpenTerminal}>
                <Terminal size={18} aria-hidden /> Try the mini-CTF
              </Button>
            </div>
            <p className="mt-8 font-mono text-sm text-muted">
              <a href={`mailto:${candidate.email}`} className="text-accent hover:underline">
                {candidate.email}
              </a>{' '}
              · {candidate.location}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
