import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Download, Mail, Zap, ZapOff } from 'lucide-react';
import { candidate } from './config/candidate';
import { Button } from './components/Button';
import { Intro } from './components/Intro';
import { NetworkBackground } from './components/NetworkBackground';
import { RecruiterMode } from './components/RecruiterMode';
import { TerminalView } from './components/TerminalView';
import { useMotion } from './hooks/useMotion';
import { gsap, pulse } from './lib/gsap';

export type Mode = 'terminal' | 'recruiter';
const SEEN_KEY = 'noa-intro-seen';

/** `#recruiter` / `#cv` / `#terminal` deep links and `?intro=0` skip the intro. */
function initialState(): { showIntro: boolean; mode: Mode } {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  const deepMode: Mode | null = hash === 'recruiter' || hash === 'cv' ? 'recruiter' : hash === 'terminal' ? 'terminal' : null;
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    /* ignore */
  }
  const noIntro = new URLSearchParams(window.location.search).get('intro') === '0';
  return { showIntro: !(deepMode || seen || noIntro), mode: deepMode ?? 'terminal' };
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const { reduced } = useMotion();
  const refs = useRef<Record<Mode, HTMLButtonElement | null>>({ terminal: null, recruiter: null });

  useLayoutEffect(() => {
    const btn = refs.current[mode];
    const ind = indicator.current;
    if (!btn || !ind) return;
    const props = { x: btn.offsetLeft, width: btn.offsetWidth };
    if (reduced) gsap.set(ind, props);
    else gsap.to(ind, { ...props, duration: 0.45, ease: 'expo.out' });
  }, [mode, reduced]);

  const item = (m: Mode, label: string, short: string) => (
    <button
      type="button"
      ref={(n) => {
        refs.current[m] = n;
      }}
      aria-pressed={mode === m}
      onClick={() => onChange(m)}
      className={`relative z-10 flex-1 whitespace-nowrap rounded-full px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors sm:flex-none sm:px-5 ${mode === m ? 'text-bg' : 'text-muted hover:text-ink'}`}
    >
      <span className="text-current/60" aria-hidden>[</span> {short}
      <span className="hidden sm:inline"> {label}</span> <span aria-hidden className="text-current/60">]</span>
    </button>
  );

  return (
    <div ref={wrap} role="group" aria-label="Display mode" className="glass relative flex w-full rounded-full p-1 sm:w-auto">
      <span ref={indicator} aria-hidden className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-0 rounded-full bg-accent" />
      {item('terminal', 'MODE', 'TERMINAL')}
      {item('recruiter', 'MODE', 'RECRUITER')}
    </div>
  );
}

export default function App() {
  const init = useRef(initialState());
  const [showIntro, setShowIntro] = useState(init.current.showIntro);
  const [mode, setModeState] = useState<Mode>(init.current.mode);
  const { reduced, setPref } = useMotion();
  const stage = useRef<HTMLDivElement>(null);
  const switching = useRef(false);

  const markSeen = () => {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  /** Animated mode switch: fade/slide the old window out, then the new one in. */
  const setMode = useCallback(
    (next: Mode) => {
      if (next === mode || switching.current) return;
      const finish = () => {
        setModeState(next);
        switching.current = false;
        window.history.replaceState(null, '', `#${next}`);
        window.scrollTo({ top: 0 });
        pulse(0.9);
      };
      if (reduced || !stage.current) return finish();
      switching.current = true;
      gsap.to(stage.current, {
        autoAlpha: 0,
        y: 14,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          finish();
          gsap.fromTo(stage.current, { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out', clearProps: 'transform' });
        },
      });
    },
    [mode, reduced],
  );

  const leaveIntro = (m: Mode) => {
    markSeen();
    setModeState(m);
    setShowIntro(false);
    window.history.replaceState(null, '', `#${m}`);
  };

  /* Alt+M toggles modes anywhere */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showIntro) return;
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMode(mode === 'terminal' ? 'recruiter' : 'terminal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, setMode, showIntro]);

  /* back/forward & manual hash edits */
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#', '').toLowerCase();
      if (h === 'recruiter' || h === 'cv') setModeState('recruiter');
      else if (h === 'terminal') setModeState('terminal');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (showIntro) {
    return (
      <>
        <NetworkBackground />
        <Intro onExplore={() => leaveIntro('terminal')} onCv={() => leaveIntro('recruiter')} />
      </>
    );
  }

  const isTerminal = mode === 'terminal';
  return (
    <div className={`relative flex flex-col ${isTerminal ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <a
        href="#main"
        className="sr-only-focusable fixed left-3 top-3 z-[60] rounded-md bg-accent px-3 py-2 font-mono text-xs text-bg"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('term-input')?.focus();
          document.getElementById('main')?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <div className="bg-grid" aria-hidden />
      <div className="bg-glow" aria-hidden />
      <NetworkBackground />

      <header className="relative z-40 shrink-0 border-b hairline bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 sm:px-6">
          <a
            href={`#${mode}`}
            className="flex items-center gap-2 font-mono text-sm font-semibold tracking-widest"
            aria-label="NOA OS — Noa Rezzik"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-bg" aria-hidden>
              <span className="text-[11px] leading-none">&gt;_</span>
            </span>
            NOA<span className="text-accent">OS</span>
          </a>

          <div className="order-last w-full sm:order-none sm:w-auto">
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`mailto:${candidate.email}`}
              className="hidden items-center gap-2 rounded-md px-3 py-2 font-mono text-xs text-muted hover:text-accent lg:inline-flex"
            >
              <Mail size={14} aria-hidden /> {candidate.email}
            </a>
            <Button
              size="sm"
              variant="ghost"
              href={`mailto:${candidate.email}`}
              aria-label={`Email ${candidate.email}`}
              className="lg:hidden"
              magnetic={false}
            >
              <Mail size={14} aria-hidden />
            </Button>
            <Button size="sm" variant="primary" href={candidate.resume.url} download={candidate.resume.downloadName} aria-label="Download CV">
              <Download size={14} aria-hidden /> <span className="hidden sm:inline">CV</span>
            </Button>
            <button
              type="button"
              onClick={() => setPref(reduced ? 'on' : 'off')}
              aria-pressed={reduced}
              aria-label={reduced ? 'Animations are off. Turn animations on' : 'Animations are on. Turn animations off (reduced motion)'}
              title={reduced ? 'Motion: off' : 'Motion: on'}
              className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {reduced ? <ZapOff size={15} aria-hidden /> : <Zap size={15} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <main id="main" ref={stage} className={`relative z-10 ${isTerminal ? 'min-h-0 flex-1 pt-3 sm:pt-5' : ''}`}>
        {isTerminal ? <TerminalView onSetMode={setMode} /> : <RecruiterMode onOpenTerminal={() => setMode('terminal')} />}
      </main>

      {!isTerminal && (
        <footer className="relative z-10 border-t hairline px-5 py-8 text-center font-mono text-xs text-muted">
          © {new Date().getFullYear()} {candidate.name} ·{' '}
          <a className="text-accent hover:underline" href={`mailto:${candidate.email}`}>
            {candidate.email}
          </a>{' '}
          · {candidate.location}
        </footer>
      )}
    </div>
  );
}
