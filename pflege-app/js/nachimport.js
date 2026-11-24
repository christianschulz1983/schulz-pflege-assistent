/* js/nachimport.js – zwei Komfort-Abläufe NACH dem Übernehmen eines Gutachtens.
   Beide sind rein additiv: Sie führen in die BESTEHENDEN Upload-Funktionen hinein und
   ändern nichts an Einlesen, Bewertung, Zusammenführen oder Rechnung (Regel 11). Wird der
   neue Weg nicht genutzt, verhält sich die App zeichengleich wie bisher.

   Feature 1 (Regel 72) – Anhörungs-Kette im Ausweichweg (Regel 9a):
     Nach jedem bestätigten Übernehmen den nächsten Knopf einblenden:
       Erstgutachten übernommen  -> „jetzt pflegefachliche Stellungnahme hochladen"
       Stellungnahme übernommen  -> „jetzt Anhörungsschreiben / Zweitgutachten hochladen"
       Zweitgutachten übernommen -> Kette fertig, danach Feature 2.
     Der Regelweg „Fall laden" löst nichts aus (dort wird nichts importiert).

   Feature 2 (Regel 73) – Frage nach weiteren Unterlagen (alle vier Vorgänge + Kinder):
     Nach dem Übernehmen des Gutachtens: „Befunde, Berichte hochladen? Ja/Nein".
     Ja öffnet einen kleinen Auswahl-Dialog: zu den Notizen (js/unterlagen.js) ODER
     vorgangsspezifisch als Beleg (Widerspruch/Anhörung, js/belege.js) bzw. Arztbericht
     (Erstantrag/Höherstufung, js/arztberichte.js). Die Abfrage erscheint jedes Mal.

   Angestoßen wird beides aus applyReviewedImport (dem interaktiven „✓ Werte übernehmen"),
   NICHT aus applyImportedData. Der Selbsttest ruft applyImportedData direkt und löst daher
   keine Dialoge aus. */

// ---------------------------------------------------------------------------
// Pure Helfer (ohne Nebenwirkung – vom Selbsttest geprüft)
// ---------------------------------------------------------------------------

// Welche Upload-Ziele gibt es im aktuellen Vorgang? „Notizen" immer; der vorgangs-
// spezifische Weg ist Beleg (Widerspruch/Anhörung) bzw. Arztbericht (Erstantrag/Höherstufung).
function nachImportZiele(modus) {
    modus = modus || (typeof appModus !== 'undefined' ? appModus : 'widerspruch');
    const ziele = [{ key: 'notizen', text: 'Zu den Notizen' }];
    if (modus === 'widerspruch' || modus === 'anhoerung') {
        ziele.push({ key: 'beleg', text: 'Als ärztlicher Beleg' });
    } else if (modus === 'erstantrag' || modus === 'hoeherstufung') {
        ziele.push({ key: 'arztbericht', text: 'Als Arztbericht (in die Erfassung)' });
    }
    return ziele;
}

// Löst den Upload für ein Ziel aus. Rückgabe true, wenn ein Eingabefeld gefunden wurde.
// Trägt selbst nichts ein – die bestehende Lese-/Prüffunktion übernimmt wie gehabt.
function nachImportUploadStart(key) {
    if (key === 'notizen') {
        if (typeof unterlagenWaehlen === 'function') { unterlagenWaehlen(); return true; }
    } else if (key === 'beleg') {
        const el = document.getElementById('anlagenFiles');
        if (el) { el.click(); return true; }
    } else if (key === 'arztbericht') {
        if (typeof berichteWaehlen === 'function') { berichteWaehlen(); return true; }
    }
    return false;
}

// Die Kette der Anhörung (Ausweichweg): was kommt nach welchem Schritt?
// null = kein weiterer Schritt (nach dem Zweitgutachten).
function anhoerungKetteSchritt(schritt) {
    if (schritt === 'nachErst') return {
        titel: 'Erstgutachten übernommen',
        text: 'Lesen Sie nun Ihre damalige pflegefachliche Stellungnahme ein. Aus Gutachten und '
            + 'Stellungnahme zusammen entsteht Ihr damaliger Bewertungsstand.',
        knopf: 'Jetzt pflegefachliche Stellungnahme hochladen',
        inputId: 'grundlageStellungnahme'
    };
    if (schritt === 'nachStellungnahme') return {
        titel: 'Stellungnahme übernommen',
        text: 'Lesen Sie jetzt das Anhörungsschreiben der Kasse und das Zweitgutachten ein – '
            + 'beides zusammen oder einzeln, je nachdem wie die Kasse es verschickt hat.',
        knopf: 'Jetzt Anhörungsschreiben / Zweitgutachten hochladen',
        inputId: 'anhoerungFiles'
    };
    return null;
}

