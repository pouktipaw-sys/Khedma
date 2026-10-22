/**
 * Virtual filesystem. Pure data + path logic — it never touches a real disk,
 * and file contents are generated from the candidate configuration.
 */
import type { Candidate } from '../config/candidate';
import {
  HIDDEN_FILE,
  INCIDENT_LOG,
  PAYLOAD,
  SECRET_LOCKED,
  secretUnlockedText,
} from './ctf';

export const HOME = '/home/noa';

export interface FsContext {
  /** True once the CTF payload has been decoded. */
  secretUnlocked: boolean;
}

export interface FileNode {
  type: 'file';
  name: string;
  content: string | ((ctx: FsContext) => string);
  hidden?: boolean;
  /** Binary files cannot be cat'ed. */
  binary?: boolean;
}

export interface DirNode {
  type: 'dir';
  name: string;
  children: FsNode[];
  hidden?: boolean;
}

export type FsNode = FileNode | DirNode;

/* ───────────────────────────── path helpers ───────────────────────────── */

/** Collapses `.`, `..` and repeated slashes. Always returns an absolute path. */
export function normalize(path: string): string {
  const stack: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return '/' + stack.join('/');
}

/** Resolves an absolute / relative / ~ path against `cwd`. */
export function resolvePath(cwd: string, input: string, home = HOME): string {
  let p = input.trim();
  if (p === '') return cwd;
  if (p === '~' || p.startsWith('~/')) p = home + p.slice(1);
  if (!p.startsWith('/')) p = `${cwd}/${p}`;
  return normalize(p);
}

/** `/home/noa/skills` → `~/skills` (like a shell prompt). */
export function displayPath(abs: string, home = HOME): string {
  if (abs === home) return '~';
  if (abs.startsWith(home + '/')) return '~' + abs.slice(home.length);
  return abs;
}

export const basename = (abs: string): string => abs.split('/').filter(Boolean).pop() ?? '/';
export const dirname = (abs: string): string => {
  const parts = abs.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
};

/* ───────────────────────────── the tree ───────────────────────────── */

const file = (name: string, content: FileNode['content'], extra: Partial<FileNode> = {}): FileNode => ({
  type: 'file',
  name,
  content,
  ...extra,
});
const dir = (name: string, children: FsNode[], extra: Partial<DirNode> = {}): DirNode => ({
  type: 'dir',
  name,
  children,
  ...extra,
});

const bullets = (items: string[]): string => items.map((i) => `  • ${i}`).join('\n');

export function buildTree(c: Candidate): DirNode {
  const about = [
    `${c.name}`,
    `${'─'.repeat(c.name.length)}`,
    c.tagline,
    '',
    c.summary,
    '',
    'Target roles:',
    bullets(c.targetRoles),
    '',
    `Location : ${c.location}`,
    `Email    : ${c.email}`,
  ].join('\n');

  const skillFiles = c.skills.map((s) =>
    file(
      `${s.slug}.txt`,
      [s.group, '─'.repeat(s.group.length), bullets(s.items), ...(s.note ? ['', s.note] : [])].join('\n'),
    ),
  );

  const projectFiles = c.projects.map((p) =>
    file(
      `${p.id}.md`,
      [
        `# ${p.name}`,
        p.tagline,
        '',
        'Objective',
        `  ${p.objective}`,
        '',
        `Technologies: ${p.tech.join(', ')}`,
        '',
        'Process',
        bullets(p.process),
        '',
        'Verifiable results',
        bullets(p.results),
        '',
        'Lessons learned',
        bullets(p.lessons),
        '',
        p.repoUrl ? `Repository: ${p.repoUrl}` : 'Repository: not published',
      ].join('\n'),
    ),
  );

  const experienceText = [
    'Professional experience',
    '──────────────────────',
    'No professional cybersecurity experience yet.',
    'Status: STILL BUILDING.',
    ...(c.experience.length
      ? ['', ...c.experience.flatMap((e) => [`${e.role} · ${e.org} · ${e.period}`, bullets(e.points)])]
      : []),
    '',
    'What I do to build it:',
    bullets(c.practice),
  ].join('\n');

  const educationFiles = c.education.map((e, i) =>
    file(
      i === 0 ? 'lyon2.txt' : `education-${i + 1}.txt`,
      [e.degree, `${e.school} · ${e.location}`, e.period].join('\n'),
    ),
  );

  const contact = [
    'Contact',
    '───────',
    `Email    : ${c.email}`,
    `Location : ${c.location}`,
    ...(c.links.github ? [`GitHub   : ${c.links.github}`] : []),
    ...(c.links.linkedin ? [`LinkedIn : ${c.links.linkedin}`] : []),
    '',
    'Fastest way to reach me: send a technical challenge.',
  ].join('\n');

  return dir('', [
    dir('home', [
      dir('noa', [
        file('about.txt', about),
        dir('skills', skillFiles),
        dir('projects', projectFiles),
        dir('experience', [file('README.txt', experienceText)]),
        dir('education', educationFiles),
        dir('challenges', [
          file(
            'README.txt',
            [
              'Challenges',
              '──────────',
              'mini-ctf.txt   an optional beginner-friendly investigation (2–5 minutes)',
              '',
              "Type 'challenge' to start it. It is optional — everything else on this site",
              'stays available whether or not you play.',
            ].join('\n'),
          ),
          file(
            'mini-ctf.txt',
            [
              'MINI-CTF · "The Intercepted File"',
              '─────────────────────────────────',
              'A mysterious file has been left somewhere in this filesystem.',
              'Your job: investigate it and find the flag (format ROOT{...}).',
              '',
              'Start with:  challenge',
              'Stuck?       hint',
            ].join('\n'),
          ),
        ]),
        file('contact.txt', contact),
        file('resume.pdf', `[binary PDF] Use the 'resume' command to open or download it.`, {
          binary: true,
        }),
        file('incident.log', INCIDENT_LOG),
        file('secret.txt', (ctx) => (ctx.secretUnlocked ? secretUnlockedText() : SECRET_LOCKED)),
        file(HIDDEN_FILE, PAYLOAD, { hidden: true }),
        file(
          '.bashrc',
          '# ~/.bashrc — nothing to see here.\n# (Curiosity is not a crime. Keep looking.)\n',
          { hidden: true },
        ),
      ]),
    ]),
  ]);
}

