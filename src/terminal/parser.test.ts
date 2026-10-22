import { describe, expect, it } from 'vitest';
import { parseInput, splitArgs, tokenize } from './parser';
import { closestMatches, levenshtein } from './suggest';

describe('parser', () => {
  it('ignores empty input', () => {
    expect(parseInput('   ')).toEqual({ kind: 'empty' });
  });
  it('splits command and args, lowercasing the command', () => {
    expect(parseInput('LS -la  skills')).toMatchObject({ kind: 'command', name: 'ls', args: ['-la', 'skills'] });
  });
  it('honours quotes and escapes', () => {
    expect(tokenize(`cat "my file.txt" 'a b' c\\ d`).tokens).toEqual(['cat', 'my file.txt', 'a b', 'c d']);
  });
  it('rejects unterminated quotes', () => {
    expect(parseInput('cat "oops')).toMatchObject({ kind: 'error' });
  });
  it.each(['ls; rm -rf /', 'cat a | grep b', 'echo hi > f', 'echo `id`', 'echo $(id)', 'ls && pwd'])(
    'refuses shell operator: %s',
    (line) => {
      expect(parseInput(line)).toMatchObject({ kind: 'error' });
    },
  );
  it('allows operator characters inside quotes', () => {
    expect(parseInput(`echo "a;b"`)).toMatchObject({ kind: 'command', args: ['a;b'] });
  });
  it('splits flags', () => {
    const r = splitArgs(['-la', '--all', 'x']);
    expect([...r.flags].sort()).toEqual(['a', 'all', 'l']);
    expect(r.positional).toEqual(['x']);
  });
});

describe('typo suggestions', () => {
  it('computes edit distance', () => {
    expect(levenshtein('skils', 'skills')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });
  it('suggests close commands', () => {
    expect(closestMatches('skils', ['skills', 'help', 'ls'])[0]).toBe('skills');
    expect(closestMatches('whoam', ['whoami', 'help'])[0]).toBe('whoami');
    expect(closestMatches('zzzzzz', ['whoami', 'help'])).toEqual([]);
  });
});
