/** Shared terminal types: what commands return and how the UI renders it. */

export type Tone = 'default' | 'muted' | 'accent' | 'error' | 'warn';

export interface LsEntry {
  name: string;
  type: 'dir' | 'file';
  /** Absolute path, so the UI can turn the entry into a `cd` / `cat` click. */
  path: string;
  /** Long-format metadata (ls -l). */
  perms?: string;
  size?: string;
}

export interface Action {
  label: string;
  /** Opens a link (mailto:, /file.pdf, https://…). */
  href?: string;
  external?: boolean;
  download?: string;
  /** Runs a terminal command when clicked. */
  command?: string;
  /** Copies text to the clipboard when clicked. */
  copy?: string;
  primary?: boolean;
}

export interface SequenceStep {
  text: string;
  /** Right-aligned status badge, e.g. VERIFIED. */
  badge?: string;
  tone?: Tone;
  /** Delay before this step appears, in ms. */
  delay?: number;
}

export type Block =
  | { type: 'text'; text: string; tone?: Tone }
  | { type: 'heading'; text: string }
  | { type: 'kv'; rows: { k: string; v: string }[] }
  | { type: 'list'; items: string[]; bullet?: string }
  | { type: 'ls'; entries: LsEntry[]; long?: boolean }
  | { type: 'actions'; items: Action[] }
  | { type: 'tags'; groups: { title: string; items: string[]; note?: string }[] }
  | { type: 'project'; id: string }
  | { type: 'projectIndex' }
  | { type: 'neofetch'; art: string; rows: { k: string; v: string }[] }
  | { type: 'sequence'; steps: SequenceStep[]; after?: Block[] }
  | { type: 'suggest'; commands: string[] };

export type Effect =
  | { type: 'clear' }
  | { type: 'open-resume' }
  | { type: 'set-mode'; mode: 'terminal' | 'recruiter' }
  | { type: 'ctf-complete' }
  | { type: 'motion'; value: 'on' | 'off' | 'system' }
  | { type: 'pulse'; strength?: number };

export interface CommandOutput {
  blocks: Block[];
  effects?: Effect[];
}

export interface ExecResult extends CommandOutput {
  /** Raw line that was executed (trimmed). */
  input: string;
  /** Working directory the command ran in (for the echoed prompt). */
  cwd: string;
  /** False when the command was unknown or failed — used for styling/tests. */
  ok: boolean;
}

export const out = (...blocks: Block[]): CommandOutput => ({ blocks });
export const text = (t: string, tone: Tone = 'default'): Block => ({ type: 'text', text: t, tone });
export const err = (t: string): CommandOutput => ({ blocks: [{ type: 'text', text: t, tone: 'error' }] });
