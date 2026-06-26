# Schulz Pflege-Assistent

Lokale Web-App zur Auswertung von Pflegegutachten (NBA / SGB XI) und zur Erstellung
pflegefachlicher Stellungnahmen / Widersprüche. Entwickelt für die Familiara GmbH.

## Inhalt
- `pflege-app/index.html` – die App (Single-File, läuft im Browser)
- `pflege-app/pflege_server.py` – lokaler Hilfsserver (PDF-Textauslese + OCR)
- `pflege-app/Pflege-Server starten.bat` – Starter für Windows
- `pflege-app/tessdata/` – deutsches OCR-Sprachpaket (Tesseract)

## Starten (Windows)
Doppelklick auf `pflege-app/Pflege-Server starten.bat`. Der Browser öffnet sich
automatisch unter http://127.0.0.1:8765.

Voraussetzungen: Python 3 sowie die Pakete `pymupdf pytesseract pillow` (werden von
der `.bat` automatisch installiert). Für OCR gescannter PDFs zusätzlich das Programm
Tesseract-OCR.

## Datenschutz
Alle Gutachten- und Patientendaten werden ausschließlich **lokal** verarbeitet.
In diesem Repository werden **keine** personenbezogenen Daten gespeichert.
Der Google-API-Schlüssel wird nur lokal im Browser hinterlegt, niemals im Code.

## Nicht versioniert
Versandfertige `.exe`-Dateien, ZIP-Pakete und lokale Backups werden bewusst nicht
mit hochgeladen (siehe `.gitignore`) – die Git-Historie dient selbst als Versionsstand.
