// Handreichung des Verfassers: Erlaeuterung der NBA-Kriterien in einfacher Sprache.
// Der Wortlaut ist unveraendert uebernommen und wird ueber die Schaltflaeche (i)
// neben dem jeweiligen Kriterium angezeigt - in allen Vorgangsarten.
// Erzeugt aus dem Originaldokument; nicht von Hand aendern.
// Ebene 0 = Hauptpunkt, Ebene 1 = Unterpunkt (Abstufungen).
const LAIEN_TEXTE = {
 "4.1.1": {
  titel: "Positionswechsel im Bett",
  zeilen: [
  [0, "Laien-Check: Kann sich die Person im Bett eigenständig umdrehen, die Beine bewegen oder sich aufrichten?"],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel (Bettgalgen, Griffe, Seitengitter, Strickleiter) und schafft sie damit ganz allein? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: selbständig:"],
  [1, "1: Überwiegend selbständig: Du musst nur geringfügig helfen, z. B. die Beine aus dem Bett rausheben oder eine Hand zum Aufrichten reichen."],
  [1, "2: Überwiegend unselbständig: Hoher Unterstützungsbedarf beim Lagewechsel (z. B. aktives Schieben/Wuchten beim Wechsel der Seite), ABER die eingenommene Lage kann von der Person selbst beibehalten werden (z. B. indem sie sich am Seitengitter oder deiner Hand festgehalten wird)."],
  [1, "Unselbständig: Die eingenommene Lage kann nicht beibehalten werden; die Person sinkt sofort zurück oder kippt um. Sie muss komplett durch dich gelagert und gestützt werden."]
  ]
 },
 "4.1.2": {
  titel: "Halten einer stabilen Sitzposition",
  zeilen: [
  [0, "Laien-Check: Kann die Person frei auf der Bettkante oder einem Stuhl ohne Lehne sitzen, ohne das Gleichgewicht zu verlieren?"],
  [0, "Hilfsmittel-Regel: Werden nur Rücken- oder Armlehnen benötigt, gilt dies als selbständig."],
  [0, "Abstufungen:"],
  [1, "0: selbständig"],
  [1, "1: Überwiegend selbständig: Die Person sitzt unsicher. Du musst zur Absicherung (z. B. bei Schwindel oder Schwäche) unmittelbar daneben stehen, um im Notfall einzugreifen."],
  [1, "2: Überwiegend unselbständig: Die Person muss während des Sitzens mehrfach körperlich korrigiert oder zeitweise gestützt werden (z. B. Oberkörper wieder gerade rücken), kann die Position aber mit dieser Hilfe noch halten."],
  [1, "3: Unselbständig: Die Person verliert ohne körperliche Stütze sofort das Gleichgewicht und muss aktiv und dauerhaft von dir gehalten werden."]
  ]
 },
 "4.1.3": {
  titel: "Umsetzen",
  zeilen: [
  [0, "Laien-Check: Kann die Person den Ort wechseln, z.B. vom Bett in den Rollstuhl oder vom Sessel auf die Toilette?"],
  [0, "Hilfsmittel-Regel: Haltegriffe, Rutschbretter oder Lifter, die die Person allein bedient -> selbständig."],
  [0, "Abstufungen:"],
  [1, "0: selbständig"],
  [1, "1: Überwiegend selbständig: Du musst nur eine Hand reichen, beim Positionieren der Füße helfen oder beim Aufstehen kurz stützen."],
  [1, "2: Überwiegend unselbständig: Du musst die Person aktiv anheben oder kräftig am Oberkörper/Becken halten und führen, während sie noch teilweise mitarbeitet (z. B. sich mitschwingt oder kurzzeitig steht)."],
  [1, "3: Unselbständig: Die Person kann gar nicht mehr mithelfen; sie muss komplett von dir gehoben oder mit einem Lifter transferiert werden."]
  ]
 },
 "4.1.4": {
  titel: "Fortbewegen innerhalb des Wohnbereichs",
  zeilen: [
  [0, "Laien-Check: Kann sich die Person sicher innerhalb der Wohnung von Zimmer zu Zimmer bewegen? Wichtig: Es geht hier ausschließlich um die Fortbewegung im Wohnbereich, z.B. der Weg zur Toilette oder die Bewältigung von ca. 8 m in der Wohnung."],
  [0, "Hilfsmittel-Regel: Rollator, Gehstock oder Rollstuhl (selbst angetrieben) -> selbständig."],
  [0, "Abstufungen:"],
  [1, "0: selbständig"],
  [1, "1: Überwiegend selbständig: Du musst zur Absicherung unmittelbar daneben hergehen (z. B. wegen Schwindel oder Sturzgefahr), ohne permanent körperlich zu stützen. Bei der Fortbewegung mit dem Rollstuhl ist punktuelle Hilfe notwendig, z.B. bei der Bewältigung von Schwellen und engen Kurven in der Wohnung."],
  [1, "2: Überwiegend unselbständig: Die Person kann lediglich wenige Schritte gehen (ca. 3 bis 5 Schritte) und muss dabei erheblich abgestützt und geführt werden. Bei der Nutzung des Rollstuhls muss sie größtenteils geschoben werden und kann sich z.B. nur wenig fortbewegen, z.B. den Rollstuhl um die eigene Achse drehen."],
  [1, "3: Unselbständig: Die Person muss von dir getragen werden oder du musst den Rollstuhl komplett schieben."]
  ]
 },
 "4.1.5": {
  titel: "Treppensteigen",
  zeilen: [
  [0, "Laien-Check: Kann die Person eine ganze Etage (Treppe zwischen zwei Stockwerken) in aufrechter Haltung überwinden?"],
  [0, "Hilfsmittel-Regel: Ein Treppengeländer (auch beidseitig) ist ein Hilfsmittel. Wer sich damit allein hochzieht, gilt als selbständig."],
  [0, "Abstufungen:"],
  [1, "0: selbständig"],
  [1, "1: Überwiegend selbständig: Die Person schafft die Treppe körperlich allein, benötigt aber Begleitung/Anwesenheit als \"Schatten\" aus Sicherheitsgründen (Sturzrisiko/Angst), ohne dass du aktiv stützen musst."],
  [1, "2: Überwiegend unselbständig: Treppensteigen ist nur möglich, wenn du die Person aktiv stützt oder festhältst (z. B. kräftiges Halten unter den Arm)."],
  [1, "3: Unselbstständig: Die Person muss getragen werden oder mit Hilfsmitteln (z. B. Treppenlift) transportiert werden, die du komplett bedienst. Es findet keine Eigenbeteiligung statt."]
  ]
 },
 "4.2.1": {
  titel: "Personen aus dem näheren Umfeld erkennen",
  zeilen: [
  [0, "Laien-Check: Erkennt die Person enge Angehörige (Kinder, Partner) oder enge Freunde sicher und ordnet sie richtig zu? Dass sich die Person nicht an den Namen erinnert, zählt nicht als Einschränkung."],
  [0, "Hilfsmittel-Regel: Da es eine rein kognitive Fähigkeit ist, zählen Brillen oder Hörgeräte hier nicht. Nur kognitive Hilfen (z. B. ein selbständig genutztes Fotobuch mit Beschriftungen) gelten zur Kompensation."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Erkennt Bezugspersonen jederzeit sicher."],
  [1, "1: Fähigkeit größtenteils vorhanden: Gelegentliche Verwechslungen (z. B. Enkel mit Sohn), die meist selbständig korrigiert werden oder nach längerem Nachdenken selbständig korrigiert werden."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Erkennt Angehörige nur noch phasenweise oder braucht häufige personelle Hinweise zur Zuordnung."],
  [1, "3: Fähigkeit nicht vorhanden: Engste Personen werden gar nicht mehr erkannt oder als Fremde wahrgenommen."]
  ]
 },
 "4.2.2": {
  titel: "Örtliche Orientierung (sich im Haus/Zimmer zurechtfinden)",
  zeilen: [
  [0, "Laien-Check: Findet sich die Person in der Wohnung und in der Nachbarschaft (z. B. Weg zum Bäcker) sicher zurecht? Hinweis: Es geht ausschließlich um kognitive Einschränkungen (Orientierung im Gehirn), nicht um Einschränkungen des Sehvermögens. Werden diese Wege sicher bewältigt, gilt die Fähigkeit als unbeeinträchtigt."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig kognitive Hilfen wie Türbeschriftungen, Piktogramme, farbige Markierungen am Boden oder eine Handy-App zur Navigation, um Ziele im Haus oder Nahbereich sicher zu erreichen? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Findet alle Ziele in der Wohnung, am Haus (Garten/Flur) sowie gewohnte Wege in der Nachbarschaft (z. B. zum Bäcker) sicher."],
  [1, "1: Fähigkeit größtenteils vorhanden: Findet sich innerhalb der Wohnung sicher zurecht. Wege im näheren Wohnumfeld (z. B. zum Bäcker oder zum Briefkasten) können jedoch nicht mehr sicher bewältigt werden."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Findet sich außerhalb gar nicht mehr zurecht; braucht auch innerhalb der Wohnung personelle Hinweise auf die Zimmer (z. B. „Da geht es zum Bad“)."],
  [1, "3: Fähigkeit nicht vorhanden: Findet auch in der eigenen Wohnung kein Ziel mehr (vollständige Orientierungslosigkeit)."]
  ]
 },
 "4.2.3": {
  titel: "Zeitliche Orientierung",
  zeilen: [
  [0, "Laien-Check: Weiß die Person, welchen Wochentag wir haben oder ob es gerade Vormittag oder Abend ist? Kann sie das aktuelle Jahr oder den Monat benennen? Hinweis: Es geht um die Verarbeitung im Gehirn, nicht um das bloße Ablesen einer Uhr (Sehvermögen)."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig kognitive Stützen wie Funkuhren mit großem Display, einen Abreißkalender oder die Datumsanzeige auf dem Handy zur Orientierung? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Zeitliche Einordnung (ggf. mit Hilfsmitteln) jederzeit sicher."],
  [1, "1: Fähigkeit größtenteils vorhanden: Vergisst gelegentlich das Datum oder verwechselt den Wochentag; die Tageszeiten werden jedoch sicher unterschieden."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Braucht mehrfach täglich personelle Hinweise zur Zeit (z. B. „Es ist jetzt 12 Uhr, Zeit für das Mittagessen“). Sie kann grob den Tagesabschnitt einschätzen oder sich an Hell oder Dunkel orientieren."],
  [1, "3: Fähigkeit nicht vorhanden: Hat jegliches Zeitgefühl verloren; es besteht kein Tag-Nacht-Rhythmus (schläft tagsüber, wandert nachts durch den Wohnbereich)."]
  ]
 },
 "4.2.4": {
  titel: "Erinnern an wesentliche Ereignisse oder Erlebnisse",
  zeilen: [
  [0, "Laien-Check: Kann die Person berichten, was in den letzten 24 Stunden passiert ist? Weiß sie noch, wer gestern zu Besuch war, worüber telefoniert wurde oder was es zu essen gab?"],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig ein Tagebuch, Kalender, Notizzettel oder Fotos auf dem Tablet, um sich an Erlebnisse zu erinnern? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Erlebnisse der letzten 24 Stunden können sicher abgerufen werden."],
  [1, "1: Fähigkeit größtenteils vorhanden: Vergisst Details des Erlebten, kann sich aber an das Kernereignis (z.B. „Gestern war Besuch da“) erinnern. Sie vergisst regelmäßig Termine oder die Einnahme der Medikamente."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Kann sich nur mit massiver Hilfe durch Erzählungen Dritter an Bruchstücke erinnern. Das Kurzzeitgedächtnis und das Langzeitgedächtnis sind eingeschränkt (Sie verwechselt Ereignisse aus der Vergangenheit und kann sich nur an prägende Ereignisse erinnern, z.B. die Hochzeit, etc.)."],
  [1, "3: Fähigkeit nicht vorhanden: Keine Erinnerung mehr möglich (Kurzzeitgedächtnis und Langzeitgedächtnis)."]
  ]
 },
 "4.2.5": {
  titel: "Steuern von mehrschrittigen Alltagshandlungen",
  zeilen: [
  [0, "Laien-Check: Kann die Person komplexe Alltagshandlungen planen und durchführen? Beispiel: „Kaffee kochen“ (Wasser füllen, Filter einlegen, Pulver dosieren, einschalten). WICHTIG: Rein kognitive Verarbeitung, nicht gemeint sind körperliche Einschränkungen oder Schmerzen, die das Durchführen von Alltagshandlungen einschränken."],
  [0, "Hilfsmittel-Regel: Werden Checklisten oder bebilderte Schritt-für-Schritt-Anleitungen selbständig zur Hilfe genommen? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Führt komplexe Handlungen (Kochen, Wäsche waschen, Gerät bedienen) fehlerfrei aus."],
  [1, "1: Fähigkeit größtenteils vorhanden: Vergisst gelegentlich einen Teilschritt, kann die Handlung aber meist zu Ende führen. Sie verwechselt z.B. bei der Körperpflege einzelne Abläufe oder vergisst diese. Einfache Hinweise zur Vollendung sind ausreichend."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Bricht Handlungen oft mittendrin ab oder vertauscht die Reihenfolge so stark, dass Alltagshandlungen nicht zielführend durchgeführt werden. Sie nimmt z.B. einen Waschlappen in die Hand, legt ihn dann wieder hin, sodass eine Impulsgabe oder eine kleinschrittige Anleitung zu jedem einzelnen Teilschritt notwendig ist."],
  [1, "3: Fähigkeit nicht vorhanden: Kann selbst einfachste Handlungen nicht mehr eigenständig planen oder beginnen."]
  ]
 },
 "4.2.6": {
  titel: "Treffen von Entscheidungen im Alltagsleben",
  zeilen: [
  [0, "Laien-Check: Kann die Person im Alltag zweckmäßig entscheiden? Wählt sie z. B. die Kleidung passend zum Wetter oder erkennt sie? Entscheidet die Person über das TV-Programm? WICHTIG: Rein kognitive Verarbeitung"],
  [0, "Hilfsmittel-Regel: Nutzt die Person kognitive Stützen (z. B. Wetter-App, vorab zusammengestellte Outfits) selbständig zur Entscheidungsfindung? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Sie trifft logische und für sie passende Entscheidungen im Alltag, die zur Zielerreichung notwendig sind."],
  [1, "1: Fähigkeit größtenteils vorhanden: Sie zögert oft bei Entscheidungen oder braucht häufig eine Bestätigung durch andere Personen oder sie benötigt Entscheidungsalternativen."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Trifft oft unlogische oder gefährliche Entscheidungen (will z. B. im Pyjama einkaufen gehen oder sie verlässt im Winter in kurzer Kleidung die Häuslichkeit)."],
  [1, "3: Fähigkeit nicht vorhanden: Ist vollkommen unfähig, Entscheidungen zu treffen, wird komplett durch Dritte gesteuert."]
  ]
 },
 "4.2.7": {
  titel: "Verstehen von Sachverhalten und Informationen",
  zeilen: [
  [0, "Laien-Check: Begreift die Person den Inhalt einer Zeitungsmeldung, einer einfachen Radio-Nachricht oder die Erklärungen eines Arztes? WICHTIG: Rein kognitive Verarbeitung – ausdrücklich NICHT die Schwerhörigkeit oder Seheinschränkungen bewerten."],
  [0, "Hilfsmittel-Regel: Es geht hier um das Begreifen im Gehirn. Ein Hörgerät hilft nur akustisch und kompensiert hier nicht die kognitive Einschränkung."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Versteht auch komplexere Sachverhalte und Zusammenhänge problemlos."],
  [1, "1: Fähigkeit größtenteils vorhanden: Braucht für das Verständnis einfache Erklärungen oder mehrfache Wiederholungen. Einfache Sachverhalte werden aber problemlos verstanden."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Versteht nur noch ganz kurze, konkrete Informationen (Ein-Satz-Botschaften)."],
  [1, "3: Fähigkeit nicht vorhanden: Sachverhalte werden kognitiv gar nicht mehr verarbeitet (keine Reaktion auf Informationen)."]
  ]
 },
 "4.2.8": {
  titel: "Erkennen von Risiken und Gefahren",
  zeilen: [
  [0, "Laien-Check: Erkennt die Person Gefahrenquellen wie eine brennende Herdplatte, wechselnde Bodenbeläge oder den fließenden Verkehr beim Überqueren der Straße? WICHTIG: Rein kognitive Verarbeitung – ausdrücklich NICHT die Seheinschränkungen bewerten."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig Warnsysteme (z.B. einen Herdwächter mit Signal oder erkennt sie die Ampeln)? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Die Person erkennt und meidet Gefahren im Haus und außerhalb sicher."],
  [1, "1: Fähigkeit größtenteils vorhanden: Die Person braucht gelegentlich eine Erinnerung an Gefahrenregeln, ist aber grundsätzlich vorsichtig. Sie schaut beim Überqueren einer Straße nicht nach links oder rechts oder sie überquert bei Rot einfach die Straße. Hier sind Gefahrenquellen außerhalb der Häuslichkeit gemeint."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Die Person unterschätzt Gefahren massiv (z.B. greift auf die eingeschaltete Herdplatte oder manipuliert an Steckdosen und Elektrik), braucht ständige Kontrolle, um sich nicht selbst zu gefährden."],
  [1, "3: Fähigkeit nicht vorhanden: Sie hat keinerlei Gefahrenbewusstsein mehr (greift z. B. in eine offene Flamme)."]
  ]
 },
 "4.2.9": {
  titel: "Mitteilen von elementaren Bedürfnissen",
  zeilen: [
  [0, "Laien-Check: Kann die Person ihre Grundbedürfnisse (Hunger, Durst, Schmerz, Toilettengang) so äußern, dass Außenstehende sie verstehen? WICHTIG: Hier werden die kognitive Verarbeitung und eine Sprachstörung bewertet."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig Sprachcomputer, Symboltafeln oder eine Kommunikations-App auf dem Tablet? -> unbeeinträchtigt."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Teilt alle Bedürfnisse verbal oder mit Hilfsmitteln klar mit."],
  [1, "1: Fähigkeit größtenteils vorhanden: Braucht viel Zeit oder Umschreibungen, um sich verständlich zu machen."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Bedürfnisse sind nur noch durch mühsame Interpretation von Mimik und Gestik erkennbar."],
  [1, "3: Fähigkeit nicht vorhanden: Keinerlei Mitteilung von Bedürfnissen mehr möglich."]
  ]
 },
 "4.2.10": {
  titel: "Verstehen von Aufforderungen",
  zeilen: [
  [0, "Laien-Check: Versteht die Person Aufforderungen im Alltag, wie „Komm bitte zum Essen“ oder „Zieh dir bitte die Jacke an“, “Lass uns etwas anziehen und spazieren gehen”? WICHTIG: Hier werden die kognitive Verarbeitung und die Schwerhörigkeit bewertet."],
  [0, "Hilfsmittel-Regel: Ein Hörgerät oder ein Sprachverstärker zur Kompensation der Akustik ist hier ausdrücklich zulässig und führt bei Erfolg zu „unbeeinträchtigt“."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Versteht Aufforderungen sofort und setzt sie (körperliche Fähigkeit vorausgesetzt) um."],
  [1, "1: Fähigkeit größtenteils vorhanden: Sie braucht gelegentlich eine Wiederholung oder direkte Ansprache oder in einfacher Sprache. Auch das laute direkte Ansprechen und Wiederholen bei einer nicht kompensierten Schwerhörigkeit ist hier zu werten."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Versteht einfache Aufforderungen nur noch, wenn sie kleinschrittig erklärt und wiederholt werden und es sind Gesten der Pflegeperson notwendig."],
  [1, "3: Fähigkeit nicht vorhanden: Versteht den inhaltlichen Sinn von Aufforderungen gar nicht mehr."]
  ]
 },
 "4.2.11": {
  titel: "Beteiligen an einem Gespräch",
  zeilen: [
  [0, "Laien-Check: Kann die Person einem Gespräch in einer kleinen Runde folgen, Fragen beantworten und das Thema halten, ohne wirr abzuschweifen?"],
  [0, "Hilfsmittel-Regel: Ein Hörgerät zur akustischen Teilnahme oder ein Sprachcomputer ist zulässig und zählt als selbständig."],
  [0, "Abstufungen:"],
  [1, "0: Fähigkeit vorhanden bzw. unbeeinträchtigt: Die Person beteiligt sich problemlos an Gesprächen."],
  [1, "1: Fähigkeit größtenteils vorhanden: Die Person hat Wortfindungsstörungen oder verliert gelegentlich den roten Faden. Gruppengespräche sind kaum bis nicht mehr möglich. Sie muss direkt angesprochen werden oder Inhalte müssen wiederholt werden."],
  [1, "2: Fähigkeit in geringem Maße vorhanden: Die Person antwortet nur noch auf direkte Fragen mit einzelnen Worten. Sie folgt dem Gesprächsfluss nicht. Sie ist schnell ablenkbar durch Außenreize."],
  [1, "3: Fähigkeit nicht vorhanden: Keine aktive oder passive Beteiligung an Gesprächen mehr möglich."]
  ]
 },
 "4.3.1": {
  titel: "Motorisch geprägte Verhaltensauffälligkeiten",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie? Ist der Schlaf-Wach-Rhythmus gestört? Zeigt die Person einen extremen Bewegungsdrang? Läuft sie ziellos und desorientiert in der Wohnung umher und muss z.B. beim Essen immer wieder an den Tisch zurück begleitet werden? Oder versucht sie permanent, das Haus zu verlassen („Hinlauftendenz“)?"],
  [0, "Hilfsmittel-Regel: Zählen hier nicht direkt. Es geht um die notwendige Beaufsichtigung oder das Beruhigen durch dich."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten (weniger als einmal pro Woche)."],
  [1, "1: selten (1-3x in zwei Wochen nachts eingreifen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: Täglich (erfordert ständige Aufmerksamkeit, um Gefahren zu vermeiden)."]
  ]
 },
 "4.3.2": {
  titel: "Nächtliche Unruhe",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie? Ist der Schlaf-Wach-Rhythmus gestört? Geistert die Person nachts ziellos und/oder desorientiert durch das Haus und muss in das Bett zurück begleitet werden? Oder ruft die Person laut und muss umfassend beruhigt werden? Somatische Beschwerden aufgrund von Schmerzen oder z.B. eines Restless Legs Syndroms sind hier nicht zu berücksichtigen."],
  [0, "Hilfsmittel-Regel: Beruhigungstees oder Medikamente zählen hier nicht als Hilfsmittel im Sinne der Selbständigkeit; entscheidend ist, ob du nachts aufstehen und intervenieren musst."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: die Person schläft meist durch, nächtliche Störungen sind die Ausnahme."],
  [1, "1: selten (1-3x in zwei Wochen nachts eingreifen)."],
  [1, "3: häufig (Mehrmals wöchentlich nachts Unterbrechung)."],
  [1, "5: Jede Nacht: ein Durchschlafen für dich als Pflegeperson ist kaum möglich."]
  ]
 },
 "4.3.3": {
  titel: "Selbstschädigendes und autoaggressives Verhalten",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie? Ist der Schlaf-Wach-Rhythmus gestört? Fügt sich die Person selbst Schaden zu? Z. B. durch Kratzen, Schlagen gegen den eigenen Kopf, Haareausreißen oder die Einnahme von schädlichen Substanzen?"],
  [0, "Hilfsmittel-Regel: Schutzhandschuhe oder Helme sind zwar Hilfsmittel, aber die personelle Überwachung zur Vermeidung der Selbstverletzung ist hier entscheidend."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Kein solches Verhalten bekannt."],
  [1, "1: selten (1-3x in zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: Täglich: die Person muss fast lückenlos beobachtet werden."]
  ]
 },
 "4.3.4": {
  titel: "Beschädigen von Gegenständen",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Geht die Person zerstörerisch mit Inventar um? Reißt sie Tapeten ab, wirft Geschirr umher oder zerreißt sie Kleidung und Bettwäsche?"],
  [1, "Beschädigung von Gegenständen, wenn sie aus der Hand der Person fallen oder sie mit dem Rollator aufgrund einer Gangunsicherheit gegen Möbel stößt, sind hier nicht gemeint."],
  [0, "Hilfsmittel-Regel: Bewertet wird dein Aufwand, die Zerstörung zu verhindern oder die Folgen zu beseitigen."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Die Person geht sorgsam mit Eigentum um."],
  [1, "1: selten (1-3x in zwei Wochen)"],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: Täglich: Die Person zerstört unkontrolliert Dinge in ihrer unmittelbaren Umgebung."]
  ]
 },
 "4.3.5": {
  titel: "Physisch aggressives Verhalten gegenüber anderen Personen",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Wird die Person gegenüber dir oder anderen in Überforderungssituationen handgreiflich und kann sie dies nicht bewusst steuern oder vermeiden? Z.B. Schlagen, Treten, Kneifen, Haareziehen oder das Bewerfen mit Gegenständen?"],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Friedlicher Umgang."],
  [1, "1: Selten (ein- bis mehrmals wöchentlich)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: täglich: Ein gefahrloser Umgang ist nur unter höchster Vorsicht möglich."]
  ]
 },
 "4.3.6": {
  titel: "Verbale Aggression",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Wird die Person laut oder beleidigend? Beschimpft sie dich, schreit sie herum oder äußert sie massive Drohungen?"],
  [1, "Können diese Impulse nicht selbständig gesteuert werden und ist eine umfassende und deeskalierende Kommunikation sowie Beruhigung durch dich notwendig?"],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Freundlicher Umgangston."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: täglich: verbale Ausfälle an jedem Tag."]
  ]
 },
 "4.3.7": {
  titel: "Andere pflegerelevante vokale Auffälligkeiten",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Gibt die Person ständig Geräusche von sich, die nicht der Kommunikation dienen? Z. B. lautes Selbstgespräch, ständiges Jammern, Rufen nach Verstorbenen oder monotones Singen/Brummen?"],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Unauffällig."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: täglich: Nahezu dauerhaftes Lautgeben, das die Umgebung massiv belastet."]
  ]
 },
 "4.3.8": {
  titel: "Abwehr von pflegerischen Maßnahmen",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Wehrt sich die Person gegen deine Hilfe? Schiebt sie den Waschlappen weg, kneift die Lippen bei Medikamenten zusammen oder sperrt sie sich gegen das Anziehen oder jegliche notwendige pflegerelevante Unterstützung?"],
  [0, "Wichtig: Es geht um die psychische Abwehr, nicht um körperliche Steifheit oder das bewusste Vermeiden von möglicherweise auftretenden Schmerzen."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Kooperativ."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: täglich: Jede Maßnahme (Waschen, Essen, Medikation) ist ein zeitaufwendiger „Kampf“."]
  ]
 },
 "4.3.9": {
  titel: "Wahnvorstellungen und Halluzinationen",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Sieht oder hört die Person Dinge, die nicht da sind? Glaubt sie, dass Fremde im Haus sind oder dass das Essen vergiftet ist?"],
  [1, "Kann die Person diese Halluzination nicht bewusst kompensieren und musst du sie umfassend und aufwändig beruhigen?"],
  [0, "Abstufungen:"],
  [1, "0: nie oder sehr selten: Realitätsnah."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: täglich: Die Person lebt fast nur noch in ihrer eigenen (bedrohlichen) Realität."]
  ]
 },
 "4.3.10": {
  titel: "Ängste",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie? Auch massive Luftnot, aus denen Todesängste entstehen, z.B. aufgrund einer schwerwiegenden Herzerkrankung oder Lungenerkrankung, sind hier zu berücksichtigen."],
  [1, "Leidet die Person unter massiven Ängsten? Oder treten in der gewohnten Umgebung Panikattacken ohne erkennbaren Grund auf?"],
  [0, "Wichtig: Allgemeine Ängste vor der Zukunft (z.B. wie geht es mit der Erkrankung weiter) sind hier nicht zu berücksichtigen. Auch die Sturzangst oder die Angst vor dem Verlassen der Wohnung ist hier nicht gemeint. Die reine Angst vor dem Alleinesein ist hier auch nicht zu berücksichtigen, auch wenn die Anwesenheit einer Person notwendig ist. Es geht hier um die umfassende personelle Unterstützung/ Beruhigung bei Todesängsten und ggf. der Gabe von Bedarfsmedikation."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Keine auffälligen Ängste, oder ggf. allgemeine Ängste."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)."],
  [1, "5: täglich: Nahezu täglich auftretende, ausgeprägte Panik mit auftretenden Todesängste."]
  ]
 },
 "4.3.11": {
  titel: "Antriebslosigkeit bei depressiver Stimmungslage",
  zeilen: [
  [0, "Laien-Check: Ist eine Depression fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie, ohne erkennbare Besserung der Beschwerden?"],
  [1, "Wirkt die Person Antriebslos? (z.B. isst/ trinkt sie nicht? sitzt sie regelmäßig nur im Sessel und reagiert nicht auf direkte Ansprache? Führt sie Alltagshandlungen auch nach mehrfacher Aufforderung nicht aus, z.B. Körperpflege oder Beschäftigung?)"],
  [0, "Wichtig: Ein gedrückte Stimmung oder Niedergeschlagenheit ist keine Antriebslosigkeit. Auch das reine Ablehnen von z.B. Spaziergängen oder Besuchen bei Angehörigen/ Freunden ist nicht ausreichend für eine Wertung. Es geht um den Antrieb zur Kommunikation, der Alltagsbewältigung, der Körperpflege, etc."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten: Grundsätzlich motivierbar."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)"],
  [1, "5: Täglich: Völlige Apathie und keine Motivation von außen erreicht die Person mehr."]
  ]
 },
 "4.3.12": {
  titel: "Sozial inadäquate Verhaltensweisen",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Distanzloses Verhalten (z. B. Fremde wie enge Bekannte behandeln)."],
  [1, "Auffälliges, ununterbrochenes Einfordern von Aufmerksamkeit."],
  [1, "Sich vor anderen in unpassenden Situationen entkleiden."],
  [1, "Unangemessenes Greifen nach Personen."],
  [1, "Unangemessene körperliche oder verbale sexuelle Annäherungsversuche."],
  [0, "Abstufungen:"],
  [1, "0: nie oder sehr selten: Sozial angepasst."],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)"],
  [1, "5: Täglich: Massivste Störungen (z. B. permanentes Entkleiden)."]
  ]
 },
 "4.3.13": {
  titel: "Sonstige pflegerelevante psychische Problemlagen",
  zeilen: [
  [0, "Laien-Check: Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert und erfolgt bereits seit mindestens 6 Monaten eine Behandlung oder Therapie?"],
  [1, "Planlose Aktivitäten: Zielloses, fahriges Hantieren. z.B. das ständige, völlig sinnfreie Ausräumen und Umräumen von Schränken oder Schubladen."],
  [1, "Stereotypien: z. B. monotones Wippen mit dem Oberkörper, rhythmisches Händeklatschen oder Klopfen auf den Tisch."],
  [1, "Nesteln: Ständiges, nervöses Nesteln an der eigenen Kleidung oder an Gegenständen."],
  [1, "Verstecken oder Horten: Z.B. Abfall, aber auch gehortete Lebensmittel oder Dinge des täglichen Bedarfs an unüblichen Orten."],
  [1, "Umgang mit Ausscheidungen: Kotschmieren oder das bewusste Urinieren in die Wohnung."],
  [0, "Abstufungen:"],
  [1, "0: Nie oder sehr selten"],
  [1, "1: Selten (Ein- bis dreimal innerhalb von zwei Wochen)."],
  [1, "3: häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)"],
  [1, "5: Täglich: Massivste Störungen."]
  ]
 },
 "4.4.1": {
  titel: "Waschen des vorderen Oberkörpers",
  zeilen: [
  [0, "Laien-Check: Kann sich die Person Gesicht, Hände, Arme, Achselhöhlen sowie den vorderen Hals- und Brustbereich selbständig waschen und abtrocknen? Berücksichtigen Sie auch, ob die Person kognitiv in der Lage ist, die Notwendigkeit des Waschens zu erkennen oder die Handlung ohne Aufforderung zu beginnen."],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achte auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel wie einen langen Waschstock oder einen speziellen Waschhandschuh und schafft sie es damit ganz allein? -> selbständig (0 Punkte). (personelle Hilfe beim Vorbereiten oder punktuelle Hilfe zählt nicht hierzu)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Schafft die Handlung körperlich und beginnt sie auch eigenständig ohne jegliche Erinnerung oder Aufforderung."],
  [1, "1: Überwiegend selbständig: Benötigt punktuelle Hilfe (z. B. Waschen unter einer Achsel) oder muss kognitiv zur Handlung aufgefordert werden, führt sie dann aber weitgehend allein aus."],
  [1, "2: Überwiegend unselbständig: Schafft nur geringe Teile (z. B. nur das Gesicht) selbständig oder benötigt während des gesamten Vorgangs ständige kleinschrittige Anleitung und Begleitung."],
  [1, "3: Unselbständig: Die Handlung muss fast vollständig durch die Pflegeperson übernommen werden."]
  ]
 },
 "4.4.2": {
  titel: "Körperpflege im Bereich des Kopfes",
  zeilen: [
  [0, "Laien-Check: Kann die Person die Haare kämmen, die Zähne putzen (bzw. Prothesenreinigung) und sich rasieren? Erkennt die Person kognitiv, dass diese Pflege nötig ist, oder muss sie regelmäßig daran erinnert werden?"],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achten Sie auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig Hilfsmittel wie einen Langgriffkamm, eine elektrische Zahnbürste oder einen speziellen Rheuma-Rasierer? -> selbständig."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Die Person erledigt alle Tätigkeiten (Kämmen, Zähne, Rasieren) ohne Hilfe oder kognitive Aufforderung."],
  [1, "1: Überwiegend selbständig: Sie benötigt Hilfe bei Vorbereitungen (z. B. Zahnpasta auf Bürste auftragen) oder sie muss zum Beginn der Pflege mehrfach aufgefordert werden."],
  [1, "2: Überwiegend unselbständig: Leistet nur geringe Anteile, da sie beim Heben der Arme lediglich die Ohren erreicht, die Feinmotorik und Handkraft sind massiv eingeschränkt oder sie benötigt ständige kleinschrittige Anleitung (z. B. beginnt mit dem Kämmen, bricht dann aber ab)."],
  [1, "3: Unselbständig: Vollständige Übernahme der Kopfpflege durch die Pflegeperson nötig."]
  ]
 },
 "4.4.3": {
  titel: "Waschen des Intimbereichs",
  zeilen: [
  [0, "Laien-Check: Kann die Person den Intimbereich (vorderer Intimbereich und Gesäß) selbständig reinigen und abtrocknen? Berücksichtigen Sie auch die kognitive Fähigkeit, die Handlung hygienisch korrekt durchzuführen. Ist die Kleidung regelmäßig mit Stuhlgang beschmutzt?"],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achten Sie auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel wie eine Intimwaschhilfe oder einen angepassten Schwamm eigenständig? -> selbständig."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Keine personelle Hilfe oder kognitive Aufforderung nötig."],
  [1, "1: Überwiegend selbständig: Die Person benötigt beim Waschen des Gesäßes personelle Unterstützung (z.B. wird beim Greifen zum Gesäß lediglich der hintere Beckenkamm erreicht) oder es ist aufgrund der kognitiven Einschränkungen mehrfache Aufforderung zur Durchführung der Handlungen notwendig."],
  [1, "2: Überwiegend unselbständig: Schafft nur geringe Anteile selbst (z. B. nur Teilbereiche des vorderen Intimbereichs, lediglich die Leisten), während der Rest übernommen werden muss. Oder es ist kleinschrittige Anleitung zu jeder Handlung notwendig (z.B. vom nass machen des Waschlappens bis hin zum abtrocken)."],
  [1, "3: Unselbständig: Die Reinigung des Intimbereichs muss vollständig übernommen werden."]
  ]
 },
 "4.4.4": {
  titel: "Duschen und Baden einschließlich Haarewaschen",
  zeilen: [
  [0, "Laien-Check: Hier wird der gesamte Vorgang bewertet: Ein- und Ausstieg in Dusche/Wanne, das Waschen des ganzen Körpers und der Haare sowie das Abtrocknen. Wichtig: Ist die Person kognitiv in der Lage, die Wassertemperatur sicher zu wählen und die Sturzgefahr einzuschätzen und führt sie die Abläufe sicher und selbständig durch?"],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achten Sie auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig einen Duschstuhl, Haltegriffe oder einen Badewannenlifter? -> selbständig."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Sie führt den kompletten Vorgang sicher und ohne jede Anleitung/Hilfe allein."],
  [1, "1: Überwiegend selbständig: Die Person benötigt Hilfe beim Ein-/Ausstieg, beim Haarewaschen oder ständige Anwesenheit aus Sicherheitsgründen oder benötigt sie einzelne Aufforderungen zur Durchführung/ Vollendung einzelner Abläufe (wegen kognitiver Unsicherheit)."],
  [1, "2: Überwiegend unselbständig: Sie kann geringe Teile selbst leisten (z. B. nur den vorderen Oberkörper/ vorderen Intimbereich waschen). Oder sie benötigt kleinschrittige Anleitung zu jedem einzelnen Handlungsablauf."],
  [1, "3: Unselbständig: Vollständige Übernahme des Duschens/Badens nötig."]
  ]
 },
 "4.4.5": {
  titel: "An- und Auskleiden des Oberkörpers",
  zeilen: [
  [0, "Laien-Check: Kann die Person Kleidungsstücke (Unterhemd, T-Shirt, Bluse, Jacke etc. inkl. Verschlüsse) an- und ausziehen? Berücksichtigen Sie kognitive Defizite wie das Anziehen in falscher Reihenfolge oder das Vergessen von Kleidungsstücken. Ist lediglich das reine Bereitlegen von Kleidungsstücken notwendig, dann ist hier selbständig zu werten (hauswirtschaftliche Tätigkeit)."],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achten Sie auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel wie einen Knöpfhaken oder Reißverschluss-Hilfen komplett eigenständig? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Die Person kann sich selbständig an- und auskleiden inkl. Verschlüssen ohne personelle Hilfe oder kognitive Anleitung."],
  [1, "1: Überwiegend selbständig: Benötigt Hilfe bei schwierigen Verschlüssen oder beim Richten im Rückenbereich. Oder sie benötigt einfache, ggf. mehrfache Aufforderungen zum Beginn und/ oder zur Vollendung von Handlungsabläufen."],
  [1, "2: Überwiegend unselbständig: Die Person kann lediglich die Arme in ein Kleidungsstück führen und der Rest wird durch dich übernommen. Oder es ist kleinschrittige Anleitung und ständige Begleitung notwendig."],
  [1, "3: Unselbständig: Vollständige Übernahme durch die Pflegeperson nötig."]
  ]
 },
 "4.4.6": {
  titel: "An- und Auskleiden des Unterkörpers",
  zeilen: [
  [0, "Laien-Check: Kann die Person Kleidungsstücke (Unterwäsche, Hosen, Röcke, Strümpfe und Schuhe inkl. Verschlüsse) an- und ausziehen? Berücksichtigen Sie kognitive Defizite wie das Anziehen in falscher Reihenfolge (z. B. Unterhose über die Hose ziehen) oder das Vergessen von Kleidungsstücken. Ist lediglich das reine Bereitlegen von Kleidungsstücken notwendig, dann ist hier selbständig zu werten (Hauswirtschaftliche Tätigkeit)."],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achten Sie auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel wie eine Strumpfanziehhilfe, einen Schuhanzieher oder einen Schuhöffner komplett eigenständig? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Die Person kann sich selbständig am Unterkörper an- und auskleiden inkl. Verschlüssen (z. B. Hosenknopf, Schnürsenkel) ohne personelle Hilfe oder kognitive Anleitung."],
  [1, "1: Überwiegend selbständig: Benötigt Hilfe bei schwierigen Verschlüssen oder beim Anziehen von Socken/Schuhen. Oder sie benötigt einfache, ggf. mehrfache Aufforderungen zum Beginn und/ oder zur Vollendung von Handlungsabläufen."],
  [1, "2: Überwiegend unselbständig: Die Person kann lediglich geringe Anteile selbst leisten (z. B. führt die Beine in die Hosenbeine oder zieht die Hose von den Knien bis zur Taille hoch) und der Rest wird durch die Pflegeperson übernommen. Oder es ist kleinschrittige Anleitung und ständige Begleitung notwendig."],
  [1, "3: Unselbständig: Vollständige Übernahme durch die Pflegeperson nötig."]
  ]
 },
 "4.4.7": {
  titel: "Mundgerechtes Zubereiten der Nahrung",
  zeilen: [
  [0, "Laien-Check: Kann die Person Brot/Fleisch schneiden, Obst schälen, Flaschen öffnen oder Getränke eingießen? Erkennt die Person kognitiv die Notwendigkeit der Vorbereitung (z. B. dass ein Deckel erst entfernt werden muss)? Das reine Decken des Tisches, oder Bereitstellen der Utensilien, ist mit selbständig zu werten (Hauswirtschaftliche Tätigkeit)"],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen, achten Sie auf eine Wertung unter Modulpunkt 4.2.5."],
  [0, "Hilfsmittel-Regel: Nutzt die Person einen Einhand-Flaschenöffner, eine Brotschneidehilfe oder spezielles Rheumabesteck komplett eigenständig? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Bereitet alles ohne personelle Hilfe mundgerecht vor."],
  [1, "1: Überwiegend selbständig: Benötigt punktuelle Hilfe (z. B. bei sehr festen Verschlüssen, oder kleinschneiden von festen Speisen) oder einfache kognitive Aufforderungen zur Zubereitung."],
  [1, "2: Überwiegend unselbständig: Die Nahrung muss fast vollständig durch eine Person vorbereitet werden (z. B. fertig geschmierte und geschnittene Brote, Getränke müssen eingegossen werden, da sie sonst von der Person daneben gegossen werden, auch bei ausgeprägten Einschränkungen der Sehfähigkeit zu berücksichtigen). Oder es ist eine ständige kleinschrittige Anleitung notwendig."],
  [1, "3: Unselbständig: Kann sich an der Zubereitung gar nicht beteiligen, die Tätigkeit muss vollständig übernommen werden. (z.B. auch das Belegen von Broten und das mundgerechte Kleinschneiden)."]
  ]
 },
 "4.4.8": {
  titel: "Essen",
  zeilen: [
  [0, "Laien-Check: Kann die Person die zubereitete Nahrung zum Mund führen, kauen und schlucken? Berücksichtigen Sie, ob sie kognitiv erkennt, dass sie essen muss, oder ob sie während des Essens ständig motiviert oder erinnert werden muss (Vergessen der Handlung)."],
  [0, "Wichtig: Besteht eine diagnostizierte Schluckstörung und müssen sie die Person ständig beim Essen überwachen und es besteht eine ständige und unmittelbare Notwendigkeit einer Eingreifbereitschaft, dann ist dies hier zu werten (überwiegend unselbständig)."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Warmhaltegeschirr, Teller mit erhöhtem Rand oder spezielles Rheumabesteck eigenständig? -> selbständig (0 Punkte)."],
  [0, "Abstufungen (Wichtung 3-fach):"],
  [1, "0: Selbständig: Isst ohne personelle Hilfe oder kognitive Motivation/Aufforderung."],
  [1, "3: Überwiegend selbständig: Benötigt punktuelle personelle Hilfe (z. B. Besteck führen) oder Aufforderungen zum Beginne/ Weiteressen (Kognition)."],
  [1, "6: Überwiegend unselbständig: Muss massiv zur Nahrungsaufnahme motiviert werden oder braucht ständige Aufsicht wegen Aspirationsgefahr (Verschlucken). Oder das Essen muss größtenteils gereicht werden."],
  [1, "9: Unselbständig: Die Nahrung muss (fast) vollständig durch eine Pflegeperson gereicht werden. Oder die Person kann nicht schlucken."]
  ]
 },
 "4.4.9": {
  titel: "Trinken",
  zeilen: [
  [0, "Laien-Check: Kann die Person bereitstehende Getränke aufnehmen und trinken? Erkennt sie kognitiv das Durstgefühl oder muss sie während des Trinkens ständig motiviert oder erinnert werden (Vergessen der Handlung)?"],
  [0, "Wichtig: Besteht eine diagnostizierte Schluckstörung und müssen Sie die Person ständig beim Trinken überwachen und es besteht eine ständige und unmittelbare Notwendigkeit einer Eingreifbereitschaft, dann ist dies hier zu werten (überwiegend unselbständig)."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig Schnabelbecher, Trinkhalme oder einen Becher mit Nasenausschnitt? -> selbständig (0 Punkte)."],
  [0, "Abstufungen (Wichtung 2-fach):"],
  [1, "0: Selbständig: Trinkt ohne personelle Hilfe oder Motivation/Aufforderung."],
  [1, "2: Überwiegend selbständig: Benötigt punktuelle personelle Hilfe (z. B. Glas in den direkten Aktionsradius der Person stellen) oder Aufforderungen zum Beginn/ Weitertrinken (Kognition)."],
  [1, "4: Überwiegend unselbständig: Die Person muss zu fast jedem Schluck motiviert werden oder das Gefäß muss ihr in die Hand gegeben werden oder braucht ständige Aufsicht wegen Aspirationsgefahr (Verschlucken). Oder das Getränk muss größtenteils gereicht werden."],
  [1, "6: Unselbständig: Die Flüssigkeit muss (fast) vollständig durch eine Pflegeperson gereicht werden. Oder die Person kann nicht schlucken."]
  ]
 },
 "4.4.10": {
  titel: "Benutzen einer Toilette oder eines Toilettenstuhls",
  zeilen: [
  [0, "Laien-Check: Kann die Person zur Toilette gehen, sich hinsetzen, die Intimhygiene durchführen und Kleidung richten? Berücksichtigen Sie kognitive Aspekte wie das rechtzeitige Erkennen des Harndrangs oder das Wissen um die korrekte Handlungsabfolge (z. B. Hosenknopf öffnen vor dem Hinsetzen)."],
  [0, "Wichtig: Eine Wertung im Modul 4.1.3/ 4.1.4 ist hier zu berücksichtigen."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbständig eine Toilettensitzerhöhung oder Stützgriffe, Rollator, Rollstuhl, Aufstehhilfe und bewältigt den Vorgang damit ohne personelle Unterstützung? -> selbständig (0 Punkte)."],
  [0, "Abstufungen (Wichtung 2-fach):"],
  [1, "0: Selbständig: Erledigt den gesamten Vorgang ohne personelle Hilfe oder kognitive Defizite."],
  [1, "2: Überwiegend selbständig: Benötigt Begleitung zur Sicherheit oder punktuelle Unterstützung beim Umsetzen (z.B. Absicherung) oder punktuelle Hilfe beim Richten der Kleidung (z.B. Hosenknopf schließen) oder punktuelle personelle Hilfe bei der Intimhygiene nach dem Stuhlgang oder kognitive Erinnerungen/Aufforderungen zum Toilettengang."],
  [1, "4: Überwiegend unselbständig: Muss beim Hinsetzen/Aufstehen massiv personell gestützt werden oder schafft nur geringe Anteile der Intimhygiene selbst. Oder es ist eine ständige kleinschrittige Anleitung notwendig."],
  [1, "6: Unselbständig: Die Person kann sich am Vorgang nicht oder nur minimal beteiligen; die Tätigkeit muss vollständig übernommen werden."]
  ]
 },
 "4.4.11": {
  titel: "Bewältigen der Folgen einer Harninkontinenz und Umgang mit Dauerkatheter und Urostoma",
  zeilen: [
  [0, "Laien-Check: Kann die Person die Folgen einer Harninkontinenz bewältigen (z. B. Wechseln von Einlagen/Pants) oder eigenständig mit einem Katheter/Urostoma umgehen?"],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen. Und achten Sie auf eine Wertung unter Modulpunkt 4.2.5. Auf die Berücksichtigung von Feinmotorikstörungen oder eine reduzierte Handkraft und Beweglichkeit beim Schürzengriff."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Inkontinenzmaterialien oder Katheterbeutel komplett eigenständig? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Nutzt/wechselt Materialien ohne personelle Hilfe oder kognitive Erinnerung."],
  [1, "1: Überwiegend selbständig: Benötigt die Bereitstellung der Materialien oder kognitive Erinnerungen zum regelmäßigen Wechsel."],
  [1, "2: Überwiegend unselbständig: Schafft nur geringe Teile selbst (z. B. Einlage in Slip legen), braucht aber personelle Hilfe bei der Reinigung. Oder benötigt ständige Anleitung beim Materialwechsel."],
  [1, "3: Unselbständig: Beteiligung nicht möglich; vollständige Übernahme durch die Pflegeperson nötig."]
  ]
 },
 "4.4.12": {
  titel: "Bewältigen der Folgen einer Stuhlinkontinenz und Umgang mit Stoma",
  zeilen: [
  [0, "Laien-Check: Kann die Person Vorlagen bei Stuhlinkontinenz wechseln oder eigenständig mit einem Stoma umgehen?"],
  [0, "Wichtig: Bestehen kognitive Einschränkungen bei der Durchführung von Alltagshandlungen wie diesen. Und achten Sie auf eine Wertung unter Modulpunkt 4.2.5. Auf die Berücksichtigung von Feinmotorikstörungen oder eine reduzierte Handkraft und Beweglichkeit beim Schürzengriff."],
  [0, "Hilfsmittel-Regel: Führt die Reinigung und den Wechsel der Materialien (z. B. Stomabeutel) komplett eigenständig durch? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Volle Eigenständigkeit beim Materialwechsel ohne personelle Hilfe oder kognitive Aufforderung."],
  [1, "1: Überwiegend selbständig: Benötigt punktuelle personelle Hilfe bei der Vorbereitung (Bereitlegen des Inkontinenzmaterials) oder kognitive Erinnerung zur Durchführung."],
  [1, "2: Überwiegend unselbständig: Benötigt die Person personelle umfassende Hilfe beim Wechsel des Inkontinenzmaterials/ Stomabeutels. Oder benötigt sie kleinschrittige Anleitung."],
  [1, "3: Unselbständig: Beteiligung nicht möglich, vollständige Übernahme durch die Pflegeperson nötig."]
  ]
 },
 "4.4.13": {
  titel: "Ernährung parenteral oder über Sonde",
  zeilen: [
  [0, "Laien-Check: Handelt es sich um die Ernährung über einen parenteralen Zugang (zum Beispiel einen Port) oder über einen Zugang in Magen oder Dünndarm (PEG/PEJ)?"],
  [0, "Wichtig: Es ist zu beurteilen, wie Häufig eine Gabe erfolgt und ob die Ernährung ausschließlich oder zusätzlich zur oralen Ernährung erfolgt. Eine Wertung ist auch davon abhängig, ob die Ernährung selbständig erfolgt oder durch Sie."],
  [0, "Hilfsmittel-Regel: Führt die Person die Versorgung (z. B. Vorbereitung, Anhängen der Nahrung, Spülen des Zugangs) ohne Fremdhilfe komplett eigenständig durch? -> selbständig (0 Punkte)."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig oder nicht täglich: Die Person führt die Versorgung ohne Fremdhilfe durch ODER sie erhält zusätzlich zur oralen Nahrungsaufnahme Nahrung oder Flüssigkeit parenteral oder über Sonde, aber nur gelegentlich oder vorübergehend (nicht auf Dauer)."],
  [1, "6: Täglich, zusätzlich zu oraler Ernährung: Die Person erhält in der Regel täglich Nahrung oder Flüssigkeit parenteral oder über Sonde und täglich oral Nahrung. Sie wird zum Teil, aber nicht ausreichend über die orale Nahrungsaufnahme ernährt und benötigt zur Nahrungsergänzung beziehungsweise zur Vermeidung von Mangelernährung täglich Sondenkost oder Flüssigkeit."],
  [1, "3: Ausschließlich oder nahezu ausschließlich: Die Person erhält ausschließlich oder nahezu ausschließlich Nahrung und Flüssigkeit parenteral oder über Sonde. Eine orale Gabe erfolgt nicht oder nur in geringem Maße zur Förderung der Sinneswahrnehmung."]
  ]
 },
 "4.5.1": {
  titel: "Medikation",
  zeilen: [
  [0, "Laien-Check: Hilfe bei Tabletten, Tropfen, Dosieraerosolen, Zäpfchen, Pflastern oder Augentropfen. Gaben zu unterschiedlichen Zeiten (z. B. nüchtern und nach dem Frühstück) zählen separat."],
  [0, "Hilfsmittel-Regel: Nutzt die Person selbstständig Wecker, Handy-Erinnerungen, Medikamenten-Apps, Wochendispenser mit Beschriftung oder einen Tablettenteiler und nimmt die Medikamente damit ohne fremde Hilfe ein? -> Dann 0 (selbstständig) eintragen."],
  [0, "Wichtig: Das Richten der Tabletten zählt nur 1-mal wöchentlich. Das Bereitstellen am Morgen zählt 1-mal täglich. Eine Erinnerung zählt nur bei kognitiven Einschränkungen. Nicht verordnete Medikamente, Vitaminpräparate, frei verkäufliche Medikamente oder Bedarfsmedikation (z. B. Einnahme bei Schmerzen) werden hier nicht gewertet."]
  ]
 },
 "4.5.2": {
  titel: "Injektionen",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Verabreichen von Spritzen (z. B. Insulin, MTX oder Heparin). Jede einzelne Injektion zählt als eine Maßnahme (z. B. 4-mal täglich Insulin spritzen = 4 Maßnahmen täglich). Auch das Einstellen oder Kontrollieren einer Schmerzpumpe wird hier erfasst."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfen wie einen Insulin-Pen mit spezieller Dosierhilfe, eine Stechhilfe oder eine Injektionshilfe (z. B. für Menschen mit Sehbehinderung) und spritzt damit völlig allein? -> Dann 0 (selbstständig) eintragen."],
  [0, "Wichtig: Berücksichtigt werden nur ärztlich verordnete Injektionen, die dauerhaft (mindestens 6 Monate) notwendig sind. MTX-Injektionen zählen (meist 1-mal wöchentlich). Heparin-Spritzen zählen in der Regel NICHT, da sie meist nur vorübergehend (weniger als 6 Monate) gegeben werden. Vitamin-Spritzen (z. B. Vitamin D oder B12) werden in der Regel nicht berücksichtigt."]
  ]
 },
 "4.5.3": {
  titel: "Versorgung intravenöser Zugänge (z.B. Port)",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Umgang mit einem Port (venöser Zugang unter der Haut) oder anderen dauerhaften Venenkathetern."],
  [0, "Hilfsmittel-Regel: Kann die Person den Zugang mit speziellen Halterungen oder Einhand-Sets zur Fixierung selbstständig versorgen und spülen? -> Dann 0 (selbstständig) eintragen. Auch wenn mit einem Wecker oder Handy oder sonstigen Alarmen ein selbständiger Umgang erfolgt, ist hier selbständig zu werten."],
  [0, "Wichtig: Das Spülen des Zugangs, der Verbandwechsel an der Einstichstelle oder das Anschließen und Abnehmen von Infusionen (Medikamente) zählen jeweils als einzelne Maßnahmen. Eine künstliche Ernährung (PEG/Sonde) wird bereits in Modul 4 (4.4.13) bewertet und hier nicht doppelt gezählt."]
  ]
 },
 "4.5.4": {
  titel: "Absaugen und Sauerstoffgabe",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Absaugen der Atemwege (Sekret) oder bei der Gabe von zusätzlichem Sauerstoff (z. B. über eine Sauerstoffbrille oder Maske)."],
  [0, "Hilfsmittel-Regel: Bedient die Person das Absauggerät oder das Sauerstoffgerät (Anlegen der Maske/Brille) völlig allein? Nutzt sie eigenständig Wecker oder Alarme für die Anwendungszeiten? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Jedes Absaugen und jede Vorbereitung der Sauerstoffgabe am Menschen zählt als Maßnahme. Bei dauerhafter Sauerstoffgabe zählt das tägliche Handling (Anlegen, Abnehmen, Sitz kontrollieren) als 1-mal täglich. Nicht berücksichtigt werden Reinigungs- und Wartungsarbeiten an den Geräten (z. B. Gerät reinigen, Filterwechsel, Einstellen des Konzentrators) sowie das Nachfüllen von Wasser in den Befeuchter."]
  ]
 },
 "4.5.5": {
  titel: "Einreibungen oder Kälte und Wärmeanwendungen",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Auftragen von medizinischen Salben (z. B. bei Neurodermitis oder Psoriasis) oder bei ärztlich verordneten Einreibungen."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfen wie einen Rückeneincremer (Eincremehilfe), einen Salbenapplikator oder erfolgt die Erinnerung eigenständig per Handy-App/Wecker an die Anwendung? Wenn sie die Anwendung damit komplett allein schafft, ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Jede Anwendung (unabhängig von der Anzahl der Körperstellen) zählt als 1-malige Maßnahme. Wärme- oder Kälteanwendungen (z. B. Rotlicht, Eispackungen) müssen zwingend aufgrund einer Diagnose (z. B. Rheuma, chronische Schmerzzustände) ärztlich verordnet worden sein. Frei verkäufliche Salben (z. B. Voltaren-Schmerzgel, sonstige Schmerzsalben oder Fettsalben zur bloßen Hautpflege) werden hier nicht gewertet, auch wenn die Anwendung ärztlich verordnet oder empfohlen wurde. Ebenso wird das Vorbereiten (z. B. Wärmflasche füllen) hier nicht berücksichtigt."]
  ]
 },
 "4.5.6": {
  titel: "Messung und Deutung von Körperzuständen",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Messen und der Deutung von Körperzuständen wie z. B. Blutdruck, Puls, Blutzucker, Temperatur, Körpergewicht oder Flüssigkeitshaushalt, soweit diese auf ärztliche Anordnung erfolgen."],
  [0, "Hilfsmittel-Regel: Nutzt die Person sprechende Messgeräte, Sensoren (z. B. Blutzucker-Scanner am Arm) oder erfolgt die Erinnerung eigenständig per Handy-App, Smartwatch oder Wecker? Wenn die Person die Werte ohne Hilfe abliest und die notwendige Konsequenz daraus selbständig versteht, ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Jede einzelne Messung zählt als 1-malige Maßnahme. Es geht hierbei nicht nur um das bloße Messen, sondern auch um das Ziehen notwendiger Schlüsse (z. B. Festlegung der Insulindosis, Anpassung der Blutdruckmedikation bei Grenzwerten oder das Aufsuchen eines Arztes). Routinemessungen, die nicht gezielt auf eine bestehende Erkrankung ausgerichtet sind, werden hier nicht gewertet."]
  ]
 },
 "4.5.7": {
  titel: "Körpernahe Hilfsmittel",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Anlegen, Ausziehen oder der Anwendung von medizinischen Hilfsmitteln, die direkt am Körper getragen werden (z. B. Kompressionsstrümpfe ab Klasse 2, Prothesen, Hörgeräte, Korsetts, Schienen/Orthesen oder Brackets)."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel wie eine Strumpfanziehhilfe (Gestänge/Gleiter), Hörgeräte-Einsetzhilfen oder Anziehschlaufen und schafft den Vorgang damit völlig ohne personelle Hilfe? Erfolgt die Anwendung selbstständig durch die Nutzung eines Weckers, Handys oder sonstiger Alarme? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Jedes Anlegen und jedes Ablegen zählt als eine eigene, separate Maßnahme (z. B. morgens Kompressionsstrümpfe an + abends aus = 2 Maßnahmen täglich). Das Einsetzen von Zahnprothesen wird bereits in Modul 4 (4.4.2) bewertet und hier nicht gezählt. Das reine Reinigen einer Brille oder eines Hörgeräts sowie das Tragen von Brillen zählt ebenfalls nicht."]
  ]
 },
 "4.5.8": {
  titel: "Verbandswechsel und Wundversorgung",
  zeilen: [
  [0, "Laien-Check: Hilfe bei der Versorgung von chronischen Wunden (z. B. Dekubitus, Ulcus cruris) durch Reinigung, das Aufbringen von Wundsalben oder den Wechsel von Verbänden und Pflastern."],
  [0, "Hilfsmittel-Regel: Kann die Person den Verbandwechsel unter Zuhilfenahme eines Spiegels zur Selbstkontrolle oder mit vorkonfektionierten Verbandsets völlig allein durchführen? Erfolgt die Durchführung selbständig unter Nutzung einer Erinnerung via Handy-App oder Wecker? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Jede zeitlich zusammenhängende Wundversorgung (auch an unterschiedlichen Körperstellen zu einem Zeitpunkt) zählt als eine Maßnahme. Die Häufigkeit wird in der Tabelle entsprechend dem Intervall (z. B. 3-mal wöchentlich) erfasst. Akute Wunden werden hier nicht berücksichtigt, da in der Regel keine Dauerhaftigkeit von mindestens 6 Monaten besteht. Ausgenommen sind Wunden, die chronifiziert sind und bereits seit über 6 Monaten bestehen oder voraussichtlich über diesen Zeitraum hinaus bestehen werden."]
  ]
 },
 "4.5.9": {
  titel: "Versorgung mit Stoma",
  zeilen: [
  [0, "Laien-Check: Hilfe bei der Pflege künstlicher Körperöffnungen (Tracheostoma, PEG, suprapubischer Blasenkatheter, Urostoma, Colo- oder Ileostoma). Dies umfasst das Reinigen des Katheters, die Desinfektion der Einstichstelle (z. B. bei der PEG-Sonde) sowie notwendige Verbandwechsel oder den Wechsel der Basisplatte."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Hilfsmittel wie einen Spiegel zur Selbstkontrolle, Schablonen oder einteilige Systeme und führt die Pflege damit völlig allein durch? Erfolgt die Durchführung selbständig unter Nutzung von Weckern, Handy-Apps oder sonstigen Alarmen? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Bei Uro-, Colo- oder Ileostoma ist in der Regel nur der Wechsel der Basisplatte oder des einteiligen Systems zu bewerten. Nicht berücksichtigt wird das einfache Entleeren oder Wechseln des Stoma- oder Katheterbeutels, da diese Tätigkeiten zur Selbstversorgung gehören und unter Modul 4 (4.4.11 ff.) gewertet werden. Die Maßnahmen müssen dauerhaft (mindestens 6 Monate) erforderlich sein."]
  ]
 },
 "4.5.10": {
  titel: "Regelmäßige Einmalkatheterisierung und Nutzung von Abführ methoden",
  zeilen: [
  [0, "Laien-Check: Hilfe bei der Blasenentleerung mittels Einmalkatheter oder Unterstützung bei der Darmentleerung (z.B. Einläufe, Irrigation, digitale Ausräumung)."],
  [0, "Hilfsmittel-Regel: Nutzt die Person eigenständig Gleitmittel-Applikatoren, Selbstkatheterismus-Sets oder Irrigationspumpen (auch mit Timer/Alarm am Handy oder Wecker)? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Jede Durchführung eines Katheterismus oder einer Darmspülung zählt als einzelne Maßnahme. Nicht berücksichtigt wird das Entleeren eines Urinbeutels bei einem Dauerkatheter, da dies unter Modul 4 (4.4.11) fällt. Die Maßnahmen müssen für mindestens 6 Monate erforderlich sein."]
  ]
 },
 "4.5.11": {
  titel: "Therapiemaßnahmen in häuslicher Umgebung",
  zeilen: [
  [0, "Laien-Check: Unterstützung bei häuslichen Eigenübungsprogrammen, die aus einer Heilmitteltherapie (Physio-, Ergotherapie, Logopädie) heraus abgeleitet wurden. Dies umfasst auch die Pflege nach spezifischen Konzepten (z. B. Bobath oder Vojta bei Hirninfarkt), aufwändige Maßnahmen zur Sekretelimination sowie die Durchführung einer ambulanten Peritonealdialyse (CAPD)."],
  [0, "Hilfsmittel-Regel: Führt die Person die Übungen mithilfe von Übungspostern, Videoanleitungen (Tablet/PC), Therapie-Apps oder einem Übungs-Timer völlig ohne personelle Unterstützung oder Motivation durch? Erfolgt die Peritonealdialyse oder die Sekretelimination eigenständig durch Nutzung von Alarmen, Handy-Apps oder Weckern? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Es wird nur die Durchführung durch Sie als Pflegeperson im Alltag bewertet, nicht die Therapiezeit, in der ein Therapeut (Hausbesuch) anwesend ist. Zu den Maßnahmen zählen z. B. krankengymnastische Übungen, Atemübungen, logopädische Übungen sowie spezifische Lagerungen/Mobilisationen nach Bobath oder Vojta. Ebenfalls berücksichtigt werden aufwändige Maßnahmen zur Sekretelimination (z. B. Drainagelagerungen, Klopfmassagen – ausgenommen das Absaugen aus 4.5.4) sowie die Peritonealdialyse. Prophylaktische Maßnahmen und allgemeine aktivierende Pflege werden hier nicht berücksichtigt. Die Maßnahmen müssen ärztlich verordnet sein und dauerhaft (mindestens 6 Monate) erforderlich sein."]
  ]
 },
 "4.5.12": {
  titel: "Zeit- und technikintensive Maßnahmen in häuslicher Umgebung",
  zeilen: [
  [0, "Laien-Check: Hilfe oder ständige Überwachung bei speziellen Therapiemaßnahmen wie Hämodialyse (Blutwäsche) oder Beatmung, die im häuslichen Umfeld durchgeführt werden."],
  [0, "Hilfsmittel-Regel: Bedient die Person die Geräte völlig eigenständig, reagiert selbstständig auf Alarme (z. B. am Gerät oder via Handy-App) und überwacht die Maßnahme ohne fremde Hilfe? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Voraussetzung ist, dass während der Maßnahme eine ständige Überwachung durch eine Pflegeperson gewährleistet sein muss und sowohl ein zeit- als auch ein technikintensiver Aufwand besteht. Bei einer maschinellen invasiven Beatmung ist die Häufigkeit mit 1-mal täglich einzutragen. Die technische Messung von Vitalparametern (z. B. Puls, Sauerstoffsättigung) ist unter Punkt 4.5.6 zu berücksichtigen, auch wenn diese rund um die Uhr erfolgt. Die Maßnahme muss dauerhaft (mindestens 6 Monate) erforderlich sein."]
  ]
 },
 "4.5.13": {
  titel: "Arztbesuche",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Aufsuchen von Arztpraxen zur Untersuchung oder Behandlung."],
  [0, "Hilfsmittel-Regel: Nutzt die Person zur Anfahrt selbständig organisierte Fahrdienste, Spezial-Taxis oder einen Begleitservice (z. B. Buchung via App), sodass Ihre persönliche Hilfe nicht mehr nötig ist? Dann ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Es werden ausschließlich regelmäßig wiederkehrende Termine (Regeltermine) aufgrund dauerhafter Erkrankungen gewertet. Akut entstehende Termine bei plötzlichen Beschwerden (z. B. bei Schwindel, Infekten oder kurzfristigen Medikamentenanpassungen) werden hier nicht berücksichtigt. Bewertet wird die Unterstützung auf dem Weg (Wohnung – Fahrzeug – Praxis). Bauliche Gegebenheiten (Aufzüge/ebenerdige Zugänge) führen nicht zum Wegfall der Wertung, sofern personelle Hilfe (z. B. bei Treppen oder Unsicherheit) nötig ist. Bei kognitiven Defiziten zählt auch das Erinnern/Führen. Reine Terminvereinbarungen zählen nicht. Dauerhaftigkeit (6 Monate) ist Voraussetzung."]
  ]
 },
 "4.5.14": {
  titel: "Besuche anderer medizinischer oder therapeutischer Einrichtungen",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Aufsuchen von Therapeuten (Physio, Logo, Podologie etc.) oder anderen medizinischen Einrichtungen."],
  [0, "Hilfsmittel-Regel: Organisiert die Person den Weg und die Begleitung völlig eigenständig, ist hier „selbstständig“ (0) zu werten."],
  [0, "Wichtig: Es werden nur regelmäßig wiederkehrende Termine (Regeltermine) gewertet. Akut entstehende Termine aufgrund plötzlicher Beschwerden werden nicht berücksichtigt. Um die Regelmäßigkeit und Dauerhaftigkeit (6 Monate) eindeutig nachzuweisen, ist das Vorliegen einer Dauerverordnung oder von Terminbestätigungen des Therapeuten über die letzten 6 Monate zu empfehlen (jedoch nicht zwingend erforderlich). Entscheidend ist die Hilfe beim Transfer und der Begleitung. Bauliche Gegebenheiten (Aufzüge, Rampen) schließen eine Wertung nicht aus, wenn dennoch personelle Unterstützung (z. B. beim Treppensteigen oder zur Sicherheit) benötigt wird. Hausbesuche von Therapeuten sowie die reine Terminplanung zählen nicht."]
  ]
 },
 "4.5.15": {
  titel: "Zeitaufwendige Besuche bei therapeutischen Einrichtungen",
  zeilen: [
  [0, "Laien-Check: Hilfe beim Aufsuchen von spezialisierten Einrichtungen, wenn der gesamte Zeitaufwand (inklusive Fahrtzeiten und Behandlungsdauer) pro Termin mehr als drei Stunden beträgt (z. B. Dialyse, onkologische Behandlungen/Chemotherapie, zeitaufwendige Diagnostik oder Tagespflege)."],
  [0, "Hilfsmittel-Regel: Erfolgt die Organisation der Fahrt und die Bewältigung des Aufenthalts völlig selbstständig (z. B. durch spezialisierte Fahrdienste oder eigenständige Koordination via App), ist hier „selbständig“ (0) zu werten."],
  [0, "Wichtig: Entscheidend ist die Gesamtdauer von über drei Stunden pro Termin. Liegt der Aufwand darunter, ist der Besuch unter 4.5.13 oder 4.5.14 zu werten. Es werden nur regelmäßig wiederkehrende Termine (Regeltermine) aufgrund dauerhafter Erkrankungen berücksichtigt; Akutbehandlungen zählen nicht. Um die Dauerhaftigkeit (6 Monate) nachzuweisen, wird das Vorliegen einer Dauerverordnung oder von Terminbestätigungen dringend empfohlen. Bauliche Barrierefreiheit (Aufzüge, Rampen) ändert nichts am personellen Unterstützungsbedarf beim Transfer oder der Begleitung."]
  ]
 },
 "4.5.16": {
  titel: "Einhalten einer Diät oder anderer krankheitsbedingter Verhaltensvorschriften",
  zeilen: [
  [0, "Laien-Check: Unterstützung bei der Einsicht und Einhaltung von ärztlich verordneten Diäten (z.B. bei Niereninsuffizienz, Diabetes, Zöliakie, Essstörungen wie Anorexie/Prader-Willi) oder Verhaltensvorschriften, die sich auf vitale Funktionen beziehen (z. B. Langzeit-Sauerstoff-Therapie bei unruhigen Personen)."],
  [0, "Hilfsmittel-Regel: Nutzt die Person Apps zur Nährwertberechnung, digitale Diättagebücher oder Wecker völlig eigenständig und kontrolliert ihr Verhalten damit fehlerfrei? Dann wählen Sie „selbständig“ (0)."],
  [0, "Wichtig: Bewertet wird die mentale Fähigkeit, die Notwendigkeit der Maßnahme einzusehen und diese einzuhalten. Es geht nicht um das Kochen oder Servieren der Diätkost. Ausschlaggebend ist, wie oft aufgrund von Nichtbeachtung ein korrigierendes Eingreifen erforderlich ist. Eine allgemeine „gesunde Lebensführung“ oder die selbstbestimmte Ablehnung bei intakten geistigen Funktionen zählen nicht. Die Vorschrift muss ärztlich angeordnet und auf Dauer (6 Monate) angelegt sein."],
  [0, "Abstufungen:"],
  [1, "0: Selbständig: Hält Vorschriften allein ein. Das Bereitstellen der Diät reicht aus."],
  [1, "1: Überwiegend selbständig: Benötigt Erinnerung/Anleitung. Eingreifen maximal 1-mal täglich erforderlich."],
  [1, "2: Überwiegend unselbständig: Benötigt meist Anleitung/Beaufsichtigung. Eingreifen mehrmals täglich erforderlich."],
  [1, "3: Unselbständig: Benötigt immer Anleitung/Beaufsichtigung. Eingreifen (fast) durchgehend erforderlich."]
  ]
 }
};
