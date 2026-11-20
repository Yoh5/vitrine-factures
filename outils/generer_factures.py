"""Jeu d'essai : factures et devis marocains FICTIFS, chacun avec ses bonnes valeurs (verite.json).

Chaque document a une mise en page et un vocabulaire différents (« Total HT », « Montant hors taxes »,
« Net à payer »…) et certains portent un piège que le lecteur doit SIGNALER, jamais corriger en silence :
TTC faux, montant en lettres qui ne correspond pas, TVA absente, ICE incomplet, document scanné.

Usage : python outils/generer_factures.py   ->  public/exemples/*.pdf + public/exemples/verite.json
Les sociétés, numéros ICE/IF/RC et adresses sont inventés.
"""
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ICI = Path(__file__).resolve().parent.parent
SORTIE = ICI / "public" / "exemples"
SORTIE.mkdir(parents=True, exist_ok=True)
L, H = A4
D = lambda x: Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_UP)


# ---------------------------------------------------------------- nombres
def fr(n, sep_milliers=" ", sep_dec=","):
    """1234.5 -> '1 234,50' (ou autre convention)."""
    entier, dec = f"{D(n):.2f}".split(".")
    groupes = []
    while len(entier) > 3:
        groupes.insert(0, entier[-3:])
        entier = entier[:-3]
    groupes.insert(0, entier)
    return sep_milliers.join(groupes) + sep_dec + dec


UNITES = "zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize".split()
DIZAINES = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante"}


def _cent(n):
    if n < 17:
        return UNITES[n]
    if n < 20:
        return "dix-" + UNITES[n - 10]
    d, u = divmod(n, 10)
    if d in (7, 9):
        base = "soixante" if d == 7 else "quatre-vingt"
        reste = n - (60 if d == 7 else 80)
        lien = " et " if reste == 11 and d == 7 else "-"
        return base + lien + _cent(reste)
    if d == 8:
        return "quatre-vingts" if u == 0 else "quatre-vingt-" + UNITES[u]
    if u == 0:
        return DIZAINES[d]
    return DIZAINES[d] + (" et un" if u == 1 else "-" + UNITES[u])


def _mille(n):
    c, r = divmod(n, 100)
    if c == 0:
        return _cent(r)
    tete = "cent" if c == 1 else UNITES[c] + " cent" + ("s" if r == 0 else "")
    return tete if r == 0 else tete + " " + _cent(r)


def en_lettres(n):
    """Entier en toutes lettres (orthographe traditionnelle) jusqu'au million."""
    n = int(n)
    if n == 0:
        return "zéro"
    mil, r = divmod(n, 1000)
    parts = []
    if mil:
        parts.append("mille" if mil == 1 else _mille(mil).replace("cents", "cent") + " mille")
    if r:
        parts.append(_mille(r))
    return " ".join(parts)


def somme_en_lettres(montant):
    dh = int(D(montant))
    cts = int((D(montant) - dh) * 100)
    t = en_lettres(dh) + " dirhams"
    if cts:
        t += " et " + en_lettres(cts) + " centimes"
    return t[0].upper() + t[1:]


# ---------------------------------------------------------------- données
def calculer(lignes, taux_par_ligne):
    ht = sum(D(q * pu) for (_, q, pu) in lignes)
    tva = {}
    for (d, q, pu), t in zip(lignes, taux_par_ligne):
        tva[t] = tva.get(t, Decimal(0)) + D(q * pu) * Decimal(t) / 100
    tva = {t: D(v) for t, v in tva.items()}
    return D(ht), tva, D(ht + sum(tva.values()))


DOCS = []


def doc(fichier, verite, dessin):
    DOCS.append((fichier, verite, dessin))


# ---------------------------------------------------------------- mises en page
def entete_simple(c, f, y=H - 25 * mm):
    c.setFont("Helvetica-Bold", 16); c.drawString(20 * mm, y, f["nom"])
    c.setFont("Helvetica", 9)
    for i, l in enumerate(f["adresse"]):
        c.drawString(20 * mm, y - (6 + 4.5 * i) * mm, l)


