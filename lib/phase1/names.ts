/**
 * Place names as a reader expects them.
 *
 * Government datasets write names for a register, not a report: schools and
 * hospitals arrive in capitals, and tourism entries carry the page title they
 * were copied from ("Marina Bay Singapore: Attractions & Things to do"). Pure,
 * so both the server lookups and the printed report can share it.
 */

/* These stay in capitals when the rest is brought down to ordinary case. */
const KEEP_UPPER = new Set(['MRT', 'LRT', 'CHIJ', 'ACS', 'SJI', 'SST', 'NUS', 'NTU', 'ITE', 'II', 'III', 'CC', 'PG', 'SAFRA', 'KK', 'NUH', 'SGH', 'TTSH', 'IMH', 'NHG', 'JC']);

/* Joining words stay lower case unless they open the name: "School of the Arts". */
const SMALL = new Set(['and', 'of', 'the', 'at', 'for', 'in', 'on', 'by', 'to', 'de', 'la']);

export function titleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[a-z0-9.']+/g, (word, offset: number) => {
      if (KEEP_UPPER.has(word.toUpperCase().replace(/[.']/g, ''))) return word.toUpperCase();
      if (offset > 0 && SMALL.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
}

export function plainName(raw: string): string {
  let name = raw.trim();
  /* Capitals, or a name somebody title-cased word by word ("Women's And Children's"). */
  if (name === name.toUpperCase() || /\s(And|Of|The)\s/.test(name)) name = titleCase(name);
  name = name
    .replace(/\s*:\s.*$/, '')
    .replace(/\s*&\s*Places of Interest$/i, '')
    .replace(/\s+Singapore$/i, '')
    .replace(/[\s,;:\u2013-]+$/, '')
    .trim();
  return name || raw.trim();
}
