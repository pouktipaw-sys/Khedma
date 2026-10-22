import { describe, expect, it } from 'vitest';
import { candidate } from '../config/candidate';
import { REGISTRY, decodeBase64 } from './commands';
import { complete, suggestionsFor } from './completion';
import { Session } from './session';
import type { Block } from './types';

const flat = (blocks: Block[]): string =>
  blocks
    .map((b) => {
      switch (b.type) {
        case 'text':
        case 'heading':
          return b.text;
        case 'kv':
          return b.rows.map((r) => `${r.k} ${r.v}`).join('\n');
        case 'list':
          return b.items.join('\n');
        case 'ls':
          return b.entries.map((e) => e.name).join(' ');
        case 'tags':
          return b.groups.flatMap((g) => [g.title, ...g.items]).join(' ');
        case 'actions':
          return b.items.map((i) => i.label).join(' | ');
        case 'sequence':
          return b.steps.map((s) => `${s.text} ${s.badge ?? ''}`).join('\n') + flat(b.after ?? []);
        case 'suggest':
          return b.commands.join(' ');
        case 'neofetch':
          return b.rows.map((r) => `${r.k} ${r.v}`).join('\n');
        default:
          return b.type;
      }
    })
    .join('\n');

const exec = (s: Session, line: string) => s.execute(line);

describe('required commands all exist and run', () => {
  const required = ['help', 'whoami', 'ls', 'cd', 'pwd', 'cat', 'skills', 'projects', 'experience', 'education', 'contact', 'resume', 'clear', 'history', 'neofetch', 'challenge', 'sudo'];
  it.each(required)('%s is registered', (name) => {
    expect(REGISTRY.some((c) => c.name === name)).toBe(true);
  });
  it.each(['help', 'whoami', 'ls', 'pwd', 'skills', 'projects', 'experience', 'education', 'contact', 'resume', 'clear', 'history', 'neofetch', 'challenge', 'coffee', 'motivation', 'why-you', 'man noa', 'sudo hire noa', 'hint', 'motion off', 'recruiter'])(
    '`%s` succeeds',
    (line) => {
      expect(exec(new Session(), line).ok).toBe(true);
    },
  );
});

describe('content honesty', () => {
  it('experience says STILL BUILDING and invents nothing', () => {
    const t = flat(exec(new Session(), 'experience').blocks);
    expect(t).toMatch(/STILL BUILDING/);
    expect(t).not.toMatch(/intern|certified|CVE-|OSCP|top \d+%/i);
  });
  it('education is accurate', () => {
    const t = flat(exec(new Session(), 'education').blocks);
    expect(t).toContain('Université Lumière Lyon 2');
    expect(t).toContain('2023–2026');
  });
  it('contact exposes mailto and no fake social links', () => {
    const r = exec(new Session(), 'contact');
    const actions = r.blocks.flatMap((b) => (b.type === 'actions' ? b.items : []));
    expect(actions.some((a) => a.href?.startsWith(`mailto:${candidate.email}`))).toBe(true);
    expect(actions.some((a) => a.label === 'GitHub')).toBe(false);
  });
  it('resume triggers the real PDF action', () => {
    const r = exec(new Session(), 'resume');
    expect(r.effects).toContainEqual({ type: 'open-resume' });
    const actions = r.blocks.flatMap((b) => (b.type === 'actions' ? b.items : []));
    expect(actions.some((a) => a.href === candidate.resume.url)).toBe(true);
  });
  it('projects: list, open by number and id, bad name', () => {
    const s = new Session();
    expect(exec(s, 'projects').blocks.some((b) => b.type === 'projectIndex')).toBe(true);
    expect(exec(s, 'projects 1').blocks[0]).toEqual({ type: 'project', id: candidate.projects[0].id });
    expect(exec(s, 'projects network').blocks[0]).toEqual({ type: 'project', id: 'network-recon' });
    const bad = exec(s, 'projects zzz');
    expect(bad.ok).toBe(false);
  });
});

