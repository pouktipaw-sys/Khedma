/**
 * Terminal command registry.
 *
 * Every command is a pure-ish function of (args, session) → output blocks.
 * Nothing here executes anything on the host: the "shell" is a typed switch
 * over this registry.
 */
import { CHALLENGE_MAILTO, candidate, mailto } from '../config/candidate';
import type { Project } from '../config/candidate';
import {
  HIDDEN_FILE,
  STAGE_LABEL,
  currentStage,
  FLAG,
  nextCommand,
  nextHint,
  resetCtf,
  stageNumber,
  startCtf,
  submitFlag,
} from './ctf';
import { displayPath, resolvePath, HOME } from './fs';
import type { LsEntry } from './types';
import { err, out, text } from './types';
import type { Action, Block, CommandOutput } from './types';
import { splitArgs } from './parser';
import type { Session } from './session';
import { closestMatches } from './suggest';

export interface Command {
  name: string;
  aliases?: string[];
  group: 'Navigate' | 'Profile' | 'Challenge' | 'System' | 'Special';
  summary: string;
  usage?: string;
  /** Hidden commands (easter eggs) are not listed or autocompleted. */
  hidden?: boolean;
  run: (args: string[], session: Session) => CommandOutput;
}

const resumeActions = (): Action[] => [
  { label: 'Open CV', href: candidate.resume.url, external: true, primary: true },
  { label: 'Download CV', href: candidate.resume.url, download: candidate.resume.downloadName },
];

const contactActions = (): Action[] => [
  { label: 'Send an email', href: mailto('Hello Noa'), primary: true },
  { label: 'Copy email', copy: candidate.email },
  { label: 'Give her a challenge', href: CHALLENGE_MAILTO },
  ...resumeActions().slice(1),
  ...(candidate.links.github ? [{ label: 'GitHub', href: candidate.links.github, external: true }] : []),
  ...(candidate.links.linkedin ? [{ label: 'LinkedIn', href: candidate.links.linkedin, external: true }] : []),
];

/** Finds a project by id, 1-based index, or id prefix. */
export function findProject(query: string): Project | null {
  const q = query.toLowerCase();
  const n = Number(q);
  if (Number.isInteger(n) && n >= 1 && n <= candidate.projects.length) return candidate.projects[n - 1];
  return (
    candidate.projects.find((p) => p.id === q) ??
    candidate.projects.find((p) => p.id.startsWith(q) || p.name.toLowerCase().startsWith(q)) ??
    null
  );
}

const hint = (cmd: string): Block => ({ type: 'suggest', commands: [cmd] });

/* ─────────────────────────────── navigation ─────────────────────────────── */

const ls: Command = {
  name: 'ls',
  group: 'Navigate',
  summary: 'List files and directories',
  usage: 'ls [-a] [-l] [path…]',
  run(args, s) {
    const { flags, positional } = splitArgs(args);
    const all = flags.has('a') || flags.has('all');
    const almost = flags.has('A');
    const long = flags.has('l');
    const unknown = [...flags].filter((f) => !['a', 'A', 'l', 'all'].includes(f));
    if (unknown.length) return err(`ls: invalid option -- '${unknown[0]}'\nUsage: ls [-a] [-l] [path…]`);

    const targets = positional.length ? positional : ['.'];
    const blocks: Block[] = [];

    targets.forEach((t, i) => {
      const abs = resolvePath(s.cwd, t);
      const node = s.fs.get(abs);
      if (!node) {
        const near = s.fs.closestName(abs);
        blocks.push(
          text(`ls: cannot access '${t}': No such file or directory${near ? ` — did you mean '${near}'?` : ''}`, 'error'),
        );
        return;
      }
      if (targets.length > 1) blocks.push(text(`${t}:`, 'muted'));
      const entries: LsEntry[] = [];
      const mk = (n: { name: string; type: 'dir' | 'file' }, path: string, label = n.name): LsEntry => {
        const full = s.fs.get(path);
        const size = full ? s.fs.size(full, s.fsContext) : null;
        return {
          name: label,
          type: n.type,
          path,
          perms: n.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--',
          size: size === null ? '-' : String(size),
        };
      };
      if (node.type === 'dir') {
        if (all) {
          entries.push(mk({ name: '.', type: 'dir' }, abs, '.'));
          entries.push(mk({ name: '..', type: 'dir' }, resolvePath(abs, '..'), '..'));
        }
        for (const child of s.fs.list(abs, all || almost)) {
          entries.push(mk(child, resolvePath(abs, child.name)));
        }
        s.recordList(abs, all || almost);
      } else {
        entries.push(mk(node, abs, t));
      }
      blocks.push({ type: 'ls', entries, long });
      if (i === targets.length - 1) {
        const p = s.flushProgress();
        if (p) blocks.push(p);
      }
    });
    return { blocks, effects: [{ type: 'pulse', strength: 0.4 }] };
  },
};

