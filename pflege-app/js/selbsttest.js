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
            URL.createObjectURL = () => 'blob:selbsttest';
            HTMLAnchorElement.prototype.click = function () {};
            const origBlob = window.Blob;
            window.Blob = function (teile, opt) { inhalt = teile.join(''); return new origBlob(teile, opt); };
            try { exportAppealWord(); } catch (e) { inhalt = 'FEHLER: ' + e.message; }
            window.Blob = origBlob; URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = ok;
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
        pruefeWahr('Erstantrag als in Vorbereitung gekennzeichnet', MODI.erstantrag.fertig === false);
        pruefeWahr('Höherstufung als in Vorbereitung gekennzeichnet', MODI.hoeherstufung.fertig === false);
        setzeModus('hoeherstufung');
        pruefe('Vorgangsart lässt sich setzen', appModus, 'hoeherstufung');
        setzeModus('unbekannt');
        pruefe('Unbekannte Vorgangsart fällt auf Widerspruch zurück', appModus, 'widerspruch');
        // Noch nicht fertige Vorgänge dürfen den Modus nicht umschalten
        waehleModus('erstantrag');
        pruefe('Unfertiger Vorgang ändert die Vorgangsart nicht', appModus, 'widerspruch');
        document.getElementById('vorbereitung-box')?.remove();
        setzeModus(modusVorher);
        pruefeWahr('Verfasserfelder existieren genau einmal',
            document.querySelectorAll('#verf-name-sel').length === 1 &&
            document.querySelectorAll('#verf-qual-sel').length === 1);

        // ---------- 12. Befundkatalog ----------
        if (typeof BEFUND_GRUPPEN !== 'undefined') {
            pruefe('Befundkatalog: acht Gruppen', BEFUND_GRUPPEN.length, 8);
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
