// Selbsttest des Schulz Pflege-Assistenten.
// Prüft die kritischen Wege des Widerspruchs auf Knopfdruck. Der Test sichert den
// aktuellen Fall vorher und stellt ihn danach wieder her – er verändert nichts.

function selbsttest() {
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
        entwurf: appealDraft
    };

    try {
        // ---------- 1. Daten vollständig geladen ----------
        pruefe('Kriterienkatalog (ITEMS)', typeof ITEMS !== 'undefined' ? ITEMS.length : 0, 65);
        pruefe('BRi-Texte', typeof BRI_KRITERIEN !== 'undefined' ? Object.keys(BRI_KRITERIEN).length : 0, 65);
        pruefe('Praxishinweise', typeof LAIEN_HINWEISE !== 'undefined' ? Object.keys(LAIEN_HINWEISE).length : 0, 58);
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
        if (wordProbe) {
            pruefeWahr('Word-Datei enthält Seitenzahl-Feld', wordProbe.includes('mso-field-code: PAGE'));
            pruefeWahr('Word-Datei ohne Erstellungsdatum', !wordProbe.includes(todayDE()));
            pruefeWahr('Word-Datei ohne Arbeitshinweise', !wordProbe.includes('zitat-warnung'));
        }

        // ---------- 11. Startauswahl und Vorgangsart ----------
        const modusVorher = appModus;
        pruefe('Drei Vorgangsarten vorhanden', Object.keys(MODI).length, 3);
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
            const p = speichereDatei(new Blob(['x'], { type: 'application/msword' }), 'Test.doc', 'pruefung', 'Hinweis');
            pruefeWahr('Speichern unter: liefert ein Versprechen', p && typeof p.then === 'function');

            // Weg 2: Browser kennt ihn nicht -> Rückfall auf Herunterladen
            window.showSaveFilePicker = undefined;
            speichereDatei(new Blob(['x'], { type: 'application/msword' }), 'Rueckfall.doc', 'pruefung', 'Hinweis');
            pruefe('Ohne Dateidialog wird heruntergeladen', heruntergeladen, 'Rueckfall.doc');

            HTMLAnchorElement.prototype.click = ok2; URL.createObjectURL = oc2;
            if (echterDialog2) window.showSaveFilePicker = echterDialog2; else delete window.showSaveFilePicker;

            pruefeWahr('Word-Ausgabe nutzt die Speichern-unter-Funktion',
                exportAppealWord.toString().includes('speichereDatei'));
            pruefeWahr('Dateidialog merkt sich den Ordner (Kennung gesetzt)',
                speichereDatei.toString().includes('id: kennung'));
            pruefeWahr('Abbruch durch den Nutzer erzeugt keinen Fehler',
                speichereDatei.toString().includes('AbortError'));
        }

    } catch (e) {
        pruefungen.push({ name: 'Testlauf abgebrochen', ok: false, ist: e.message, soll: 'ohne Fehler' });
    } finally {
        // Fall wiederherstellen
        stateOrig = sicherung.orig;
        stateEigene = sicherung.eigen;
        erstgespraechNotes = sicherung.notizen;
        appealDraft = sicherung.entwurf;
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
