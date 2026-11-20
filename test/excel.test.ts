/** Le classeur produit à partir des 9 exemples se relit, et ses montants sont des nombres justes. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { lirePdf } from '../src/moteur/pdf';
import { lire } from '../src/moteur/lire';
import { classeur } from '../src/moteur/excel';

const DOSSIER = join(__dirname, '..', 'public', 'exemples');

it('classeur des 9 exemples', async () => {
  const fichiers = Object.keys(JSON.parse(readFileSync(join(DOSSIER, 'verite.json'), 'utf-8')));
  const docs = [];
  for (const f of fichiers) docs.push({ fichier: f, lecture: lire(await lirePdf(pdfjs as never, new Uint8Array(readFileSync(join(DOSSIER, f))))) });
  const tampon = await classeur(ExcelJS, docs);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(tampon);
  expect(wb.worksheets.map((w) => w.name)).toEqual(['Documents', 'Lignes', 'Alertes']);
  const f = wb.getWorksheet('Documents')!;
  expect(f.rowCount).toBe(1 + 9 + 1);                       // en-tête, 9 documents, total
  const entetes = (f.getRow(1).values as unknown[]).slice(1);
  const col = (nom: string) => entetes.indexOf(nom) + 1;
  const ligne1 = f.getRow(2);
  expect(ligne1.getCell(col('Statut')).value).toBe('Vérifiée');
  expect(ligne1.getCell(col('Total TTC')).value).toBe(6900);     // un nombre, pas du texte
  expect(f.getRow(4).getCell(col('Statut')).value).toBe('À revoir'); // 03 : TTC faux
  expect(String(f.getRow(4).getCell(col('À revoir')).value)).toMatch(/HT \+ TVA/);
  expect(wb.getWorksheet('Lignes')!.rowCount).toBeGreaterThan(30);   // dont les 30 lignes de la facture de deux pages
  // 7 alertes au total sur le jeu d'essai (03:1, 05:1, 06:2, 08:1… voir verite.json)
  const attendu = fichiers.reduce((s, x) => s + JSON.parse(readFileSync(join(DOSSIER, 'verite.json'), 'utf-8'))[x].alertes.length, 0);
  expect(wb.getWorksheet('Alertes')!.rowCount - 1).toBe(attendu);
});
