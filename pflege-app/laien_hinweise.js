// Praxishinweise je NBA-Kriterium (Laien-Check, Hilfsmittel-Regel, Fallstricke, Abstufungen).
// Grundlage: eigene Handreichung des Verfassers. Dient dazu, in den Begruendungen fachliche
// Fehler zu vermeiden – insbesondere Hilfsmittel-Regeln und die Abgrenzung zwischen Kriterien.
// "stufen" ist in der Reihenfolge der Skala angegeben und passt zum Index der App-Optionen.
const LAIEN_HINWEISE = {
"4.1.1": {
 check: "Kann sich die Person im Bett eigenständig umdrehen, die Beine bewegen oder sich aufrichten?",
 hilfsmittel: "Nutzt die Person Hilfsmittel (Bettgalgen, Griffe, Seitengitter, Strickleiter) und schafft sie es damit ganz allein, gilt sie als selbständig (0 Punkte).",
 stufen: [
  "Selbständig.",
  "Überwiegend selbständig: nur geringfügige Hilfe, z. B. die Beine aus dem Bett heben oder eine Hand zum Aufrichten reichen.",
  "Überwiegend unselbständig: hoher Unterstützungsbedarf beim Lagewechsel (aktives Schieben/Wuchten), ABER die eingenommene Lage kann selbst beibehalten werden (z. B. Festhalten am Seitengitter).",
  "Unselbständig: die Lage kann nicht beibehalten werden, die Person sinkt zurück oder kippt um und muss komplett gelagert und gestützt werden."
 ]
},
"4.1.2": {
 check: "Kann die Person frei auf der Bettkante oder einem Stuhl ohne Lehne sitzen, ohne das Gleichgewicht zu verlieren?",
 hilfsmittel: "Werden nur Rücken- oder Armlehnen benötigt, gilt dies als selbständig.",
 stufen: [
  "Selbständig.",
  "Überwiegend selbständig: die Person sitzt unsicher, es ist zur Absicherung (Schwindel, Schwäche) unmittelbares Danebenstehen nötig, um im Notfall einzugreifen.",
  "Überwiegend unselbständig: während des Sitzens mehrfach körperliche Korrektur oder zeitweises Stützen nötig (z. B. Oberkörper geraderücken), die Position kann mit dieser Hilfe aber gehalten werden.",
  "Unselbständig: ohne körperliche Stütze sofortiger Gleichgewichtsverlust, dauerhaftes aktives Halten nötig."
 ]
},
"4.1.3": {
 check: "Kann die Person den Ort wechseln, z. B. vom Bett in den Rollstuhl oder vom Sessel auf die Toilette?",
 hilfsmittel: "Haltegriffe, Rutschbretter oder Lifter, die die Person allein bedient, führen zu selbständig.",
 stufen: [
  "Selbständig.",
  "Überwiegend selbständig: nur eine Hand reichen, beim Positionieren der Füße helfen oder beim Aufstehen kurz stützen.",
  "Überwiegend unselbständig: aktives Anheben oder kräftiges Halten und Führen an Oberkörper/Becken, während die Person noch teilweise mitarbeitet (mitschwingt, kurzzeitig steht).",
  "Unselbständig: keinerlei Mitarbeit mehr, komplettes Heben oder Transfer per Lifter."
 ]
},
"4.1.4": {
 check: "Kann sich die Person sicher innerhalb der Wohnung von Zimmer zu Zimmer bewegen (z. B. Weg zur Toilette, ca. 8 m)?",
 hilfsmittel: "ACHTUNG: Rollator, Gehstock oder ein selbst angetriebener Rollstuhl führen zu SELBSTÄNDIG. Die bloße Nutzung eines Rollators begründet also KEINE Einschränkung.",
 wichtig: "Es geht ausschließlich um die Fortbewegung im Wohnbereich, nicht um Wege außerhalb.",
 stufen: [
  "Selbständig.",
  "Überwiegend selbständig: Absicherung durch Nebenhergehen nötig (Schwindel, Sturzgefahr), ohne permanentes körperliches Stützen. Im Rollstuhl punktuelle Hilfe bei Schwellen und engen Kurven.",
  "Überwiegend unselbständig: nur wenige Schritte (ca. 3 bis 5) möglich, dabei erhebliches Abstützen und Führen nötig. Im Rollstuhl überwiegend Schieben nötig, Eigenantrieb nur minimal.",
  "Unselbständig: die Person muss getragen oder der Rollstuhl vollständig geschoben werden."
 ]
},
"4.1.5": {
 check: "Kann die Person eine ganze Etage in aufrechter Haltung überwinden?",
 hilfsmittel: "ACHTUNG: Das Treppengeländer (auch beidseitig) ist ein Hilfsmittel. Wer sich damit allein hochzieht, gilt als selbständig.",
 stufen: [
  "Selbständig.",
  "Überwiegend selbständig: die Treppe wird körperlich allein bewältigt, es ist aber Begleitung/Anwesenheit als Sicherheit nötig (Sturzrisiko, Angst), ohne aktives Stützen.",
  "Überwiegend unselbständig: Treppensteigen nur mit aktivem Stützen oder Festhalten möglich (z. B. kräftiges Halten unter dem Arm).",
  "Unselbständig: die Person muss getragen oder mit einem Hilfsmittel (z. B. Treppenlift) transportiert werden, das vollständig bedient wird; keine Eigenbeteiligung."
 ]
},
"4.2.1": {
 check: "Erkennt die Person enge Angehörige oder enge Freunde sicher und ordnet sie richtig zu?",
 hilfsmittel: "Rein kognitive Fähigkeit: Brillen und Hörgeräte zählen hier NICHT. Nur kognitive Hilfen (z. B. selbständig genutztes beschriftetes Fotobuch) kompensieren.",
 wichtig: "Dass sich die Person nicht an den Namen erinnert, zählt NICHT als Einschränkung.",
 stufen: [
  "Unbeeinträchtigt: erkennt Bezugspersonen jederzeit sicher.",
  "Größtenteils vorhanden: gelegentliche Verwechslungen (z. B. Enkel mit Sohn), die meist selbständig oder nach längerem Nachdenken korrigiert werden.",
  "In geringem Maße vorhanden: erkennt Angehörige nur noch phasenweise oder braucht häufige personelle Hinweise zur Zuordnung.",
  "Nicht vorhanden: engste Personen werden gar nicht mehr erkannt oder als Fremde wahrgenommen."
 ]
},
"4.2.2": {
 check: "Findet sich die Person in der Wohnung und in der Nachbarschaft (z. B. Weg zum Bäcker) sicher zurecht?",
 hilfsmittel: "Selbständig genutzte kognitive Hilfen (Türbeschriftungen, Piktogramme, Bodenmarkierungen, Navigations-App) führen zu unbeeinträchtigt.",
 wichtig: "Es geht ausschließlich um kognitive Orientierung, NICHT um das Sehvermögen.",
 stufen: [
  "Unbeeinträchtigt: findet alle Ziele in Wohnung, am Haus und auf gewohnten Wegen in der Nachbarschaft sicher.",
  "Größtenteils vorhanden: findet sich innerhalb der Wohnung sicher zurecht, Wege im näheren Wohnumfeld (Bäcker, Briefkasten) können nicht mehr sicher bewältigt werden.",
  "In geringem Maße vorhanden: findet sich außerhalb gar nicht mehr zurecht und braucht auch innerhalb der Wohnung Hinweise auf die Zimmer.",
  "Nicht vorhanden: findet auch in der eigenen Wohnung kein Ziel mehr."
 ]
},
"4.2.3": {
 check: "Weiß die Person, welcher Wochentag ist oder ob Vormittag oder Abend ist? Kann sie Jahr oder Monat benennen?",
 hilfsmittel: "Selbständig genutzte kognitive Stützen (Funkuhr mit großem Display, Abreißkalender, Datumsanzeige am Handy) führen zu unbeeinträchtigt.",
 wichtig: "Es geht um die Verarbeitung im Gehirn, NICHT um das bloße Ablesen einer Uhr (Sehvermögen).",
 stufen: [
  "Unbeeinträchtigt: zeitliche Einordnung jederzeit sicher (ggf. mit Hilfsmitteln).",
  "Größtenteils vorhanden: vergisst gelegentlich das Datum oder verwechselt den Wochentag, unterscheidet die Tageszeiten aber sicher.",
  "In geringem Maße vorhanden: braucht mehrfach täglich Hinweise zur Zeit; kann den Tagesabschnitt nur grob einschätzen oder sich an hell und dunkel orientieren.",
  "Nicht vorhanden: jegliches Zeitgefühl verloren, kein Tag-Nacht-Rhythmus (schläft tagsüber, wandert nachts umher)."
 ]
},
"4.2.4": {
 check: "Kann die Person berichten, was in den letzten 24 Stunden passiert ist (Besuch, Telefonat, Essen)?",
 hilfsmittel: "Selbständig genutztes Tagebuch, Kalender, Notizzettel oder Fotos führen zu unbeeinträchtigt.",
 stufen: [
  "Unbeeinträchtigt: Erlebnisse der letzten 24 Stunden werden sicher abgerufen.",
  "Größtenteils vorhanden: vergisst Details, erinnert sich aber an das Kernereignis; vergisst regelmäßig Termine oder die Medikamenteneinnahme.",
  "In geringem Maße vorhanden: erinnert sich nur mit massiver Hilfe an Bruchstücke; Kurz- und Langzeitgedächtnis eingeschränkt, nur prägende Ereignisse (z. B. Hochzeit) präsent.",
  "Nicht vorhanden: keine Erinnerung mehr möglich."
 ]
},
"4.2.5": {
 check: "Kann die Person mehrschrittige Alltagshandlungen planen und durchführen (z. B. Kaffee kochen: Wasser, Filter, Pulver, einschalten)?",
 hilfsmittel: "Selbständig genutzte Checklisten oder bebilderte Schritt-für-Schritt-Anleitungen führen zu unbeeinträchtigt.",
 wichtig: "NUR die kognitive Steuerung bewerten – NICHT körperliche Einschränkungen oder Schmerzen. Dieses Kriterium ist der zentrale Ort für kognitiv bedingte Anleitungs- und Impulsbedarfe bei Alltagshandlungen.",
 stufen: [
  "Unbeeinträchtigt: führt komplexe Handlungen fehlerfrei aus.",
  "Größtenteils vorhanden: vergisst gelegentlich einen Teilschritt, führt die Handlung aber meist zu Ende; einfache Hinweise zur Vollendung genügen.",
  "In geringem Maße vorhanden: bricht Handlungen häufig ab oder vertauscht die Reihenfolge so stark, dass das Ziel nicht erreicht wird; Impulsgabe oder kleinschrittige Anleitung zu jedem Teilschritt nötig.",
  "Nicht vorhanden: kann selbst einfachste Handlungen nicht mehr planen oder beginnen."
 ]
},
"4.2.6": {
 check: "Trifft die Person im Alltag zweckmäßige Entscheidungen (Kleidung passend zum Wetter, Tagesgestaltung, Fernsehprogramm)?",
 hilfsmittel: "Selbständig genutzte kognitive Stützen (Wetter-App, vorbereitete Outfits) führen zu unbeeinträchtigt.",
 wichtig: "Rein kognitive Verarbeitung.",
 stufen: [
  "Unbeeinträchtigt: trifft logische, zielführende Entscheidungen.",
  "Größtenteils vorhanden: zögert häufig, braucht Bestätigung durch andere oder vorgegebene Entscheidungsalternativen.",
  "In geringem Maße vorhanden: trifft häufig unlogische oder gefährliche Entscheidungen (im Pyjama einkaufen, im Winter leicht bekleidet nach draußen).",
  "Nicht vorhanden: vollkommen entscheidungsunfähig, wird vollständig durch Dritte gesteuert."
 ]
},
"4.2.7": {
 check: "Begreift die Person den Inhalt einer Zeitungsmeldung, einer Nachricht oder der Erklärungen eines Arztes?",
 hilfsmittel: "Es geht um das Begreifen im Gehirn. Ein Hörgerät hilft nur akustisch und kompensiert hier NICHT.",
 wichtig: "ACHTUNG: Ausdrücklich NICHT Schwerhörigkeit oder Seheinschränkungen bewerten – das wäre ein Bewertungsfehler.",
 stufen: [
  "Unbeeinträchtigt: versteht auch komplexere Sachverhalte und Zusammenhänge problemlos.",
  "Größtenteils vorhanden: braucht einfache Erklärungen oder mehrfache Wiederholungen; einfache Sachverhalte werden problemlos verstanden.",
  "In geringem Maße vorhanden: versteht nur noch ganz kurze, konkrete Ein-Satz-Botschaften.",
  "Nicht vorhanden: Sachverhalte werden kognitiv gar nicht mehr verarbeitet."
 ]
},
"4.2.8": {
 check: "Erkennt die Person Gefahren wie eine brennende Herdplatte, wechselnde Bodenbeläge oder den fließenden Verkehr?",
 hilfsmittel: "Selbständig genutzte Warnsysteme (Herdwächter mit Signal, Erkennen von Ampeln) führen zu unbeeinträchtigt.",
 wichtig: "ACHTUNG: Rein kognitive Verarbeitung – NICHT Seheinschränkungen bewerten.",
 stufen: [
  "Unbeeinträchtigt: erkennt und meidet Gefahren im Haus und außerhalb sicher.",
  "Größtenteils vorhanden: braucht gelegentlich Erinnerung an Gefahrenregeln, ist grundsätzlich vorsichtig; überquert die Straße ohne zu schauen oder bei Rot (Gefahren außerhalb der Häuslichkeit).",
  "In geringem Maße vorhanden: unterschätzt Gefahren massiv (greift auf die eingeschaltete Herdplatte, manipuliert an Steckdosen), braucht ständige Kontrolle.",
  "Nicht vorhanden: keinerlei Gefahrenbewusstsein mehr (greift z. B. in eine offene Flamme)."
 ]
},
"4.2.9": {
 check: "Kann die Person Grundbedürfnisse (Hunger, Durst, Schmerz, Toilettengang) so äußern, dass Außenstehende sie verstehen?",
 hilfsmittel: "Selbständig genutzter Sprachcomputer, Symboltafel oder Kommunikations-App führen zu unbeeinträchtigt.",
 wichtig: "Hier werden kognitive Verarbeitung UND Sprachstörung bewertet.",
 stufen: [
  "Unbeeinträchtigt: teilt alle Bedürfnisse klar mit.",
  "Größtenteils vorhanden: braucht viel Zeit oder Umschreibungen, um sich verständlich zu machen.",
  "In geringem Maße vorhanden: Bedürfnisse nur noch durch mühsame Deutung von Mimik und Gestik erkennbar.",
  "Nicht vorhanden: keinerlei Mitteilung von Bedürfnissen mehr möglich."
 ]
},
"4.2.10": {
 check: "Versteht die Person Aufforderungen im Alltag wie „Komm bitte zum Essen\" oder „Zieh bitte die Jacke an\"?",
 hilfsmittel: "ACHTUNG: Hier ist ein Hörgerät oder Sprachverstärker ausdrücklich zulässig und führt bei Erfolg zu unbeeinträchtigt.",
 wichtig: "Hier werden kognitive Verarbeitung UND Schwerhörigkeit bewertet (anders als bei 4.2.7).",
 stufen: [
  "Unbeeinträchtigt: versteht Aufforderungen sofort und setzt sie um (körperliche Fähigkeit vorausgesetzt).",
  "Größtenteils vorhanden: braucht gelegentlich Wiederholung, direkte Ansprache oder einfache Sprache; auch lautes direktes Ansprechen bei nicht kompensierter Schwerhörigkeit zählt hier.",
  "In geringem Maße vorhanden: versteht einfache Aufforderungen nur bei kleinschrittiger Erklärung, Wiederholung und unterstützenden Gesten.",
  "Nicht vorhanden: versteht den Sinn von Aufforderungen gar nicht mehr."
 ]
},
"4.2.11": {
 check: "Kann die Person einem Gespräch in kleiner Runde folgen, Fragen beantworten und beim Thema bleiben?",
 hilfsmittel: "Hörgerät zur akustischen Teilnahme oder Sprachcomputer sind zulässig und führen zu selbständig.",
 stufen: [
  "Unbeeinträchtigt: beteiligt sich problemlos an Gesprächen.",
  "Größtenteils vorhanden: Wortfindungsstörungen oder gelegentlicher Verlust des roten Fadens; Gruppengespräche kaum noch möglich, direkte Ansprache oder Wiederholung nötig.",
  "In geringem Maße vorhanden: antwortet nur noch auf direkte Fragen mit einzelnen Worten, folgt dem Gesprächsfluss nicht, ist schnell durch Außenreize ablenkbar.",
  "Nicht vorhanden: keine aktive oder passive Gesprächsbeteiligung mehr möglich."
 ]
},
"4.3.1": {
 check: "Extremer Bewegungsdrang, zielloses und desorientiertes Umhergehen in der Wohnung (z. B. muss beim Essen immer wieder an den Tisch zurückbegleitet werden) oder permanente Versuche, das Haus zu verlassen (Hinlauftendenz).",
 hilfsmittel: "Hilfsmittel zählen hier nicht. Maßgeblich ist die notwendige Beaufsichtigung oder Beruhigung durch die Pflegeperson.",
 wichtig: "Voraussetzung für Modul 3: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz mit seit mindestens 6 Monaten laufender Behandlung oder Therapie.",
 stufen: ["Nie oder sehr selten (seltener als einmal pro Woche).", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich (ständige Aufmerksamkeit zur Gefahrenvermeidung nötig)."]
},
"4.3.2": {
 check: "Nächtliches zielloses oder desorientiertes Umherlaufen mit notwendiger Rückbegleitung ins Bett oder lautes Rufen mit umfassendem Beruhigungsbedarf.",
 hilfsmittel: "Beruhigungstees oder Medikamente zählen nicht. Entscheidend ist, ob die Pflegeperson nachts aufstehen und eingreifen muss.",
 wichtig: "ACHTUNG: Somatische Ursachen (Schmerzen, Restless-Legs-Syndrom) sind hier NICHT zu berücksichtigen. Voraussetzung ist eine fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: schläft meist durch, Störungen sind die Ausnahme.", "Selten (ein- bis dreimal in zwei Wochen nachts eingreifen).", "Häufig (mehrmals wöchentlich nächtliche Unterbrechung).", "Jede Nacht: Durchschlafen für die Pflegeperson kaum möglich."]
},
"4.3.3": {
 check: "Selbstschädigung durch Kratzen, Schlagen gegen den eigenen Kopf, Haareausreißen oder Einnahme schädlicher Substanzen.",
 hilfsmittel: "Schutzhandschuhe oder Helme sind Hilfsmittel, entscheidend ist aber die personelle Überwachung zur Vermeidung der Selbstverletzung.",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: kein solches Verhalten bekannt.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: nahezu lückenlose Beobachtung nötig."]
},
"4.3.4": {
 check: "Zerstörerischer Umgang mit Inventar: Tapeten abreißen, Geschirr umherwerfen, Kleidung oder Bettwäsche zerreißen.",
 hilfsmittel: "Bewertet wird der Aufwand, die Zerstörung zu verhindern oder die Folgen zu beseitigen.",
 wichtig: "ACHTUNG: Schäden, die durch Herunterfallen aus der Hand oder durch Anstoßen mit dem Rollator bei Gangunsicherheit entstehen, sind hier NICHT gemeint. Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: geht sorgsam mit Eigentum um.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: unkontrollierte Zerstörung in der unmittelbaren Umgebung."]
},
"4.3.5": {
 check: "Handgreiflichkeit in Überforderungssituationen (Schlagen, Treten, Kneifen, Haareziehen, Bewerfen), die nicht bewusst gesteuert oder vermieden werden kann.",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: friedlicher Umgang.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: gefahrloser Umgang nur unter höchster Vorsicht möglich."]
},
"4.3.6": {
 check: "Lautwerden, Beschimpfungen, Schreien oder massive Drohungen, die nicht selbständig gesteuert werden können und umfassende deeskalierende Kommunikation sowie Beruhigung erfordern.",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: freundlicher Umgangston.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: verbale Ausfälle an jedem Tag."]
},
"4.3.7": {
 check: "Ständige Geräusche ohne Kommunikationszweck: lautes Selbstgespräch, ständiges Jammern, Rufen nach Verstorbenen, monotones Singen oder Brummen.",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: unauffällig.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: nahezu dauerhaftes Lautgeben, das die Umgebung massiv belastet."]
},
"4.3.8": {
 check: "Abwehr pflegerischer Hilfe: Wegschieben des Waschlappens, Zusammenkneifen der Lippen bei Medikamenten, Sperren gegen das Anziehen oder gegen notwendige Unterstützung.",
 wichtig: "ACHTUNG: Es geht um die PSYCHISCHE Abwehr – NICHT um körperliche Steifheit und NICHT um bewusstes Vermeiden möglicher Schmerzen. Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: kooperativ.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: jede Maßnahme ist ein zeitaufwendiger Kampf."]
},
"4.3.9": {
 check: "Sieht oder hört die Person Dinge, die nicht da sind, glaubt sie an Fremde im Haus oder vergiftetes Essen? Kann sie das nicht kompensieren und ist umfassende Beruhigung nötig?",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: realitätsnah.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: lebt fast nur noch in der eigenen, bedrohlichen Realität."]
},
"4.3.10": {
 check: "Massive Ängste oder Panikattacken ohne erkennbaren Grund in gewohnter Umgebung. Auch massive Luftnot mit daraus entstehenden Todesängsten (z. B. bei schwerer Herz- oder Lungenerkrankung) zählt hier.",
 wichtig: "ACHTUNG, häufige Fehlerquelle: Allgemeine Zukunftsängste, Sturzangst, Angst vor dem Verlassen der Wohnung und die reine Angst vor dem Alleinsein zählen hier NICHT – auch dann nicht, wenn Anwesenheit nötig ist. Gemeint ist die umfassende personelle Beruhigung bei Todesängsten, ggf. mit Bedarfsmedikation. Voraussetzung: fachärztliche Diagnose, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: keine auffälligen Ängste oder nur allgemeine Ängste.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: nahezu täglich ausgeprägte Panik mit Todesängsten."]
},
"4.3.11": {
 check: "Antriebslosigkeit: isst oder trinkt nicht, sitzt regelmäßig nur im Sessel und reagiert nicht auf direkte Ansprache, führt Alltagshandlungen auch nach mehrfacher Aufforderung nicht aus (Körperpflege, Beschäftigung).",
 wichtig: "ACHTUNG: Gedrückte Stimmung oder Niedergeschlagenheit allein ist KEINE Antriebslosigkeit. Auch das bloße Ablehnen von Spaziergängen oder Besuchen genügt NICHT. Es geht um den Antrieb zu Kommunikation, Alltagsbewältigung und Körperpflege. Voraussetzung: fachärztlich diagnostizierte Depression, seit mindestens 6 Monaten behandelt, ohne erkennbare Besserung.",
 stufen: ["Nie oder sehr selten: grundsätzlich motivierbar.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: völlige Apathie, keine Motivation von außen erreicht die Person mehr."]
},
"4.3.12": {
 check: "Distanzloses Verhalten (Fremde wie enge Bekannte behandeln), ununterbrochenes Einfordern von Aufmerksamkeit, Entkleiden vor anderen in unpassenden Situationen, unangemessenes Greifen nach Personen, unangemessene sexuelle Annäherungsversuche.",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten: sozial angepasst.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: massivste Störungen (z. B. permanentes Entkleiden)."]
},
"4.3.13": {
 check: "Planlose Aktivitäten (sinnfreies Aus- und Umräumen von Schränken), Stereotypien (Wippen, Händeklatschen, Klopfen), ständiges Nesteln, Verstecken oder Horten (auch von Abfall oder Lebensmitteln), Umgang mit Ausscheidungen (Kotschmieren, bewusstes Urinieren in die Wohnung).",
 wichtig: "Voraussetzung: fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz, seit mindestens 6 Monaten behandelt.",
 stufen: ["Nie oder sehr selten.", "Selten (ein- bis dreimal in zwei Wochen).", "Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich).", "Täglich: massivste Störungen."]
},
"4.4.1": {
 check: "Kann sich die Person Gesicht, Hände, Arme, Achselhöhlen sowie vorderen Hals- und Brustbereich selbständig waschen und abtrocknen? Auch die kognitive Fähigkeit zählt, die Notwendigkeit zu erkennen und die Handlung ohne Aufforderung zu beginnen.",
 hilfsmittel: "Selbständig genutzter Waschstock oder spezieller Waschhandschuh führen zu selbständig. Bloßes Vorbereiten durch die Pflegeperson zählt nicht als Hilfe.",
 wichtig: "Bei kognitiv bedingtem Anleitungsbedarf zusätzlich eine Wertung unter 4.2.5 prüfen.",
 stufen: [
  "Selbständig: schafft die Handlung körperlich und beginnt sie eigenständig ohne Erinnerung oder Aufforderung.",
  "Überwiegend selbständig: punktuelle Hilfe (z. B. Waschen unter einer Achsel) oder kognitive Aufforderung zur Handlung, führt sie dann aber weitgehend allein aus.",
  "Überwiegend unselbständig: schafft nur geringe Teile (z. B. nur das Gesicht) oder benötigt durchgehend kleinschrittige Anleitung und Begleitung.",
  "Unselbständig: die Handlung muss fast vollständig übernommen werden."
 ]
},
"4.4.2": {
 check: "Kann die Person Haare kämmen, Zähne putzen bzw. Prothese reinigen und sich rasieren? Erkennt sie kognitiv die Notwendigkeit oder muss sie erinnert werden?",
 hilfsmittel: "Selbständig genutzter Langgriffkamm, elektrische Zahnbürste oder Rheuma-Rasierer führen zu selbständig.",
 wichtig: "Bei kognitiv bedingtem Anleitungsbedarf zusätzlich eine Wertung unter 4.2.5 prüfen.",
 stufen: [
  "Selbständig: erledigt Kämmen, Zähne und Rasieren ohne Hilfe oder Aufforderung.",
  "Überwiegend selbständig: Hilfe bei Vorbereitungen (Zahnpasta auftragen) oder mehrfache Aufforderung zum Beginn.",
  "Überwiegend unselbständig: leistet nur geringe Anteile, da beim Heben der Arme lediglich die Ohren erreicht werden, Feinmotorik und Handkraft massiv eingeschränkt sind, oder es ist ständige kleinschrittige Anleitung nötig.",
  "Unselbständig: vollständige Übernahme der Kopfpflege."
 ]
},
"4.4.3": {
 check: "Kann die Person den Intimbereich (vorne und Gesäß) selbständig reinigen und abtrocknen? Ist die Kleidung regelmäßig mit Stuhlgang beschmutzt?",
 hilfsmittel: "Eigenständig genutzte Intimwaschhilfe oder angepasster Schwamm führen zu selbständig.",
 wichtig: "Bei kognitiv bedingtem Anleitungsbedarf zusätzlich eine Wertung unter 4.2.5 prüfen.",
 stufen: [
  "Selbständig: keine personelle Hilfe oder Aufforderung nötig.",
  "Überwiegend selbständig: Unterstützung beim Waschen des Gesäßes nötig (z. B. beim Greifen wird nur der hintere Beckenkamm erreicht) oder mehrfache Aufforderung wegen kognitiver Einschränkungen.",
  "Überwiegend unselbständig: schafft nur geringe Anteile (z. B. nur Teile des vorderen Intimbereichs oder nur die Leisten), der Rest muss übernommen werden; oder kleinschrittige Anleitung zu jedem Schritt nötig.",
  "Unselbständig: die Reinigung muss vollständig übernommen werden."
 ]
},
"4.4.4": {
 check: "Gesamter Vorgang: Ein- und Ausstieg in Dusche oder Wanne, Waschen des ganzen Körpers und der Haare, Abtrocknen. Auch: kann die Person die Wassertemperatur sicher wählen und die Sturzgefahr einschätzen?",
 hilfsmittel: "Selbständig genutzter Duschstuhl, Haltegriffe oder Badewannenlifter führen zu selbständig.",
 wichtig: "Bei kognitiv bedingtem Anleitungsbedarf zusätzlich eine Wertung unter 4.2.5 prüfen.",
 stufen: [
  "Selbständig: führt den kompletten Vorgang sicher und ohne Anleitung allein durch.",
  "Überwiegend selbständig: Hilfe beim Ein- und Ausstieg, beim Haarewaschen oder ständige Anwesenheit aus Sicherheitsgründen; oder einzelne Aufforderungen zur Durchführung.",
  "Überwiegend unselbständig: kann nur geringe Teile selbst leisten (z. B. vorderer Oberkörper) oder benötigt kleinschrittige Anleitung zu jedem Handlungsablauf.",
  "Unselbständig: vollständige Übernahme nötig."
 ]
},
"4.4.5": {
 check: "Kann die Person Oberkörperkleidung inklusive Verschlüsse an- und ausziehen? Auch kognitive Defizite wie falsche Reihenfolge oder Vergessen von Kleidungsstücken zählen.",
 hilfsmittel: "Vollständig eigenständig genutzter Knöpfhaken oder Reißverschluss-Hilfen führen zu selbständig.",
 wichtig: "ACHTUNG: Bloßes Bereitlegen der Kleidung ist eine hauswirtschaftliche Tätigkeit und führt zu SELBSTÄNDIG. Bei kognitiv bedingtem Anleitungsbedarf zusätzlich 4.2.5 prüfen.",
 stufen: [
  "Selbständig: an- und auskleiden inklusive Verschlüssen ohne Hilfe oder Anleitung.",
  "Überwiegend selbständig: Hilfe bei schwierigen Verschlüssen oder beim Richten im Rückenbereich; oder einfache, ggf. mehrfache Aufforderungen zu Beginn oder Vollendung.",
  "Überwiegend unselbständig: kann lediglich die Arme in ein Kleidungsstück führen, der Rest wird übernommen; oder kleinschrittige Anleitung und ständige Begleitung nötig.",
  "Unselbständig: vollständige Übernahme nötig."
 ]
},
"4.4.6": {
 check: "Kann die Person Unterkörperkleidung inklusive Strümpfe, Schuhe und Verschlüsse an- und ausziehen? Auch kognitive Defizite wie falsche Reihenfolge (Unterhose über die Hose) zählen.",
 hilfsmittel: "Vollständig eigenständig genutzte Strumpfanziehhilfe, Schuhanzieher oder Schuhöffner führen zu selbständig.",
 wichtig: "ACHTUNG: Bloßes Bereitlegen der Kleidung ist eine hauswirtschaftliche Tätigkeit und führt zu SELBSTÄNDIG. Bei kognitiv bedingtem Anleitungsbedarf zusätzlich 4.2.5 prüfen.",
 stufen: [
  "Selbständig: an- und auskleiden inklusive Verschlüssen (Hosenknopf, Schnürsenkel) ohne Hilfe oder Anleitung.",
  "Überwiegend selbständig: Hilfe bei schwierigen Verschlüssen oder beim Anziehen von Socken und Schuhen; oder einfache, ggf. mehrfache Aufforderungen.",
  "Überwiegend unselbständig: kann nur geringe Anteile leisten (Beine in die Hosenbeine führen, Hose von den Knien bis zur Taille ziehen), der Rest wird übernommen; oder kleinschrittige Anleitung und ständige Begleitung nötig.",
  "Unselbständig: vollständige Übernahme nötig."
 ]
},
"4.4.7": {
 check: "Kann die Person Brot oder Fleisch schneiden, Obst schälen, Flaschen öffnen oder Getränke eingießen? Erkennt sie kognitiv die Notwendigkeit der Vorbereitung?",
 hilfsmittel: "Vollständig eigenständig genutzter Einhand-Flaschenöffner, Brotschneidehilfe oder Rheumabesteck führen zu selbständig.",
 wichtig: "ACHTUNG: Das Decken des Tisches und das Bereitstellen der Utensilien sind hauswirtschaftliche Tätigkeiten und führen zu SELBSTÄNDIG. Bei kognitiv bedingtem Anleitungsbedarf zusätzlich 4.2.5 prüfen.",
 stufen: [
  "Selbständig: bereitet alles ohne Hilfe mundgerecht vor.",
  "Überwiegend selbständig: punktuelle Hilfe (sehr feste Verschlüsse, Kleinschneiden fester Speisen) oder einfache Aufforderung zur Zubereitung.",
  "Überwiegend unselbständig: Nahrung muss fast vollständig vorbereitet werden (fertig geschmierte und geschnittene Brote, Eingießen von Getränken, auch bei ausgeprägten Seheinschränkungen) oder ständige kleinschrittige Anleitung nötig.",
  "Unselbständig: keine Beteiligung an der Zubereitung möglich, vollständige Übernahme."
 ]
},
"4.4.8": {
 check: "Kann die Person zubereitete Nahrung zum Mund führen, kauen und schlucken? Erkennt sie kognitiv, dass sie essen muss, oder muss sie ständig motiviert oder erinnert werden?",
 hilfsmittel: "Eigenständig genutztes Warmhaltegeschirr, Teller mit erhöhtem Rand oder Rheumabesteck führen zu selbständig.",
 wichtig: "Bei diagnostizierter Schluckstörung mit ständiger Überwachung und unmittelbarer Eingreifbereitschaft ist überwiegend unselbständig zu werten. Dieses Kriterium wird dreifach gewichtet (0/3/6/9).",
 stufen: [
  "Selbständig: isst ohne Hilfe oder Motivation.",
  "Überwiegend selbständig: punktuelle Hilfe (Besteck führen) oder Aufforderung zum Beginn beziehungsweise Weiteressen.",
  "Überwiegend unselbständig: muss massiv zur Nahrungsaufnahme motiviert werden, braucht ständige Aufsicht wegen Aspirationsgefahr oder das Essen muss größtenteils gereicht werden.",
  "Unselbständig: Nahrung muss fast vollständig gereicht werden oder die Person kann nicht schlucken."
 ]
},
"4.4.9": {
 check: "Kann die Person bereitstehende Getränke aufnehmen und trinken? Erkennt sie das Durstgefühl oder muss sie ständig erinnert werden?",
 hilfsmittel: "Selbständig genutzte Schnabelbecher, Trinkhalme oder Becher mit Nasenausschnitt führen zu selbständig.",
 wichtig: "Bei diagnostizierter Schluckstörung mit ständiger Überwachung ist überwiegend unselbständig zu werten. Dieses Kriterium wird zweifach gewichtet (0/2/4/6).",
 stufen: [
  "Selbständig: trinkt ohne Hilfe oder Aufforderung.",
  "Überwiegend selbständig: punktuelle Hilfe (Glas in den Aktionsradius stellen) oder Aufforderung zum Beginn beziehungsweise Weitertrinken.",
  "Überwiegend unselbständig: muss zu fast jedem Schluck motiviert werden, das Gefäß muss in die Hand gegeben werden, ständige Aufsicht wegen Aspirationsgefahr oder das Getränk muss größtenteils gereicht werden.",
  "Unselbständig: Flüssigkeit muss fast vollständig gereicht werden oder die Person kann nicht schlucken."
 ]
},
"4.4.10": {
 check: "Kann die Person zur Toilette gehen, sich hinsetzen, die Intimhygiene durchführen und die Kleidung richten? Auch kognitive Aspekte wie rechtzeitiges Erkennen des Harndrangs oder die richtige Handlungsabfolge zählen.",
 hilfsmittel: "Selbständig genutzte Toilettensitzerhöhung, Stützgriffe, Rollator, Rollstuhl oder Aufstehhilfe führen zu selbständig, sofern keine personelle Unterstützung nötig ist.",
 wichtig: "Eine Wertung unter 4.1.3 und 4.1.4 ist zu berücksichtigen. Dieses Kriterium wird zweifach gewichtet (0/2/4/6).",
 stufen: [
  "Selbständig: erledigt den gesamten Vorgang ohne Hilfe.",
  "Überwiegend selbständig: Begleitung zur Sicherheit, punktuelle Unterstützung beim Umsetzen, beim Richten der Kleidung oder bei der Intimhygiene nach dem Stuhlgang; oder Erinnerung zum Toilettengang.",
  "Überwiegend unselbständig: massives Stützen beim Hinsetzen und Aufstehen nötig oder nur geringe Anteile der Intimhygiene selbst möglich; oder ständige kleinschrittige Anleitung nötig.",
  "Unselbständig: keine oder nur minimale Beteiligung, vollständige Übernahme."
 ]
},
"4.4.11": {
 check: "Kann die Person die Folgen einer Harninkontinenz bewältigen (Wechsel von Einlagen oder Pants) oder eigenständig mit Katheter oder Urostoma umgehen?",
 hilfsmittel: "Vollständig eigenständige Nutzung von Inkontinenzmaterial oder Katheterbeutel führt zu selbständig.",
 wichtig: "Feinmotorikstörungen, reduzierte Handkraft und eingeschränkter Schürzengriff berücksichtigen. Bei kognitiv bedingtem Anleitungsbedarf zusätzlich 4.2.5 prüfen.",
 stufen: [
  "Selbständig: nutzt und wechselt Materialien ohne Hilfe oder Erinnerung.",
  "Überwiegend selbständig: benötigt die Bereitstellung der Materialien oder Erinnerung zum regelmäßigen Wechsel.",
  "Überwiegend unselbständig: schafft nur geringe Teile (Einlage in den Slip legen), braucht Hilfe bei der Reinigung oder ständige Anleitung beim Materialwechsel.",
  "Unselbständig: keine Beteiligung möglich, vollständige Übernahme."
 ]
},
"4.4.12": {
 check: "Kann die Person Vorlagen bei Stuhlinkontinenz wechseln oder eigenständig mit einem Stoma umgehen?",
 hilfsmittel: "Vollständig eigenständige Reinigung und Wechsel der Materialien (z. B. Stomabeutel) führen zu selbständig.",
 wichtig: "Feinmotorikstörungen, reduzierte Handkraft und eingeschränkter Schürzengriff berücksichtigen. Bei kognitiv bedingtem Anleitungsbedarf zusätzlich 4.2.5 prüfen.",
 stufen: [
  "Selbständig: volle Eigenständigkeit beim Materialwechsel ohne Hilfe oder Aufforderung.",
  "Überwiegend selbständig: punktuelle Hilfe bei der Vorbereitung (Bereitlegen des Materials) oder Erinnerung zur Durchführung.",
  "Überwiegend unselbständig: umfassende Hilfe beim Wechsel des Materials oder Stomabeutels oder kleinschrittige Anleitung nötig.",
  "Unselbständig: keine Beteiligung möglich, vollständige Übernahme."
 ]
},
"4.4.13": {
 check: "Ernährung über parenteralen Zugang (z. B. Port) oder über Magen- beziehungsweise Dünndarmzugang (PEG/PEJ).",
 hilfsmittel: "Führt die Person Vorbereitung, Anhängen der Nahrung und Spülen des Zugangs ohne Fremdhilfe durch, gilt sie als selbständig.",
 wichtig: "Zu beurteilen sind Häufigkeit der Gabe und ob die Ernährung ausschließlich oder zusätzlich zur oralen Ernährung erfolgt.",
 stufen: [
  "Selbständig oder nicht täglich: eigenständige Versorgung ODER nur gelegentliche beziehungsweise vorübergehende Gabe zusätzlich zur oralen Ernährung.",
  "Täglich zusätzlich zur oralen Ernährung: täglich Sondenkost oder Flüssigkeit zur Nahrungsergänzung beziehungsweise zur Vermeidung von Mangelernährung, zusätzlich zu täglicher oraler Nahrung.",
  "Ausschließlich oder nahezu ausschließlich parenteral oder über Sonde; orale Gabe erfolgt nicht oder nur in geringem Maße zur Förderung der Sinneswahrnehmung."
 ]
},
"4.5.1": {
 check: "Hilfe bei Tabletten, Tropfen, Dosieraerosolen, Zäpfchen, Pflastern oder Augentropfen. Gaben zu unterschiedlichen Zeiten (z. B. nüchtern und nach dem Frühstück) zählen separat.",
 hilfsmittel: "Selbständig genutzter Wecker, Handy-Erinnerung, Medikamenten-App, beschrifteter Wochendispenser oder Tablettenteiler führen zu selbständig (0).",
 wichtig: "Das Richten der Tabletten zählt nur einmal wöchentlich, das Bereitstellen am Morgen einmal täglich. Eine Erinnerung zählt NUR bei kognitiven Einschränkungen. Nicht verordnete Medikamente, Vitaminpräparate, frei verkäufliche Mittel und Bedarfsmedikation werden NICHT gewertet."
},
"4.5.2": {
 check: "Hilfe beim Verabreichen von Spritzen (Insulin, MTX, Heparin). Jede einzelne Injektion zählt als eine Maßnahme. Auch Einstellen oder Kontrollieren einer Schmerzpumpe zählt hier.",
 hilfsmittel: "Selbständig genutzter Insulin-Pen mit Dosierhilfe, Stechhilfe oder Injektionshilfe führen zu selbständig (0).",
 wichtig: "Nur ärztlich verordnete Injektionen, die dauerhaft (mindestens 6 Monate) nötig sind. MTX zählt (meist einmal wöchentlich). Heparin zählt in der Regel NICHT (meist unter 6 Monate). Vitaminspritzen (D, B12) werden in der Regel NICHT berücksichtigt."
},
"4.5.3": {
 check: "Hilfe beim Umgang mit einem Port oder anderen dauerhaften Venenkathetern.",
 hilfsmittel: "Selbständige Versorgung mit Halterungen oder Einhand-Sets sowie eigenständiges Arbeiten mit Wecker oder Alarm führen zu selbständig (0).",
 wichtig: "Spülen, Verbandwechsel an der Einstichstelle sowie An- und Abhängen von Infusionen zählen jeweils als einzelne Maßnahmen. Künstliche Ernährung über PEG oder Sonde wird bereits unter 4.4.13 bewertet und hier NICHT doppelt gezählt."
},
"4.5.4": {
 check: "Hilfe beim Absaugen der Atemwege oder bei der Gabe von zusätzlichem Sauerstoff (Brille oder Maske).",
 hilfsmittel: "Bedient die Person Absaug- oder Sauerstoffgerät völlig allein und nutzt eigenständig Wecker oder Alarme, ist selbständig (0) zu werten.",
 wichtig: "Jedes Absaugen und jede Vorbereitung der Sauerstoffgabe am Menschen zählt. Bei dauerhafter Sauerstoffgabe zählt das tägliche Handling einmal täglich. NICHT berücksichtigt werden Reinigung und Wartung der Geräte (Filterwechsel, Einstellen des Konzentrators) sowie das Nachfüllen des Befeuchters."
},
"4.5.5": {
 check: "Hilfe beim Auftragen medizinischer Salben (z. B. bei Neurodermitis oder Psoriasis) oder bei ärztlich verordneten Einreibungen.",
 hilfsmittel: "Selbständig genutzter Rückeneincremer, Salbenapplikator oder eigenständige Erinnerung per App oder Wecker führen zu selbständig (0).",
 wichtig: "Jede Anwendung zählt einmal, unabhängig von der Anzahl der Körperstellen. Wärme- oder Kälteanwendungen müssen ärztlich verordnet sein. Frei verkäufliche Salben (Schmerzgele, Fettsalben zur Hautpflege) werden NICHT gewertet, auch nicht bei ärztlicher Empfehlung. Das Vorbereiten (Wärmflasche füllen) zählt NICHT."
},
"4.5.6": {
 check: "Hilfe beim Messen und Deuten von Blutdruck, Puls, Blutzucker, Temperatur, Gewicht oder Flüssigkeitshaushalt auf ärztliche Anordnung.",
 hilfsmittel: "Sprechende Messgeräte, Sensoren (Blutzucker-Scanner) oder eigenständige Erinnerung per App, Smartwatch oder Wecker führen zu selbständig (0), wenn die Werte selbst abgelesen und die Konsequenzen verstanden werden.",
 wichtig: "Jede einzelne Messung zählt. Es geht nicht nur ums Messen, sondern auch um das Ziehen der Schlüsse (Insulindosis festlegen, Medikation anpassen, Arzt aufsuchen). Routinemessungen ohne Bezug zu einer bestehenden Erkrankung werden NICHT gewertet."
},
"4.5.7": {
 check: "Hilfe beim An- und Ablegen körpernaher Hilfsmittel (Kompressionsstrümpfe ab Klasse 2, Prothesen, Hörgeräte, Korsett, Schienen, Orthesen).",
 hilfsmittel: "Selbständig genutzte Strumpfanziehhilfe, Hörgeräte-Einsetzhilfe oder Anziehschlaufen sowie eigenständige Erinnerung führen zu selbständig (0).",
 wichtig: "Jedes Anlegen und jedes Ablegen zählt separat (morgens an, abends aus = 2 Maßnahmen täglich). Das Einsetzen von Zahnprothesen wird bereits unter 4.4.2 bewertet und zählt hier NICHT. Reines Reinigen einer Brille oder eines Hörgeräts sowie das Tragen von Brillen zählt NICHT."
},
"4.5.8": {
 check: "Hilfe bei der Versorgung chronischer Wunden (Dekubitus, Ulcus cruris): Reinigung, Wundsalben, Wechsel von Verbänden und Pflastern.",
 hilfsmittel: "Selbständige Durchführung mit Spiegel zur Selbstkontrolle oder vorkonfektionierten Verbandsets sowie eigenständige Erinnerung führen zu selbständig (0).",
 wichtig: "Jede zeitlich zusammenhängende Wundversorgung zählt als EINE Maßnahme, auch bei mehreren Körperstellen. AKUTE Wunden werden NICHT berücksichtigt, da keine Dauerhaftigkeit von 6 Monaten besteht; ausgenommen sind chronifizierte Wunden über 6 Monate."
},
"4.5.9": {
 check: "Hilfe bei der Pflege künstlicher Körperöffnungen (Tracheostoma, PEG, suprapubischer Katheter, Urostoma, Colo- oder Ileostoma): Reinigung, Desinfektion der Einstichstelle, Verbandwechsel, Wechsel der Basisplatte.",
 hilfsmittel: "Selbständige Durchführung mit Spiegel, Schablonen oder einteiligen Systemen sowie eigenständige Erinnerung führen zu selbständig (0).",
 wichtig: "Bei Uro-, Colo- oder Ileostoma ist in der Regel nur der Wechsel der Basisplatte oder des einteiligen Systems zu bewerten. Das bloße Entleeren oder Wechseln des Stoma- oder Katheterbeutels zählt hier NICHT, sondern unter 4.4.11 ff. Dauerhaftigkeit von mindestens 6 Monaten nötig."
},
"4.5.10": {
 check: "Hilfe bei Blasenentleerung mittels Einmalkatheter oder bei der Darmentleerung (Einläufe, Irrigation, digitale Ausräumung).",
 hilfsmittel: "Eigenständig genutzte Gleitmittel-Applikatoren, Selbstkatheterismus-Sets oder Irrigationspumpen (auch mit Timer) führen zu selbständig (0).",
 wichtig: "Jede Durchführung zählt einzeln. Das Entleeren eines Urinbeutels bei Dauerkatheter zählt hier NICHT, sondern unter 4.4.11. Dauerhaftigkeit von mindestens 6 Monaten nötig."
},
"4.5.11": {
 check: "Unterstützung bei häuslichen Eigenübungsprogrammen aus Physio-, Ergotherapie oder Logopädie, Pflege nach speziellen Konzepten (Bobath, Vojta), aufwändige Sekretelimination sowie ambulante Peritonealdialyse (CAPD).",
 hilfsmittel: "Selbständige Durchführung mit Übungspostern, Videoanleitungen, Therapie-Apps oder Übungs-Timer führt zu selbständig (0).",
 wichtig: "Nur die Durchführung durch die Pflegeperson zählt, NICHT die Zeit, in der ein Therapeut anwesend ist. Prophylaktische Maßnahmen und allgemeine aktivierende Pflege zählen NICHT. Absaugen gehört zu 4.5.4. Ärztliche Verordnung und Dauerhaftigkeit von mindestens 6 Monaten sind Voraussetzung."
},
"4.5.12": {
 check: "Hilfe oder ständige Überwachung bei Hämodialyse oder Beatmung im häuslichen Umfeld.",
 hilfsmittel: "Vollständig eigenständige Bedienung der Geräte und selbständige Reaktion auf Alarme führen zu selbständig (0).",
 wichtig: "Voraussetzung ist, dass während der Maßnahme ständige Überwachung nötig ist UND sowohl zeit- als auch technikintensiver Aufwand besteht. Bei maschineller invasiver Beatmung ist die Häufigkeit mit einmal täglich einzutragen. Die technische Messung von Vitalparametern gehört zu 4.5.6, auch bei Messung rund um die Uhr. Dauerhaftigkeit von mindestens 6 Monaten nötig."
},
"4.5.13": {
 check: "Hilfe beim Aufsuchen von Arztpraxen zur Untersuchung oder Behandlung.",
 hilfsmittel: "Selbständig organisierte Fahrdienste, Spezialtaxis oder Begleitservice führen zu selbständig (0), wenn keine persönliche Hilfe mehr nötig ist.",
 wichtig: "NUR regelmäßig wiederkehrende Regeltermine bei dauerhaften Erkrankungen zählen. Akuttermine bei plötzlichen Beschwerden zählen NICHT. Bewertet wird die Unterstützung auf dem Weg (Wohnung – Fahrzeug – Praxis). Bauliche Gegebenheiten wie Aufzüge heben die Wertung NICHT auf, wenn personelle Hilfe nötig bleibt. Bei kognitiven Defiziten zählt auch das Erinnern und Führen. Reine Terminvereinbarung zählt NICHT. Dauerhaftigkeit von 6 Monaten ist Voraussetzung."
},
"4.5.14": {
 check: "Hilfe beim Aufsuchen von Therapeuten (Physio, Logopädie, Podologie) oder anderen medizinischen Einrichtungen.",
 hilfsmittel: "Völlig eigenständige Organisation von Weg und Begleitung führt zu selbständig (0).",
 wichtig: "NUR regelmäßig wiederkehrende Regeltermine zählen, Akuttermine NICHT. Entscheidend ist die Hilfe bei Transfer und Begleitung. Bauliche Gegebenheiten schließen eine Wertung NICHT aus, wenn personelle Unterstützung nötig bleibt. Hausbesuche von Therapeuten und die reine Terminplanung zählen NICHT. Dauerverordnung oder Terminbestätigungen über 6 Monate sind zum Nachweis empfehlenswert."
},
"4.5.15": {
 check: "Hilfe beim Aufsuchen spezialisierter Einrichtungen, wenn der Gesamtaufwand inklusive Fahrt und Behandlung mehr als drei Stunden pro Termin beträgt (Dialyse, Chemotherapie, zeitaufwendige Diagnostik, Tagespflege).",
 hilfsmittel: "Völlig selbständige Organisation von Fahrt und Aufenthalt führt zu selbständig (0).",
 wichtig: "Entscheidend ist die Gesamtdauer von ÜBER drei Stunden pro Termin; darunter ist unter 4.5.13 oder 4.5.14 zu werten. Nur Regeltermine bei dauerhaften Erkrankungen, keine Akutbehandlungen. Bauliche Barrierefreiheit ändert nichts am personellen Unterstützungsbedarf. Dauerhaftigkeit von 6 Monaten nachweisen."
},
"4.5.16": {
 check: "Unterstützung bei Einsicht und Einhaltung ärztlich verordneter Diäten (Niereninsuffizienz, Diabetes, Zöliakie, Essstörungen) oder von Verhaltensvorschriften mit Bezug zu vitalen Funktionen (z. B. Langzeit-Sauerstofftherapie bei Unruhe).",
 hilfsmittel: "Völlig eigenständig genutzte Nährwert-Apps, digitale Diättagebücher oder Wecker führen zu selbständig (0).",
 wichtig: "Bewertet wird die MENTALE Fähigkeit, die Notwendigkeit einzusehen und einzuhalten – NICHT das Kochen oder Servieren der Diätkost. Maßgeblich ist, wie oft wegen Nichtbeachtung korrigierend eingegriffen werden muss. Allgemeine gesunde Lebensführung und selbstbestimmte Ablehnung bei intakten geistigen Funktionen zählen NICHT. Ärztliche Anordnung und Dauer von 6 Monaten sind Voraussetzung.",
 stufen: [
  "Selbständig: hält Vorschriften allein ein, das Bereitstellen der Diät genügt.",
  "Überwiegend selbständig: benötigt Erinnerung oder Anleitung, Eingreifen höchstens einmal täglich.",
  "Überwiegend unselbständig: benötigt meist Anleitung oder Beaufsichtigung, Eingreifen mehrmals täglich.",
  "Unselbständig: benötigt immer Anleitung oder Beaufsichtigung, Eingreifen nahezu durchgehend."
 ]
}
};
