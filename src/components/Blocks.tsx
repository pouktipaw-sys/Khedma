import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, Download, ExternalLink, Mail } from 'lucide-react';
import { candidate } from '../config/candidate';
import { useMotion } from '../hooks/useMotion';
import type { Action, Block, Tone } from '../terminal/types';
import { ProjectCard } from './ProjectCard';

/** Lets blocks run commands / fill the prompt without prop drilling. */
interface BlockActions {
  run: (cmd: string) => void;
  fill: (text: string) => void;
}
export const BlockActionsContext = createContext<BlockActions>({ run: () => {}, fill: () => {} });

const toneClass: Record<Tone, string> = {
  default: 'text-ink',
  muted: 'text-muted',
  accent: 'text-accent',
  error: 'text-danger',
  warn: 'text-warn',
};

const LINK_RE = /([\w.+-]+@[\w-]+\.[\w.-]+|https?:\/\/[^\s)]+)/g;

/** Turns emails and URLs inside plain text into real, working links. */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const isMail = part.includes('@') && !part.startsWith('http');
        return (
          <a
            key={i}
            href={isMail ? `mailto:${part}` : part}
            {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

export function ActionButton({ a }: { a: Action }) {
  const { run } = useContext(BlockActionsContext);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const cls = `inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
    a.primary
      ? 'bg-accent text-bg font-semibold hover:bg-white'
      : 'border border-white/15 text-ink hover:border-accent hover:text-accent'
  }`;
  const icon = a.href?.startsWith('mailto:') ? <Mail size={14} aria-hidden /> : a.download ? <Download size={14} aria-hidden /> : a.external ? <ExternalLink size={14} aria-hidden /> : null;

  if (a.href) {
    return (
      <a
        href={a.href}
        className={cls}
        {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...(a.download ? { download: a.download } : {})}
      >
        {icon}
        {a.label}
      </a>
    );
  }
  if (a.copy) {
    const text = a.copy;
    return (
      <button
        type="button"
        className={cls}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied('ok');
          } catch {
            setCopied('fail');
          }
          window.setTimeout(() => setCopied('idle'), 1800);
        }}
      >
        {copied === 'ok' ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied === 'ok' ? 'Copied' : copied === 'fail' ? `Select & copy: ${text}` : a.label}
      </button>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => a.command && run(a.command)}>
      {a.label}
    </button>
  );
}

