export function normalizePersonName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NAME_PARTICLES = new Set([
  "da",
  "de",
  "del",
  "della",
  "der",
  "di",
  "dos",
  "du",
  "el",
  "la",
  "le",
  "los",
  "van",
  "von",
]);

export function normalizedNameTokens(name: string) {
  return normalizePersonName(name)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !NAME_PARTICLES.has(token));
}

export function initialsMatch(left: string, right: string) {
  return left[0] === right[0];
}
