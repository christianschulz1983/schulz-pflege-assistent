/* ALTERSENTSPRECHENDER SELBSTÄNDIGKEITSGRAD BEI KINDERN – die Tabellen der BRi.
   ==============================================================================
   Quelle: Richtlinien des Medizinischen Dienstes Bund vom 21.08.2024, Kapitel 5,
   Seiten 146 bis 149 („Tabellen zur Abbildung des altersentsprechenden Selbständig-
   keitsgrades/der altersentsprechenden Ausprägung von Fähigkeiten bei Kindern bezogen
   auf die Module 1, 2, 4 und 6").

   WAS HIER STEHT – UND WAS NICHT. Diese Datei enthält Zahlen, keine Logik. Gerechnet
   wird mit ihnen erst ab Stufe 5. Jeder Wert ist aus der gedruckten Tabelle übernommen
   und doppelt geprüft: einmal gegen den Text der PDF, einmal gegen die abfotografierten
   Tabellenseiten.

   AUFBAU. Die BRi nennt je Kriterium vier Altersspannen, von „unselbständig" bis
   „selbständig". Hier stehen die drei Grenzen dazwischen – die Alter, in denen sich
   der altersentsprechende Grad jeweils um eine Stufe verbessert:

       [ Grenze zu „überwiegend unselbständig",
         Grenze zu „überwiegend selbständig",
         Grenze zu „selbständig" ]

   Beispiel 4.1.1 Positionswechsel im Bett (BRi Seite 146):
       unter 1 Monat            -> unselbständig              (Stufe 3)
       1 bis unter 3 Monate     -> überwiegend unselbständig  (Stufe 2)
       3 bis unter 9 Monate     -> überwiegend selbständig    (Stufe 1)
       ab 9 Monaten             -> selbständig                (Stufe 0)
   steht hier als [{m:1}, {m:3}, {m:9}].

   DREI KRITERIEN HABEN NUR ZWEI SPANNEN. Bei 4.4.11, 4.4.12 und 4.4.13 ist die Zelle
   in der gedruckten Tabelle zusammengefasst: entweder „unselbständig" oder gleich
   „selbständig", ohne Zwischenstufen. Alle drei Grenzen liegen dann auf demselben
   Alter. Wer diesen drei Zeilen vier Stufen gäbe, verschenkte Punkte – deshalb steht
   es hier ausdrücklich so und wird im Selbsttest geprüft.

   STUFENZÄHLUNG. 0 ist „selbständig" beziehungsweise „Fähigkeit vorhanden", 3 ist
   „unselbständig" beziehungsweise „Fähigkeit nicht vorhanden" – dieselbe Zählung wie
   in ITEMS (js/basis.js). Die gedruckte Tabelle läuft andersherum; beim Übertragen ist
   das die häufigste Fehlerquelle.

   MODULE 3 UND 5 FEHLEN HIER, UND ZWAR ABSICHTLICH. Die BRi, Seite 143: In ihnen
   „gibt es keine Festlegung von Altersgrenzen, da hier krankheits- und therapiebedingte
   Beeinträchtigungen erfasst werden, die altersunabhängig bei jedem Kind zu bewerten
   sind." Ebenso die besondere Bedarfskonstellation 4.1.B.

   GRENZEN SIND KALENDERANGABEN, keine Tagzahlen: { m: Monate } oder { w: Wochen }.
   Warum, steht in js/alter.js.                                                        */

