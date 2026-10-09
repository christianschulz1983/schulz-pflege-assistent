# -*- coding: utf-8 -*-
"""Prueft pflege-app/js/kinder_bri.js gegen die Alterstabellen der Begutachtungs-Richtlinien.

Warum: KINDER_ALTERSNORM sind 105 Zahlen, aus vier gedruckten Tabellenseiten
abgeschrieben (BRi 21.08.2024, Seiten 146 bis 149). Ein Zahlendreher darin ergibt
einen falschen altersentsprechenden Selbstaendigkeitsgrad und damit eine falsche
Punktzahl - also einen falschen Pflegegrad fuer ein Kind.

Der Selbsttest im Browser prueft die Abschrift gegen die Liste, die die BRi auf
Seite 201 selbst aufzaehlt. Diese Liste deckt aber nur die ERSTE Grenze von elf
Kriterien ab. Die uebrigen 94 Zahlen ruhen allein auf der Abschrift - deshalb dieses
Werkzeug, das sie unmittelbar aus der PDF liest und vergleicht.

Wie gelesen wird: In jeder Tabellenzeile stehen die drei gesuchten Grenzen als die
drei "unter X"-Angaben - "unter 1 Monat", "bis unter 3 Monate", "bis unter 9 Monate".
Bei den drei Kriterien mit zusammengefasster Zelle (4.11, 4.12, 4.13) gibt es nur
ein "unter X" und ein "ab X"; dann gelten alle drei Grenzen als dieses Alter.

Aufruf (aus dem Projektordner):
  python werkzeuge/kinder_abgleich.py [Richtlinien/BRi_Pflege_21_08_2024_barrierefrei.pdf] [pflege-app/js/kinder_bri.js]
Rueckgabe 0 = alle Zahlen belegt, 1 = Abweichungen (werden aufgelistet).
Benoetigt: PyMuPDF (pip install pymupdf)."""
import io, os, re, sys

try:
    import fitz
except ImportError:
    sys.exit('PyMuPDF fehlt: pip install pymupdf')

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf_pfad = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    BASIS, 'Richtlinien', 'BRi_Pflege_21_08_2024_barrierefrei.pdf')
js_pfad = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    BASIS, 'pflege-app', 'js', 'kinder_bri.js')

# Die vier Tabellenseiten. Die Modulnummer steht in der Zeilennummer selbst
# ("1.1" ist Modul 1), deshalb wird sie nicht aus der Seite abgeleitet.
SEITEN = [146, 147, 148, 149]

# LAENGSTE FORM ZUERST. Alternativen werden der Reihe nach geprueft: Steht "Jahr" vor
# "Jahren", passt bei "2 Jahren und 6 Monate" schon "Jahr", und das "en und 6 Monate"
# bleibt liegen - der Zusatz faellt still weg. Beim ersten Lauf ergab das 17 angebliche
# Abweichungen, alle genau sechs Monate gross.
EINHEIT = r'(?:Wochen|Woche|Monaten|Monate|Monat|Jahren|Jahre|Jahr)'
# "unter 2 Jahren und 6 Monate" - der Zusatz ist immer eine Monatsangabe.
ALTER = re.compile(r'(\d+)\s*(' + EINHEIT + r')(?:\s+und\s+(\d+)\s*(?:Monaten|Monate|Monat))?')
UNTER = re.compile(r'unter\s+(' + ALTER.pattern + r')')
AB = re.compile(r'\bab\s+(' + ALTER.pattern + r')')


def in_monaten(zahl, einheit, zusatz):
    """Gibt (monate, wochen) zurueck - Wochen bleiben Wochen, alles andere wird Monat."""
    n = int(zahl)
    if einheit.startswith('Woche'):
        return (None, n)
    if einheit.startswith('Jahr'):
        return (n * 12 + (int(zusatz) if zusatz else 0), None)
    return (n + (int(zusatz) if zusatz else 0), None)


