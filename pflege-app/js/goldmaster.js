/* GOLDEN MASTER – vollständige Fälle mit von Hand gerechnetem Sollwert.
   ------------------------------------------------------------------------------
   Zweck: Die 1596 Einzelprüfungen prüfen Bausteine. Hier wird die GANZE Rechenkette
   geprüft – von den 65 Kriterien über die vier Modul-5-Gruppen und die Inkontinenz-
   bedingung bis zu Gesamtpunkten und Pflegegrad. Angelegt vor dem Einbau der
   Kinderbegutachtung: Jede Änderung an der Berechnung muss diese Fälle weiterhin
   zeichengenau reproduzieren. Tut sie das nicht, ist ein Erwachsenenfall betroffen.

   WICHTIG: Die Sollwerte sind NICHT die Ausgabe des Programms. Sie sind von Hand
   aus den Tabellen der BRi gerechnet und in der Herleitung je Fall nachgeschrieben.
   Ein aufgezeichneter Sollwert würde nur bestätigen, dass das Programm tut, was es
   gestern tat – auch wenn es gestern schon falsch rechnete.

   Alle Angaben sind frei erfunden (Regel 32). Es gibt keine Namen, weil für die
   Rechnung keine gebraucht werden.

   Die Fälle sind nach Kriteriumsnummer geschrieben, nicht nach der internen id –
   so bleibt die Tabelle lesbar und übersteht ein Umsortieren von ITEMS.             */

/* Stufen je Kriterium (Index 0..3). Nicht genannte Kriterien stehen auf 0.
   Modul 5 (außer 4.5.16) wird als { count, period } angegeben: D täglich,
   W wöchentlich, M monatlich. */