const cd: Command = {
  name: 'cd',
  group: 'Navigate',
  summary: 'Change directory',
  usage: 'cd [path]   (cd ~, cd .., cd -)',
  run(args, s) {
    if (args.length > 1) return err('cd: too many arguments');
    const target = args[0];
    if (target === '-') {
      const prev = s.prevCwd;
      s.setCwd(prev);
      return out(text(displayPath(s.cwd), 'muted'));
    }
    const abs = target === undefined ? HOME : resolvePath(s.cwd, target);
    const node = s.fs.get(abs);
    if (!node) {
      const near = s.fs.closestName(abs);
      return err(`cd: no such file or directory: ${target}${near ? `\nDid you mean '${near}'?` : ''}`);
    }
    if (node.type !== 'dir') return err(`cd: not a directory: ${target}`);
    s.setCwd(abs);
    return { blocks: [], effects: [{ type: 'pulse', strength: 0.3 }] };
  },
};

const pwd: Command = {
  name: 'pwd',
  group: 'Navigate',
  summary: 'Print the current directory',
  run: (_a, s) => out(text(s.cwd)),
};

const cat: Command = {
  name: 'cat',
  group: 'Navigate',
  summary: 'Read a file',
  usage: 'cat <file…>',
  run(args, s) {
    const { positional } = splitArgs(args);
    if (positional.length === 0) {
      return {
        blocks: [text('cat: missing file operand. Usage: cat <file>', 'error'), hint('ls')],
      };
    }
    const blocks: Block[] = [];
    for (const p of positional) {
      const abs = resolvePath(s.cwd, p);
      const node = s.fs.get(abs);
      if (!node) {
        const near = s.fs.closestName(abs);
        blocks.push(text(`cat: ${p}: No such file or directory${near ? ` — did you mean '${near}'?` : ''}`, 'error'));
        continue;
      }
      if (node.type === 'dir') {
        blocks.push(text(`cat: ${p}: Is a directory — try 'ls ${p}'`, 'error'));
        continue;
      }
      if (node.binary) {
        blocks.push(text(node.name === 'resume.pdf' ? `resume.pdf is a PDF, not text.` : `${node.name}: binary file`, 'warn'));
        blocks.push({ type: 'actions', items: resumeActions() });
        continue;
      }
      const content = s.fs.read(abs, s.fsContext) ?? '';
      s.recordCat(abs);
      blocks.push(text(content.replace(/\n$/, '')));
      if (node.name === HIDDEN_FILE) {
        blocks.push(text('(That looks like Base64 — try: base64 -d .intercepted)', 'muted'));
      }
      const prog = s.flushProgress();
      if (prog) blocks.push(prog);
    }
    return { blocks, effects: [{ type: 'pulse', strength: 0.3 }] };
  },
};

/* ─────────────────────────────── profile ─────────────────────────────── */

