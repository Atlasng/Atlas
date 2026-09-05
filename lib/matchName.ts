function normalize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// Loose match: true if most of the significant words in one name show up
// in the other. Tolerant of middle names, reordering, and minor typos in
// spacing, since bank account names and NIN records are rarely formatted
// identically.
export function namesLikelyMatch(a: string, b: string): boolean {
  const wordsA = normalize(a);
  const wordsB = normalize(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const setB = new Set(wordsB);
  const overlap = wordsA.filter((w) => setB.has(w)).length;
  const smaller = Math.min(wordsA.length, wordsB.length);

  return overlap >= Math.max(2, Math.ceil(smaller * 0.6));
}