const GOLD_FAELLE = [
    {
        name: 'Fall A – mittlere Einschränkung',
        /* Modul 1: 0+0+1+1+2 = 4 Einzelpunkte   -> Spanne 4–5   ->  5,00
           Modul 2: 0+1+1+1+0+0+0+1+0+0+0 = 4    -> Spanne 2–5   ->  3,75
           Modul 3: keine Auffälligkeit = 0      -> Spanne 0     ->  0,00
           höchster Wert aus Modul 2 und 3       ->  3,75
           Modul 4: 1+1+1+2+1+1+0 = 7, dazu 4.4.10 Stufe 1 = 2 Punkte
                    (Doppelwertung) -> 9         -> Spanne 8–18  -> 20,00
           Modul 5: Gruppe A 3x täglich = 3,0 -> 1 Punkt (ab 1)
                    Gruppe C 1 Arztbesuch im Monat = 1,0 -> 0 Punkte (erst ab 4,3)
                    Summe 1                      -> Spanne 1     ->  5,00
           Modul 6: 1+0+1+1+0+0 = 3              -> Spanne 1–3   ->  3,75
           Gesamt 5,00 + 3,75 + 20,00 + 5,00 + 3,75 = 37,50 -> Pflegegrad 2 (ab 27) */
        special: 0,
        kontinenz: { harn: 0, stuhl: 0 },
        werte: {
            '4.1.3': 1, '4.1.4': 1, '4.1.5': 2,
            '4.2.2': 1, '4.2.3': 1, '4.2.4': 1, '4.2.8': 1,
            '4.4.1': 1, '4.4.2': 1, '4.4.3': 1, '4.4.4': 2, '4.4.5': 1, '4.4.6': 1,
            '4.4.10': 1,
            '4.5.1': { count: 3, period: 'D' },
            '4.5.13': { count: 1, period: 'M' },
            '4.6.1': 1, '4.6.3': 1, '4.6.4': 1
        },
        soll: { raws: [4, 4, 0, 9, 1, 3], weights: [5, 3.75, 0, 20, 5, 3.75], total: 37.5, pg: 2 }
    },
    {
        name: 'Fall B – schwerste Einschränkung, Inkontinenz zählt mit',
        /* Modul 1: 2+2+3+3+3 = 13                -> Spanne 10–15 -> 10,00
           Modul 2: elfmal Stufe 2 = 22           -> Spanne 17–33 -> 15,00
           Modul 3: 4.3.1 häufig = 3, 4.3.2 häufig = 3, 4.3.8 täglich = 5 -> 11
                                                  -> Spanne 7–65  -> 15,00
           höchster Wert aus Modul 2 und 3        -> 15,00
           Modul 4: 4.4.1–4.4.6 je 3 = 18, 4.4.7 = 2 -> 20
                    4.4.8 Dreifachwertung Stufe 3 = 9  -> 29
                    4.4.9 Doppelwertung Stufe 3   = 6  -> 35
                    4.4.10 Doppelwertung Stufe 3  = 6  -> 41
                    4.4.11 und 4.4.12 je 3 = 6 – zählen mit, weil komplett
                    inkontinent (Stufe 3 >= 2, BRi S. 103)  -> 47
                                                  -> Spanne 37–54 -> 40,00
           Modul 5: Gruppe A 4x + 2x täglich = 6,0 -> 2 Punkte (über 3)
                    Gruppe B 1x täglich = 1,0      -> 2 Punkte (ab 1)
                    Gruppe C 1 Besuch/Monat = 1,0 und 2 Besuche/Woche = 8,6
                             zusammen 9,6          -> 2 Punkte (ab 8,6)
                    Gruppe D Diät Stufe 1          -> 1 Punkt
                    Summe 7                        -> Spanne 6–15 -> 20,00
           Modul 6: 3+2+3+3+2+3 = 16              -> Spanne 12–18 -> 15,00
           Gesamt 10 + 15 + 40 + 20 + 15 = 100,00 -> Pflegegrad 5 (ab 90)          */
        special: 0,
        kontinenz: { harn: 3, stuhl: 3 },
        werte: {
            '4.1.1': 2, '4.1.2': 2, '4.1.3': 3, '4.1.4': 3, '4.1.5': 3,
            '4.2.1': 2, '4.2.2': 2, '4.2.3': 2, '4.2.4': 2, '4.2.5': 2, '4.2.6': 2,
            '4.2.7': 2, '4.2.8': 2, '4.2.9': 2, '4.2.10': 2, '4.2.11': 2,
            '4.3.1': 2, '4.3.2': 2, '4.3.8': 3,
            '4.4.1': 3, '4.4.2': 3, '4.4.3': 3, '4.4.4': 3, '4.4.5': 3, '4.4.6': 3,
            '4.4.7': 2, '4.4.8': 3, '4.4.9': 3, '4.4.10': 3, '4.4.11': 3, '4.4.12': 3,
            '4.5.1': { count: 4, period: 'D' },
            '4.5.7': { count: 2, period: 'D' },
            '4.5.8': { count: 1, period: 'D' },
            '4.5.13': { count: 1, period: 'M' },
            '4.5.14': { count: 2, period: 'W' },
            '4.5.16': 1,
            '4.6.1': 3, '4.6.2': 2, '4.6.3': 3, '4.6.4': 3, '4.6.5': 2, '4.6.6': 3
        },
        soll: { raws: [13, 22, 11, 47, 7, 16], weights: [10, 15, 15, 40, 20, 15], total: 100, pg: 5 }
    },
    {
        name: 'Fall C – Inkontinenz zählt NICHT mit',
        /* Derselbe Aufbau in Modul 4 wie oben, aber „überwiegend kontinent" (Stufe 1).
           4.4.11 und 4.4.12 stehen auf Stufe 3 und bleiben trotzdem draußen – das ist
           der Prüfstein für zaehltMit(). Mit ihnen wären es 9 Einzelpunkte und damit
           20,00 gewichtete Punkte, ohne sie 3 und damit 10,00.

           Modul 1: 0+0+0+1+2 = 3                 -> Spanne 2–3  ->  2,50
           Modul 2: 0+0+1+1+1+1+1+1+0+0+0 = 6     -> Spanne 6–10 ->  7,50
           Modul 3: 4.3.11 häufig = 3             -> Spanne 3–4  ->  7,50
           höchster Wert aus Modul 2 und 3        ->  7,50 (beide gleich)
           Modul 4: 1+1+1 = 3 (4.4.11/4.4.12 zählen nicht)
                                                  -> Spanne 3–7  -> 10,00
           Modul 5: Gruppe A 1x täglich = 1,0     -> 1 Punkt
                    Gruppe B 1x täglich = 1,0     -> 2 Punkte
                    Gruppe C 1 Besuch/Woche = 4,3 -> 1 Punkt (genau an der Grenze)
                    Summe 4                       -> Spanne 4–5  -> 15,00
           Modul 6: 1+1+1+1+0+1 = 5               -> Spanne 4–6  ->  7,50
           Gesamt 2,50 + 7,50 + 10,00 + 15,00 + 7,50 = 42,50 -> Pflegegrad 2        */
        special: 0,
        kontinenz: { harn: 1, stuhl: 1 },
        werte: {
            '4.1.4': 1, '4.1.5': 2,
            '4.2.3': 1, '4.2.4': 1, '4.2.5': 1, '4.2.6': 1, '4.2.7': 1, '4.2.8': 1,
            '4.3.11': 2,
            '4.4.1': 1, '4.4.3': 1, '4.4.4': 1, '4.4.11': 3, '4.4.12': 3,
            '4.5.1': { count: 1, period: 'D' },
            '4.5.11': { count: 1, period: 'D' },
            '4.5.14': { count: 1, period: 'W' },
            '4.6.1': 1, '4.6.2': 1, '4.6.3': 1, '4.6.4': 1, '4.6.6': 1
        },
        soll: { raws: [3, 6, 3, 3, 4, 5], weights: [2.5, 7.5, 7.5, 10, 15, 7.5], total: 42.5, pg: 2 }
    },
    {
        name: 'Fall D – besondere Bedarfskonstellation',
        /* 4.1.B: Gebrauchsunfähigkeit beider Arme und Beine (§ 15 Abs. 4 SGB XI).
           Sofort 100 Punkte und Pflegegrad 5, ohne dass ein Kriterium bewertet ist.
           Die Einzelpunkte bleiben dabei bei 0 – das ist richtig so und darf sich
           nicht ändern.                                                             */
        special: 1,
        kontinenz: { harn: 0, stuhl: 0 },
        werte: {},
        soll: { raws: [0, 0, 0, 0, 0, 0], weights: [0, 0, 0, 0, 0, 0], total: 100, pg: 5 }
    },
    {
        name: 'Fall E – Rundung in Modul 5, Gruppe C',
        /* Dieser Fall existiert wegen EINES Fehlers, der schon einmal da war: In Gruppe C
           fehlte die Rundung auf vier Nachkommastellen (BRi, Fußnote 13 zu Modul 5).
           3 × 4,3 ist für den Rechner 12,899999999999999 und liegt damit „unter 12,9" –
           dreimal wöchentlich Therapie brachte 2 statt 3 Punkte.

           Bei der ersten Gegenprobe fiel auf, dass die Fälle A bis D das nicht bemerken:
           2 × 4,3 ergibt binär exakt 8,6, weil das Verdoppeln nur den Exponenten erhöht.
           Erst der dritte Besuch zeigt den Fehler. Deshalb dieser Fall – und deshalb
           führen die Häufigkeiten hier bis knapp über eine Modulgrenze:

           Modul 5: Gruppe A 1x täglich = 1,0            -> 1 Punkt  (ab 1)
                    Gruppe B 1x täglich = 1,0            -> 2 Punkte (ab 1)
                    Gruppe C 3 Besuche/Woche = 3 × 4,3 = 12,9 -> 3 Punkte (ab 12,9)
                    Summe 6                              -> Spanne 6–15 -> 20,00
           Alle übrigen Module 0. Gesamt 20,00 -> Pflegegrad 1 (ab 12,5)

           Ohne die Rundung wären es 2 statt 3 Punkte in Gruppe C, Summe 5 und damit
           15,00 gewichtete Punkte – drei Prüfungen dieses Falls schlagen dann an.      */
        special: 0,
        kontinenz: { harn: 0, stuhl: 0 },
        werte: {
            '4.5.1': { count: 1, period: 'D' },
            '4.5.8': { count: 1, period: 'D' },
            '4.5.14': { count: 3, period: 'W' }
        },
        soll: { raws: [0, 0, 0, 0, 6, 0], weights: [0, 0, 0, 0, 20, 0], total: 20, pg: 1 }
    },
    {
        name: 'Fall F – Modul 3 ist höher als Modul 2',
        /* Zweite Lücke, die beim Anlegen der Fälle auffiel: In A bis E ist Modul 2 immer
           größer oder gleich Modul 3. Die Regel „es zählt nur der höhere der beiden Werte"
           wird damit nie in der anderen Richtung geprüft – ein Programm, das schlicht
           Modul 2 nähme, bestünde alle anderen Fälle.

           Modul 2: nur 4.2.1 Stufe 1 = 1 Einzelpunkt   -> Spanne 0–1  ->  0,00
           Modul 3: 4.3.1 täglich = 5, 4.3.9 häufig = 3 -> 8
                                                        -> Spanne 7–65 -> 15,00
           höchster Wert aus Modul 2 und 3              -> 15,00 (aus Modul 3)
           Alle übrigen Module 0. Gesamt 15,00 -> Pflegegrad 1 (ab 12,5)

           Nähme das Programm Modul 2 statt des höheren Wertes, wären es 0,00 Punkte
           und gar kein Pflegegrad.                                                     */
        special: 0,
        kontinenz: { harn: 0, stuhl: 0 },
        werte: { '4.2.1': 1, '4.3.1': 3, '4.3.9': 2 },
        soll: { raws: [0, 1, 8, 0, 0, 0], weights: [0, 0, 15, 0, 0, 0], total: 15, pg: 1 }
    }
];