const whoami: Command = {
  name: 'whoami',
  group: 'Profile',
  summary: 'Who is Noa?',
  run: () => ({
    blocks: [
      { type: 'heading', text: candidate.name },
      text(candidate.tagline, 'accent'),
      text(candidate.summary),
      {
        type: 'kv',
        rows: [
          { k: 'location', v: candidate.location },
          { k: 'studying', v: `${candidate.education[0].degree} · ${candidate.education[0].school} (${candidate.education[0].period})` },
          { k: 'targets', v: candidate.targetRoles.join(' · ') },
          { k: 'experience', v: 'No professional cybersecurity experience yet — STILL BUILDING' },
          { k: 'email', v: candidate.email },
        ],
      },
      { type: 'actions', items: [{ label: 'Contact', command: 'contact', primary: true }, { label: 'Projects', command: 'projects' }, ...resumeActions().slice(0, 1)] },
    ],
  }),
};

const skills: Command = {
  name: 'skills',
  group: 'Profile',
  summary: 'Technical skills',
  run: () => ({
    blocks: [
      { type: 'heading', text: 'Technical skills' },
      { type: 'tags', groups: candidate.skills.map((s) => ({ title: s.group, items: s.items, note: s.note })) },
    ],
  }),
};

const projects: Command = {
  name: 'projects',
  aliases: ['project'],
  group: 'Profile',
  summary: 'Verified technical projects',
  usage: 'projects [name|number]',
  run(args) {
    if (args.length === 0) {
      return {
        blocks: [
          { type: 'heading', text: 'Projects' },
          { type: 'projectIndex' },
          text('Open one with: projects <number|name>   e.g. projects 1', 'muted'),
        ],
        effects: [{ type: 'pulse', strength: 0.5 }],
      };
    }
    const p = findProject(args.join(' '));
    if (!p) {
      const near = closestMatches(args[0], candidate.projects.map((x) => x.id));
      return err(`projects: no project matching '${args.join(' ')}'.${near.length ? ` Did you mean: ${near.join(', ')}?` : ''} Type 'projects' for the list.`);
    }
    return { blocks: [{ type: 'project', id: p.id }], effects: [{ type: 'pulse', strength: 0.6 }] };
  },
};

const experience: Command = {
  name: 'experience',
  aliases: ['exp'],
  group: 'Profile',
  summary: 'Professional experience',
  run: () => ({
    blocks: [
      { type: 'heading', text: 'Experience' },
      text('Professional experience: STILL BUILDING.', 'accent'),
      text('No professional cybersecurity experience yet — and no pretending otherwise. What there is:'),
      { type: 'list', items: candidate.practice },
      ...(candidate.experience.length
        ? candidate.experience.map((e) => text(`${e.role} · ${e.org} · ${e.period}`))
        : []),
      { type: 'actions', items: [{ label: 'Give her a challenge', href: CHALLENGE_MAILTO, primary: true }, { label: 'See projects', command: 'projects' }] },
    ],
  }),
};

const education: Command = {
  name: 'education',
  aliases: ['edu'],
  group: 'Profile',
  summary: 'Education',
  run: () => ({
    blocks: [
      { type: 'heading', text: 'Education' },
      ...candidate.education.map<Block>((e) => ({
        type: 'kv',
        rows: [
          { k: 'degree', v: e.degree },
          { k: 'school', v: e.school },
          { k: 'period', v: e.period },
          { k: 'location', v: e.location },
        ],
      })),
    ],
  }),
};

const contact: Command = {
  name: 'contact',
  group: 'Profile',
  summary: 'Email and contact actions',
  run: () => ({
    blocks: [
      { type: 'heading', text: 'Contact' },
      {
        type: 'kv',
        rows: [
          { k: 'email', v: candidate.email },
          { k: 'location', v: candidate.location },
          ...(candidate.links.github ? [{ k: 'github', v: candidate.links.github }] : []),
          ...(candidate.links.linkedin ? [{ k: 'linkedin', v: candidate.links.linkedin }] : []),
        ],
      },
      { type: 'actions', items: contactActions() },
    ],
  }),
};

const resume: Command = {
  name: 'resume',
  aliases: ['cv'],
  group: 'Profile',
  summary: 'Open or download the PDF resume',
  run: () => ({
    blocks: [text('Opening resume (PDF)… if nothing opened, use a button below.', 'muted'), { type: 'actions', items: resumeActions() }],
    effects: [{ type: 'open-resume' }],
  }),
};

