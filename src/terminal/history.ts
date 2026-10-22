/** Command history with bash-like navigation (↑ / ↓ and a preserved draft). */

export class CommandHistory {
  private items: string[] = [];
  private cursor = 0; // items.length === "not browsing"
  private draft = '';
  constructor(private readonly max = 200) {}

  get entries(): readonly string[] {
    return this.items;
  }

  /** Records an executed command (ignores blanks and immediate duplicates). */
  push(cmd: string): void {
    const c = cmd.trim();
    if (c && this.items[this.items.length - 1] !== c) {
      this.items.push(c);
      if (this.items.length > this.max) this.items.shift();
    }
    this.reset();
  }

  /** Move to the previous (older) command. `current` is the text being typed. */
  up(current: string): string | null {
    if (this.items.length === 0) return null;
    if (this.cursor === this.items.length) this.draft = current;
    if (this.cursor > 0) this.cursor--;
    return this.items[this.cursor];
  }

  /** Move to the next (newer) command, finally restoring the draft. */
  down(): string | null {
    if (this.cursor >= this.items.length) return null;
    this.cursor++;
    return this.cursor === this.items.length ? this.draft : this.items[this.cursor];
  }

  reset(): void {
    this.cursor = this.items.length;
    this.draft = '';
  }
}
