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


# ===================================================================================
# MEDICPROOF: Erkennung und Auslese (gemeldet: ein Medicproof-Gutachten wurde als
# Gutachten des Medizinischen Dienstes erkannt, die Stammdaten waren falsch).
# Alle Texte hier sind erfunden - es stehen keine echten Falldaten im Test.
# ===================================================================================

MP_TEXT = """
HUK-MUSTER-Krankenversicherung AG, Musterplatz 1, 96000 Musterstadt
Bei Rückfragen bitte angeben: 331/000000-Z-ABCDEF
Herrn
Serviceteam Leistung
Max Mustermann
Musterweg 3
Musterstadt, 05.09.2026
Pflegeversicherung: 331/000000-Z
Weiterhin Pflegebedürftigkeit nach Pflegegrad 3
Versicherte Person: Max Mustermann
Sehr geehrter Herr Mustermann,
der medizinische Dienst überprüfte die Pflegebedürftigkeit.
Die gutachterliche Untersuchung vom 03.09.2026 ergab keine Änderung.
Signiert von 1762 ProofForms 8 Dr. Muster Version 1.62.4 Seite 1/18 (abc) am 03.09.2026
HUK-MUSTER VS-Nr. 331/000000-Z Max Mustermann geboren 01.07.1929
1.1 Pflegerelevante Fremdbefunde
Pflegebegründende Diagnosen aus dem Vorgutachten: Herzinsuffizienz
In dem Einstufungsgutachten vom 22.09.2023 wurden folgende Beeinträchtigungen bewertet.
4 PFLEGEBEGRÜNDENDE stimmt DIAGNOSE(N)
• R26 Störungen des Ganges und der Mobilität
• G62.9 Polyneuropathie, nicht näher bezeichnet
Beeinträchtigungen oder weitere pflegebegründende Diagnosen: kognitive Einschränkungen,
Schwerhörigkeit, degenerative Wirbelsäulenerkrankung
5 MODULE DES BEGUTACHTUNGSINSTRUMENTS
Kopie 6. Gestaltung des Alltagslebens und sozialer Kontakte 7,5 Gesamtpunkte 65 überein
6.1 Pflegegrad 12,5 bis 27 bis 47,5 Gesamtpunkte unter 12,5 unter 27
"""

mp_meta = srv.extract_meta(MP_TEXT)
pruefe("Medicproof wird an ProofForms erkannt", srv.ist_medicproof(MP_TEXT), True)
pruefe("Medicproof: Organisation", mp_meta.get("organisation"), "Medicproof GmbH")
pruefe("Medicproof: Name aus 'Versicherte Person'", mp_meta.get("betreffend"), "Herr Max Mustermann")
pruefe("Medicproof: Abteilung ist kein Name", "Serviceteam" in (mp_meta.get("betreffend") or ""), False)
pruefe("Medicproof: Versichertennummer mit Schrägstrich", mp_meta.get("versnr"), "331/000000-Z")
pruefe("Medicproof: Geburtsdatum", mp_meta.get("geboren"), "01.07.1929")
pruefe("Medicproof: Begutachtungsdatum ist nicht das Vorgutachten",
       mp_meta.get("begutachtung"), "03.09.2026")
pruefe("Medicproof: Bescheiddatum aus dem Briefkopf", mp_meta.get("bescheid"), "05.09.2026")
pruefe("Medicproof: Gesamtpunkte aus der Ergebniszeile", mp_meta.get("pts"), "65")
pruefe("Medicproof: Pflegegrad", mp_meta.get("pg"), "3")
pruefe("Medicproof: Kasse erkannt", (mp_meta.get("kasse") or "").startswith("HUK-MUSTER"), True)

mp_diag = mp_meta.get("diagnoses") or []
pruefe("Diagnosen: Anzahl", len(mp_diag), 5)
pruefe("Diagnosen: ICD der ersten", mp_diag[0]["icd"] if mp_diag else "", "R26")
pruefe("Diagnosen: nicht die des Vorgutachtens",
       any("Herzinsuffizienz" in d["text"] for d in mp_diag), False)
pruefe("Diagnosen: Wasserzeichen entfernt",
       any("stimmt" in d["text"] for d in mp_diag), False)
pruefe("Diagnosen: Nachtrag als eigener Eintrag",
       any(d["text"] == "Schwerhörigkeit" for d in mp_diag), True)

# Ein Gutachten des Medizinischen Dienstes darf NICHT als Medicproof gelten
MD_TEXT = """
Medizinischer Dienst Nordrhein
Gutachten vom 14.03.2026
Versichertennummer: A123456789
Pflegegrad 2
Gesamtpunkte: 30,00
"""
md_meta = srv.extract_meta(MD_TEXT)
pruefe("Med. Dienst bleibt Med. Dienst", md_meta.get("organisation"), "Medizinischer Dienst Nordrhein")
pruefe("Med. Dienst ist nicht Medicproof", srv.ist_medicproof(MD_TEXT), False)
pruefe("Med. Dienst: Gesamtpunkte", md_meta.get("pts"), "30,00")
pruefe("Med. Dienst: Begutachtungsdatum", md_meta.get("begutachtung"), "14.03.2026")