const NEOFETCH_ART = [
  '  ┌──────────────┐',
  '  │ ▌            │',
  '  │ ▌ > _        │',
  '  │ ▌            │',
  '  │ ▌ N O A  O S │',
  '  └──────┬─┬─────┘',
  '       ──┴─┴──    ',
].join('\n');

const neofetch: Command = {
  name: 'neofetch',
  group: 'Profile',
  summary: 'Candidate summary, fastfetch-style',
  run: () => ({
    blocks: [
      {
        type: 'neofetch',
        art: NEOFETCH_ART,
        rows: [
          { k: 'user', v: 'noa@root' },
          { k: 'OS', v: 'NOA OS 1.0 (Debian-minded)' },
          { k: 'Host', v: candidate.education[0].school },
          { k: 'Degree', v: `BSc Computer Science · ${candidate.education[0].period}` },
          { k: 'Shell', v: 'bash · PowerShell' },
          { k: 'Code', v: 'Python · JavaScript · C/C++' },
          { k: 'Net', v: 'TCP/IP · DNS · HTTP' },
          { k: 'Tools', v: 'Nmap · Wireshark · tcpdump · Burp · ZAP' },
          { k: 'Practice', v: 'HTB · TryHackMe · CTF' },
          { k: 'Flags', v: '4 in a recruitment challenge' },
          { k: 'Experience', v: 'still building' },
          { k: 'Contact', v: candidate.email },
        ],
      },
    ],
  }),
};

/* ─────────────────────────────── challenge ─────────────────────────────── */

const challengeBriefing = (): Block[] => [
  { type: 'heading', text: 'MINI-CTF · The Intercepted File' },
  text('A mysterious file has been left somewhere in this filesystem.'),
  text('Your mission: investigate it and find the flag. Format: ROOT{...}'),
  { type: 'list', bullet: '›', items: ['1  Find the hidden file', '2  Read the investigation log', '3  Decode the message', '4  Find the flag', '5  Submit it'] },
  text('No technical background needed — type `hint` whenever you like. This is optional: the CV and contact details stay one click away.', 'muted'),
  text('Start here:  ls -a', 'accent'),
  { type: 'suggest', commands: ['ls -a', 'hint'] },
];

const challenge: Command = {
  name: 'challenge',
  aliases: ['ctf'],
  group: 'Challenge',
  summary: 'Start the optional mini-CTF',
  usage: 'challenge [start|status|hint|reset]',
  run(args, s) {
    const sub = (args[0] ?? 'start').toLowerCase();
    if (sub === 'hint') return hintCmd.run([], s);
    if (sub === 'reset') {
      s.ctf = resetCtf();
      return out(text('Challenge reset. Type `challenge` to begin again.', 'muted'));
    }
    if (sub === 'status') {
      const st = s.ctf;
      const stage = currentStage(st);
      return out(
        { type: 'heading', text: 'Challenge status' },
        {
          type: 'kv',
          rows: [
            { k: 'state', v: st.completed ? 'COMPLETE' : st.started ? 'in progress' : 'not started' },
            { k: 'step', v: st.completed ? '5/5' : `${stageNumber(st)}/5 — ${STAGE_LABEL[stage]}` },
            { k: 'hints', v: String(st.hintsUsed) },
          ],
        },
        { type: 'suggest', commands: [nextCommand(st)] },
      );
    }
    if (sub !== 'start') return err(`challenge: unknown option '${args[0]}'. Usage: challenge [start|status|hint|reset]`);
    if (s.ctf.completed) {
      return out(
        text('ACCESS GRANTED — you already completed this challenge.', 'accent'),
        text('Replay with `challenge reset`, or give Noa a challenge of your own.', 'muted'),
        { type: 'actions', items: [{ label: 'Give her a challenge', href: CHALLENGE_MAILTO, primary: true }] },
      );
    }
    const resumed = s.ctf.started;
    s.ctf = startCtf(s.ctf);
    if (resumed) {
      const stage = currentStage(s.ctf);
      return out(
        text(`Challenge already running — step ${stageNumber(s.ctf)}/5: ${STAGE_LABEL[stage]}.`, 'accent'),
        { type: 'suggest', commands: [nextCommand(s.ctf), 'hint'] },
      );
    }
    return { blocks: challengeBriefing(), effects: [{ type: 'pulse', strength: 0.8 }] };
  },
};

