/**
 * Mini-CTF state machine.
 *
 * Story: a file was left in the candidate's home directory. Investigate it.
 *   1. discover — `ls -a` reveals a hidden file
 *   2. log      — `cat incident.log`
 *   3. decode   — `base64 -d .intercepted`
 *   4. flag     — `cat secret.txt` now reveals the flag
 *   5. submit   — `submit ROOT{…}` unlocks the special ending
 *
 * The first three milestones are order-insensitive (a curious visitor who
 * reads the log first is not punished). The flag is original and fictional.
 */

export const FLAG = 'ROOT{CURIOSITY_UNLOCKS_OPPORTUNITY}';

export const HIDDEN_FILE = '.intercepted';

/** Plaintext hidden inside the Base64 payload. */
export const DECODED_MESSAGE =
  'Well spotted, investigator. The flag was never hidden - only unread. Open secret.txt: it will answer you now.';

export const PAYLOAD = btoa(DECODED_MESSAGE);

export type CtfStage = 'discover' | 'log' | 'decode' | 'flag' | 'submit' | 'complete';

export interface CtfState {
  started: boolean;
  foundHidden: boolean;
  readLog: boolean;
  decoded: boolean;
  readSecret: boolean;
  completed: boolean;
  hintsUsed: number;
  /** Hints requested per stage (progressive hints). */
  hintLevel: Partial<Record<CtfStage, number>>;
}

export const initialCtfState = (): CtfState => ({
  started: false,
  foundHidden: false,
  readLog: false,
  decoded: false,
  readSecret: false,
  completed: false,
  hintsUsed: 0,
  hintLevel: {},
});

export const STAGE_ORDER: CtfStage[] = ['discover', 'log', 'decode', 'flag', 'submit', 'complete'];

export const STAGE_LABEL: Record<CtfStage, string> = {
  discover: 'Find the hidden file',
  log: 'Read the investigation log',
  decode: 'Decode the message',
  flag: 'Find the flag',
  submit: 'Submit the flag',
  complete: 'Access granted',
};

export function currentStage(s: CtfState): CtfStage {
  if (s.completed) return 'complete';
  if (!s.foundHidden) return 'discover';
  if (!s.readLog) return 'log';
  if (!s.decoded) return 'decode';
  if (!s.readSecret) return 'flag';
  return 'submit';
}

/** 1-based number of the current step (for "Step 2/5"). */
export const stageNumber = (s: CtfState): number =>
  Math.min(STAGE_ORDER.indexOf(currentStage(s)) + 1, 5);

export const secretUnlocked = (s: CtfState): boolean => s.decoded;

const HINTS: Record<Exclude<CtfStage, 'complete'>, [string, string, string]> = {
  discover: [
    'Files whose names start with a dot are hidden from a normal listing.',
    '`ls` has an option that shows hidden files too: -a ("all").',
    'Type: ls -a   — then look for a name that starts with a dot.',
  ],
  log: [
    'Your home folder contains a log written by whoever investigated this.',
    '`cat` prints a file. The log is called incident.log.',
    'Type: cat incident.log',
  ],
  decode: [
    'The hidden file holds a long string of letters and digits ending in "=". That is Base64 — a way of writing text that looks scrambled.',
    'A built-in safe command can decode it: base64 -d <file-or-text>.',
    `Type: base64 -d ${HIDDEN_FILE}`,
  ],
  flag: [
    'The decoded message tells you which file to open next.',
    'It is a file you may already have seen. It was locked until now.',
    'Type: cat secret.txt',
  ],
  submit: [
    'A flag looks like ROOT{SOME_WORDS}. You found one in secret.txt.',
    'Hand it in with the submit command followed by the flag.',
    'Type: submit ROOT{...}  (copy the flag exactly, braces included).',
  ],
};

export type CtfEvent =
  | { type: 'list'; path: string; all: boolean }
  | { type: 'cat'; path: string }
  | { type: 'decode'; payload: string };

/** Returns a progress message when an event completes a milestone. */
export interface CtfProgress {
  milestone: 'discover' | 'log' | 'decode' | 'flag';
  message: string;
}

