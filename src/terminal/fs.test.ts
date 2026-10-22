import { describe, expect, it } from 'vitest';
import { candidate } from '../config/candidate';
import { Session } from './session';
import { HOME, createFs, displayPath, normalize, resolvePath } from './fs';

const text = (r: ReturnType<Session['execute']>) =>
  r.blocks.map((b) => (b.type === 'text' ? b.text : b.type === 'ls' ? b.entries.map((e) => e.name).join(' ') : '')).join('\n');

describe('path resolution', () => {
  it('normalizes . .. and slashes', () => {
    expect(normalize('/a/./b//c/../d')).toBe('/a/b/d');
    expect(normalize('/../..')).toBe('/');
  });
  it('resolves relative, absolute and ~ paths', () => {
    expect(resolvePath(HOME, 'skills')).toBe('/home/noa/skills');
    expect(resolvePath('/home/noa/skills', '..')).toBe('/home/noa');
    expect(resolvePath('/home/noa/skills', '../projects/./')).toBe('/home/noa/projects');
    expect(resolvePath('/', '/home/noa')).toBe('/home/noa');
    expect(resolvePath('/tmp', '~/skills')).toBe('/home/noa/skills');
    expect(resolvePath('/home/noa', '')).toBe('/home/noa');
  });
  it('displays home as ~', () => {
    expect(displayPath('/home/noa')).toBe('~');
    expect(displayPath('/home/noa/skills')).toBe('~/skills');
    expect(displayPath('/home')).toBe('/home');
  });
});

describe('virtual filesystem', () => {
  const fs = createFs(candidate);
  it('contains the required home layout', () => {
    const names = fs.list(HOME).map((n) => n.name);
    for (const n of ['about.txt', 'skills', 'projects', 'experience', 'education', 'challenges', 'contact.txt', 'resume.pdf', 'incident.log', 'secret.txt']) {
      expect(names).toContain(n);
    }
  });
  it('hides dotfiles unless asked', () => {
    expect(fs.list(HOME).map((n) => n.name)).not.toContain('.intercepted');
    expect(fs.list(HOME, true).map((n) => n.name)).toContain('.intercepted');
  });
  it('has one project file per configured project', () => {
    expect(fs.list(`${HOME}/projects`)).toHaveLength(candidate.projects.length);
  });
  it('never invents repository links', () => {
    const body = fs.read(`${HOME}/projects/${candidate.projects[0].id}.md`, { secretUnlocked: false })!;
    expect(body).toContain('Repository: not published');
    expect(body).not.toMatch(/https?:\/\/github/);
  });
});

describe('navigation commands', () => {
  it('cd / pwd / ls / cat work together', () => {
    const s = new Session();
    expect(text(s.execute('pwd'))).toBe('/home/noa');
    s.execute('cd skills');
    expect(s.cwd).toBe('/home/noa/skills');
    expect(s.prompt).toBe('noa@root:~/skills$');
    expect(text(s.execute('ls'))).toContain('linux.txt');
    expect(text(s.execute('cat linux.txt'))).toContain('Debian');
    s.execute('cd ..');
    expect(s.cwd).toBe('/home/noa');
    s.execute('cd /home');
    expect(s.cwd).toBe('/home');
    s.execute('cd ~/education');
    expect(s.cwd).toBe('/home/noa/education');
    s.execute('cd -');
    expect(s.cwd).toBe('/home');
    s.execute('cd');
    expect(s.cwd).toBe('/home/noa');
    s.execute('cd ../../..');
    expect(s.cwd).toBe('/');
  });
  it('gives clear feedback for missing and wrong-type targets', () => {
    const s = new Session();
    expect(text(s.execute('cd nowhere'))).toMatch(/no such file or directory/);
    expect(text(s.execute('cd about.txt'))).toMatch(/not a directory/);
    expect(text(s.execute('cat skills'))).toMatch(/Is a directory/);
    expect(text(s.execute('cat nope.txt'))).toMatch(/No such file/);
    expect(text(s.execute('cat skils/linux.txt'))).toMatch(/No such file/);
    expect(text(s.execute('ls nothing'))).toMatch(/No such file/);
    expect(s.cwd).toBe('/home/noa');
  });
  it('suggests near matches for typos in paths', () => {
    const s = new Session();
    expect(text(s.execute('cd skill'))).toMatch(/Did you mean 'skills'/);
  });
  it('ls -a shows dotfiles; plain ls does not', () => {
    const s = new Session();
    expect(text(s.execute('ls'))).not.toContain('.intercepted');
    expect(text(s.execute('ls -a'))).toContain('.intercepted');
    expect(text(s.execute('ls -la'))).toContain('.intercepted');
  });
  it('reads files with absolute and relative paths', () => {
    const s = new Session();
    expect(text(s.execute('cat /home/noa/about.txt'))).toContain('Noa Rezzik');
    expect(text(s.execute('cat ./contact.txt'))).toContain(candidate.email);
    expect(text(s.execute('cat education/lyon2.txt'))).toContain('Lyon 2');
  });
});