const KINDER_ALTERSNORM = {
    /* ---- Modul 1: Mobilität (BRi Seite 146) ---------------------------------- */
    '4.1.1': [{ m: 1 },  { m: 3 },  { m: 9 }],    // Positionswechsel im Bett
    '4.1.2': [{ m: 6 },  { m: 8 },  { m: 9 }],    // Halten einer stabilen Sitzposition
    '4.1.3': [{ m: 8 },  { m: 9 },  { m: 11 }],   // Umsetzen
    '4.1.4': [{ m: 12 }, { m: 13 }, { m: 18 }],   // Fortbewegen innerhalb des Wohnbereichs
    '4.1.5': [{ m: 15 }, { m: 18 }, { m: 30 }],   // Treppensteigen (2 Jahre 6 Monate)

    /* ---- Modul 2: Kognitive und kommunikative Fähigkeiten (Seite 147) -------- */
    '4.2.1':  [{ w: 6 },  { m: 9 },  { m: 15 }],  // Erkennen von Personen (6 Wochen!)
    '4.2.2':  [{ m: 13 }, { m: 18 }, { m: 72 }],  // Örtliche Orientierung (6 Jahre)
    '4.2.3':  [{ m: 30 }, { m: 60 }, { m: 84 }],  // Zeitliche Orientierung (2;6 / 5 / 7 J.)
    '4.2.4':  [{ m: 9 },  { m: 36 }, { m: 66 }],  // Erinnern (3 Jahre / 5 Jahre 6 Monate)
    '4.2.5':  [{ m: 5 },  { m: 12 }, { m: 15 }],  // Steuern mehrschrittiger Alltagshandlungen
    '4.2.6':  [{ m: 18 }, { m: 30 }, { m: 54 }],  // Entscheidungen (2;6 / 4 Jahre 6 Monate)
    '4.2.7':  [{ m: 48 }, { m: 60 }, { m: 72 }],  // Verstehen von Sachverhalten (4/5/6 J.)
    '4.2.8':  [{ m: 30 }, { m: 78 }, { m: 120 }], // Risiken und Gefahren (2;6 / 6;6 / 10 J.)
    '4.2.9':  [{ m: 3 },  { m: 13 }, { m: 48 }],  // Mitteilen elementarer Bedürfnisse
    '4.2.10': [{ m: 16 }, { m: 18 }, { m: 30 }],  // Verstehen von Aufforderungen
    '4.2.11': [{ m: 15 }, { m: 24 }, { m: 48 }],  // Beteiligen an einem Gespräch

    /* ---- Modul 4: Selbstversorgung (Seite 148) ------------------------------- */
    '4.4.1':  [{ m: 24 }, { m: 48 }, { m: 72 }],  // Waschen des vorderen Oberkörpers
    '4.4.2':  [{ m: 18 }, { m: 42 }, { m: 60 }],  // Körperpflege im Bereich des Kopfes
    '4.4.3':  [{ m: 24 }, { m: 48 }, { m: 72 }],  // Waschen des Intimbereichs
    '4.4.4':  [{ m: 42 }, { m: 48 }, { m: 96 }],  // Duschen und Baden (3;6 / 4 / 8 Jahre)
    '4.4.5':  [{ m: 18 }, { m: 42 }, { m: 72 }],  // An- und Auskleiden des Oberkörpers
    '4.4.6':  [{ m: 18 }, { m: 42 }, { m: 72 }],  // An- und Auskleiden des Unterkörpers
    '4.4.7':  [{ m: 24 }, { m: 66 }, { m: 96 }],  // Mundgerechtes Zubereiten der Nahrung
    '4.4.8':  [{ m: 7 },  { m: 20 }, { m: 30 }],  // Essen (Dreifachwertung)
    '4.4.9':  [{ m: 8 },  { m: 11 }, { m: 24 }],  // Trinken (Doppelwertung)
    '4.4.10': [{ m: 18 }, { m: 42 }, { m: 72 }],  // Toilette (Doppelwertung)
    // Die drei Kriterien mit nur zwei Spalten in der gedruckten Tabelle:
    '4.4.11': [{ m: 60 }, { m: 60 }, { m: 60 }],  // Harninkontinenz – unter 5 J. / ab 5 J.
    '4.4.12': [{ m: 60 }, { m: 60 }, { m: 60 }],  // Stuhlinkontinenz – unter 5 J. / ab 5 J.
    '4.4.13': [{ m: 18 }, { m: 18 }, { m: 18 }],  // Sonde – unter 18 Mon. / ab 18 Mon.

    /* ---- Modul 6: Gestaltung des Alltagslebens (Seite 149) ------------------- */
    '4.6.1': [{ m: 30 }, { m: 60 }, { m: 84 }],   // Gestaltung des Tagesablaufs
    '4.6.2': [{ m: 6 },  { m: 60 }, { m: 132 }],  // Ruhen und Schlafen (bis 11 Jahre!)
    '4.6.3': [{ m: 6 },  { m: 36 }, { m: 60 }],   // Sichbeschäftigen
    '4.6.4': [{ m: 30 }, { m: 36 }, { m: 60 }],   // Zukunftsgerichtete Planungen
    '4.6.5': [{ w: 6 },  { m: 9 },  { m: 12 }],   // Interaktion im direkten Kontakt
    '4.6.6': [{ m: 12 }, { m: 36 }, { m: 60 }]    // Kontaktpflege nach außen
};

