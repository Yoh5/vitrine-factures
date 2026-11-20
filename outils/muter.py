"""Tests par mutation du moteur : chaque contrôle retiré doit faire échouer au moins un test."""
import subprocess
from pathlib import Path
F = Path(__file__).resolve().parent.parent / "src" / "moteur" / "lire.ts"
orig = F.read_text(encoding="utf-8")
MUTATIONS = [
    ("TTC incohérent ignoré", "if (L.ht !== null && L.ttc !== null && !egal(L.ht + sommeTva, L.ttc, 2))", "if (false)"),
    ("TVA mal calculée ignorée", "if (L.ht !== null && L.tva.length === 1 && !egal(", "if (false && !egal("),
    ("lettres non contrôlées", "if (!accord && reference !== null)", "if (false)"),
    ("taux inhabituel accepté", "if (!TAUX_MAROC.includes(x.taux))", "if (false)"),
    ("ICE de 14 chiffres accepté", "if (chiffres.length !== 15) {", "if (chiffres.length < 10) {"),
    ("ligne incohérente ignorée", "if (lg.quantite !== null && lg.prixUnitaire !== null && !egal(", "if (false && !egal("),
    ("scan non détecté", "if (texteTotal.replace(/\s/g, '').length < 30) {", "if (false) {"),
    ("TVA absente non signalée", "alerte('tva_introuvable'", "void ('tva_introuvable'"),
    ("remise oubliée dans les lignes", "L.ht + (L.remise ?? 0)", "L.ht"),
]
try:
    for nom, a, b in MUTATIONS:
        if a not in orig:
            print("INTROUVABLE :", nom); continue
        F.write_text(orig.replace(a, b, 1), encoding="utf-8")
        r = subprocess.run("npx vitest run", shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(("détecté  : " if r.returncode else "SURVIT   : ") + nom)
finally:
    F.write_text(orig, encoding="utf-8")
