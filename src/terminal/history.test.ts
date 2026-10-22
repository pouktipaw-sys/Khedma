import { describe, expect, it } from 'vitest';
import { CommandHistory } from './history';

describe('CommandHistory', () => {
  it('walks back and forth, restoring the draft', () => {
    const h = new CommandHistory();
    ['ls', 'pwd', 'whoami'].forEach((c) => h.push(c));
    expect(h.up('dra')).toBe('whoami');
    expect(h.up('')).toBe('pwd');
    expect(h.up('')).toBe('ls');
    expect(h.up('')).toBe('ls'); // clamps at oldest
    expect(h.down()).toBe('pwd');
    expect(h.down()).toBe('whoami');
    expect(h.down()).toBe('dra'); // draft restored
    expect(h.down()).toBeNull();
  });
  it('ignores blanks and immediate duplicates', () => {
    const h = new CommandHistory();
    h.push('ls');
    h.push('ls');
    h.push('  ');
    expect(h.entries).toEqual(['ls']);
  });
  it('returns null when empty and caps size', () => {
    const h = new CommandHistory(3);
    expect(h.up('')).toBeNull();
    ['a', 'b', 'c', 'd'].forEach((c) => h.push(c));
    expect(h.entries).toEqual(['b', 'c', 'd']);
  });
});