def pied_legal(c, f):
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(L / 2, 14 * mm, f"{f['nom']} - RC {f['rc']} - IF {f['if']} - Patente {f['patente']} - ICE {f['ice']}")


def tableau(c, x, y, lignes, colonnes, fmt=fr, entetes=("Désignation", "Qté", "P.U. HT", "Montant HT"), police=9):
    c.setFont("Helvetica-Bold", police)
    for (cx, align), t in zip(colonnes, entetes):
        (c.drawString if align == "g" else c.drawRightString)(cx, y, t)
    c.line(x, y - 2 * mm, L - 20 * mm, y - 2 * mm)
    c.setFont("Helvetica", police)
    yy = y - 7 * mm
    for (d, q, pu) in lignes:
        vals = [d, str(q), fmt(pu), fmt(q * pu)]
        for (cx, align), v in zip(colonnes, vals):
            (c.drawString if align == "g" else c.drawRightString)(cx, yy, v)
        yy -= 6 * mm
    c.line(x, yy + 3 * mm, L - 20 * mm, yy + 3 * mm)
    return yy - 4 * mm


COLS = [(20 * mm, "g"), (120 * mm, "d"), (155 * mm, "d"), (L - 20 * mm, "d")]

ATLAS = dict(nom="Atlas Fournitures SARL", adresse=["14, rue Ibn Battouta, Maârif", "20330 Casablanca", "Tél. 05 22 00 11 22"],
             ice="001523874000062", **{"if": "40211875"}, rc="389117", patente="34512870")
SOUSS = dict(nom="Imprimerie Souss Print", adresse=["Lot 112, quartier industriel Tassila", "80000 Agadir"],
             ice="002167339000019", **{"if": "15288342"}, rc="44120", patente="48870112")
RIF = dict(nom="Rif Clim Services", adresse=["27, avenue Mohammed V", "90000 Tanger"],
           ice="001987654000033", **{"if": "50873321"}, rc="77610", patente="57720441")
OASIS = dict(nom="Oasis Traiteur", adresse=["Route de l'Ourika, km 7", "40000 Marrakech"],
             ice="002345678000047", **{"if": "26655410"}, rc="98231", patente="45112783")
CLIENT = dict(nom="Dar Hdiya (boutique de démonstration)", ice="003112244000055", adresse="9, rue Ibnou Mounir, Casablanca")


# 1. Facture propre, TVA 20 %, montants « 1 234,50 »
def f1():
    lignes = [("Ramette papier A4 80 g (carton de 5)", 12, 245.0), ("Cartouche toner noir LX-410", 3, 690.0),
              ("Classeur à levier dos 8 cm", 40, 18.5)]
    ht, tva, ttc = calculer(lignes, [20, 20, 20])
    v = dict(type="facture", numero="FA-2026-0412", date="2026-10-14", fournisseur=ATLAS["nom"], ice_fournisseur=ATLAS["ice"],
             client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht), tva={str(k): str(x) for k, x in tva.items()},
             ttc=str(ttc), devise="MAD", lettres=True, alertes=[])

    def dessin(c):
        entete_simple(c, ATLAS)
        c.setFont("Helvetica-Bold", 22); c.drawRightString(L - 20 * mm, H - 25 * mm, "FACTURE")
        c.setFont("Helvetica", 10)
        c.drawRightString(L - 20 * mm, H - 33 * mm, "N° FA-2026-0412")
        c.drawRightString(L - 20 * mm, H - 38 * mm, "Date : 14/10/2026")
        c.setFont("Helvetica-Bold", 10); c.drawString(110 * mm, H - 55 * mm, "Client")
        c.setFont("Helvetica", 9.5)
        c.drawString(110 * mm, H - 61 * mm, CLIENT["nom"]); c.drawString(110 * mm, H - 66 * mm, CLIENT["adresse"])
        c.drawString(110 * mm, H - 71 * mm, f"ICE : {CLIENT['ice']}")
        y = tableau(c, 20 * mm, H - 92 * mm, lignes, COLS)
        c.setFont("Helvetica", 10)
        for lab, val in [("Total HT", fr(ht)), ("TVA 20 %", fr(tva[20])), ("Total TTC", fr(ttc) + " DH")]:
            c.drawString(125 * mm, y, lab); c.drawRightString(L - 20 * mm, y, val); y -= 6 * mm
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(20 * mm, y - 6 * mm, f"Arrêtée la présente facture à la somme de : {somme_en_lettres(ttc)} TTC.")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, y - 13 * mm, "Règlement : virement à 30 jours.")
        pied_legal(c, ATLAS)
    doc("01-facture-simple.pdf", v, dessin)


