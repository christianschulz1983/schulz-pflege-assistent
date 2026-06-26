# -*- coding: utf-8 -*-
"""
Lokaler Pflege-Assistent-Hilfsserver (Stufe 2 / Alternative B)

Aufgabe:
- Nimmt ein PDF/Bild von der lokalen HTML-App entgegen (nur localhost).
- Extrahiert den Text lokal (PyMuPDF), bei Bild-Scans optional per OCR (Tesseract).
- Filtert auf die pflegerelevanten Seiten (Module 4.1-4.6 bzw. 5.1-5.6, Diagnosen,
  Anamnese, Befund) und verwirft Briefkopf-/Rechtsbelehrungsseiten.
- Liefert kompakten Text als JSON zurueck -> die App schickt nur noch wenig an Gemini.

Es verlassen KEINE Daten den PC. Start ueber "Pflege-Server starten.bat".
"""

import http.server
import socketserver
import json
import base64
import io
import re
import sys
import os
import mimetypes
import urllib.parse

PORT = 8765

# Basisordner: im normalen Betrieb der Skriptordner, als gepackte .exe der entpackte
# PyInstaller-Ordner (_MEIPASS). So werden App-Datei, tessdata und Tesseract auch in
# der eigenstaendigen .exe gefunden.
if getattr(sys, "frozen", False):
    BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(sys.executable)))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- optionale Abhaengigkeiten robust laden ---
try:
    import fitz  # PyMuPDF
    HAVE_FITZ = True
except Exception:
    HAVE_FITZ = False

# Tesseract-Programm suchen: zuerst die mit der .exe gebuendelte Version, dann System-Pfade.
TESSERACT_CANDIDATES = [
    os.path.join(BASE_DIR, "tesseract", "tesseract.exe"),
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Programs\Tesseract-OCR\tesseract.exe"),
]
TESSDATA_DIR = os.path.join(BASE_DIR, "tessdata")
OCR_CONFIG = ("--tessdata-dir " + TESSDATA_DIR) if os.path.isdir(TESSDATA_DIR) else ""
OCR_LANG = "deu" if os.path.isfile(os.path.join(TESSDATA_DIR, "deu.traineddata")) else "eng"

try:
    import pytesseract
    from PIL import Image
    for _cand in TESSERACT_CANDIDATES:
        if os.path.isfile(_cand):
            pytesseract.pytesseract.tesseract_cmd = _cand
            break
    # Prueft, ob die Tesseract-Engine tatsaechlich erreichbar ist
    pytesseract.get_tesseract_version()
    HAVE_OCR = True
except Exception:
    HAVE_OCR = False

# Seiten gelten als pflegerelevant, wenn sie eines dieser Muster enthalten.
MARKER_RE = re.compile(
    r"(4\.[1-6]\.\d|5\.[1-6]\.\d|"
    r"Modul\s*[1-6]|"
    r"Selbst(?:st)?[aä]ndigkeit|"
    r"Mobilit[aä]t|kognitive|Verhaltensweisen|Selbstversorgung|"
    r"krankheits-?\s*und\s*therapiebedingt|Gestaltung\s+des\s+Alltagslebens|"
    r"pflegebegr[uü]ndende\s+Diagnosen|Anamnese|Befund|"
    r"gewichtete\s+Punkte|Pflegegrad)",
    re.IGNORECASE,
)


