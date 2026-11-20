# Pointage — vos factures en Excel, recomptées une à une

**En ligne : https://pointage-demo.netlify.app** — les 9 exemples se chargent à l'arrivée.

Démonstration du portfolio freelance (n°4 : lecture de documents). **Outil fictif** : les 9 factures
d'exemple sont inventées.

Déposez des factures ou des devis PDF : chaque montant est **recompté**, et ce qui ne tombe pas juste est
**signalé, jamais deviné**. Le résultat se télécharge en Excel. **Les PDF ne quittent pas l'ordinateur** :
tout se passe dans le navigateur (pdf.js), aucun serveur, aucune API.

| Ce qui est contrôlé | Comment |
|---|---|
| HT + TVA = TTC | recalculé au centime ; un écart s'imprime en rouge sur le ruban |
| TVA = taux × HT | pour une facture à un seul taux |
| Taux de TVA | 20, 14, 10 ou 7 % ; un autre taux est signalé |
| Lignes du tableau | quantité × prix = montant, et somme des lignes = HT (+ remise) |
| Montant en lettres | « Arrêtée la présente facture à la somme de… » relu et comparé au total |
| ICE | 15 chiffres ; celui du fournisseur et celui du client sont distingués |
| Document scanné | détecté (aucun texte) et signalé : il faut le saisir à la main |

Chaque valeur garde l'endroit du PDF où elle a été lue : survoler une ligne du ruban l'encadre dans le document.

## Mesuré, pas affirmé

Détail dans [MESURES.md](MESURES.md) :
- jeu d'essai (9 documents dont 5 pièges) : **90/90** champs justes, alertes exactes sur 9/9 ;
- jeu de contrôle écrit **après** le moteur : **48/50** avant retouche ; les 2 ratés étaient des libellés
  inconnus, signalés « introuvable », sans valeur inventée ;
- **0** montant faux sur un document déclaré vérifié ;
- tests par mutation : **9/9** contrôles retirés détectés ; export Excel relu par un test.

## Lancer

```bash
npm install
npm test                 # mesures + export Excel
npm run dev              # http://localhost:5173 (les 9 exemples se chargent à l'arrivée)
python outils/generer_factures.py    # régénère le jeu d'essai
python outils/muter.py               # tests par mutation
```

Lien direct pour un devis : `/?doc=3&preuve=10` ouvre la facture piégée n°3 et encadre le TTC lu.

## Limites, dites franchement

- PDF avec du texte seulement : les scans sont signalés, pas lus (reconnaissance de texte = étape suivante).
- Un fournisseur aux libellés inconnus donnera « introuvable » : c'est voulu, et c'est là qu'une adaptation
  aux factures réelles d'un client se fait (une demi-journée par famille de factures).
- Factures en français ; pas d'arabe pour l'instant.

## Technique

Vite + TypeScript sans framework. `src/moteur/` : lecture (pdf.js, Apache 2.0), montants en centimes, montant
en lettres, contrôles, export (exceljs, MIT). `src/ruban.ts` : la grammaire des calculatrices imprimantes
(`#` non additionné, `+`, `◇` sous-total, `*` total, `◄` écart).