# 2. Deux taux de TVA (20 % et 10 %), libellés « Montant hors taxes », « Net à payer »
def f2():
    lignes = [("Menu buffet 40 couverts", 40, 120.0), ("Location vaisselle", 1, 800.0), ("Service (2 serveurs)", 2, 450.0)]
    taux = [10, 20, 20]
    ht, tva, ttc = calculer(lignes, taux)
    v = dict(type="facture", numero="2026/118", date="2026-09-03", fournisseur=OASIS["nom"], ice_fournisseur=OASIS["ice"],
             client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht), tva={str(k): str(x) for k, x in sorted(tva.items())},
             ttc=str(ttc), devise="MAD", lettres=False, alertes=[])

    def dessin(c):
        c.setFillColorRGB(0.35, 0.2, 0.1); c.rect(0, H - 40 * mm, L, 40 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1); c.setFont("Helvetica-Bold", 18); c.drawString(20 * mm, H - 20 * mm, OASIS["nom"])
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 27 * mm, "Route de l'Ourika, km 7 - 40000 Marrakech")
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 12); c.drawString(20 * mm, H - 55 * mm, "Facture n° 2026/118 du 03/09/2026")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 62 * mm, f"Doit : {CLIENT['nom']} - ICE {CLIENT['ice']}")
        cols = [(20 * mm, "g"), (105 * mm, "d"), (135 * mm, "d"), (160 * mm, "d"), (L - 20 * mm, "d")]
        c.setFont("Helvetica-Bold", 9)
        for (cx, a), t in zip(cols, ("Désignation", "Qté", "Prix unitaire", "TVA", "Total HT")):
            (c.drawString if a == "g" else c.drawRightString)(cx, H - 80 * mm, t)
        c.setFont("Helvetica", 9); yy = H - 87 * mm
        for (d, q, pu), t in zip(lignes, taux):
            for (cx, a), val in zip(cols, (d, str(q), fr(pu), f"{t}%", fr(q * pu))):
                (c.drawString if a == "g" else c.drawRightString)(cx, yy, val)
            yy -= 6 * mm
        yy -= 6 * mm
        c.setFont("Helvetica", 10)
        for lab, val in [("Montant hors taxes", fr(ht)), ("TVA 10%", fr(tva[10])), ("TVA 20%", fr(tva[20]))]:
            c.drawString(115 * mm, yy, lab); c.drawRightString(L - 20 * mm, yy, val); yy -= 6 * mm
        c.setFont("Helvetica-Bold", 11); c.drawString(115 * mm, yy, "Net à payer (MAD)"); c.drawRightString(L - 20 * mm, yy, fr(ttc))
        pied_legal(c, OASIS)
    doc("02-deux-taux-de-tva.pdf", v, dessin)


# 3. PIÈGE : TTC faux (HT + TVA ne donne pas le TTC imprimé)
def f3():
    lignes = [("Entretien climatiseur split 12000 BTU", 4, 350.0), ("Recharge gaz R410", 2, 600.0)]
    ht, tva, ttc = calculer(lignes, [20, 20])
    faux = ttc + 100
    v = dict(type="facture", numero="RCS-0937", date="2026-08-21", fournisseur=RIF["nom"], ice_fournisseur=RIF["ice"],
             client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht), tva={"20": str(tva[20])}, ttc=str(faux),
             devise="MAD", lettres=False, alertes=["ttc_incoherent"])

    def dessin(c):
        entete_simple(c, RIF)
        c.setFont("Helvetica-Bold", 14); c.drawString(20 * mm, H - 55 * mm, "FACTURE RCS-0937")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 61 * mm, "Tanger, le 21/08/2026")
        c.drawString(20 * mm, H - 66 * mm, f"Client : {CLIENT['nom']} (ICE {CLIENT['ice']})")
        y = tableau(c, 20 * mm, H - 85 * mm, lignes, COLS)
        c.setFont("Helvetica", 10)
        for lab, val in [("Total HT", fr(ht)), ("TVA (20%)", fr(tva[20])), ("Total TTC", fr(faux))]:
            c.drawString(125 * mm, y, lab); c.drawRightString(L - 20 * mm, y, val); y -= 6 * mm
        pied_legal(c, RIF)
    doc("03-piege-ttc-faux.pdf", v, dessin)


