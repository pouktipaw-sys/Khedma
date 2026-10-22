import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Circle, Download, Mail } from 'lucide-react';
import { CHALLENGE_MAILTO, candidate } from '../config/candidate';
import { useMotion } from '../hooks/useMotion';
import { gsap, pulse } from '../lib/gsap';
import { complete, suggestionsFor } from '../terminal/completion';
import { STAGE_LABEL, STAGE_ORDER, currentStage } from '../terminal/ctf';
import { Session } from '../terminal/session';
import type { Block, Effect } from '../terminal/types';
import { BlockActionsContext, BlockView } from './Blocks';
import { Button } from './Button';
import { CtfFinale } from './CtfFinale';

interface Entry {
  id: number;
  input: string | null;
  prompt: string;
  blocks: Block[];
  ok: boolean;
}

const WELCOME: Block[] = [
  { type: 'heading', text: 'Welcome to NOA OS.' },
  { type: 'text', text: 'Type help to begin.' },
  { type: 'suggest', commands: ['help', 'whoami', 'projects', 'challenge'] },
];

function EntryView({ entry, animate }: { entry: Entry; animate: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!animate || !ref.current) return;
    const kids = Array.from(ref.current.querySelectorAll(':scope > [data-block]'));
    if (kids.length === 0) return;
    const tween = gsap.fromTo(
      kids,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.045, clearProps: 'transform,opacity,visibility' },
    );
    return () => {
      tween.kill();
    };
  }, [animate]);

  return (
    <div className="mb-4" data-testid="entry">
      {entry.input !== null && (
        <p className="mb-1.5 break-all">
          <span className="text-accent">{entry.prompt}</span> <span className="text-ink">{entry.input}</span>
        </p>
      )}
      <div ref={ref} className="space-y-2.5">
        {entry.blocks.map((b, i) => (
          <div key={i} data-block>
            <BlockView block={b} />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface TerminalViewProps {
  onSetMode: (m: 'terminal' | 'recruiter') => void;
}

export function TerminalView({ onSetMode }: TerminalViewProps) {
  const { reduced, setPref } = useMotion();
  const [session] = useState(() => new Session());
  const [entries, setEntries] = useState<Entry[]>([{ id: 0, input: null, prompt: '', blocks: WELCOME, ok: true }]);
  const [value, setValue] = useState('');
  const [tick, setTick] = useState(0); // re-render after session mutations
  const [finale, setFinale] = useState(false);
  const idRef = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  const focusInput = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);

  const handleEffects = useCallback(
    (effects: Effect[] | undefined) => {
      for (const ef of effects ?? []) {
        switch (ef.type) {
          case 'open-resume':
            window.open(candidate.resume.url, '_blank', 'noopener,noreferrer');
            break;
          case 'set-mode':
            onSetMode(ef.mode);
            break;
          case 'ctf-complete':
            setFinale(true);
            break;
          case 'motion':
            setPref(ef.value);
            break;
          case 'pulse':
            pulse(ef.strength ?? 0.4);
            break;
          case 'clear':
            break;
        }
      }
    },
    [onSetMode, setPref],
  );

  const run = useCallback(
    (line: string) => {
      const res = session.execute(line);
      const cleared = res.effects?.some((e) => e.type === 'clear');
      if (cleared) {
        setEntries([]);
      } else {
        setEntries((prev) => [
          ...prev,
          { id: idRef.current++, input: line, prompt: `noa@root:${res.cwd === '/home/noa' ? '~' : res.cwd.replace('/home/noa', '~')}$`, blocks: res.blocks, ok: res.ok },
        ]);
      }
      handleEffects(res.effects);
      setValue('');
      setTick((t) => t + 1);
      pulse(0.2);
    },
    [session, handleEffects],
  );

  const fill = useCallback(
    (text: string) => {
      setValue(text);
      focusInput();
    },
    [focusInput],
  );

  /* focus on desktop; never pop the mobile keyboard unprompted */
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) focusInput();
  }, [focusInput]);

  /* keep the latest output in view — also while it grows (e.g. the sudo sequence) */
  const stick = useRef(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const toBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced]);
  useEffect(() => {
    stick.current = true;
    toBottom();
  }, [entries, toBottom]);
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (stick.current) toBottom();
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [toBottom]);

  const suggestions = useMemo(
    () => suggestionsFor(session, value),
    // `tick` re-evaluates after commands mutate session state (cwd, CTF).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, value, tick],
  );

  /* animate chips when the set changes */
  const chipKey = suggestions.map((s) => s.value).join('|');
  useLayoutEffect(() => {
    if (reduced || !chipsRef.current || chipsRef.current.children.length === 0) return;
    const tween = gsap.fromTo(
      chipsRef.current.children,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity,visibility' },
    );
    return () => {
      tween.kill();
    };
  }, [chipKey, reduced]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;
    if (e.key === 'Enter') {
      e.preventDefault();
      run(value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = session.history.up(value);
      if (prev !== null) setValue(prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = session.history.down();
      if (next !== null) setValue(next);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const res = complete(session, value);
      if (res.line !== value) setValue(res.line);
      else if (res.candidates.length > 1) {
        setEntries((prev) => [
          ...prev,
          { id: idRef.current++, input: value, prompt: session.prompt, blocks: [{ type: 'text', text: res.candidates.join('   '), tone: 'muted' }], ok: true },
        ]);
      }
    } else if (ctrl && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setEntries([]);
    } else if (ctrl && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (value) {
        setEntries((prev) => [...prev, { id: idRef.current++, input: `${value}^C`, prompt: session.prompt, blocks: [], ok: true }]);
      }
      session.history.reset();
      setValue('');
    } else if (ctrl && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      setValue('');
    }
  };

  const ctf = session.ctf;
  const stage = currentStage(ctf);

  return (
    <BlockActionsContext.Provider value={{ run, fill }}>
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1400px] gap-4 px-3 pb-3 sm:px-6 sm:pb-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ───────── terminal window ───────── */}
        <section
          aria-label="Terminal"
          className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl font-mono text-[13px] leading-relaxed sm:text-sm"
          onClick={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest('a,button,input')) return;
            if (window.getSelection()?.toString()) return;
            focusInput();
          }}
        >
          <div className="flex items-center justify-between border-b hairline px-4 py-2.5 text-[11px] text-muted">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-sm bg-accent" aria-hidden />
              noa@root — NOA OS
            </span>
            <span className="hidden sm:inline">sandboxed · nothing is executed on your machine</span>
          </div>

          <div
            ref={scrollRef}
            className="term-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
            role="log"
            aria-live="polite"
            aria-label="Terminal output"
            tabIndex={-1}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
          >
            <div ref={contentRef}>
              {entries.map((e, i) => (
                <EntryView key={e.id} entry={e} animate={!reduced && i === entries.length - 1} />
              ))}
            </div>
          </div>

          <div className="border-t hairline">
            <div
              ref={chipsRef}
              role="toolbar"
              aria-label="Command suggestions"
              className="chips flex gap-2 overflow-x-auto px-4 pt-3 sm:px-6"
            >
              {suggestions.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => (s.mode === 'run' ? run(s.value) : fill(s.value))}
                  className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink/90 transition-colors hover:border-accent hover:text-accent active:bg-accent active:text-bg"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2 px-4 py-3 sm:px-6"
              onSubmit={(e) => {
                e.preventDefault();
                run(value);
              }}
            >
              <label htmlFor="term-input" className="shrink-0 text-accent">
                <span className="hidden sm:inline">{session.prompt}</span>
                <span className="sm:hidden" aria-hidden>
                  $
                </span>
                <span className="sr-only">Command prompt</span>
              </label>
              <input
                id="term-input"
                ref={inputRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  session.history.reset();
                }}
                onKeyDown={onKeyDown}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                inputMode="text"
                aria-label="Terminal command input"
                placeholder="type a command…  (try: help)"
                className="min-w-0 flex-1 bg-transparent text-ink caret-accent outline-none placeholder:text-muted/60 focus-visible:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Run
              </button>
            </form>
          </div>
        </section>

        {/* ───────── side panel ───────── */}
        <aside aria-label="Quick access" className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
          <div className="glass rounded-2xl p-5">
            <p className="eyebrow mb-2">Candidate</p>
            <h2 className="text-2xl font-bold tracking-tight">{candidate.name}</h2>
            <p className="mt-1 text-sm text-muted">{candidate.targetRoles[0]} · {candidate.location}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="sm" href={`mailto:${candidate.email}`}>
                <Mail size={14} aria-hidden /> Email
              </Button>
              <Button size="sm" href={candidate.resume.url} download={candidate.resume.downloadName}>
                <Download size={14} aria-hidden /> CV
              </Button>
            </div>
            <a href={`mailto:${candidate.email}`} className="mt-3 block break-all font-mono text-xs text-accent hover:underline">
              {candidate.email}
            </a>
          </div>

          <div className="glass rounded-2xl p-5" data-testid="ctf-panel">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Mini-CTF · optional</p>
              <span className="font-mono text-[11px] text-accent">{ctf.completed ? 'COMPLETE' : ctf.started ? 'IN PROGRESS' : '2–5 min'}</span>
            </div>
            <ol className="mt-4 space-y-2.5 text-sm">
              {STAGE_ORDER.slice(0, 5).map((st, i) => {
                const done = ctf.completed || STAGE_ORDER.indexOf(stage) > i;
                const active = !ctf.completed && stage === st;
                return (
                  <li key={st} className={`flex items-center gap-3 ${done ? 'text-ink' : active ? 'text-accent' : 'text-muted'}`}>
                    {done ? <Check size={16} className="text-accent" aria-hidden /> : <Circle size={16} aria-hidden className={active ? 'text-accent' : ''} />}
                    <span>{STAGE_LABEL[st]}</span>
                    <span className="sr-only">{done ? '(done)' : active ? '(current)' : ''}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              {!ctf.started && !ctf.completed && (
                <Button size="sm" variant="primary" onClick={() => run('challenge')}>
                  Start
                </Button>
              )}
              {ctf.started && !ctf.completed && (
                <Button size="sm" onClick={() => run('hint')}>
                  Hint
                </Button>
              )}
              {ctf.completed && (
                <Button size="sm" variant="primary" href={CHALLENGE_MAILTO}>
                  Send a challenge
                </Button>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <p className="eyebrow mb-3">Shortcuts</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs">
              {[
                ['Tab', 'autocomplete'],
                ['↑ ↓', 'history'],
                ['Ctrl+L', 'clear'],
                ['Ctrl+C', 'cancel line'],
                ['Alt+M', 'switch mode'],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-accent">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      {finale && (
        <CtfFinale
          onClose={() => {
            setFinale(false);
            focusInput();
          }}
          onRecruiter={() => {
            setFinale(false);
            onSetMode('recruiter');
          }}
        />
      )}
    </BlockActionsContext.Provider>
  );
}