const hintCmd: Command = {
  name: 'hint',
  group: 'Challenge',
  summary: 'Get a hint for the current CTF step',
  run(_a, s) {
    const res = nextHint(s.ctf);
    s.ctf = res.state;
    if (res.stage === 'complete') return out(text(res.hint, 'accent'));
    return out(
      text(`Hint ${res.level}/3 · step ${stageNumber(s.ctf)} (${STAGE_LABEL[res.stage]})`, 'muted'),
      text(res.hint, 'accent'),
      { type: 'suggest', commands: [nextCommand(s.ctf)] },
    );
  },
};

const submit: Command = {
  name: 'submit',
  aliases: ['flag'],
  group: 'Challenge',
  summary: 'Submit a CTF flag',
  usage: 'submit ROOT{...}',
  run(args, s) {
    const value = args.join(' ').trim();
    if (!value) return err('submit: missing flag. Usage: submit ROOT{...}');
    const already = s.ctf.completed;
    const res = submitFlag(s.ctf, value);
    if (!res.correct) {
      return out(
        text('✗ Not the flag. Flags look like ROOT{SOMETHING}. Check secret.txt after decoding the payload.', 'error'),
        { type: 'suggest', commands: ['hint'] },
      );
    }
    s.ctf = res.state;
    const blocks: Block[] = [
      text('ACCESS GRANTED.', 'accent'),
      text("You've seen how I think."),
      text('Now give me a challenge of your own.', 'accent'),
      {
        type: 'kv',
        rows: [
          { k: 'flag', v: FLAG },
          { k: 'hints used', v: String(s.ctf.hintsUsed) },
        ],
      },
      { type: 'actions', items: [{ label: 'Send me a challenge', href: CHALLENGE_MAILTO, primary: true }, ...resumeActions()] },
    ];
    return { blocks, effects: already ? [] : [{ type: 'ctf-complete' }] };
  },
};

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function decodeBase64(input: string): string | null {
  const clean = input.replace(/\s+/g, '');
  if (!clean || clean.length % 4 === 1 || !BASE64_RE.test(clean)) return null;
  try {
    const bin = atob(clean);
    return bin;
  } catch {
    return null;
  }
}

const base64: Command = {
  name: 'base64',
  aliases: ['b64'],
  group: 'Challenge',
  summary: 'Safely decode (or encode) Base64 text',
  usage: 'base64 -d <file|text>',
  run(args, s) {
    const { flags, positional } = splitArgs(args);
    const decode = flags.has('d') || flags.has('decode');
    if (positional.length === 0) return err('base64: missing input. Usage: base64 -d <file|text>   (encode: base64 <text>)');
    const joined = positional.join(' ');
    let source = joined;
    let fromFile = false;
    if (positional.length === 1) {
      const abs = resolvePath(s.cwd, positional[0]);
      const node = s.fs.get(abs);
      if (node?.type === 'dir') return err(`base64: ${positional[0]}: Is a directory`);
      if (node?.type === 'file' && !node.binary) {
        source = s.fs.read(abs, s.fsContext) ?? '';
        fromFile = true;
      }
    }
    if (source.length > 10_000) return err('base64: input too large for this sandbox (10 000 characters max).');
    if (!decode) {
      // Encode mode (text → Base64). Only ASCII is supported to keep it simple.
      if (!/^[\x20-\x7e\n]*$/.test(source)) return err('base64: only printable ASCII can be encoded here.');
      return out(text(btoa(source)));
    }
    const decoded = decodeBase64(source);
    if (decoded === null) {
      return {
        blocks: [
          text(`base64: ${fromFile ? positional[0] : 'input'} is not valid Base64.`, 'error'),
          text('Base64 uses A–Z a–z 0–9 + / and ends with = padding.', 'muted'),
        ],
      };
    }
    if (!/^[\x09\x0a\x20-\x7e]*$/.test(decoded)) {
      return out(text(`(binary data, ${decoded.length} bytes — not shown)`, 'warn'));
    }
    const blocks: Block[] = [text(decoded)];
    const hadPayload = s.recordDecode(source);
    if (hadPayload) {
      const prog = s.flushProgress();
      if (prog) blocks.push(prog);
      blocks.push({ type: 'suggest', commands: ['cat secret.txt'] });
    }
    return { blocks, effects: hadPayload ? [{ type: 'pulse', strength: 0.7 }] : [] };
  },
};

