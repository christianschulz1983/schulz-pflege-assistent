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
  js/grundlage.js     Anhoerung: Grundlage aus einer alten Stellungnahme (Ausweichweg)
  js/vergleich.js     Dreiervergleich und Schwellenwertrechnung
  js/anlagen.js       Anlagen: Zuordnung zum Kriterium, Verzeichnis im Dokument
  js/namenspruefung.js Abgleich der eingelesenen Namen gegen den Dokumenttext
  js/befund.js        Befunderhebung (Erstantrag, Höherstufung)
  js/erfassung.js     Pflegepersonen, Aufenthalte, Versorgung, Übernahme in Modul 5
  js/hoeherstufung.js Dokumentvorlage der Anträge und Deckblatt
  js/arztberichte.js  Mehrfach-Upload ärztlicher Unterlagen in die Erfassungstabellen
  js/unterlagen.js    Unterlagen als dokumentierten Eintrag in die Notizen
  js/nummerierung.js  Nummerierung des Gutachtens (4.x.y bzw. 5.x.y bei Medicproof)
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
8b. **Kopfzeile und Druckbild.** In den Datenzeilen steht der Doppelpunkt unmittelbar
   hinter der Bezeichnung; die Angaben beginnen bei 217 px (`.k` in `STELLUNGNAHME_CSS`).
   Zwischen beiden Feldern steht ein Leerzeichen – der Flex-Satz überspringt es, aber
   Word kennt kein Flex und bräuchte es sonst.
   Im Druck gilt `@page{margin:0}`, damit der Browser keine Kopf-/Fußzeile
   („about:blank", Datum, Seitenzahl) in den Seitenrand setzt. Die Ränder erzeugt eine
   Tabelle mit leerem `thead`/`tfoot` (`printAppealText`) – die wiederholt der Browser
   auf **jeder** Seite. Ein Innenabstand am Text kann das nicht: Er greift oben nur auf
   Seite 1. Niemals wieder einen Seitenrand in `@page` eintragen.
9. **Anhörungsverfahren** (`js/anhoerung.js`, `js/vergleich.js`): Vierter Vorgang. Beginnt
   mit „Fall laden" (Widerspruchsfall) – Erstgutachten und eigene Bewertung stehen damit
   fest; neu eingelesen wird nur das Anhörungsgutachten in `stateZweit`. Vorlage: zwei
   Gutachtenblöcke im Kopf, Einleitung mit **„aufrecht"**, neu verfasste Allgemeine Angaben,
   **drei Spalten** in der Gegenüberstellung, nur die **strittig gebliebenen** Kriterien,
   Fazit mit beiden Gutachten. Bis zu 8 Sätze je Begründung, eigene Stilvorlage
   (`pflege_stilbeispiele_anhoerung`). Anhörungsschreiben bleiben Stilvorlage **nur** hier.
   In den **Allgemeinen Angaben** steht **immer** ein Verweis darauf, wie sich das
   Anhörungsgutachten zur ursprünglichen Stellungnahme verhält – worin ihm gefolgt wurde
   und worin nicht. Dieser Satz wird von `anhoerungVerweisSatz()` **gerechnet** und
   angehängt; die KI ist ausdrücklich angewiesen, die Kriterien NICHT selbst aufzuzählen.
9a. **Grundlage der Anhörung – zwei Wege** (`js/grundlage.js`). **Regelweg: „Fall laden".**
   Die Falldatei enthält alle 65 Kriterien exakt; nichts wird geraten. **Ausweichweg für
   Altfälle:** Erstgutachten einlesen, danach die damalige Stellungnahme als PDF. Das geht,
   weil die eigene Einschätzung im Widerspruch überall dort dem Gutachten entspricht, wo
   nicht widersprochen wurde – die Stellungnahme nennt genau die strittigen Kriterien mit
   beiden Wertungen. Der Ausweichweg schreibt **nur** `stateEigene`; Erstgutachten,
   Stammdaten und Notizen bleiben unberührt. `wertungAusText()` ordnet einen Wortlaut einer
   Stufe zu und liefert **null**, wenn er zu keiner passt – dann wird nichts eingetragen,
   sondern in der Prüfansicht gemeldet. `stellungnahmeGegenprobe()` rechnet die gelesenen
   Wertungen gegen die Modulsummen der Stellungnahme.
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
   **Zwei Prüfungen, nicht eine:** `modulZeilenPruefung()` (`js/berechnung.js`) prüft jede
   Modulzeile **in sich** – passen Einzelpunkte und gewichtete Punkte nach den Richtlinien
   zusammen? Das geht ohne die Einzelkriterien und greift deshalb immer. Anlass: Ein
   Gutachten kam mit „Modul 4: 25 Einzelpunkte, 10,00 gewichtete Punkte" herein; 25 ergeben
   30,00, zu 10,00 gehören 3 bis 7. Der Hinweis nennt **beide Lesarten**, damit der Berater
   in der PDF nachsehen kann, welche der beiden Zahlen falsch gelesen wurde. Korrigiert wird
   von Hand – die App ändert die Zahlen nicht selbst.
13. **Gescannte Gutachten: Text ist Lesehilfe, das Bild ist maßgeblich.**
   `textDecktDokumentAb()` in `js/auslese.js` entscheidet, ob der lokal ausgelesene Text
   das Dokument ersetzen darf. Er darf es **nur** bei einer echten Text-PDF: keine leere
   Seite, keine Seite über Texterkennung, mindestens 20 Kriteriumsnummern im Text.
   Sonst gehen **Text und Dokument gemeinsam** an die KI, mit dem ausdrücklichen Hinweis,
   dass die Ankreuzungen aus dem Bild zu lesen sind. Grund: In erkanntem Text wird aus
   einer Zeile „Umsetzen [0X] O1 O2 O3", andere zerfallen ganz. Für Namen und Fließtext
   taugt er, für die Bewertungstabellen nicht.
   Der Pfad zur Sprachdatei geht über die Umgebungsvariable `TESSDATA_PREFIX`, **nie**
   über `--tessdata-dir`: pytesseract zerlegt den Konfigurationstext mit shlex, und daran
   zerbrach der Pfad am Leerzeichen in „Pflegegradassistent für Berater". Beim Start
   führt der Server einmal eine echte Texterkennung aus – nur wenn die gelingt, meldet
   er `ocrAvailable`. Fehler bei einzelnen Seiten werden nie stillschweigend übergangen.
14. **Das Schriftstück trägt die Nummerierung des Gutachtens** (`js/nummerierung.js`,
   Regeln nur dort pflegen). Medicproof nummeriert dieselben Module 5.1 bis 5.6. Die App
   rechnet intern immer mit 4.x.y – daran wird nichts geändert. Im **erzeugten
   Schriftstück** steht dagegen die Zählung des Gutachtens, auf das es sich bezieht:
   in der Tabelle (`modulNr`), in den Überschriften (`zeigeNr`) und in allen Fließtexten
   einschließlich Einleitung und Begründungen (`nummernImText`). Das gilt für **alle vier
   Vorgangsarten**.
   Zwei Ausnahmen, die genauso wichtig sind wie die Regel:
   - **Wörtliche BRi-Zitate bleiben unangetastet.** 4.x.y ist die Nummerierung der
     Richtlinie selbst; sie zu ändern hieße, ein Zitat zu verfälschen. Alles zwischen
     „ und “ wird deshalb ausgelassen. Die Zitatprüfung läuft immer über den
     Originaltext, nie über den umgestellten.
   - **Zweiteilige Nummern nur nach einem Hinweiswort** (Ziffer, Abschnitt, Nummer, Nr.,
     Punkt, Modul). Sonst würde aus „4.5 Punkte" ein falsches „5.5 Punkte".
   Die interne Kennung in `data-nr` bleibt immer 4.x.y – daran hängt das Wiederfinden
   bereits erzeugter Begründungen.

15. **Unterlagen zur Akte** (`js/unterlagen.js`): Neben den Notizen steht in **allen**
   Vorgangsarten ein Upload für Arztberichte, Entlassungsberichte, Befunde, Verordnungen,
   **Pflegetagebücher** und sonstige Schriftstücke. Je Unterlage entsteht ein Eintrag mit
   Verfasser, Profession, Einrichtung, Erstellungsdatum, bei stationärer Behandlung
   Aufenthalt von–bis samt Grund, den Diagnosen, einer Zusammenfassung und dem
   Pflegerelevanten. **Fehlende Angaben bleiben leer** – niemals „unbekannt" einsetzen,
   eine fehlende Angabe ist eine Information, eine erfundene nicht. Angehängt wird an die
   Notizen (`haengeAnNotizen`), **nie überschreibend**: Die Mitschrift des Erstgesprächs
   ist die Hauptquelle der erzeugten Texte. Nichts ist vorausgewählt.
   Nicht zu verwechseln mit `js/arztberichte.js` – das überträgt Diagnosen, Hilfsmittel
   und Therapien in die **Erfassungstabellen** von Erstantrag und Höherstufung.

## Fachliche Fallstricke (aus der Handreichung des Verfassers)
- Hilfsmittel, die laut Regel zu „selbständig" führen, begründen **keine** Einschränkung
  (Rollator und Gehstock bei 4.1.4, Treppengeländer bei 4.1.5, Haltegriffe bei 4.1.3).
- Bei 4.2.7 und 4.2.8 **keine** Schwerhörigkeit oder Sehschwäche werten – bei 4.2.10 dagegen schon.
- Kognitiv bedingter Anleitungsbedarf bei Alltagshandlungen gehört zu 4.2.5.
- Modul 3 setzt eine fachärztliche Diagnose mit mindestens sechs Monaten Behandlung voraus.
- Modul 5 setzt in der Regel ärztliche Verordnung und sechs Monate Dauerhaftigkeit voraus.
- **Die Umrechnungstabellen aller sechs Module stehen in `MODUL_SPANNEN`** (`js/berechnung.js`)
  und nirgends sonst. Eine falsche Grenze bleibt sonst jahrelang unbemerkt: In Modul 1 stand
  die Grenze zu 7,5 gewichteten Punkten bei 7 statt bei 6 – wer genau 6 Einzelpunkte hatte,
  bekam 5,00 statt 7,50. Der Selbsttest prüft **jede einzelne Punktzahl** jedes Moduls gegen
  eine getrennt ausgeschriebene Solltabelle. Grenzen nie an zwei Stellen führen – die
  Sprungmarken der Spalte „fehlende Punkte" kommen aus derselben Tabelle.
- Modul 5 wird je Gruppe summiert und dann **einmal** bepunktet, nicht je Kriterium.
  Gerechnet wird das ausschließlich in `m5Gruppen()` in `js/berechnung.js`.
  Die gewichteten Punkte liegen in **breiten Spannen** (`m5Gewichtet`): 0 → 0, 1 → 5,
  2–3 → 10, 4–5 → 15, ab 6 → 20. Ein Kriterium kann sich deshalb ändern, ohne dass sich
  die gewichteten Punkte bewegen. Das ist richtig gerechnet und **kein Fehler** – es sieht
  nur wie einer aus. Damit das Schriftstück nicht widersprüchlich wirkt, ergänzt
  `m5WirkungSatz()` (`js/vorschlaege.js`) bei jedem Modul-5-Kriterium einen **gerechneten**
  Satz: Gruppe, Einzelpunkte vorher/nachher und die Wirkung auf die gewichteten Punkte –
  einschließlich der Aussage, wenn sie sich nicht ändern. In allen vier Vorgangsarten.
  Die KI wird eigens angewiesen, für Modul 5 **keine** Punktzahl und keinen Punktgewinn
  zu behaupten; die Rechnung ergänzt die App.
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
beide eingelesen, als Text-PDF wie als Scan. Der Selbsttest umfasst 687 Pruefungen.

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
