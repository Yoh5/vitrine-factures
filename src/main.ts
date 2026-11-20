import './style.css';
import * as pdfjs from 'pdfjs-dist';
import travailleur from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { lirePdf, type Page } from './moteur/pdf';
import { lire, type Lecture, type Source } from './moteur/lire';
import { ruban, fmtCentimes, type LigneRuban } from './ruban';

pdfjs.GlobalWorkerOptions.workerSrc = travailleur;

type Doc = { id: number; fichier: string; octets: Uint8Array; pages: Page[] | null; lecture: Lecture | null; erreur?: string };
const docs: Doc[] = [];
let choisi: number | null = null;
let pageVue = 1;
let compteur = 0;
const EXEMPLES = [
  '01-facture-simple.pdf', '02-deux-taux-de-tva.pdf', '03-piege-ttc-faux.pdf', '04-devis-points-milliers.pdf',
  '05-piege-lettres-differentes.pdf', '06-piege-sans-tva-ice-incomplet.pdf', '07-deux-pages-virgule-milliers.pdf',
  '08-piege-document-scanne.pdf', '09-remise-tva-14.pdf',
];
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ✓ ◄ ◇ n'existent pas dans les polices : dessinés ici, d'un seul trait, pour ne pas changer de police en milieu de ligne.
const SIGNES: Record<string, string> = {
  '✓': '<path d="M2.5 8.5l3.5 3.5 7.5-8"/>',
  '◄': '<path d="M12.5 3v10L3.5 8z" fill="currentColor"/>',
  '◇': '<path d="M8 2.5 13.5 8 8 13.5 2.5 8z"/>',
};
function signe(c: string, cls: string): HTMLSpanElement {
  const sp = document.createElement('span');
  sp.className = cls;
  if (SIGNES[c]) {
    sp.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${SIGNES[c]}</svg>`;
    sp.setAttribute('aria-label', c === '✓' ? 'pointé' : c === '◄' ? 'écart' : 'sous-total');
  } else sp.textContent = c;
  return sp;
}
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

// ---------------------------------------------------------------- lecture
async function ajouter(fichier: string, octets: Uint8Array) {
  const d: Doc = { id: ++compteur, fichier, octets, pages: null, lecture: null };
  docs.push(d);
  rendreListe();
  try {
    d.pages = await lirePdf(pdfjs as never, octets.slice());
    d.lecture = lire(d.pages);
  } catch {
    d.erreur = 'Ce fichier n’est pas un PDF lisible (protégé par mot de passe ou abîmé).';
  }
  rendreListe();
  if (choisi === null) choisir(d.id);
}

async function deposer(fichiers: FileList | File[]) {
  const pdf = [...fichiers].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  for (const f of pdf) await ajouter(f.name, new Uint8Array(await f.arrayBuffer()));
}

// ---------------------------------------------------------------- pile des tickets
function etatDe(d: Doc): { mot: string; cls: string } {
  if (d.erreur) return { mot: 'Illisible', cls: 'revoir' };
  if (!d.lecture) return { mot: 'Lecture…', cls: 'encours' };
  const n = d.lecture.alertes.length;
  return n ? { mot: `À revoir · ${n}`, cls: 'revoir' } : { mot: 'Pointé', cls: 'pointe' };
}

function rendreListe() {
  const ol = $('tickets');
  ol.replaceChildren(...docs.map((d) => {
    const li = el('li');
    const b = el('button', 'ticket' + (d.id === choisi ? ' actif' : ''));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(d.id === choisi));
    const e = etatDe(d);
    const l = d.lecture;
    b.append(
      el('span', 'ticket-nom', l?.fournisseur ?? d.fichier.replace(/\.pdf$/i, '')),
      el('span', 'ticket-num', [l?.type ? l.type.toUpperCase() : null, l?.numero].filter(Boolean).join(' ') || d.fichier),
      el('span', 'ticket-total', l?.ttc != null ? `${fmtCentimes(l.ttc)} DH` : '—'),
      el('span', `ticket-etat ${e.cls}`, e.mot),
    );
    b.addEventListener('click', () => choisir(d.id));
    li.append(b);
    return li;
  }));
  const lus = docs.filter((d) => d.lecture || d.erreur);
  const pointes = lus.filter((d) => d.lecture && !d.lecture.alertes.length).length;
  $('bilan').textContent = lus.length ? `${pointes} pointé${pointes > 1 ? 's' : ''} · ${lus.length - pointes} à revoir` : '';
  $('vide').hidden = docs.length > 0;
  $('exporter').hidden = !docs.some((d) => d.lecture);
  $('vider').hidden = docs.length === 0;
  $('exemples').hidden = EXEMPLES.every((f) => docs.some((d) => d.fichier === f));
}

// ---------------------------------------------------------------- le ruban
let impression = 0;
function rendreRuban(d: Doc) {
  const art = $('ruban');
  $('ruban-attente').hidden = true;
  art.hidden = false;
  const jeton = ++impression;
  const l = d.lecture;
  const lignes: LigneRuban[] = d.erreur
    ? [{ sym: '!', montant: '', libelle: 'ILLISIBLE', etat: 'ecart', note: d.erreur }]
    : l ? ruban(l) : [];
  const tete = el('header', 'ruban-tete');
  tete.append(el('p', 'ruban-fichier', d.fichier), el('p', 'ruban-type', l?.type ? `${l.type.toUpperCase()} · ${l.fournisseur ?? ''}` : ''));
  const corps = el('ol', 'ruban-lignes');
  const pied = el('footer', 'ruban-pied');
  const n = l?.alertes.length ?? 1;
  const verdict = el('p', 'verdict ' + (n ? 'verdict-revoir' : 'verdict-pointe'));
  verdict.append(signe(n ? '◄' : '✓', 'verdict-signe'), n ? `À REVOIR · ${n} ÉCART${n > 1 ? 'S' : ''}` : 'POINTÉ · TOUT TOMBE JUSTE');
  pied.append(verdict);
  art.replaceChildren(tete, corps, pied);

  const items = lignes.map((x) => {
    const li = el('li', 'ligne' + (x.etat === 'ecart' ? ' ecart' : '') + (x.separateur ? ' filet' : ''));
    li.append(
      signe(x.sym, 'sym'),
      el('span', 'montant', x.montant),
      el('span', 'libelle', x.libelle),
      signe(x.etat === 'ok' ? '✓' : x.etat === 'ecart' ? '◄' : '', 'marque-pt'),
    );
    if (x.note) li.append(el('span', 'note', x.note));
    if (x.source) {
      li.tabIndex = 0;
      li.classList.add('source');
      li.setAttribute('aria-label', `${x.libelle} ${x.montant} : montrer où c’est écrit dans le document`);
      const montrer = () => { marquer(li); montrerPreuve(x.source!); };
      li.addEventListener('mouseenter', montrer);
      li.addEventListener('focus', montrer);
      li.addEventListener('click', montrer);
    }
    return li;
  });
  // l'impression : une ligne après l'autre, avec l'avance du papier
  if (reduit) { corps.append(...items); return; }
  verdict.classList.add('attend');
  items.forEach((li, i) => setTimeout(() => {
    if (jeton !== impression) return;
    corps.append(li);
    if (i === items.length - 1) setTimeout(() => jeton === impression && verdict.classList.remove('attend'), 160);
  }, 70 * i));
  if (!items.length) verdict.classList.remove('attend');
}

// ---------------------------------------------------------------- le document et la preuve
let rendu: Promise<void> | null = null;
let echelle = 1;
let hauteurPage = 842;
let rendus = 0;
let tache: { cancel(): void } | null = null;
async function rendrePage(d: Doc, numero: number) {
  // Seul le dernier rendu demandé a le droit de peindre : sinon une page lente écrase la page choisie après elle.
  const jeton = ++rendus;
  tache?.cancel();
  pageVue = numero;
  const doc = await pdfjs.getDocument({ data: d.octets.slice() }).promise;
  const page = await doc.getPage(numero);
  if (jeton !== rendus) return;
  const base = page.getViewport({ scale: 1 });
  hauteurPage = base.height;
  const largeur = $('feuille').clientWidth || 480;
  echelle = largeur / base.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vue = page.getViewport({ scale: echelle * dpr });
  const toile = $<HTMLCanvasElement>('toile');
  toile.width = vue.width; toile.height = vue.height;
  toile.style.width = `${vue.width / dpr}px`; toile.style.height = `${vue.height / dpr}px`;
  const t = page.render({ canvasContext: toile.getContext('2d')!, viewport: vue, canvas: toile } as never) as unknown as { promise: Promise<void>; cancel(): void };
  tache = t;
  try { await t.promise; } catch { return; } // rendu annulé par un plus récent
  if (jeton !== rendus) return;
  const pages = $('pages');
  pages.hidden = doc.numPages < 2;
  pages.replaceChildren(...Array.from({ length: doc.numPages }, (_, i) => {
    const b = el('button', 'num-page' + (i + 1 === numero ? ' actif' : ''), `Page ${i + 1}`);
    b.type = 'button';
    b.addEventListener('click', () => { $('preuve').hidden = true; marquer(null); rendre(d, i + 1); });
    return b;
  }));
}
function rendre(d: Doc, numero: number) { rendu = rendrePage(d, numero); return rendu; }

function marquer(li: HTMLElement | null) {
  document.querySelectorAll('.ligne.montree').forEach((x) => x.classList.remove('montree'));
  li?.classList.add('montree');
}

async function montrerPreuve(s: Source) {
  const d = docs.find((x) => x.id === choisi);
  if (!d) return;
  if (s.page !== pageVue) await rendre(d, s.page); else await rendu;
  const p = $('preuve');
  const marge = 4;
  const haut = 13; // hauteur de ligne type, en points PDF
  p.style.left = `${(s.x0 - marge) * echelle}px`;
  p.style.width = `${(s.x1 - s.x0 + marge * 2) * echelle}px`;
  p.style.top = `${(hauteurPage - s.y - haut + 2) * echelle}px`;
  p.style.height = `${(haut + 4) * echelle}px`;
  p.hidden = false;
  p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash');
  if (matchMedia('(max-width: 959px)').matches) p.scrollIntoView({ block: 'nearest', behavior: reduit ? 'auto' : 'smooth' });
}

function choisir(id: number) {
  choisi = id;
  const d = docs.find((x) => x.id === id)!;
  rendreListe();
  document.querySelector('.ticket.actif')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('preuve').hidden = true; marquer(null);
  rendreRuban(d);
  $('feuille').hidden = !!d.erreur;
  if (!d.erreur) rendre(d, 1);
}

// ---------------------------------------------------------------- export
$('exporter').addEventListener('click', async () => {
  const b = $<HTMLButtonElement>('exporter');
  b.disabled = true;
  const avant = b.lastChild!.textContent;
  b.lastChild!.textContent = ' Préparation…';
  try {
    const [{ default: ExcelJS }, { classeur }] = await Promise.all([import('exceljs'), import('./moteur/excel')]);
    const lus = docs.filter((d) => d.lecture).map((d) => ({ fichier: d.fichier, lecture: d.lecture! }));
    const tampon = await classeur(ExcelJS, lus);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `pointage-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } finally {
    b.disabled = false; b.lastChild!.textContent = avant;
  }
});

