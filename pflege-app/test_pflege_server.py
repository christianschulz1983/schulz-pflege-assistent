# -*- coding: utf-8 -*-
"""Selbsttest fuer die Auslese des lokalen Servers (pflege_server.py).

Der Selbsttest der App prueft den Browser-Teil. Diesen Teil hier prueft er nicht,
weil er in Python laeuft. Aufruf im Ordner pflege-app:

    python test_pflege_server.py

Geprueft wird die Modul-5-Zeile in BEIDEN Formularen:
  Medizinischer Dienst  – die Zahl steht unmittelbar in der Zeitraumspalte.
  Medicproof GmbH       – die Markierung sagt nur den Zeitraum, die Zahl steht
                          rechts in der eigenen Spalte "Haeufigkeit".
Dafuer werden zwei PDF-Seiten mit dem jeweiligen Spaltenlayout erzeugt und
wieder eingelesen.
"""
import os
import sys

try:
    import fitz
except ImportError:
    print("PyMuPDF (fitz) fehlt - Test uebersprungen.")
    sys.exit(0)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pflege_server as srv

# Symbole aus KNOWN_FILLED / KNOWN_EMPTY, die die Basisschrift darstellen kann.
VOLL = "¤"   # angekreuzt
LEER = "¡"   # leer


def seite_medicproof():
    """entfaellt | selbstaendig | mit Hilfe: pro Tag | pro Woche | pro Monat | Haeufigkeit"""
    d = fitz.open()
    p = d.new_page(width=760, height=300)
    f = 9
    p.insert_text((60, 60), "in Bezug auf:", fontsize=f)
    p.insert_text((230, 60), "entfällt", fontsize=f)
    p.insert_text((320, 60), "selbständig", fontsize=f)
    p.insert_text((420, 60), "Tag", fontsize=f)
    p.insert_text((500, 60), "Woche", fontsize=f)
    p.insert_text((580, 60), "Monat", fontsize=f)
    p.insert_text((670, 60), "Häufigkeit", fontsize=f)
    zeilen = [
        (100, "5.5.1", "Medikation", 2, "3"),    # Markierung bei "pro Tag", Haeufigkeit 3
        (130, "5.5.13", "Arztbesuche", 3, "2"),  # Markierung bei "pro Woche", Haeufigkeit 2
        (160, "5.5.2", "Injektionen", 0, None),  # Markierung bei "entfaellt"
    ]
    spalten_x = [232, 330, 424, 508, 588]
    for y, nr, titel, markiert, zahl in zeilen:
        p.insert_text((60, y), nr, fontsize=f)
        p.insert_text((100, y), titel, fontsize=f)
        for i, x in enumerate(spalten_x):
            p.insert_text((x, y), VOLL if i == markiert else LEER, fontsize=f)
        if zahl:
            p.insert_text((680, y), zahl, fontsize=f)
    b = d.tobytes()
    d.close()
    return b


def seite_medizinischer_dienst():
    """Die ZAHL steht unmittelbar in der Zeitraumspalte, es gibt keine Spalte Haeufigkeit."""
    d = fitz.open()
    p = d.new_page(width=620, height=300)
    f = 9
    p.insert_text((60, 60), "Kriterium", fontsize=f)
    p.insert_text((330, 60), "Tag", fontsize=f)
    p.insert_text((430, 60), "Woche", fontsize=f)
    p.insert_text((530, 60), "Monat", fontsize=f)
    p.insert_text((60, 100), "4.5.1", fontsize=f)
    p.insert_text((100, 100), "Medikation", fontsize=f)
    p.insert_text((336, 100), "3", fontsize=f)
    p.insert_text((60, 130), "4.5.13", fontsize=f)
    p.insert_text((100, 130), "Arztbesuche", fontsize=f)
    p.insert_text((440, 130), "2", fontsize=f)
    b = d.tobytes()
    d.close()
    return b


fehler = []


geprueft = 0


def pruefe(name, ist, soll):
    global geprueft
    geprueft += 1
    if ist != soll:
        fehler.append("%s: erwartet %r, gelesen %r" % (name, soll, ist))


mp = srv.extract_values(seite_medicproof(), "application/pdf")
pruefe("Medicproof 4.5.1 Haeufigkeit", mp.get("4.5.1", {}).get("count"), 3)
pruefe("Medicproof 4.5.1 Zeitraum", mp.get("4.5.1", {}).get("period"), "D")
pruefe("Medicproof 4.5.13 Haeufigkeit", mp.get("4.5.13", {}).get("count"), 2)
pruefe("Medicproof 4.5.13 Zeitraum", mp.get("4.5.13", {}).get("period"), "W")
pruefe("Medicproof 4.5.2 entfaellt", mp.get("4.5.2", {}).get("count"), 0)
# Die Markierungsposition ist in Modul 5 KEINE Bewertungsstufe - sonst landet
# "pro Tag" (dritte Spalte) faelschlich als Stufe 2 im Formular.
pruefe("Medicproof 4.5.1 ohne Stufenindex", mp.get("4.5.1", {}).get("idx"), None)

md = srv.extract_values(seite_medizinischer_dienst(), "application/pdf")
pruefe("Med. Dienst 4.5.1 Haeufigkeit", md.get("4.5.1", {}).get("count"), 3)
pruefe("Med. Dienst 4.5.1 Zeitraum", md.get("4.5.1", {}).get("period"), "D")
pruefe("Med. Dienst 4.5.13 Haeufigkeit", md.get("4.5.13", {}).get("count"), 2)
pruefe("Med. Dienst 4.5.13 Zeitraum", md.get("4.5.13", {}).get("period"), "W")

