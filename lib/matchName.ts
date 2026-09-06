function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

// First name AND last name must each appear as a whole word in the bank
// account name. Middle name is intentionally not checked — not compulsory.
export function firstLastNameMatch(
  firstName: string,
  lastName: string,
  accountName: string
): boolean {
  const accountWords = accountName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const first = normalizeWord(firstName);
  const last = normalizeWord(lastName);

  if (!first || !last) return false;

  return accountWords.includes(first) && accountWords.includes(last);
}
