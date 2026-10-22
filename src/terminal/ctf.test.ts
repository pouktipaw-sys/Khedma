import { describe, expect, it } from 'vitest';
import { FLAG, PAYLOAD, currentStage, initialCtfState, nextHint, submitFlag } from './ctf';
import { Session } from './session';

const run = (s: Session, line: string) => s.execute(line);
const flat = (r: ReturnType<Session['execute']>) =>
  r.blocks.map((b) => (b.type === 'text' ? b.text : '')).join('\n');

describe('CTF state machine', () => {
  it('starts at discover and derives the stage from milestones', () => {
    expect(currentStage(initialCtfState())).toBe('discover');
    expect(currentStage({ ...initialCtfState(), foundHidden: true })).toBe('log');
  });
  it('payload decodes to a message pointing at secret.txt', () => {
    expect(atob(PAYLOAD)).toContain('secret.txt');
  });
  it('progresses through the full happy path', () => {
    const s = new Session();
    run(s, 'challenge');
    expect(s.ctf.started).toBe(true);

    expect(flat(run(s, 'cat secret.txt'))).toMatch(/ACCESS DENIED/);

    expect(flat(run(s, 'ls -a'))).toMatch(/Hidden file discovered/);
    expect(currentStage(s.ctf)).toBe('log');

    expect(flat(run(s, 'cat incident.log'))).toMatch(/Investigation log read/);
    expect(currentStage(s.ctf)).toBe('decode');

    expect(flat(run(s, 'base64 -d .intercepted'))).toContain('secret.txt');
    expect(currentStage(s.ctf)).toBe('flag');

    const secret = flat(run(s, 'cat secret.txt'));
    expect(secret).toContain(FLAG);
    expect(currentStage(s.ctf)).toBe('submit');

    const done = run(s, `submit ${FLAG}`);
    expect(flat(done)).toContain('ACCESS GRANTED.');
    expect(flat(done)).toContain("You've seen how I think.");
    expect(flat(done)).toContain('Now give me a challenge of your own.');
    expect(done.effects).toContainEqual({ type: 'ctf-complete' });
    expect(s.ctf.completed).toBe(true);
  });
  it('keeps the flag locked until the payload is decoded', () => {
    const s = new Session();
    run(s, 'ls -a');
    run(s, 'cat incident.log');
    expect(flat(run(s, 'cat secret.txt'))).not.toContain(FLAG);
    expect(flat(run(s, 'base64 -d aGVsbG8='))).toContain('hello'); // other Base64 does not unlock
    expect(flat(run(s, 'cat secret.txt'))).not.toContain(FLAG);
  });
  it('decodes the payload given as literal text too', () => {
    const s = new Session();
    run(s, `b64 -d ${PAYLOAD}`);
    expect(s.ctf.decoded).toBe(true);
  });
  it('is order-insensitive for the first milestones', () => {
    const s = new Session();
    run(s, 'cat incident.log');
    expect(s.ctf.readLog).toBe(true);
    expect(currentStage(s.ctf)).toBe('discover');
    run(s, 'ls -a');
    expect(currentStage(s.ctf)).toBe('decode');
  });
  it('does not advance on plain ls or ls -a in the wrong directory', () => {
    const s = new Session();
    run(s, 'ls');
    run(s, 'ls -a skills');
    expect(s.ctf.foundHidden).toBe(false);
  });
  it('rejects wrong flags and never completes on them', () => {
    const s = new Session();
    const r = run(s, 'submit ROOT{WRONG}');
    expect(flat(r)).toMatch(/Not the flag/);
    expect(r.effects ?? []).toHaveLength(0);
    expect(s.ctf.completed).toBe(false);
    expect(submitFlag(s.ctf, ` ${FLAG} `).correct).toBe(true);
    expect(flat(run(s, 'submit'))).toMatch(/missing flag/);
  });
  it('gives progressive hints that end with the exact command', () => {
    let st = initialCtfState();
    const levels: string[] = [];
    for (let i = 0; i < 4; i++) {
      const h = nextHint(st);
      st = h.state;
      levels.push(h.hint);
    }
    expect(levels[2]).toContain('ls -a');
    expect(levels[3]).toBe(levels[2]);
    expect(st.hintsUsed).toBe(4);
  });
  it('can be reset and replayed; completion is announced once', () => {
    const s = new Session();
    s.ctf = { ...s.ctf, completed: true };
    expect(flat(run(s, 'challenge'))).toMatch(/already completed/);
    run(s, 'challenge reset');
    expect(s.ctf.completed).toBe(false);
  });
  it('is fully optional: profile commands work at any point', () => {
    const s = new Session();
    run(s, 'challenge');
    for (const c of ['resume', 'contact', 'projects', 'whoami']) expect(run(s, c).ok).toBe(true);
  });
});
