/**
 * What to call someone. Client-safe.
 *
 * The CEA register records a legal name with the person's usual name in
 * brackets — "LI MINGHONG (MICHELLE LI)", "MOHAMED RAHIMATULLAH S/O S M IBRAHIM
 * (MOHD)". Singapore names commonly lead with the family name, so the first
 * word of the legal name is often the wrong word to greet someone with. The
 * bracketed name is the one they chose; without one, the whole name is safer
 * than a guess at which part is the given name.
 */

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()) : s;

/** The name to address a person by: the bracketed usual name, else the full name. */
export function usualName(registerName: string): string {
  const bracket = /\(([^)]+)\)\s*$/.exec(registerName)?.[1]?.trim();
  if (bracket) {
    const name = titleCase(bracket);
    // "Michelle Li" → "Michelle"; a single-word usual name stays as it is.
    return name.split(/\s+/)[0] || name;
  }
  return titleCase(registerName.trim());
}
