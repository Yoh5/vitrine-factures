---
name: Pointage
description: Vos factures en Excel, recomptées une à une — le ruban de calculatrice agrafé à la facture.
colors:
  sous-main: "#1d3a2e"
  sous-main-fonce: "#142a21"
  sous-main-clair: "#2a5040"
  sur-vert: "#e6eee8"
  sur-vert-doux: "#b9cbbf"
  papier: "#fbfcfa"
  papier-ombre: "#e9edea"
  encre: "#161816"
  encre-pale: "#535b56"
  filet: "#cfd6d1"
  rouge-ruban: "#b8111e"
  surligneur: "rgb(255 214 10 / 0.38)"
typography:
  titre:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 1.1rem + 0.8vw, 1.75rem)"
    fontWeight: 800
    lineHeight: 1.2
  marque:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  ruban:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.45
  ruban-libelle:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.78rem"
    letterSpacing: "0.04em"
  texte:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  etiquette:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.12em"
rounded:
  papier: "2px"
  controle: "4px"
spacing:
  ligne-ruban: "0.12rem"
  colonne: "2rem"
  section: "1.75rem"
components:
  bouton-papier:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    rounded: "{rounded.controle}"
    height: "48px"
    padding: "0 1.1rem"
  bouton-encre:
    backgroundColor: "{colors.encre}"
    textColor: "{colors.papier}"
    rounded: "{rounded.controle}"
    height: "48px"
  bouton-trait:
    textColor: "{colors.sur-vert}"
    rounded: "{rounded.controle}"
    height: "48px"
  ticket:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    rounded: "{rounded.papier}"
    padding: "0.65rem 0.8rem"
  ruban:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    typography: "{typography.ruban}"
    padding: "1.1rem 1.1rem 1.6rem"
---

# Design System: Pointage

## Overview

**Creative North Star : « le ruban agrafé à la facture ».** Le comptable vérifie une facture en la recomptant sur sa calculatrice imprimante, puis il agrafe le ticket à la facture : c'est la preuve qu'il a pointé. Pointage fait exactement ce geste, à l'écran. Chaque document lu imprime son ruban, ligne à ligne, avec la grammaire réelle de ces machines ; ce qui tombe juste porte un ✓, ce qui ne tombe pas juste s'imprime en rouge, barré, marqué ◄. Le PDF est posé sous le ruban, et toucher une ligne encadre sur la facture l'endroit où elle a été lue.

Le monde refuse deux choses : l'outil en ligne générique (zone de dépôt pointillée, tableau gris, pastilles vert/rouge) et la reconstitution décorative (papier crème, biseaux, imitation de matière). Le papier thermique est lisse : il est rendu à plat.

**Key Characteristics :**
- Fond engagé : le sous-main vert bouteille couvre la page ; le papier ne sert qu'aux objets (ruban, tickets, facture, boutons).
- Une seule taille de chiffres sur le ruban (Azeret Mono 0,95 rem) ; le rang passe par la graisse, les capitales et la grammaire des symboles.
- Le rouge est l'encre du ruban bicolore : il ne marque que les écarts.
- Le ruban chevauche le bord de la facture et passe au-dessus d'elle : ils forment un seul objet.

## Colors

Une couleur engagée (le sous-main), une matière (le papier thermique) et deux encres de ruban.

### Primary
- **Sous-main** (sous-main, sous-main-fonce, sous-main-clair) : fond de page, bandeau et pied (fonce), filets et survols (clair). Texte dessus : sur-vert (10,5:1) et sur-vert-doux (7,3:1).

### Secondary
- **Papier thermique** (papier) : blanc froid, jamais crème ; ruban, tickets, feuille du PDF, boutons papier. Encre dessus : 17,4:1 ; encre pâle : 6,8:1.

### Tertiary
- **Rouge de ruban** (rouge-ruban) : écarts seulement (montant barré, ◄, note, verdict « À revoir »). 6,5:1 sur le papier.
- **Surligneur** (surligneur, jaune translucide) : la preuve — ligne du ruban montrée et cadre posé sur le PDF. Jamais un fond de bouton.

### Neutral
- **Encre** (encre) : chiffres, texte sur papier, bouton d'export plein.
- **Encre pâle** (encre-pale) : libellés du ruban, nom de fichier, aides sur papier.
- **Filet** (filet) : réservé ; les séparations du ruban sont des tirets imprimés en encre pâle.

### Named Rules
**The Ribbon-Red Rule.** Le rouge ne veut dire qu'une chose : « ça ne tombe pas juste ». Aucun bouton, aucun décor n'est rouge. L'action de sortie (Télécharger l'Excel) est en encre pleine.
**The No-Colour-Alone Rule.** Un écart se lit sans la couleur : il est aussi barré et marqué ◄ (repris de la discipline « un conflit se voit sans couleur »).

## Typography

**Chiffres :** Azeret Mono (ruban, tickets, bilan, marque). **Interface :** Public Sans. Les deux sont hébergées sur le site (OFL, `public/polices/`) : aucune requête vers un tiers, comme les PDF.

### Hierarchy
- **Titre** (Public Sans 800, clamp 1,35–1,75 rem) : la promesse du bandeau, une seule fois.
- **Marque** (Azeret Mono 700, 1,5 rem) : « Pointage », précédée de la coche dessinée.
- **Ruban** (Azeret Mono 400, 0,95 rem, interligne 1,45) : tous les montants, une seule taille.
- **Libellé de ruban** (Azeret Mono 0,78 rem, espacement 0,04 em, capitales) : N°, DATE, HT, TVA 20 %…
- **Étiquette** (Public Sans 700, 0,8 rem, capitales, espacement 0,12 em) : titres de colonnes sur le vert.
- **Texte** (Public Sans 400, 1 rem) : notes d'écart (0,82 rem), aides, pied.

