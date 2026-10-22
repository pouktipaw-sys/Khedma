import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { candidate } from '../config/candidate';
import { useMotion } from '../hooks/useMotion';
import { gsap, typeTween } from '../lib/gsap';
import { Button } from './Button';

const BG_DONE = 'rgba(8,11,16,0.7)';
const BOOT = ['INITIALIZING ROOT ACCESS...', 'LOADING CANDIDATE PROFILE...', 'SYSTEM READY.'];

interface Props {
  onExplore: () => void;
  onCv: () => void;
}

/**
 * Cinematic boot sequence. Always skippable (button, Esc, Enter, or click);
 * the CV link is present from the first frame.
 */
export function Intro({ onExplore, onCv }: Props) {
  const { reduced } = useMotion();
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [lines, setLines] = useState<string[]>(reduced ? BOOT : ['', '', '']);
  const [done, setDone] = useState(reduced);

  const finish = useCallback(() => {
    tlRef.current?.kill();
    tlRef.current = null;
    if (root.current) gsap.set(root.current.querySelectorAll('[data-reveal]'), { clearProps: 'all' });
    setLines(BOOT);
    setDone(true);
  }, []);

  useLayoutEffect(() => {
    if (reduced || !root.current) return;
    const el = root.current;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      gsap.set(q('[data-reveal]'), { autoAlpha: 0 });
      gsap.set(q('[data-reveal="tag"]'), { y: 12 });
      gsap.set(q('[data-reveal="cta"]'), { y: 8 });
      gsap.set(q('[data-char]'), { yPercent: 115 });
      const tl = gsap.timeline({ onComplete: () => setDone(true), delay: 0.4 });
      tlRef.current = tl;
      BOOT.forEach((line, i) => {
        tl.add(
          typeTween(line, (t) => setLines((prev) => prev.map((p, j) => (j === i ? t : p))), 46),
          i === 0 ? 0 : '+=0.28',
        );
      });
      tl.to(q('[data-boot]'), { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.in' }, '+=0.5')
        .to(el, { backgroundColor: BG_DONE, duration: 0.6, ease: 'power1.out' }, '<')
        .set(q('[data-reveal="name"]'), { autoAlpha: 1 })
        .to(q('[data-char]'), { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.045 }, '>')
        .to(q('[data-reveal="tag"]'), { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.45')
        .fromTo(q('[data-reveal="term"]'), { autoAlpha: 0, y: 24, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' }, '-=0.2')
        .to(q('[data-reveal="cta"]'), { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }, '-=0.3');
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!done) finish();
      } else if (e.key === 'Enter' && !(e.target as HTMLElement)?.closest('a,button')) {
        e.preventDefault();
        if (!done) finish();
        else onExplore();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, finish, onExplore]);

  const activeIdx = lines.findIndex((l, i) => l.length < BOOT[i].length);

  const name = (word: string) => (
    <span className="block overflow-hidden pb-[0.06em]">
      {word.split('').map((c, i) => (
        <span key={i} data-char className="inline-block will-change-transform">
          {c}
        </span>
      ))}
    </span>
  );

  return (
    <div
      ref={root}
      className="relative z-10 flex min-h-dvh flex-col px-5 py-5 sm:px-10"
      style={{ backgroundColor: done ? BG_DONE : '#000' }}
      onClick={() => !done && finish()}
      data-testid="intro"
    >
      {/* top bar: skip + direct CV link are always reachable */}
      <div className="flex items-center justify-between gap-3 font-mono text-xs">
        <span className="text-muted">NOA OS · v1.0</span>
        <div className="flex items-center gap-2">
          <a
            href={candidate.resume.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-2 uppercase tracking-widest text-muted hover:text-accent"
            onClick={(e) => e.stopPropagation()}
          >
            CV (PDF)
          </a>
          {!done && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className="rounded-md border border-white/20 px-3 py-2 uppercase tracking-widest text-ink hover:border-accent hover:text-accent"
            >
              Skip intro ›
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center py-10">
        {/* Boot lines */}
        {!done && (
          <div data-boot className="absolute inset-x-0 mx-auto w-full max-w-xl px-2 font-mono text-sm tracking-widest text-ink sm:text-base" aria-live="polite">
            {lines.map((l, i) => (
              <p key={i} className={`min-h-[1.6em] ${i === 2 ? 'text-accent' : ''}`}>
                {l}
                {i === activeIdx && <span className="cursor ml-0.5" aria-hidden />}
              </p>
            ))}
          </div>
        )}

        <div className="w-full max-w-6xl">
          <h1 data-reveal="name" className="display text-center text-[clamp(3.4rem,17vw,13rem)] text-ink" aria-label={candidate.name}>
            <span aria-hidden>
              {name('NOA')}
              <span className="block text-accent">{name('REZZIK')}</span>
            </span>
          </h1>
          <p data-reveal="tag" className="mx-auto mt-6 max-w-2xl text-center text-lg text-muted sm:text-2xl">
            “{candidate.tagline}”
          </p>

          <div
            data-reveal="term"
            className="glass mx-auto mt-10 max-w-xl rounded-2xl p-5 font-mono text-sm sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-accent">Welcome to NOA OS.</p>
            <p className="mt-1 text-ink">
              Type <span className="rounded bg-white/10 px-1.5">help</span> to begin.
              <span className="cursor ml-1" aria-hidden />
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row" onClick={(e) => e.stopPropagation()}>
              <span data-reveal="cta" className="sm:flex-1">
                <Button variant="primary" size="lg" onClick={onExplore} className="w-full" data-testid="explore">
                  [ Explore terminal ]
                </Button>
              </span>
              <span data-reveal="cta" className="sm:flex-1">
                <Button size="lg" onClick={onCv} className="w-full" data-testid="view-cv">
                  [ View my CV ]
                </Button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center font-mono text-[11px] text-muted">
        {done ? 'Press Enter to explore · ' : 'Esc to skip · '}
        <a href={`mailto:${candidate.email}`} className="text-accent hover:underline">
          {candidate.email}
        </a>
      </p>
    </div>
  );
}