/* ─────────────────────────────── system ─────────────────────────────── */

const clear: Command = {
  name: 'clear',
  aliases: ['cls'],
  group: 'System',
  summary: 'Clear the screen (Ctrl+L)',
  run: () => ({ blocks: [], effects: [{ type: 'clear' }] }),
};

const history: Command = {
  name: 'history',
  group: 'System',
  summary: 'Show previous commands (↑ / ↓ to browse)',
  run: (_a, s) => {
    const items = s.history.entries;
    if (items.length === 0) return out(text('No history yet.', 'muted'));
    return out({ type: 'list', bullet: '', items: items.map((c, i) => `${String(i + 1).padStart(3, ' ')}  ${c}`) });
  },
};

const motion: Command = {
  name: 'motion',
  group: 'System',
  summary: 'Turn animations on / off (reduced-motion mode)',
  usage: 'motion [on|off|system]',
  run(args) {
    const v = (args[0] ?? '').toLowerCase();
    if (v !== 'on' && v !== 'off' && v !== 'system') {
      return err('Usage: motion on|off|system   (off = reduced-motion mode)');
    }
    return {
      blocks: [
        text(v === 'off' ? 'Animations off — reduced-motion mode enabled.' : v === 'on' ? 'Animations on.' : 'Animations now follow your system setting.', 'muted'),
      ],
      effects: [{ type: 'motion', value: v }],
    };
  },
};

const recruiter: Command = {
  name: 'recruiter',
  aliases: ['exit', 'quit'],
  group: 'System',
  summary: 'Switch to Recruiter Mode (plain CV layout)',
  run: () => ({
    blocks: [text('Switching to Recruiter Mode…', 'muted')],
    effects: [{ type: 'set-mode', mode: 'recruiter' }],
  }),
};

const echo: Command = {
  name: 'echo',
  group: 'System',
  summary: 'Print text (no expansion, no shell)',
  hidden: true,
  run: (args) => out(text(args.join(' '))),
};

const help: Command = {
  name: 'help',
  aliases: ['?', 'commands'],
  group: 'System',
  summary: 'Show all commands',
  run: () => {
    const groups: Command['group'][] = ['Profile', 'Navigate', 'Challenge', 'System', 'Special'];
    const blocks: Block[] = [
      { type: 'heading', text: 'NOA OS · commands' },
      text('Everything here is a real, sandboxed command. Nothing touches your computer.', 'muted'),
    ];
    for (const g of groups) {
      const cmds = REGISTRY.filter((c) => c.group === g && !c.hidden);
      if (!cmds.length) continue;
      blocks.push(text(g.toUpperCase(), 'accent'));
      blocks.push({ type: 'kv', rows: cmds.map((c) => ({ k: c.usage ?? c.name, v: c.summary })) });
    }
    blocks.push(text('KEYBOARD', 'accent'));
    blocks.push({
      type: 'kv',
      rows: [
        { k: 'Tab', v: 'autocomplete commands and paths' },
        { k: '↑ / ↓', v: 'browse command history' },
        { k: 'Ctrl+L', v: 'clear the screen' },
        { k: 'Ctrl+C', v: 'cancel the current line' },
        { k: 'Ctrl+U', v: 'delete the whole line' },
        { k: 'Alt+M', v: 'toggle Terminal / Recruiter mode' },
      ],
    });
    blocks.push(text('Prefer not to type? Tap a suggestion below the prompt, or switch to Recruiter Mode at the top.', 'muted'));
    blocks.push(text('A few commands are not listed. Curious people find them.', 'muted'));
    blocks.push({ type: 'suggest', commands: ['whoami', 'projects', 'challenge', 'resume'] });
    return { blocks };
  },
};

