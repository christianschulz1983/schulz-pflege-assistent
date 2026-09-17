# -*- coding: utf-8 -*-
"""Prueft pflege-app/bri_texte.js woertlich gegen die Begutachtungs-Richtlinien (PDF).

Warum: Die App gibt diese Texte der KI als Zitatgrundlage und prueft Zitate dagegen
(CLAUDE.md: "BRi-Zitate niemals erfinden"). Ein Fehler in bri_texte.js wird also
zitiert. Die erste Uebernahme (2024) enthielt Seitenzahlen im Wort ("Auf65 forderungen"),
eine Fussnote mitten im Satz (4.5.16) und die komplette Einleitung von Modul 4 als
angebliche Definition von 4.3.13.

Geprueft wird fuer jeden Text:
  1. Er steht woertlich in der PDF (Leerraum, Silbentrennung und Aufzaehlungszeichen
     zaehlen nicht - die barrierefreie PDF trennt am Zeilenende ohne Bindestrich).
  2. Er steht im RICHTIGEN Abschnitt: eine Kriteriumsdefinition zwischen [F 4.x.y] und
     der naechsten Ueberschrift, eine Moduleinleitung zwischen [F 4.x] und [F 4.x.1].
     Das faengt Texte ab, an die fremde Abschnitte angehaengt sind.
  3. Er enthaelt keine Reste der Uebernahme (Seitenzahl im Wort, Kapitelnummer am Ende,
     Fussnotentext, Steuerzeichen).

Aufruf (aus dem Projektordner):
  python werkzeuge/bri_abgleich.py [Richtlinien/BRi_Pflege_21_08_2024_barrierefrei.pdf] [pflege-app/bri_texte.js]
Rueckgabe 0 = alles belegt, 1 = Abweichungen (werden aufgelistet).
Benoetigt: PyMuPDF (pip install pymupdf)."""
import io, json, os, re, sys

try:
    import fitz
except ImportError:
    sys.exit('PyMuPDF fehlt: pip install pymupdf')

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf_pfad = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASIS, 'Richtlinien', 'BRi_Pflege_21_08_2024_barrierefrei.pdf')
js_pfad = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASIS, 'pflege-app', 'bri_texte.js')

STEUER = re.compile(r'[\x00-\x08\x0b-\x1f]')

def dicht(t):
    t = STEUER.sub('', t).replace('­', '').replace(' ', ' ').replace(' ', ' ').replace(' ', ' ')
    t = re.sub(r'[„“”"‚‘’\']', '"', t).replace('–', '-').replace('—', '-')
    t = re.sub(r'(^|\s)[→•\-]\s*', ' ', t)
    return re.sub(r'\s+', '', t)

# --- PDF: Zeilen ohne Kopfzeilen, Seitenzahlen und Fussnoten ---------------------------
zeilen = []
for seite in fitz.open(pdf_pfad):
    z = STEUER.sub('', seite.get_text()).replace(' ', ' ').replace(' ', ' ')
    # Fussnotenzeichen stehen im Textlayer direkt am Wort ("Diäten11 oder") - sie gehoeren
    # nicht zum Richtlinientext.
    z = re.sub(r'([a-zäöüß])\d{1,2}(?=\s)', r'\1', z).split('\n')
    while z and (re.fullmatch(r'\s*\d{1,3}\s*', z[0]) or z[0].startswith('Erläuterungen zum Gutachten')
                 or z[0].startswith('Formulargutachten')):
        z.pop(0)
    for i, x in enumerate(z):
        if re.match(r'^\d{1,2}\t', x):          # Fussnote beginnt: Ziffer + Tabulator
            z = z[:i]
            break
    zeilen.extend(z)

# Ueberschriften [F 4.x] und [F 4.x.y] (Erwachsene). Sie stehen auch im Inhaltsverzeichnis;
# massgeblich ist das LETZTE Vorkommen. Kinder-Kapitel heissen [KF ...] und passen nicht.
# Ein Abschnitt endet an der naechsten Ueberschrift jeder Art ([F ...] oder [KF ...]).
kopf = re.compile(r'^\s*(?:\d+(?:\.\d+)+\s*)?\[\s*F\s*(4\.[1-6](?:\.\d{1,2})?)\]')
jede_ueberschrift = re.compile(r'^\s*(?:\d+(?:\.\d+)+\s*)?\[\s*K?F\s*\d')
stellen = {}
for i, x in enumerate(zeilen):
    m = kopf.match(x)
    if m:
        stellen[m.group(1)] = i
