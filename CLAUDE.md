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
  js/befund.js        Befunderhebung (Erstantrag, Höherstufung)
  js/erfassung.js     Pflegepersonen, Aufenthalte, Versorgung, Übernahme in Modul 5
  js/hoeherstufung.js Dokumentvorlage der Anträge und Deckblatt
  js/arztberichte.js  Mehrfach-Upload ärztlicher Unterlagen mit Zusammenführung
  js/selbsttest.js    Selbsttest (Knopf oben rechts)
  befund_katalog.js   Befundkatalog, acht Gruppen (nicht von Hand ändern)
  bri_texte.js        BRi-Originaltexte, 65 Kriterien (nicht von Hand ändern)
  laien_hinweise.js   Praxishinweise, 58 Kriterien (Hilfsmittel-Regeln, Fallstricke)
  pflege_server.py    Lokaler Server: PDF-Text, OCR, liefert die App aus
```
Alle Skripte sind klassische Skripte im gemeinsamen Namensraum – **keine ES-Module**,
weil die Oberfläche über `onclick` auf globale Funktionen zugreift.

## Feste Regeln
1. **Nach jeder Änderung den Selbsttest ausführen** und das Ergebnis nennen. Er darf nie
   rot werden. Neue Funktionen bekommen eine eigene Prüfung in `js/selbsttest.js`.
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
8. **Längenvorgaben für erzeugte Texte** (`js/laenge.js`, Grenzen nur dort pflegen):
   Einleitung („Allgemeine Angaben" bzw. „Anamnese") höchstens 390 Wörter / 2.700 Zeichen –
   das ist eine halbe bis drei viertel A4-Seite bei Calibri 11 pt. Jede Begründung zu einem
   Modulpunkt höchstens **5 Sätze** / 150 Wörter, dabei aber Notizen, BRi-Bezug und
   Schlusssatz enthalten. Die Grenzen werden nach der Erzeugung gemessen; bei Überschreitung
   läuft **ein** gezielter Kürzungsdurchgang, danach wird der Berater gewarnt. Niemals
   mechanisch abschneiden – das zerstört Zitate und den Ableitungssatz.
9. **Korrigieren zerstört nichts** (`js/korrektur.js`): „Erfasste Daten korrigieren" öffnet
   die Prüfansicht erneut, setzt aber – anders als das Einlesen – nichts zurück. Notizen,
   Befund, Erfassung und die geschriebene Stellungnahme bleiben erhalten. Übernommen werden
   nur Kriterien, die in der Ansicht tatsächlich angefasst wurden (`reviewGeaendert`);
   korrigiert wird das Vorgutachten, die eigene Einschätzung zieht nur dort mit, wo sie
   bisher unverändert dem Vorgutachten entsprach.
10. **Die App trägt niemals eigenmächtig Bewertungen ein.** Nach dem geprüften und
   bestätigten Import ist die Bepunktung Sache des Beraters. Die KI darf ausschließlich
   vorschlagen; übernommen wird nur, was ausdrücklich angehakt wurde – Auswahllisten
   starten deshalb **ohne** gesetzte Haken. Jeder Schreibzugriff läuft über
   `setzeBewertung()` in `js/bewertung.js`, nennt seine Quelle und wird protokolliert;
   ein unbekannter Ursprung wird abgewiesen. Neue Schreibstellen niemals direkt auf
   `stateEigene.values` / `stateOrig.values` setzen.

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
Alle drei Vorgänge sind einsatzbereit: Widerspruch (unverändert), Erstantrag und
Höherstufungsantrag mit Befundkatalog, erweiterter Erfassung, Übernahme in Modul 5,
Arztbericht-Auslese und Deckblatt. Der Selbsttest umfasst 98 Prüfungen.

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