def seite_modul4(verrutscht=False, fehlendes_kaestchen=False, doppelkreuz=False):
    """Vier Stufen wie in Modul 1/4. Optionen:
    verrutscht          – die Kreuze sitzen je Zeile leicht anders (andere Vorlage, Druck)
    fehlendes_kaestchen – in einer Zeile fehlt ein leeres Kaestchen (Erkennungsluecke)
    doppelkreuz         – eine Zeile traegt zwei Kreuze
    """
    d = fitz.open()
    p = d.new_page(width=620, height=320)
    f = 9
    spalten_x = [300, 360, 420, 480]
    p.insert_text((60, 60), "Kriterium", fontsize=f)
    zeilen = [(100, "4.4.1", 0), (130, "4.4.2", 1), (160, "4.4.3", 2), (190, "4.4.4", 3)]
    for k, (y, nr, markiert) in enumerate(zeilen):
        p.insert_text((60, y), nr, fontsize=f)
        p.insert_text((100, y), "Kriterium " + nr, fontsize=f)
        for i, x in enumerate(spalten_x):
            # dieselbe Spalte, aber leicht andere Position je Zeile
            xx = x + ((k % 3) - 1) * 4 if verrutscht else x
            if fehlendes_kaestchen and nr == "4.4.3" and i == 0:
                continue                      # erstes Kaestchen fehlt in dieser Zeile
            voll = (i == markiert) or (doppelkreuz and nr == "4.4.2" and i == 3)
            p.insert_text((xx, y), VOLL if voll else LEER, fontsize=f)
    b = d.tobytes()
    d.close()
    return b


def seite_formularfelder():
    """Gutachten als ausfuellbares Formular: das Kreuz steht in einer Checkbox,
    nicht im Text."""
    d = fitz.open()
    p = d.new_page(width=620, height=300)
    f = 9
    p.insert_text((60, 100), "4.1.1", fontsize=f)
    p.insert_text((100, 100), "Positionswechsel im Bett", fontsize=f)
    for i, x in enumerate([300, 360, 420, 480]):
        w = fitz.Widget()
        w.field_name = "k411_%d" % i
        w.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
        w.rect = fitz.Rect(x, 92, x + 10, 102)
        w.field_value = (i == 2)
        p.add_widget(w)
    b = d.tobytes()
    d.close()
    return b


# --- Robustheit der Markierungserkennung -------------------------------------
sauber = srv.extract_values(seite_modul4(), "application/pdf")
pruefe("Modul 4: erste Stufe", sauber.get("4.4.1", {}).get("idx"), 0)
pruefe("Modul 4: zweite Stufe", sauber.get("4.4.2", {}).get("idx"), 1)
pruefe("Modul 4: vierte Stufe", sauber.get("4.4.4", {}).get("idx"), 3)
pruefe("Sauber gelesener Wert gilt als sicher", sauber.get("4.4.1", {}).get("sicher"), True)
pruefe("Fundstelle wird mitgeliefert", sauber.get("4.4.1", {}).get("seite"), 1)

# Kreuze sitzen nicht exakt an derselben Stelle (andere Vorlage, anderer Druck)
verrutscht = srv.extract_values(seite_modul4(verrutscht=True), "application/pdf")
pruefe("Verrutschte Kreuze: Stufe bleibt richtig (4.4.2)", verrutscht.get("4.4.2", {}).get("idx"), 1)
pruefe("Verrutschte Kreuze: Stufe bleibt richtig (4.4.4)", verrutscht.get("4.4.4", {}).get("idx"), 3)

# Ein leeres Kaestchen wird nicht erkannt: frueher verschob sich der Index um eins
luecke = srv.extract_values(seite_modul4(fehlendes_kaestchen=True), "application/pdf")
pruefe("Fehlendes Kaestchen verschiebt die Stufe nicht", luecke.get("4.4.3", {}).get("idx"), 2)
pruefe("Unvollstaendige Zeile gilt als unsicher", luecke.get("4.4.3", {}).get("sicher"), False)
pruefe("Grund wird genannt", luecke.get("4.4.3", {}).get("grund"), "unvollstaendig")

# Zwei Kreuze in einer Zeile
doppelt = srv.extract_values(seite_modul4(doppelkreuz=True), "application/pdf")
pruefe("Doppelkreuz gilt als unsicher", doppelt.get("4.4.2", {}).get("sicher"), False)
pruefe("Doppelkreuz nennt den Grund", doppelt.get("4.4.2", {}).get("grund"), "mehrere")

# Ausfuellbares Formular: Checkbox statt Symbol im Text
formular = srv.extract_values(seite_formularfelder(), "application/pdf")
pruefe("Formular-Checkbox wird gelesen", formular.get("4.1.1", {}).get("idx"), 2)
pruefe("Formular-Checkbox gilt als sicher", formular.get("4.1.1", {}).get("sicher"), True)


if fehler:
    print("FEHLGESCHLAGEN:")
    for f_ in fehler:
        print("  -", f_)
    sys.exit(1)
print("Alle %d Serverpruefungen bestanden." % geprueft)