// ---------------------------------------------------------------------------
// Dialog (ein wiederverwendbares Modal nach dem Muster von #confirm-modal)
// ---------------------------------------------------------------------------

function nachImportModalSchliessen() {
    const o = document.getElementById('nachimport-overlay');
    if (o) o.remove();
}

// buttons: [{ text, kind ('btn-primary'|'btn-secondary'), fn }]. descHtml ist vertrauter,
// statischer HTML-Text aus diesem Modul (keine Benutzereingabe).
function nachImportModal(titel, descHtml, buttons) {
    nachImportModalSchliessen();
    const o = document.createElement('div');
    o.id = 'nachimport-overlay';
    o.className = 'modal-overlay active';
    const foot = (buttons || []).map((b, i) =>
        '<button class="btn ' + (b.kind || 'btn-secondary') + '" data-ni="' + i + '">'
        + escapeHtml(b.text) + '</button>').join('');
    o.innerHTML = '<div class="modal-box"><div class="modal-box-body">'
        + '<div class="modal-title">' + escapeHtml(titel) + '</div>'
        + '<p class="modal-desc">' + descHtml + '</p>'
        + '</div><div class="modal-box-footer">' + foot + '</div></div>';
    document.body.appendChild(o);
    (buttons || []).forEach((b, i) => {
        const btn = o.querySelector('[data-ni="' + i + '"]');
        if (btn) btn.onclick = function () {
            nachImportModalSchliessen();
            if (typeof b.fn === 'function') b.fn();
        };
    });
    return o;
}

// Feature 2, Schritt 1: Frage nach weiteren Unterlagen.
function nachImportFrage() {
    nachImportModal('Weitere Unterlagen?',
        'Möchten Sie jetzt Befunde, Arztberichte oder andere Unterlagen hochladen? '
        + 'Nichts wird dabei ungefragt eingetragen – Sie prüfen jede Angabe wie gewohnt.',
        [
            { text: 'Nein, fertig', kind: 'btn-secondary', fn: null },
            { text: 'Ja, Unterlagen hochladen', kind: 'btn-primary', fn: nachImportWahl }
        ]);
}

// Feature 2, Schritt 2: Wohin soll die Unterlage? (ein Knopf je Ziel)
function nachImportWahl() {
    const ziele = nachImportZiele();
    const buttons = [{ text: 'Abbrechen', kind: 'btn-secondary', fn: null }];
    ziele.forEach(z => buttons.push({
        text: z.text, kind: 'btn-primary',
        fn: function () { nachImportUploadStart(z.key); }
    }));
    nachImportModal('Wohin soll die Unterlage?',
        'Zu den Notizen geht jede Unterlage als dokumentierter Eintrag und fließt in die '
        + 'Begründungstexte ein. Der vorgangsspezifische Weg gleicht die Unterlage zusätzlich '
        + 'rechnerisch mit dem Gutachten ab.',
        buttons);
}

// Feature 1: Anhörungs-Kette. Zeigt den nächsten Knopf; nach dem Zweitgutachten
// geht es in Feature 2 über.
function anhoerungKette(schritt) {
    const s = anhoerungKetteSchritt(schritt);
    if (!s) { nachImportFrage(); return; }
    nachImportModal(s.titel, escapeHtml(s.text), [
        { text: 'Später', kind: 'btn-secondary', fn: null },
        {
            text: s.knopf, kind: 'btn-primary',
            fn: function () { const el = document.getElementById(s.inputId); if (el) el.click(); }
        }
    ]);
}

// Der EINE Einstieg aus applyReviewedImport. ziel: 'orig' | 'stellungnahme' | 'zweit'.
// Entscheidet, welcher Komfort-Ablauf greift – ohne je eine Bewertung zu setzen.
function nachImportAblauf(ziel) {
    const modus = (typeof appModus !== 'undefined') ? appModus : 'widerspruch';
    if (modus === 'anhoerung') {
        if (ziel === 'orig') { anhoerungKette('nachErst'); return; }
        if (ziel === 'stellungnahme') { anhoerungKette('nachStellungnahme'); return; }
        if (ziel === 'zweit') { anhoerungKette('nachZweit'); return; }  // -> Feature 2
    }
    // Widerspruch, Erstantrag, Höherstufung und Kinderfälle: direkt die Unterlagen-Frage
    nachImportFrage();
}
