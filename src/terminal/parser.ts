/**
 * Command-line parser. It only *tokenizes*: nothing here (or anywhere in this
 * project) ever hands input to a real shell, `eval`, or `Function`.
 */

export type ParseResult =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'command'; name: string; args: string[]; raw: string };

const OPERATOR_MESSAGE =
  'Shell operators (; | & > < ` $()) are disabled — this is a sandboxed portfolio shell. Run one command at a time.';

/** Splits a line into words, honouring '…' "…" and backslash escapes. */
export function tokenize(line: string): { tokens: string[]; operator: boolean; unterminated: boolean } {
  const tokens: string[] = [];
  let cur = '';
  let inWord = false;
  let quote: '"' | "'" | null = null;
  let operator = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < line.length && /["\\]/.test(line[i + 1])) cur += line[++i];
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
      continue;
    }
    if (ch === '\\' && i + 1 < line.length) {
      cur += line[++i];
      inWord = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (inWord) tokens.push(cur);
      cur = '';
      inWord = false;
      continue;
    }
    if (';|&<>`'.includes(ch) || (ch === '$' && line[i + 1] === '(')) operator = true;
    cur += ch;
    inWord = true;
  }
  if (inWord) tokens.push(cur);
  return { tokens, operator, unterminated: quote !== null };
}

export function parseInput(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'empty' };
  const { tokens, operator, unterminated } = tokenize(trimmed);
  if (unterminated) return { kind: 'error', message: 'Unterminated quote — close it with a matching " or \'.' };
  if (operator) return { kind: 'error', message: OPERATOR_MESSAGE };
  if (tokens.length === 0) return { kind: 'empty' };
  const [name, ...args] = tokens;
  return { kind: 'command', name: name.toLowerCase(), args, raw: trimmed };
}

/** Separates flags (-a, -la, --all) from positional arguments. */
export function splitArgs(args: string[]): { flags: Set<string>; positional: string[] } {
  const flags = new Set<string>();
  const positional: string[] = [];
  for (const a of args) {
    if (a.startsWith('--') && a.length > 2) flags.add(a.slice(2));
    else if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) for (const ch of a.slice(1)) flags.add(ch);
    else positional.push(a);
  }
  return { flags, positional };
}
