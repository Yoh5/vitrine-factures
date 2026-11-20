/**
 * Une lecture devient un ruban de calculatrice imprimante, avec la grammaire réelle de ces machines :
 *   #  nombre imprimé sans être additionné (numéro, date, ICE)
 *   +  addition    −  soustraction    ◇  sous-total    *  total
 *   ✓  pointé (le contrôle tombe juste)    ◄  écart (imprimé en rouge)
 * Chaque ligne garde la source dans le PDF, pour l'encadrer au survol.
 */
import type { Lecture, Source } from './moteur/lire';

export type LigneRuban = {
  sym: '#' | '+' | '−' | '◇' | '*' | '=' | '' | '!';
  montant: string;          // déjà formaté, aligné à droite
  libelle: string;
  etat: 'ok' | 'ecart' | null;
  source?: Source;
  note?: string;            // petite ligne d'explication sous un écart
  separateur?: boolean;     // filet imprimé au-dessus
};

const fmt = (c: number) => {
  const neg = c < 0;
  const [e, d] = (Math.abs(c) / 100).toFixed(2).split('.');
  return `${neg ? '-' : ''}${e.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${d}`;
};
const ecart = (a: number, b: number) => Math.abs(a - b) > 2;

export function ruban(l: Lecture): LigneRuban[] {
  const r: LigneRuban[] = [];
  const codes = new Set(l.alertes.map((a) => a.code));
  const message = (code: string) => l.alertes.find((a) => a.code === code)?.message;

  if (codes.has('document_scanne')) {
    r.push({ sym: '!', montant: '', libelle: 'AUCUN TEXTE', etat: 'ecart', note: message('document_scanne') });
    return r;
  }

  // --- en-tête : rien de tout cela ne s'additionne
  r.push({ sym: '#', montant: l.numero ?? '?', libelle: 'N°', etat: l.numero ? null : 'ecart', source: l.sources.numero, note: l.numero ? undefined : message('numero_introuvable') });
  if (l.date) {
    const [a, m, j] = l.date.split('-');
    r.push({ sym: '#', montant: `${j}.${m}.${a}`, libelle: 'DATE', etat: null, source: l.sources.date });
  } else r.push({ sym: '#', montant: '?', libelle: 'DATE', etat: 'ecart', note: message('date_introuvable') });
  const iceInvalide = l.alertes.find((a) => a.code === 'ice_invalide');
  if (l.iceFournisseur) r.push({ sym: '#', montant: l.iceFournisseur, libelle: 'ICE', etat: 'ok', source: l.sources.iceFournisseur });
  else if (iceInvalide) r.push({ sym: '#', montant: iceInvalide.message.match(/: (\d+)\.$/)?.[1] ?? '?', libelle: 'ICE', etat: 'ecart', source: iceInvalide.source, note: iceInvalide.message });
  else r.push({ sym: '#', montant: '?', libelle: 'ICE', etat: 'ecart', note: message('ice_introuvable') });

  // --- lignes du tableau, puis leur sous-total
  if (l.lignes.length) {
    l.lignes.forEach((lg, i) => {
      const faux = lg.quantite !== null && lg.prixUnitaire !== null && ecart(Math.round(lg.quantite * lg.prixUnitaire), lg.montant);
      r.push({
        sym: '+', montant: fmt(lg.montant), libelle: `L${i + 1}`, etat: faux ? 'ecart' : null, source: lg.source, separateur: i === 0,
        note: faux ? `${lg.quantite} × ${fmt(lg.prixUnitaire!)} = ${fmt(Math.round(lg.quantite! * lg.prixUnitaire!))}` : undefined,
      });
    });
    const somme = l.lignes.reduce((s, x) => s + x.montant, 0);
    r.push({ sym: '◇', montant: fmt(somme), libelle: 'LIGNES', etat: codes.has('lignes_differentes') ? 'ecart' : 'ok', note: message('lignes_differentes') });
    if (l.remise) r.push({ sym: '−', montant: fmt(l.remise), libelle: 'REMISE', etat: null, source: l.sources.remise });
  }

  // --- HT, TVA, TTC
  if (l.ht !== null) r.push({ sym: '', montant: fmt(l.ht), libelle: 'HT', etat: 'ok', source: l.sources.ht, separateur: true });
  else if (l.tva.length) r.push({ sym: '', montant: '?', libelle: 'HT', etat: 'ecart', separateur: true, note: message('ht_introuvable') });

  l.tva.forEach((t, i) => {
    const mal = codes.has('tva_incoherente') && l.tva.length === 1;
    const inhab = l.alertes.find((a) => a.code === 'taux_inhabituel' && a.source === l.sourcesTva[i]);
    r.push({
      sym: '+', montant: fmt(t.montant), libelle: `TVA ${t.taux} %`, etat: mal || inhab ? 'ecart' : 'ok', source: l.sourcesTva[i],
      note: inhab ? inhab.message : mal ? message('tva_incoherente') : undefined,
    });
  });
  if (!l.tva.length) r.push({ sym: '', montant: '?', libelle: 'TVA', etat: 'ecart', note: message('tva_introuvable'), separateur: l.ht === null });

  if (l.ht !== null && l.tva.length) {
    const calc = l.ht + l.tva.reduce((s, t) => s + t.montant, 0);
    r.push({ sym: '*', montant: fmt(calc), libelle: 'CALCULÉ', etat: null, separateur: true });
    if (l.ttc !== null) {
      const faux = codes.has('ttc_incoherent');
      r.push({ sym: '', montant: fmt(l.ttc), libelle: 'TTC LU', etat: faux ? 'ecart' : 'ok', source: l.sources.ttc });
      if (faux) r.push({ sym: '!', montant: fmt(l.ttc - calc), libelle: 'ÉCART', etat: 'ecart', note: message('ttc_incoherent') });
    }
  } else if (l.ttc !== null) {
    r.push({ sym: '*', montant: fmt(l.ttc), libelle: 'TOTAL LU', etat: null, source: l.sources.ttc, separateur: true });
  } else {
    r.push({ sym: '*', montant: '?', libelle: 'TTC', etat: 'ecart', note: message('ttc_introuvable'), separateur: true });
  }

  if (l.lettres) {
    r.push({
      sym: '=', montant: fmt(l.lettres.centimes), libelle: 'EN LETTRES', etat: l.lettres.accord ? 'ok' : 'ecart', source: l.sources.lettres,
      note: l.lettres.accord ? undefined : message('lettres_differentes'),
    });
  }
  return r;
}

export const fmtCentimes = fmt;
