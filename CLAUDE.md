# Pflegegradassistent für Berater – Projektanweisung

Diese Datei wird bei jeder Sitzung automatisch geladen. Sie ersetzt das fehlende
Gedächtnis zwischen Sitzungen. Bei Änderungen an der Arbeitsweise hier nachtragen.

## Was die App ist
Lokale Web-App für einen Pflegeberater (Familiara GmbH). Liest deutsche Pflegegutachten
(Medizinischer Dienst, Medicproof) ein, lässt die NBA-Modulwerte prüfen und erzeugt eine
pflegefachliche Stellungnahme bzw. einen Widerspruch. Läuft lokal über einen Python-Server
(Port 8765) und online über GitHub Pages.

## Aufbau
```
pflege-app/
  index.html          Oberfläche, lädt alle Bausteine (Reihenfolge ist bindend)
  styles.css          Oberflächen-Stile
  js/basis.js         API-Schlüssel, Durchführungsarten, ITEMS (65 Kriterien), Zustand
  js/ki.js            Google-Gemini-Anbindung, Überlagerungen
  js/auslese.js       Lokaler Server, Gutachten-Import, Prüfansicht, PDF-Vorschau
  js/vorlage.js       Logo, Dokument-Stile, Verfasser, Datumsformate, Stilvorlagen
  js/vorschlaege.js   BRi-Zugriff, Widerspruchspunkte, Abweichungen, KI-Begründungen
  js/dokument.js      Stellungnahme bauen, Zitatprüfung, Zusammenführen, Word-Export
  js/oberflaeche.js   NBA-Ansicht, Diagnosezeilen, init
  js/berechnung.js    Punkte, Pflegegrad
  js/auswertung.js    Sidebar, Auswertung, Fall speichern/laden
  js/modus.js         Startauswahl: Verfasser und Vorgangsart
  js/bewertung.js     Einzige Schreibstelle fuer Bewertungen, Protokoll
  js/laenge.js        Laengengrenzen der erzeugten Texte
  js/korrektur.js     Erfasste Daten nachtraeglich korrigieren
  js/anhoerung.js     Anhoerungsverfahren: Erfassung und Vorlage
  js/vergleich.js     Dreiervergleich und Schwellenwertrechnung
  js/anlagen.js       Anlagen: Zuordnung zum Kriterium, Verzeichnis im Dokument
  js/namenspruefung.js Abgleich der eingelesenen Namen gegen den Dokumenttext
  js/befund.js        Befunderhebung (Erstantrag, Höherstufung)
  js/erfassung.js     Pflegepersonen, Aufenthalte, Versorgung, Übernahme in Modul 5
  js/hoeherstufung.js Dokumentvorlage der Anträge und Deckblatt
  js/arztberichte.js  Mehrfach-Upload ärztlicher Unterlagen mit Zusammenführung
  js/selbsttest.js    Selbsttest (Knopf oben rechts)
  befund_katalog.js   Befundkatalog, acht Gruppen (nicht von Hand ändern)
  bri_texte.js        BRi-Originaltexte, 65 Kriterien (nicht von Hand ändern)
  laien_hinweise.js   Praxishinweise, 58 Kriterien (Hilfsmittel-Regeln, Fallstricke)
  pflege_server.py    Lokaler Server: PDF-Text, OCR, liefert die App aus
  test_pflege_server.py  Selbsttest für den Server (python test_pflege_server.py)
```
Alle Skripte sind klassische Skripte im gemeinsamen Namensraum – **keine ES-Module**,
weil die Oberfläche über `onclick` auf globale Funktionen zugreift.

## Feste Regeln
1. **Nach jeder Änderung den Selbsttest ausführen** und das Ergebnis nennen. Er darf nie
   rot werden. Neue Funktionen bekommen eine eigene Prüfung in `js/selbsttest.js`.
   Der Selbsttest prüft nur den Browserteil. Wird `pflege_server.py` geändert, zusätzlich
   im Ordner `pflege-app` `python test_pflege_server.py` laufen lassen **und den Server
   neu starten** – er lädt die Datei nur beim Start.
2. **Jede Änderung committen und pushen.** Repository ist öffentlich:
   https://github.com/christianschulz1983/schulz-pflege-assistent
3. **Keine Patientendaten, keine Zugangsdaten, keine Bankdaten im Code.** Das Repository ist
   öffentlich. Eigene Fallbeispiele bleiben im Feld „Stilvorlage" (nur im Browser gespeichert).
4. **BRi-Zitate niemals erfinden oder sinngemäß in Anführungszeichen setzen.** Die technische
   Zitatprüfung in `js/dokument.js` deckt das auf; sie darf nicht umgangen werden.
