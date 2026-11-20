/**
 * Classeur Excel : une feuille « Documents » (une ligne par document, statut vérifié / à revoir),
 * une feuille « Lignes » (détail des factures) et une feuille « Alertes » (avec la page où regarder).
 * Les montants sont de vrais nombres (pas du texte) au format comptable marocain.
 */
import type ExcelJS from 'exceljs';
import type { Lecture } from './lire';

export type Document = { fichier: string; lecture: Lecture };
const DH = '#,##0.00 "DH"';
const n = (c: number | null) => (c === null ? null : c / 100);
const STATUT = { verifiee: 'Vérifiée', a_revoir: 'À revoir' } as const;

export async function classeur(Excel: typeof ExcelJS, docs: Document[]): Promise<ArrayBuffer> {
  const wb = new Excel.Workbook();
  wb.creator = 'Lecture de factures (démonstration)';
  wb.created = new Date();
  const taux = [...new Set(docs.flatMap((d) => d.lecture.tva.map((t) => t.taux)))].sort((a, b) => b - a);

  // ------------------------------------------------ Documents
  const f = wb.addWorksheet('Documents', { views: [{ state: 'frozen', ySplit: 1 }] });
  f.columns = [
    { header: 'Fichier', key: 'fichier', width: 34 },
    { header: 'Statut', key: 'statut', width: 12 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Numéro', key: 'numero', width: 16 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Fournisseur', key: 'fournisseur', width: 28 },
    { header: 'ICE fournisseur', key: 'iceF', width: 18 },
    { header: 'Client', key: 'client', width: 28 },
    { header: 'ICE client', key: 'iceC', width: 18 },
    { header: 'Total HT', key: 'ht', width: 14, style: { numFmt: DH } },
    ...taux.map((t) => ({ header: `TVA ${t} %`, key: `tva${t}`, width: 13, style: { numFmt: DH } })),
    { header: 'Total TTC', key: 'ttc', width: 14, style: { numFmt: DH } },
    { header: 'Montant en lettres', key: 'lettres', width: 16 },
    { header: 'À revoir', key: 'alertes', width: 60 },
  ];
  for (const { fichier, lecture: l } of docs) {
    const ligne = f.addRow({
      fichier, statut: STATUT[l.statut], type: l.type ?? '', numero: l.numero ?? '',
      date: l.date ? new Date(`${l.date}T00:00:00Z`) : null,
      fournisseur: l.fournisseur ?? '', iceF: l.iceFournisseur ?? '', client: l.client ?? '', iceC: l.iceClient ?? '',
      ht: n(l.ht), ttc: n(l.ttc),
      lettres: l.lettres ? (l.lettres.accord ? 'concorde' : 'DIFFÉRENT') : '',
      alertes: l.alertes.map((a) => a.message).join(' • '),
      ...Object.fromEntries(l.tva.map((t) => [`tva${t.taux}`, n(t.montant)])),
    });
    ligne.getCell('date').numFmt = 'dd/mm/yyyy';
    ligne.getCell('alertes').alignment = { wrapText: true, vertical: 'top' };
    const statut = ligne.getCell('statut');
    statut.font = { bold: true, color: { argb: l.statut === 'verifiee' ? 'FF1E6B47' : 'FFB42318' } };
  }
  f.getRow(1).font = { bold: true };
  f.autoFilter = { from: 'A1', to: { row: 1, column: f.columns.length } };
  // ligne de total (formules : le comptable peut vérifier)
  const der = f.rowCount;
  const total = f.addRow({ fichier: 'Total' });
  total.font = { bold: true };
  for (const key of ['ht', ...taux.map((t) => `tva${t}`), 'ttc']) {
    const col = f.getColumn(key).letter;
    total.getCell(key).value = { formula: `SUBTOTAL(9,${col}2:${col}${der})` };
    total.getCell(key).numFmt = DH;
  }

  // ------------------------------------------------ Lignes
  const lg = wb.addWorksheet('Lignes', { views: [{ state: 'frozen', ySplit: 1 }] });
  lg.columns = [
    { header: 'Fichier', key: 'fichier', width: 34 },
    { header: 'Numéro', key: 'numero', width: 16 },
    { header: 'Désignation', key: 'designation', width: 44 },
    { header: 'Quantité', key: 'quantite', width: 10 },
    { header: 'Prix unitaire HT', key: 'pu', width: 16, style: { numFmt: DH } },
    { header: 'Montant HT', key: 'montant', width: 14, style: { numFmt: DH } },
    { header: 'Page', key: 'page', width: 7 },
  ];
  for (const { fichier, lecture: l } of docs)
    for (const x of l.lignes)
      lg.addRow({ fichier, numero: l.numero ?? '', designation: x.designation, quantite: x.quantite, pu: n(x.prixUnitaire), montant: n(x.montant), page: x.source.page });
  lg.getRow(1).font = { bold: true };

  // ------------------------------------------------ Alertes
  const al = wb.addWorksheet('Alertes', { views: [{ state: 'frozen', ySplit: 1 }] });
  al.columns = [
    { header: 'Fichier', key: 'fichier', width: 34 },
    { header: 'Contrôle', key: 'code', width: 20 },
    { header: 'Ce qu’il faut vérifier', key: 'message', width: 90 },
    { header: 'Page', key: 'page', width: 7 },
    { header: 'Texte lu', key: 'texte', width: 40 },
  ];
  for (const { fichier, lecture: l } of docs)
    for (const a of l.alertes)
      al.addRow({ fichier, code: a.code, message: a.message, page: a.source?.page ?? '', texte: a.source?.texte ?? '' }).alignment = { wrapText: true, vertical: 'top' };
  al.getRow(1).font = { bold: true };

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