if len(stellen) < 60:
    # Ohne Abschnitte waere Pruefung 2 still wirkungslos - lieber abbrechen.
    sys.exit('Abbruch: nur %d Ueberschriften [F 4.x.y] in der PDF erkannt (erwartet 70). '
             'Hat sich der Aufbau der PDF geaendert?' % len(stellen))
abschnitt = {}
for nr, i in stellen.items():
    ende = next((j for j in range(i + 1, len(zeilen)) if jede_ueberschrift.match(zeilen[j])), len(zeilen))
    abschnitt[nr] = dicht('\n'.join(zeilen[i + 1:ende]))
gesamt = dicht('\n'.join(zeilen))

# --- App-Texte ---------------------------------------------------------------------------
s = io.open(js_pfad, encoding='utf-8').read()
bl = dict((n, json.loads(b)) for n, b in re.findall(r'^const (\w+) = (\{.*?^\});', s, re.S | re.M))

RESTE = [
    ('Steuerzeichen', STEUER),
    ('Ziffer im Wort (Seitenzahl)', re.compile(r'[A-Za-zäöüß]\d{1,3}(?=\s|[a-zäöüß])')),
    ('Kapitelnummer am Ende', re.compile(r'\s\d+\.\d+(\.\d+)?\s*(\[\s*K?F[^\]]*\].*)?$')),
    ('Fussnotentext', re.compile(r'Valentini|\(Syn\.:')),
    ('Kopfzeile der PDF', re.compile(r'Erläuterungen zum Gutachten der Feststellung')),
]

fehler = []
def pruefe(ken, text, bereich):
    if not text.strip():
        return
    for name, muster in RESTE:
        if muster.search(text):
            fehler.append('%s: %s' % (ken, name))
    d = dicht(text)
    if d not in gesamt:
        # satzweise, damit die Meldung zeigt, WAS nicht belegt ist
        offen = [x for x in re.split(r'(?<=[.;:!?])\s+', text) if len(x) > 3 and dicht(x) not in gesamt]
        fehler.append('%s: nicht woertlich in der PDF: %s' % (ken, ' | '.join(offen)[:300] or '(Satzfolge)'))
    elif bereich is not None and d not in bereich:
        fehler.append('%s: steht in der PDF, aber nicht in seinem Abschnitt (fremder Text angehaengt?)' % ken)

anzahl = 0
for nr, m in bl['BRI_MODULE'].items():
    anzahl += 1
    pruefe('Modul %s Einleitung' % nr, m['text'], abschnitt.get(nr))
for nr, k in bl['BRI_KRITERIEN'].items():
    # 4.1.B (besondere Bedarfskonstellation) hat keine eigene [F]-Ueberschrift: Modul 1
    bereich = abschnitt.get(nr) if nr in abschnitt else None
    anzahl += 1
    pruefe('%s Definition' % nr, k.get('definition', ''), bereich)
    for st, lt in (k.get('levels') or {}).items():
        anzahl += 1
        pruefe('%s Stufe "%s"' % (nr, st), lt, bereich)

fehlende_module = [n for n in ('4.1', '4.2', '4.3', '4.4', '4.5', '4.6') if n not in bl['BRI_MODULE']]
for n in fehlende_module:
    fehler.append('Modul %s: Einleitung fehlt in bri_texte.js' % n)

print('Gepruefte Texte: %d | Kriterien: %d | Module: %d' % (anzahl, len(bl['BRI_KRITERIEN']), len(bl['BRI_MODULE'])))
if fehler:
    print('ABWEICHUNGEN: %d' % len(fehler))
    for f in fehler:
        print('  - ' + f)
    sys.exit(1)
print('Alle Texte woertlich belegt, jeweils im richtigen Abschnitt, ohne Uebernahmereste.')