def page_text_layout(page):
    """Layout-erhaltende Textauslese: rekonstruiert Zeilen/Spalten anhand der
    Wort-Koordinaten, damit Tabellenspalten (z.B. Modul-5-Haeufigkeiten pro
    Tag/Woche/Monat, angekreuzte Spalte) erhalten bleiben."""
    try:
        words = page.get_text("words")  # (x0,y0,x1,y1, wort, block, line, wordno)
    except Exception:
        words = []
    if not words:
        return (page.get_text() or "")
    # Zeilen anhand der y-Position clustern (~3pt Toleranz)
    rows = {}
    for w in words:
        key = round(w[1] / 3.0)
        rows.setdefault(key, []).append(w)
    lines = []
    for key in sorted(rows):
        ws = sorted(rows[key], key=lambda w: w[0])
        line = ""
        prev_x1 = None
        for w in ws:
            if prev_x1 is not None:
                gap = w[0] - prev_x1
                nspaces = max(1, int(gap / 4.0))
                line += " " * min(nspaces, 16)
            line += w[4]
            prev_x1 = w[2]
        lines.append(line.rstrip())
    return "\n".join(lines)


def extract_pages(file_bytes, mime):
    """Liefert Liste von {index, text, ocr} fuer jede Seite."""
    pages = []
    if not HAVE_FITZ:
        return pages, "PyMuPDF (fitz) ist nicht installiert."

    # Bilddateien: direkt OCR (falls verfuegbar)
    if mime and mime.startswith("image/"):
        if HAVE_OCR:
            img = Image.open(io.BytesIO(file_bytes))
            txt = pytesseract.image_to_string(img, lang=OCR_LANG, config=OCR_CONFIG).strip()
            pages.append({"index": 0, "text": txt, "ocr": True})
        else:
            pages.append({"index": 0, "text": "", "ocr": False})
        return pages, None

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for i, page in enumerate(doc):
        txt = (page_text_layout(page) or "").strip()
        used_ocr = False
        # Seite ohne (nennenswerten) Text -> wahrscheinlich Scan -> OCR versuchen
        if len(txt) < 25 and HAVE_OCR:
            try:
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                txt = pytesseract.image_to_string(img, lang=OCR_LANG, config=OCR_CONFIG).strip()
                used_ocr = True
            except Exception:
                pass
        pages.append({"index": i, "text": txt, "ocr": used_ocr})
    doc.close()
    return pages, None


# Format-unabhaengige Markierungserkennung.
# Bekannte gefuellte / leere Ankreuz-Symbole (verschiedene Schriften/Organisationen):
KNOWN_FILLED = set("¤●◉■◼▪☒⊠✓✔✗✘")
KNOWN_EMPTY = set("¡○◯□☐")
PUNCT = set(".,;:!?-–—/()[]{}\"'`*…|_=+")
# Kriteriumsnummer: 4.x.y (Med. Dienst) ODER 5.x.y (MEDICPROOF). Erste Stelle wird zu 4 normalisiert.
CRIT_RE = re.compile(r"^([45])\.([1-6])\.(\d{1,2})$")


def _row_filled_index(roww):
    """Liefert die Position (0-basiert) des angekreuzten Feldes in einer Tabellenzeile
    oder None. Erkennt die Markierung format-unabhaengig:
    1) bekannte Symbole (gefuellt vs. leer),
    2) sonst 'Abweichler': unter mehreren gleichen Symbolen ist das eine andere das Kreuz."""
    toks = [(w[0], w[4].strip()) for w in roww]
    # 1) bekannte Symbole
    marks = [(x, t) for x, t in toks if len(t) == 1 and (t in KNOWN_FILLED or t in KNOWN_EMPTY)]
    if marks:
        marks.sort(key=lambda p: p[0])
        for pos, (x, t) in enumerate(marks):
            if t in KNOWN_FILLED:
                return pos
        return None  # nur leere Felder -> nichts angekreuzt
    # 2) Abweichler-Heuristik ueber Einzelzeichen-Symbole
    syms = [(x, t) for x, t in toks if len(t) == 1 and not t.isalnum() and t not in PUNCT]
    if 2 <= len(syms) <= 6:
        syms.sort(key=lambda p: p[0])
        from collections import Counter
        c = Counter(t for _, t in syms)
        common = c.most_common(1)[0][0]
        diff = [pos for pos, (x, t) in enumerate(syms) if t != common]
        if len(diff) == 1:
            return diff[0]
    return None