### Named Rules
**The One-Figure-Size Rule.** Sur le ruban, aucun montant n'est plus gros qu'un autre : le total se distingue par `*`, le filet et sa place, pas par la taille.
**The Drawn-Marks Rule.** ✓ ◄ ◇ ne sont pas dans les polices : ils sont dessinés en SVG d'un seul trait (2,2 sur une grille de 16), jamais laissés à une police système.

## Layout

Bureau (≥ 960 px) : trois colonnes sur le sous-main — la pile (15–18 rem, collante), le ruban (25 rem au plus) qui chevauche de 2,25 rem le bord gauche de la feuille et passe au-dessus, la feuille du PDF (le reste, collante). Le titre « Le document » est masqué visuellement sur bureau : la feuille est le dos du ruban. Mobile : bandeau, pile en bande défilante horizontale (cartes à 72 %), bouton d'export, ruban, puis la feuille toujours ouverte (la preuve doit rester visible quand on touche une ligne). Conteneur de 1400 px au plus, marges de 1 rem ; gouttière de 2 rem ; sections espacées de 1,75 rem.

## Elevation & Depth

Des objets posés sur un sous-main : le papier porte une ombre douce, rien ne flotte.

### Shadow Vocabulary
- **Papier posé** (`0 10px 24px rgb(0 0 0 / 0.32)`) : ruban et feuille.
- **Ticket** (`0 1px 0 #e9edea, 0 4px 10px rgb(0 0 0 / 0.22)`) ; ticket choisi : `0 10px 22px rgb(0 0 0 / 0.4)`.
- **Bouton papier / encre** (`0 4px 12px rgb(0 0 0 / 0.28–0.3)`).

### Named Rules
**The Soft-Lift Rule.** Aucune ombre dure sans flou : la profondeur est celle d'un papier sur un bureau.

## Shapes

Coins presque droits pour le papier (2 px), 4 px pour les contrôles. Le bas du ruban est déchiré en dents de scie (masque CSS, dents de 9 px). L'agrafe est un trait plat (SVG, gris #7d847f, 3 px), inclinée de −9°, au coin du ruban.

## Components

### Buttons
- **Papier** (Déposer vos PDF) : papier, encre, 48 px, ombre douce ; blanc pur au survol, enfoncement de 1 px au clic.
- **Encre** (Télécharger l'Excel) : encre pleine, texte papier, bord papier ; en haut de la pile, pleine largeur.
- **Trait** (Recharger les exemples) : transparent, bord sur-vert-doux, fond sous-main-clair au survol.
- **Focus** : anneau surligneur jaune de 3 px, décalé de 2 px, partout.

### Ticket (la pile)
Papier, quatre informations sans troncature du numéro : fournisseur (2 lignes au plus), type et numéro (entier), total, état (« ✓ Pointé » en encre ou « ◄ À revoir · n » en rouge). Choisi : il sort de la pile (10 px), ombre plus profonde, contour papier de 2 px décalé de 3 px.

### Le ruban (Signature Component)
En-tête : nom du fichier, type et fournisseur, puis l'aide du geste (« Survolez / Touchez une ligne… »). Lignes en grille `symbole | montant (aligné à droite) | libellé | marque`, séparées par des tirets imprimés : `#` numéro, date, ICE (non additionnés) ; `+` lignes du tableau ; `◇` sous-total des lignes ; `−` remise ; HT ; `+` TVA par taux ; `*` calculé ; TTC lu ; `=` montant en lettres. Un écart : montant barré, libellé et marque ◄ en rouge, note explicative dessous. Pied : verdict « ✓ POINTÉ · TOUT TOMBE JUSTE » ou « ◄ À REVOIR · n ÉCARTS ». Impression ligne à ligne (70 ms, avance du papier par clip-path), verdict en dernier ; désactivée si l'utilisateur réduit les animations.

### La preuve
Survoler, toucher ou atteindre au clavier une ligne : la ligne garde le surligneur et un contour d'encre de 1 px, et un cadre surligneur (bord encre 2 px) se pose sur la position lue dans le PDF, avec un éclair de 500 ms. Le cadre change de page si besoin.

## Do's and Don'ts

### Do:
- **Do** garder le sous-main vert sur toute la page et le papier pour les objets seulement.
- **Do** imprimer chaque contrôle comme une ligne de ruban avec son symbole de machine.
- **Do** marquer un écart trois fois : rouge, barré, ◄ — et l'expliquer en une phrase.
- **Do** relier chaque valeur à sa source dans le PDF.
- **Do** héberger les polices et tout le code sur le site : rien ne part vers un tiers.

### Don't:
- **Don't** utiliser le rouge pour une action ou un décor.
- **Don't** passer en papier crème, ni imiter une matière (biseau, embossage, texture de papier).
- **Don't** grossir le total du ruban : une seule taille de chiffres.
- **Don't** tronquer un numéro de facture ou un montant.
- **Don't** laisser ✓ ◄ ◇ en texte : ils tombent sur une police système.
- **Don't** afficher un client, un volume traité ou un avis : l'outil est une démonstration.
