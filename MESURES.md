# Mesures du moteur de lecture

Tout est mesuré avec le même pdf.js et le même moteur que dans le navigateur (`npm test`).

## Jeu d'essai : `public/exemples/` (9 documents, écrit avec le moteur)

| Mesure | Résultat |
|---|---|
| Champs justes (type, numéro, date, fournisseur, ICE, client, HT, TVA par taux, TTC) | **90 / 90** |
| Documents dont les alertes sont exactement celles attendues | **9 / 9** |
| Montant faux sur un document déclaré « vérifié » | **0** |

Pièges couverts : TTC faux, montant en lettres différent, TVA absente, ICE à 14 chiffres, document scanné.
Ce jeu a été construit en même temps que le moteur : son score est forcément flatteur.

## Jeu de contrôle : `test/controle/` (5 documents, écrit APRÈS le moteur)

Mesuré une fois avant toute retouche (20/11/2026) :

| Mesure | Résultat |
|---|---|
| Champs justes | **48 / 50** |
| Documents lus sans faute | 4 / 5 (avoir négatif, montants sans centimes, TVA mal calculée détectée, taux de 18 % et ligne fausse détectés) |
| Montant faux sur un document déclaré « vérifié » | **0** |

Les 2 champs manqués venaient de libellés inconnus (« Base HT », « Total à payer ») : le moteur a répondu
« introuvable » et marqué le document **à revoir**, sans inventer de valeur. Les deux libellés ont ensuite été
ajoutés ; le jeu de contrôle n'est donc plus aveugle (50 / 50 après correction).

## Tests par mutation : `python outils/muter.py`

Chaque contrôle est retiré à tour de rôle ; un test doit échouer. **9 / 9 détectés** : TTC incohérent, TVA mal
calculée, montant en lettres, taux inhabituel, ICE incomplet, ligne incohérente, document scanné, TVA absente,
remise oubliée dans la somme des lignes.

## Limites, dites franchement

- Documents fictifs générés, pas de vraies factures de clients : un vrai fournisseur aura des libellés que le
  moteur ne connaît pas. Il répondra alors « introuvable » (à revoir), c'est le comportement voulu.
- Les PDF scannés ne sont pas lus (aucun texte) : ils sont signalés. La reconnaissance de texte est l'étape suivante.
- Le nom du fournisseur est « le plus gros texte en haut de la première page » : un logo en texte peut le tromper.