/* ─────────────────────────────── special ─────────────────────────────── */

const sudo: Command = {
  name: 'sudo',
  group: 'Special',
  summary: 'sudo hire noa',
  usage: 'sudo hire noa',
  run(args) {
    const joined = args.map((a) => a.toLowerCase()).join(' ');
    if (joined !== 'hire noa') {
      return err(`sudo: this sandbox grants exactly one privilege: sudo hire noa`);
    }
    return {
      blocks: [
        {
          type: 'sequence',
          steps: [
            { text: 'Checking candidate permissions...', tone: 'muted', delay: 0 },
            { text: 'Curiosity:', badge: 'VERIFIED', delay: 650 },
            { text: 'Problem-solving mindset:', badge: 'VERIFIED', delay: 520 },
            { text: 'Willingness to learn:', badge: 'VERIFIED', delay: 520 },
            { text: 'Professional experience:', badge: 'STILL BUILDING', tone: 'warn', delay: 520 },
            { text: 'Recommendation: GIVE HER A TECHNICAL CHALLENGE', tone: 'accent', delay: 700 },
          ],
          after: [
            {
              type: 'actions',
              items: [
                { label: 'Send her a challenge', href: CHALLENGE_MAILTO, primary: true },
                { label: 'Copy email', copy: candidate.email },
                ...resumeActions().slice(0, 1),
              ],
            },
          ],
        },
      ],
      effects: [{ type: 'pulse', strength: 1 }],
    };
  },
};

const coffee: Command = {
  name: 'coffee',
  group: 'Special',
  summary: 'Brew something',
  hidden: true,
  run: () =>
    out(
      text('$ coffee --brew --strong', 'muted'),
      text('Heating water ............ OK\nGrinding beans ........... OK\nReading the logs first ... OK'),
      text('exit status 0. Caffeine is a dependency, not a substitute for reading the logs.', 'accent'),
    ),
};

const motivation: Command = {
  name: 'motivation',
  group: 'Special',
  summary: 'Why security?',
  hidden: true,
  run: () =>
    out(
      text('Why security?', 'accent'),
      text(
        "Because I like understanding how things really work — and then how they fail.\nI'd rather find the weak point in an authorized lab than watch it get found somewhere else.",
      ),
      text('Curiosity first. Zero shortcuts.', 'muted'),
    ),
};

const whyYou: Command = {
  name: 'why-you',
  aliases: ['whyyou'],
  group: 'Special',
  summary: 'Why should we talk?',
  hidden: true,
  run: () =>
    out(
      { type: 'heading', text: 'Why talk to Noa?' },
      {
        type: 'list',
        bullet: '+',
        items: [
          'Fundamentals first: Linux, TCP/IP, DNS and HTTP.',
          'Documented curiosity: four flags solved in a recruitment challenge.',
          'Honest about the level: junior, still building, and says so.',
          'Works only in authorized labs and treats scope as step zero.',
          'Learns by building — this site is a project, not a template.',
        ],
      },
      { type: 'actions', items: [{ label: 'Give her a challenge', href: CHALLENGE_MAILTO, primary: true }, { label: 'Projects', command: 'projects' }] },
    ),
};

