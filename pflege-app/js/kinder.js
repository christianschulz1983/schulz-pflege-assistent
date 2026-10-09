/* DIE KINDERBEGUTACHTUNG IN DER KRITERIENLISTE.
   ------------------------------------------------------------------------------
   Vorgabe des Verfassers: „Die Tabelle müsste sich entsprechend des erfassten Alters
   aufbauen und demzufolge auch nur diese Module veränderbar sein. Bei den anderen
   müsste lediglich nicht bearbeitbar aufgrund Alter so und so stehen. Nicht
   verschwinden oder ausblenden. Aber nicht bearbeitbar."

   Warum stehen bleiben und nicht ausblenden: Eine gesperrte Zeile mit Begründung zeigt
   dem Sachbearbeiter der Kasse, dass das Kriterium geprüft und bewusst nicht bewertet
   wurde. Eine fehlende Zeile sieht aus wie ein Versäumnis.

   WANN WIRD GESPERRT. Genau dann, wenn der altersentsprechende Selbständigkeitsgrad
   selbst „unselbständig" lautet (Stufe 3). Die BRi, Seite 143: „Kriterien, die
   entwicklungsbedingt bis zu einem bestimmten Alter auch bei gesunden Kindern als
   unselbständig zu beurteilen sind, werden im Formulargutachten entsprechend
   gekennzeichnet und müssen nicht beurteilt werden."

   STAND STUFE 4: Dies ist ANSICHT. Die Berechnung ist unverändert und behandelt einen
   Kinderfall weiterhin wie einen Erwachsenenfall – die Differenzrechnung kommt in
   Stufe 5. Bis dahin darf ein Kinderfall nicht produktiv gerechnet werden; der
   Selbsttest hält fest, dass `calculateInternal` nichts davon weiß.                   */

/* Was bedeutet das Alter für dieses eine Kriterium?
   Die EINE Stelle, die das beantwortet – Ansicht wie Rechnung fragen später hier.

   Rückgabe:
     aktiv      – gilt für diesen Fall überhaupt der Kindermaßstab?
     gesperrt   – ist das Kriterium in diesem Alter nicht zu beurteilen?
     normStufe  – altersentsprechender Grad, 0..3 (null, wenn nicht anwendbar)
     normText   – dessen Bezeichnung, je Modul unterschiedlich benannt
     abText     – ab welchem Alter es beurteilt wird, als Text                          */
/* MODULE, DIE BIS ZU 18 MONATEN GAR NICHT BEWERTET WERDEN.
   BRi Seite 200: „Für die Feststellung von Pflegebedürftigkeit fließen bei Kindern im
   Alter bis zu 18 Monaten nur die folgenden Module beziehungsweise Kriterien in die
   Bewertung ein: Modul 1 – es wird nur das Kriterium KF 4.1.B Besondere
   Bedarfskonstellation beurteilt; Modul 3; Modul 4 wird ersetzt durch das Kriterium
   KF 4.4.0 …; Modul 5."
   Die Module 2 und 6 fehlen in dieser Aufzählung ganz, von Modul 1 bleibt nur 4.1.B,
   und Modul 4 wird durch eine einzige Frage ersetzt. In der Zählung der App sind das
   die Module 1, 2, 4 und 6 – 4.1.B steht nicht in `m`, sondern in `special`, und
   bleibt deshalb von selbst unberührt. */
const KINDER_MODULE_BIS_18_MONATE_AUSGESETZT = [1, 2, 4, 6];

function kinderModulAusgesetzt(m) {
    if (typeof kinderLage !== 'function') return false;
    if (kinderLage().klasse !== ALTERSKLASSE.SAEUGLING) return false;
    return KINDER_MODULE_BIS_18_MONATE_AUSGESETZT.indexOf(Number(m)) >= 0;
}

function kinderKriteriumLage(nr) {
    const leer = { aktiv: false, gesperrt: false, ausgesetzt: false,
                   normStufe: null, normText: '', abText: '' };
    if (typeof kinderLage !== 'function' || !altersabhaengig(nr)) return leer;

    const lage = kinderLage();
    // Ohne vollständige Daten und ab elf Jahren gilt unverändert der Erwachsenenmaßstab.
    if (lage.klasse !== ALTERSKLASSE.KIND && lage.klasse !== ALTERSKLASSE.SAEUGLING) return leer;

    // Bis zu 18 Monaten entfällt das ganze Modul – nicht nur einzelne Kriterien.
    const item = ITEMS.find(i => i.nr === nr);
    if (item && kinderModulAusgesetzt(item.m)) {
        return { aktiv: true, gesperrt: true, ausgesetzt: true,
                 normStufe: 3, normText: altersnormBezeichnung(nr, 3), abText: '18 Monaten' };
    }

    const stufe = altersnormStufe(nr, lage.geburt, lage.stichtag);
    if (stufe === null) return leer;

    return {
        aktiv: true,
        gesperrt: stufe === 3,
        ausgesetzt: false,
        normStufe: stufe,
        normText: altersnormBezeichnung(nr, stufe),
        abText: altersGrenzeText(altersnormBeurteiltAb(nr))
    };
}