$('vider').addEventListener('click', () => {
  docs.length = 0; choisi = null; ++impression; ++rendus;
  $('ruban').hidden = true; $('ruban-attente').hidden = false;
  $('feuille').hidden = true; $('pages').hidden = true; $('preuve').hidden = true; marquer(null);
  rendreListe();
  $('fichiers').focus();
});

// ---------------------------------------------------------------- dépôt et exemples
$<HTMLInputElement>('fichiers').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.files) deposer(input.files);
  input.value = '';
});
$('exemples').addEventListener('click', async () => {
  const b = $<HTMLButtonElement>('exemples');
  b.disabled = true;
  for (const f of EXEMPLES) {
    if (docs.some((d) => d.fichier === f)) continue;
    const r = await fetch(`/exemples/${f}`);
    await ajouter(f, new Uint8Array(await r.arrayBuffer()));
  }
  b.disabled = false;
});
let profondeur = 0;
addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { profondeur++; $('depot').hidden = false; } });
addEventListener('dragleave', () => { if (--profondeur <= 0) { profondeur = 0; $('depot').hidden = true; } });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => {
  e.preventDefault(); profondeur = 0; $('depot').hidden = true;
  if (e.dataTransfer?.files.length) deposer(e.dataTransfer.files);
});
let attente: number | undefined;
addEventListener('resize', () => {
  clearTimeout(attente);
  attente = window.setTimeout(() => { const d = docs.find((x) => x.id === choisi); if (d && !d.erreur) { $('preuve').hidden = true; marquer(null); rendre(d, pageVue); } }, 200);
});
if (matchMedia('(hover: none)').matches) $('aide-doc').textContent = 'Touchez une ligne du ruban : l’endroit où elle a été lue s’encadre sur la facture.';
rendreListe();

// Lien direct pour un devis : ?exemples charge les 9 exemples ; &doc=3 ouvre le 3e ; &preuve=5 encadre la 5e ligne du ruban.
const params = new URLSearchParams(location.search);
// Les exemples se chargent dès l'arrivée : le premier écran montre un ruban imprimé, pas des cadres vides.
if (!params.has('vide')) {
  $('exemples').click();
  const n = Number(params.get('doc'));
  if (n) {
    const attendre = setInterval(() => {
      const d = docs[n - 1];
      if (!d || !(d.lecture || d.erreur) || docs.some((x) => !x.lecture && !x.erreur)) return;
      clearInterval(attendre);
      choisir(d.id);
      const k = Number(params.get('preuve'));
      if (k) setTimeout(() => document.querySelectorAll<HTMLElement>('.ruban-lignes .ligne')[k - 1]?.dispatchEvent(new Event('mouseenter')), 1500);
    }, 100);
  }
}
