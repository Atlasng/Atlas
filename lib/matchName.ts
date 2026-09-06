function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// Order-sensitive: the bank account name must start with the first name and
// end with the last name — first name, then (optionally) middle name
// somewhere in between, then last name. A name in the wrong order (e.g.
// surname-first) is rejected, since that's a different name arrangement
// than what the seller typed.
export function firstLastNameMatch(
  firstName: string,
  middleName: string | undefined,
  lastName: string,
  accountName: string
): boolean {
  const words = normalizeWords(accountName);
  if (words.length < 2) return false;

  const first = normalizeWord(firstName);
  const last = normalizeWord(lastName);
  if (!first || !last) return false;

  if (words[0] !== first) return false;
  if (words[words.length - 1] !== last) return false;

  const middleTrimmed = middleName?.trim();
  if (middleTrimmed) {
    const middle = normalizeWord(middleTrimmed);
    const middleWords = words.slice(1, -1);
    if (!middleWords.includes(middle)) return false;
  }

  return true;
}
