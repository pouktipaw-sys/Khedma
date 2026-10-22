/** Tab completion and suggestion chips. Pure functions of (session, line). */
import { candidate } from '../config/candidate';
import { currentStage, nextCommand } from './ctf';
import { findCommand, visibleCommandNames } from './commands';
import type { Session } from './session';

export interface Completion {
  /** The new line after applying completion (may equal the input). */
  line: string;
  /** All candidates (full argument / command strings) that matched. */
  candidates: string[];
}

const PATH_COMMANDS = new Set(['ls', 'cd', 'cat', 'base64', 'b64']);

function commonPrefix(items: string[]): string {
  if (items.length === 0) return '';
  let p = items[0];
  for (const s of items.slice(1)) {
    while (!s.startsWith(p)) p = p.slice(0, -1);
  }
  return p;
}

/** Candidates for the *last* word of the line (what Tab would complete). */
export function candidatesFor(session: Session, line: string): { prefix: string; word: string; candidates: string[] } {
  const endsWithSpace = /\s$/.test(line);
  const parts = line.trimStart().split(/\s+/).filter((_, i, a) => !(i === a.length - 1 && a[i] === ''));
  const words = endsWithSpace ? [...parts, ''] : parts;
  const word = words[words.length - 1] ?? '';
  const prefix = line.slice(0, line.length - word.length);

  if (words.length <= 1) {
    const names = visibleCommandNames();
    // Aliases are completable too, but only when explicitly started.
    const aliases = ['cv', 'ctf', 'exit'];
    const pool = word ? [...names, ...aliases] : names;
    return { prefix, word, candidates: pool.filter((n) => n.startsWith(word.toLowerCase())).sort() };
  }

  const cmdName = findCommand(words[0])?.name ?? words[0].toLowerCase();
  const argIndex = words.length - 2; // index among the arguments
  const lower = word.toLowerCase();
  let pool: string[] = [];

  if (PATH_COMMANDS.has(cmdName)) {
    if (word.startsWith('-')) pool = cmdName === 'ls' ? ['-a', '-l', '-la'] : cmdName === 'base64' || cmdName === 'b64' ? ['-d'] : [];
    else return { prefix, word, candidates: session.fs.completePath(session.cwd, word, { dirsOnly: cmdName === 'cd' }) };
  } else if (cmdName === 'sudo') {
    pool = argIndex === 0 ? ['hire'] : argIndex === 1 && words[1].toLowerCase() === 'hire' ? ['noa'] : [];
  } else if (cmdName === 'man') {
    pool = argIndex === 0 ? ['noa', ...visibleCommandNames()] : [];
  } else if (cmdName === 'projects') {
    pool = argIndex === 0 ? candidate.projects.map((p) => p.id) : [];
  } else if (cmdName === 'challenge') {
    pool = argIndex === 0 ? ['start', 'status', 'hint', 'reset'] : [];
  } else if (cmdName === 'motion') {
    pool = argIndex === 0 ? ['on', 'off', 'system'] : [];
  }
  return { prefix, word, candidates: pool.filter((n) => n.toLowerCase().startsWith(lower)) };
}

/**
 * Bash-style completion: unique match → complete it; several → extend to the
 * longest common prefix and report the candidates.
 */
export function complete(session: Session, line: string): Completion {
  const { prefix, word, candidates } = candidatesFor(session, line);
  if (candidates.length === 0) return { line, candidates };
  if (candidates.length === 1) {
    const only = candidates[0];
    const suffix = only.endsWith('/') ? '' : ' ';
    return { line: prefix + only + suffix, candidates };
  }
  const common = commonPrefix(candidates);
  return { line: common.length > word.length ? prefix + common : line, candidates };
}

export interface Suggestion {
  label: string;
  /** What to put in / run from the prompt. */
  value: string;
  /** `run` executes immediately; `fill` only inserts text. */
  mode: 'run' | 'fill';
}

/** Chips shown under the prompt (essential on mobile). */
export function suggestionsFor(session: Session, line: string, max = 8): Suggestion[] {
  if (line.trim() === '') {
    const base = ['help', 'whoami', 'projects', 'skills', 'resume', 'contact', 'challenge', 'neofetch'];
    const ctf = session.ctf;
    const list =
      ctf.started && !ctf.completed
        ? [nextCommand(ctf), 'hint', ...base.filter((c) => c !== 'challenge')]
        : ctf.completed
          ? ['contact', ...base.filter((c) => c !== 'challenge' && c !== 'contact')]
          : base;
    return list.slice(0, max).map((c) => ({ label: c, value: c, mode: c.includes('{') ? 'fill' : 'run' }));
  }
  const { prefix, candidates } = candidatesFor(session, line);
  return candidates.slice(0, max).map((c) => ({
    label: c,
    value: prefix + c + (c.endsWith('/') ? '' : ' '),
    mode: 'fill',
  }));
}

export const ctfStageForUi = (session: Session) => currentStage(session.ctf);
