"""Jeu de CONTRÔLE : documents écrits APRÈS le moteur, avec un autre vocabulaire et d'autres mises en page.
Il ne sert qu'à mesurer ; on ne retouche pas le moteur pour le faire passer sans le dire.

Usage : python outils/generer_controle.py  ->  test/controle/*.pdf + test/controle/verite.json
"""
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import importlib.util
spec = importlib.util.spec_from_file_location("g", Path(__file__).with_name("generer_factures.py"))

SORTIE = Path(__file__).resolve().parent.parent / "test" / "controle"
SORTIE.mkdir(parents=True, exist_ok=True)
L, H = A4
D = lambda x: Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def fr(n, mil=" ", dec=","):
    e, d = f"{D(n):.2f}".split(".")
    g = []
    while len(e) > 3:
        g.insert(0, e[-3:]); e = e[:-3]
    g.insert(0, e)
    return mil.join(g) + dec + d


CLIENT = ("Café Bab Doukkala", "001777222000081")
DOCS = []


def ajouter(nom, verite, dessin):
    DOCS.append((nom, verite, dessin))


# C1 : « Base HT », « Montant TVA (20%) », « Total à payer », suffixe « Dhs », date en lettres
def c1():
    ht, tva = D(4200), D(840)
    ttc = ht + tva
    v = dict(type="facture", numero="0098/26", date="2026-10-14", fournisseur="Sahara Café Distribution",
             ice_fournisseur="002456789000011", client=CLIENT[0], ice_client=CLIENT[1], ht=str(ht), tva={"20": str(tva)},
             ttc=str(ttc), alertes=[])

    def d(c):
        c.setFont("Helvetica-Bold", 17); c.drawString(20 * mm, H - 24 * mm, "Sahara Café Distribution")
        c.setFont("Helvetica", 8.5); c.drawString(20 * mm, H - 30 * mm, "Bd Zerktouni 210, Casablanca - ICE 002456789000011 - RC 120988")
        c.setFont("Helvetica-Bold", 13); c.drawString(20 * mm, H - 48 * mm, "Facture numéro 0098/26")
        c.setFont("Helvetica", 10); c.drawString(20 * mm, H - 54 * mm, "Casablanca, le 14/10/2026")
        c.drawString(20 * mm, H - 64 * mm, f"Client : {CLIENT[0]}   ICE : {CLIENT[1]}")
        c.setFont("Helvetica-Bold", 9.5)
        for x, t, a in [(20, "Désignation", "g"), (130, "Quantité", "d"), (160, "PU", "d"), (190, "Total", "d")]:
            (c.drawString if a == "g" else c.drawRightString)(x * mm, H - 80 * mm, t)
        c.setFont("Helvetica", 9.5)
        for i, (des, q, pu) in enumerate([("Café moulu arabica 1 kg", 30, 110.0), ("Café grain robusta 1 kg", 10, 90.0)]):
            y = H - (87 + 6 * i) * mm
            c.drawString(20 * mm, y, des); c.drawRightString(130 * mm, y, str(q)); c.drawRightString(160 * mm, y, fr(pu)); c.drawRightString(190 * mm, y, fr(q * pu))
        c.setFont("Helvetica", 10)
        for i, (lab, val) in enumerate([("Base HT", fr(ht) + " Dhs"), ("Montant TVA (20%)", fr(tva) + " Dhs"), ("Total à payer", fr(ttc) + " Dhs")]):
            c.drawString(120 * mm, H - (110 + 6 * i) * mm, lab); c.drawRightString(190 * mm, H - (110 + 6 * i) * mm, val)
    ajouter("c1-base-ht-total-a-payer.pdf", v, d)


