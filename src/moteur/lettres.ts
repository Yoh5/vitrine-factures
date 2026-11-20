/**
 * « Arrêtée la présente facture à la somme de : Deux mille neuf cent soixante et onze dirhams et vingt centimes »
 * -> 297120 centimes. Sert à CONTRÔLER le total en chiffres, jamais à le remplacer.
 */
const VALEURS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30,
  quarante: 40, cinquante: 50, soixante: 60, septante: 70, huitante: 80, octante: 80, nonante: 90,
};

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Entier écrit en lettres ; null si un mot est inconnu. */
export function entierEnLettres(texte: string): number | null {
  const mots = sansAccents(texte.toLowerCase()).replace(/-/g, ' ').split(/\s+/).filter((m) => m && m !== 'et');
  if (!mots.length) return null;
  let total = 0;
  let courant = 0;
  for (let i = 0; i < mots.length; i++) {
    const m = mots[i];
    if (m === 'cent' || m === 'cents') { courant = (courant || 1) * 100; continue; }
    if (m === 'mille') { total += (courant || 1) * 1000; courant = 0; continue; }
    if (m === 'million' || m === 'millions') { total += (courant || 1) * 1_000_000; courant = 0; continue; }
    if (m === 'quatre' && (mots[i + 1] === 'vingt' || mots[i + 1] === 'vingts')) { courant += 80; i++; continue; }
    if (!(m in VALEURS)) return null;
    courant += VALEURS[m];
  }
  return total + courant;
}

/** Cherche « … somme de [:] <lettres> dirhams [et <lettres> centimes] » ; null si absent ou illisible. */
export function sommeEnLettres(texte: string): { texte: string; centimes: number } | null {
  const t = texte.replace(/\s+/g, ' ');
  const m = t.match(/somme\s+de\s*:?\s*(.+?)\s+(?:dirhams?|dhs?)\b(?:\s+(?:et\s+)?(.+?)\s+centimes?\b)?/i);
  if (!m) return null;
  const dh = entierEnLettres(m[1]);
  if (dh === null) return null;
  const cts = m[2] ? entierEnLettres(m[2]) : 0;
  if (cts === null || cts > 99) return null;
  const fin = (m.index ?? 0) + m[0].length;
  return { texte: t.slice(m.index ?? 0, fin).replace(/^somme\s+de\s*:?\s*/i, ''), centimes: dh * 100 + cts };
}