def grenzen_aus_zeile(text):
    """Die drei Grenzen einer Tabellenzeile, als Liste von (monate, wochen)."""
    unter = [in_monaten(m.group(2), m.group(3), m.group(4)) for m in UNTER.finditer(text)]
    ab = [in_monaten(m.group(2), m.group(3), m.group(4)) for m in AB.finditer(text)]
    if len(unter) == 3:
        return unter
    # Zusammengefasste Zelle: ein "unter X" und ein "ab X" mit demselben Alter.
    if len(unter) == 1 and len(ab) == 1 and unter[0] == ab[0]:
        return [unter[0], unter[0], unter[0]]
    return None


def tabelle_aus_pdf(pfad):
    d = fitz.open(pfad)
    gefunden = {}
    for seite in SEITEN:
        roh = d[seite - 1].get_text('text').replace('­', '')
        # Der Fliesstext hinter der Tabelle auf Seite 149 gehoert nicht dazu.
        schnitt = roh.find('Systematik zur Berechnung')
        if schnitt > 0:
            roh = roh[:schnitt]
        # Zeilen beginnen mit der Nummer am Zeilenanfang. Bei zweistelligen
        # Kriterien (4.10 bis 4.13) steht der Titel in derselben Zeile.
        teile = re.split(r'\n(\d\.\d{1,2})(?=[ \n])', roh)
        for i in range(1, len(teile) - 1, 2):
            nr = '4.' + teile[i]                      # Tabelle "1.1" -> App "4.1.1"
            g = grenzen_aus_zeile(teile[i + 1].replace('\n', ' '))
            if g:
                gefunden[nr] = g
    d.close()
    return gefunden


def tabelle_aus_js(pfad):
    s = io.open(pfad, encoding='utf-8').read()
    anfang = s.find('const KINDER_ALTERSNORM')
    if anfang < 0:
        sys.exit('Abbruch: KINDER_ALTERSNORM nicht gefunden - hat sich der Aufbau geaendert?')
    ende = s.find('};', anfang)
    block = s[anfang:ende]
    gefunden = {}
    for zeile in re.finditer(r"'(\d\.\d\.\d{1,2})'\s*:\s*\[([^\]]*)\]", block):
        nr = zeile.group(1)
        werte = []
        for g in re.finditer(r'\{\s*([mw])\s*:\s*(\d+)\s*\}', zeile.group(2)):
            werte.append((int(g.group(2)), None) if g.group(1) == 'm' else (None, int(g.group(2))))
        gefunden[nr] = werte
    return gefunden


def text(g):
    monate, wochen = g
    if wochen is not None:
        return '%d Woche%s' % (wochen, '' if wochen == 1 else 'n')
    return '%d Monat%s' % (monate, '' if monate == 1 else 'e')


pdf = tabelle_aus_pdf(pdf_pfad)
js = tabelle_aus_js(js_pfad)

if len(pdf) != 35:
    sys.exit('Abbruch: nur %d von 35 Tabellenzeilen in der PDF erkannt. '
             'Hat sich der Aufbau der PDF geaendert?' % len(pdf))

fehler = []
for nr in sorted(set(list(pdf.keys()) + list(js.keys()))):
    if nr not in pdf:
        fehler.append('%s: steht in kinder_bri.js, aber nicht in der PDF' % nr)
        continue
    if nr not in js:
        fehler.append('%s: steht in der PDF, fehlt aber in kinder_bri.js' % nr)
        continue
    if len(js[nr]) != 3:
        fehler.append('%s: %d Grenzen in kinder_bri.js, erwartet 3' % (nr, len(js[nr])))
        continue
    for i in range(3):
        if pdf[nr][i] != js[nr][i]:
            fehler.append('%s, Grenze %d: PDF sagt %s, kinder_bri.js sagt %s'
                          % (nr, i + 1, text(pdf[nr][i]), text(js[nr][i])))

if fehler:
    print('Abweichungen gegen die PDF (%d):' % len(fehler))
    for f in fehler:
        print('  ' + f)
    sys.exit(1)

print('Alle 105 Altersgrenzen stimmen mit den Tabellen der BRi ueberein '
      '(35 Kriterien, Seiten 146 bis 149).')