# C2 : montants SANS centimes (« 1 500 DH »), TVA 7 %
def c2():
    v = dict(type="facture", numero="EAU-5512", date="2026-09-30", fournisseur="Source Ifrane Eaux",
             ice_fournisseur="001122334000055", client=CLIENT[0], ice_client=CLIENT[1], ht="3000.00", tva={"7": "210.00"},
             ttc="3210.00", alertes=[])

    def d(c):
        c.setFont("Helvetica-Bold", 16); c.drawString(20 * mm, H - 24 * mm, "Source Ifrane Eaux")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 30 * mm, "ICE 001122334000055 | IF 7781234 | RC 3321 Meknès")
        c.setFont("Helvetica-Bold", 12); c.drawRightString(190 * mm, H - 24 * mm, "FACTURE N° EAU-5512")
        c.setFont("Helvetica", 10); c.drawRightString(190 * mm, H - 30 * mm, "Date : 30/09/2026")
        c.drawString(20 * mm, H - 46 * mm, f"Client : {CLIENT[0]} - ICE {CLIENT[1]}")
        c.setFont("Helvetica-Bold", 9.5); c.drawString(20 * mm, H - 62 * mm, "Désignation"); c.drawRightString(190 * mm, H - 62 * mm, "Montant HT")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 69 * mm, "Eau minérale 1,5 L (200 packs)"); c.drawRightString(190 * mm, H - 69 * mm, "3 000 DH")
        c.setFont("Helvetica", 10)
        for i, (lab, val) in enumerate([("Total HT", "3 000 DH"), ("TVA 7 %", "210 DH"), ("Total TTC", "3 210 DH")]):
            c.drawString(120 * mm, H - (82 + 6 * i) * mm, lab); c.drawRightString(190 * mm, H - (82 + 6 * i) * mm, val)
    ajouter("c2-sans-centimes-tva-7.pdf", v, d)


# C3 : PIÈGE TVA mal calculée (20 % de 1 000 = 200, imprimé 220) mais TTC cohérent avec la TVA imprimée
def c3():
    v = dict(type="facture", numero="F-778", date="2026-11-10", fournisseur="Bureau Plus Rabat",
             ice_fournisseur="003456123000094", client=CLIENT[0], ice_client=CLIENT[1], ht="1000.00", tva={"20": "220.00"},
             ttc="1220.00", alertes=["tva_incoherente"])

    def d(c):
        c.setFont("Helvetica-Bold", 16); c.drawString(20 * mm, H - 24 * mm, "Bureau Plus Rabat")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 30 * mm, "Agdal, Rabat - RC 99812 - ICE 003456123000094")
        c.setFont("Helvetica-Bold", 12); c.drawString(20 * mm, H - 46 * mm, "FACTURE N° F-778 du 10/11/2026")
        c.setFont("Helvetica", 10); c.drawString(20 * mm, H - 53 * mm, f"Client : {CLIENT[0]} (ICE {CLIENT[1]})")
        c.setFont("Helvetica-Bold", 9.5); c.drawString(20 * mm, H - 66 * mm, "Désignation"); c.drawRightString(190 * mm, H - 66 * mm, "Montant")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 73 * mm, "Chaise de bureau ergonomique"); c.drawRightString(190 * mm, H - 73 * mm, fr(1000))
        c.setFont("Helvetica", 10)
        for i, (lab, val) in enumerate([("Total HT", fr(1000)), ("TVA 20%", fr(220)), ("Total TTC", fr(1220))]):
            c.drawString(120 * mm, H - (86 + 6 * i) * mm, lab); c.drawRightString(190 * mm, H - (86 + 6 * i) * mm, val)
    ajouter("c3-piege-tva-mal-calculee.pdf", v, d)