const man: Command = {
  name: 'man',
  group: 'Special',
  summary: 'Manual pages (try: man noa)',
  usage: 'man <noa|command>',
  run(args) {
    if (args.length === 0) return err('What manual page do you want? Try: man noa');
    const topic = args[0].toLowerCase();
    if (topic === 'noa') {
      return out(
        text('NOA(1)                     Candidate Manual                     NOA(1)', 'muted'),
        text('NAME', 'accent'),
        text(`       noa - junior cybersecurity candidate, ${candidate.location}`),
        text('SYNOPSIS', 'accent'),
        text('       noa [--curious] [--junior] [--no-shortcuts] [--challenge=<yours>]'),
        text('DESCRIPTION', 'accent'),
        text(
          '       Computer science student looking for a first role in security, Linux or\n       technical support. Investigates before concluding. Documents what she finds.',
        ),
        text('OPTIONS', 'accent'),
        text(
          '       --curious         enabled by default, cannot be disabled\n       --junior          honest about experience level\n       --no-shortcuts    reads the logs first\n       --challenge=...   accepts technical challenges (recommended)',
        ),
        text('FILES', 'accent'),
        text('       ~/resume.pdf  the CV      ~/contact.txt  how to reach her'),
        text('BUGS', 'accent'),
        text('       Professional experience: still building. Report fixes by hiring.'),
        text('SEE ALSO', 'accent'),
        text('       whoami(1), projects(1), challenge(1), sudo(8)'),
        { type: 'actions', items: [{ label: 'Give her a challenge', href: CHALLENGE_MAILTO, primary: true }] },
      );
    }
    const cmd = findCommand(topic);
    if (cmd) {
      return out(
        text(`${cmd.name.toUpperCase()}(1)`, 'muted'),
        text(`${cmd.name} — ${cmd.summary}`),
        ...(cmd.usage ? [text(`usage: ${cmd.usage}`, 'accent')] : []),
        ...(cmd.aliases?.length ? [text(`aliases: ${cmd.aliases.join(', ')}`, 'muted')] : []),
      );
    }
    return err(`No manual entry for ${args[0]}`);
  },
};

/* ─────────────────────────────── registry ─────────────────────────────── */

export const REGISTRY: Command[] = [
  whoami, skills, projects, experience, education, contact, resume, neofetch,
  ls, cd, pwd, cat,
  challenge, hintCmd, submit, base64,
  help, clear, history, motion, recruiter, echo,
  sudo, coffee, motivation, whyYou, man,
];

export function findCommand(name: string): Command | undefined {
  const n = name.toLowerCase();
  return REGISTRY.find((c) => c.name === n || c.aliases?.includes(n));
}

/** All names a visitor may type (for autocomplete and typo suggestions). */
export const visibleCommandNames = (): string[] =>
  REGISTRY.filter((c) => !c.hidden).map((c) => c.name);

export const allCommandNames = (): string[] =>
  REGISTRY.flatMap((c) => [c.name, ...(c.aliases ?? [])]);

/** Real programs a visitor might try. They are refused politely — never run. */
export const REFUSED: Record<string, string> = {
  nmap: "nmap isn't installed in this sandbox — and I only scan authorized labs. See what I use: skills",
  rm: "rm: nice try. This filesystem is read-only. There's nothing to delete, only things to discover.",
  ssh: 'ssh: no network access from this sandbox. To reach me, type: contact',
  curl: 'curl: no network access from this sandbox. To reach me, type: contact',
  wget: 'wget: no network access from this sandbox. To reach me, type: contact',
  python: 'python: no interpreters here — this is a portfolio, not a shell. See: projects',
  python3: 'python3: no interpreters here — this is a portfolio, not a shell. See: projects',
  bash: 'bash: you are already in a sandboxed shell. Type `help` to see what it can do.',
  sh: 'sh: you are already in a sandboxed shell. Type `help` to see what it can do.',
  vim: 'vim: read-only filesystem. (You can quit. That is the hardest part, anyway.)',
  nano: 'nano: read-only filesystem. Use `cat` to read files.',
  touch: 'touch: read-only filesystem.',
  mkdir: 'mkdir: read-only filesystem.',
  mv: 'mv: read-only filesystem.',
  cp: 'cp: read-only filesystem.',
  chmod: 'chmod: read-only filesystem.',
  su: 'su: no other users here. Try: sudo hire noa',
  exploit: 'exploit: no. Authorized labs only. Zero shortcuts.',
};
