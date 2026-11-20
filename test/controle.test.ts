/**
 * Mesure sur le jeu de CONTRÔLE (test/controle), écrit après le moteur : il ne sert qu'à mesurer.
 * Même structure que mesure.test.ts : même pdf.js et même moteur que le navigateur.
 * Trois questions :
 *   1. chaque champ lu est-il juste ?
 *   2. chaque piège déclenche-t-il SON alerte, et seulement elle ?
 *   3. y a-t-il une valeur FAUSSE présentée sans alerte ? (le pire cas : il doit y en avoir zéro)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { lirePdf } from '../src/moteur/pdf';
import { lire, type Lecture } from '../src/moteur/lire';

const DOSSIER = join(__dirname, 'controle');
type Verite = {
  type: string | null; numero: string | null; date: string | null; fournisseur: string | null;
  ice_fournisseur: string | null; client: string | null; ice_client: string | null;
  ht: string | null; tva: Record<string, string> | null; ttc: string | null; alertes: string[];
};
const VERITE: Record<string, Verite> = JSON.parse(readFileSync(join(DOSSIER, 'verite.json'), 'utf-8'));
const c = (s: string | null) => (s === null ? null : Math.round(Number(s) * 100));
const norm = (s: string | null) => (s === null ? null : s.toLowerCase().replace(/\s+/g, ' ').trim());

type Ligne = { fichier: string; champ: string; attendu: unknown; lu: unknown; ok: boolean };
const resultats: Ligne[] = [];
const lectures: Record<string, Lecture> = {};

function comparer(fichier: string, v: Verite, l: Lecture) {
  const tvaLue = l.tva.length ? Object.fromEntries(l.tva.map((x) => [String(x.taux), x.montant])) : null;
  const tvaAttendue = v.tva ? Object.fromEntries(Object.entries(v.tva).map(([k, x]) => [k, c(x)])) : null;
  const champs: [string, unknown, unknown][] = [
    ['type', v.type, l.type], ['numero', v.numero, l.numero], ['date', v.date, l.date],
    ['fournisseur', norm(v.fournisseur), norm(l.fournisseur)], ['ice_fournisseur', v.ice_fournisseur, l.iceFournisseur],
    ['client', norm(v.client), norm(l.client)], ['ice_client', v.ice_client, l.iceClient],
    ['ht', c(v.ht), l.ht], ['tva', JSON.stringify(tvaAttendue), JSON.stringify(tvaLue)], ['ttc', c(v.ttc), l.ttc],
  ];
  for (const [champ, attendu, lu] of champs) resultats.push({ fichier, champ, attendu, lu, ok: attendu === lu });
}

describe('jeu de CONTRÔLE (écrit après le moteur)', () => {
  for (const fichier of Object.keys(VERITE)) {
    it(fichier, async () => {
      const pages = await lirePdf(pdfjs as never, new Uint8Array(readFileSync(join(DOSSIER, fichier))));
      const l = lire(pages);
      lectures[fichier] = l;
      comparer(fichier, VERITE[fichier], l);
      const codes = [...new Set(l.alertes.map((a) => a.code))].sort();
      expect(codes, `alertes de ${fichier} : ${l.alertes.map((a) => a.message).join(' | ')}`).toEqual([...VERITE[fichier].alertes].sort());
    });
  }

  it('bilan', () => {
    const faux = resultats.filter((r) => !r.ok);
    const total = resultats.length;
    console.log(`\nChamps justes : ${total - faux.length}/${total}`);
    for (const r of faux) console.log(`  ✗ ${r.fichier} ${r.champ} : attendu ${JSON.stringify(r.attendu)}, lu ${JSON.stringify(r.lu)}`);
    // Le pire cas : une valeur fausse sur un document déclaré « vérifié ».
    const silencieux = faux.filter((r) => lectures[r.fichier]?.statut === 'verifiee' && ['ht', 'tva', 'ttc'].includes(r.champ));
    console.log(`Montants faux sur un document « vérifié » : ${silencieux.length}`);
    expect(silencieux).toEqual([]);
    expect(faux).toEqual([]);
  });
});