# 4. Devis, montants « 12.345,60 » (point des milliers), montant en lettres correct
def f4():
    lignes = [("Impression catalogue 24 pages, 1000 ex.", 1, 9800.0), ("Conception graphique", 1, 2500.0),
              ("Livraison Agadir - Casablanca", 1, 350.0)]
    ht, tva, ttc = calculer(lignes, [20, 20, 20])
    v = dict(type="devis", numero="DV-2026-77", date="2026-11-02", fournisseur=SOUSS["nom"], ice_fournisseur=SOUSS["ice"],
             client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht), tva={"20": str(tva[20])}, ttc=str(ttc),
             devise="MAD", lettres=True, alertes=[])
    f = lambda n: fr(n, ".", ",")

    def dessin(c):
        entete_simple(c, SOUSS)
        c.setFont("Helvetica-Bold", 20); c.drawRightString(L - 20 * mm, H - 25 * mm, "DEVIS")
        c.setFont("Helvetica", 10)
        c.drawRightString(L - 20 * mm, H - 33 * mm, "Devis n° : DV-2026-77")
        c.drawRightString(L - 20 * mm, H - 38 * mm, "Date : 02/11/2026")
        c.drawRightString(L - 20 * mm, H - 43 * mm, "Validité : 30 jours")
        c.drawString(20 * mm, H - 60 * mm, f"À l'attention de : {CLIENT['nom']}")
        c.drawString(20 * mm, H - 65 * mm, f"ICE client : {CLIENT['ice']}")
        y = tableau(c, 20 * mm, H - 82 * mm, lignes, COLS, fmt=f)
        c.setFont("Helvetica", 10)
        for lab, val in [("Total H.T.", f(ht)), ("T.V.A. 20%", f(tva[20])), ("Total T.T.C.", f(ttc) + " MAD")]:
            c.drawString(125 * mm, y, lab); c.drawRightString(L - 20 * mm, y, val); y -= 6 * mm
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(20 * mm, y - 6 * mm, "Arrêté le présent devis à la somme de :")
        c.drawString(20 * mm, y - 11 * mm, somme_en_lettres(ttc) + " toutes taxes comprises.")
        pied_legal(c, SOUSS)
    doc("04-devis-points-milliers.pdf", v, dessin)


# 5. PIÈGE : montant en lettres différent du TTC en chiffres
def f5():
    lignes = [("Stylo bille bleu (boîte de 50)", 6, 95.0), ("Bloc-notes A5 quadrillé", 50, 12.0)]
    ht, tva, ttc = calculer(lignes, [20, 20])
    v = dict(type="facture", numero="FA-2026-0455", date="2026-11-05", fournisseur=ATLAS["nom"], ice_fournisseur=ATLAS["ice"],
             client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht), tva={"20": str(tva[20])}, ttc=str(ttc),
             devise="MAD", lettres=False, alertes=["lettres_differentes"])

    def dessin(c):
        entete_simple(c, ATLAS)
        c.setFont("Helvetica-Bold", 22); c.drawRightString(L - 20 * mm, H - 25 * mm, "FACTURE")
        c.setFont("Helvetica", 10)
        c.drawRightString(L - 20 * mm, H - 33 * mm, "N° FA-2026-0455")
        c.drawRightString(L - 20 * mm, H - 38 * mm, "Date : 05/11/2026")
        c.drawString(110 * mm, H - 61 * mm, CLIENT["nom"]); c.drawString(110 * mm, H - 66 * mm, f"ICE : {CLIENT['ice']}")
        y = tableau(c, 20 * mm, H - 85 * mm, lignes, COLS)
        c.setFont("Helvetica", 10)
        for lab, val in [("Total HT", fr(ht)), ("TVA 20 %", fr(tva[20])), ("Total TTC", fr(ttc) + " DH")]:
            c.drawString(125 * mm, y, lab); c.drawRightString(L - 20 * mm, y, val); y -= 6 * mm
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(20 * mm, y - 6 * mm, f"Arrêtée la présente facture à la somme de : {somme_en_lettres(ttc + 1000)} TTC.")
        pied_legal(c, ATLAS)
    doc("05-piege-lettres-differentes.pdf", v, dessin)