/* KF 4.4.0 – die eine Frage, die bei Kindern bis 18 Monate das ganze Modul 4 ersetzt.
   BRi Seite 176: „Bei Kindern im Alter bis zu 18 Monaten werden die Kriterien KF 4.4.1
   bis KF 4.4.13 durch die Frage KF 4.4.0 ersetzt: Bestehen gravierende Probleme bei
   der Nahrungsaufnahme, die einen außergewöhnlich pflegeintensiven Hilfebedarf im
   Bereich der Ernährung auslösen?"
   Wird sie bejaht, sind nach Seite 258 **20 Einzelpunkte** vorgegeben. In der Tabelle
   des Moduls 4 (MODUL_SPANNEN) fällt das in die Spanne 19–36 und ergibt damit 30
   gewichtete Punkte – allein das reicht bei den verschobenen Schwellen für
   Pflegegrad 3. */
const KINDER_NAHRUNG_PUNKTE = 20;

function kinderNahrungGilt() {
    return typeof kinderLage === 'function'
        && kinderLage().klasse === ALTERSKLASSE.SAEUGLING;
}

function kinderNahrungPunkte(st) {
    if (!kinderNahrungGilt()) return 0;
    return (st && st.nahrung) ? KINDER_NAHRUNG_PUNKTE : 0;
}

/* Der Text in einer gesperrten Zeile. Er nennt den Grund und das Alter – „aufgrund
   Alter so und so", wie der Verfasser es vorgegeben hat. */
function kinderSperrText(nr) {
    const l = kinderKriteriumLage(nr);
    if (!l.gesperrt) return '';
    if (l.ausgesetzt) {
        const item = ITEMS.find(i => i.nr === nr);
        const m = item ? item.m : '';
        return 'Nicht bearbeitbar: Bei Kindern bis zu 18 Monaten wird Modul ' + m
             + ' nicht bewertet (§ 15 Absatz 7 SGB XI). Gewertet werden nur die Module 3 '
             + 'und 5, die besondere Bedarfskonstellation und die Frage zur Nahrungsaufnahme.';
    }
    const grad = altersnormBezeichnung(nr, 3);     // „unselbständig" bzw. „nicht vorhanden"
    const ist = String(nr).indexOf('4.2.') === 0
        ? 'ist diese Fähigkeit auch bei einem altersentsprechend entwickelten Kind ' + grad
        : 'ist auch ein altersentsprechend entwickeltes Kind hier ' + grad;
    return 'Nicht bearbeitbar: erst ab ' + l.abText + ' zu beurteilen – bis dahin ' + ist + '.';
}

/* Der Text in einer bearbeitbaren Zeile eines Kinderfalls.
   Ohne ihn wäre später nicht nachvollziehbar, warum „unselbständig" nur zwei statt
   drei Punkte ergibt. */
function kinderNormText(nr) {
    const l = kinderKriteriumLage(nr);
    if (!l.aktiv || l.gesperrt) return '';
    return 'Altersentsprechend: ' + l.normText;
}

/* Die Kriterienliste hängt am Alter – ändert sich eines der beiden Daten, muss sie
   neu aufgebaut werden. Die beiden Felder sind Datumsfelder mit `onchange`; sie
   feuern beim Verlassen, nicht beim Tippen. Regel 23 (beim Tippen nie neu zeichnen)
   ist damit gewahrt. */
function kinderAnsichtAktualisieren() {
    if (typeof alterHinweisZeigen === 'function') alterHinweisZeigen();
    if (typeof fillTable !== 'function') return;
    if (!document.getElementById('table-body-own')) return;
    fillTable('own');
    // Die Frage KF 4.4.0 erscheint und verschwindet mit der Altersklasse.
    if (typeof syncSpecialUI === 'function') syncSpecialUI();
    if (typeof calculate === 'function') calculate('own');
}
