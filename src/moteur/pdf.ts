/**
 * Texte d'un PDF, avec la position de chaque morceau (pdf.js). Même code dans le navigateur et dans les tests :
 * on passe le module pdf.js chargé par l'appelant.
 */
export type Morceau = { texte: string; x0: number; x1: number; y: number; taille: number };
export type Ligne = { page: number; y: number; texte: string; morceaux: Morceau[] };
export type Page = { numero: number; largeur: number; hauteur: number; lignes: Ligne[] };

// Le strict nécessaire de l'API pdf.js utilisée ici.
type PdfJs = {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean; useSystemFonts?: boolean }): { promise: Promise<PdfDoc> };
};
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };
type PdfPage = {
  getViewport(o: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: unknown[] }>;
};
type Item = { str: string; transform: number[]; width: number; height: number };

/** Regroupe les morceaux d'une page en lignes (même hauteur à 3 points près), de gauche à droite. */
export function enLignes(numero: number, morceaux: Morceau[]): Ligne[] {
  const tries = [...morceaux].sort((a, b) => b.y - a.y || a.x0 - b.x0);
  const lignes: Ligne[] = [];
  for (const m of tries) {
    const l = lignes.find((x) => Math.abs(x.y - m.y) <= 3);
    if (l) l.morceaux.push(m);
    else lignes.push({ page: numero, y: m.y, texte: '', morceaux: [m] });
  }
  for (const l of lignes) {
    l.morceaux.sort((a, b) => a.x0 - b.x0);
    l.texte = l.morceaux.map((m) => m.texte).join('  ');
  }
  return lignes.sort((a, b) => b.y - a.y);
}

export async function lirePdf(pdfjs: PdfJs, octets: Uint8Array): Promise<Page[]> {
  const doc = await pdfjs.getDocument({ data: octets, isEvalSupported: false }).promise;
  const pages: Page[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const vue = p.getViewport({ scale: 1 });
    const contenu = await p.getTextContent();
    const morceaux: Morceau[] = [];
    for (const brut of contenu.items) {
      const it = brut as Item;
      if (typeof it.str !== 'string' || !it.str.trim()) continue;
      const [, , , d, e, f] = it.transform;
      morceaux.push({ texte: it.str.trim(), x0: e, x1: e + it.width, y: f, taille: Math.abs(d) || it.height });
    }
    pages.push({ numero: n, largeur: vue.width, hauteur: vue.height, lignes: enLignes(n, morceaux) });
  }
  return pages;
}