/* ───────────────────────────── the filesystem ───────────────────────────── */

export class VirtualFS {
  readonly root: DirNode;
  readonly home = HOME;

  constructor(root: DirNode) {
    this.root = root;
  }

  get(abs: string): FsNode | null {
    let node: FsNode = this.root;
    for (const part of abs.split('/').filter(Boolean)) {
      if (node.type !== 'dir') return null;
      const next: FsNode | undefined = node.children.find((c) => c.name === part);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  isDir(abs: string): boolean {
    return this.get(abs)?.type === 'dir';
  }

  /** Children of a directory, directories first, then alphabetical. */
  list(abs: string, includeHidden = false): FsNode[] {
    const node = this.get(abs);
    if (!node || node.type !== 'dir') return [];
    return node.children
      .filter((c) => includeHidden || !c.hidden)
      .slice()
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  }

  read(abs: string, ctx: FsContext): string | null {
    const node = this.get(abs);
    if (!node || node.type !== 'file') return null;
    return typeof node.content === 'function' ? node.content(ctx) : node.content;
  }

  /** Size shown by `ls -l`. */
  size(node: FsNode, ctx: FsContext): number | null {
    if (node.type === 'dir') return 4096;
    if (node.binary) return null;
    return typeof node.content === 'function' ? node.content(ctx).length : node.content.length;
  }

  /** Closest sibling name, used for "did you mean" in error messages. */
  closestName(abs: string): string | null {
    const parent = dirname(abs);
    const target = basename(abs).toLowerCase();
    const names = this.list(parent, true).map((n) => n.name);
    const exact = names.find((n) => n.toLowerCase() === target);
    if (exact) return exact;
    const prefix = names.find((n) => n.toLowerCase().startsWith(target) || target.startsWith(n.toLowerCase()));
    return prefix ?? null;
  }

  /**
   * Completion candidates for a (possibly partial) path argument.
   * Returned strings are full replacements of the argument, e.g. `skills/li` → `skills/linux.txt`.
   */
  completePath(cwd: string, partial: string, opts: { dirsOnly?: boolean } = {}): string[] {
    const slash = partial.lastIndexOf('/');
    const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : '';
    const namePart = slash >= 0 ? partial.slice(slash + 1) : partial;
    const dirAbs = resolvePath(cwd, dirPart === '' ? '.' : dirPart);
    if (!this.isDir(dirAbs)) return [];
    const wantHidden = namePart.startsWith('.');
    return this.list(dirAbs, wantHidden)
      .filter((n) => n.name.startsWith(namePart))
      .filter((n) => !opts.dirsOnly || n.type === 'dir')
      .map((n) => dirPart + n.name + (n.type === 'dir' ? '/' : ''));
  }
}

export const createFs = (c: Candidate): VirtualFS => new VirtualFS(buildTree(c));
