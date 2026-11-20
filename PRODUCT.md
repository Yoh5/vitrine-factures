# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated (20/11/2026) : **Vite + TypeScript sans framework**. Tout tourne dans le navigateur : pdf.js (Apache 2.0) lit le PDF, le moteur maison (`src/moteur/`) extrait et contrôle, exceljs (MIT) écrit le classeur. Aucun serveur, aucune API, aucune donnée envoyée. Hébergement Netlify.

## Users

Premier public, confirmé : **les comptables** (fiduciaires, cabinets, comptables de PME au Maroc) qui ressaisissent chaque mois des dizaines de factures et devis fournisseurs, et qui reçoivent un devis d'Axel sur freelancer.ma. Ils jugent un outil à une seule question : les chiffres sont-ils justes, et quand ils ne le sont pas, est-ce que je le vois ?

## Product Purpose

Démonstration d'un service freelance : déposer des factures/devis PDF, obtenir un classeur Excel propre où **chaque montant est contrôlé** (HT + TVA = TTC, TVA = taux × HT, lignes = total, taux marocains, ICE à 15 chiffres, montant en lettres = montant en chiffres) et où **ce qui ne se vérifie pas est signalé, jamais deviné**. Succès : un comptable dépose les exemples ou ses propres PDF, voit en 1 minute ce qui est vérifié et ce qui est à revoir, et télécharge l'Excel.

## Positioning

**Pointage** (nom fictif) : ce que le comptable fait à la main — pointer chaque montant — fait par le code, avec la preuve. Chaque valeur montre l'endroit du PDF où elle a été lue. Les factures ne quittent pas l'ordinateur (argument loi 09-08). Mesuré : voir MESURES.md (jeu d'essai 90/90, jeu de contrôle 48/50 avant retouche, 0 montant faux sur un document déclaré vérifié, mutations 9/9).

## Operating Context

Sur ordinateur surtout (le comptable au bureau, des PDF reçus par e-mail), consultable sur téléphone depuis le lien d'un devis. Factures marocaines en français : ICE, IF, RC, patente ; TVA 20/14/10/7 % ; montants « 1 234,50 DH » et variantes ; « Arrêtée la présente facture à la somme de… ».

## Capabilities and Constraints

- PDF avec texte seulement ; un scan est détecté et signalé (la reconnaissance de texte est une étape suivante, pas promise ici).
- Jeu d'exemples fictif intégré (9 documents dont 5 pièges) pour essayer sans ses propres factures.
- Export : classeur Excel à 3 feuilles (Documents, Lignes, Alertes).
- Français seulement.

## Brand Commitments

Nom fictif **Pointage**. Chaque vitrine d'Axel a son propre design : ne reprendre ni Dar Zellige, Warda, Mouja, Silicium ni Dar Hdiya.

## Evidence on Hand

- `MESURES.md` et `npm test` : chiffres mesurés, à citer tels quels.
- Aucun client, aucun avis, aucun volume traité réel : n'en afficher ni n'en inventer.

## Product Principles

1. Un chiffre non vérifié n'est jamais présenté comme sûr.
2. La preuve se voit : chaque valeur pointe vers l'endroit du document.
3. Rien ne quitte l'ordinateur.
4. Le comptable reste le dernier mot : l'outil signale, il ne corrige pas.

## Accessibility & Inclusion

WCAG AA : contrastes 4,5:1, clavier complet (dépôt de fichiers compris), états lisibles sans la couleur (vérifié / à revoir écrits en toutes lettres).