def extract_values(file_bytes, mime):
    """Liest die angekreuzten Werte koordinatengenau aus den Tabellen (Med. Dienst & MEDICPROOF):
    - Module 1/2/3/4/6 + .16: Position des angekreuzten Feldes -> idx (0..3)
    - Modul 5 (Haeufigkeiten): Zahl + Spalte (Tag/Woche/Monat)
    Rueckgabe: dict  {"4.1.1": {"idx":0,"count":null,"period":null}, ...}"""
    res = {}
    if not HAVE_FITZ or (mime and mime.startswith("image/")):
        return res
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        return res
    for page in doc:
        try:
            words = page.get_text("words")
        except Exception:
            continue
        cols = {}
        for x0, y0, x1, y1, wd, b, l, n in words:
            s = wd.strip()
            if s in ("Tag", "Woche", "Monat") and s not in cols:
                cols[s] = (x0 + x1) / 2.0
        crit_tokens = []
        for x0, y0, x1, y1, wd, b, l, n in words:
            m = CRIT_RE.match(wd.strip())
            if m:
                nr = "4.%s.%s" % (m.group(2), m.group(3))  # 5.x.y -> 4.x.y normalisieren
                crit_tokens.append((y0, nr))
        for cy, cnr in crit_tokens:
            roww = sorted([w for w in words if abs(w[1] - cy) < 6], key=lambda w: w[0])
            count = None
            period = None
            if cols:
                for x0, y0, x1, y1, wd, b, l, n in roww:
                    s = wd.strip()
                    if s.isdigit():
                        cxn = (x0 + x1) / 2.0
                        best = None
                        bestd = 1e9
                        for name, hx in cols.items():
                            dd = abs(cxn - hx)
                            if dd < bestd:
                                bestd = dd
                                best = name
                        if best and bestd < 22:
                            period = {"Tag": "D", "Woche": "W", "Monat": "M"}[best]
                            count = int(s)
                            break
            idx = _row_filled_index(roww)
            if idx is None and count is None:
                continue  # keine erkennbare Markierung -> keine echte Tabellenzeile
            # nicht ueberschreiben, falls eine bessere Zeile schon erkannt wurde
            if cnr in res and res[cnr].get("idx") is not None and idx is None and count is None:
                continue
            res[cnr] = {"idx": idx, "count": count, "period": period}
    doc.close()
    return res


KASSEN = [
    "AOK", "Barmer", "Techniker Krankenkasse", "DAK", "IKK", "Knappschaft",
    "Pronova", "hkk", "KKH", "vivida", "Bahn-BKK", "SBK", "Securvita", "mhplus",
    "Continentale", "Debeka", "BKK", "TK",
]


def _find1(pattern, text, flags=re.IGNORECASE):
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else ""


def _grab(text, starts, ends):
    """Abschnitt zwischen erstem 'starts'-Treffer und nächstem 'ends'-Treffer.
    Schneidet NICHT an Seitenumbrüchen ab und entfernt Seitenmarker."""
    s = None
    for p in starts:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            s = m.end()
            break
    if s is None:
        return ""
    rest = text[s:]
    end = len(rest)
    for p in ends:
        m = re.search(p, rest, re.IGNORECASE)
        if m and m.start() < end:
            end = m.start()
    seg = rest[:end]
    seg = re.sub(r"===\s*Seite[^\n]*===", "", seg)   # Seitenmarker raus
    seg = re.sub(r"\n{3,}", "\n\n", seg).strip()
    return seg[:6000]