# 6. PIÈGE : aucune ligne de TVA, et ICE du fournisseur incomplet (14 chiffres)
def f6():
    lignes = [("Réparation porte coulissante vitrine", 1, 1800.0), ("Main d'oeuvre (heures)", 3, 150.0)]
    ht = D(sum(q * pu for _, q, pu in lignes))
    v = dict(type="facture", numero="F 2026-31", date="2026-07-12", fournisseur="Menuiserie Al Khachab",
             ice_fournisseur=None, client=CLIENT["nom"], ice_client=None, ht=None, tva=None, ttc=str(ht),
             devise="MAD", lettres=False, alertes=["tva_introuvable", "ice_invalide"])

    def dessin(c):
        c.setFont("Helvetica-Bold", 15); c.drawString(20 * mm, H - 25 * mm, "Menuiserie Al Khachab")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 31 * mm, "Derb Sidi Bouloukat, Médina - Marrakech")
        c.drawString(20 * mm, H - 36 * mm, "ICE 00198765400003")
        c.setFont("Helvetica-Bold", 12); c.drawString(20 * mm, H - 52 * mm, "Facture F 2026-31 - Marrakech le 12/07/2026")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 58 * mm, f"Client : {CLIENT['nom']}")
        y = tableau(c, 20 * mm, H - 75 * mm, lignes, COLS)
        c.setFont("Helvetica-Bold", 11); c.drawString(125 * mm, y, "TOTAL"); c.drawRightString(L - 20 * mm, y, fr(ht) + " DH")
    doc("06-piege-sans-tva-ice-incomplet.pdf", v, dessin)


# 7. Montants « 1,234.50 » (virgule des milliers), libellés en majuscules, deux pages
def f7():
    lignes = [(f"Rouleau thermique 80x80 (lot {i})", 10, 42.0 + i) for i in range(1, 31)]
    ht, tva, ttc = calculer(lignes, [20] * len(lignes))
    v = dict(type="facture", numero="INV-26-5521", date="2026-10-30", fournisseur=SOUSS["nom"], ice_fournisseur=SOUSS["ice"],
             client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht), tva={"20": str(tva[20])}, ttc=str(ttc),
             devise="MAD", lettres=False, alertes=[])
    f = lambda n: fr(n, ",", ".")

    def dessin(c):
        entete_simple(c, SOUSS)
        c.setFont("Helvetica-Bold", 16); c.drawRightString(L - 20 * mm, H - 25 * mm, "FACTURE / INVOICE")
        c.setFont("Helvetica", 9.5)
        c.drawRightString(L - 20 * mm, H - 32 * mm, "N° INV-26-5521")
        c.drawRightString(L - 20 * mm, H - 37 * mm, "DATE : 30/10/2026")
        c.drawString(20 * mm, H - 55 * mm, f"CLIENT : {CLIENT['nom'].upper()}  -  ICE : {CLIENT['ice']}")
        y = tableau(c, 20 * mm, H - 70 * mm, lignes[:22], COLS, fmt=f)
        c.setFont("Helvetica-Oblique", 8); c.drawRightString(L - 20 * mm, y, "suite page 2"); pied_legal(c, SOUSS)
        c.showPage()
        y = tableau(c, 20 * mm, H - 30 * mm, lignes[22:], COLS, fmt=f)
        c.setFont("Helvetica-Bold", 10)
        for lab, val in [("TOTAL HT", f(ht)), ("TVA 20%", f(tva[20])), ("TOTAL TTC (MAD)", f(ttc))]:
            c.drawString(120 * mm, y, lab); c.drawRightString(L - 20 * mm, y, val); y -= 6 * mm
        pied_legal(c, SOUSS)
    doc("07-deux-pages-virgule-milliers.pdf", v, dessin)