/* Baut aus einem Falleintrag einen vollständigen Bewertungsstand.
   Nicht genannte Kriterien bekommen ausdrücklich ihren Nullwert – ein fehlender
   Eintrag in Modul 5 wäre sonst undefined und die Rechnung bräche anders ab als
   im echten Betrieb. */
function goldZustand(fall) {
    const values = {};
    ITEMS.forEach(it => {
        if (!it.m) return;                                  // 4.1.B steht in special
        const vorgabe = fall.werte[it.nr];
        if (it.m === 5 && it.group !== 'D') {
            values[it.id] = (vorgabe && typeof vorgabe === 'object')
                ? { count: Number(vorgabe.count) || 0, period: vorgabe.period || 'W' }
                : { count: 0, period: 'W' };
        } else {
            values[it.id] = Number(vorgabe) || 0;
        }
    });
    return {
        special: fall.special || 0,
        values: values,
        kontinenz: { harn: fall.kontinenz.harn, stuhl: fall.kontinenz.stuhl }
    };
}

/* Rechnet alle Fälle und vergleicht mit dem Sollwert.
   Rückgabe: Liste von { name, ok, ist, soll } – dieselbe Form, die der Selbsttest
   ohnehin sammelt, damit der Abschnitt dort nur noch anhängen muss. */