describe('sudo hire noa', () => {
  it('prints the required verification sequence and a contact action', () => {
    const r = exec(new Session(), 'sudo hire noa');
    const t = flat(r.blocks);
    expect(t).toContain('Checking candidate permissions...');
    expect(t).toMatch(/Curiosity:\s+VERIFIED/);
    expect(t).toMatch(/Problem-solving mindset:\s+VERIFIED/);
    expect(t).toMatch(/Willingness to learn:\s+VERIFIED/);
    expect(t).toMatch(/Professional experience:\s+STILL BUILDING/);
    expect(t).toContain('Recommendation: GIVE HER A TECHNICAL CHALLENGE');
    const seq = r.blocks.find((b) => b.type === 'sequence');
    expect(seq && seq.type === 'sequence' && seq.after?.some((b) => b.type === 'actions')).toBe(true);
  });
  it('is case-insensitive; other sudo usage is refused politely', () => {
    expect(exec(new Session(), 'SUDO Hire NOA').ok).toBe(true);
    expect(exec(new Session(), 'sudo rm -rf /').ok).toBe(false);
  });
});

describe('error handling', () => {
  it('reports unknown commands with suggestions', () => {
    const r = exec(new Session(), 'skils');
    expect(r.ok).toBe(false);
    expect(flat(r.blocks)).toContain('skils: command not found');
    expect(flat(r.blocks)).toContain('skills');
  });
  it('gives help for gibberish', () => {
    expect(flat(exec(new Session(), 'qqqqqqq').blocks)).toContain('help');
  });
  it('refuses real programs and shell operators without executing anything', () => {
    const s = new Session();
    for (const line of ['rm -rf /', 'nmap 10.0.0.1', 'ls; cat /etc/passwd', 'echo $(whoami)', 'curl http://x']) {
      const r = exec(s, line);
      expect(r.ok).toBe(false);
    }
  });
  it('base64 decoder validates input', () => {
    expect(decodeBase64('aGVsbG8=')).toBe('hello');
    expect(decodeBase64('not base64!')).toBeNull();
    expect(exec(new Session(), 'base64 -d ###').ok).toBe(false);
  });
  it('clear returns a clear effect', () => {
    expect(exec(new Session(), 'clear').effects).toContainEqual({ type: 'clear' });
  });
});

describe('history command', () => {
  it('lists executed commands including failures', () => {
    const s = new Session();
    exec(s, 'ls');
    exec(s, 'nonsense');
    const t = flat(exec(s, 'history').blocks);
    expect(t).toContain('ls');
    expect(t).toContain('nonsense');
    expect(t).toContain('history');
  });
});

describe('tab completion', () => {
  const s = new Session();
  it('completes unique command names', () => {
    expect(complete(s, 'whoa').line).toBe('whoami ');
    expect(complete(s, 'neof').line).toBe('neofetch ');
  });
  it('extends to common prefix and lists candidates', () => {
    const r = complete(s, 'e');
    expect(r.candidates).toEqual(expect.arrayContaining(['experience', 'education']));
    expect(r.line).toBe('e');
  });
  it('completes paths, directories get a trailing slash', () => {
    expect(complete(s, 'cd sk').line).toBe('cd skills/');
    expect(complete(s, 'cat skills/li').line).toBe('cat skills/linux.txt ');
    expect(complete(s, 'cat abo').line).toBe('cat about.txt ');
    expect(complete(s, 'cat /home/no').line).toBe('cat /home/noa/');
  });
  it('only offers directories for cd and dotfiles when asked', () => {
    expect(complete(s, 'cd ab').candidates).toEqual([]);
    expect(complete(s, 'cat .').candidates).toContain('.intercepted');
    expect(complete(s, 'cat ').candidates).not.toContain('.intercepted');
  });
  it('completes the sudo easter egg', () => {
    expect(complete(s, 'sudo h').line).toBe('sudo hire ');
    expect(complete(s, 'sudo hire n').line).toBe('sudo hire noa ');
  });
  it('does not leak hidden commands', () => {
    expect(complete(s, 'cof').candidates).toEqual([]);
  });
  it('offers helpful suggestion chips', () => {
    expect(suggestionsFor(s, '').map((x) => x.value)).toContain('help');
    expect(suggestionsFor(s, 'pro')[0]).toMatchObject({ mode: 'fill' });
  });
});