# 8. PIÈGE : document scanné (image seule, aucun texte lisible)
def f8():
    v = dict(type=None, numero=None, date=None, fournisseur=None, ice_fournisseur=None, client=None, ice_client=None,
             ht=None, tva=None, ttc=None, devise=None, lettres=False, alertes=["document_scanne"])

    def dessin(c):
        # une « photo » de facture : rien que des formes, aucun texte extractible
        c.setFillColorRGB(0.93, 0.92, 0.89); c.rect(15 * mm, 20 * mm, L - 30 * mm, H - 40 * mm, fill=1, stroke=0)
        c.setFillColorRGB(0.55, 0.55, 0.55)
        for i in range(26):
            w = (60 + (i * 37) % 90) * mm
            c.rect(25 * mm, H - (40 + 9 * i) * mm, w, 2.4 * mm, fill=1, stroke=0)
    doc("08-piege-document-scanne.pdf", v, dessin)


# 9. Facture avec remise globale avant TVA et taux de 14 % (transport)
def f9():
    lignes = [("Transport marchandises Casablanca - Fès", 2, 1500.0), ("Manutention", 4, 200.0)]
    brut = D(sum(q * pu for _, q, pu in lignes))
    remise = D(brut * Decimal("0.05"))
    ht = brut - remise
    tva = D(ht * Decimal("0.14"))
    ttc = ht + tva
    v = dict(type="facture", numero="TR-1188", date="2026-06-18", fournisseur="Trans Fès Logistique",
             ice_fournisseur="002900114000082", client=CLIENT["nom"], ice_client=CLIENT["ice"], ht=str(ht),
             tva={"14": str(tva)}, ttc=str(ttc), devise="MAD", lettres=True, alertes=[])

    def dessin(c):
        c.setFont("Helvetica-Bold", 15); c.drawString(20 * mm, H - 25 * mm, "Trans Fès Logistique")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 31 * mm, "Zone industrielle Sidi Brahim - Fès")
        c.drawString(20 * mm, H - 36 * mm, "ICE : 002900114000082   IF : 33410098   RC : 51230")
        c.setFont("Helvetica-Bold", 12); c.drawString(20 * mm, H - 52 * mm, "FACTURE N° TR-1188")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 58 * mm, "Date de facturation : 18/06/2026")
        c.drawString(20 * mm, H - 63 * mm, f"Client : {CLIENT['nom']}  ICE {CLIENT['ice']}")
        y = tableau(c, 20 * mm, H - 80 * mm, lignes, COLS)
        c.setFont("Helvetica", 10)
        for lab, val in [("Total brut", fr(brut)), ("Remise 5 %", "- " + fr(remise)), ("Total HT", fr(ht)),
                         ("TVA 14%", fr(tva)), ("Total TTC", fr(ttc))]:
            c.drawString(125 * mm, y, lab); c.drawRightString(L - 20 * mm, y, val); y -= 6 * mm
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(20 * mm, y - 6 * mm, f"Arrêtée la présente facture à la somme de {somme_en_lettres(ttc)}.")
    doc("09-remise-tva-14.pdf", v, dessin)


for f in (f1, f2, f3, f4, f5, f6, f7, f8, f9):
    f()

verite = {}
for fichier, v, dessin in DOCS:
    c = canvas.Canvas(str(SORTIE / fichier), pagesize=A4)
    c.setTitle(fichier); c.setAuthor("Jeu d'essai fictif")
    dessin(c)
    c.save()
    verite[fichier] = v
(SORTIE / "verite.json").write_text(json.dumps(verite, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(DOCS)} documents dans {SORTIE}")
print("contrôle des lettres :", somme_en_lettres(Decimal("2971.20")), "|", somme_en_lettres(Decimal("15180")), "|", somme_en_lettres(Decimal("81.71")))