function goldMasterPruefen() {
    const ergebnisse = [];
    const zahl = v => Math.round(Number(v) * 10000) / 10000;

    GOLD_FAELLE.forEach(fall => {
        const st = goldZustand(fall);
        const r = calculateInternal(st);
        for (let m = 0; m < 6; m++) {
            ergebnisse.push({
                name: `${fall.name}: Modul ${m + 1} Einzelpunkte`,
                ok: zahl(r.raws[m]) === zahl(fall.soll.raws[m]),
                ist: r.raws[m], soll: fall.soll.raws[m]
            });
            ergebnisse.push({
                name: `${fall.name}: Modul ${m + 1} gewichtet`,
                ok: zahl(r.weights[m]) === zahl(fall.soll.weights[m]),
                ist: r.weights[m], soll: fall.soll.weights[m]
            });
        }
        ergebnisse.push({
            name: `${fall.name}: Gesamtpunkte`,
            ok: zahl(r.total) === zahl(fall.soll.total),
            ist: r.total, soll: fall.soll.total
        });
        ergebnisse.push({
            name: `${fall.name}: Pflegegrad`,
            ok: Number(r.pg) === Number(fall.soll.pg),
            ist: r.pg, soll: fall.soll.pg
        });
    });
    return ergebnisse;
}

/* Die Kriterienliste der eigenen Einschätzung – Zustand VOR der Kinderbegutachtung.
   64 Zeilen, 64 bedienbare Regler, kein gesperrter. Stufe 4 wird hier Zeilen sperren;
   für Erwachsene muss diese Messung unverändert bleiben. */
function goldOberflaeche() {
    const zeilen = [...document.querySelectorAll('tr.nba-row')]
        .filter(tr => tr.id.indexOf('row-own-') === 0);
    const regler = zeilen.map(tr => tr.querySelector('input[type=range]')).filter(Boolean);
    return {
        zeilen: zeilen.length,
        regler: regler.length,
        gesperrt: regler.filter(r => r.disabled).length
    };
}
