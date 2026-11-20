/**
 * Lecture d'une facture ou d'un devis marocain, puis VÉRIFICATION.
 * Règle : une valeur qui ne se vérifie pas est signalée, jamais corrigée ni devinée.
 * Chaque valeur garde l'endroit du PDF où elle a été lue (page, ligne, position).
 */
import type { Ligne, Morceau, Page } from './pdf';
import { centimes, egal, montantsDans } from './nombres';
import { sommeEnLettres } from './lettres';

export type Source = { page: number; y: number; x0: number; x1: number; texte: string };
export type Alerte = { code: CodeAlerte; message: string; source?: Source };
export type CodeAlerte =
  | 'document_scanne' | 'type_inconnu' | 'numero_introuvable' | 'date_introuvable'
  | 'ht_introuvable' | 'tva_introuvable' | 'ttc_introuvable' | 'ttc_incoherent' | 'tva_incoherente'
  | 'taux_inhabituel' | 'lignes_differentes' | 'ligne_incoherente' | 'lettres_differentes'
  | 'ice_invalide' | 'ice_introuvable';

export type LigneFacture = { designation: string; quantite: number | null; prixUnitaire: number | null; montant: number; source: Source };
export type Lecture = {
  type: 'facture' | 'devis' | 'avoir' | null;
  numero: string | null;
  date: string | null;                  // AAAA-MM-JJ
  fournisseur: string | null;
  iceFournisseur: string | null;
  client: string | null;
  iceClient: string | null;
  ht: number | null;                    // centimes
  remise: number | null;
  tva: { taux: number; montant: number }[];
  ttc: number | null;
  devise: 'MAD';
  lettres: { texte: string; centimes: number; accord: boolean } | null;
  lignes: LigneFacture[];
  sources: Partial<Record<'type' | 'numero' | 'date' | 'fournisseur' | 'iceFournisseur' | 'client' | 'iceClient' | 'ht' | 'ttc' | 'lettres' | 'remise', Source>>;
  sourcesTva: Source[];
  alertes: Alerte[];
  /** « verifiee » : tous les contrôles passent ; « a_revoir » : au moins une alerte. */
  statut: 'verifiee' | 'a_revoir';
};

