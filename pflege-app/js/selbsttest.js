// Selbsttest des Pflegegradassistenten für Berater.
// Prüft die kritischen Wege des Widerspruchs auf Knopfdruck. Der Test sichert den
// aktuellen Fall vorher und stellt ihn danach wieder her – er verändert nichts.

// Asynchron, weil einzelne Prüfungen die KI-Wege mit einer nachgestellten Antwort durchlaufen.
async function selbsttest() {
    const pruefungen = [];
    const pruefe = (name, istWert, sollWert) => {
        const ok = JSON.stringify(istWert) === JSON.stringify(sollWert);
        pruefungen.push({ name, ok, ist: istWert, soll: sollWert });
    };
    const pruefeWahr = (name, bedingung, hinweis) => {
        pruefungen.push({ name, ok: !!bedingung, ist: !!bedingung, soll: true, hinweis: hinweis || '' });
    };

    // Aktuellen Stand sichern, damit der Test keine Arbeit zerstört
    const sicherung = {
        orig: JSON.parse(JSON.stringify(stateOrig)),
        eigen: JSON.parse(JSON.stringify(stateEigene)),
        notizen: erstgespraechNotes,
        entwurf: appealDraft,
        // Der Test schreibt Probedateien; sein Nachweis darf nicht im echten stehen bleiben.
        speicherungen: (() => { try { return localStorage.getItem(SPEICHER_PROTOKOLL); } catch (e) { return null; } })()
    };

    try {
        // ---------- 1. Daten vollständig geladen ----------
        pruefe('Kriterienkatalog (ITEMS)', typeof ITEMS !== 'undefined' ? ITEMS.length : 0, 65);
        pruefe('BRi-Texte', typeof BRI_KRITERIEN !== 'undefined' ? Object.keys(BRI_KRITERIEN).length : 0, 65);
        pruefe('Praxishinweise', typeof LAIEN_HINWEISE !== 'undefined' ? Object.keys(LAIEN_HINWEISE).length : 0, 58);
        pruefe('Handreichung im Wortlaut', typeof LAIEN_TEXTE !== 'undefined' ? Object.keys(LAIEN_TEXTE).length : 0, 58);
        pruefe('Durchführungsarten', typeof DURCHFUEHRUNGSARTEN !== 'undefined' ? DURCHFUEHRUNGSARTEN.length : 0, 3);
        pruefeWahr('PDF-Anzeige geladen', typeof pdfjsLib !== 'undefined');

        // ---------- 2. Alle Programmteile vorhanden ----------
        const kern = ['aiReadGutachten', 'buildStellungnahme', 'generateAppealText', 'mergeStellungnahme',
            'calculateInternal', 'computeDiffs', 'unbelegteZitate', 'exportAppealWord', 'saveCase', 'loadCase',
            'schlageWiderspruchspunkteVor', 'generateBegruendungen', 'getVerfasser', 'normalizeArt', 'ensureDiagRows'];
        const fehlend = kern.filter(f => typeof window[f] !== 'function');
        pruefe('Programmteile geladen', fehlend, []);

        // ---------- 3. Modul 5 nach BRi ----------
        const leerenM5 = () => ITEMS.filter(i => i.m === 5)
            .forEach(i => { stateEigene.values[i.id] = (i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
        const m5 = () => calculateInternal('own').raws[4];
        const setzeM5 = (id, anzahl, zeitraum) => { stateEigene.values[id] = { count: anzahl, period: zeitraum }; };

        leerenM5(); setzeM5(43, 3, 'D'); setzeM5(44, 3, 'M'); setzeM5(47, 1, 'W');
        pruefe('Modul 5, Gruppe A (BRi-Beispiel 3,24/Tag)', m5(), 2);
        leerenM5(); setzeM5(52, 1, 'D'); setzeM5(50, 2, 'W');
        pruefe('Modul 5, Gruppe B (BRi-Beispiel 1,29/Tag)', m5(), 2);
        leerenM5(); setzeM5(57, 1, 'M'); setzeM5(55, 1, 'W');
        pruefe('Modul 5, Gruppe C (BRi-Beispiel 6,3)', m5(), 1);
        leerenM5(); setzeM5(54, 1, 'D');
        pruefe('Modul 5, Beatmung (Faktor 60)', m5(), 6);
        leerenM5(); setzeM5(43, 3, 'D');
        pruefe('Modul 5, Gruppe A Grenze 3/Tag', m5(), 1);
        leerenM5(); setzeM5(43, 9, 'D');
        pruefe('Modul 5, Gruppe A Grenze 9/Tag', m5(), 3);
        leerenM5();

        // ---------- 4. Punkte und Pflegegrad ----------
        const alleAuf = (modul, stufe) => ITEMS.filter(i => i.m === modul && i.opts)
            .forEach(i => { stateEigene.values[i.id] = (stufe === 'max') ? i.opts.length - 1 : stufe; });
        const leeren = () => {
            ITEMS.forEach(i => { if (i.m && i.opts) { stateOrig.values[i.id] = 0; stateEigene.values[i.id] = 0; } });
            leerenM5();
            ITEMS.filter(i => i.m === 5).forEach(i => { stateOrig.values[i.id] = (i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            delete stateOrig.extracted;
        };
        leeren();
        pruefe('Leerer Fall ergibt keinen Pflegegrad', calculateInternal('own').pg, 0);
        // Ein unzulässiger Stufenindex darf die Berechnung nicht unbrauchbar machen
        const unzulaessig = ITEMS.find(i => i.nr === '4.4.13');
        stateEigene.values[unzulaessig.id] = 99;
        const trotzdem = calculateInternal('own');
        pruefeWahr('Unzulässiger Stufenindex ergibt keine ungültige Punktzahl',
            Number.isFinite(trotzdem.total) && Number.isFinite(trotzdem.pg),
            'Gesamt ' + trotzdem.total + ', Pflegegrad ' + trotzdem.pg);
        leeren();
        alleAuf(4, 'max');
        const nurM4 = calculateInternal('own');
        pruefe('Modul 4 maximal ergibt 40 gewichtete Punkte', nurM4.weights[3], 40);
        pruefe('Modul 4 maximal ergibt Pflegegrad 2', nurM4.pg, 2);
        leeren();
        [1, 2, 3, 4, 6].forEach(m => alleAuf(m, 'max'));
        ITEMS.filter(i => i.m === 5 && i.group !== 'D').forEach(i => { stateEigene.values[i.id] = { count: 8, period: 'D' }; });
        const alles = calculateInternal('own');
        pruefeWahr('Alles maximal ergibt Pflegegrad 5', alles.pg === 5, 'Ergebnis: PG ' + alles.pg + ' bei ' + alles.total + ' Punkten');

        // ---------- 5. Abweichungen und Dokument ----------
        leeren();
        const kritNr = nr => ITEMS.find(i => i.nr === nr);
        stateEigene.values[kritNr('4.1.5').id] = 1;
        pruefe('Abweichung wird erkannt', computeDiffs().map(d => d.nr), ['4.1.5']);

        const html = buildStellungnahme('', {}, '');
        pruefeWahr('Verfasser steht im Dokument', html.includes(getVerfasser().name));
        pruefeWahr('Kein "Pflegegrad 0" im Dokument', !html.includes('Pflegegrad 0'));
        pruefeWahr('Stattdessen "kein Pflegegrad"', html.includes('kein Pflegegrad'));
        pruefeWahr('Kein Erstellungsdatum im Dokument', !html.includes(todayDE()));
        pruefeWahr('Schrift Calibri 11pt', /font-family:Calibri[^}]*font-size:11pt/.test(STELLUNGNAHME_CSS));
        pruefeWahr('Überschriften 14pt', /\.stmt h2\{[^}]*font-size:14pt/.test(STELLUNGNAHME_CSS));
        pruefeWahr('Abstand zur Überschrift (3 Zeilen)', /margin-bottom:4\.4em/.test(STELLUNGNAHME_CSS));

        // ---------- 6. Zitatprüfung ----------
        pruefe('Erfundenes BRi-Zitat wird erkannt',
            unbelegteZitate('4.4.4', 'Die BRi nennen "einzelne Aufforderungen zur Durchführung".').length, 1);
        pruefe('Zitat aus fremdem Kriterium wird erkannt',
            unbelegteZitate('4.4.4', 'Es gilt "punktuelle Hilfe erforderlich, zum Beispiel beim Öffnen einer Flasche oder beim Schneiden von harten Nahrungsmitteln".').length, 1);
        pruefe('Korrektes Zitat löst keinen Fehlalarm aus',
            unbelegteZitate('4.4.7', 'Es gilt "punktuelle Hilfe erforderlich, zum Beispiel beim Öffnen einer Flasche oder beim Schneiden von harten Nahrungsmitteln".').length, 0);
        pruefe('Grammatisch angepasstes Zitat gilt als belegt',
            unbelegteZitate('4.6.1', 'wenn "die Routineabläufe zwar weitgehend selbständig gestaltet werden können, bei ungewohnten Veränderungen ist Unterstützung notwendig".').length, 0);

        // ---------- 7. Zusammenführen erhält eigenen Text ----------
        const v1 = buildStellungnahme('', { '4.1.5': 'Erste Begründung.' }, '');
        const hilf = document.createElement('div'); hilf.innerHTML = v1;
        const block = hilf.querySelector('.crit[data-nr="4.1.5"]');
        if (block) block.insertAdjacentHTML('beforeend', '<p>SELBSTTEST-HANDARBEIT</p>');
        const bearbeitet = hilf.innerHTML;
        const v2 = buildStellungnahme('', { '4.1.5': 'Andere Begründung.' }, '');
        pruefeWahr('Eigener Text bleibt beim erneuten Erstellen erhalten',
            mergeStellungnahme(bearbeitet, v2).includes('SELBSTTEST-HANDARBEIT'));
        // Bewertung geändert -> neuer Text muss übernommen werden
        stateEigene.values[kritNr('4.1.5').id] = 2;
        const v3 = buildStellungnahme('', { '4.1.5': 'Neu wegen geänderter Bewertung.' }, '');
        pruefeWahr('Geänderte Bewertung erneuert die Begründung',
            mergeStellungnahme(bearbeitet, v3).includes('Neu wegen geänderter Bewertung'));

        // ---------- 8. Durchführungsart ----------
        pruefe('Durchführungsart: Hausbesuch', normalizeArt('Hausbesuch'), DURCHFUEHRUNGSARTEN[0]);
        pruefe('Durchführungsart: Aktenlage', normalizeArt('nach Aktenlage'), DURCHFUEHRUNGSARTEN[1]);
        pruefe('Durchführungsart: Telefon', normalizeArt('telefonisch'), DURCHFUEHRUNGSARTEN[2]);

        // ---------- 9. Diagnoseliste ----------
        if (document.getElementById('diag-rows-container')) {
            const vorher = diagRowCount();
            ensureDiagRows(9);
            pruefe('Diagnoseliste wächst auf 9 Zeilen', diagRowCount(), 9);
            pruefeWahr('Mindestens 6 Zeilen vorhanden', vorher >= 6);
        }

        // ---------- 10. Word-Ausgabe ----------
        const wordProbe = (function () {
            // Das Dokumentfeld entsteht erst mit dem Aufbau der Auswertung. Ohne diesen
            // Anstoß wurden die folgenden drei Prüfungen beim ersten Durchgang übersprungen.
            if (!document.getElementById('appeal-document') && typeof renderAuswertung === 'function') {
                try { renderAuswertung(); } catch (e) {}
            }
            const el = document.getElementById('appeal-document');
            if (!el) return null;
            const alt = el.innerHTML;
            el.innerHTML = buildStellungnahme('', {}, '');
            let inhalt = null;
            const oc = URL.createObjectURL, ok = HTMLAnchorElement.prototype.click;
            // Den Dateidialog während des Tests unterbinden – er würde ein Fenster öffnen
            const echterDialog = window.showSaveFilePicker;
            window.showSaveFilePicker = undefined;
            URL.createObjectURL = () => 'blob:selbsttest';
            HTMLAnchorElement.prototype.click = function () {};
            const origBlob = window.Blob;
            window.Blob = function (teile, opt) { inhalt = teile.join(''); return new origBlob(teile, opt); };
            try { exportAppealWord(); } catch (e) { inhalt = 'FEHLER: ' + e.message; }
            window.Blob = origBlob; URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = ok;
            if (echterDialog) window.showSaveFilePicker = echterDialog; else delete window.showSaveFilePicker;
            el.innerHTML = alt;
            return inhalt;
        })();
        pruefeWahr('Word-Ausgabe konnte geprüft werden', !!wordProbe);
        if (wordProbe) {
            pruefeWahr('Word-Datei enthält Seitenzahl-Feld', wordProbe.includes('mso-field-code: PAGE'));
            pruefeWahr('Word-Datei ohne Erstellungsdatum', !wordProbe.includes(todayDE()));
            pruefeWahr('Word-Datei ohne Arbeitshinweise', !wordProbe.includes('zitat-warnung'));
        }

        // ---------- 11. Startauswahl und Vorgangsart ----------
        const modusVorher = appModus;
        pruefe('Vier Vorgangsarten vorhanden', Object.keys(MODI).length, 4);
        pruefeWahr('Widerspruch ist einsatzbereit', MODI.widerspruch.fertig === true);
        pruefeWahr('Erstantrag ist einsatzbereit', MODI.erstantrag.fertig === true);
        pruefeWahr('Höherstufungsantrag ist einsatzbereit', MODI.hoeherstufung.fertig === true);
        setzeModus('hoeherstufung');
        pruefe('Vorgangsart lässt sich setzen', appModus, 'hoeherstufung');
        setzeModus('unbekannt');
        pruefe('Unbekannte Vorgangsart fällt auf Widerspruch zurück', appModus, 'widerspruch');
        // Auswahl über die Kachel schaltet um und schließt die Startauswahl
        waehleModus('erstantrag');
        pruefe('Kachelauswahl setzt die Vorgangsart', appModus, 'erstantrag');
        pruefeWahr('Kachelauswahl schließt die Startauswahl',
            !document.getElementById('start-overlay').classList.contains('active'));
        document.getElementById('vorbereitung-box')?.remove();
        setzeModus(modusVorher);
        pruefeWahr('Verfasserfelder existieren genau einmal',
            document.querySelectorAll('#verf-name-sel').length === 1 &&
            document.querySelectorAll('#verf-qual-sel').length === 1);

        // ---------- 9b. Dritter Bewertungsstand: das Anhörungsgutachten ----------
        // Phase 1 des Anhörungsvorgangs. Der dritte Stand darf sich auf die bestehenden
        // Vorgangsarten in keiner Weise auswirken.
        {
            const k = nr => ITEMS.find(i => i.nr === nr);
            const merkZweit = JSON.parse(JSON.stringify(stateZweit));
            leeren();
            stateZweit = { special: 0, values: {} };

            pruefe('Drei Spalten sind benannt',
                [SPALTEN_NAMEN.orig, SPALTEN_NAMEN.zweit, SPALTEN_NAMEN.own],
                ['Vorgutachten', 'Anhörungsgutachten', 'Eigene Einschätzung']);
            pruefeWahr('Zugriff je Spalte trifft den richtigen Stand',
                zustandZu('orig') === stateOrig && zustandZu('zweit') === stateZweit
                && zustandZu('own') === stateEigene);
            pruefe('Ohne Zweitgutachten meldet die App das auch', hatZweitgutachten(), false);

            // Schreiben in die dritte Spalte
            pruefe('Schreiben ins Anhörungsgutachten wird angenommen',
                setzeBewertung('zweit', k('4.4.1').id, 2, 'import'), true);
            pruefe('Wert steht im Anhörungsgutachten', stateZweit.values[k('4.4.1').id], 2);
            pruefe('Vorgutachten bleibt unberührt', stateOrig.values[k('4.4.1').id], 0);
            pruefe('Eigene Einschätzung bleibt unberührt', stateEigene.values[k('4.4.1').id], 0);
            pruefe('Protokoll nennt die richtige Spalte',
                bewertungsProtokoll[bewertungsProtokoll.length - 1].spalte, 'Anhörungsgutachten');
            pruefe('Jetzt liegt ein Zweitgutachten vor', hatZweitgutachten(), true);

            // Rechnen für alle drei Stände getrennt
            ITEMS.filter(i => i.m === 4).forEach(i => { stateZweit.values[i.id] = 0; });
            [k('4.4.1'), k('4.4.2'), k('4.4.3')].forEach(i => { stateZweit.values[i.id] = 3; });
            ITEMS.filter(i => i.m === 5).forEach(i => {
                stateZweit.values[i.id] = (i.group !== 'D') ? { count: 0, period: 'W' } : 0;
            });
            const rZ = calculateInternal('zweit');
            pruefe('Modul 4 des Anhörungsgutachtens wird gerechnet', rZ.raws[3], 9);
            pruefe('Gewichtete Punkte des Anhörungsgutachtens', rZ.weights[3], 20);
            pruefe('Vorgutachten rechnet unverändert weiter', calculateInternal('orig').total, 0);
            pruefe('Eigene Einschätzung rechnet unverändert weiter', calculateInternal('own').total, 0);

            // Zusammenfassung aus dem Gutachten gilt auch für die dritte Spalte
            stateZweit.extracted = { raws: [0,0,0,0,0,0], weights: [0,0,0,0,0,0], total: 31.25, pg: 2 };
            pruefe('Zusammenfassung des Anhörungsgutachtens hat Vorrang', calculateInternal('zweit').pg, 2);
            delete stateZweit.extracted;
            pruefeWahr('Ohne Zusammenfassung wieder aus den Kriterien',
                calculateInternal('zweit').total === 20);
            // Eine Handkorrektur verwirft die Zusammenfassung
            stateZweit.extracted = { raws: [0,0,0,0,0,0], weights: [0,0,0,0,0,0], total: 31.25, pg: 2 };
            updateValue('zweit', k('4.4.1').id, 1);
            pruefeWahr('Handkorrektur verwirft die Zusammenfassung', !stateZweit.extracted);

            // Ein neu eingelesenes Erstgutachten setzt die dritte Spalte zurück
            pruefeWahr('Neues Erstgutachten leert das Anhörungsgutachten',
                applyImportedData.toString().includes('stateZweit = { special: 0, values: {} }'));

            stateZweit = merkZweit;
            protokollLeeren();
            leeren();
        }

        // ---------- 9b2. Vorgang „Anhörung" ----------
        if (typeof uebernehmeAnhoerung === 'function') {
            const k = nr => ITEMS.find(i => i.nr === nr);
            const merkModusA = appModus;
            const merkZweitA = JSON.parse(JSON.stringify(stateZweit));
            const merkFelderA = {};
            document.querySelectorAll('[id^="anh-"]').forEach(el => merkFelderA[el.id] = el.value);

            pruefeWahr('Anhörung ist als vierter Vorgang eingetragen',
                !!MODI.anhoerung && MODI.anhoerung.fertig === true);
            pruefe('Startseite zeigt vier Vorgänge', Object.keys(MODI).length, 4);

            setzeModus('anhoerung');
            pruefeWahr('Anhörung: Bereich auf Reiter 1 ist sichtbar',
                document.getElementById('anhoerung-bereich').style.display !== 'none');
            pruefeWahr('Anhörung: Befunderhebung bleibt verborgen',
                document.getElementById('btn-tab-befund').style.display === 'none');
            pruefeWahr('Anhörung: erweiterte Erfassung bleibt verborgen',
                document.getElementById('erfassung-bereich').style.display === 'none');
            pruefe('Anhörung: Reiterbeschriftung wie im Widerspruch',
                document.getElementById('btn-tab-3').innerText, '2. EINSCHÄTZUNG & VERGLEICH');
            ANHOERUNG_FELDER.forEach(f => pruefeWahr('Anhörung: Feld „' + f.l + '" vorhanden',
                !!document.getElementById(f.id)));
            pruefeWahr('Anhörung: Feld für die Begründung der Kasse',
                !!document.getElementById('anh-kassenbegruendung'));
            pruefeWahr('Anhörung: eigenes Notizfeld', !!document.getElementById('anh-notizen'));

            // Übernahme des Anhörungsgutachtens: dritte Spalte füllen, nichts anderes anfassen
            leeren();
            stateZweit = { special: 0, values: {} };
            stateOrig.values[k('4.4.1').id] = 1;
            stateEigene.values[k('4.4.1').id] = 3;
            erstgespraechNotes = 'Notiz aus dem Widerspruch.';
            appealDraft = '<p>Stellungnahme aus dem Widerspruch</p>';
            document.getElementById('stam-betreffend').value = 'Herr Anhörung Test';
            const vm = {};
            ITEMS.forEach(i => { vm[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            vm[k('4.4.1').id] = 2;
            uebernehmeAnhoerung({
                stam: { pg: '1', pts: '25,00', begutachtung: '2026-04-08', art: DURCHFUEHRUNGSARTEN[1] },
                anh: { schreiben: '2026-04-21', frist: 'zwei Wochen', kassenbegruendung: 'Kein höherer Grad.',
                       gutachten: '2026-04-08', art: DURCHFUEHRUNGSARTEN[1] },
                valuesMap: vm, special: 0,
                extracted: { raws: [0,0,0,3,0,0], weights: [0,0,0,10,0,0], total: 25, pg: 1 }
            });
            pruefe('Anhörungsgutachten steht in der dritten Spalte', stateZweit.values[k('4.4.1').id], 2);
            pruefe('Erstgutachten unverändert', stateOrig.values[k('4.4.1').id], 1);
            pruefe('Eigene Bewertung unverändert', stateEigene.values[k('4.4.1').id], 3);
            pruefe('Notizen des Widerspruchs bleiben', erstgespraechNotes, 'Notiz aus dem Widerspruch.');
            pruefeWahr('Stellungnahme des Widerspruchs bleibt',
                (appealDraft || '').includes('Stellungnahme aus dem Widerspruch'));
            pruefe('Betreffende Person bleibt stehen',
                document.getElementById('stam-betreffend').value, 'Herr Anhörung Test');
            pruefe('Kopffeld: Datum Anhörungsschreiben',
                document.getElementById('anh-schreiben-datum').value, '2026-04-21');
            pruefe('Kopffeld: Datum Zweitgutachten',
                document.getElementById('anh-gutachten-datum').value, '2026-04-08');
            pruefe('Kopffeld: Pflegegrad des Zweitgutachtens',
                document.getElementById('anh-pg').value, '1');
            pruefeWahr('Begründung der Kasse übernommen',
                document.getElementById('anh-kassenbegruendung').value.includes('Kein höherer Grad'));
            pruefe('Zusammenfassung des Zweitgutachtens gilt', calculateInternal('zweit').pg, 1);
            pruefeWahr('Übernahme steht im Protokoll',
                bewertungsProtokoll.some(e => e.spalte === SPALTEN_NAMEN.zweit));
            pruefeWahr('Dritter Balken erscheint jetzt',
                document.querySelectorAll('[id^="zweitref-own-"]').length === 64);

            // Kein falsches Dokument, solange die Vorlage fehlt
            pruefe('Anhörung erzeugt noch kein Dokument', baueDokument('', {}, ''), null);
            setzeModus('hoeherstufung');
            pruefeWahr('Höherstufung erzeugt weiterhin ihr Dokument', !!baueDokument('', {}, ''));
            setzeModus('widerspruch');
            pruefeWahr('Widerspruch erzeugt weiterhin sein Dokument', !!baueDokument('', {}, ''));

            // Die Felder gehören in die Falldatei
            pruefeWahr('Anhörungsfelder werden mitgespeichert',
                saveCase.toString().includes('[id^="anh-"]'));

            stateZweit = merkZweitA;
            Object.keys(merkFelderA).forEach(id => {
                const el = document.getElementById(id); if (el) el.value = merkFelderA[id];
            });
            setzeModus(merkModusA);
            protokollLeeren();
            leeren();
        }

        // ---------- 9c. Pflegegrad und Punkte des Gutachtens dürfen nicht auseinanderlaufen ----------
        // Beide stehen an zwei Stellen der Prüfansicht. Wurde nur eine korrigiert, behauptete
        // die Stellungnahme zuvor etwa „0 Punkte, woraus sich Pflegegrad 1 ergeben hat".
        if (typeof rvExtract === 'function') {
            const merkReview = reviewData;
            const merkFelder2 = {};
            document.querySelectorAll('[id^="stam-"]').forEach(el => merkFelder2[el.id] = el.value);

            reviewData = normalizeImport({
                stam_pg_manual: 1, stam_pts_manual: 0, pflegegrad: 1, total_weight: 0,
                stam_betreffend: 'Frau Probe', values_orig: [], diagnoses: []
            });
            pruefe('Einlesen: Pflegegrad steht in beiden Feldern',
                [reviewData.stam.pg, reviewData.extracted.pg], ['1', 1]);

            // Unten korrigieren -> oben muss mitgehen
            rvExtract('pg', 0, '0');
            pruefe('Korrektur der Modul-Zusammenfassung wirkt auf die Stammdaten',
                reviewData.stam.pg, 'kein Pflegegrad');
            rvExtract('total', 0, '31,5');
            pruefe('Korrektur der Punkte wirkt auf die Stammdaten', reviewData.stam.pts, '31,5');

            // Oben korrigieren -> unten muss mitgehen
            rvStam('pg', '2');
            pruefe('Korrektur der Stammdaten wirkt auf die Modul-Zusammenfassung',
                reviewData.extracted.pg, 2);
            rvStam('pts', '48,25');
            pruefe('Punktkorrektur oben wirkt unten', reviewData.extracted.total, 48.25);

            // Plausibilität: Schwellenwerte des SGB XI
            pruefe('Punkte zu Pflegegrad: 0', pgAusPunkten(0), 0);
            pruefe('Punkte zu Pflegegrad: 12,5', pgAusPunkten('12,5'), 1);
            pruefe('Punkte zu Pflegegrad: 27', pgAusPunkten(27), 2);
            pruefe('Punkte zu Pflegegrad: 47,5', pgAusPunkten('47,5'), 3);
            pruefe('Punkte zu Pflegegrad: 70', pgAusPunkten(70), 4);
            pruefe('Punkte zu Pflegegrad: 90', pgAusPunkten(90), 5);
            pruefe('Punkte zu Pflegegrad: knapp darunter', pgAusPunkten(26.99), 1);

            // Der widersprüchliche Fall muss gemeldet werden
            // Die Prüfansicht bringt dieses Element selbst mit, sobald sie einmal
            // aufgebaut wurde – dann dieses verwenden, sonst ein eigenes anlegen.
            let box = document.getElementById('rev-plausibel');
            const boxEigen = !box;
            if (boxEigen) { box = document.createElement('div'); box.id = 'rev-plausibel'; document.body.appendChild(box); }
            reviewData.stam.pg = '1'; reviewData.stam.pts = '0';
            rvPruefePlausibel();
            pruefeWahr('Widerspruch Punkte/Pflegegrad wird gemeldet',
                box.innerHTML.includes('Bitte prüfen') && box.innerHTML.includes('kein Pflegegrad'));
            reviewData.stam.pg = '2'; reviewData.stam.pts = '31,5';
            rvPruefePlausibel();
            pruefe('Stimmiger Fall wird nicht gemeldet', box.innerHTML, '');
            if (boxEigen) box.remove(); else box.innerHTML = '';

            // Und die Stellungnahme darf den Widerspruch nicht mehr schreiben
            reviewData = normalizeImport({
                stam_pg_manual: 1, stam_pts_manual: 0, pflegegrad: 1, total_weight: 0,
                stam_betreffend: 'Frau Probe', values_orig: [], diagnoses: []
            });
            rvExtract('pg', 0, '0');
            applyImportedData(reviewData);
            pruefe('Nach der Übernahme steht kein Pflegegrad im Feld',
                document.getElementById('stam-pg-manual').value, 'kein Pflegegrad');
            const satzHtml = buildStellungnahme('', {}, '');
            pruefeWahr('Stellungnahme nennt keinen Pflegegrad bei 0 Punkten',
                satzHtml.includes('kein Pflegegrad') && !/0 gewichteten Punkten, woraus sich ein/.test(satzHtml));

            reviewData = merkReview;
            Object.keys(merkFelder2).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = merkFelder2[id];
            });
            leeren();
        }

        // ---------- 10a. Modul 5: keine „0" als Wertung im Schriftstück ----------
        {
            const k = nr => ITEMS.find(i => i.nr === nr);
            pruefe('4.5.1 ohne Maßnahme', m5HaeufigkeitText('4.5.1', { count: 0, period: 'W' }),
                'entfällt oder selbständig');
            pruefe('4.5.14 ohne Maßnahme', m5HaeufigkeitText('4.5.14', { count: 0, period: 'M' }),
                'entfällt oder selbständig');
            pruefe('Fehlender Wert wird wie null behandelt',
                m5HaeufigkeitText('4.5.7', null), 'entfällt oder selbständig');
            pruefe('Mit Maßnahme bleibt die Häufigkeit stehen',
                m5HaeufigkeitText('4.5.1', { count: 3, period: 'D' }), '3x pro Tag');
            pruefe('Dezimalwerte mit Komma',
                m5HaeufigkeitText('4.5.13', { count: 0.33, period: 'M' }), '0,33x pro Monat');
            // Nur 4.5.1 bis 4.5.14 – ausserhalb bleibt es bei der Häufigkeit
            pruefe('4.5.15 bleibt unverändert',
                m5HaeufigkeitText('4.5.15', { count: 0, period: 'W' }), '0x pro Woche');
            pruefe('Kriterien anderer Module unberührt',
                m5HaeufigkeitText('4.1.1', { count: 0, period: 'W' }), '0x pro Woche');
            pruefe('Bereich umfasst genau 4.5.1 bis 4.5.14',
                ITEMS.filter(i => m5OhneWertungMoeglich(i.nr)).map(i => i.nr),
                ['4.5.1','4.5.2','4.5.3','4.5.4','4.5.5','4.5.6','4.5.7',
                 '4.5.8','4.5.9','4.5.10','4.5.11','4.5.12','4.5.13','4.5.14']);

            // Wirkung im erzeugten Schriftstück
            leeren();
            stateOrig.values[k('4.5.1').id] = { count: 0, period: 'W' };
            stateEigene.values[k('4.5.1').id] = { count: 3, period: 'D' };
            const d = computeDiffs().find(x => x.nr === '4.5.1');
            pruefe('Abweichung nennt „entfällt oder selbständig"', d && d.o, 'entfällt oder selbständig');
            pruefe('Eigene Bewertung bleibt eine Häufigkeit', d && d.e, '3x pro Tag');
            const doku = buildStellungnahme('', {}, '');
            pruefeWahr('Schriftstück nennt „entfällt oder selbständig"',
                doku.includes('entfällt oder selbständig'));
            pruefeWahr('Schriftstück enthält kein „0x pro"', !doku.includes('0x pro'));
            // Auch in der Antragsvorlage
            const modusVorM5 = appModus;
            setzeModus('hoeherstufung');
            const antrag = buildHoeherstufung('', {}, '');
            pruefeWahr('Antragsvorlage nennt „entfällt oder selbständig"',
                antrag.includes('entfällt oder selbständig'));
            pruefeWahr('Antragsvorlage enthält kein „0x pro"', !antrag.includes('0x pro'));
            setzeModus(modusVorM5);
            // Die Anweisung an die KI verbietet die Null ausdrücklich
            pruefeWahr('Vorgabe an die KI nennt die Regel',
                buildBegruendungPrompt([d], false).includes('entfällt oder selbständig'));
            leeren();
        }

        // ---------- 10b. Längenvorgaben für die erzeugten Texte ----------
        {
            pruefe('Satzzählung: einfache Sätze',
                zaehleSaetze('Erster Satz. Zweiter Satz! Dritter Satz?'), 3);
            pruefe('Satzzählung: Kriteriennummern trennen nicht',
                zaehleSaetze('Zu 4.5.13 besteht Hilfebedarf. Das ist belegt.'), 2);
            pruefe('Satzzählung: Abkürzungen trennen nicht',
                zaehleSaetze('Es besteht Bedarf, z. B. beim Waschen bzw. Ankleiden. Das ist belegt.'), 2);
            pruefe('Satzzählung: Zitat am Satzende',
                zaehleSaetze('Die BRi verlangt „überwiegend unselbständig". Somit ist zu werten.'), 2);
            pruefe('Satzzählung: Dezimalzahlen trennen nicht',
                zaehleSaetze('Der Wert liegt bei 3.24 pro Tag.'), 1);
            pruefe('Wortzählung ohne Auszeichnung', zaehleWoerter('<b>Ein</b> kurzer Satz'), 3);

            const langeBegruendung = Array.from({ length: 8 }, (_, i) => 'Dies ist Satz Nummer ' + i + '.').join(' ');
            const kurzeBegruendung = 'Satz eins. Satz zwei. Satz drei. Satz vier. Satz fünf.';
            pruefe('Fünf Sätze sind zulässig',
                laengenVerstoesse({ '4.1.1': kurzeBegruendung }, '').length, 0);
            const v = laengenVerstoesse({ '4.1.1': langeBegruendung }, '');
            pruefe('Acht Sätze werden beanstandet', v.length, 1);
            pruefe('Beanstandung nennt das Kriterium', v[0] && v[0].nr, '4.1.1');

            const langerAllgemein = 'Wort '.repeat(LAENGE.allgemeinWoerterMax + 30);
            pruefeWahr('Zu lange Einleitung wird beanstandet',
                laengenVerstoesse({}, langerAllgemein).some(x => x.art === 'allgemein'));
            pruefe('Einleitung innerhalb der Grenze ist zulässig',
                laengenVerstoesse({}, 'Wort '.repeat(200)).length, 0);
            // Die Grenze entspricht einer halben bis drei viertel A4-Seite
            pruefeWahr('Grenze passt zu drei viertel A4-Seite',
                LAENGE.allgemeinZeichenMax >= 2400 && LAENGE.allgemeinZeichenMax <= 3000);

            // Die Vorgaben stehen tatsächlich in den Anweisungen an die KI
            pruefeWahr('Vorgabe nennt die Satzgrenze',
                laengenVorgabeBegruendung().includes(String(LAENGE.begruendungSaetzeMax) + ' Sätzen'));
            pruefeWahr('Vorgabe nennt die Wortgrenze der Einleitung',
                laengenVorgabeAllgemein('Anamnese').includes(String(LAENGE.allgemeinWoerterMax)));
            pruefeWahr('Vorgabe nennt den richtigen Abschnittstitel',
                laengenVorgabeAllgemein('Anamnese').includes('Anamnese'));

            // Nachkürzen: zu lange Abschnitte werden ersetzt, unbrauchbare Antworten verworfen
            const echterAufruf = window.callGeminiWithFallback;
            window.callGeminiWithFallback = async () => ({ candidates: [{ content: { parts: [{
                text: JSON.stringify({ abschnitte: [{ nr: '4.1.1', text: kurzeBegruendung }] }) }] } }] });
            let e = await kuerzeUeberlaenge({ '4.1.1': langeBegruendung }, '', 'Allgemeine Angaben');
            pruefe('Zu langer Abschnitt wird gekürzt', e.gekuerzt, 1);
            pruefe('Nach dem Kürzen keine Überschreitung mehr', e.offen.length, 0);
            pruefe('Gekürzter Text wird übernommen', e.map['4.1.1'], kurzeBegruendung);

            // Eine Antwort, die nicht kürzer ist, darf den Text nicht ersetzen
            window.callGeminiWithFallback = async () => ({ candidates: [{ content: { parts: [{
                text: JSON.stringify({ abschnitte: [{ nr: '4.1.1', text: langeBegruendung + ' Noch ein Satz.' }] }) }] } }] });
            e = await kuerzeUeberlaenge({ '4.1.1': langeBegruendung }, '', 'Allgemeine Angaben');
            pruefe('Nicht kürzere Antwort wird verworfen', e.map['4.1.1'], langeBegruendung);
            pruefe('Verbliebene Überschreitung wird gemeldet', e.offen.length, 1);

            // Fällt die KI aus, bleibt der ursprüngliche Text erhalten
            window.callGeminiWithFallback = async () => { throw new Error('Probe'); };
            e = await kuerzeUeberlaenge({ '4.1.1': langeBegruendung }, '', 'Allgemeine Angaben');
            pruefe('Bei Ausfall bleibt der Text erhalten', e.map['4.1.1'], langeBegruendung);
            pruefe('Ausfall wird nicht als Kürzung gezählt', e.gekuerzt, 0);
            window.callGeminiWithFallback = echterAufruf;
        }

        // ---------- 10c. Keine eigenmächtigen Bewertungen durch die App ----------
        // Nach dem bestätigten Import darf die App von sich aus KEINE Punkte mehr eintragen.
        {
            const abbild = () => JSON.stringify({ v: stateEigene.values, s: stateEigene.special,
                                                  o: stateOrig.values, os: stateOrig.special });
            leeren();
            const k = nr => ITEMS.find(i => i.nr === nr);
            stateOrig.values[k('4.4.1').id] = 1; stateEigene.values[k('4.4.1').id] = 1;
            stateOrig.values[k('4.2.6').id] = 2; stateEigene.values[k('4.2.6').id] = 2;
            const vorher = abbild();

            // Alles, was ohne ausdrückliches Zutun des Beraters läuft
            fillTable('own'); calculate('own'); calculate('orig');
            renderAuswertung();
            switchTab(3); switchTab(4); switchTab(3);
            computeDiffs();
            if (typeof befundVorschlaege === 'function') befundVorschlaege();
            if (typeof renderBefund === 'function') { setzeModus('hoeherstufung'); renderBefund(); setzeModus('widerspruch'); }
            if (typeof buildStellungnahme === 'function') buildStellungnahme();
            if (typeof modul5AusErfassung === 'function') modul5AusErfassung();
            if (typeof zeigeModul5Vorschau === 'function') zeigeModul5Vorschau();
            pruefe('Keine Bewertung ohne Zutun des Beraters', abbild(), vorher);

            // Vorschläge zeigen heisst nicht übernehmen
            vorschlagListe = [{ item: k('4.4.1'), stufe: 3, alt: 1, begruendung: 'Probe', fundstelle: '' }];
            renderVorschlaege();
            pruefe('Vorschlagsliste ändert nichts', abbild(), vorher);
            const haken = document.querySelectorAll('#vorschlag-body input[type="checkbox"]');
            pruefe('Vorschläge sind nicht vorausgewählt',
                Array.from(haken).filter(c => c.checked).length, 0);
            // Ohne Haken darf „Übernehmen" nichts ändern
            uebernehmeVorschlaege();
            pruefe('Übernehmen ohne Haken ändert nichts', abbild(), vorher);
            // Mit Haken wird genau der eine Wert gesetzt
            renderVorschlaege();
            document.querySelector('#vorschlag-body input[type="checkbox"]').checked = true;
            uebernehmeVorschlaege();
            pruefe('Angehakter Vorschlag wird übernommen', stateEigene.values[k('4.4.1').id], 3);
            pruefe('Vorschlag verändert das Vorgutachten nicht', stateOrig.values[k('4.4.1').id], 1);

            // Protokoll: jede Änderung hat einen nachvollziehbaren Ursprung
            const letzte = bewertungsProtokoll[bewertungsProtokoll.length - 1];
            pruefe('Änderung wird protokolliert', letzte && letzte.nr, '4.4.1');
            pruefe('Protokoll nennt den Ursprung', letzte && letzte.quelle, BEWERTUNG_QUELLEN.vorschlag);
            pruefeWahr('Protokoll nennt alten und neuen Wert',
                !!letzte && letzte.alt !== letzte.neu && !!letzte.alt && !!letzte.neu);

            // Ein unbekannter Ursprung wird abgewiesen – so kann sich nichts einschleichen
            const stand = stateEigene.values[k('4.2.6').id];
            const angenommen = setzeBewertung('own', k('4.2.6').id, 3, 'ki');
            pruefe('Unzulässiger Ursprung wird abgewiesen', angenommen, false);
            pruefe('Wert bleibt nach Abweisung unverändert', stateEigene.values[k('4.2.6').id], stand);

            // Abweichung zwischen KI-Zusammenfassung und freigegebenen Kriterien wird gemeldet
            protokollLeeren();
            leeren();
            stateOrig.values[k('4.4.1').id] = 1;
            pruefe('Ohne KI-Zusammenfassung keine Abweichungsmeldung', vorgutachtenAbweichung(), null);
            const echteWerte = calculateInternal('orig');
            stateOrig.extracted = { raws: [0,0,0,0,0,0], weights: [0,0,0,0,0,0],
                                    total: echteWerte.total, pg: echteWerte.pg };
            pruefe('Übereinstimmung wird nicht gemeldet', vorgutachtenAbweichung(), null);
            stateOrig.extracted = { raws: [0,0,0,0,0,0], weights: [0,0,0,0,0,0], total: 48.75, pg: 3 };
            const abw = vorgutachtenAbweichung();
            pruefeWahr('Abweichung wird erkannt', !!abw);
            pruefe('Abweichung nennt die Angabe aus dem Gutachten', abw && abw.lautGutachten.pg, 3);
            pruefe('Abweichung nennt das Ergebnis aus den Kriterien', abw && abw.ausKriterien.pg, 0);
            pruefeWahr('Abweichung erscheint in der Auswertung',
                abweichungHtml().includes('Bitte prüfen'));
            pruefeWahr('Prüfung verändert die Zusammenfassung nicht',
                !!stateOrig.extracted && stateOrig.extracted.pg === 3);
            delete stateOrig.extracted;

            protokollLeeren();
            leeren();
        }

        // ---------- 10d. Erfasste Daten nachträglich korrigieren ----------
        {
            const k = nr => ITEMS.find(i => i.nr === nr);
            leeren();
            protokollLeeren();
            stellungnahmeVeraltet = false;
            letzteProvided = null;
            const merkDok = importDokumente.slice();
            importDokumente = [];

            // Ausgangslage: Gutachten eingelesen, Berater hat EIN Kriterium abweichend bewertet
            stateOrig.values[k('4.1.1').id] = 0; stateEigene.values[k('4.1.1').id] = 0;   // unberührt
            stateOrig.values[k('4.4.1').id] = 1; stateEigene.values[k('4.4.1').id] = 3;   // bewusst abweichend
            stateOrig.values[k('4.2.6').id] = 0; stateEigene.values[k('4.2.6').id] = 0;   // unberührt
            document.getElementById('stam-betreffend').value = 'Herr Max Muster';
            document.getElementById('stam-kasse').value = 'AOK';
            erstgespraechNotes = 'Wichtige Notiz aus dem Erstgespräch.';
            const notizFeld = document.getElementById('erstgespraech-notes');
            if (notizFeld) notizFeld.value = erstgespraechNotes;
            appealDraft = '<div id="stmt-notes">Bereits geschriebene Stellungnahme.</div>';

            // Schaltfläche vorhanden
            const knopfKorr = Array.from(document.querySelectorAll('button'))
                .find(b => (b.getAttribute('onclick') || '').includes('oeffneKorrektur'));
            pruefeWahr('Schaltfläche „Erfasste Daten korrigieren" vorhanden', !!knopfKorr);

            // Prüfansicht öffnen: zeigt den AKTUELLEN Stand des Vorgutachtens
            oeffneKorrektur();
            pruefeWahr('Prüfansicht ist offen',
                document.getElementById('review-overlay').classList.contains('active'));
            pruefe('Überschrift im Korrekturmodus',
                document.getElementById('review-titel').textContent, 'Erfasste Daten korrigieren');
            pruefeWahr('Schaltfläche heißt „Korrekturen übernehmen"',
                document.getElementById('review-uebernehmen').getAttribute('onclick').includes('uebernehmeKorrektur'));
            pruefe('Angezeigt wird das Vorgutachten, nicht die eigene Einschätzung',
                reviewData.valuesMap[k('4.4.1').id], 1);
            pruefe('Stammdaten stehen in der Prüfansicht', reviewData.stam.betreffend, 'Herr Max Muster');
            pruefeWahr('Hinweis zum Korrigieren wird eingeblendet',
                document.getElementById('review-hinweis').style.display === 'block');
            pruefeWahr('Ohne Unterlage erscheint eine Erläuterung',
                document.getElementById('review-pdf').innerText.includes('Keine Unterlage'));

            // Korrigieren: 4.1.1 war falsch gelesen, 4.4.1 ebenfalls.
            // rvValNum ist der Weg, den auch die Auswahlfelder gehen.
            rvValNum(k('4.1.1').id, '2');
            rvValNum(k('4.4.1').id, '2');
            reviewData.stam.kasse = 'Barmer';
            uebernehmeKorrektur();

            pruefe('Vorgutachten korrigiert (4.1.1)', stateOrig.values[k('4.1.1').id], 2);
            pruefe('Unberührte eigene Einschätzung zieht mit', stateEigene.values[k('4.1.1').id], 2);
            pruefe('Vorgutachten korrigiert (4.4.1)', stateOrig.values[k('4.4.1').id], 2);
            pruefe('Abweichende eigene Bewertung bleibt erhalten', stateEigene.values[k('4.4.1').id], 3);
            pruefe('Nicht berührtes Kriterium bleibt unverändert', stateOrig.values[k('4.2.6').id], 0);
            pruefe('Stammdaten werden korrigiert',
                document.getElementById('stam-kasse').value, 'Barmer');

            // Nichts darf verloren gehen
            pruefe('Notizen bleiben erhalten', erstgespraechNotes, 'Wichtige Notiz aus dem Erstgespräch.');
            pruefe('Notizfeld bleibt gefüllt',
                document.getElementById('erstgespraech-notes').value, 'Wichtige Notiz aus dem Erstgespräch.');
            pruefeWahr('Geschriebene Stellungnahme bleibt erhalten',
                (appealDraft || '').includes('Bereits geschriebene Stellungnahme'));
            pruefe('Betreffende Person bleibt stehen',
                document.getElementById('stam-betreffend').value, 'Herr Max Muster');
            pruefeWahr('Prüfansicht ist wieder geschlossen',
                !document.getElementById('review-overlay').classList.contains('active'));
            pruefe('Überschrift wieder auf Einlesen gestellt',
                document.getElementById('review-titel').textContent, 'Gutachten prüfen & übernehmen');

            // Protokoll und Veraltet-Hinweis
            pruefeWahr('Korrekturen stehen im Protokoll',
                bewertungsProtokoll.some(e => e.nr === '4.1.1')
                && bewertungsProtokoll.some(e => e.quelle === BEWERTUNG_QUELLEN.import));
            pruefeWahr('Stellungnahme wird als veraltet gekennzeichnet', stellungnahmeVeraltet === true);
            pruefeWahr('Hinweis über der Stellungnahme erscheint',
                veraltetHinweisHtml().includes('korrigiert'));

            // Ohne bereits geschriebene Stellungnahme keine Veraltet-Warnung
            stellungnahmeVeraltet = false;
            appealDraft = '';
            const docEl0 = document.getElementById('appeal-document');
            if (docEl0) docEl0.innerHTML = '';
            oeffneKorrektur();
            rvValNum(k('4.2.6').id, '1');
            uebernehmeKorrektur();
            pruefe('Ohne Stellungnahme keine Veraltet-Warnung', stellungnahmeVeraltet, false);
            pruefe('Korrektur wirkt trotzdem', stateOrig.values[k('4.2.6').id], 1);
            pruefe('Kein Hinweis ohne Veraltung', veraltetHinweisHtml(), '');

            // Nicht angefasste Kriterien dürfen NICHT geschrieben werden – sonst landete
            // in jedem unbewerteten Kriterium stillschweigend eine Null.
            delete stateOrig.values[k('4.3.9').id];
            delete stateEigene.values[k('4.3.9').id];
            protokollLeeren();
            oeffneKorrektur();
            rvValNum(k('4.2.6').id, '2');          // nur EIN Kriterium anfassen
            uebernehmeKorrektur();
            pruefeWahr('Unangetastetes Kriterium bleibt unbewertet',
                stateOrig.values[k('4.3.9').id] === undefined);
            pruefe('Nur das angefasste Kriterium wird geschrieben',
                bewertungsProtokoll.filter(e => e.nr !== '—').map(e => e.nr), ['4.2.6', '4.2.6']);
            pruefe('Angefasstes Kriterium ist gesetzt', stateOrig.values[k('4.2.6').id], 2);

            // Hochgeladene Unterlagen werden gemerkt und nicht doppelt geführt
            const probeDatei = new File(['x'], 'Gutachten.pdf', { type: 'application/pdf' });
            merkeImportDokument(probeDatei, 'application/pdf');
            merkeImportDokument(probeDatei, 'application/pdf');
            merkeImportDokument(new File(['y'], 'Bescheid.pdf', { type: 'application/pdf' }), 'application/pdf');
            pruefe('Unterlagen werden gemerkt, ohne Dopplung', importDokumente.map(d => d.name),
                ['Gutachten.pdf', 'Bescheid.pdf']);
            oeffneKorrektur();
            pruefe('Bei mehreren Unterlagen erscheint eine Auswahlleiste',
                document.querySelectorAll('#review-pdf .dok-tab').length, 2);
            closeReview();
            pruefe('Abbrechen stellt den Kopf zurück',
                document.getElementById('review-titel').textContent, 'Gutachten prüfen & übernehmen');
            pruefe('Abbrechen ändert nichts', stateOrig.values[k('4.2.6').id], 2);

            importDokumente = merkDok;
            stellungnahmeVeraltet = false;
            protokollLeeren();
            leeren();
        }

        // ---------- 11a. Notizfeld im Reiter „Einschätzung" ----------
        {
            const feld = document.getElementById('erstgespraech-notes');
            pruefeWahr('Notizfeld vorhanden', !!feld);
            pruefeWahr('Notizfeld liegt im Reiter Einschätzung',
                !!feld && !!feld.closest('#tab-3'));
            pruefeWahr('Notizfeld nicht mehr in der Auswertung',
                !!feld && !feld.closest('#tab-4'));
            // Es darf nur ein einziges Feld dieser Kennung geben, sonst greift die falsche Eingabe
            pruefe('Notizfeld genau einmal im Dokument',
                document.querySelectorAll('#erstgespraech-notes').length, 1);
            // Steht über der Einschätzung der einzelnen Module
            const tabelle = document.getElementById('table-body-own');
            pruefeWahr('Notizfeld steht über der Modultabelle',
                !!feld && !!tabelle &&
                (feld.compareDocumentPosition(tabelle) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);

            // Eingabe wird übernommen und übersteht den Aufbau der Auswertung
            const vorher = erstgespraechNotes;
            feld.value = 'Probe: Notiz aus dem Erstgespräch.';
            feld.dispatchEvent(new Event('input'));
            pruefe('Notiz wird übernommen', erstgespraechNotes, 'Probe: Notiz aus dem Erstgespräch.');
            renderAuswertung();
            pruefe('Notiz überlebt den Wechsel in die Auswertung',
                document.getElementById('erstgespraech-notes').value, 'Probe: Notiz aus dem Erstgespräch.');
            // Beim Laden eines Falls wird der Text zurückgeschrieben
            erstgespraechNotes = 'Aus dem gespeicherten Fall.';
            init();
            pruefe('Notiz wird beim Aufbau zurückgeschrieben',
                document.getElementById('erstgespraech-notes').value, 'Aus dem gespeicherten Fall.');
            erstgespraechNotes = vorher;
            init();
        }

        // ---------- 11b. Handreichung an der Schaltfläche (i) ----------
        if (typeof LAIEN_TEXTE !== 'undefined') {
            const nrs = Object.keys(LAIEN_TEXTE);
            pruefe('Handreichung: nur bekannte Kriterien',
                nrs.filter(nr => !ITEMS.some(i => i.nr === nr)), []);
            pruefe('Handreichung: Modul 6 nicht enthalten (nicht beschrieben)',
                nrs.filter(nr => nr.startsWith('4.6')), []);
            // Ohne die Sonderregel „Besondere Bedarfskonstellation" (§ 15 Abs. 4) – kein Modulkriterium
            pruefe('Handreichung: Module 1 bis 5 vollständig',
                ITEMS.filter(i => /^4\.[1-5]\./.test(i.nr) && !LAIEN_TEXTE[i.nr]).map(i => i.nr), []);
            pruefe('Handreichung: deckt 58 der 65 Einträge ab',
                ITEMS.filter(i => LAIEN_TEXTE[i.nr]).length, 58);
            pruefe('Handreichung: jeder Eintrag hat Titel und Inhalt',
                nrs.filter(nr => !LAIEN_TEXTE[nr].titel
                              || !Array.isArray(LAIEN_TEXTE[nr].zeilen)
                              || !LAIEN_TEXTE[nr].zeilen.length), []);
            pruefe('Handreichung: nur Ebene 0 und 1',
                nrs.filter(nr => LAIEN_TEXTE[nr].zeilen.some(z => z[0] !== 0 && z[0] !== 1)), []);
            pruefe('Handreichung: keine leeren Zeilen',
                nrs.filter(nr => LAIEN_TEXTE[nr].zeilen.some(z => !String(z[1]).trim())), []);
            pruefe('Handreichung: 374 Zeilen insgesamt',
                nrs.reduce((s, nr) => s + LAIEN_TEXTE[nr].zeilen.length, 0), 374);

            // Wortlaut unverändert – Stichproben aus dem Originaldokument
            const wortlaut = (nr, i) => LAIEN_TEXTE[nr].zeilen[i][1];
            pruefe('Wortlaut 4.1.1 Hilfsmittel-Regel', wortlaut('4.1.1', 1),
                'Hilfsmittel-Regel: Nutzt die Person Hilfsmittel (Bettgalgen, Griffe, Seitengitter, '
                + 'Strickleiter) und schafft sie damit ganz allein? -> selbständig (0 Punkte).');
            pruefe('Wortlaut 4.5.1 Wichtig', wortlaut('4.5.1', 2),
                'Wichtig: Das Richten der Tabletten zählt nur 1-mal wöchentlich. Das Bereitstellen am '
                + 'Morgen zählt 1-mal täglich. Eine Erinnerung zählt nur bei kognitiven Einschränkungen. '
                + 'Nicht verordnete Medikamente, Vitaminpräparate, frei verkäufliche Medikamente oder '
                + 'Bedarfsmedikation (z. B. Einnahme bei Schmerzen) werden hier nicht gewertet.');
            pruefe('Wortlaut 4.3.11 höchste Stufe', wortlaut('4.3.11', 7),
                '5: Täglich: Völlige Apathie und keine Motivation von außen erreicht die Person mehr.');
            pruefeWahr('Handreichung: Ansprache des Verfassers erhalten',
                wortlaut('4.1.1', 4).includes('Du musst nur geringfügig helfen'));

            // Schaltfläche (i) und Anzeige
            pruefe('Schaltfläche (i) bei allen beschriebenen Kriterien',
                ITEMS.filter(i => LAIEN_TEXTE[i.nr] && !hatErlaeuterung(i)).map(i => i.nr), []);
            const modul6 = ITEMS.find(i => i.nr === '4.6.2');
            pruefeWahr('Modul 6 fällt auf die bisherigen Kurzhinweise zurück',
                !LAIEN_TEXTE['4.6.2'] && hatErlaeuterung(modul6) === !!(modul6.info && (modul6.info.check || modul6.info.steps)));

            const itemA = ITEMS.find(i => i.nr === '4.1.1');
            const knopf = document.querySelector('#row-own-' + itemA.id + ' .info-btn');
            pruefeWahr('Schaltfläche zeigt (i) statt Strich', !!knopf && knopf.innerText.trim() === 'i');
            selectItem(itemA.id, 'own', knopf);
            const rumpf = document.getElementById('side-body-own');
            pruefe('Anzeige: alle Zeilen des Kriteriums',
                rumpf.querySelectorAll('.laien-zeile').length, LAIEN_TEXTE['4.1.1'].zeilen.length);
            pruefeWahr('Anzeige: Wortlaut erscheint unverändert',
                rumpf.innerText.includes('Bettgalgen, Griffe, Seitengitter, Strickleiter'));
            pruefe('Anzeige: Titel aus der Handreichung',
                document.getElementById('side-title-own').innerText, '4.1.1 Positionswechsel im Bett');
            pruefe('Anzeige: Abstufungen eingerückt',
                rumpf.querySelectorAll('.laien-zeile.stufe').length,
                LAIEN_TEXTE['4.1.1'].zeilen.filter(z => z[0] === 1).length);
            selectItem(itemA.id, 'own', knopf);   // wieder zuklappen

            // Sonderzeichen dürfen die Anzeige nicht zerlegen
            pruefeWahr('Anzeige: Sonderzeichen werden entschärft',
                laienZeileHtml(0, 'Test: <b>x</b> & "y"').includes('&lt;b&gt;'));
        }

        // ---------- 12. Befundkatalog ----------
        if (typeof BEFUND_GRUPPEN !== 'undefined') {
            pruefe('Befundkatalog: sieben Gruppen', BEFUND_GRUPPEN.length, 7);
            pruefeWahr('Befundkatalog: untere Extremitäten entfernt', !BEFUND_GRUPPEN.some(g => g.id === 'untere'));
            const tremor = (BEFUND_GRUPPEN.find(g => g.id === 'sonstiges') || { eintraege: [] })
                .eintraege.find(e => e.id === 'tremor');
            pruefeWahr('Tremor vorhanden, seitengetrennt', !!tremor && tremor.seiten === true);
            pruefe('Tremor: feinschlägig oder grobschlägig', tremor && tremor.skala, ['feinschlägig', 'grobschlägig']);
            pruefe('Tremor: Auftreten wählbar', tremor && tremor.zusatzAuswahl && tremor.zusatzAuswahl.skala,
                ['bei Belastung', 'in Ruhe', 'bei Belastung und in Ruhe']);
            const verknuepfungsfehler = [];
            BEFUND_GRUPPEN.forEach(g => g.eintraege.forEach(e => {
                if (e.nba) {
                    const it = ITEMS.find(i => i.nr === e.nba);
                    if (!it) verknuepfungsfehler.push('unbekannt: ' + e.nba);
                    else if (!it.opts || it.opts.length !== e.skala.length)
                        verknuepfungsfehler.push(e.nba + ': Stufenzahl passt nicht');
                }
                (e.stuetzt || []).forEach(s => {
                    if (!ITEMS.find(i => i.nr === s.nr)) verknuepfungsfehler.push('gestütztes Kriterium unbekannt: ' + s.nr);
                });
            }));
            pruefe('Befundkatalog: alle Verknüpfungen gültig', verknuepfungsfehler, []);

            // Aufbau des Katalogs prüfen: eindeutige Kennungen, gültige Schwellen, saubere Felder
            const katalogfehler = [];
            const gesehen = {};
            BEFUND_GRUPPEN.forEach(g => g.eintraege.forEach(e => {
                if (gesehen[e.id]) katalogfehler.push('Kennung doppelt: ' + e.id);
                gesehen[e.id] = true;
                if (!e.frei && (!Array.isArray(e.skala) || !e.skala.length))
                    katalogfehler.push('ohne Skala: ' + e.id);
                (e.stuetzt || []).forEach(s => {
                    if (!(s.ab >= 1)) katalogfehler.push(e.id + ': Schwelle muss mindestens 1 sein');
                    if (e.skala && s.ab > e.skala.length - 1)
                        katalogfehler.push(e.id + ': Schwelle ' + s.ab + ' liegt über der Skala');
                });
                if (e.zusatzAuswahl && (!Array.isArray(e.zusatzAuswahl.skala) || !e.zusatzAuswahl.skala.length))
                    katalogfehler.push(e.id + ': zweites Auswahlfeld ohne Optionen');
            }));
            pruefe('Befundkatalog: Aufbau fehlerfrei', katalogfehler, []);
            pruefeWahr('Gehstrecke und genutzte Hilfsmittel entfernt',
                !gesehen['gehstrecke'] && !gesehen['gehhilfen']);
            pruefeWahr('Kau- und Zahnstatus entfernt', !gesehen['zahnstatus']);
            pruefeWahr('Schmerz entfernt', !gesehen['schmerz']);
            const atm = BEFUND_GRUPPEN.find(g => g.id === 'sonstiges').eintraege.find(e => e.id === 'atmung');
            pruefe('Atmung: neue Auswahl', atm && atm.skala,
                ['Unauffällig', 'Dyspnoe bei größerer Belastung', 'Dyspnoe bei geringer Belastung', 'Dyspnoe bereits in Ruhe']);
            const oed = BEFUND_GRUPPEN.find(g => g.id === 'sonstiges').eintraege.find(e => e.id === 'oedeme');
            pruefe('Ödeme: neue Auswahl', oed && oed.skala,
                ['Ödeme obere Extremitäten', 'Ödeme untere Extremitäten']);

            const sicherungBefund = befundSichern();
            const krit = nr => ITEMS.find(i => i.nr === nr);
            leeren();
            // NBA-Eintrag schreibt unmittelbar in die eigene Einschätzung
            setzeBefund('kognition', 'k_4_2_6', null, '1');
            pruefe('Befund: NBA-Eintrag wird übernommen', stateEigene.values[krit('4.2.6').id], 1);
            // Funktionsbefund setzt nichts, schlägt nur vor
            setzeBefund('obere', 'schuerzengriff', 'rechts', '3');
            pruefe('Befund: Funktionsbefund setzt keine Bewertung', stateEigene.values[krit('4.4.3').id], 0);
            const vorschlaege = befundVorschlaege().map(v => v.item.nr).sort();
            pruefe('Befund: Schürzengriff schlägt 4.4.3, 4.4.6 und 4.4.10 vor', vorschlaege, ['4.4.10', '4.4.3', '4.4.6']);
            // Bereits abweichend bewertete Kriterien nicht erneut vorschlagen
            stateEigene.values[krit('4.4.3').id] = 1;
            pruefeWahr('Befund: bereits abweichende Kriterien entfallen',
                !befundVorschlaege().map(v => v.item.nr).includes('4.4.3'));
            // BMI
            setzeBefundText('groesse', null, '172'); setzeBefundText('gewicht', null, '68');
            pruefe('Befund: BMI wird berechnet', befundTexte['bmi'], '23,0');

            // ---------- Modul 3: nur bestehende Problemlagen ----------
            const gPsy = BEFUND_GRUPPEN.find(g => g.id === 'psyche');
            pruefeWahr('Modul 3: Sonderdarstellung statt Vollliste',
                gPsy.sonder === 'psyche' && gPsy.eintraege.length === 0 && gPsy.kriterien.length === 13);
            pruefe('Modul 3: Häufigkeiten im BRi-Wortlaut', PSYCHE_HAEUFIGKEIT, [
                'nie oder sehr selten',
                'selten – ein- bis dreimal innerhalb von zwei Wochen',
                'häufig – zweimal bis mehrmals wöchentlich, aber nicht täglich',
                'täglich']);
            pruefe('Modul 3: drei Bewertungen', PSYCHE_WERTUNG,
                ['selbständig kompensiert', 'nach BRi nicht zu werten', 'umfassende personelle Intervention notwendig']);
            pruefe('Modul 3: Punktwerte der Häufigkeiten', krit('4.3.1').val, [0, 1, 3, 5]);
            pruefeWahr('Modul 3: Skalenlänge passt zu den Häufigkeiten',
                gPsy.kriterien.every(nr => krit(nr).opts.length === PSYCHE_HAEUFIGKEIT.length));

            psycheListe = [];
            stateEigene.values[krit('4.3.9').id] = 0;
            stateOrig.values[krit('4.3.9').id] = 0;
            psycheHinzu('4.3.9');
            pruefe('Modul 3: Problemlage aufgenommen', psycheListe.length, 1);
            pruefeWahr('Modul 3: erfasste Problemlage nicht mehr in der Auswahl',
                !psycheOffen().includes('4.3.9'));
            // Häufigkeit allein wertet noch nicht
            psycheSetzen(0, 'haeufigkeit', '3');
            pruefe('Modul 3: Häufigkeit allein wertet nicht', stateEigene.values[krit('4.3.9').id], 0);
            // Erst mit personeller Intervention
            psycheSetzen(0, 'wertung', '2');
            pruefe('Modul 3: mit Intervention wird gewertet', stateEigene.values[krit('4.3.9').id], 3);
            // Kompensiert setzt zurück auf 0
            psycheSetzen(0, 'wertung', '0');
            pruefe('Modul 3: kompensiert ergibt 0', stateEigene.values[krit('4.3.9').id], 0);
            psycheSetzen(0, 'wertung', '1');
            pruefe('Modul 3: nach BRi nicht zu werten ergibt 0', stateEigene.values[krit('4.3.9').id], 0);
            // Bemerkung und Zusammenfassung
            psycheSetzen(0, 'bemerkung', 'optische Halluzinationen abends');
            pruefeWahr('Modul 3: Bemerkung in der Zusammenfassung',
                psycheZusammenfassung()[0].includes('optische Halluzinationen abends'));
            pruefeWahr('Modul 3: Zusammenfassung nennt Kriterium und Häufigkeit',
                psycheZusammenfassung()[0].includes('4.3.9')
                && psycheZusammenfassung()[0].includes('täglich'));
            // Entfernen stellt den Wert des Vorgutachtens wieder her
            stateOrig.values[krit('4.3.9').id] = 1;
            psycheSetzen(0, 'wertung', '2');
            pruefe('Modul 3: erneut gewertet', stateEigene.values[krit('4.3.9').id], 3);
            psycheEntfernen(0);
            pruefe('Modul 3: Entfernen stellt das Vorgutachten wieder her', stateEigene.values[krit('4.3.9').id], 1);
            pruefe('Modul 3: Liste wieder leer', psycheListe.length, 0);
            pruefeWahr('Modul 3: keine Zusammenfassung ohne Problemlage', psycheZusammenfassung().length === 0);
            // Speichern und Laden
            psycheHinzu('4.3.2'); psycheSetzen(0, 'haeufigkeit', '2'); psycheSetzen(0, 'wertung', '2');
            const gesichertPsy = JSON.parse(JSON.stringify(befundSichern()));
            psycheListe = [];
            befundLaden(gesichertPsy);
            pruefe('Modul 3: Problemlagen werden gesichert und geladen', psycheListe.length, 1);
            pruefe('Modul 3: Häufigkeit übersteht das Laden', psycheListe[0].haeufigkeit, 2);
            psycheListe = [];

            befundLaden(sicherungBefund);

            // Reiter nur in den neuen Vorgängen
            setzeModus('widerspruch');
            pruefe('Befundreiter im Widerspruch verborgen', document.getElementById('btn-tab-befund').style.display, 'none');
            setzeModus('hoeherstufung');
            pruefeWahr('Befundreiter im Höherstufungsantrag sichtbar',
                document.getElementById('btn-tab-befund').style.display !== 'none');
            setzeModus('widerspruch');
        }

        // ---------- 13. Erweiterte Erfassung und Übernahme in Modul 5 ----------
        if (typeof ERFASSUNG_TABELLEN !== 'undefined') {
            pruefe('Erfassung: sechs Tabellen', ERFASSUNG_TABELLEN.length, 6);
            const sicherungErf = erfassungSichern();
            erfassung = {}; erfassungExtra = {};

            // Wochenstunden aus Tagen und Stunden
            erfSetzen('pflegepersonen', 0, 'tage', '5');
            erfSetzen('pflegepersonen', 0, 'stunden', '3');
            pruefe('Erfassung: Wochenstunden werden berechnet', erfassung.pflegepersonen[0].wochenstunden, '15');

            // Zuordnung zu Modul 5
            erfassung.arztbesuche = [
                { fach: 'Hausarzt', anzahl: '2', zeitraum: 'pro Monat', begleitung: 'in Begleitung', dauer3h: 'nein' },
                { fach: 'Physiotherapie', anzahl: '2', zeitraum: 'pro Woche', begleitung: 'in Begleitung', dauer3h: 'nein' },
                { fach: 'Dialyse', anzahl: '3', zeitraum: 'pro Woche', begleitung: 'in Begleitung', dauer3h: 'ja' },
                { fach: 'Augenarzt', anzahl: '1', zeitraum: 'pro Monat', begleitung: 'selbständig', dauer3h: 'nein' }
            ];
            erfassung.medikation = [
                { applikation: 'oral', anzahl: '3', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { applikation: 'Injektion', anzahl: '4', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { applikation: 'oral', anzahl: '1', zeitraum: 'pro Tag', durchfuehrung: 'selbständig' }
            ];
            erfassung.behandlungspflege = [
                { art: 'Kompressionsstrümpfe anlegen', anzahl: '1', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { art: 'Kompressionsstrümpfe ablegen', anzahl: '1', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { art: 'Verbandswechsel', anzahl: '3', zeitraum: 'pro Woche', durchfuehrung: 'durch Pflegeperson' }
            ];
            const z = modul5AusErfassung();
            const kurz = nr => z[nr] ? z[nr].count + z[nr].period : 'fehlt';
            pruefe('Modul 5: Arztbesuche (4.5.13)', kurz('4.5.13'), '2M');
            pruefe('Modul 5: Therapiebesuche (4.5.14)', kurz('4.5.14'), '2W');
            pruefe('Modul 5: zeitaufwendige Besuche (4.5.15)', kurz('4.5.15'), '3W');
            pruefe('Modul 5: Medikation (4.5.1)', kurz('4.5.1'), '3D');
            pruefe('Modul 5: Injektionen (4.5.2)', kurz('4.5.2'), '4D');
            pruefe('Modul 5: körpernahe Hilfsmittel summiert (4.5.7)', kurz('4.5.7'), '2D');
            pruefe('Modul 5: Verbandswechsel (4.5.8)', kurz('4.5.8'), '3W');

            // Quartal und Jahr: nur bei den Arztbesuchen wählbar, Umlage auf den Monat
            pruefe('Arztbesuche: fünf Zeiträume wählbar', ARZT_ZEITRAUM,
                ['pro Tag', 'pro Woche', 'pro Monat', 'im Quartal', 'im Jahr']);
            pruefe('Übrige Tabellen behalten drei Zeiträume', HAEUFIGKEIT_ZEITRAUM,
                ['pro Tag', 'pro Woche', 'pro Monat']);
            pruefe('Zeitraumspalte der Arztbesuche nutzt die erweiterte Liste',
                ERFASSUNG_TABELLEN.find(t => t.id === 'arztbesuche').spalten.find(s => s.k === 'zeitraum').opt,
                ARZT_ZEITRAUM);
            ['medikation', 'behandlungspflege', 'hilfsmittel'].forEach(tid => {
                const sp = (ERFASSUNG_TABELLEN.find(t => t.id === tid) || { spalten: [] })
                    .spalten.find(s => s.k === 'zeitraum');
                pruefeWahr('Tabelle „' + tid + '" ohne Quartal und Jahr',
                    !sp || sp.opt.indexOf('im Quartal') === -1);
            });

            erfassung.medikation = []; erfassung.behandlungspflege = []; erfassung.hilfsmittel = [];
            erfassung.arztbesuche = [
                { fach: 'Kardiologe', anzahl: '1', zeitraum: 'im Quartal', begleitung: 'in Begleitung', dauer3h: 'nein' }
            ];
            let zq = modul5AusErfassung();
            pruefe('Einmal im Quartal ergibt 0,33 pro Monat',
                zq['4.5.13'] && zq['4.5.13'].count + zq['4.5.13'].period, '0.33M');
            erfassung.arztbesuche = [
                { fach: 'Augenarzt', anzahl: '2', zeitraum: 'im Jahr', begleitung: 'in Begleitung', dauer3h: 'nein' }
            ];
            zq = modul5AusErfassung();
            pruefe('Zweimal im Jahr ergibt 0,17 pro Monat',
                zq['4.5.13'] && zq['4.5.13'].count + zq['4.5.13'].period, '0.17M');
            // Zusammen mit häufigeren Terminen wird korrekt aufsummiert
            erfassung.arztbesuche = [
                { fach: 'Hausarzt', anzahl: '1', zeitraum: 'pro Monat', begleitung: 'in Begleitung', dauer3h: 'nein' },
                { fach: 'Kardiologe', anzahl: '1', zeitraum: 'im Quartal', begleitung: 'in Begleitung', dauer3h: 'nein' }
            ];
            zq = modul5AusErfassung();
            pruefe('Monatlich und quartalsweise werden addiert',
                zq['4.5.13'] && zq['4.5.13'].count + zq['4.5.13'].period, '1.33M');
            // Ohne Begleitung weiterhin keine Wertung
            erfassung.arztbesuche = [
                { fach: 'Urologe', anzahl: '4', zeitraum: 'im Jahr', begleitung: 'selbständig', dauer3h: 'nein' }
            ];
            pruefe('Selbständige Termine zählen auch quartalsweise nicht',
                Object.keys(modul5AusErfassung()).length, 0);
            // Darstellung im Dokument gibt den gewählten Zeitraum wörtlich wieder
            pruefe('Dokument nennt den Zeitraum wörtlich',
                haeufigkeitText({ anzahl: '2', zeitraum: 'im Quartal' }), '2× im Quartal');

            // Hilfsmittel: mit personeller Hilfe zu 4.5.7, mit den Ausschlüssen der BRi
            erfassung.hilfsmittel = [
                { bezeichnung: 'Kompressionsstrümpfe', anzahl: '2', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Brille', anzahl: '2', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Zahnprothesen', anzahl: '2', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Walkingstöcke', anzahl: '1', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Katheter für intermittierenden Selbstkatheterismus', anzahl: '4', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Hörgerät', anzahl: '2', zeitraum: 'pro Tag', durchfuehrung: 'selbständig' }
            ];
            erfassung.behandlungspflege = []; erfassung.medikation = []; erfassung.arztbesuche = [];
            const zh = modul5AusErfassung();
            const kurzH = nr => zh[nr] ? zh[nr].count + zh[nr].period : 'fehlt';
            pruefe('Hilfsmittel: Kompressionsstrümpfe zu 4.5.7', kurzH('4.5.7'), '2D');
            pruefe('Hilfsmittel: Katheter zu 4.5.10', kurzH('4.5.10'), '4D');
            pruefe('Hilfsmittel: Brille, Zahnprothese und Gehhilfen zählen nicht',
                Object.keys(zh).sort(), ['4.5.10', '4.5.7']);
            pruefeWahr('Modul 5: selbständige Maßnahmen zählen nicht',
                !Object.keys(z).some(nr => nr === '4.5.14' && z[nr].count > 2));
            erfassungLaden(sicherungErf);
        }

        // ---------- 14. Antragsvorlage (Höherstufung und Erstantrag) ----------
        if (typeof buildHoeherstufung === 'function') {
            const modusVor = appModus, extraVor = erfassungExtra, erfVor = erfassung;
            const bwVor = befundWerte, btVor = befundTexte;

            setzeModus('hoeherstufung');
            erfassungExtra = { pg: '2', vorgutachten: '2024-05-14', verschlechterung: 'seit dem Sturz im März 2026' };
            erfassung = { pflegepersonen: [{ art: 'Pflegeperson', name: 'Erika Mustermann', tage: '7', stunden: '2', wochenstunden: '14' }] };
            befundTexte = { groesse: '175', gewicht: '80' }; berechneBmi();
            befundWerte = { 'schuerzengriff|rechts': 2 };
            leeren();
            const doc = document.createElement('div');
            doc.innerHTML = buildHoeherstufung('', {}, '');

            pruefeWahr('Antragsvorlage: Marken zum Zusammenführen vorhanden',
                ['stmt-data', 'stmt-notes', 'stmt-cmp-body', 'stmt-crit'].every(i => doc.querySelector('#' + i)));
            pruefe('Höherstufung: Gegenüberstellung hat zwei Wertespalten',
                doc.querySelectorAll('#stmt-cmp-body tr')[0].children.length, 3);
            pruefeWahr('Höherstufung: Verschlechterung steht im Dokument', doc.innerHTML.includes('seit dem Sturz im März 2026'));
            pruefeWahr('Höherstufung: Pflegeperson steht im Dokument', doc.innerHTML.includes('Erika Mustermann'));
            pruefeWahr('Höherstufung: BMI steht im Dokument', doc.innerHTML.includes('26,1'));
            pruefeWahr('Höherstufung: kein Vorwurf an den Gutachter im Einleitungstext',
                !/Fehler|übersehen|unterlassen|ignorier/i.test(doc.querySelector('#stmt-cmp-body')?.closest('table')?.previousElementSibling?.textContent || ''));
            pruefeWahr('Befundblock zeigt nur Auffälligkeiten',
                doc.innerHTML.includes('Schürzengriff rechts') && !doc.innerHTML.includes('4.2.1 Personen aus dem näheren Umfeld erkennen'));

            setzeModus('erstantrag');
            const doc2 = document.createElement('div');
            doc2.innerHTML = buildHoeherstufung('', {}, '');
            pruefe('Erstantrag: Gegenüberstellung hat eine Wertespalte',
                doc2.querySelectorAll('#stmt-cmp-body tr')[0].children.length, 2);
            pruefeWahr('Erstantrag: kein Bezug auf ein Vorgutachten',
                !doc2.innerHTML.includes('Datum Vorgutachten'));

            // Der Widerspruch nutzt weiterhin die alte Vorlage
            setzeModus('widerspruch');
            pruefeWahr('Widerspruch nutzt unverändert die bisherige Vorlage',
                baueDokument('', {}, '') === buildStellungnahme('', {}, ''));

            erfassungExtra = extraVor; erfassung = erfVor;
            befundWerte = bwVor; befundTexte = btVor; setzeModus(modusVor);
        }

        // ---------- 15. Arztberichte und Deckblatt ----------
        if (typeof entdoppeln === 'function') {
            const roh = [
                { icd: 'I50.9', text: 'Herzinsuffizienz', ed: '', _quelle: 'A.pdf' },
                { icd: 'I50.9', text: 'Herzinsuffizienz', ed: '12.03.2020', _quelle: 'B.pdf' },
                { icd: 'E11.9', text: 'Diabetes mellitus Typ 2', ed: '', _quelle: 'B.pdf' },
                { icd: 'I50.9', text: 'Herzinsuffizienz', ed: '', _quelle: 'C.pdf' }
            ];
            const ent = entdoppeln(roh, x => ((x.icd || '') + '|' + (x.text || '')).toLowerCase().replace(/\s+/g, ' '));
            pruefe('Arztberichte: Diagnosen werden entdoppelt', ent.length, 2);
            pruefe('Arztberichte: vollständigerer Eintrag gewinnt',
                (ent.find(x => x.icd === 'I50.9') || {}).ed, '12.03.2020');
            pruefe('Arztberichte: alle Quellen werden gesammelt',
                (ent.find(x => x.icd === 'I50.9') || {})._quellen, ['A.pdf', 'B.pdf', 'C.pdf']);

            // Deckblatt
            const extraVor = erfassungExtra, modusVor2 = appModus;
            setzeModus('hoeherstufung');
            erfassungExtra = { pg: '2', verschlechterung: 'seit dem Sturz', deckblatt: true };
            const mitDeck = buildHoeherstufung('', {}, '');
            pruefeWahr('Deckblatt: wird vorangestellt', mitDeck.indexOf('deckblatt') >= 0
                && mitDeck.indexOf('Antrag auf Höherstufung des Pflegegrades') < mitDeck.indexOf('Pflegefachliche Stellungnahme'));
            pruefeWahr('Deckblatt: Unterschriftszeile vorhanden', mitDeck.includes('Unterschrift'));
            pruefeWahr('Deckblatt: Anlage benannt', mitDeck.includes('Anlage: Pflegefachliche Stellungnahme'));
            erfassungExtra = { pg: '2', deckblatt: false };
            pruefeWahr('Ohne Schalter kein Deckblatt', !buildHoeherstufung('', {}, '').includes('Antrag auf Höherstufung des Pflegegrades'));
            setzeModus('erstantrag');
            erfassungExtra = { deckblatt: true };
            pruefeWahr('Deckblatt: Erstantrag mit eigener Überschrift',
                buildHoeherstufung('', {}, '').includes('Antrag auf Feststellung der Pflegebedürftigkeit'));
            erfassungExtra = extraVor; setzeModus(modusVor2);
        }

        // ---------- 16. Ernährungszustand aus dem BMI ----------
        if (typeof leiteErnaehrungszustandAb === 'function') {
            const bwVor2 = befundWerte, btVor2 = befundTexte;
            befundWerte = {}; befundTexte = {};
            const ez = () => befundWerte['ernaehrungszustand'];
            const setzeMasse = (gr, gw) => { befundTexte['groesse'] = gr; befundTexte['gewicht'] = gw; berechneBmi(); };

            setzeMasse('175', '80');
            pruefe('BMI 26,1 ergibt Übergewicht', ez(), 2);
            setzeMasse('175', '70');
            pruefe('BMI 22,9 ergibt Normalgewicht', ez(), 0);
            setzeMasse('175', '55');
            pruefe('BMI 18,0 ergibt Untergewicht', ez(), 1);
            setzeMasse('175', '95');
            pruefe('BMI 31,0 ergibt Adipositas', ez(), 3);

            // Eigene Angabe hat Vorrang und bleibt erhalten
            setzeBefund('ernaehrung', 'ernaehrungszustand', null, '1');
            pruefe('Eigene Angabe wird gemerkt', befundTexte['ernaehrungszustand_manuell'], '1');
            setzeMasse('175', '95');
            pruefe('Eigene Angabe überlebt eine Gewichtsänderung', ez(), 1);
            ernaehrungszustandAutomatisch();
            pruefe('Zurück auf automatische Ableitung', ez(), 3);

            befundWerte = bwVor2; befundTexte = btVor2;
        }

        // ---------- 17. Speichern und Laden über alle Bereiche ----------
        if (typeof erfassungSichern === 'function' && typeof befundSichern === 'function') {
            const sichBef = befundSichern(), sichErf = erfassungSichern(), modusVor3 = appModus;
            setzeModus('hoeherstufung');
            befundWerte = { 'schuerzengriff|rechts': 2 };
            befundTexte = { groesse: '170', gewicht: '60' };
            befundExtra = { sonstiges: [{ titel: 'Tremor', text: 'beidseits' }] };
            erfassung = { hilfsmittel: [{ bezeichnung: 'Rollator' }] };
            erfassungExtra = { pg: '3', verschlechterung: 'nach Sturz', deckblatt: true };

            const gespeichert = JSON.parse(JSON.stringify({
                appModus: appModus, befund: befundSichern(), erfassung: erfassungSichern()
            }));
            // alles leeren und aus der Sicherung wiederherstellen
            befundLaden({}); erfassungLaden({}); setzeModus('widerspruch');
            setzeModus(gespeichert.appModus);
            befundLaden(gespeichert.befund);
            erfassungLaden(gespeichert.erfassung);

            pruefe('Speichern und Laden: Vorgangsart', appModus, 'hoeherstufung');
            pruefe('Speichern und Laden: Befundwert', befundWerte['schuerzengriff|rechts'], 2);
            pruefe('Speichern und Laden: Befundtext', befundTexte['groesse'], '170');
            pruefe('Speichern und Laden: eigener Befundeintrag', (befundExtra.sonstiges || [])[0] && befundExtra.sonstiges[0].titel, 'Tremor');
            pruefe('Speichern und Laden: Erfassungstabelle', (erfassung.hilfsmittel || [])[0] && erfassung.hilfsmittel[0].bezeichnung, 'Rollator');
            pruefe('Speichern und Laden: Verschlechterung', erfassungExtra.verschlechterung, 'nach Sturz');
            pruefe('Speichern und Laden: Deckblattschalter', erfassungExtra.deckblatt, true);

            befundLaden(sichBef); erfassungLaden(sichErf); setzeModus(modusVor3);
        }

        // ---------- 17b. Ganzen Fall speichern und wieder laden ----------
        // Prüft den Weg, den der Berater tatsächlich geht: „Speichern" schreibt eine Datei,
        // „Fall laden" liest sie zurück. Entscheidend sind die eigene Einschätzung und die
        // geschriebene Stellungnahme einschliesslich eigener Ergänzungen.
        if (typeof saveCase === 'function' && typeof loadCase === 'function') {
            const k = nr => ITEMS.find(i => i.nr === nr);
            const merkFelder = {};
            document.querySelectorAll('[id^="stam-"], [id^="diag-"]').forEach(el => merkFelder[el.id] = el.value);
            const merkBef = JSON.parse(JSON.stringify(befundSichern()));
            const merkErf = JSON.parse(JSON.stringify(erfassungSichern()));
            const merkModus = appModus;

            leeren();
            setzeModus('widerspruch');
            setzeBewertung('orig', k('4.4.1').id, 1, 'import');
            setzeBewertung('own',  k('4.4.1').id, 3, 'berater');
            setzeBewertung('orig', k('4.5.1').id, { count: 0, period: 'W' }, 'import');
            setzeBewertung('own',  k('4.5.1').id, { count: 3, period: 'D' }, 'berater');
            stateEigene.special = 1;
            // Dritter Stand muss ebenfalls mitgespeichert werden
            stateZweit = { special: 0, values: {} };
            setzeBewertung('zweit', k('4.4.1').id, 2, 'import');
            document.getElementById('stam-betreffend').value = 'Herr Speicher Test';
            document.getElementById('stam-kasse').value = 'Testkasse';
            erstgespraechNotes = 'Notiz für die Speicherprobe.';
            const notizFeld2 = document.getElementById('erstgespraech-notes');
            if (notizFeld2) notizFeld2.value = erstgespraechNotes;
            appealDraft = '<div class="stmt"><p>Erzeugte Stellungnahme</p><p>VON HAND ERGAENZT</p></div>';
            const dokFeld = document.getElementById('appeal-document');
            if (dokFeld) dokFeld.innerHTML = appealDraft;
            psycheListe = []; psycheHinzu('4.3.9'); psycheSetzen(0, 'haeufigkeit', '3'); psycheSetzen(0, 'wertung', '2');

            // „Speichern" abfangen, statt eine Datei zu schreiben. Der Dateidialog wird
            // nachgestellt – sonst öffnete der Test ein echtes Fenster.
            let json = null, dialogName = null, dialogStart = null;
            const eBlob = window.Blob, eUrl = URL.createObjectURL, eClick = HTMLAnchorElement.prototype.click;
            const eDialog = window.showSaveFilePicker;
            window.Blob = function (t, o) { json = t.join(''); return new eBlob(t, o); };
            URL.createObjectURL = () => 'blob:selbsttest';
            HTMLAnchorElement.prototype.click = function () {};
            window.showSaveFilePicker = async (opt) => {
                dialogName = opt && opt.suggestedName;
                dialogStart = opt && opt.startIn;
                return { name: opt.suggestedName,
                         createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
            };
            try { await saveCase(); } finally {
                window.Blob = eBlob; URL.createObjectURL = eUrl; HTMLAnchorElement.prototype.click = eClick;
                if (eDialog) window.showSaveFilePicker = eDialog; else delete window.showSaveFilePicker;
            }
            pruefe('Fall speichern: Dateiname wird vorgeschlagen', dialogName,
                'Herr_Speicher_Test_Pflegegradassistent.json');
            pruefeWahr('Fall speichern nutzt den Speichern-unter-Dialog',
                saveCase.toString().includes('speichereDatei'));
            pruefe('Fall speichern: Dialog beginnt im Download-Ordner', dialogStart, 'downloads');
            pruefeWahr('Speichern wird nachgewiesen',
                leseSpeicherungen().some(e => e.name === 'Herr_Speicher_Test_Pflegegradassistent.json'));
            pruefeWahr('Nachweis erscheint in der Auswertung',
                speicherungenHtml().includes('Herr_Speicher_Test_Pflegegradassistent.json'));
            pruefeWahr('Word-Dokument behält den Dokumentenordner',
                exportAppealWord.toString().indexOf("'downloads'") === -1);
            const d = json ? JSON.parse(json) : {};
            pruefeWahr('Fall speichern: Datei wird geschrieben', !!json);
            pruefe('Fall speichern: eigene Einschätzung', d.stateEigene && d.stateEigene.values[k('4.4.1').id], 3);
            pruefe('Fall speichern: Häufigkeit aus Modul 5',
                d.stateEigene && d.stateEigene.values[k('4.5.1').id], { count: 3, period: 'D' });
            pruefe('Fall speichern: Vorgutachten', d.stateOrig && d.stateOrig.values[k('4.4.1').id], 1);
            pruefe('Fall speichern: Besondere Bedarfskonstellation', d.stateEigene && d.stateEigene.special, 1);
            pruefeWahr('Fall speichern: Stellungnahme mit eigener Ergänzung',
                (d.appealDraft || '').includes('VON HAND ERGAENZT'));
            pruefe('Fall speichern: Notizen', d.erstgespraechNotes, 'Notiz für die Speicherprobe.');
            pruefe('Fall speichern: Stammdaten', d.stammdaten && d.stammdaten['stam-kasse'], 'Testkasse');
            pruefe('Fall speichern: psychische Problemlagen', (d.befund && d.befund.psyche || []).length, 1);
            pruefe('Fall speichern: Anhörungsgutachten',
                d.stateZweit && d.stateZweit.values[k('4.4.1').id], 2);

            // Alles zerstören und aus der Datei wiederherstellen
            leeren();
            stateEigene.special = 0;
            stateEigene.values[k('4.5.1').id] = { count: 0, period: 'W' };
            erstgespraechNotes = ''; appealDraft = '';
            psycheListe = [];
            stateZweit = { special: 0, values: {} };
            if (notizFeld2) notizFeld2.value = '';
            if (dokFeld) dokFeld.innerHTML = '';
            document.getElementById('stam-kasse').value = '';
            await new Promise(r => {
                loadCase({ target: { files: [new File([json], 'probe.json', { type: 'application/json' })], value: '' } });
                setTimeout(r, 400);
            });
            pruefe('Fall laden: eigene Einschätzung zurück', stateEigene.values[k('4.4.1').id], 3);
            pruefe('Fall laden: Häufigkeit aus Modul 5 zurück',
                stateEigene.values[k('4.5.1').id], { count: 3, period: 'D' });
            pruefe('Fall laden: Vorgutachten zurück', stateOrig.values[k('4.4.1').id], 1);
            pruefe('Fall laden: Besondere Bedarfskonstellation zurück', stateEigene.special, 1);
            pruefeWahr('Fall laden: Stellungnahme mit eigener Ergänzung zurück',
                (appealDraft || '').includes('VON HAND ERGAENZT'));
            pruefe('Fall laden: Notizen zurück', erstgespraechNotes, 'Notiz für die Speicherprobe.');
            pruefe('Fall laden: Notizfeld wieder gefüllt',
                document.getElementById('erstgespraech-notes').value, 'Notiz für die Speicherprobe.');
            pruefe('Fall laden: Stammdaten zurück',
                document.getElementById('stam-kasse').value, 'Testkasse');
            pruefe('Fall laden: psychische Problemlagen zurück', psycheListe.length, 1);
            pruefe('Fall laden: Anhörungsgutachten zurück', stateZweit.values[k('4.4.1').id], 2);
            // Punktzahl muss identisch sein – sonst stimmt die Wiederherstellung nur scheinbar
            pruefe('Fall laden: Punktzahl unverändert', calculateInternal('own').total, 100);
            // Die Stellungnahme muss auch wieder sichtbar werden
            renderAuswertung();
            pruefeWahr('Fall laden: Stellungnahme erscheint wieder im Feld',
                (document.getElementById('appeal-document')?.innerHTML || '').includes('VON HAND ERGAENZT'));
            pruefeWahr('Fall laden: Bereich der Stellungnahme wird eingeblendet',
                document.getElementById('appeal-result-container').style.display === 'block');

            // Fallwechsel: die Stellungnahme darf NIEMALS von einem Fall in den nächsten
            // übergehen. Das Anzeigefeld muss beim Laden mitgesetzt werden, weil „Speichern"
            // von dort liest.
            const fallA = JSON.stringify({ stateOrig: { special: 0, values: {} }, stateEigene: { special: 0, values: {} },
                stammdaten: { 'stam-betreffend': 'Frau AAA' }, erstgespraechNotes: 'A',
                appealDraft: '<p>STELLUNGNAHME VON FRAU AAA</p>' });
            const fallB = JSON.stringify({ stateOrig: { special: 0, values: {} }, stateEigene: { special: 0, values: {} },
                stammdaten: { 'stam-betreffend': 'Herr BBB' }, erstgespraechNotes: 'B',
                appealDraft: '<p>STELLUNGNAHME VON HERRN BBB</p>' });
            const ladeFall = async (t) => { await new Promise(r => {
                loadCase({ target: { files: [new File([t], 'f.json', { type: 'application/json' })], value: '' } });
                setTimeout(r, 400); }); };
            await ladeFall(fallA);
            renderAuswertung();                       // Fall A ansehen
            await ladeFall(fallB);                    // Fall B laden, ohne Reiter 4 zu öffnen
            pruefeWahr('Fallwechsel: Anzeigefeld zeigt den neuen Fall',
                (document.getElementById('appeal-document')?.innerHTML || '').includes('HERRN BBB'));
            let jsonB = null;
            const bBlob = window.Blob, bUrl = URL.createObjectURL, bClick = HTMLAnchorElement.prototype.click;
            const bDialog = window.showSaveFilePicker;
            window.Blob = function (t, o) { jsonB = t.join(''); return new bBlob(t, o); };
            URL.createObjectURL = () => 'blob:selbsttest';
            HTMLAnchorElement.prototype.click = function () {};
            window.showSaveFilePicker = async (o) => ({ name: o.suggestedName,
                createWritable: async () => ({ write: async () => {}, close: async () => {} }) });
            try { await saveCase(); } finally {
                window.Blob = bBlob; URL.createObjectURL = bUrl; HTMLAnchorElement.prototype.click = bClick;
                if (bDialog) window.showSaveFilePicker = bDialog; else delete window.showSaveFilePicker;
            }
            const dB = jsonB ? JSON.parse(jsonB) : {};
            pruefe('Fallwechsel: gespeicherter Fall ist der richtige',
                dB.stammdaten && dB.stammdaten['stam-betreffend'], 'Herr BBB');
            pruefeWahr('Fallwechsel: KEINE fremde Stellungnahme in der Datei',
                !(dB.appealDraft || '').includes('AAA'));
            pruefeWahr('Fallwechsel: die eigene Stellungnahme ist drin',
                (dB.appealDraft || '').includes('HERRN BBB'));
            // Dasselbe beim Einlesen eines neuen Gutachtens
            const vmLeer = {};
            ITEMS.forEach(i => { vmLeer[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            applyImportedData({ stam: {}, diagnoses: [], anamnese: '', befund: '', special: 0,
                                valuesMap: vmLeer, provided: new Set() });
            pruefeWahr('Neues Gutachten leert das Anzeigefeld der Stellungnahme',
                !(document.getElementById('appeal-document')?.innerHTML || '').trim());

            // Ältere Falldateien (ohne Befund, Erfassung und Vorgangsart) müssen weiter laden
            const altJson = JSON.stringify({
                stateOrig: { special: 0, values: {} }, stateEigene: { special: 0, values: {} },
                stammdaten: { 'stam-betreffend': 'Frau Alt' },
                erstgespraechNotes: 'alte Notiz', appealDraft: '<p>Alter Text</p>'
            });
            await new Promise(r => {
                loadCase({ target: { files: [new File([altJson], 'alt.json', { type: 'application/json' })], value: '' } });
                setTimeout(r, 400);
            });
            pruefe('Ältere Falldatei: Stammdaten',
                document.getElementById('stam-betreffend').value, 'Frau Alt');
            pruefe('Ältere Falldatei: gilt als Widerspruch', appModus, 'widerspruch');
            pruefeWahr('Ältere Falldatei: Stellungnahme zurück', (appealDraft || '').includes('Alter Text'));
            pruefe('Ältere Falldatei: keine Problemlagen', psycheListe.length, 0);
            pruefe('Ältere Falldatei: leerer dritter Bewertungsstand',
                Object.keys(stateZweit.values).length, 0);

            // Ursprünglichen Stand wiederherstellen
            befundLaden(merkBef); erfassungLaden(merkErf); setzeModus(merkModus);
            Object.keys(merkFelder).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = merkFelder[id];
            });
            protokollLeeren();
        }

        // ---------- 18. Speichern unter ----------
        if (typeof speichereDatei === 'function') {
            const echterDialog2 = window.showSaveFilePicker;
            const ok2 = HTMLAnchorElement.prototype.click, oc2 = URL.createObjectURL;
            let geschrieben = null, dialogOptionen = null, heruntergeladen = null;
            URL.createObjectURL = () => 'blob:test';
            HTMLAnchorElement.prototype.click = function () { heruntergeladen = this.download; };

            // Weg 1: Browser kennt den Dateidialog
            window.showSaveFilePicker = async (opt) => {
                dialogOptionen = opt;
                return { name: 'Mein Dokument.doc',
                         createWritable: async () => ({ write: async b => { geschrieben = b; }, close: async () => {} }) };
            };
            // Abwarten ist zwingend: sonst schreibt der Aufruf seinen Nachweis erst, nachdem
            // der Test den ursprünglichen Stand längst wiederhergestellt hat.
            const p = speichereDatei(new Blob(['x'], { type: 'application/msword' }), 'Test.doc', 'pruefung', 'Hinweis');
            pruefeWahr('Speichern unter: liefert ein Versprechen', p && typeof p.then === 'function');
            await p;

            // Weg 2: Browser kennt ihn nicht -> Rückfall auf Herunterladen
            window.showSaveFilePicker = undefined;
            await speichereDatei(new Blob(['x'], { type: 'application/msword' }), 'Rueckfall.doc', 'pruefung', 'Hinweis');
            pruefe('Ohne Dateidialog wird heruntergeladen', heruntergeladen, 'Rueckfall.doc');

            HTMLAnchorElement.prototype.click = ok2; URL.createObjectURL = oc2;
            if (echterDialog2) window.showSaveFilePicker = echterDialog2; else delete window.showSaveFilePicker;

            pruefeWahr('Word-Ausgabe nutzt die Speichern-unter-Funktion',
                exportAppealWord.toString().includes('speichereDatei'));
            pruefeWahr('Dateidialog merkt sich den Ordner (Kennung gesetzt)',
                speichereDatei.toString().includes('id: kennung'));
            pruefeWahr('Abbruch durch den Nutzer erzeugt keinen Fehler',
                speichereDatei.toString().includes('AbortError'));

            // Ein abgebrochener Dialog muss deutlich gemeldet werden und darf nichts nachweisen
            const vorherNachweis = leseSpeicherungen().length;
            let meldung = null;
            const echtToast = window.showToast;
            window.showToast = (t, a) => { meldung = { text: t, art: a }; };
            const echterDialog3 = window.showSaveFilePicker;
            window.showSaveFilePicker = async () => { const f = new Error('abgebrochen'); f.name = 'AbortError'; throw f; };
            const ergebnis = await speichereDatei(new Blob(['x'], { type: 'application/json' }),
                'Abbruch_Pflegegradassistent.json', 'pruefung-abbruch', 'Hinweis');
            window.showToast = echtToast;
            if (echterDialog3) window.showSaveFilePicker = echterDialog3; else delete window.showSaveFilePicker;
            pruefe('Abbruch: nichts wird gespeichert', ergebnis, false);
            pruefeWahr('Abbruch: wird deutlich gemeldet',
                !!meldung && meldung.art === 'error' && /NICHT gespeichert/.test(meldung.text));
            pruefe('Abbruch: erscheint nicht im Nachweis', leseSpeicherungen().length, vorherNachweis);
        }

    } catch (e) {
        pruefungen.push({ name: 'Testlauf abgebrochen', ok: false, ist: e.message, soll: 'ohne Fehler' });
    } finally {
        // Fall wiederherstellen
        stateOrig = sicherung.orig;
        stateEigene = sicherung.eigen;
        erstgespraechNotes = sicherung.notizen;
        appealDraft = sicherung.entwurf;
        // Probedateien des Tests wieder aus dem Speicher-Nachweis entfernen
        try {
            if (sicherung.speicherungen === null) localStorage.removeItem(SPEICHER_PROTOKOLL);
            else localStorage.setItem(SPEICHER_PROTOKOLL, sicherung.speicherungen);
        } catch (e) {}
        try { fillTable('own'); calculate('own'); } catch (e) {}
    }

    const durchgefallen = pruefungen.filter(p => !p.ok);
    zeigeSelbsttest(pruefungen, durchgefallen);
    return { gesamt: pruefungen.length, bestanden: pruefungen.length - durchgefallen.length, durchgefallen: durchgefallen };
}

// Ergebnis als Überlagerung anzeigen
function zeigeSelbsttest(pruefungen, durchgefallen) {
    const alt = document.getElementById('selbsttest-box');
    if (alt) alt.remove();
    const ok = durchgefallen.length === 0;
    const box = document.createElement('div');
    box.id = 'selbsttest-box';
    box.style.cssText = 'position:fixed;inset:0;z-index:9800;background:rgba(15,23,42,0.45);'
        + 'display:flex;align-items:center;justify-content:center;padding:24px;';
    box.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border-bright);border-radius:14px;
            max-width:760px;width:100%;max-height:86vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
                 color:${ok ? '#15803d' : '#dc2626'}">
                Selbsttest: ${ok ? 'bestanden' : durchgefallen.length + ' Prüfung(en) fehlgeschlagen'}
                &nbsp;(${pruefungen.length - durchgefallen.length}/${pruefungen.length})
            </div>
            <button class="btn btn-secondary" onclick="document.getElementById('selbsttest-box').remove()">Schließen</button>
        </div>
        <div style="overflow-y:auto;padding:16px 22px">
            ${pruefungen.map(p => `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
                <span style="flex-shrink:0;width:18px;color:${p.ok ? '#15803d' : '#dc2626'};font-weight:700">${p.ok ? '✓' : '✗'}</span>
                <span style="flex:1;color:var(--text-primary)">${escapeHtml(p.name)}</span>
                ${p.ok ? '' : `<span style="font-family:var(--font-mono);font-size:11px;color:#dc2626">
                    ist: ${escapeHtml(JSON.stringify(p.ist))} · soll: ${escapeHtml(JSON.stringify(p.soll))}</span>`}
            </div>`).join('')}
        </div>
    </div>`;
    document.body.appendChild(box);
}