5. **Stilvorlagen nur aus regulären Widersprüchen** („PS_<Nr>_<Name>"), niemals aus
   Anhörungsschreiben – das ist ein anderer Dokumenttyp.
6. **Formatvorgaben:** Name immer „Herr/Frau Vorname Nachname". Alle Datumsangaben tt.mm.jjjj.
   Organisation „Medizinischer Dienst <Region>" oder „Medicproof GmbH". Nie „Pflegegrad 0",
   immer „kein Pflegegrad". Schrift Calibri 11 pt, blaue Überschriften 14 pt, Briefkopf 9 pt.
7. **Die drei Durchführungsarten** sind abschließend: Hausbesuch mit persönlicher
   Befunderhebung / per Aktenlage / strukturiertes Telefoninterview.
7a. **Namen buchstabengenau.** Schrifterkennung verwechselt l/I/i/1, rn/m, cl/d, 0/O, 5/S,
   8/B. Die Prüfansicht gleicht den eingelesenen Namen gegen den Dokumenttext ab
   (`js/namenspruefung.js`) und bietet die dort gefundene Schreibweise an. Der Abgleich
   greift nur, wenn der lokale Server Text geliefert hat – online steht er nicht zur
   Verfügung, dort bleibt die Sichtprüfung.
8. **Längenvorgaben für erzeugte Texte** (`js/laenge.js`, Grenzen nur dort pflegen):
   Einleitung („Allgemeine Angaben" bzw. „Anamnese") höchstens 260 Wörter / 1.800 Zeichen –
   das ist eine **halbe** A4-Seite bei Calibri 11 pt. Jede Begründung zu einem
   Modulpunkt höchstens **5 Sätze** / 150 Wörter, dabei aber Notizen, BRi-Bezug und
   Schlusssatz enthalten. Die Grenzen werden nach der Erzeugung gemessen; bei Überschreitung
   läuft **ein** gezielter Kürzungsdurchgang, danach wird der Berater gewarnt. Niemals
   mechanisch abschneiden – das zerstört Zitate und den Ableitungssatz.
8a. **Zweck der Einleitung** (`allgemeinAufgabe()` in `js/vorschlaege.js`): Sie begründet
   NICHTS. Kein Richtlinienbezug, kein Zitat, keine Stufenbezeichnung, kein Ableitungssatz,
   kein Abzählen von Kriterien – das gehört ausschließlich in „Befund und Stellungnahme".
   Bei **Widerspruch und Anhörung** zeigt sie **Lücken und Widersprüche** des Gutachtens auf,
   bei **Erstantrag und Höherstufung** stellt sie die **aktuelle Pflegesituation** dar
   (Höherstufung zusätzlich: was hat sich verschlechtert). Sie baut immer auf den Notizen auf.
9. **Anhörungsverfahren** (`js/anhoerung.js`, `js/vergleich.js`): Vierter Vorgang. Beginnt
   mit „Fall laden" (Widerspruchsfall) – Erstgutachten und eigene Bewertung stehen damit
   fest; neu eingelesen wird nur das Anhörungsgutachten in `stateZweit`. Vorlage: zwei
   Gutachtenblöcke im Kopf, Einleitung mit **„aufrecht"**, neu verfasste Allgemeine Angaben,
   **drei Spalten** in der Gegenüberstellung, nur die **strittig gebliebenen** Kriterien,
   Fazit mit beiden Gutachten. Bis zu 8 Sätze je Begründung, eigene Stilvorlage
   (`pflege_stilbeispiele_anhoerung`). Anhörungsschreiben bleiben Stilvorlage **nur** hier.
10. **Korrigieren zerstört nichts** (`js/korrektur.js`): „Erfasste Daten korrigieren" öffnet
   die Prüfansicht erneut, setzt aber – anders als das Einlesen – nichts zurück. Notizen,
   Befund, Erfassung und die geschriebene Stellungnahme bleiben erhalten. Übernommen werden
   nur Kriterien, die in der Ansicht tatsächlich angefasst wurden (`reviewGeaendert`);
   korrigiert wird das Vorgutachten, die eigene Einschätzung zieht nur dort mit, wo sie
   bisher unverändert dem Vorgutachten entsprach.
11. **Die App trägt niemals eigenmächtig Bewertungen ein.** Nach dem geprüften und
   bestätigten Import ist die Bepunktung Sache des Beraters. Die KI darf ausschließlich
   vorschlagen; übernommen wird nur, was ausdrücklich angehakt wurde – Auswahllisten
   starten deshalb **ohne** gesetzte Haken. Jeder Schreibzugriff läuft über
   `setzeBewertung()` in `js/bewertung.js`, nennt seine Quelle und wird protokolliert;
   ein unbekannter Ursprung wird abgewiesen. Neue Schreibstellen niemals direkt auf
   `stateEigene.values` / `stateOrig.values` setzen.
12. **Zwei Gutachtenformulare, eine Rechenlogik.** Neben dem Medizinischen Dienst wird das
   Formular der **Medicproof GmbH** eingelesen (Abschnitte 5.1–5.6 statt 4.1–4.6, siehe
   „SONDERFALL MEDICPROOF" in `js/auslese.js`). Drei Unterschiede sind fehleranfällig:
   (a) Es gibt **kein Antragsdatum** – das Feld bleibt leer.
   (b) Neben jeder Option steht ihr **Punktwert**; gesucht ist aber die **Spaltenposition
   0..3**. Bei 5.4.8 Essen (0/3/6/9), 5.4.9 und 5.4.10 (0/2/4/6) und Modul 3 (0/1/3/5)
   fallen beide auseinander – dort entsteht der typische Lesefehler.
   (c) In Modul 5 sagt die Markierung nur den **Zeitraum**; die Zahl steht rechts in der
   eigenen Spalte **„Häufigkeit"** (`extract_values` in `pflege_server.py` erkennt diese
   Spalte an der Überschrift und schaltet um).
   Absicherung: `modulGegenprobe()` in `js/auslese.js` rechnet die eingelesenen Kriterien
   je Modul nach und vergleicht sie mit „Summe der Einzelpunkte" aus dem Gutachten. Jede
   Abweichung wird in der Prüfansicht angezeigt. Diese Gegenprobe niemals entfernen.

## Fachliche Fallstricke (aus der Handreichung des Verfassers)
- Hilfsmittel, die laut Regel zu „selbständig" führen, begründen **keine** Einschränkung
  (Rollator und Gehstock bei 4.1.4, Treppengeländer bei 4.1.5, Haltegriffe bei 4.1.3).
- Bei 4.2.7 und 4.2.8 **keine** Schwerhörigkeit oder Sehschwäche werten – bei 4.2.10 dagegen schon.
- Kognitiv bedingter Anleitungsbedarf bei Alltagshandlungen gehört zu 4.2.5.
- Modul 3 setzt eine fachärztliche Diagnose mit mindestens sechs Monaten Behandlung voraus.
- Modul 5 setzt in der Regel ärztliche Verordnung und sechs Monate Dauerhaftigkeit voraus.
- Modul 5 wird je Gruppe summiert und dann **einmal** bepunktet, nicht je Kriterium.
- Modul 5, Kriterien **4.5.1 bis 4.5.14**: Ist keine Maßnahme festgestellt, steht im erzeugten
  Schriftstück **„entfällt oder selbständig"** – niemals „0", „null" oder „0x pro Woche".
  Eine Häufigkeit von null ist keine Bewertung (`m5HaeufigkeitText` in `js/vorschlaege.js`).

## Arbeitsweise
- Große Datei nie am Stück neu schreiben. Gezielt suchen, lesen, punktuell ändern.
- Vor umfangreichen mechanischen Umbauten ein Skript schreiben, das die Vollständigkeit prüft
  (so wurde die Aufteilung der Einzeldatei abgesichert).
- Was nicht geprüft werden konnte, offen benennen – besonders die inhaltliche Qualität der
  KI-Texte, solange kein gültiger Google-Schlüssel vorliegt.

## Stand der Ausbaustufen
Vier Vorgaenge sind einsatzbereit: Widerspruch (unveraendert), Erstantrag und
Hoeherstufungsantrag mit Befundkatalog, erweiterter Erfassung, Uebernahme in Modul 5,
Arztbericht-Auslese und Deckblatt sowie das Anhoerungsverfahren mit drittem
Bewertungsstand, Vergleichsreiter und eigener Vorlage.
Anlagen (Arztberichte, Verordnungen) lassen sich hochladen, einem strittigen Kriterium
zuordnen und erscheinen als Verweis bei der Begruendung sowie als Verzeichnis am Ende.
Die Dateien selbst lassen sich nicht in das Word-Dokument einbetten - der Berater legt
sie beim Versand bei. Gutachten des Medizinischen Dienstes und der Medicproof GmbH werden
beide eingelesen. Der Selbsttest umfasst 500 Pruefungen.

Wichtige Grundsätze, die beim Weiterbauen gelten:
- Abgeleitete Werte bleiben immer von Hand überschreibbar (Beispiel: Ernährungszustand aus
  dem BMI). Eine eigene Eingabe hat Vorrang und darf nicht automatisch überschrieben werden;
  es muss einen Weg zurück zur Ableitung geben.
- Angaben, die einem NBA-Kriterium entsprechen, werden nur EINMAL erfasst und schreiben
  unmittelbar in die eigene Einschätzung. Funktionsbefunde schlagen nur vor.
- Bei Höherstufung und Erstantrag keine Kritik am Gutachter; dort wird über die
  Verschlechterung beziehungsweise den erstmaligen Hilfebedarf begründet.

Offen: Für den Widerspruch später ein eigener Befund (siehe Abgrenzung oben).

**Der Befundkatalog gehört ausdrücklich NICHT in den Widerspruch.** Dort wird zu einem
späteren Zeitpunkt ein anderer, eigener Befund gebraucht: eine Gegenüberstellung je
Kriterium aus (1) was während der Begutachtung nicht geprüft wurde, (2) wie das Gutachten
es beschreibt, (3) wie es tatsächlich ist. Das ist die strukturierte Form des inneren
Widerspruchs und wird erst beim Feintuning der Widerspruchsbegründung angegangen.