export const TAUX_MAROC = [20, 14, 10, 7];
const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const src = (l: Ligne, m?: Morceau): Source => ({
  page: l.page, y: l.y, x0: m ? m.x0 : l.morceaux[0].x0, x1: m ? m.x1 : l.morceaux[l.morceaux.length - 1].x1, texte: m ? m.texte : l.texte,
});
const dh = (c: number) => `${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

/** Montant le plus à droite d'une ligne, morceau par morceau. */
function montantDeLigne(l: Ligne, exclure?: RegExp): { valeur: number; morceau: Morceau } | null {
  for (let i = l.morceaux.length - 1; i >= 0; i--) {
    const m = l.morceaux[i];
    if (exclure && exclure.test(m.texte)) continue;
    const trouves = montantsDans(m.texte);
    if (trouves.length) return { valeur: trouves[trouves.length - 1].valeur, morceau: m };
  }
  return null;
}

// Libellés des totaux (sans accents, minuscules)
// « Base HT » et « Total à payer » ajoutés après la mesure sur le jeu de contrôle (MESURES.md).
const RE_HT = /\b(total|montant|base)\s*(h\.?\s*t\.?|hors\s*tax\w*)(?!\s*\w*\s*(ttc|t\.t\.c))/;
const RE_TTC = /(total|montant)\s*t\.?\s*t\.?\s*c\.?|net\s*a\s*payer|(total|montant|reste)\s*a\s*payer|toutes\s*taxes\s*comprises\s*:/;
const RE_TVA = /\bt\.?\s*v\.?\s*a\.?\b/;
const RE_TOTAL_SEUL = /^\s*total\b(?!.*(h\.?\s*t|hors|brut|t\.?\s*v\.?\s*a|t\.?\s*t\.?\s*c))/;
const RE_REMISE = /\bremise\b|\bescompte\b|\brabais\b/;
const RE_ENTETE_TABLEAU = /d[ée]signation|description|libell[ée]|article/i;

export function lire(pages: Page[]): Lecture {
  const toutes = pages.flatMap((p) => p.lignes);
  const L: Lecture = {
    type: null, numero: null, date: null, fournisseur: null, iceFournisseur: null, client: null, iceClient: null,
    ht: null, remise: null, tva: [], ttc: null, devise: 'MAD', lettres: null, lignes: [], sources: {}, sourcesTva: [],
    alertes: [], statut: 'a_revoir',
  };
  const alerte = (code: CodeAlerte, message: string, source?: Source) => L.alertes.push({ code, message, source });

  const texteTotal = toutes.map((l) => l.texte).join(' ');
  if (texteTotal.replace(/\s/g, '').length < 30) {
    alerte('document_scanne', 'Aucun texte lisible : le document est une image (scan ou photo). Il faut le saisir à la main ou passer par la reconnaissance de texte.');
    return L;
  }

  // ------------------------------------------------ type
  for (const l of toutes) {
    const t = l.texte;
    const m = t.match(/\b(DEVIS|FACTURE|INVOICE|AVOIR)\b/i);
    if (m) {
      const mot = sansAccents(m[1].toLowerCase());
      L.type = mot === 'devis' ? 'devis' : mot === 'avoir' ? 'avoir' : 'facture';
      L.sources.type = src(l);
      break;
    }
  }
  if (!L.type) alerte('type_inconnu', 'Le mot « Facture » ou « Devis » n’apparaît pas : type de document inconnu.');

  // ------------------------------------------------ numéro
  for (const l of toutes) {
    const t = l.texte;
    const m = t.match(/(?:\bN\s?[°º]|\bNo\.|\bnum[ée]ro)\s*:?\s*([A-Z]{0,4}[\s-]?[A-Z]{0,3}\d[\w/-]*)/i)
      ?? t.match(/\b(?:FACTURE|DEVIS|INVOICE)\s+(?!N\s?[°º])([A-Z]{1,4}[\s-]?\d[\w/-]*|\d[\w/-]*\d)/i);
    if (m) { L.numero = m[1].trim(); L.sources.numero = src(l); break; }
  }
  if (!L.numero) alerte('numero_introuvable', 'Numéro de document introuvable.');

  // ------------------------------------------------ date (de préférence sur une ligne qui parle de date)
  const RE_DATE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/;
  const lignesDate = [...toutes.filter((l) => /date|du\s+\d|le\s+\d/i.test(l.texte)), ...toutes];
  for (const l of lignesDate) {
    if (/validit/i.test(l.texte)) continue;
    const m = l.texte.match(RE_DATE);
    if (m) {
      const [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (mo >= 1 && mo <= 12 && j >= 1 && j <= 31) {
        L.date = `${a}-${String(mo).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
        L.sources.date = src(l);
        break;
      }
    }
  }
  if (!L.date) alerte('date_introuvable', 'Date du document introuvable.');

  // ------------------------------------------------ fournisseur : le plus gros texte du haut de la première page
  const p1 = pages[0];
  if (p1) {
    const haut = p1.lignes.filter((l) => l.y > p1.hauteur * 0.7);
    let meilleur: { l: Ligne; m: Morceau } | null = null;
    for (const l of haut) for (const m of l.morceaux) {
      if (/^(facture|devis|invoice|avoir)\b/i.test(m.texte) || /\d{2}\/\d{2}/.test(m.texte) || m.texte.length < 3) continue;
      if (!meilleur || m.taille > meilleur.m.taille) meilleur = { l, m };
    }
    if (meilleur) { L.fournisseur = meilleur.m.texte; L.sources.fournisseur = src(meilleur.l, meilleur.m); }
  }

  // ------------------------------------------------ ICE : 15 chiffres ; client si un mot « client » est au-dessus, dans la même colonne
  const estClient = (l: Ligne, x: number) => {
    if (/client|doit|attention|destinataire/i.test(l.texte)) return true;
    const i = toutes.indexOf(l);
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
      const au = toutes[k];
      if (au.page !== l.page || au.y - l.y > 60) break;
      if (au.morceaux.some((m) => Math.abs(m.x0 - x) < 40 && /^(client|doit|destinataire)\b/i.test(m.texte))) return true;
    }
    return false;
  };
  // Candidats : « client » si l'étiquette Client est au-dessus ; « fournisseur » sûr si la ligne porte RC, IF ou patente.
  type CandIce = { chiffres: string; source: Source; role: 'client' | 'fournisseur' | 'inconnu' };
  const cands: CandIce[] = [];
  for (const l of toutes) {
    for (const m of l.morceaux) {
      for (const r of m.texte.matchAll(/\bICE\s*(?:client)?\s*:?\s*(\d[\d\s]{8,22}\d)/gi)) {
        const chiffres = r[1].replace(/\s/g, '');
        const role = estClient(l, m.x0) ? 'client' : /\b(RC|IF|patente|CNSS)\b/i.test(l.texte) ? 'fournisseur' : 'inconnu';
        if (chiffres.length !== 15) {
          alerte('ice_invalide', `ICE ${role === 'client' ? 'du client' : 'du fournisseur'} à ${chiffres.length} chiffres au lieu de 15 : ${chiffres}.`, src(l, m));
          continue;
        }
        cands.push({ chiffres, source: src(l, m), role });
      }
    }
  }
  const four = cands.find((c) => c.role === 'fournisseur') ?? cands.find((c) => c.role === 'inconnu');
  if (four) { L.iceFournisseur = four.chiffres; L.sources.iceFournisseur = four.source; }
  const cli = cands.find((c) => c.role === 'client') ?? cands.find((c) => c.role === 'inconnu' && c.chiffres !== four?.chiffres);
  if (cli) { L.iceClient = cli.chiffres; L.sources.iceClient = cli.source; }
  if (!L.iceFournisseur && !L.alertes.some((a) => a.code === 'ice_invalide'))
    alerte('ice_introuvable', 'ICE du fournisseur introuvable (mention obligatoire sur une facture au Maroc).');

  // ------------------------------------------------ client : texte après « Client : », « Doit : », « À l'attention de : », ou ligne sous « Client »
  for (let i = 0; i < toutes.length && !L.client; i++) {
    const l = toutes[i];
    const m = l.texte.match(/(?:client|doit|attention\s+de)\s*:\s*(.+?)(?:\s*[-(]?\s*ICE\b.*|\s{2,}.*)?$/i);
    if (m && m[1] && !/^\d/.test(m[1])) { L.client = m[1].trim(); L.sources.client = src(l); break; }
    if (l.morceaux.length === 1 && /^client$/i.test(l.texte.trim()) && toutes[i + 1]) {
      const sous = toutes[i + 1].morceaux.find((x) => Math.abs(x.x0 - l.morceaux[0].x0) < 20);
      if (sous) { L.client = sous.texte; L.sources.client = src(toutes[i + 1], sous); }
    }
  }
  // Bloc client sans étiquette : le premier texte du bloc, au-dessus de l'ICE du client, dans la même colonne.
  if (!L.client && L.sources.iceClient) {
    const s0 = L.sources.iceClient;
    const bloc = toutes
      .filter((l) => l.page === s0.page && l.y > s0.y && l.y - s0.y < 30)
      .flatMap((l) => l.morceaux.filter((m) => Math.abs(m.x0 - s0.x0) < 20 && /^[A-Za-zÀ-ÿ]/.test(m.texte)).map((m) => ({ l, m })))
      .sort((a, b) => b.l.y - a.l.y);
    if (bloc.length) { L.client = bloc[0].m.texte; L.sources.client = src(bloc[0].l, bloc[0].m); }
  }

  // ------------------------------------------------ totaux
  let totalSeul: { valeur: number; source: Source } | null = null;
  for (const l of toutes) {
    const t = sansAccents(l.texte.toLowerCase());
    const premier = sansAccents(l.morceaux[0].texte.toLowerCase());
    if (RE_ENTETE_TABLEAU.test(l.texte) && !montantDeLigne(l)) continue;
    if (RE_TVA.test(t) && !RE_TTC.test(t) && !RE_HT.test(t)) {
      const taux = t.match(/(\d{1,2}(?:[.,]\d+)?)\s*%/);
      const v = montantDeLigne(l, /%/);
      if (v && taux && RE_TVA.test(premier)) {
        L.tva.push({ taux: Number(taux[1].replace(',', '.')), montant: v.valeur });
        L.sourcesTva.push(src(l, v.morceau));
      }
      continue;
    }
    if (RE_TTC.test(t)) { const v = montantDeLigne(l); if (v && L.ttc === null) { L.ttc = v.valeur; L.sources.ttc = src(l, v.morceau); } continue; }
    if (RE_HT.test(t)) { const v = montantDeLigne(l); if (v && L.ht === null) { L.ht = v.valeur; L.sources.ht = src(l, v.morceau); } continue; }
    if (RE_REMISE.test(premier)) { const v = montantDeLigne(l, /%$/); if (v) { L.remise = Math.abs(v.valeur); L.sources.remise = src(l, v.morceau); } continue; }
    if (RE_TOTAL_SEUL.test(premier)) { const v = montantDeLigne(l); if (v && !totalSeul) totalSeul = { valeur: v.valeur, source: src(l, v.morceau) }; }
  }
  // « TOTAL » sans précision et sans TVA : c'est ce qui est à payer
  if (L.ttc === null && totalSeul && !L.tva.length) { L.ttc = totalSeul.valeur; L.sources.ttc = totalSeul.source; }

  // ------------------------------------------------ lignes du tableau (sur toutes les pages, sous chaque en-tête)
  let dansTableau = false;
  for (const l of toutes) {
    const t = sansAccents(l.texte.toLowerCase());
    if (RE_ENTETE_TABLEAU.test(l.texte) && !montantDeLigne(l)) { dansTableau = true; continue; }
    if (!dansTableau) continue;
    if (RE_HT.test(t) || RE_TTC.test(t) || RE_TVA.test(sansAccents(l.morceaux[0].texte.toLowerCase())) || RE_TOTAL_SEUL.test(t) || /total\s+brut/.test(t) || RE_REMISE.test(t)) {
      dansTableau = false; continue;
    }
    const montants = l.morceaux.flatMap((m) => montantsDans(m.texte).map((x) => ({ ...x, m })));
    if (montants.length < 1 || /^\d/.test(l.morceaux[0].texte)) continue;
    const qte = l.morceaux.slice(1).map((m) => m.texte).find((x) => /^\d+([.,]\d+)?$/.test(x) && !/[.,]\d{2}$/.test(x));
    L.lignes.push({
      designation: l.morceaux[0].texte,
      quantite: qte ? Number(qte.replace(',', '.')) : null,
      prixUnitaire: montants.length >= 2 ? montants[montants.length - 2].valeur : null,
      montant: montants[montants.length - 1].valeur,
      source: src(l),
    });
  }

  // ------------------------------------------------ montant en lettres
  const RE_SOMME = /somme\s+de/i;
  for (let i = 0; i < toutes.length; i++) {
    if (!RE_SOMME.test(toutes[i].texte)) continue;
    const texte = [toutes[i], toutes[i + 1]].filter(Boolean).filter((l) => l.page === toutes[i].page).map((l) => l.texte).join(' ');
    const s = sommeEnLettres(texte);
    if (s) {
      const reference = L.ttc ?? L.ht;
      const accord = egal(s.centimes, reference, 0);
      L.lettres = { texte: s.texte, centimes: s.centimes, accord };
      L.sources.lettres = src(toutes[i]);
      if (!accord && reference !== null)
        alerte('lettres_differentes', `Le montant en lettres (${dh(s.centimes)}) ne correspond pas au total en chiffres (${dh(reference)}).`, src(toutes[i]));
    }
    break;
  }

  // ------------------------------------------------ contrôles arithmétiques
  const sommeTva = L.tva.reduce((s, x) => s + x.montant, 0);
  if (L.ttc === null) alerte('ttc_introuvable', 'Total TTC (net à payer) introuvable.');
  if (!L.tva.length) {
    if (!/exon[ée]r|non\s+assujetti|hors\s+champ/i.test(texteTotal))
      alerte('tva_introuvable', 'Aucune ligne de TVA, sans mention d’exonération : impossible de séparer HT et TVA. À vérifier avec le fournisseur.');
  } else {
    if (L.ht === null) alerte('ht_introuvable', 'Total HT introuvable alors que la TVA est indiquée.');
    for (const [i, x] of L.tva.entries()) {
      if (!TAUX_MAROC.includes(x.taux))
        alerte('taux_inhabituel', `Taux de TVA de ${x.taux} % : ce n’est pas un taux marocain (20, 14, 10 ou 7 %).`, L.sourcesTva[i]);
    }
    if (L.ht !== null && L.tva.length === 1 && !egal(Math.round(L.ht * L.tva[0].taux / 100), L.tva[0].montant, 2))
      alerte('tva_incoherente', `TVA de ${dh(L.tva[0].montant)} : ${L.tva[0].taux} % de ${dh(L.ht)} donnent ${dh(Math.round(L.ht * L.tva[0].taux / 100))}.`, L.sourcesTva[0]);
    if (L.ht !== null && L.ttc !== null && !egal(L.ht + sommeTva, L.ttc, 2))
      alerte('ttc_incoherent', `HT + TVA = ${dh(L.ht + sommeTva)}, mais le total TTC imprimé est ${dh(L.ttc)} (écart de ${dh(L.ttc - L.ht - sommeTva)}).`, L.sources.ttc);
  }
  if (L.lignes.length) {
    for (const lg of L.lignes) {
      if (lg.quantite !== null && lg.prixUnitaire !== null && !egal(Math.round(lg.quantite * lg.prixUnitaire), lg.montant, 2))
        alerte('ligne_incoherente', `« ${lg.designation} » : ${lg.quantite} × ${dh(lg.prixUnitaire)} ≠ ${dh(lg.montant)}.`, lg.source);
    }
    const sommeLignes = L.lignes.reduce((s, x) => s + x.montant, 0);
    const attendu = L.ht !== null ? L.ht + (L.remise ?? 0) : L.tva.length ? null : L.ttc;
    if (attendu !== null && !egal(sommeLignes, attendu, 2))
      alerte('lignes_differentes', `La somme des lignes (${dh(sommeLignes)}) ne correspond pas au total${L.remise ? ' avant remise' : ''} (${dh(attendu)}).`);
  }

  L.statut = L.alertes.length ? 'a_revoir' : 'verifiee';
  return L;
}

export { centimes };