/* DIE LISTE DER BRi AUF SEITE 201 – als Prüfstein, nicht als zweite Datenquelle.
   Die Richtlinie zählt dort selbst auf, welche Kriterien „erst ab einem bestimmten
   Alter zu beurteilen sind". Diese Liste ist aus der Tabelle oben herleitbar: Ein
   Kriterium wird genau dann noch nicht beurteilt, wenn der altersentsprechende Grad
   selbst „unselbständig" lautet – die Differenz wäre dann immer null.

   Der Selbsttest leitet die Liste aus KINDER_ALTERSNORM her und vergleicht sie mit
   dieser Abschrift. Stimmt eine der 105 Zahlen oben nicht, fällt es hier auf. Deshalb
   steht die Liste hier ausgeschrieben und wird NICHT aus der Tabelle erzeugt – wie bei
   MODUL_SPANNEN und der Solltabelle im Selbsttest.

   Die Aufzählung beginnt bei zwei Jahren, weil Kinder unter 18 Monaten in den Modulen
   1, 2, 4 und 6 ohnehin nicht bewertet werden (BRi Seite 200).                       */
const KINDER_BEURTEILUNG_AB = [
    { ab: { m: 24 }, kriterien: ['4.4.1', '4.4.3', '4.4.7'] },
    { ab: { m: 30 }, kriterien: ['4.2.3', '4.2.8', '4.6.1', '4.6.4'] },
    { ab: { m: 42 }, kriterien: ['4.4.4'] },
    { ab: { m: 48 }, kriterien: ['4.2.7'] },
    { ab: { m: 60 }, kriterien: ['4.4.11', '4.4.12'] }
];

/* Hat dieses Kriterium überhaupt eine Altersnorm?
   Für die Module 3 und 5 und für 4.1.B ist die Antwort nein – und das ist keine
   Lücke, sondern die Regel der BRi (Seite 143). */
function altersabhaengig(nr) {
    return Object.prototype.hasOwnProperty.call(KINDER_ALTERSNORM, nr);
}

/* DER ALTERSENTSPRECHENDE SELBSTÄNDIGKEITSGRAD eines Kriteriums am Stichtag.
   Rückgabe 0..3 in der Zählung der App (0 selbständig, 3 unselbständig), oder null,
   wenn das Kriterium altersunabhängig ist oder die Daten fehlen.

   Gezählt wird, wie viele der drei Grenzen das Kind erreicht hat. Keine erreicht
   bedeutet „unselbständig" (3), alle drei bedeuten „selbständig" (0). Damit sind die
   drei Kriterien mit zusammengefasster Zelle von selbst richtig: Dort liegen alle drei
   Grenzen auf demselben Alter, also springt die Stufe von 3 unmittelbar auf 0.        */
function altersnormStufe(nr, geburt, stichtag) {
    const grenzen = KINDER_ALTERSNORM[nr];
    if (!grenzen || !geburt || !stichtag) return null;
    let erreicht = 0;
    grenzen.forEach(g => { if (alterErreicht(geburt, stichtag, g)) erreicht++; });
    return 3 - erreicht;
}

/* Ab welchem Alter wird dieses Kriterium überhaupt beurteilt?
   Das ist die erste Grenze: Solange sie nicht erreicht ist, lautet der
   altersentsprechende Grad „unselbständig" und eine Bewertung ergäbe null Punkte.
   Wird in Stufe 4 für die Begründung der gesperrten Zeile gebraucht. */
function altersnormBeurteiltAb(nr) {
    const grenzen = KINDER_ALTERSNORM[nr];
    return grenzen ? grenzen[0] : null;
}

/* Eine Altersgrenze als Text, im Dativ – für „erst ab …".
   „6 Wochen", „1 Monat", „18 Monaten", „2 Jahren und 6 Monaten", „5 Jahren". */
function altersGrenzeText(grenze) {
    if (!grenze) return '';
    if (grenze.w !== undefined) {
        return grenze.w === 1 ? '1 Woche' : grenze.w + ' Wochen';
    }
    const m = Number(grenze.m) || 0;
    if (m < 24) return m === 1 ? '1 Monat' : m + ' Monaten';
    const jahre = Math.floor(m / 12);
    const rest = m % 12;
    const j = jahre + ' Jahren';
    if (!rest) return j;
    return j + ' und ' + (rest === 1 ? '1 Monat' : rest + ' Monaten');
}

/* Die Namen der vier Stufen – je Modul anders benannt, wie in der BRi und in ITEMS.
   Modul 2 spricht von Fähigkeiten, die übrigen von Selbständigkeit. */
function altersnormBezeichnung(nr, stufe) {
    if (stufe === null || stufe === undefined) return '';
    const faehigkeit = String(nr).indexOf('4.2.') === 0;
    const namen = faehigkeit
        ? ['vorhanden/unbeeinträchtigt', 'größtenteils vorhanden',
           'in geringem Maße vorhanden', 'nicht vorhanden']
        : ['selbständig', 'überwiegend selbständig',
           'überwiegend unselbständig', 'unselbständig'];
    return namen[stufe] || '';
}