def extract_diagnoses(text):
    """Diagnosen robust auslesen – auch wenn der ICD-Code rechts steht oder fehlt
    ('Weitere Diagnosen: ...'). Liefert Liste {icd, text}."""
    diags = []
    m = re.search(r"Pflegebegr[uü]ndende?\s+Diagnose", text, re.IGNORECASE)
    if not m:
        m = re.search(r"\bDiagnose[n]?\b", text, re.IGNORECASE)
    if not m:
        return diags
    seg = text[m.end():]
    em = re.search(r"(Module?\s+des\s+Begutachtung|Begutachtungsinstrument|\bModul\s*1\b|\b4\.1\b)", seg, re.IGNORECASE)
    if em:
        seg = seg[:em.start()]
    seg = re.sub(r"===\s*Seite[^\n]*===", "", seg)[:3500]
    icd_re = re.compile(r"(?:ICD[\s\-]*10[\s:]*)?\b([A-TV-Z]\d{2}(?:\.\d{1,2})?)\b")
    seen = set()
    for raw in seg.split("\n"):
        line = raw.strip()
        if not line:
            continue
        low = line.lower()
        # Überschriften/Steuerzeilen
        if re.match(r"^(weitere\s+diagnosen|pflegebegr|icd\b|diagnose[n]?\b|\d+\s*$|seite\b|---)", low):
            if low.startswith("weitere diagnosen") and ":" in line:
                line = line.split(":", 1)[1].strip()
                if not line:
                    continue
            else:
                continue
        icd = ""
        mm = icd_re.search(line)
        if mm:
            icd = mm.group(1)
            line = line.replace(mm.group(0), " ", 1)
        desc = re.sub(r"ICD[\s\-]*10", " ", line, flags=re.IGNORECASE)
        desc = re.sub(r"\b[A-TV-Z]\d{2}(?:\.\d{1,2})?\b", " ", desc)
        desc = re.sub(r"\s{2,}", " ", desc).strip(" .;,-–|")
        # genug Buchstaben = echte Diagnose
        if len(re.sub(r"[^A-Za-zÄÖÜäöüß]", "", desc)) >= 4:
            key = desc.lower()
            if key in seen:
                continue
            seen.add(key)
            diags.append({"icd": icd, "text": desc})
        if len(diags) >= 6:
            break
    return diags