# Medicproof zeichnet die Ankreuzfelder mit FontAwesome (privater Unicode-Bereich).
# Die Zeichen lassen sich mit der Grundschrift nicht in ein Test-PDF setzen, deshalb wird
# hier die Leseregel selbst geprueft - genau sie hat in einem echten Gutachten gefehlt.
fa_woerter = [
    (300.0, 50.0, 308.0, 58.0, "", 0, 0, 0),
    (360.0, 50.0, 368.0, 58.0, "", 0, 0, 1),
    (420.0, 50.0, 428.0, 58.0, "", 0, 0, 2),
]
fa_marken = srv._text_marken(fa_woerter)
pruefe("FontAwesome: alle drei Kaestchen erkannt", len(fa_marken), 3)
pruefe("FontAwesome: leerer Kreis f111 ist nicht angekreuzt", fa_marken[0][2], False)
pruefe("FontAwesome: voller Kreis f192 ist angekreuzt", fa_marken[1][2], True)
pruefe("FontAwesome: f192 gehoert zu den vollen Zeichen", "" in srv.KNOWN_FILLED, True)
pruefe("FontAwesome: f111 gehoert zu den leeren Zeichen", "" in srv.KNOWN_EMPTY, True)


def seite_gezeichnet():
    """Med. Dienst: Die Kaestchen sind gezeichnet - schwarz gefuellt heisst angekreuzt."""
    d = fitz.open()
    p = d.new_page(width=600, height=200)
    f = 9
    for zeile, (nr, treffer) in enumerate((("4.1.1", 1), ("4.1.2", 3))):
        y = 60 + zeile * 30
        p.insert_text((40, y), nr, fontsize=f)
        p.insert_text((90, y), "Kriterium", fontsize=f)
        for i, x in enumerate((300, 360, 420, 480)):
            r = fitz.Rect(x, y - 7, x + 9, y + 2)
            p.draw_rect(r, color=(0, 0, 0), fill=(0, 0, 0) if i == treffer else (1, 1, 1))
    b = d.tobytes()
    d.close()
    return b


gz = srv.extract_values(seite_gezeichnet(), "application/pdf")
pruefe("Gezeichnetes Kaestchen: angekreuzte Spalte", gz.get("4.1.1", {}).get("idx"), 1)
pruefe("Gezeichnetes Kaestchen: zweite Zeile", gz.get("4.1.2", {}).get("idx"), 3)
pruefe("Gezeichnetes Kaestchen: gilt als sicher", gz.get("4.1.1", {}).get("sicher"), True)


def seite_modul4_auf_modul5_seite():
    """Die letzten Zeilen des Moduls 4 stehen auf derselben Seite wie der Modul-5-Kopf.
    Frueher wurden 4.4.11 und 4.4.12 dadurch als Haeufigkeit statt als Stufe gelesen."""
    d = fitz.open()
    p = d.new_page(width=760, height=320)
    f = 9
    for zeile, nr in enumerate(("5.4.11", "5.4.12")):
        y = 50 + zeile * 25
        p.insert_text((40, y), nr, fontsize=f)
        p.insert_text((95, y), "Bewältigen der Folgen", fontsize=f)
        for i, x in enumerate((300, 360, 420, 480)):
            p.insert_text((x, y), VOLL if i == 2 else LEER, fontsize=f)
    # Kopf des Moduls 5 mit Haeufigkeitsspalten auf derselben Seite
    p.insert_text((230, 140), "entfällt", fontsize=f)
    p.insert_text((320, 140), "selbständig", fontsize=f)
    p.insert_text((430, 140), "Häufigkeit", fontsize=f)
    p.insert_text((520, 140), "Tag", fontsize=f)
    p.insert_text((580, 140), "Woche", fontsize=f)
    p.insert_text((650, 140), "Monat", fontsize=f)
    p.insert_text((40, 170), "5.5.1", fontsize=f)
    p.insert_text((95, 170), "Medikation", fontsize=f)
    p.insert_text((520, 170), VOLL, fontsize=f)
    p.insert_text((430, 170), "4", fontsize=f)
    b = d.tobytes()
    d.close()
    return b


gemischt = srv.extract_values(seite_modul4_auf_modul5_seite(), "application/pdf")
pruefe("Modul 4 auf der Modul-5-Seite: Stufe statt Haeufigkeit",
       gemischt.get("4.4.11", {}).get("idx"), 2)
pruefe("Modul 4 auf der Modul-5-Seite: keine Haeufigkeit",
       gemischt.get("4.4.11", {}).get("count"), None)
pruefe("Modul 5 auf derselben Seite bleibt Haeufigkeit",
       gemischt.get("4.5.1", {}).get("count"), 4)


def seite_entfaellt():
    """'Beurteilung nicht erforderlich' ist kein fehlender Wert, sondern die Null."""
    d = fitz.open()
    p = d.new_page(width=600, height=200)
    f = 9
    p.insert_text((40, 60), "5.4.13", fontsize=f)
    p.insert_text((95, 60), "Ernährung parenteral oder über Sonde", fontsize=f)
    p.insert_text((95, 75), "Beurteilung nicht erforderlich, da die Voraussetzungen", fontsize=f)
    p.insert_text((40, 110), "5.4.1", fontsize=f)
    p.insert_text((95, 110), "Waschen", fontsize=f)
    for i, x in enumerate((300, 360, 420, 480)):
        p.insert_text((x, 110), VOLL if i == 1 else LEER, fontsize=f)
    b = d.tobytes()
    d.close()
    return b


ent = srv.extract_values(seite_entfaellt(), "application/pdf")
pruefe("'nicht erforderlich' wird als 0 gelesen", ent.get("4.4.13", {}).get("idx"), 0)
pruefe("'nicht erforderlich' nennt den Grund", ent.get("4.4.13", {}).get("grund"), "entfaellt")
pruefe("'nicht erforderlich' gilt als sicher", ent.get("4.4.13", {}).get("sicher"), True)

if fehler:
    print("FEHLGESCHLAGEN:")
    for f_ in fehler:
        print("  -", f_)
    sys.exit(1)
print("Alle %d Serverpruefungen bestanden." % geprueft)
