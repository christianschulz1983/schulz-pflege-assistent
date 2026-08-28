// Teil des Pflegegradassistenten für Berater.
//
// ZWEI NUMMERIERUNGEN, EIN RECHENWERK.
// Der Medizinische Dienst nummeriert die Module 4.1 bis 4.6, die Medicproof GmbH
// nummeriert dieselben Module 5.1 bis 5.6. Inhalt und Berechnung sind identisch.
// Die App rechnet intern immer mit 4.x.y – daran wird nichts geändert, sonst müsste
// jede Regel, jeder BRi-Bezug und jeder gespeicherte Fall doppelt geführt werden.
//
// Im ERZEUGTEN SCHRIFTSTÜCK muss aber die Nummerierung stehen, die im Gutachten
// steht, auf das es sich bezieht. Sonst sucht der Leser bei „4.1.1" eine Zeile, die
// in seinem Gutachten „5.1.1" heißt. Diese Datei ist die einzige Stelle, an der
// umgestellt wird.

// Erkennt am Feld „Gutachtenorganisation", ob es ein Medicproof-Gutachten ist.
function istMedicproof(org) {
    let o = org;
    if (o === undefined || o === null) {
        const el = document.getElementById('stam-organisation');
        o = el ? el.value : '';
    }
    return /medicproof/i.test(String(o || ''));
}

// Die führende Ziffer der Modulnummerierung des Gutachtens: "4" oder "5".
function modulZiffer(org) { return istMedicproof(org) ? '5' : '4'; }

// Einzelne Kriteriumsnummer umstellen: "4.1.1" -> "5.1.1", "F 4.1.B" -> "F 5.1.B".
// Alles andere bleibt unverändert.
function zeigeNr(nr, org) {
    if (!istMedicproof(org)) return nr;
    return String(nr == null ? '' : nr).replace(/\b4(\.[1-6]\b)/g, '5$1');
}

// Modulnummer im Fließtext und in Tabellenköpfen: modulNr(1) -> "4.1" bzw. "5.1".
function modulNr(m, org) { return modulZiffer(org) + '.' + m; }

/* Nummern in einem erzeugten Text umstellen.
 *
 * AUSNAHME – WÖRTLICHE ZITATE BLEIBEN UNANGETASTET. Die Nummerierung 4.x.y ist die
 * Nummerierung der Begutachtungs-Richtlinien selbst. Steht sie in einem wörtlichen
 * BRi-Zitat, ist sie dort richtig; sie zu ändern hieße, ein Zitat zu verfälschen.
 * Medicproofs 5.x ist nur die Abschnittsnummer ihres Formulars. Deshalb wird alles
 * zwischen „ und " ausgelassen. Aus demselben Grund prüft die Zitatprüfung immer
 * den Originaltext, nie den umgestellten.
 */
function nummernImText(text, org) {
    const t = String(text == null ? '' : text);
    if (!istMedicproof(org) || !t) return t;
    // Dreiteilige Kriteriumsnummern (4.1.1) sind eindeutig und werden immer umgestellt.
    // Zweiteilige Modulnummern (4.1) NUR nach einem Hinweiswort – sonst würde aus der
    // Dezimalzahl „4.5 Punkte" ein falsches „5.5 Punkte".
    const um = s => s
        .replace(/\b4(\.[1-6]\.(?:\d{1,2}|B)\b)/g, '5$1')
        .replace(/\b(Ziffer|Abschnitt|Nummer|Nr\.|Punkt|Modul)(\s+)4(\.[1-6])\b(?!\.)/g, '$1$25$3');
    // Der Text wird an den Zitatgrenzen zerlegt; Zitate werden unverändert übernommen.
    let raus = '';
    let rest = t;
    for (;;) {
        const auf = rest.indexOf('„');
        if (auf === -1) { raus += um(rest); break; }
        const zu = rest.indexOf('“', auf + 1);
        if (zu === -1) { raus += um(rest); break; }
        raus += um(rest.slice(0, auf)) + rest.slice(auf, zu + 1);
        rest = rest.slice(zu + 1);
    }
    return raus;
}
