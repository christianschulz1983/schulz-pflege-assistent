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
function kinderKriteriumLage(nr) {
    const leer = { aktiv: false, gesperrt: false, normStufe: null, normText: '', abText: '' };
    if (typeof kinderLage !== 'function' || !altersabhaengig(nr)) return leer;

    const lage = kinderLage();
    // Ohne vollständige Daten und ab elf Jahren gilt unverändert der Erwachsenenmaßstab.
    if (lage.klasse !== ALTERSKLASSE.KIND && lage.klasse !== ALTERSKLASSE.SAEUGLING) return leer;

    const stufe = altersnormStufe(nr, lage.geburt, lage.stichtag);
    if (stufe === null) return leer;

    return {
        aktiv: true,
        gesperrt: stufe === 3,
        normStufe: stufe,
        normText: altersnormBezeichnung(nr, stufe),
        abText: altersGrenzeText(altersnormBeurteiltAb(nr))
    };
}

/* Der Text in einer gesperrten Zeile. Er nennt den Grund und das Alter – „aufgrund
   Alter so und so", wie der Verfasser es vorgegeben hat. */
function kinderSperrText(nr) {
    const l = kinderKriteriumLage(nr);
    if (!l.gesperrt) return '';
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
    if (typeof calculate === 'function') calculate('own');
}