# C4 : avoir (montants négatifs), libellés en anglais/français mélangés
def c4():
    v = dict(type="avoir", numero="AV-0012", date="2026-11-12", fournisseur="Atlas Fournitures SARL",
             ice_fournisseur="001523874000062", client=CLIENT[0], ice_client=CLIENT[1], ht="-500.00", tva={"20": "-100.00"},
             ttc="-600.00", alertes=[])

    def d(c):
        c.setFont("Helvetica-Bold", 16); c.drawString(20 * mm, H - 24 * mm, "Atlas Fournitures SARL")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 30 * mm, "Maârif, Casablanca - RC 389117 - IF 40211875 - ICE 001523874000062")
        c.setFont("Helvetica-Bold", 14); c.drawString(20 * mm, H - 46 * mm, "AVOIR N° AV-0012")
        c.setFont("Helvetica", 10); c.drawString(20 * mm, H - 52 * mm, "Date : 12/11/2026 - sur facture FA-2026-0412")
        c.drawString(20 * mm, H - 58 * mm, f"Client : {CLIENT[0]} - ICE {CLIENT[1]}")
        c.setFont("Helvetica-Bold", 9.5); c.drawString(20 * mm, H - 72 * mm, "Désignation"); c.drawRightString(190 * mm, H - 72 * mm, "Montant HT")
        c.setFont("Helvetica", 9.5); c.drawString(20 * mm, H - 79 * mm, "Retour 2 cartouches toner (défectueuses)"); c.drawRightString(190 * mm, H - 79 * mm, "-500,00")
        c.setFont("Helvetica", 10)
        for i, (lab, val) in enumerate([("Total HT", "-500,00"), ("TVA 20%", "-100,00"), ("Total TTC", "-600,00")]):
            c.drawString(120 * mm, H - (92 + 6 * i) * mm, lab); c.drawRightString(190 * mm, H - (92 + 6 * i) * mm, val)
    ajouter("c4-avoir-negatif.pdf", v, d)


# C5 : PIÈGE taux inconnu (18 %), ligne incohérente (3 x 250 = 750, imprimé 800)
def c5():
    v = dict(type="facture", numero="2026-0441", date="2026-10-02", fournisseur="Import Express Tanger",
             ice_fournisseur="002998877000066", client=CLIENT[0], ice_client=CLIENT[1], ht="800.00", tva={"18": "144.00"},
             ttc="944.00", alertes=["taux_inhabituel", "ligne_incoherente"])

    def d(c):
        c.setFont("Helvetica-Bold", 16); c.drawString(20 * mm, H - 24 * mm, "Import Express Tanger")
        c.setFont("Helvetica", 9); c.drawString(20 * mm, H - 30 * mm, "Zone franche, Tanger - RC 66001 - ICE 002998877000066")
        c.setFont("Helvetica-Bold", 12); c.drawString(20 * mm, H - 46 * mm, "Facture N° 2026-0441")
        c.setFont("Helvetica", 10); c.drawString(20 * mm, H - 52 * mm, "Date : 02/10/2026")
        c.drawString(20 * mm, H - 58 * mm, f"Client : {CLIENT[0]} - ICE {CLIENT[1]}")
        c.setFont("Helvetica-Bold", 9.5)
        for x, t, a in [(20, "Désignation", "g"), (130, "Qté", "d"), (160, "P.U.", "d"), (190, "Total", "d")]:
            (c.drawString if a == "g" else c.drawRightString)(x * mm, H - 72 * mm, t)
        c.setFont("Helvetica", 9.5)
        c.drawString(20 * mm, H - 79 * mm, "Moulin à café électrique"); c.drawRightString(130 * mm, H - 79 * mm, "3")
        c.drawRightString(160 * mm, H - 79 * mm, fr(250)); c.drawRightString(190 * mm, H - 79 * mm, fr(800))
        c.setFont("Helvetica", 10)
        for i, (lab, val) in enumerate([("Total HT", fr(800)), ("TVA 18%", fr(144)), ("Total TTC", fr(944))]):
            c.drawString(120 * mm, H - (92 + 6 * i) * mm, lab); c.drawRightString(190 * mm, H - (92 + 6 * i) * mm, val)
    ajouter("c5-piege-taux-et-ligne.pdf", v, d)


for f in (c1, c2, c3, c4, c5):
    f()
verite = {}
for nom, v, dessin in DOCS:
    c = canvas.Canvas(str(SORTIE / nom), pagesize=A4)
    dessin(c); c.save()
    verite[nom] = v
(SORTIE / "verite.json").write_text(json.dumps(verite, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(DOCS), "documents de contrôle")
