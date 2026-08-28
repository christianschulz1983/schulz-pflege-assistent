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


def pruefe(name, ist, soll):
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

if fehler:
    print("FEHLGESCHLAGEN:")
    for f_ in fehler:
        print("  -", f_)
    sys.exit(1)
print("Alle 10 Serverpruefungen bestanden.")