def extract_meta(text):
    """Liest Stammdaten, Diagnosen, Anamnese, Befund lokal aus dem Text (auch OCR).
    Best-effort und tolerant – der Nutzer prueft/korrigiert in der Vorschau."""
    meta = {}
    # Name (Betreffend) – immer "Herr/Frau Vorname Nachname"
    name = ""
    m = re.search(r"\b(Herrn|Herr|Frau)\s+([A-ZÄÖÜ][a-zäöüß\-]+)\s+([A-ZÄÖÜ][a-zäöüß\-]+)\b", text)
    if m:
        anrede = "Frau" if m.group(1).lower().startswith("frau") else "Herr"
        name = "%s %s %s" % (anrede, m.group(2), m.group(3))
    else:
        m2 = re.search(r"(?:Pflege)?[Gg]utachten\s+f[uü\W]?r\s+([A-ZÄÖÜ][\wÄÖÜäöüß.\-]+)\s*,\s*([A-ZÄÖÜ][\wÄÖÜäöüß.\-]+)", text)
        if m2:
            name = "%s %s" % (m2.group(2), m2.group(1))  # Vorname Nachname (Anrede unbekannt)
    meta["betreffend"] = name
    meta["geboren"] = _find1(r"geb(?:oren)?\.?\s*(?:am)?\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{4})", text)
    meta["begutachtung"] = _find1(r"[Gg]utachten\s+vom\s+(\d{1,2}\.\d{1,2}\.\d{4})", text)
    # Antragsdatum: oft "Antrag ... vom TT.MM.JJJJ" (z.B. "Ablehnung Ihres Antrags ... vom ...")
    meta["antrag"] = (
        _find1(r"Antrag(?:s)?datum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{4})", text)
        or _find1(r"Antrag[^\n]{0,80}?vom\s*(\d{1,2}\.\d{1,2}\.\d{4})", text)
    )
    # Bescheiddatum: "Bescheid vom" oder das Briefdatum ("Datum TT.MM.JJJJ") der Kasse
    meta["bescheid"] = (
        _find1(r"Bescheid(?:datum)?\s*(?:vom)?\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{4})", text)
        or _find1(r"\bDatum\b\s*[:\s]*?(\d{1,2}\.\d{1,2}\.\d{4})", text)
    )
    meta["versnr"] = _find1(r"Versicherten(?:nummer|-?Nr\.?)?\s*[:\-]?\s*([A-Z]?\d[\dA-Z]{6,})", text)
    # Kasse
    kasse = ""
    for k in KASSEN:
        m = re.search(re.escape(k) + r"[\wäöüß\s\-\.]{0,40}", text)
        if m:
            kasse = re.sub(r"\s+", " ", m.group(0)).strip()[:55]
            break
    meta["kasse"] = kasse
    # Gutachtenorganisation (konkreter MD inkl. Region)
    if re.search(r"MEDICPROOF|Medicproof", text, re.IGNORECASE):
        meta["organisation"] = "Medicproof GmbH"
    else:
        region = r"(?:Baden-?\s*W[uü]rttemberg|Bayern|Nord(?:rhein)?|Westfalen-?Lippe|Rheinland-?Pfalz|Hessen|Niedersachsen|Bremen|Hamburg|Schleswig-?Holstein|Sachsen-?Anhalt|Sachsen|Th[uü]ringen|Berlin-?Brandenburg|Brandenburg|Mecklenburg-?Vorpommern|Saarland)"
        m = re.search(r"Medizinischer?\s+Dienst(?:\s+(?:der\s+Krankenversicherung\s+)?(" + region + r"))?", text, re.IGNORECASE)
        if m:
            org = "Medizinischer Dienst"
            if m.group(1):
                org += " " + re.sub(r"\s+", " ", m.group(1)).strip()
            meta["organisation"] = org[:60]
        else:
            meta["organisation"] = ""
    meta["pg"] = _find1(r"Pflegegrad(?:es)?\s+(\d)\b", text)
    meta["pts"] = _find1(r"(\d{1,3}[,\.]\d{1,2})\s*(?:gewichtete\s*)?(?:Gesamt-?\s*)?[Pp]unkte", text).replace(".", ",")
    # Diagnosen (robust)
    meta["diagnoses"] = extract_diagnoses(text)
    # Anamnese / Befund – vollständig (über Seitenumbrüche hinweg)
    meta["anamnese"] = _grab(text, [r"Anamnese"],
                             [r"Gutachterlicher\s+Befund", r"\b\d\s+Befund\b", r"\bBefund(?:e)?\b", r"Pflegebegr", r"Module?\s+des\s+Begut"])
    meta["befund"] = _grab(text, [r"Gutachterlicher\s+Befund", r"\b\d\s+Befund\b", r"\bBefund(?:e)?\b"],
                           [r"Pflegebegr[uü]ndende?\s+Diagnose", r"\bModule?\s+des\s+Begut", r"\b4\.1\b\s*Modul"])
    return meta


