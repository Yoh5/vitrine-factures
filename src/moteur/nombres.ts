/**
 * Montants écrits comme sur les factures marocaines : « 1 234,50 », « 1.234,50 », « 1,234.50 », « 1234.50 »,
 * suivis ou non de « DH », « MAD », « Dhs ». On travaille en centimes entiers : pas d'arrondi de flottant.
 */

const ESPACES = /[\s  ]/g;

/** « 1 234,50 » -> 123450 (centimes) ; null si ce n'est pas un montant. */
export function centimes(brut: string): number | null {
  let s = brut.trim().replace(/(MAD|DHS?|DH|dirhams?)\.?$/i, '').trim();
  const negatif = /^[-−–]\s*/.test(s);
  s = s.replace(/^[-−–]\s*/, '');
  if (!/^\d[\d\s  .,]*$/.test(s)) return null;
  s = s.replace(ESPACES, '');
  const dernierPoint = s.lastIndexOf('.');
  const derniereVirgule = s.lastIndexOf(',');
  let entier: string;
  let dec = '';
  if (dernierPoint >= 0 && derniereVirgule >= 0) {
    // les deux : le dernier séparateur est le décimal
    const sep = dernierPoint > derniereVirgule ? '.' : ',';
    const autre = sep === '.' ? ',' : '.';
    const [e, d] = [s.slice(0, s.lastIndexOf(sep)), s.slice(s.lastIndexOf(sep) + 1)];
    if (!/^\d{1,2}$/.test(d)) return null;
    if (!new RegExp(`^\\d{1,3}(\\${autre}\\d{3})*$`).test(e)) return null;
    entier = e.split(autre).join(''); dec = d;
  } else if (dernierPoint >= 0 || derniereVirgule >= 0) {
    const sep = dernierPoint >= 0 ? '.' : ',';
    const morceaux = s.split(sep);
    const fin = morceaux[morceaux.length - 1];
    if (morceaux.length === 2 && /^\d{1,2}$/.test(fin)) { entier = morceaux[0]; dec = fin; }        // 1234,5 / 1234,50
    else if (morceaux.slice(1).every((m) => m.length === 3) && morceaux[0].length <= 3) entier = morceaux.join(''); // 12.345
    else return null;
  } else {
    entier = s;
  }
  if (!/^\d+$/.test(entier)) return null;
  const c = Number(entier) * 100 + Number((dec + '00').slice(0, 2));
  return negatif ? -c : c;
}

/**
 * Montants contenus dans UN morceau de texte du PDF (jamais à cheval sur deux morceaux : « 40 » puis « 120,00 »
 * dans deux colonnes ne doivent pas devenir 40 120,00).
 * Seuls les nombres à décimales, ou suivis d'une devise, sont des montants ; « 40 », « 20 % » n'en sont pas.
 */
export function montantsDans(texte: string): { valeur: number; brut: string }[] {
  const out: { valeur: number; brut: string }[] = [];
  const re = /[-−–]?\s?\d{1,3}(?:[\s  .,]\d{3})*(?:[.,]\d{2})(?!\d)|[-−–]?\s?\d+(?:[.,]\d{2})(?!\d)|\d{1,3}(?:[\s  .]\d{3})*\s?(?:DH|MAD|Dhs)\b/gi;
  for (const m of texte.matchAll(re)) {
    const brut = m[0].trim();
    // un pourcentage n'est pas un montant
    const apres = texte.slice((m.index ?? 0) + m[0].length).trimStart();
    if (apres.startsWith('%')) continue;
    const v = centimes(brut);
    if (v !== null) out.push({ valeur: v, brut });
  }
  return out;
}

export const enDirhams = (c: number) => (c / 100).toFixed(2);
export const egal = (a: number | null | undefined, b: number | null | undefined, tolerance = 1) =>
  a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(a - b) <= tolerance;
