import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Mail } from 'lucide-react';
import { CHALLENGE_MAILTO, candidate } from '../config/candidate';
import { useMotion } from '../hooks/useMotion';
import { gsap, pulse } from '../lib/gsap';
import { Button } from './Button';

interface Props {
  onClose: () => void;
  onRecruiter: () => void;
}

/** Cinematic "ACCESS GRANTED" sequence shown when the mini-CTF is completed. */
export function CtfFinale({ onClose, onRecruiter }: Props) {
  const { reduced } = useMotion();
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(reduced);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    el.focus({ preventScroll: true }); // buttons start hidden (autoAlpha) so focus the dialog itself
    if (reduced) {
      setReady(true);
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setReady(true) });
      tl.from(el, { autoAlpha: 0, duration: 0.35 })
        .from(q('[data-scan]'), { scaleX: 0, duration: 0.6, ease: 'power3.inOut', transformOrigin: 'left center' }, 0.1)
        .from(q('[data-ring]'), { scale: 0.2, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12 }, 0.2)
        .from(q('[data-char]'), { yPercent: 110, autoAlpha: 0, duration: 0.55, ease: 'expo.out', stagger: 0.035 }, 0.5)
        .call(() => pulse(1), [], 0.6)
        .from(q('[data-line]'), { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.out', stagger: 0.5 }, 1.3)
        .from(q('[data-cta]'), { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, '>-0.1');
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose();
    if (e.key !== 'Tab') return;
    const f = Array.from(root.current?.querySelectorAll<HTMLElement>('a[href],button') ?? []);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const title = 'ACCESS GRANTED.';
  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finale-title"
      onKeyDown={trap}
      tabIndex={-1}
      className="fixed inset-0 z-50 outline-none flex flex-col items-center justify-center overflow-y-auto bg-bg/92 px-6 py-10 text-center backdrop-blur-md"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span key={i} data-ring className="absolute rounded-full border border-accent/25" style={{ width: `${36 + i * 22}vmin`, height: `${36 + i * 22}vmin` }} />
        ))}
      </div>
      <div data-scan aria-hidden className="mb-8 h-px w-40 bg-accent shadow-[0_0_24px_var(--color-accent)]" />
      <h2 id="finale-title" className="display relative text-[clamp(2.6rem,10.5vw,8rem)] text-accent">
        <span className="sr-only">{title}</span>
        <span aria-hidden className="inline-flex flex-wrap justify-center">
          {title.split(' ').map((word, wi) => (
            <span key={wi} className="inline-flex overflow-hidden pr-[0.25em] pb-[0.08em]">
              {word.split('').map((c, i) => (
                <span key={i} data-char className="inline-block">
                  {c}
                </span>
              ))}
            </span>
          ))}
        </span>
      </h2>
      <p data-line className="relative mt-8 font-mono text-lg text-ink sm:text-2xl">
        You've seen how I think.
      </p>
      <p data-line className="relative mt-3 text-xl font-semibold text-ink sm:text-3xl">
        Now give me a challenge of your own.
      </p>
      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3" aria-busy={!ready}>
        <span data-cta>
          <Button variant="primary" size="lg" href={CHALLENGE_MAILTO}>
            <Mail size={18} aria-hidden /> Send me a challenge
          </Button>
        </span>
        <span data-cta>
          <Button size="lg" href={candidate.resume.url} download={candidate.resume.downloadName}>
            Download CV
          </Button>
        </span>
        <span data-cta>
          <Button size="lg" onClick={onRecruiter}>
            Recruiter mode
          </Button>
        </span>
        <span data-cta>
          <Button size="lg" variant="bracket" onClick={onClose}>
            Back to terminal
          </Button>
        </span>
      </div>
      <p data-cta className="relative mt-6 font-mono text-xs text-muted">
        {candidate.email}
      </p>
    </div>
  );
}