def build_payload(file_bytes, mime):
    pages, err = extract_pages(file_bytes, mime)
    if err:
        return {"ok": False, "error": err, "fitz": HAVE_FITZ, "ocrAvailable": HAVE_OCR}

    relevant_idx = [p["index"] for p in pages if MARKER_RE.search(p["text"] or "")]
    # Sicherheitsnetz: zu wenig erkannt -> lieber alle Seiten behalten
    if len(relevant_idx) < 2:
        kept = pages
    else:
        lo, hi = min(relevant_idx), max(relevant_idx)
        kept = [p for p in pages if lo <= p["index"] <= hi]

    chunks = []
    for p in kept:
        if (p["text"] or "").strip():
            chunks.append("=== Seite %d%s ===\n%s" % (
                p["index"] + 1, " (OCR)" if p["ocr"] else "", p["text"].strip()))
    text = "\n\n".join(chunks)
    ocr_used = any(p["ocr"] for p in kept)

    values = extract_values(file_bytes, mime)
    meta = extract_meta(text)

    return {
        "ok": True,
        "text": text,
        "pageCount": len(pages),
        "keptPages": len(kept),
        "ocrUsed": ocr_used,
        "ocrAvailable": HAVE_OCR,
        "fitz": HAVE_FITZ,
        "chars": len(text),
        "values": values,
        "valuesCount": len(values),
        "meta": meta,
    }


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        # Erlaubt Aufrufe von file:// bzw. weniger privaten Kontexten auf localhost
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.rstrip("/") == "/ping":
            self._json({"ok": True, "service": "pflege-server", "fitz": HAVE_FITZ, "ocrAvailable": HAVE_OCR})
            return
        self._serve_static(path)

    def _serve_static(self, path):
        # Liefert die App-Dateien (index.html etc.) aus dem Server-Ordner aus.
        rel = urllib.parse.unquote(path)
        if rel in ("", "/"):
            rel = "/index.html"
        name = os.path.basename(rel)  # nur Dateiname -> kein Verzeichniswechsel
        full = os.path.join(BASE_DIR, name)
        if not name or not os.path.isfile(full):
            self._json({"ok": False, "error": "nicht gefunden"}, 404)
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype == "application/javascript":
            ctype += "; charset=utf-8"
        try:
            with open(full, "rb") as fh:
                body = fh.read()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            # Kein Caching -> Browser laedt immer die aktuelle App-Version
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self._json({"ok": False, "error": str(e)}, 500)

    def do_POST(self):
        if self.path.rstrip("/") != "/extract":
            self._json({"ok": False, "error": "unbekannter Pfad"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            req = json.loads(raw.decode("utf-8"))
            data_b64 = req.get("data", "")
            mime = req.get("mime", "application/pdf")
            if "," in data_b64 and data_b64.strip().startswith("data:"):
                data_b64 = data_b64.split(",", 1)[1]
            file_bytes = base64.b64decode(data_b64)
            self._json(build_payload(file_bytes, mime))
        except Exception as e:
            self._json({"ok": False, "error": str(e)}, 500)

    def log_message(self, *args):
        pass  # ruhig bleiben


def main():
    print("=" * 56)
    print(" Pflege-Assistent – lokaler Hilfsserver")
    print("=" * 56)
    print(" App im Browser oeffnen:  http://127.0.0.1:%d" % PORT)
    print(" (genau diese Adresse verwenden, NICHT die Datei direkt)")
    print("-" * 56)
    print(" Textauslese  : %s" % ("PyMuPDF aktiv" if HAVE_FITZ else "FEHLT – bitte 'pip install pymupdf'"))
    print(" OCR (Scans)  : %s" % ("Tesseract aktiv" if HAVE_OCR else "nicht verfuegbar (nur Text-PDFs)"))
    print("-" * 56)
    print(" Fenster geoeffnet lassen, solange die App genutzt wird.")
    print(" Zum Beenden dieses Fenster schliessen oder Strg+C druecken.")
    print("=" * 56)
    # Browser nach kurzer Wartezeit automatisch auf die App-Adresse oeffnen.
    try:
        import threading, webbrowser
        threading.Timer(2.0, lambda: webbrowser.open("http://127.0.0.1:%d" % PORT)).start()
    except Exception:
        pass

    # Multi-threaded: eine langsame/haengende Anfrage blockiert nicht mehr alle anderen.
    class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
        daemon_threads = True
        allow_reuse_address = True

    try:
        with Server(("127.0.0.1", PORT), Handler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer beendet.")
    except OSError as e:
        print("\nServer konnte nicht starten (laeuft er evtl. schon?): %s" % e)
        try:
            input("Mit Enter schliessen...")
        except Exception:
            pass


if __name__ == "__main__":
    main()
