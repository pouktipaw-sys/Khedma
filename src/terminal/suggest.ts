/** "Did you mean…?" helpers. */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Up to `limit` close matches, best first. */
export function closestMatches(input: string, candidates: string[], limit = 3): string[] {
  const q = input.toLowerCase();
  if (!q) return [];
  const maxDist = q.length <= 3 ? 1 : 2;
  return candidates
    .map((c) => {
      const lc = c.toLowerCase();
      const d = lc.startsWith(q) || (q.length >= 3 && lc.includes(q)) ? 0.5 : levenshtein(q, lc);
      return { c, d };
    })
    .filter((x) => x.d <= maxDist)
    .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
    .slice(0, limit)
    .map((x) => x.c);
}