export function reduceCtf(
  state: CtfState,
  event: CtfEvent,
  paths: { home: string; log: string; secret: string },
): { state: CtfState; progress: CtfProgress | null } {
  if (state.completed) return { state, progress: null };
  const next: CtfState = { ...state };
  let progress: CtfProgress | null = null;

  if (event.type === 'list' && event.all && event.path === paths.home && !next.foundHidden) {
    next.foundHidden = true;
    progress = {
      milestone: 'discover',
      message: `Hidden file discovered: ${HIDDEN_FILE}. Next: read the investigation log.`,
    };
  } else if (event.type === 'cat' && event.path === paths.log && !next.readLog) {
    next.readLog = true;
    progress = {
      milestone: 'log',
      message: 'Investigation log read. Next: decode the intercepted payload.',
    };
  } else if (event.type === 'decode' && !next.decoded && event.payload.trim() === PAYLOAD) {
    next.decoded = true;
    progress = {
      milestone: 'decode',
      message: 'Payload decoded. The message points to a file. Go and read it.',
    };
  } else if (event.type === 'cat' && event.path === paths.secret && next.decoded && !next.readSecret) {
    next.readSecret = true;
    progress = {
      milestone: 'flag',
      message: 'Flag found. Next: submit it with `submit ROOT{...}`.',
    };
  }
  return { state: next, progress };
}

export const startCtf = (s: CtfState): CtfState => (s.started ? s : { ...s, started: true });

export const resetCtf = (): CtfState => initialCtfState();

/** Checks a submission. Case-sensitive on the content, tolerant of whitespace. */
export function checkFlag(submission: string): boolean {
  return submission.trim() === FLAG;
}

export function submitFlag(state: CtfState, submission: string): { state: CtfState; correct: boolean } {
  if (state.completed) return { state, correct: true };
  if (!checkFlag(submission)) return { state, correct: false };
  return { state: { ...state, started: true, completed: true }, correct: true };
}

/** Progressive hint for the current stage. Level goes 1→3 then stays at 3. */
export function nextHint(state: CtfState): { state: CtfState; hint: string; level: number; stage: CtfStage } {
  const stage = currentStage(state);
  if (stage === 'complete') {
    return { state, hint: 'Challenge complete. No hints needed — you already got there.', level: 0, stage };
  }
  const level = Math.min((state.hintLevel[stage] ?? 0) + 1, 3);
  return {
    state: {
      ...state,
      started: true,
      hintsUsed: state.hintsUsed + 1,
      hintLevel: { ...state.hintLevel, [stage]: level },
    },
    hint: HINTS[stage][level - 1],
    level,
    stage,
  };
}

/** The single command a visitor should try next (used for suggestion chips). */
export function nextCommand(state: CtfState): string {
  switch (currentStage(state)) {
    case 'discover':
      return 'ls -a';
    case 'log':
      return 'cat incident.log';
    case 'decode':
      return `base64 -d ${HIDDEN_FILE}`;
    case 'flag':
      return 'cat secret.txt';
    case 'submit':
      return 'submit ROOT{...}';
    default:
      return 'contact';
  }
}

export const INCIDENT_LOG = `INCIDENT LOG · case 0042 · (fictional training scenario)
────────────────────────────────────────────────────────
[00:00:01] sentinel : new file appeared in /home/noa
[00:00:02] sentinel : file name begins with a dot, so a plain 'ls' does not show it
[00:00:04] analyst  : contents look like Base64 (letters, digits, + / and a trailing =)
[00:00:05] analyst  : the built-in decoder is safe to use:  base64 -d <file or text>
[00:00:07] analyst  : decoding is not hacking. It only changes how text is written.
[00:00:09] sentinel : secret.txt is locked until the payload has been decoded
[00:00:10] analyst  : once you have the flag, hand it in with:  submit ROOT{...}
────────────────────────────────────────────────────────
-- end of log --
Stuck? Type 'hint' at any time. No technical background needed.`;

export const SECRET_LOCKED = `secret.txt
──────────
ACCESS DENIED. Clearance level: insufficient.

Something in this folder is still waiting to be understood.
Investigate first. Type 'challenge' if you want a guided start.`;

export const secretUnlockedText = (): string => `secret.txt
──────────
CLEARANCE ACCEPTED.

${FLAG}

Hand it in:  submit ${FLAG}`;
