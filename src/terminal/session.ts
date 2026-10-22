/**
 * A terminal session: working directory, history, CTF state and the
 * `execute` entry point. UI-agnostic, so it is fully unit-testable.
 */
import { candidate as defaultCandidate } from '../config/candidate';
import type { Candidate } from '../config/candidate';
import {
  initialCtfState,
  reduceCtf,
  secretUnlocked,
} from './ctf';
import type { CtfEvent, CtfProgress, CtfState } from './ctf';
import { REFUSED, REGISTRY, allCommandNames, findCommand, visibleCommandNames } from './commands';
import { HOME, createFs, displayPath } from './fs';
import type { FsContext, VirtualFS } from './fs';
import { CommandHistory } from './history';
import { parseInput } from './parser';
import { closestMatches } from './suggest';
import type { Block, ExecResult } from './types';

export class Session {
  readonly fs: VirtualFS;
  readonly history = new CommandHistory();
  cwd = HOME;
  prevCwd = HOME;
  ctf: CtfState = initialCtfState();
  private pending: CtfProgress | null = null;

  constructor(c: Candidate = defaultCandidate) {
    this.fs = createFs(c);
  }

  get fsContext(): FsContext {
    return { secretUnlocked: secretUnlocked(this.ctf) };
  }

  /** `noa@root:~/skills$` */
  get prompt(): string {
    return `noa@root:${displayPath(this.cwd)}$`;
  }

  setCwd(abs: string): void {
    if (abs !== this.cwd) this.prevCwd = this.cwd;
    this.cwd = abs;
  }

  /* ── CTF hooks used by commands ── */

  private apply(event: CtfEvent): void {
    const res = reduceCtf(this.ctf, event, {
      home: HOME,
      log: `${HOME}/incident.log`,
      secret: `${HOME}/secret.txt`,
    });
    this.ctf = res.state;
    if (res.progress) {
      this.ctf = { ...this.ctf, started: true };
      this.pending = res.progress;
    }
  }
  recordList(path: string, all: boolean): void {
    this.apply({ type: 'list', path, all });
  }
  recordCat(path: string): void {
    this.apply({ type: 'cat', path });
  }
  /** Returns true when the decoded text was the CTF payload. */
  recordDecode(payload: string): boolean {
    this.apply({ type: 'decode', payload });
    return this.pending?.milestone === 'decode';
  }
  /** Consumes the pending progress note, if any. */
  flushProgress(): Block | null {
    const p = this.pending;
    this.pending = null;
    return p ? { type: 'text', text: `[mini-ctf] ✓ ${p.message}`, tone: 'accent' } : null;
  }

  /* ── main entry point ── */

  execute(raw: string): ExecResult {
    const cwd = this.cwd;
    const base = { input: raw.trim(), cwd };
    const parsed = parseInput(raw);

    if (parsed.kind === 'empty') return { ...base, ok: true, blocks: [] };
    this.history.push(base.input);
    if (parsed.kind === 'error') {
      return { ...base, ok: false, blocks: [{ type: 'text', text: parsed.message, tone: 'error' }] };
    }

    const cmd = findCommand(parsed.name);
    if (cmd) {
      try {
        const res = cmd.run(parsed.args, this);
        this.pending = null;
        return { ...base, ok: !res.blocks.some((b) => b.type === 'text' && b.tone === 'error'), ...res };
      } catch {
        return { ...base, ok: false, blocks: [{ type: 'text', text: `${parsed.name}: something went wrong.`, tone: 'error' }] };
      }
    }

    const refused = REFUSED[parsed.name];
    if (refused) {
      return { ...base, ok: false, blocks: [{ type: 'text', text: refused, tone: 'warn' }, { type: 'suggest', commands: ['help'] }] };
    }

    return { ...base, ok: false, blocks: this.notFound(parsed.name) };
  }

  private notFound(name: string): Block[] {
    const near = closestMatches(name, visibleCommandNames().concat(allCommandNames().filter((n) => !visibleCommandNames().includes(n))));
    const blocks: Block[] = [{ type: 'text', text: `${name}: command not found`, tone: 'error' }];
    if (near.length) {
      blocks.push({ type: 'text', text: `Did you mean: ${near.join(', ')}?`, tone: 'muted' });
      blocks.push({ type: 'suggest', commands: near });
    } else {
      blocks.push({ type: 'text', text: "Type 'help' to see what's available.", tone: 'muted' });
      blocks.push({ type: 'suggest', commands: ['help'] });
    }
    return blocks;
  }
}

export { REGISTRY };