function Sequence({ block }: { block: Extract<Block, { type: 'sequence' }> }) {
  const { reduced } = useMotion();
  const [shown, setShown] = useState(reduced ? block.steps.length : 0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) {
      setShown(block.steps.length);
      return;
    }
    let acc = 0;
    block.steps.forEach((s, i) => {
      acc += s.delay ?? 500;
      timers.current.push(window.setTimeout(() => setShown(i + 1), acc));
    });
    const ts = timers.current;
    return () => ts.forEach(window.clearTimeout);
  }, [block, reduced]);

  const done = shown >= block.steps.length;
  return (
    <div className="space-y-1" aria-live="polite">
      {block.steps.slice(0, shown).map((s, i) => (
        <div
          key={i}
          className={`flex flex-wrap items-baseline gap-x-3 ${toneClass[s.tone ?? 'default']} animate-[fadein_.25s_ease-out]`}
        >
          <span>{s.text}</span>
          {s.badge && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold tracking-widest ${
                s.tone === 'warn' ? 'border-warn/60 text-warn' : 'border-accent/70 bg-accent/10 text-accent'
              }`}
            >
              {s.badge}
            </span>
          )}
        </div>
      ))}
      {!done && <span className="cursor" aria-hidden />}
      {done && block.after && (
        <div className="pt-3 space-y-3">
          {block.after.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function Neofetch({ block }: { block: Extract<Block, { type: 'neofetch' }> }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
      <pre aria-hidden className="shrink-0 overflow-x-auto font-mono text-[11px] leading-tight text-accent sm:text-xs">
        {block.art}
      </pre>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {block.rows.map((r) => (
          <div key={r.k} className="contents">
            <dt className="font-semibold text-accent">{r.k}</dt>
            <dd className="min-w-0 break-words">
              <Linkified text={r.v} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function BlockView({ block }: { block: Block }): ReactNode {
  const { run, fill } = useContext(BlockActionsContext);
  switch (block.type) {
    case 'text':
      return (
        <p className={`whitespace-pre-wrap break-words ${toneClass[block.tone ?? 'default']}`}>
          <Linkified text={block.text} />
        </p>
      );
    case 'heading':
      return <h3 className="text-base font-semibold tracking-wide text-accent sm:text-lg">{block.text}</h3>;
    case 'kv':
      return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[minmax(7rem,max-content)_1fr]">
          {block.rows.map((r) => (
            <div key={r.k} className="contents">
              <dt className="text-muted sm:text-accent/90 break-words">{r.k}</dt>
              <dd className="min-w-0 break-words pb-1.5 sm:pb-0">
                <Linkified text={r.v} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'list':
      return (
        <ul className="space-y-1">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 whitespace-pre-wrap break-words">
              {block.bullet !== '' && <span className="text-accent" aria-hidden>{block.bullet ?? '•'}</span>}
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case 'ls':
      return block.long ? (
        <table className="w-full text-left">
          <tbody>
            {block.entries.map((e) => (
              <tr key={e.name + e.path} className="align-baseline">
                <td className="pr-4 text-muted">{e.perms}</td>
                <td className="pr-4 text-right text-muted">{e.size}</td>
                <td>
                  <LsItem e={e} run={run} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {block.entries.map((e) => (
            <li key={e.name + e.path}>
              <LsItem e={e} run={run} />
            </li>
          ))}
        </ul>
      );
    case 'actions':
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((a) => (
            <ActionButton key={a.label} a={a} />
          ))}
        </div>
      );
    case 'tags':
      return (
        <div className="space-y-3">
          {block.groups.map((g) => (
            <div key={g.title}>
              <p className="text-accent">{g.title}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <li key={it} className="rounded border border-white/15 px-2 py-0.5 text-[13px]">
                    {it}
                  </li>
                ))}
              </ul>
              {g.note && <p className="mt-1 text-xs text-muted">{g.note}</p>}
            </div>
          ))}
        </div>
      );
    case 'project': {
      const i = candidate.projects.findIndex((p) => p.id === block.id);
      return i < 0 ? null : <ProjectCard project={candidate.projects[i]} index={i} variant="terminal" />;
    }
    case 'projectIndex':
      return (
        <ol className="space-y-2">
          {candidate.projects.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => run(`projects ${i + 1}`)}
                className="group flex w-full items-baseline gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left transition-colors hover:border-accent/70 hover:bg-accent/[0.04]"
              >
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:text-accent">{p.name}</span>
                  <span className="block text-[13px] text-muted">{p.tagline}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      );
    case 'neofetch':
      return <Neofetch block={block} />;
    case 'sequence':
      return <Sequence block={block} />;
    case 'suggest':
      return (
        <div className="flex flex-wrap gap-2">
          {block.commands.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => (c.includes('{') ? fill(c) : run(c))}
              className="rounded-md border border-accent/40 px-2.5 py-1 font-mono text-xs text-accent transition-colors hover:bg-accent hover:text-bg"
            >
              {c}
            </button>
          ))}
        </div>
      );
  }
}

function LsItem({ e, run }: { e: Extract<Block, { type: 'ls' }>['entries'][number]; run: (c: string) => void }) {
  const isDir = e.type === 'dir';
  const clickable = e.name !== '.';
  const label = isDir ? `${e.name}/` : e.name;
  if (!clickable) return <span className="text-accent">{label}</span>;
  return (
    <button
      type="button"
      onClick={() => run(isDir ? `cd ${e.path}` : `cat ${e.path}`)}
      aria-label={isDir ? `Open folder ${e.name}` : `Read file ${e.name}`}
      className={`rounded px-0.5 underline-offset-4 hover:underline ${isDir ? 'font-semibold text-accent' : e.name.startsWith('.') ? 'text-muted' : 'text-ink'}`}
    >
      {label}
    </button>
  );
}
