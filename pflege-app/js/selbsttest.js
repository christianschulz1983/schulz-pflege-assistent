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

    // Wartet, bis eine Bedingung erfuellt ist. loadCase stellt die Stammfelder
    // zeitversetzt wieder her; feste Wartezeiten sind dafuer unzuverlaessig.
    const warteAuf = async (bedingung, maxMs) => {
        const ende = Date.now() + (maxMs || 3000);
        while (Date.now() < ende) {
            try { if (bedingung()) return true; } catch (e) {}
            await new Promise(r => setTimeout(r, 30));
        }
        return false;
    };

    // Aktuellen Stand sichern, damit der Test keine Arbeit zerstört
    const sicherung = {
        orig: JSON.parse(JSON.stringify(stateOrig)),
        eigen: JSON.parse(JSON.stringify(stateEigene)),
        notizen: erstgespraechNotes,
        entwurf: appealDraft,
        /* Befunderhebung und Erfassungstabellen: Die Freigabe eines Imports leert sie (neuer
           Fall), und der Test ruft die Freigabe mehrfach auf. Ohne diese Sicherung löschte ein
           Selbsttest die Tabellen des Falls, an dem der Berater gerade arbeitet. */
        befund: (typeof befundSichern === 'function') ? JSON.parse(JSON.stringify(befundSichern())) : null,
        erfassung: (typeof erfassungSichern === 'function') ? JSON.parse(JSON.stringify(erfassungSichern())) : null,
        modus: (typeof appModus !== 'undefined') ? appModus : null,
        /* Stammdaten, Diagnosen und Anhörungsfelder – dieselben Felder, die „Fall speichern"
           sichert. Der Test ruft die Freigabe eines Imports auf; die leert diese Felder und baut
           die Diagnosezeilen neu. Ohne diese Sicherung verlor, wer mitten im Fall den Selbsttest
           drückte, Name, Anamnese, Befundtext und alle Diagnosen. */
        felder: (() => { const f = {};
            document.querySelectorAll('[id^="stam-"], [id^="diag-"], [id^="anh-"]').forEach(el => { f[el.id] = el.value; });
            return f; })(),
        zweit: (typeof stateZweit !== 'undefined') ? JSON.parse(JSON.stringify(stateZweit)) : null,
        anlagen: (typeof anlagenSichern === 'function') ? JSON.parse(JSON.stringify(anlagenSichern())) : null,
        // Der Test schreibt Probedateien; sein Nachweis darf nicht im echten stehen bleiben.
        speicherungen: (() => { try { return localStorage.getItem(SPEICHER_PROTOKOLL); } catch (e) { return null; } })(),
        // Tests legen Diagnosezeilen an; danach wieder auf die Zeilenzahl des Falls zurück.
        diagZeilen: (typeof diagRowCount === 'function') ? diagRowCount() : 0,
        /* Die ANGEZEIGTE Stellungnahme – mit den Handänderungen des Beraters. appealDraft allein
           genügt nicht: Es wird erst beim Speichern oder Erstellen nachgezogen. Vorher war die
           Stellungnahme nach dem Selbsttest leer, und das nächste „Speichern" schrieb den leeren
           Stand in die Falldatei. Ebenso gingen Protokoll, Veraltet-Hinweis und die
           Begründungen übernommener Vorschläge verloren. */
        dokument: (() => { const el = document.getElementById('appeal-document');
            return (el && el.innerHTML.trim()) ? el.innerHTML : (appealDraft || ''); })(),
        protokoll: (typeof bewertungsProtokoll !== 'undefined') ? JSON.parse(JSON.stringify(bewertungsProtokoll)) : null,
        veraltet: (typeof stellungnahmeVeraltet !== 'undefined') ? stellungnahmeVeraltet : false,
        veraltetGruende: (typeof veraltetGruende !== 'undefined') ? veraltetGruende.slice() : [],
        vorschlagGruende: (typeof vorschlagGruende !== 'undefined') ? JSON.parse(JSON.stringify(vorschlagGruende)) : {}
    };

    try {
        /* Der Test läuft immer vom Widerspruch aus – gleich, in welchem Vorgang der Berater
           gerade steht. Einige Prüfungen setzen den Widerspruch voraus (Längengrenzen,
           KI-Vorgaben); gestartet aus dem Höherstufungsantrag fielen sie sonst durch. Die
           Abschnitte, die einen anderen Vorgang brauchen, stellen ihn selbst ein. Am Ende wird
           der ursprüngliche Vorgang wiederhergestellt. */
        if (typeof setzeModus === 'function') setzeModus('widerspruch');

        // ---------- 1. Daten vollständig geladen ----------
        pruefe('Kriterienkatalog (ITEMS)', typeof ITEMS !== 'undefined' ? ITEMS.length : 0, 65);
        pruefe('BRi-Texte', typeof BRI_KRITERIEN !== 'undefined' ? Object.keys(BRI_KRITERIEN).length : 0, 65);
        /* Die BRi-Texte sind Zitatgrundlage für die KI. Die erste Übernahme enthielt Seitenzahlen
           im Wort („Auf65 forderungen"), eine Fußnote mitten in 4.5.16, Kapitelnummern am Ende
           und die komplette Einleitung von Modul 4 als angebliche Definition von 4.3.13.
           Der wörtliche Abgleich mit der PDF läuft außerhalb des Browsers
           (werkzeuge/bri_abgleich.py); hier werden die Übernahmereste selbst ausgeschlossen. */
        if (typeof BRI_KRITERIEN !== 'undefined' && typeof BRI_MODULE !== 'undefined') {
            pruefe('BRi: Einleitungen aller sechs Module', Object.keys(BRI_MODULE).sort(), ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6']);
            const briTexte = [];
            Object.keys(BRI_MODULE).forEach(n => briTexte.push(['Modul ' + n, BRI_MODULE[n].text]));
            Object.keys(BRI_KRITERIEN).forEach(n => {
                const k = BRI_KRITERIEN[n];
                briTexte.push([n, k.definition || '']);
                Object.keys(k.levels || {}).forEach(st => briTexte.push([n + ' ' + st, k.levels[st]]));
            });
            const reste = [
                ['Steuerzeichen', /[\x00-\x08\x0b-\x1f]/],
                ['Seitenzahl im Wort', /[A-Za-zäöüß]\d{1,3}(?=\s|[a-zäöüß])/],
                ['Kapitelnummer am Ende', /\s\d+\.\d+(\.\d+)?\s*(\[\s*K?F[^\]]*\].*)?$/],
                ['Fußnotentext', /Valentini|\(Syn\.:/]
            ];
            const funde = [];
            briTexte.forEach(([ken, t]) => reste.forEach(([name, re]) => { if (re.test(t)) funde.push(ken + ': ' + name); }));
            pruefe('BRi: keine Übernahmereste (Seitenzahlen, Fußnoten, Kapitelnummern)', funde, []);
            pruefeWahr('BRi: 4.3.13 enthält keine fremde Modul-4-Einleitung',
                !/Harninkontinenz|Stuhlkontinenz|Selbstversorgung/.test(BRI_KRITERIEN['4.3.13'].definition));
            const modul4 = (BRI_MODULE['4.4'] || {}).text || '';      // fehlt es, nur diese Prüfung rot
            pruefeWahr('BRi: Modul 4 beschreibt die Kontinenzstufen',
                /Blasenkontrolle\/Harnkontinenz/.test(modul4) && /Komplett inkontinent/.test(modul4));
            // Ein Zitat aus der Modul-4-Einleitung gilt jetzt als belegt – bei einem Kriterium aus Modul 4
            if (typeof unbelegteZitate === 'function') {
                pruefe('BRi: Zitat aus der Modul-4-Einleitung ist bei 4.4.11 belegt',
                    unbelegteZitate('4.4.11', 'Laut Richtlinien gilt: „Mehrmals täglich unwillkürliche Harnabgänge, aber gesteuerte Blasenentleerung ist noch teilweise möglich".').length, 0);
                pruefe('BRi: dasselbe Zitat ist bei 4.3.13 NICHT belegt',
                    unbelegteZitate('4.3.13', 'Laut Richtlinien gilt: „Mehrmals täglich unwillkürliche Harnabgänge, aber gesteuerte Blasenentleerung ist noch teilweise möglich".').length, 1);
            }
        }
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

        /* Das Beispiel der BRi (S. 107) im Wortlaut: „erfolgt zum Beispiel täglich dreimal eine
           Medikamentengabe, dreimal monatlich eine Injektion und zweimal wöchentlich eine
           Wärmeanwendung, beträgt der Durchschnittswert 3,4 Maßnahmen pro Tag. Hieraus
           resultiert ein Wert von zwei Punkten." Also 3 + 3/30 + 2/7 = 3,3857.
           Die Nachkommastellen sind KEIN Schönheitsfehler, sondern vorgeschrieben: Fußnote 13
           der BRi lautet „Bei allen Rechenschritten wird auf die 4. Stelle nach dem Komma
           gerundet." Auf ganze Zahlen gerundet ergäbe das Beispiel 3 – und damit nur EINEN
           Punkt statt zwei. Diese Prüfung hält das fest. */
        const summeA = () => m5Gruppen(zustandZu('own')).A.summe;
        leerenM5(); setzeM5(43, 3, 'D'); setzeM5(44, 3, 'M'); setzeM5(47, 2, 'W');
        pruefe('Modul 5, Gruppe A: Beispiel der BRi ergibt 2 Punkte', m5(), 2);
        pruefe('Modul 5: auf vier Nachkommastellen gerechnet (BRi Fußnote 13)', summeA(), 3.3857);
        pruefeWahr('Der Durchschnittswert wird NICHT auf eine ganze Zahl gerundet',
            summeA() !== Math.round(summeA()));
        pruefe('Auf ganze Zahlen gerundet wäre es ein Punkt weniger',
            (Math.round(summeA()) > 8 ? 3 : Math.round(summeA()) > 3 ? 2 : Math.round(summeA()) >= 1 ? 1 : 0), 1);
        leerenM5(); setzeM5(43, 3, 'D'); setzeM5(44, 3, 'M'); setzeM5(47, 1, 'W');
        pruefe('Modul 5, Gruppe A (3,2429/Tag)', m5(), 2);
        leerenM5(); setzeM5(52, 1, 'D'); setzeM5(50, 2, 'W');
        pruefe('Modul 5, Gruppe B (1,2857/Tag)', m5(), 2);
        leerenM5(); setzeM5(57, 1, 'M'); setzeM5(55, 1, 'W');
        pruefe('Modul 5, Gruppe C (6,3)', m5(), 1);
        // Eine seltene Maßnahme darf nicht durch Runden verschwinden
        leerenM5(); setzeM5(44, 1, 'M');
        pruefeWahr('Eine monatliche Maßnahme bleibt in der Summe erhalten', summeA() > 0);

        /* Gruppe C an der Grenze: Die BRi sagt „12,9 bis unter 60 = 3 Punkte". Physiotherapie
           dreimal wöchentlich sind 3 × 4,3 = 12,9. Der Rechner führt das als 12,899999999999999 –
           ohne die vorgeschriebene Rundung auf vier Stellen kam die App auf 2 statt 3 Punkte. */
        const summeC = () => m5Gruppen(zustandZu('own')).C;
        leerenM5(); setzeM5(56, 3, 'W');
        pruefe('Gruppe C: Physiotherapie 3× pro Woche ergibt 12,9', summeC().summe, 12.9);
        pruefe('Gruppe C: 12,9 sind 3 Punkte (BRi „12,9 bis unter 60")', summeC().pkt, 3);
        leerenM5(); setzeM5(56, 2, 'W'); setzeM5(55, 1, 'W');
        pruefe('Gruppe C: Physiotherapie 2× und Arzt 1× pro Woche ergeben 3 Punkte', summeC().pkt, 3);
        leerenM5(); setzeM5(55, 1, 'W');
        pruefe('Gruppe C: ein Arztbesuch pro Woche ist genau 4,3 – 1 Punkt', summeC().pkt, 1);
        leerenM5(); setzeM5(55, 2, 'W');
        pruefe('Gruppe C: zwei Arztbesuche pro Woche sind genau 8,6 – 2 Punkte', summeC().pkt, 2);
        // Das Beispiel der BRi auf S. 108: monatlich ein ausgedehnter Besuch + wöchentlich ein Arztbesuch
        leerenM5(); setzeM5(57, 1, 'M'); setzeM5(55, 1, 'W');
        pruefe('Gruppe C: Beispiel der BRi ergibt 6,3', summeC().summe, 6.3);
        // Jede Grenze aller drei Gruppen genau auf dem Grenzwert
        [[1, 'D', 'A', 1], [3, 'D', 'A', 1], [4, 'D', 'A', 2], [8, 'D', 'A', 2], [9, 'D', 'A', 3]].forEach(([n, p, g, soll]) => {
            leerenM5(); setzeM5(43, n, p);
            pruefe('Gruppe A: ' + n + '× pro Tag ergibt ' + soll + ' Punkt(e)', m5Gruppen(zustandZu('own'))[g].pkt, soll);
        });
        [[1, 'W', 1], [7, 'W', 2], [3, 'D', 3]].forEach(([n, p, soll]) => {
            leerenM5(); setzeM5(50, n, p);
            pruefe('Gruppe B: ' + n + '× ' + (p === 'W' ? 'pro Woche' : 'pro Tag') + ' ergibt ' + soll + ' Punkt(e)',
                m5Gruppen(zustandZu('own')).B.pkt, soll);
        });
        leerenM5();

        // Kaufmännisch runden – auch dort, wo der Rechner knapp daneben liegt
        pruefe('Runden: 31,25 wird 31,3', rundeKaufmaennisch(80 / Math.pow(1.6, 2), 1), 31.3);
        pruefe('Runden: 2,5 wird 3', rundeKaufmaennisch(2.5, 0), 3);
        pruefe('Runden: 2,4999 wird 2', rundeKaufmaennisch(2.4999, 0), 2);
        pruefe('Runden: −2,5 wird −3 (spiegelbildlich)', rundeKaufmaennisch(-2.5, 0), -3);
        pruefe('Runden: 1,005 wird 1,01', rundeKaufmaennisch(1.005, 2), 1.01);
        pruefe('Runden: 3 × 4,3 auf vier Stellen', rundeKaufmaennisch(3 * 4.3, 4), 12.9);
        pruefe('Anzeige: 1,005 erscheint als 1,01', zahlDE(1.005), '1,01');

        // Im Schriftstück ganze Zahlen, wo es sie gibt
        const m5T = (count, period) => m5HaeufigkeitText('4.5.13', { count: count, period: period });
        pruefe('Einmal im Quartal steht als ganze Zahl da', m5T(m5Runden(1 / 3), 'M'), '1x im Quartal');
        pruefe('Viermal im Quartal', m5T(m5Runden(4 / 3), 'M'), '4x im Quartal');
        pruefe('Zweimal im Jahr', m5T(m5Runden(2 / 12), 'M'), '2x im Jahr');
        pruefe('Ganze Zahl pro Woche bleibt, wie sie ist', m5T(2, 'W'), '2x pro Woche');
        pruefeWahr('Keine vier Nachkommastellen im Schriftstück', !/\d,\d{3}/.test(m5T(m5Runden(3 / 7 * 30 + 1 / 3), 'M')));

        // Zahlen werden deutsch geschrieben – mit Komma, nicht mit Punkt
        pruefe('Gewichtete Punkte deutsch geschrieben', zahlDE(11.25), '11,25');
        pruefe('Ganze Punktzahl mit zwei Stellen', zahlDE(10), '10,00');
        pruefe('Häufigkeit ohne unnötige Nullen', haeufigkeitDE(3), '3');
        pruefe('Häufigkeit mit Komma', haeufigkeitDE(3.3857), '3,39');
        pruefe('Häufigkeit einstellig', haeufigkeitDE(0.3), '0,3');
        pruefeWahr('Nirgends ein englischer Dezimalpunkt in der Modultabelle',
            [zahlDE(3.75), zahlDE(7.5), zahlDE(47.5), haeufigkeitDE(0.33)].every(t => t.indexOf('.') === -1));
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

        /* Beraternamen stehen nicht fest im Programm (öffentliches Repository). Wer seinen
           Namen früher aus der Liste gewählt hatte, darf beim nächsten Start nicht still
           den ersten Listennamen bekommen – der Name wird als „anderer Name" übernommen. */
        if (typeof loadVerfasser === 'function' && typeof VERFASSER_STORAGE !== 'undefined') {
            let merkV = null;
            try { merkV = localStorage.getItem(VERFASSER_STORAGE); } catch (e) {}
            const felder = ['verf-name-sel', 'verf-name-frei', 'verf-qual-sel', 'verf-qual-frei'];
            const merkF = felder.map(id => { const el = document.getElementById(id); return el ? el.value : null; });
            try {
                pruefeWahr('Keine Kollegennamen fest in der Beraterliste',
                    Array.from(document.getElementById('verf-name-sel').options)
                        .every(o => o.value === '__frei' || o.value === 'Christian Schulz'));
                localStorage.setItem(VERFASSER_STORAGE, JSON.stringify(
                    { nameSel: 'Frieda Beispiel', nameFrei: '', qualSel: '', qualFrei: '' }));
                loadVerfasser();
                pruefe('Gespeicherter Name ohne Listeneintrag bleibt erhalten', getVerfasser().name, 'Frieda Beispiel');
                pruefe('Er steht dann unter „anderer Name"', document.getElementById('verf-name-sel').value, '__frei');
                localStorage.setItem(VERFASSER_STORAGE, JSON.stringify(
                    { nameSel: 'Christian Schulz', nameFrei: '', qualSel: '', qualFrei: '' }));
                loadVerfasser();
                pruefe('Ein Name aus der Liste bleibt ausgewählt', getVerfasser().name, 'Christian Schulz');
            } finally {
                felder.forEach((id, k) => { const el = document.getElementById(id); if (el && merkF[k] !== null) el.value = merkF[k]; });
                onVerfasserChange();          // speichert – deshalb danach den alten Eintrag zurück
                try {
                    if (merkV === null) localStorage.removeItem(VERFASSER_STORAGE);
                    else localStorage.setItem(VERFASSER_STORAGE, merkV);
                } catch (e) {}
            }
        }
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
            // Ein offener Fall kann schon mehr Zeilen haben – dann bleiben es so viele.
            pruefe('Diagnoseliste wächst auf 9 Zeilen', diagRowCount(), Math.max(vorher, 9));
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

        // ---------- 9. Medicproof: eigenes Formular, gleiche Rechenlogik ----------
        if (typeof modulGegenprobe === 'function') {
            const k = nr => ITEMS.find(i => i.nr === nr);
            const anweisung = aiReadGutachten.toString();
            pruefeWahr('Medicproof: eigener Abschnitt in der Anweisung',
                anweisung.includes('SONDERFALL MEDICPROOF'));
            pruefeWahr('Medicproof: Punktwert ist nicht der Stufenindex',
                anweisung.includes('Der Punktwert ist') && anweisung.includes('SPALTENPOSITION 0..3'));
            pruefeWahr('Medicproof: Essen mit 0, 3, 6, 9 wird eigens genannt',
                anweisung.includes('5.4.8 Essen'));
            // Nicht nur auf „Häufigkeit" prüfen – das Wort steht auch im Abschnitt für den
            // Medizinischen Dienst. Gesucht ist die Medicproof-Spaltenreihenfolge.
            pruefeWahr('Medicproof: Modul 5 mit eigener Häufigkeitsspalte',
                anweisung.includes('mit Hilfe: pro Tag') && anweisung.includes('Spalte „Häufigkeit'));
            pruefeWahr('Medicproof: kein Antragsdatum',
                anweisung.includes('KEIN Antragsdatum'));
            pruefeWahr('Medicproof: 5.5.16 als Fließtext benannt',
                anweisung.includes('5.5.16'));
            pruefeWahr('Medicproof: „Beurteilung nicht erforderlich" behandelt',
                anweisung.includes('Beurteilung nicht erforderlich'));

            // Modulweise Gegenprobe
            const vm = {};
            ITEMS.forEach(i => { vm[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            // Modul 4: 4.4.2 = 1, 4.4.3 = 1, 4.4.5 = 1, 4.4.6 = 1, 4.4.10 = 2, 4.4.11 = 1
            // Einzelpunkte: 1 + 1 + 1 + 1 + 4 + 1 = 9  (4.4.10 hat die Werte 0/2/4/6)
            vm[k('4.4.2').id] = 1; vm[k('4.4.3').id] = 1; vm[k('4.4.5').id] = 1;
            vm[k('4.4.6').id] = 1; vm[k('4.4.10').id] = 2; vm[k('4.4.11').id] = 1;
            const stimmig = { valuesMap: vm,
                extracted: { raws: [0, 0, 0, 9, 0, 0], weights: [0, 0, 0, 20, 0, 0], total: 20, pg: 1 } };
            pruefe('Gegenprobe: stimmige Werte ergeben keine Meldung', modulGegenprobe(stimmig).length, 0);

            // Der typische Medicproof-Lesefehler: bei 4.4.10 wurde der PUNKTWERT 4 statt der
            // Spaltenposition 2 eingetragen. Das ergibt in Modul 4 eine zu hohe Summe.
            const falsch = { valuesMap: Object.assign({}, vm), extracted: stimmig.extracted };
            falsch.valuesMap[k('4.4.10').id] = 3;      // Punktwert 6 statt Position 2
            const abw = modulGegenprobe(falsch);
            pruefe('Gegenprobe: Lesefehler wird erkannt', abw.length, 1);
            pruefeWahr('Gegenprobe: nennt das betroffene Modul',
                abw[0] && abw[0].modul.includes('Modul 4'));
            pruefe('Gegenprobe: nennt beide Zahlen',
                abw[0] ? [abw[0].ausKriterien, abw[0].lautGutachten] : null, [11, 9]);

            // Modul 5 mit Häufigkeiten
            const vm5 = {};
            ITEMS.forEach(i => { vm5[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            vm5[k('4.5.1').id] = { count: 1, period: 'D' };
            vm5[k('4.5.13').id] = { count: 1, period: 'W' };
            vm5[k('4.5.14').id] = { count: 1, period: 'W' };
            const r5 = calculateInternal({ special: 0, values: vm5 });
            pruefe('Modul 5 aus Medicproof-Häufigkeiten', r5.raws[4], 3);
            pruefe('Gegenprobe: Modul 5 stimmig',
                modulGegenprobe({ valuesMap: vm5,
                    extracted: { raws: [0, 0, 0, 0, 3, 0], weights: [0, 0, 0, 0, 10, 0], total: 10, pg: 0 } }).length, 0);

            // Ohne Modul-Zusammenfassung keine Gegenprobe (lokal ausgelesene Fälle)
            pruefe('Ohne Zusammenfassung keine Gegenprobe',
                modulGegenprobe({ valuesMap: vm, extracted: null }).length, 0);

        }

        // ---------- 9b. Gescanntes Gutachten hinter getipptem Deckblatt ----------
        // Anlass: Ein Medicproof-Gutachten wurde gar nicht ausgelesen. Der lokale Server
        // lieferte 4.380 Zeichen – aber alle vom getippten Bescheid-Deckblatt (Seite 1
        // und 3); die 19 Gutachtenseiten waren Scans ohne Textebene. Weil „Text
        // vorhanden" genügte, ging nur dieser Text an die KI und das Gutachten selbst
        // wurde nie gelesen.
        if (typeof textDecktDokumentAb === 'function') {
            const mitKriterien = n => Array.from({ length: n }, (_, i) => '4.1.' + (i + 1)).join(' ');

            pruefeWahr('Text-PDF: lokaler Text ersetzt das Dokument',
                textDecktDokumentAb({ ok: true, emptyPageCount: 0, pageCount: 20,
                    ocrPageCount: 0, text: 'Gutachten ' + mitKriterien(30) }));

            // Der gemeldete Fall mit den echten Zahlen: 22 Seiten, 20 davon Scans ohne
            // Textebene, 4.380 Zeichen vom Deckblatt, keine einzige Kriteriumsnummer.
            pruefeWahr('Scan hinter Deckblatt: Dokument wird mitgeschickt',
                !textDecktDokumentAb({ ok: true, emptyPageCount: 20, pageCount: 22,
                    text: 'Postbeamtenkrankenkasse Bescheid '.repeat(133) }));

            // Auch ohne leere Seiten: fehlen die Kriteriumsnummern, ist es kein Gutachtentext.
            pruefeWahr('Text ohne Kriteriumsnummern reicht nicht',
                !textDecktDokumentAb({ ok: true, emptyPageCount: 0, pageCount: 22,
                    text: 'Bescheid über Ihren Antrag. '.repeat(200) }));

            // Dieselbe Datei nach der OCR-Reparatur: 63 Kriteriumsnummern erkannt. Trotzdem
            // muss das Bild mit – im erkannten Text sind die Ankreuzungen unzuverlässig
            // („Umsetzen [0X] O1 O2 O3"), und eine Zeile war ganz zerfallen.
            pruefeWahr('Auch nach Texterkennung geht das Bild mit',
                !textDecktDokumentAb({ ok: true, emptyPageCount: 0, pageCount: 22,
                    ocrPageCount: 20, text: 'Gutachten ' + mitKriterien(63) }));

            pruefeWahr('Kein Server erreicht: Dokument wird geschickt',
                !textDecktDokumentAb(null));
            pruefeWahr('Leerer Servertext: Dokument wird geschickt',
                !textDecktDokumentAb({ ok: true, emptyPageCount: 0, text: '   ' }));

            // Beim Mitschicken des Bildes muss unmissverständlich dabeistehen, dass die
            // Ankreuzungen aus dem BILD kommen – sonst glaubt die KI dem fehlerhaften Text.
            const lese = aiReadGutachten.toString();
            pruefeWahr('Bei Scans ist das Dokument maßgeblich',
                lese.includes('MAßGEBLICH FÜR ALLE BEWERTUNGEN IST AUSSCHLIEßLICH'));
            pruefeWahr('Bei Scans wird vor dem Text gewarnt',
                lese.includes('UNVOLLSTÄNDIG UND STELLENWEISE FEHLERHAFT'));

            // Seitenliste kurz und lesbar
            pruefe('Seitenliste fasst zusammen', seitenListe([4, 5, 6, 7, 9, 22]), '4–7, 9, 22');
            pruefe('Seitenliste: eine Seite', seitenListe([3]), '3');
            pruefe('Seitenliste: leer', seitenListe([]), '');

            // Der Warnhinweis muss die Seiten nennen und sagen, was zu tun ist.
            const merk = reviewData;
            let box = document.getElementById('rev-scan-hinweis');
            const selbstAngelegt = !box;
            if (selbstAngelegt) { box = document.createElement('div'); box.id = 'rev-scan-hinweis'; document.body.appendChild(box); }
            // Fall A: Texterkennung lief – Seiten nennen, zum Abgleich auffordern.
            reviewData = { scan: { seiten: [], anzahl: 0, ocrSeiten: [4, 5, 6, 7], ocrAnzahl: 4,
                gesamt: 22, ocrVerfuegbar: true, ocrFehler: '' } };
            rvZeigeScanHinweis();
            let warn = box.innerHTML;
            pruefeWahr('Scan-Hinweis nennt die erkannten Seiten',
                warn.includes('4–7') && warn.includes('22'));
            pruefeWahr('Scan-Hinweis fordert zum Abgleich auf', warn.includes('bevor Sie übernehmen'));

            // Fall B: Texterkennung lief NICHT – das ist der ernstere Fall und muss
            // den Grund nennen, sonst sucht man den Fehler wieder wochenlang woanders.
            reviewData = { scan: { seiten: [4, 5, 6], anzahl: 3, ocrSeiten: [], ocrAnzahl: 0,
                gesamt: 22, ocrVerfuegbar: false, ocrFehler: 'TesseractError: Failed loading language' } };
            rvZeigeScanHinweis();
            warn = box.innerHTML;
            pruefeWahr('Ohne Texterkennung: deutliche Warnung', warn.includes('gar nicht'));
            pruefeWahr('Ohne Texterkennung: Grund wird genannt',
                warn.includes('Failed loading language'));

            reviewData = { scan: null };
            rvZeigeScanHinweis();
            pruefe('Ohne Scans kein Hinweis', box.innerHTML, '');
            if (selbstAngelegt) box.remove();
            reviewData = merk;
        }

        // ---------- 9m. Name der Falldatei ----------
        // Vorgabe: „Vorname, Nachname, Bezeichnung.json" statt
        // „Frau_Sabine_Musterfrau_Pflegegradassistent.json".
        if (typeof fallDateiname === 'function') {
            pruefe('Falldatei: Anrede fällt weg',
                fallDateiname('Frau Sabine Musterfrau', 'widerspruch'), 'Sabine, Musterfrau, Widerspruch.json');
            pruefe('Falldatei: Höherstufung',
                fallDateiname('Herr Peter Muster', 'hoeherstufung'), 'Peter, Muster, Höherstufung.json');
            pruefe('Falldatei: Erstantrag',
                fallDateiname('Frau Greta Testfrau', 'erstantrag'), 'Greta, Testfrau, Erstantrag.json');
            pruefe('Falldatei: Anhörung heißt Anhörungsschreiben',
                fallDateiname('Herr Fritz Beispielmann', 'anhoerung'), 'Fritz, Beispielmann, Anhörungsschreiben.json');

            // Namensformen, die in den vorhandenen Dateien tatsächlich vorkommen
            pruefe('Falldatei: mehrere Vornamen',
                fallDateiname('Herr Karl Otto Emil Mustermann', 'widerspruch'),
                'Karl Otto Emil, Mustermann, Widerspruch.json');
            pruefe('Falldatei: Doppelvorname mit Bindestrich',
                fallDateiname('Herr Hans-Peter Muster', 'widerspruch'),
                'Hans-Peter, Muster, Widerspruch.json');
            pruefe('Falldatei: Form „Nachname, Vorname"',
                fallDateiname('Musterfrau, Sabine', 'widerspruch'), 'Sabine, Musterfrau, Widerspruch.json');
            pruefe('Falldatei: ohne Anrede',
                fallDateiname('Sabine Musterfrau', 'widerspruch'), 'Sabine, Musterfrau, Widerspruch.json');
            pruefe('Falldatei: Namenszusatz bleibt beim Nachnamen',
                fallDateiname('Frau Lena von der Linde', 'widerspruch'),
                'Lena, von der Linde, Widerspruch.json');

            // Randfälle: nie eine unbrauchbare Datei erzeugen
            pruefe('Falldatei: nur ein Name', fallDateiname('Musterfrau', 'widerspruch'),
                'Musterfrau, Widerspruch.json');
            pruefe('Falldatei: ohne Namen', fallDateiname('', 'widerspruch'), 'Fall, Widerspruch.json');
            pruefe('Falldatei: ohne Vorgangsart bleibt Widerspruch',
                fallDateiname('Sabine Musterfrau', undefined), 'Sabine, Musterfrau, Widerspruch.json');
            pruefe('Falldatei: unzulässige Zeichen entfallen',
                fallDateiname('Frau A/B C:D', 'widerspruch'), 'AB, CD, Widerspruch.json');

            // Zerlegung getrennt geprüft
            pruefe('Namensteile: Anrede und Nachname',
                [fallNamensteile('Frau Sabine Musterfrau').vorname, fallNamensteile('Frau Sabine Musterfrau').nachname],
                ['Sabine', 'Musterfrau']);
            pruefe('Namensteile: leer bleibt leer',
                [fallNamensteile('').vorname, fallNamensteile('').nachname], ['', '']);
            // Die Namensprüfung hat ihr eigenes namensteile() und liefert eine LISTE.
            // Beide dürfen sich nicht in die Quere kommen – deshalb heißt das hier
            // fallNamensteile. Ein Namenskonflikt hatte pruefeName() lahmgelegt.
            pruefeWahr('Namensprüfung hat ihre eigene Zerlegung behalten',
                Array.isArray(namensteile('Frau Erika Mahl')));
        }

        // ---------- 9k. Anhörung: Form nach den Vorlagen des Verfassers ----------
        // Gemeldet: Im Kriterienblock stand „Erstgutachten: … · Anhörungsgutachten: … ·
        // Meine Beurteilung: …". In den Vorlagen (Vorlagen A und B) steht dort nur
        // „Gutachterliche Bewertung: „…“" – und es heißt Zweitgutachten, nicht
        // Anhörungsgutachten.
        if (typeof buildAnhoerung === 'function') {
            const mO = JSON.parse(JSON.stringify(stateOrig));
            const mE = JSON.parse(JSON.stringify(stateEigene));
            const mZ = JSON.parse(JSON.stringify(stateZweit));
            const mM = appModus;
            try {
                appModus = 'anhoerung';
                const kid = nr => ITEMS.find(i => i.nr === nr).id;
                stateOrig.extracted = null; delete stateZweit.extracted;
                ITEMS.forEach(i => {
                    const l = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                    stateOrig.values[i.id] = JSON.parse(JSON.stringify(l));
                    stateEigene.values[i.id] = JSON.parse(JSON.stringify(l));
                    stateZweit.values[i.id] = JSON.parse(JSON.stringify(l));
                });
                // 4.1.1 strittig, 4.2.5 gefolgt
                stateOrig.values[kid('4.1.1')] = 0; stateZweit.values[kid('4.1.1')] = 1; stateEigene.values[kid('4.1.1')] = 2;
                stateOrig.values[kid('4.2.5')] = 0; stateZweit.values[kid('4.2.5')] = 2; stateEigene.values[kid('4.2.5')] = 2;

                const roh = buildAnhoerung('N', {}, '');
                const txt = roh.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                pruefeWahr('Anhörung: Kriterienblock nennt die gutachterliche Bewertung',
                    txt.includes('4.1.1: Positionswechsel im Bett Gutachterliche Bewertung:'));
                pruefeWahr('Anhörung: keine Dreierzeile mehr im Kriterienblock',
                    !txt.includes('Meine Beurteilung:'));
                pruefeWahr('Anhörung: Schriftstück sagt Zweitgutachten',
                    txt.includes('des Zweitgutachtens'));
                pruefeWahr('Anhörung: Schriftstück sagt nicht Anhörungsgutachten',
                    !/Anhörungsgutachten/.test(txt));

                // Der gerechnete Verweis: kurz, ohne Nummernliste
                const v = anhoerungVerweisSatz(schwellenAnalyse(), 'Medizinischer Dienst');
                pruefeWahr('Verweis nennt die Stellungnahme', v.includes('pflegefachlichen Stellungnahme'));
                pruefeWahr('Verweis zählt keine Kriterien auf', !/4\.\d\.\d/.test(v));
                pruefeWahr('Verweis nennt ein Verhältnis', /von \d+ beanstandeten Kriterien|in keinem Punkt|in allen/.test(v));

                // Steht der Bezug schon im KI-Text, wird er nicht doppelt angehängt
                const mitBezug = 'Der Medizinische Dienst ist der pflegefachlichen Stellungnahme in '
                               + 'wesentlichen Punkten gefolgt.';
                const dokMit = buildAnhoerung('N', {}, mitBezug).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                pruefeWahr('Kein doppelter Verweis, wenn der Text ihn schon enthält',
                    !dokMit.includes('beanstandeten Kriterien'));
                const ohneBezug = 'Die Bewertung ist nicht nachvollziehbar.';
                const dokOhne = buildAnhoerung('N', {}, ohneBezug).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                pruefeWahr('Verweis wird angehängt, wenn er fehlt',
                    dokOhne.includes('pflegefachlichen Stellungnahme'));
                pruefeWahr('Erkennung: Text mit Bezug', anhoerungVerweisVorhanden(mitBezug));
                pruefeWahr('Erkennung: Text ohne Bezug', !anhoerungVerweisVorhanden(ohneBezug));
                pruefeWahr('Erkennung: leerer Text', !anhoerungVerweisVorhanden(''));
            } finally {
                stateOrig.values = mO.values; stateEigene.values = mE.values;
                stateZweit.values = mZ.values; appModus = mM;
            }

            // Die Anweisung muss den Aufbau der Vorlagen tragen
            const ap = generateBegruendungenAnhoerung.toString();
            pruefeWahr('Anweisung: Aufbau in drei Absätzen', ap.includes('ABSATZ 1') && ap.includes('ABSATZ 3'));
            pruefeWahr('Anweisung: höchstens drei Beispiele',
                ap.includes('HÖCHSTENS DREI Kriterien'));
            pruefeWahr('Anweisung: Beispiele mit Namen, nicht als Nummernreihe',
                ap.includes('mit NAMEN und Nummer'));
            pruefeWahr('Anweisung: Pflegestufe verboten', ap.includes('niemals „Pflegestufe"'));
            pruefeWahr('Anweisung: Zweitgutachten statt Anhörungsgutachten',
                ap.includes('Schreibe „Zweitgutachten"'));
        }

        // ---------- 9l. Überholte Begriffe im fertigen Schriftstück ----------
        if (typeof ueberholteBegriffeImText === 'function') {
            const f = ueberholteBegriffeImText('Dem Gutachten fehlen 12,5 Punkte bis zur nächsten Pflegestufe.');
            pruefe('Pflegestufe wird gefunden', f.length, 1);
            pruefe('Pflegestufe: richtige Alternative', f[0] && f[0].statt, 'Pflegegrad');
            pruefe('Mehrfachnennung wird gezählt',
                (ueberholteBegriffeImText('Pflegestufe 1 und Pflegestufen allgemein')[0] || {}).anzahl, 2);
            pruefe('Sauberer Text meldet nichts',
                ueberholteBegriffeImText('Es geht um den Pflegegrad 2.').length, 0);
            pruefe('Leerer Text meldet nichts', ueberholteBegriffeImText('').length, 0);

            // Markierung im Dokument
            const huelle = document.createElement('div');
            huelle.innerHTML = '<div class="stmt"><p>Bis zur nächsten Pflegestufe fehlen Punkte.</p></div>';
            const n = markiereUeberholteBegriffe(huelle);
            pruefe('Markierung zählt die Stellen', n, 1);
            pruefeWahr('Markierung erscheint im Dokument',
                huelle.querySelectorAll('.begriff-warnung[data-warn]').length === 1);
            pruefeWahr('Markierung nennt die richtige Wortwahl',
                huelle.innerText.includes('richtig ist „Pflegegrad"'));
            // Beim erneuten Erstellen darf sie sich nicht häufen
            markiereUeberholteBegriffe(huelle);
            pruefe('Markierung häuft sich nicht', huelle.querySelectorAll('.begriff-warnung').length, 1);
            const sauber = document.createElement('div');
            sauber.innerHTML = '<div class="stmt"><p>Pflegegrad 2.</p></div>';
            pruefe('Sauberes Dokument bleibt unmarkiert', markiereUeberholteBegriffe(sauber), 0);
        }

        // ---------- 9j. Modulzeilen in sich prüfen ----------
        // Gemeldet: In der Prüfansicht stand „Modul 4: 25 Einzelpunkte, 10,00 gewichtete
        // Punkte". Das kann nicht sein – 25 Einzelpunkte ergeben 30,00; zu 10,00 gehören
        // 3 bis 7 Einzelpunkte. Das lässt sich feststellen, ohne die Kriterien zu kennen.
        if (typeof modulZeilenPruefung === 'function') {
            // Der gemeldete Fall, Zahl für Zahl
            const gemeldet = { raws: [2, 0, 0, 25, 1, 0], weights: [2.5, 0, 0, 10, 5, 0],
                               total: 17.5, pg: 1 };
            const funde = modulZeilenPruefung(gemeldet);
            pruefe('Gemeldeter Fall: genau eine Zeile unstimmig', funde.length, 1);
            pruefeWahr('Gemeldeter Fall: Modul 4 benannt', funde[0] && funde[0].modul.includes('Modul 4'));
            pruefe('Gemeldeter Fall: 25 Einzelpunkte ergäben 30,00',
                funde[0] && funde[0].gewichtetZuEinzel, 30);
            pruefe('Gemeldeter Fall: zu 10,00 gehören 3 bis 7',
                funde[0] && funde[0].einzelZuGewichtet, '3 bis 7');

            // Stimmige Zusammenfassung meldet nichts
            pruefe('Stimmige Zusammenfassung meldet nichts',
                modulZeilenPruefung({ raws: [2, 0, 0, 5, 1, 0], weights: [2.5, 0, 0, 10, 5, 0] }).length, 0);
            pruefe('Ohne Zusammenfassung keine Meldung', modulZeilenPruefung(null).length, 0);
            // Fehlende Zahlen werden übersprungen, nicht als Fehler gemeldet
            pruefe('Leere Felder melden nichts',
                modulZeilenPruefung({ raws: [null, '', undefined, 5, 1, 0],
                                      weights: [2.5, 0, 0, 10, 5, 0] }).length, 0);

            // Rückweg: welche Einzelpunkte gehören zu einer gewichteten Zahl?
            pruefe('Rückweg Modul 4: 30,00', spannenTextZuGewicht(4, 30), '19 bis 36');
            pruefe('Rückweg Modul 4: 40,00 ist die höchste Spanne',
                spannenTextZuGewicht(4, 40), '37 und mehr');
            pruefe('Rückweg Modul 5: 5,00 ist genau ein Punkt', spannenTextZuGewicht(5, 5), '1');
            pruefe('Unbekannte Gewichtung ergibt keine Spanne', spannenTextZuGewicht(4, 12.34), '');

            // Eine Gewichtung, die es im Modul gar nicht gibt, muss auffallen
            const unmoeglich = modulZeilenPruefung({ raws: [2, 0, 0, 5, 1, 0],
                                                     weights: [2.5, 0, 0, 12.34, 5, 0] });
            pruefe('Unmögliche Gewichtung wird gemeldet', unmoeglich.length, 1);
            pruefe('Unmögliche Gewichtung nennt keine Spanne',
                unmoeglich[0] ? unmoeglich[0].einzelZuGewichtet : null, '');

            // Der Hinweis in der Prüfansicht
            const merkRev = reviewData;
            let kasten = document.getElementById('rev-modul-zeilen');
            const selbst = !kasten;
            if (selbst) { kasten = document.createElement('div'); kasten.id = 'rev-modul-zeilen'; document.body.appendChild(kasten); }
            reviewData = { extracted: gemeldet };
            rvZeigeModulZeilen();
            const txt = kasten.innerHTML;
            pruefeWahr('Hinweis nennt beide Lesarten',
                txt.includes('ergeben nach den Richtlinien 30,00') && txt.includes('gehören 3 bis 7 Einzelpunkte'));
            pruefeWahr('Hinweis fordert zum Abgleich auf', txt.includes('mit der PDF'));
            reviewData = { extracted: { raws: [2, 0, 0, 5, 1, 0], weights: [2.5, 0, 0, 10, 5, 0] } };
            rvZeigeModulZeilen();
            pruefe('Stimmige Zeilen ergeben keinen Hinweis', kasten.innerHTML, '');
            if (selbst) kasten.remove();
            reviewData = merkRev;
        }

        // ---------- 9i. Unterlagen zur Akte in den Notizen dokumentieren ----------
        // Gewünscht: Arztberichte und sonstige Unterlagen hochladen und je Unterlage
        // dokumentieren – von wem, welche Profession, wann, bei Klinikaufenthalt von
        // wann bis wann und warum, Diagnosen und Zusammenfassung.
        if (typeof unterlagenEintrag === 'function') {
            const voll = unterlagenEintrag({
                art: 'Entlassungsbericht', verfasser: 'Dr. med. A. Muster',
                profession: 'Facharzt für Innere Medizin', einrichtung: 'Klinikum Musterstadt',
                erstelltAm: '12.03.2026', aufenthaltVon: '04.03.2026', aufenthaltBis: '11.03.2026',
                aufenthaltGrund: 'Sturz mit Oberschenkelhalsfraktur',
                diagnosen: 'S72.0 Schenkelhalsfraktur, I10 Hypertonie',
                zusammenfassung: 'Operative Versorgung. Mobilisation am Rollator.',
                pflegerelevant: 'Transfer nur mit Hilfe möglich.', _datei: 'Bericht.pdf'
            });
            pruefeWahr('Eintrag nennt die Art', voll.includes('--- Entlassungsbericht (Bericht.pdf) ---'));
            pruefeWahr('Eintrag nennt Verfasser und Profession',
                voll.includes('Verfasser: Dr. med. A. Muster, Facharzt für Innere Medizin, Klinikum Musterstadt'));
            pruefeWahr('Eintrag nennt das Erstellungsdatum', voll.includes('Erstellt am: 12.03.2026'));
            pruefeWahr('Eintrag nennt Aufenthalt mit Zeitraum und Grund',
                voll.includes('Krankenhausaufenthalt: 04.03.2026 bis 11.03.2026 – Grund: Sturz mit Oberschenkelhalsfraktur'));
            pruefeWahr('Eintrag nennt die Diagnosen', voll.includes('Diagnosen: S72.0'));
            pruefeWahr('Eintrag nennt die Zusammenfassung', voll.includes('Zusammenfassung: Operative Versorgung'));
            pruefeWahr('Eintrag nennt das Pflegerelevante', voll.includes('Pflegerelevant: Transfer nur mit Hilfe'));

            // Pflegetagebuch: von wem, welcher Zeitraum, Zusammenfassung
            const tagebuch = unterlagenEintrag({
                art: 'Pflegetagebuch', verfasser: 'Tochter, Frau B. Muster', profession: 'Angehörige',
                zeitraumVon: '01.02.2026', zeitraumBis: '28.02.2026',
                zusammenfassung: 'Tägliche Unterstützung beim Waschen und Ankleiden.'
            });
            pruefeWahr('Pflegetagebuch: Verfasserin und Funktion',
                tagebuch.includes('Verfasser: Tochter, Frau B. Muster, Angehörige'));
            pruefeWahr('Pflegetagebuch: Zeitraum',
                tagebuch.includes('Zeitraum: 01.02.2026 bis 28.02.2026'));
            pruefeWahr('Pflegetagebuch: kein Krankenhausblock',
                !tagebuch.includes('Krankenhausaufenthalt'));

            // Fehlende Angaben werden WEGGELASSEN, nicht mit „unbekannt" aufgefüllt.
            const knapp = unterlagenEintrag({ zusammenfassung: 'Nur ein Satz.' });
            pruefeWahr('Fehlendes wird weggelassen, nicht erfunden',
                !/unbekannt|nicht angegeben|Verfasser:|Erstellt am:|Diagnosen:/.test(knapp));
            pruefeWahr('Ohne Art steht eine neutrale Überschrift', knapp.includes('--- Unterlage ---'));
            pruefe('Ohne Fund kein Eintrag', unterlagenEintrag(null), '');

            // Anhängen an die Notizen: Vorhandenes darf NIE überschrieben werden.
            const feld = document.getElementById('erstgespraech-notes');
            const merkFeld = feld ? feld.value : '';
            const merkVar = (typeof erstgespraechNotes === 'string') ? erstgespraechNotes : '';
            try {
                if (feld) { feld.value = 'Wichtige Notiz aus dem Erstgespräch.'; }
                erstgespraechNotes = 'Wichtige Notiz aus dem Erstgespräch.';
                const n = haengeAnNotizen([tagebuch, voll]);
                pruefe('Zwei Unterlagen angehängt', n, 2);
                const jetzt = feld ? feld.value : erstgespraechNotes;
                pruefeWahr('Bestehende Notiz bleibt erhalten',
                    jetzt.startsWith('Wichtige Notiz aus dem Erstgespräch.'));
                pruefeWahr('Beide Einträge stehen dahinter',
                    jetzt.includes('--- Pflegetagebuch ---') && jetzt.includes('--- Entlassungsbericht'));
                pruefeWahr('Einträge sind durch eine Leerzeile getrennt',
                    jetzt.includes('Erstgespräch.\n\n--- Pflegetagebuch'));
                pruefe('Nichts Angehaktes ändert nichts', haengeAnNotizen([]), 0);
                pruefe('Leere Einträge ändern nichts', haengeAnNotizen(['', '   ']), 0);
            } finally {
                if (feld) feld.value = merkFeld;
                erstgespraechNotes = merkVar;
            }

            // Die Anweisung muss das Erfinden ausschließen und die Felder benennen.
            pruefeWahr('Anweisung verbietet Erfinden',
                UNTERLAGEN_PROMPT.includes('Erfinde nichts') && UNTERLAGEN_PROMPT.includes('rate nicht'));
            pruefeWahr('Anweisung fragt Profession ab', UNTERLAGEN_PROMPT.includes('profession'));
            pruefeWahr('Anweisung fragt den Klinikaufenthalt ab',
                UNTERLAGEN_PROMPT.includes('aufenthaltVon') && UNTERLAGEN_PROMPT.includes('aufenthaltGrund'));
            pruefeWahr('Anweisung kennt das Pflegetagebuch',
                UNTERLAGEN_PROMPT.includes('Pflegetagebuch'));
            pruefeWahr('Der Knopf steht neben den Notizen',
                renderNBASection('own').includes('unterlagenWaehlen()'));
            pruefeWahr('Der Knopf fehlt in der Vorgutachten-Ansicht',
                !renderNBASection('orig').includes('unterlagenWaehlen()'));
        }

        // ---------- 9h. Anhörung: Grundlage aus einer alten Stellungnahme ----------
        // Ausweichweg für Altfälle ohne gespeicherte Falldatei. Regelweg bleibt „Fall laden".
        if (typeof wertungAusText === 'function') {
            // Stufenbezeichnungen – wörtlich und ausgeschrieben
            pruefe('Stellungnahme lesen: selbständig', wertungAusText('4.1.1', 'selbständig'), 0);
            pruefe('Stellungnahme lesen: überwiegend selbständig',
                wertungAusText('4.1.1', 'überwiegend selbständig'), 1);
            pruefe('Stellungnahme lesen: überwiegend unselbständig',
                wertungAusText('4.1.1', 'überwiegend unselbständig'), 2);
            pruefe('Stellungnahme lesen: unselbständig', wertungAusText('4.1.1', 'unselbständig'), 3);
            pruefe('Stellungnahme lesen: Anführungszeichen stören nicht',
                wertungAusText('4.1.1', '„überwiegend unselbständig"'), 2);

            // Modul 5: Häufigkeiten
            pruefe('Stellungnahme lesen: 1x pro Woche',
                wertungAusText('4.5.13', '1x pro Woche'), { count: 1, period: 'W' });
            pruefe('Stellungnahme lesen: 3x pro Tag',
                wertungAusText('4.5.1', '3x pro Tag'), { count: 3, period: 'D' });
            pruefe('Stellungnahme lesen: 2 mal im Monat',
                wertungAusText('4.5.13', '2 mal im Monat'), { count: 2, period: 'M' });
            pruefe('Stellungnahme lesen: entfällt oder selbständig',
                wertungAusText('4.5.14', 'entfällt oder selbständig'), { count: 0, period: 'W' });

            // Und was NICHT passieren darf: raten. Unpassendes ergibt null.
            pruefe('Unpassender Text ergibt keine Wertung',
                wertungAusText('4.1.1', 'die Wertung ist nicht haltbar'), null);
            pruefe('Leerer Text ergibt keine Wertung', wertungAusText('4.1.1', ''), null);
            pruefe('Unbekanntes Kriterium ergibt keine Wertung',
                wertungAusText('4.9.9', 'selbständig'), null);

            // Zusammenbau: Grundlage ist das Erstgutachten, darüber die strittigen Wertungen.
            const mO = JSON.parse(JSON.stringify(stateOrig));
            const mZiel = (typeof importZiel !== 'undefined') ? importZiel : 'orig';
            try {
                const kid = nr => ITEMS.find(i => i.nr === nr).id;
                ITEMS.forEach(i => {
                    stateOrig.values[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                });
                stateOrig.values[kid('4.1.1')] = 1;      // Gutachten: überwiegend selbständig
                stateOrig.values[kid('4.2.5')] = 2;      // Gutachten: nicht strittig gewesen
                stateOrig.values[kid('4.5.13')] = { count: 1, period: 'W' };

                const daten = stellungnahmeZuImport({
                    kriterien: [
                        { crit: '4.1.1', gutachten: 'überwiegend selbständig', eigene: 'unselbständig' },
                        { crit: '4.5.13', gutachten: '1x pro Woche', eigene: '3x pro Woche' },
                        { crit: '4.3.99', gutachten: 'x', eigene: 'y' },          // gibt es nicht
                        { crit: '4.1.2', gutachten: 'selbständig', eigene: 'unklar' } // nicht zuzuordnen
                    ],
                    eigene_modul_1_weight: 2.5
                }, 'Volltext');

                const wert = id => (daten.values_orig.find(w => w.id === id) || {});
                pruefe('Strittiges Kriterium übernommen', wert(kid('4.1.1')).val_num, 3);
                pruefe('Modul-5-Häufigkeit übernommen',
                    [wert(kid('4.5.13')).val_obj_count, wert(kid('4.5.13')).val_obj_period], [3, 'W']);
                pruefe('Nicht strittiges Kriterium bleibt beim Gutachten', wert(kid('4.2.5')).val_num, 2);
                pruefeWahr('Nur die strittigen gelten als rekonstruiert',
                    daten._rekonstruiert.length === 2
                    && daten._rekonstruiert.includes(kid('4.1.1'))
                    && daten._rekonstruiert.includes(kid('4.5.13')));
                pruefeWahr('Unklares wird gemeldet statt geraten',
                    daten._nichtZuordenbar.length === 2
                    && daten._nichtZuordenbar.join(' ').includes('4.1.2'));
                pruefeWahr('Kein Gutachten-Kopf in dieser Ansicht', daten._nurKriterien === true);
                pruefeWahr('Alle 65 Kriterien sind belegt',
                    daten.values_orig.length === ITEMS.filter(i => i.m).length);

                // Medicproof-Nummern werden auf die interne Zählung gebracht
                const mp = stellungnahmeZuImport({ kriterien: [
                    { crit: '5.1.1', eigene: 'unselbständig' } ] }, '');
                pruefe('Medicproof-Nummer wird zugeordnet',
                    (mp.values_orig.find(w => w.id === kid('4.1.1')) || {}).val_num, 3);

                // Die Übernahme muss auch wirklich schreiben. Erst war hier der ANZEIGETEXT
                // der Quelle statt ihres Schlüssels übergeben – setzeBewertung wies alles
                // ab, die Ansicht sah richtig aus und nichts wurde eingetragen.
                const mE = JSON.parse(JSON.stringify(stateEigene));
                try {
                    ITEMS.forEach(i => {
                        stateEigene.values[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                    });
                    const revU = normalizeImport(daten);
                    uebernehmeAlteStellungnahme(revU);
                    // Nicht den Rückgabewert prüfen (er zählt nur die Änderungen), sondern
                    // ob am Ende JEDES Kriterium den vorgesehenen Wert trägt.
                    const falschUebernommen = ITEMS.filter(i => i.m).filter(i =>
                        JSON.stringify(stateEigene.values[i.id]) !== JSON.stringify(revU.valuesMap[i.id]));
                    pruefe('Übernahme schreibt jedes Kriterium',
                        falschUebernommen.map(i => i.nr), []);
                    pruefe('Übernahme: strittige Wertung steht in der eigenen Spalte',
                        stateEigene.values[kid('4.1.1')], 3);
                    pruefe('Übernahme: Häufigkeit steht in der eigenen Spalte',
                        [stateEigene.values[kid('4.5.13')].count, stateEigene.values[kid('4.5.13')].period], [3, 'W']);
                    pruefe('Übernahme: nicht strittiges folgt dem Gutachten',
                        stateEigene.values[kid('4.2.5')], 2);
                    pruefe('Übernahme lässt das Erstgutachten unberührt',
                        stateOrig.values[kid('4.1.1')], 1);
                } finally { stateEigene.values = mE.values; }

                // Gegenprobe gegen die Modulsummen der Stellungnahme
                const rev = normalizeImport(daten);
                pruefe('Gegenprobe: stimmige Summe meldet nichts',
                    stellungnahmeGegenprobe(Object.assign({}, rev,
                        { eigeneSummen: { weights: [calculateInternal({ special: 0, values: rev.valuesMap }).weights[0], null, null, null, null, null] } })).length, 0);
                const falsch = stellungnahmeGegenprobe(Object.assign({}, rev,
                    { eigeneSummen: { weights: [99, null, null, null, null, null] } }));
                pruefe('Gegenprobe: falsche Summe wird erkannt', falsch.length, 1);
                pruefeWahr('Gegenprobe nennt beide Zahlen',
                    falsch[0] && falsch[0].lautStellungnahme === 99);
                pruefe('Ohne Summen keine Gegenprobe',
                    stellungnahmeGegenprobe(Object.assign({}, rev, { eigeneSummen: null })).length, 0);
            } finally {
                stateOrig.values = mO.values;
                if (typeof importZiel !== 'undefined') importZiel = mZiel;
            }

            // Die Anweisung an die KI muss den Aufbau der Stellungnahme benennen.
            const anw = stellungnahmeAnweisung();
            pruefeWahr('Anweisung: kein Gutachten', anw.includes('Es ist KEIN Gutachten'));
            pruefeWahr('Anweisung: nur Kriterien mit eigenem Block',
                anw.includes('Befund und Stellungnahme') && anw.includes('NUR Kriterien'));
            pruefeWahr('Anweisung: nichts erfinden', anw.includes('Erfinde keine Wertung'));
            pruefeWahr('Anweisung: Modul 5 als Häufigkeit', anw.includes('HÄUFIGKEITEN'));
            pruefeWahr('Anweisung: Modulsummen zur Gegenprobe',
                anw.includes('eigene_modul_1_weight'));
        }

        // ---------- 9g. Anhörung: Pflichtverweis in den Allgemeinen Angaben ----------
        // Gewünscht: In den Allgemeinen Angaben steht IMMER ein kurzer Verweis darauf, wie
        // sich das Zweitgutachten zur ursprünglichen pflegefachlichen Stellungnahme verhält.
        if (typeof anhoerungVerweisSatz === 'function') {
            const bau = (gefolgt, strittig) => ({
                gefolgt: gefolgt.map(n => ({ nr: n })),
                strittig: strittig.map(n => ({ nr: n }))
            });
            const MD = 'Medizinischer Dienst Nord';
            let s = anhoerungVerweisSatz(bau(['4.1.1', '4.2.5'], ['4.4.8', '4.5.14']), MD);
            pruefeWahr('Verweis nennt die Stellungnahme',
                s.includes('pflegefachlichen Stellungnahme'));
            pruefeWahr('Verweis nennt das Verhältnis',
                s.includes('2 von 4 beanstandeten Kriterien')
                && s.includes('bleibt es bei der bisherigen Wertung'));
            // In den Vorlagen des Verfassers steht hier KEINE Nummernreihe. Zwanzig
            // Kriteriumsnummern hintereinander sind genau das Abzählen, das dieser
            // Abschnitt nicht enthalten soll.
            pruefeWahr('Verweis zählt keine Kriterien auf', !/\d\.\d\.\d/.test(s));
            pruefeWahr('Verweis nennt die Organisation nicht (Grammatikfalle)',
                !/Medizinische[rn]? Dienst|Medicproof/.test(s));
            pruefeWahr('Verweis doppelt die Stellungnahme nicht',
                s.split('pflegefachlichen Stellungnahme').length === 2);

            pruefeWahr('Verweis im Singular richtig',
                anhoerungVerweisSatz(bau(['4.1.1'], ['4.4.8']), MD).includes('in einem von 2'));
            pruefeWahr('Verweis, wenn in nichts gefolgt wurde',
                anhoerungVerweisSatz(bau([], ['4.1.1']), MD).includes('in keinem Punkt gefolgt'));
            pruefeWahr('Verweis, wenn in allem gefolgt wurde',
                anhoerungVerweisSatz(bau(['4.1.1', '4.2.5'], []), MD).includes('in allen 2'));
            pruefe('Ohne Vergleichsmaterial kein Verweis',
                anhoerungVerweisSatz(bau([], []), MD), '');

            // Die KI soll die Beispiele selbst benennen – aber höchstens drei, mit Namen.
            const ap = generateBegruendungenAnhoerung.toString();
            pruefeWahr('KI nennt höchstens drei Beispiele',
                ap.includes('HÖCHSTENS DREI Kriterien') && ap.includes('Zähle NIEMALS alle auf'));
        }

        // ---------- 9f. Kopfzeile und Druckbild ----------
        // Gemeldet: „about:blank" unten links in der gespeicherten PDF, und der
        // Doppelpunkt stand weit hinter der Bezeichnung statt direkt dahinter.
        if (typeof printAppealText === 'function') {
            // (a) Doppelpunkt an der Bezeichnung – in ALLEN Vorlagen
            // buildStellungnahme, nicht baueDokument: letzteres verteilt nur auf die
            // Vorlagen und enthält selbst keine Kopfzeile.
            const quellen = { widerspruch: buildStellungnahme, hoeherstufung: buildHoeherstufung,
                              anhoerung: buildAnhoerung, deckblatt: buildDeckblatt };
            Object.keys(quellen).forEach(name => {
                const src = quellen[name].toString();
                // Der Doppelpunkt gehört zur Bezeichnung. Das Leerzeichen zwischen den
                // beiden Feldern ist nötig: Der Flex-Satz überspringt es, aber der
                // Word-Export kennt kein Flex – dort träfen sonst „Betreffend:" und der
                // Wert unmittelbar aufeinander.
                pruefeWahr(name + ': Doppelpunkt steht an der Bezeichnung',
                    src.includes('${esc(k)}:</span> <span>') && !src.includes('<span>: ${esc(v'));
            });

            // (b) Die Angaben bleiben in ihrer Spalte (gemessen, nicht geschätzt)
            const h = document.createElement('div');
            h.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px';
            h.innerHTML = '<div class="stmt"><div class="data-block">'
                + '<div class="data-row"><span class="k">Betreffend:</span><span id="__sv1">Frau A</span></div>'
                + '<div class="data-row"><span class="k">Gutachtenorganisation:</span><span id="__sv2">Medizinischer Dienst</span></div>'
                + '</div></div>';
            const stEl = document.createElement('style'); stEl.textContent = STELLUNGNAHME_CSS;
            document.body.appendChild(stEl); document.body.appendChild(h);
            const bezug = h.querySelector('.data-row').getBoundingClientRect();
            const v1 = document.getElementById('__sv1').getBoundingClientRect();
            const v2 = document.getElementById('__sv2').getBoundingClientRect();
            const abstand = Math.round(v1.left - bezug.left);
            h.remove(); stEl.remove();
            pruefe('Angaben beginnen an der bisherigen Stelle', abstand, 217);
            pruefeWahr('Alle Angaben bündig untereinander', Math.abs(v1.left - v2.left) < 0.5);

            // (c) Druckbild: kein Platz für die Kopfzeile des Browsers, aber Ränder
            //     auf jeder Seite über die wiederholte Kopf-/Fußzeile der Tabelle.
            const echtesOeffnen = window.open;
            let druckHtml = '';
            window.open = () => ({ document: { write: s => { druckHtml += s; }, close: () => {} } });
            let ziel = document.getElementById('appeal-document');
            const selbstGebaut = !ziel;
            if (selbstGebaut) { ziel = document.createElement('div'); ziel.id = 'appeal-document'; document.body.appendChild(ziel); }
            const merkInhalt = ziel.innerHTML;
            ziel.innerHTML = '<div class="stmt"><p>Probe</p></div>';
            printAppealText();
            if (selbstGebaut) ziel.remove(); else ziel.innerHTML = merkInhalt;
            window.open = echtesOeffnen;

            pruefeWahr('Druck: kein Seitenrand für die Browser-Kopfzeile',
                druckHtml.includes('@page{size:A4;margin:0;}'));
            pruefeWahr('Druck: alter Seitenrand ist weg', !druckHtml.includes('@page{margin:14mm;}'));
            // Die Ränder kamen früher aus einer Tabelle mit wiederholtem thead/tfoot.
            // Seit die App die Seiten selbst setzt, stecken sie in .seite – zusammen mit
            // der Seitenzahl, die die Tabellenlösung nicht liefern konnte.
            pruefeWahr('Druck: Seiten mit eigenem Rand',
                druckHtml.includes('.seite{width:210mm') && druckHtml.includes('padding:20mm 20mm 16mm'));
            pruefeWahr('Druck: Platz für die Fußzeile', druckHtml.includes('.seiten-fuss{'));
            pruefeWahr('Druck: Inhalt wird vor dem Aufteilen gemessen',
                druckHtml.includes('id="mess"') && druckHtml.includes('id="seiten"'));
            pruefeWahr('Druck: Aufteilung läuft vor dem Drucken',
                druckHtml.includes("seitenAufteilen(document.getElementById('mess'), document.getElementById('seiten'))")
                && druckHtml.indexOf("seitenAufteilen(document") < druckHtml.indexOf('window.print()'));
        }

        // ---------- 9u. Anamnese im Antrag: zwei Unterabschnitte ----------
        // Gewünscht: „Anamnese" bleibt die große Überschrift. Darunter „Angaben laut
        // Vorgutachten" (kurze Zusammenfassung, Viertelseite) und „Aktuelle Situation"
        // (aus Notizen und Unterschieden, Drittelseite).
        if (typeof anamneseAufgabe === 'function') {
            const mM = appModus, mAnam = document.getElementById('stam-anamnese').value;
            try {
                document.getElementById('stam-anamnese').value =
                    'Frau Muster lebt allein im zweiten Obergeschoss ohne Aufzug. Die Tochter kommt täglich.';
                ['erstantrag', 'hoeherstufung'].forEach(m => {
                    appModus = m;
                    const el = document.createElement('div');
                    el.innerHTML = buildHoeherstufung('Notizen.', {}, '', 'Kurzfassung der KI.');
                    const h2 = Array.from(el.querySelectorAll('h2')).map(x => x.innerText);
                    const h3 = Array.from(el.querySelectorAll('h3')).map(x => x.innerText);
                    pruefeWahr(m + ': Anamnese bleibt große Überschrift', h2.includes('Anamnese'));
                    pruefe(m + ': zwei Unterüberschriften unter der Anamnese',
                        h3.slice(0, 2), ['Angaben laut Vorgutachten', 'Aktuelle Situation']);
                    pruefeWahr(m + ': Aktuelle Situation ist nicht mehr Hauptüberschrift',
                        !h2.includes('Aktuelle Situation'));
                    pruefe(m + ': gekürzte Fassung steht im Dokument',
                        (el.querySelector('#stmt-anamnese') || {}).innerText, 'Kurzfassung der KI.');
                });

                // Ohne Vorgutachten (Erstantrag ohne eingelesenes Gutachten) entfällt der Abschnitt
                document.getElementById('stam-anamnese').value = '';
                appModus = 'erstantrag';
                const el2 = document.createElement('div');
                el2.innerHTML = buildHoeherstufung('Notizen.', {}, '', '');
                pruefe('Ohne Vorgutachten nur die aktuelle Situation',
                    Array.from(el2.querySelectorAll('h3')).map(x => x.innerText), ['Aktuelle Situation']);
                pruefeWahr('Ohne Vorgutachten kein leerer Abschnitt', !el2.querySelector('#stmt-anamnese'));

                /* Ohne KI-Kurzfassung entfällt der Abschnitt. Früher stand hier der Rohtext –
                   im Fall des Verfassers drei Seiten Anamnese aus dem Vorgutachten. */
                document.getElementById('stam-anamnese').value = 'Roher Anamnesetext aus dem Gutachten. '.repeat(80);
                const el3 = document.createElement('div');
                el3.innerHTML = buildHoeherstufung('Notizen.', {}, '', '');
                pruefeWahr('Ohne Kurzfassung kein Rohtext im Dokument',
                    !el3.querySelector('#stmt-anamnese') && el3.innerText.indexOf('Roher Anamnesetext') === -1);
                pruefeWahr('Ohne Kurzfassung auch keine leere Überschrift',
                    !Array.from(el3.querySelectorAll('h3')).some(x => /Angaben laut Vorgutachten/.test(x.innerText)));
            } finally { appModus = mM; document.getElementById('stam-anamnese').value = mAnam; }

            // Längen: Viertelseite für die Anamnese, Drittelseite für die aktuelle Situation
            pruefe('Anamnese: Viertelseite', [LAENGE.anamneseWoerterMax, LAENGE.anamneseZeichenMax], [130, 900]);
            const mM2 = appModus;
            try {
                appModus = 'hoeherstufung';
                pruefe('Antrag: Einleitung auf Drittelseite',
                    [allgemeinWortGrenze(), allgemeinZeichenGrenze()], [175, 1200]);
                pruefeWahr('Antrag: Vorgabe nennt die Drittelseite',
                    laengenVorgabeAllgemein('Aktuelle Situation').includes('DRITTEL A4-Seite'));
                appModus = 'widerspruch';
                pruefe('Widerspruch: Einleitung bleibt halbe Seite',
                    [allgemeinWortGrenze(), allgemeinZeichenGrenze()], [260, 1800]);
                pruefeWahr('Widerspruch: Vorgabe nennt die halbe Seite',
                    laengenVorgabeAllgemein('Allgemeine Angaben').includes('HALBE A4-Seite'));
            } finally { appModus = mM2; }

            // Zu lange Texte werden erkannt
            const langeAnamnese = 'Wort '.repeat(200);
            const v = laengenVerstoesse({}, '', langeAnamnese);
            pruefe('Zu lange Anamnese wird erkannt', v.length, 1);
            pruefe('Sie wird als Anamnese benannt', v[0] && v[0].art, 'anamnese');
            pruefe('Kurze Anamnese meldet nichts',
                laengenVerstoesse({}, '', 'Kurz und knapp.').length, 0);

            // Die Anweisung an die KI
            const a = anamneseAufgabe('Rohtext');
            pruefeWahr('Anweisung nennt die Viertelseite', a.includes('VIERTEL A4-Seite'));
            pruefeWahr('Anweisung verbietet Bewertung und Verschlechterung',
                a.includes('STRENG VERBOTEN') && a.includes('jede Aussage über eine Verschlechterung'));
            pruefeWahr('Anweisung verbietet Erfinden', a.includes('Erfinde nichts'));
            pruefeWahr('Anweisung übergibt den Rohtext', a.includes('Rohtext'));
            pruefeWahr('Erzeugung fragt die Zusammenfassung ab',
                buildAntragPrompt.toString().includes('anamneseAufgabe(anamneseRoh)')
                && generateBegruendungenAntrag.toString().includes('anamnese: { type: "STRING" }'));
        }

        // ---------- 9s. Antrag ohne Gegenüberstellung ----------
        // Gemeldet: Im Erstantrag und im Höherstufungsantrag standen die Kriterien wie in
        // einem Widerspruch – „Gutachterliche Bewertung: X" und „somit ist Y ableitbar".
        // Ein Erstantrag hat gar kein Gutachten, gegen das sich etwas ableiten ließe.
        if (typeof buildHoeherstufung === 'function') {
            const mM = appModus, mO = JSON.parse(JSON.stringify(stateOrig)),
                  mE = JSON.parse(JSON.stringify(stateEigene));
            try {
                const kid = nr => ITEMS.find(i => i.nr === nr).id;
                stateOrig.extracted = null;
                ITEMS.forEach(i => {
                    const l = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                    stateOrig.values[i.id] = JSON.parse(JSON.stringify(l));
                    stateEigene.values[i.id] = JSON.parse(JSON.stringify(l));
                });
                stateEigene.values[kid('4.1.1')] = 1;
                stateEigene.values[kid('4.5.1')] = { count: 3, period: 'D' };

                ['erstantrag', 'hoeherstufung'].forEach(m => {
                    appModus = m;
                    const el = document.createElement('div');
                    el.innerHTML = buildHoeherstufung('', {}, '');
                    const t = el.innerText.replace(/\s+/g, ' ');
                    pruefeWahr(m + ': keine gutachterliche Bewertung im Kriterienblock',
                        !t.includes('Gutachterliche Bewertung') && !t.includes('Bewertung im Vorgutachten'));
                    pruefeWahr(m + ': kein Ableitungssatz gegen eine fremde Wertung',
                        !/ist (somit )?eine Wertung mit .* ableitbar/.test(t));
                    pruefeWahr(m + ': eigene Einschätzung steht unter dem Lebensbereich',
                        t.includes('Einschätzung: Positionswechsel im Bett „überwiegend selbständig“'));
                    pruefeWahr(m + ': keine Überschrift je Kriterium mehr',
                        !t.includes('4.1.1 Positionswechsel im Bett: „'));
                    pruefeWahr(m + ': Modul 5 ohne Gegenüberstellung',
                        t.includes('Modul 5 kommt damit auf') && !t.includes('statt'));
                    // Die Tabelle behält die Gegenüberstellung – dort gehört sie hin.
                    if (m === 'hoeherstufung') {
                        const kopf = Array.from(el.querySelectorAll('table.cmp thead th')).map(x => x.innerText.trim());
                        pruefeWahr('hoeherstufung: Tabelle stellt weiter gegenüber',
                            kopf.some(k => /Vorgutachten/i.test(k)));
                    }
                });

                // Der Widerspruch bleibt unverändert – dort IST die Gegenüberstellung richtig.
                appModus = 'widerspruch';
                const w = document.createElement('div');
                w.innerHTML = buildStellungnahme('', {}, '');
                pruefeWahr('Widerspruch behält die Gegenüberstellung',
                    w.innerText.includes('Gutachterliche Bewertung'));

                // Der Stand-Satz für Modul 5 rechnet, ohne zu vergleichen
                const st = m5StandSatz('4.5.1', 'own');
                pruefeWahr('Modul-5-Satz nennt die Gruppe', st.includes('4.5.1–4.5.7'));
                pruefeWahr('Modul-5-Satz nennt die gewichteten Punkte', st.includes('5,00 gewichtete Punkte'));
                pruefeWahr('Modul-5-Satz vergleicht nicht', !/statt|bisher|Vorgutachten/.test(st));
                pruefe('Kein Stand-Satz außerhalb von Modul 5', m5StandSatz('4.1.1', 'own'), '');
            } finally { appModus = mM; stateOrig.values = mO.values; stateEigene.values = mE.values; }

            // Die KI-Anweisung darf im Antrag nicht als Widerlegung formuliert sein
            const bp = buildBegruendungPrompt.toString();
            pruefeWahr('Anweisung unterscheidet Antrag und Widerspruch',
                bp.includes('KEINE GEGENÜBERSTELLUNG') && bp.includes('Erwähne kein Gutachten'));
            pruefeWahr('Anweisung nennt im Antrag nur die eigene Stufe',
                bp.includes('Stufenbezeichnung: verwende ausschließlich'));
        }

        // ---------- 9t. Nicht über die Vorgangsart hinweg zusammenführen ----------
        // Ursache des gemeldeten Bildes: Ein früher erzeugter Widerspruch blieb beim
        // erneuten Erstellen als Höherstufungsantrag im Wortlaut stehen – das
        // Zusammenführen behält unveränderte Kriterienblöcke.
        if (typeof mergeStellungnahme === 'function') {
            const alt = '<div class="stmt" data-vorgang="widerspruch"><div id="stmt-crit">'
                      + '<div class="crit" data-nr="4.1.1" data-vals="selbständig|überwiegend selbständig">'
                      + '<div class="ct">4.1.1: Positionswechsel im Bett</div>'
                      + '<div>Gutachterliche Bewertung: „selbständig“</div></div></div></div>';
            const neuAntrag = '<div class="stmt" data-vorgang="hoeherstufung"><div id="stmt-crit">'
                      + '<div class="crit" data-nr="4.1.1" data-vals="selbständig|überwiegend selbständig">'
                      + '<div class="ct">4.1.1 Positionswechsel im Bett: „überwiegend selbständig“</div></div></div></div>';
            const zusammen = mergeStellungnahme(alt, neuAntrag);
            pruefeWahr('Wechsel der Vorgangsart baut neu auf',
                !zusammen.includes('Gutachterliche Bewertung'));
            pruefeWahr('Wechsel der Vorgangsart übernimmt die neue Form',
                zusammen.includes('Positionswechsel im Bett: „überwiegend selbständig“'));

            // Verworfen werden nur die Kriterienblöcke – von Hand überarbeitete
            // „Allgemeine Angaben" tragen die falsche Form nicht und bleiben erhalten.
            const altMitText = '<div class="stmt" data-vorgang="widerspruch">'
                + '<div id="stmt-notes" data-sig="x" data-ai="1">HANDGESCHRIEBENER ABSATZ</div>'
                + '<div id="stmt-crit"><div class="crit" data-nr="4.1.1" data-vals="a|b">'
                + '<div>Gutachterliche Bewertung: „selbständig“</div></div></div></div>';
            const neuMitText = '<div class="stmt" data-vorgang="hoeherstufung">'
                + '<div id="stmt-notes" data-sig="x" data-ai="0">Standardtext</div>'
                + '<div id="stmt-crit"><div class="crit" data-nr="4.1.1" data-vals="a|b">'
                + '<div>Neue Form</div></div></div></div>';
            const gemischt = mergeStellungnahme(altMitText, neuMitText);
            pruefeWahr('Handgeschriebene Angaben überleben den Wechsel',
                gemischt.includes('HANDGESCHRIEBENER ABSATZ'));
            pruefeWahr('Alte Kriterienform überlebt den Wechsel nicht',
                !gemischt.includes('Gutachterliche Bewertung'));

            // Innerhalb derselben Vorgangsart bleibt der überarbeitete Text erhalten
            const altW = '<div class="stmt" data-vorgang="widerspruch"><div id="stmt-crit">'
                      + '<div class="crit" data-nr="4.1.1" data-vals="selbständig|überwiegend selbständig">'
                      + '<div class="ct">4.1.1: Positionswechsel im Bett</div>'
                      + '<div>VON HAND ERGAENZT</div></div></div></div>';
            const neuW = '<div class="stmt" data-vorgang="widerspruch"><div id="stmt-crit">'
                      + '<div class="crit" data-nr="4.1.1" data-vals="selbständig|überwiegend selbständig">'
                      + '<div class="ct">4.1.1: Positionswechsel im Bett</div>'
                      + '<div>Neuer Standardsatz</div></div></div></div>';
            pruefeWahr('Gleiche Vorgangsart: Handarbeit bleibt erhalten',
                mergeStellungnahme(altW, neuW).includes('VON HAND ERGAENZT'));

            // Jede Vorlage schreibt ihre Vorgangsart mit
            pruefeWahr('Widerspruch kennzeichnet sich',
                buildStellungnahme.toString().includes('data-vorgang="widerspruch"'));
            pruefeWahr('Anhörung kennzeichnet sich',
                buildAnhoerung.toString().includes('data-vorgang="anhoerung"'));
            pruefeWahr('Antrag kennzeichnet sich',
                buildHoeherstufung.toString().includes("data-vorgang=\"${istHoeher ? 'hoeherstufung' : 'erstantrag'}\""));
        }

        // ---------- 9q. Hilfsmittel und Behandlungspflege ohne Doppelerfassung ----------
        // Gemeldet: Die Eingabemasken erfassen fast dasselbe. Nachgerechnet wurde dabei
        // eine Doppelzählung: Die Kompressionsversorgung stand in beiden Tabellen, die
        // App addierte beide Häufigkeiten und trieb 4.5.7 von 8 auf 18 pro Tag.
        if (typeof doppelteErfassung === 'function') {
            const merkErf = JSON.parse(JSON.stringify(erfassung));
            try {
                // Der gemeldete Fall, nach dem Umbau: alles einmal in den Hilfsmitteln
                erfassung.hilfsmittel = [
                    { bezeichnung: 'Kompressionskniestrümpfe', nutzung: 'genutzt', anzahl: '2', zeitraum: 'pro Tag', taetigkeit: 'An- und Ausziehen' },
                    { bezeichnung: 'Kompressionslegging', nutzung: 'genutzt', anzahl: '2', zeitraum: 'pro Tag', taetigkeit: 'An- und Ausziehen' },
                    { bezeichnung: 'Zehenkappen (Kompression)', nutzung: 'genutzt', anzahl: '2', zeitraum: 'pro Tag', taetigkeit: 'An- und Ausziehen' },
                    { bezeichnung: 'Lymphomat', nutzung: 'genutzt', anzahl: '2', zeitraum: 'pro Tag', taetigkeit: 'Anlegen der Manschetten' },
                    { bezeichnung: 'Schlafapnoemaske', nutzung: 'genutzt', anzahl: '4', zeitraum: 'pro Tag', taetigkeit: 'Aufsetzen, Sitzkorrektur' },
                    { bezeichnung: 'Brille', nutzung: 'genutzt', anzahl: '1', zeitraum: 'pro Tag', taetigkeit: '' },
                    { bezeichnung: 'Rollator', nutzung: 'genutzt', anzahl: '1', zeitraum: 'pro Tag', taetigkeit: 'Bereitstellen' },
                    { bezeichnung: 'Aufstehhilfe', nutzung: 'ungenutzt', anzahl: '2', zeitraum: 'pro Tag', taetigkeit: 'Bereitstellen' }
                ];
                erfassung.behandlungspflege = [];
                erfassung.arztbesuche = []; erfassung.medikation = [];
                let z = modul5AusErfassung();
                // 4.5.7: 2+2+2+2 = 8 (Kompression dreifach + Lymphomat). Maske zu 4.5.4.
                pruefe('Hilfsmittel: 4.5.7 ohne Doppelzählung', z['4.5.7'] && z['4.5.7'].count, 8);
                pruefe('Schlafapnoemaske zählt wie CPAP', z['4.5.4'] && z['4.5.4'].count, 4);
                pruefeWahr('Brille ohne Tätigkeit zählt nicht',
                    !Object.keys(z).some(nr => nr === '4.4.2'));
                pruefeWahr('Rollator bleibt unbewertet (BRi)', (z['4.5.7'] || {}).count === 8);

                // Ungenutztes zählt nie – auch mit Tätigkeit und Häufigkeit
                erfassung.hilfsmittel = [{ bezeichnung: 'Aufstehhilfe', nutzung: 'ungenutzt',
                    anzahl: '3', zeitraum: 'pro Tag', taetigkeit: 'Bereitstellen' }];
                pruefe('Ungenutztes Hilfsmittel zählt nicht',
                    Object.keys(modul5AusErfassung()).length, 0);

                // Ohne Tätigkeit keine personelle Hilfe
                erfassung.hilfsmittel = [{ bezeichnung: 'Kompressionsstrümpfe', nutzung: 'genutzt',
                    anzahl: '2', zeitraum: 'pro Tag', taetigkeit: '' }];
                pruefe('Ohne Tätigkeit keine Wertung', Object.keys(modul5AusErfassung()).length, 0);
                erfassung.hilfsmittel[0].taetigkeit = 'An- und Ausziehen';
                pruefe('Mit Tätigkeit wird gewertet',
                    (modul5AusErfassung()['4.5.7'] || {}).count, 2);

                // Ältere Falldateien kennen das Feld nicht – dort gilt die Durchführung
                erfassung.hilfsmittel = [{ bezeichnung: 'Kompressionsstrümpfe', anzahl: '2',
                    zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' }];
                pruefe('Alter Fall: Durchführung gilt weiter',
                    (modul5AusErfassung()['4.5.7'] || {}).count, 2);
                erfassung.hilfsmittel[0].durchfuehrung = 'selbständig';
                pruefe('Alter Fall: selbständig zählt nicht',
                    Object.keys(modul5AusErfassung()).length, 0);

                // Warnung, wenn ein körpernahes Hilfsmittel doch unten steht
                erfassung.hilfsmittel = [];
                erfassung.behandlungspflege = [
                    { art: 'Kompressionsstrümpfe anlegen', anzahl: '6', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' },
                    { art: 'Verbandswechsel', anzahl: '1', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' }
                ];
                const doppelt = doppelteErfassung();
                pruefe('Doppelte Erfassung wird erkannt', doppelt.length, 1);
                pruefeWahr('Warnung nennt die Maßnahme',
                    !!doppelt[0] && doppelt[0].includes('Kompression'));
                erfassung.behandlungspflege = [{ art: 'Verbandswechsel', anzahl: '1', zeitraum: 'pro Tag', durchfuehrung: 'durch Pflegeperson' }];
                pruefe('Reine Behandlungspflege meldet nichts', doppelteErfassung().length, 0);

                // Die Auswahl der Behandlungspflege enthält keine körpernahen Hilfsmittel mehr
                pruefeWahr('Auswahl ohne Kompression und CPAP',
                    !BEHANDLUNGSPFLEGE_ART.some(a => HILFSMITTEL_MASSNAHMEN.test(a)));
                pruefeWahr('Auswahl enthält weiter die Behandlungspflege',
                    BEHANDLUNGSPFLEGE_ART.includes('Verbandswechsel')
                    && BEHANDLUNGSPFLEGE_ART.includes('Absaugen'));
            } finally {
                Object.keys(erfassung).forEach(k => delete erfassung[k]);
                Object.keys(merkErf).forEach(k => erfassung[k] = merkErf[k]);
            }

            // Die Spalten der Hilfsmitteltabelle
            const hm = ERFASSUNG_TABELLEN.find(t => t.id === 'hilfsmittel');
            pruefe('Hilfsmittel: Spalten',
                hm.spalten.map(s => s.k), ['bezeichnung', 'nutzung', 'anzahl', 'zeitraum', 'taetigkeit']);
            pruefe('Hilfsmittel: Nutzung mit zwei Stufen', HILFSMITTEL_NUTZUNG, ['genutzt', 'ungenutzt']);
        }

        // ---------- 9r. Größe und Gewicht nur einmal im Schriftstück ----------
        if (typeof befundBlock === 'function') {
            const merkTexte = JSON.parse(JSON.stringify(typeof befundTexte !== 'undefined' ? befundTexte : {}));
            try {
                befundTexte['groesse'] = '166';
                befundTexte['gewicht'] = '125';
                befundTexte['bmi'] = '45,4';
                const block = befundBlock();
                pruefeWahr('Ernährung erscheint nicht mehr als eigene Tabelle',
                    !/>\s*Ernährung\s*</.test(block));
                pruefeWahr('Größe steht nicht im Befundblock', !block.includes('166'));
                pruefeWahr('Andere Befundgruppen bleiben erhalten',
                    BEFUND_GRUPPEN.filter(g => BEFUND_GRUPPEN_DOPPELT.indexOf(g.id) === -1).length
                    === BEFUND_GRUPPEN.length - 1);
                pruefe('Nur die Ernährungsgruppe wird ausgelassen', BEFUND_GRUPPEN_DOPPELT, ['ernaehrung']);
            } finally {
                Object.keys(befundTexte).forEach(k => delete befundTexte[k]);
                Object.keys(merkTexte).forEach(k => befundTexte[k] = merkTexte[k]);
            }
        }

        // ---------- 9o. Genitiv der Gutachtenorganisation ----------
        // Rückmeldung der Kollegin: „des Medizinischer Dienst" – richtig ist
        // „des Medizinischen Dienstes".
        if (typeof orgGenitiv === 'function') {
            pruefe('Genitiv: Medizinischer Dienst',
                orgGenitiv('Medizinischer Dienst'), 'des Medizinischen Dienstes');
            pruefe('Genitiv: mit Region',
                orgGenitiv('Medizinischer Dienst Nord'), 'des Medizinischen Dienstes Nord');
            pruefe('Genitiv: Region mit Bindestrich',
                orgGenitiv('Medizinischer Dienst Berlin-Brandenburg'),
                'des Medizinischen Dienstes Berlin-Brandenburg');
            pruefe('Genitiv: bereits gebeugt geschrieben',
                orgGenitiv('Medizinischen Dienstes Bayern'), 'des Medizinischen Dienstes Bayern');
            // Weibliche Firmierung bekommt „der"
            pruefe('Genitiv: Medicproof GmbH', orgGenitiv('Medicproof GmbH'), 'der Medicproof GmbH');
            pruefe('Genitiv: unbekannte Organisation', orgGenitiv('Prüfdienst Nord'), 'des Prüfdienst Nord');
            pruefe('Genitiv: ohne Angabe', orgGenitiv(''), 'des Medizinischen Dienstes');

            // Und im fertigen Schriftstück – in allen Vorlagen
            const merkOrg = document.getElementById('stam-organisation').value;
            const merkModus = appModus;
            try {
                document.getElementById('stam-organisation').value = 'Medizinischer Dienst Nord';
                const rein = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                const proben = {
                    widerspruch: () => { appModus = 'widerspruch'; return rein(buildStellungnahme('', {}, '')); },
                    hoeherstufung: () => { appModus = 'hoeherstufung'; return rein(buildHoeherstufung('', {}, '')); },
                    anhoerung: () => { appModus = 'anhoerung'; return rein(buildAnhoerung('', {}, '')); }
                };
                Object.keys(proben).forEach(name => {
                    const t = proben[name]();
                    pruefeWahr(name + ': Genitiv richtig gebeugt',
                        t.includes('des Medizinischen Dienstes Nord'));
                    pruefeWahr(name + ': kein „des Medizinischer Dienst"',
                        !/des Medizinischer Dienst/.test(t));
                });
            } finally {
                document.getElementById('stam-organisation').value = merkOrg;
                appModus = merkModus;
            }
        }

        // ---------- 9p. Druckbild: Seitenzahlen und Seitenumbrüche ----------
        // Rückmeldung der Kollegin: Seitenangabe fehlt, und zusammenhängende Abschnitte
        // werden umgebrochen („Allgemeine Angaben" allein unten auf der Seite).
        if (typeof seitenAufteilen === 'function') {
            const bau = (anzahlAbsaetze, hoehePx) => {
                const q = document.createElement('div');
                q.style.cssText = 'position:absolute;left:-10000px;top:0;width:600px';
                let html = '<div class="stmt"><h2>Allgemeine Angaben</h2>';
                for (let i = 0; i < anzahlAbsaetze; i++) {
                    html += '<p style="height:' + hoehePx + 'px;margin:0">Absatz ' + (i + 1) + '</p>';
                }
                html += '</div>';
                q.innerHTML = html;
                document.body.appendChild(q);
                const z = document.createElement('div');
                z.style.cssText = 'position:absolute;left:-10000px;top:0';
                document.body.appendChild(z);
                return { q, z };
            };

            // 253 mm nutzbare Höhe ~ 956 px. Vier Absätze zu 300 px brauchen zwei Seiten.
            let { q, z } = bau(4, 300);
            let seiten = seitenAufteilen(q, z);
            pruefe('Druck: Inhalt wird auf Seiten verteilt', seiten, 2);
            pruefeWahr('Druck: jede Seite hat eine Fußzeile',
                z.querySelectorAll('.seiten-fuss').length === 2);
            const fuss = k => { const s2 = z.children[k]; const f = s2 && s2.querySelector('.seiten-fuss');
                                return f ? f.textContent : null; };
            pruefe('Druck: Seitenzahl auf Seite 1', fuss(0), 'Seite 1 von 2');
            pruefe('Druck: Seitenzahl auf Seite 2', fuss(1), 'Seite 2 von 2');
            // Die Überschrift darf nicht allein stehen bleiben
            const ersteSeite = z.children[0] ? z.children[0].innerText : '';
            pruefeWahr('Druck: Überschrift steht bei ihrem Absatz',
                !/Allgemeine Angaben\s*$/.test(ersteSeite.trim()));
            z.remove();

            // Passt alles auf eine Seite, bleibt es eine Seite
            ({ q, z } = bau(2, 200));
            pruefe('Druck: kurzer Text bleibt eine Seite', seitenAufteilen(q, z), 1);
            const einzelFuss = z.querySelector('.seiten-fuss');
            pruefe('Druck: Fußzeile auch bei einer Seite',
                einzelFuss ? einzelFuss.textContent : null, 'Seite 1 von 1');
            z.remove();

            /* Ein Block, der höher ist als eine Seite, darf nicht verschluckt werden. Er
               bleibt in EINEM Kasten (zerschneiden würde ihn zerstören), belegt aber zwei
               gedruckte Blätter – und genau die muss die Fußzeile zählen. Früher zählte
               sie hier „1 von 1", während der Drucker zwei Blätter auswarf. */
            ({ q, z } = bau(1, 2000));
            const langeSeiten = seitenAufteilen(q, z);
            pruefe('Druck: übergroßer Block bleibt ein Stück', z.children.length, 1);
            pruefe('Druck: seine Blätter werden mitgezählt', langeSeiten, 2);
            pruefe('Druck: die Fußzeile nennt die letzte Seite',
                z.querySelector('.seiten-fuss').textContent, 'Seite 2 von 2');
            pruefeWahr('Druck: sein Inhalt steht auf der Seite',
                z.innerText.includes('Absatz 1'));
            pruefeWahr('Druck: die Überschrift bleibt bei dem übergroßen Block',
                z.children[0].innerText.indexOf('Allgemeine Angaben') === 0);
            z.remove();

            /* Sammelkästen werden aufgeteilt. Alle Begründungen stehen zusammen in
               #stmt-crit. Als ein Stück gemessen galt dieser Kasten als EINE Seite, war
               aber sechsmal so hoch: Der Browser brach ihn selbst um – mitten in einer
               Begründung – und druckte sieben Blätter, während die Fußzeile „von 5" zählte. */
            {
                const q2 = document.createElement('div');
                q2.style.cssText = 'position:absolute;left:-10000px;top:0;width:600px';
                let inner = '';
                for (let i = 0; i < 6; i++) {
                    inner += '<div class="crit" data-nr="4.1.' + (i + 1) + '" style="height:400px;margin:0">'
                          + 'Begruendung ' + (i + 1) + '</div>';
                }
                q2.innerHTML = '<div class="stmt"><h2>Befund</h2><div id="stmt-crit">' + inner + '</div></div>';
                document.body.appendChild(q2);
                const z2 = document.createElement('div');
                z2.style.cssText = 'position:absolute;left:-10000px;top:0';
                document.body.appendChild(z2);
                const n2 = seitenAufteilen(q2, z2);
                const kaesten = Array.from(z2.children);
                pruefe('Druck: der Sammelkasten wird auf Seiten verteilt', n2, 3);
                pruefe('Druck: so viele Kästen wie gezählte Seiten', kaesten.length, n2);
                pruefeWahr('Druck: keine Seite läuft über',
                    kaesten.every(s => s.getBoundingClientRect().height <= 296 * 3.7795275591 + 1));
                pruefe('Druck: keine Begründung geht verloren', z2.querySelectorAll('.crit').length, 6);
                pruefeWahr('Druck: der Sammelkasten wird auf jeder Seite nachgebaut',
                    kaesten.every(s => Array.from(s.querySelectorAll('.crit'))
                        .every(c => c.parentNode !== s.firstChild && c.parentNode.parentNode === s.firstChild)));
                pruefe('Druck: die Kennung wird nicht doppelt vergeben',
                    z2.querySelectorAll('#stmt-crit').length, 1);
                pruefe('Druck: letzte Seitenzahl passt zur Gesamtzahl',
                    kaesten[kaesten.length - 1].querySelector('.seiten-fuss').textContent,
                    'Seite ' + n2 + ' von ' + n2);
                z2.remove();
            }

            // Das Druckbild selbst
            pruefeWahr('Druck: kein Seitenrand für die Browser-Kopfzeile',
                DRUCK_CSS.includes('@page{size:A4;margin:0;}'));
            pruefeWahr('Druck: Kriterienblöcke werden nicht zerschnitten',
                DRUCK_CSS.includes('.stmt .crit') && DRUCK_CSS.includes('break-inside:avoid'));
            pruefeWahr('Druck: Überschriften bleiben bei ihrem Text',
                DRUCK_CSS.includes('.stmt h1,.stmt h2{break-after:avoid'));
            pruefeWahr('Druck: keine Schusterjungen', DRUCK_CSS.includes('orphans:3;widows:3'));
            pruefeWahr('Die Aufteilung wird ins Druckfenster übertragen',
                printAppealText.toString().includes('seitenAufteilen.toString()'));
        }

        // ---------- 9n. Inkontinenzbedingung für 4.4.11 und 4.4.12 ----------
        // BRi vom 21.08.2024, Seite 103: „Die Einzelpunkte für die Kriterien F 4.4.11 und
        // F 4.4.12 gehen in die Ermittlung des Summenwertes für Modul 4 nur ein, wenn
        // laut gutachterlicher Einschätzung die antragstellende Person ‚überwiegend
        // inkontinent' oder ‚komplett inkontinent' ist oder eine künstliche Ableitung
        // von Stuhl beziehungsweise Harn erfolgt."
        if (typeof zaehltMit === 'function') {
            const kid = nr => ITEMS.find(i => i.nr === nr).id;
            const stand = (harn, stuhl) => {
                const st = { special: 0, values: {}, kontinenz: { harn: harn, stuhl: stuhl } };
                ITEMS.forEach(i => { st.values[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
                // Modul 4: 4.4.3=1, 4.4.4=1, 4.4.6=2, 4.4.10=2 -> 6 Punkte ohne Inkontinenz
                st.values[kid('4.4.3')] = 1; st.values[kid('4.4.4')] = 1;
                st.values[kid('4.4.6')] = 2; st.values[kid('4.4.10')] = 1;   // 4.4.10 hat 0/2/4/6
                st.values[kid('4.4.11')] = 1;
                st.values[kid('4.4.12')] = 1;
                return st;
            };
            // ohne Inkontinenz: 4.4.11 und 4.4.12 zählen NICHT -> 1+1+2+2 = 6
            pruefe('Kontinent: 4.4.11 und 4.4.12 zählen nicht',
                calculateInternal(stand(0, 0)).raws[3], 6);
            pruefe('Überwiegend kontinent: zählen weiterhin nicht',
                calculateInternal(stand(1, 1)).raws[3], 6);
            // überwiegend inkontinent: beide zählen -> 6 + 1 + 1 = 8
            pruefe('Überwiegend inkontinent: beide zählen',
                calculateInternal(stand(2, 2)).raws[3], 8);
            pruefe('Komplett inkontinent: beide zählen',
                calculateInternal(stand(3, 3)).raws[3], 8);
            pruefe('Künstliche Ableitung: beide zählen',
                calculateInternal(stand(4, 4)).raws[3], 8);
            // getrennt: nur Harn inkontinent -> nur 4.4.11 zählt
            pruefe('Nur Harninkontinenz: nur 4.4.11 zählt',
                calculateInternal(stand(3, 0)).raws[3], 7);
            pruefe('Nur Stuhlinkontinenz: nur 4.4.12 zählt',
                calculateInternal(stand(0, 3)).raws[3], 7);
            // Ohne Angabe wird wie bisher gezählt – kein stilles Wegrechnen
            pruefe('Ohne Angabe wird wie bisher gezählt',
                calculateInternal(stand(null, null)).raws[3], 8);

            // Die Grenze wirkt sich auf die gewichteten Punkte aus: 8 -> 20, 6 -> 10
            pruefe('Wirkung auf die gewichteten Punkte',
                [calculateInternal(stand(3, 3)).weights[3], calculateInternal(stand(0, 0)).weights[3]],
                [20, 10]);

            // Der Hinweis muss erklären, was gerade passiert
            const hinNicht = kontinenzHinweisText(stand(0, 0));
            pruefeWahr('Hinweis nennt die nicht gezählten Kriterien',
                hinNicht.includes('4.4.11') && hinNicht.includes('4.4.12')
                && hinNicht.includes('zählt aber nicht mit'));
            const hinOffen = kontinenzHinweisText(stand(null, null));
            pruefeWahr('Hinweis fragt die fehlende Angabe nach',
                hinOffen.includes('zählt die Bewertung mit') && hinOffen.includes('ergänzen'));
            const leer = { special: 0, values: {}, kontinenz: { harn: null, stuhl: null } };
            ITEMS.forEach(i => { leer.values[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            pruefe('Ohne Bewertung kein Hinweis', kontinenzHinweisText(leer), '');

            // Die Stufen nach der Richtlinie
            pruefe('Fünf Kontinenzstufen', KONTINENZ_STUFEN.length, 5);
            pruefe('Ab überwiegend inkontinent wird gezählt', KONTINENZ_ZAEHLT_AB, 2);
            pruefeWahr('Stufen in der Reihenfolge der BRi',
                KONTINENZ_STUFEN[0] === 'ständig kontinent'
                && KONTINENZ_STUFEN[2] === 'überwiegend inkontinent'
                && KONTINENZ_STUFEN[4] === 'künstliche Ableitung');

            // Andere Kriterien bleiben unberührt
            pruefeWahr('Andere Kriterien sind nicht betroffen',
                zaehltMit(stand(0, 0), ITEMS.find(i => i.nr === '4.4.10'))
                && zaehltMit(stand(0, 0), ITEMS.find(i => i.nr === '4.1.1')));
        }

        // ---------- 9e. Umrechnungstabellen aller sechs Module ----------
        // Anlass: In Modul 1 stand die Grenze zu 7,5 gewichteten Punkten bei 7 statt bei 6.
        // Wer genau 6 Einzelpunkte hatte, bekam 5,00 statt 7,50 – zweieinhalb Punkte zu
        // wenig. Solche Grenzfehler sieht man nur, wenn JEDER Wert einzeln geprüft wird.
        // Die Tabellen stehen ausgeschrieben hier, unabhängig von MODUL_SPANNEN – sonst
        // prüfte sich die Tabelle nur gegen sich selbst.
        if (typeof gewichtetePunkte === 'function') {
            const SOLL = {
                1: [[0,1,0], [2,3,2.5], [4,5,5], [6,9,7.5], [10,15,10]],
                2: [[0,1,0], [2,5,3.75], [6,10,7.5], [11,16,11.25], [17,33,15]],
                3: [[0,0,0], [1,2,3.75], [3,4,7.5], [5,6,11.25], [7,65,15]],
                4: [[0,2,0], [3,7,10], [8,18,20], [19,36,30], [37,54,40]],
                5: [[0,0,0], [1,1,5], [2,3,10], [4,5,15], [6,15,20]],
                6: [[0,0,0], [1,3,3.75], [4,6,7.5], [7,11,11.25], [12,18,15]]
            };
            Object.keys(SOLL).forEach(m => {
                const modul = Number(m);
                let falsch = [];
                SOLL[m].forEach(([von, bis, gew]) => {
                    for (let p = von; p <= bis; p++) {
                        const ist = gewichtetePunkte(modul, p);
                        if (ist !== gew) falsch.push(p + ': ' + ist + ' statt ' + gew);
                    }
                });
                pruefe('Modul ' + modul + ': jede Punktzahl richtig umgerechnet', falsch, []);
            });
            // Der konkrete Fehler, der gefunden wurde
            pruefe('Modul 1 mit 6 Einzelpunkten ergibt 7,50', gewichtetePunkte(1, 6), 7.5);
            pruefe('Modul 1 mit 5 Einzelpunkten ergibt 5,00', gewichtetePunkte(1, 5), 5);
            // Lückenlos: keine Spanne darf fehlen oder sich überlappen
            [1,2,3,4,5,6].forEach(m => {
                const s = MODUL_SPANNEN[m].slice().sort((a,b) => a.ab - b.ab);
                let lueckenlos = s[0].ab === 0;
                for (let k = 1; k < s.length; k++) if (s[k].ab !== s[k-1].bis + 1) lueckenlos = false;
                pruefeWahr('Modul ' + m + ': Spannen lückenlos und überschneidungsfrei', lueckenlos);
            });
        }

        // ---------- 9d. Modul 5: Gruppenwertung im Schriftstück erklären ----------
        // Anlass gemeldet: „Ich stelle fest, dass die Physiotherapie nicht zu werten ist,
        // gleichzeitig ändern sich die Punkte im Modul 5 nicht." Die Rechnung ist richtig –
        // 3 und 2 Einzelpunkte liegen beide in der Spanne 2 bis 3 und ergeben 10,00
        // gewichtete Punkte. Genau das muss im Schriftstück stehen, sonst liest es sich
        // widersprüchlich.
        if (typeof m5WirkungSatz === 'function') {
            // Die Spannen des Moduls 5 nach den Richtlinien
            pruefe('Modul 5: 0 Einzelpunkte', m5Gewichtet(0), 0);
            pruefe('Modul 5: 1 Einzelpunkt', m5Gewichtet(1), 5);
            pruefe('Modul 5: 2 Einzelpunkte', m5Gewichtet(2), 10);
            pruefe('Modul 5: 3 Einzelpunkte', m5Gewichtet(3), 10);
            pruefe('Modul 5: 4 Einzelpunkte', m5Gewichtet(4), 15);
            pruefe('Modul 5: 5 Einzelpunkte', m5Gewichtet(5), 15);
            pruefe('Modul 5: 6 Einzelpunkte', m5Gewichtet(6), 20);
            pruefe('Modul 5: 9 Einzelpunkte', m5Gewichtet(9), 20);
            pruefe('Spannentext 2 bis 3', m5SpannenText(3), '2 bis 3 Einzelpunkte');
            pruefe('Spannentext 6 und mehr', m5SpannenText(7), '6 und mehr Einzelpunkte');
            pruefe('Spannentext ein Punkt', m5SpannenText(1), '1 Einzelpunkt');

            const mO = JSON.parse(JSON.stringify(stateOrig));
            const mE = JSON.parse(JSON.stringify(stateEigene));
            const mZ = JSON.parse(JSON.stringify(stateZweit));
            const mEx = stateOrig.extracted;
            const mModus = appModus;
            try {
                const kid = nr => ITEMS.find(i => i.nr === nr).id;
                const leeren = () => ITEMS.forEach(i => {
                    const l = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                    stateOrig.values[i.id] = JSON.parse(JSON.stringify(l));
                    stateEigene.values[i.id] = JSON.parse(JSON.stringify(l));
                    stateZweit.values[i.id] = JSON.parse(JSON.stringify(l));
                });
                stateOrig.extracted = null;

                // Der gemeldete Fall: ein Punkt aus Gruppe A, zwei Besuche in Gruppe C.
                // 4.5.14 fällt weg -> Modul 5 von 3 auf 2, gewichtet bleibt 10,00.
                leeren();
                [['4.5.1', { count: 1, period: 'D' }], ['4.5.13', { count: 1, period: 'W' }],
                 ['4.5.14', { count: 1, period: 'W' }]].forEach(([nr, v]) => {
                    stateOrig.values[kid(nr)] = Object.assign({}, v);
                    stateZweit.values[kid(nr)] = Object.assign({}, v);
                    stateEigene.values[kid(nr)] = Object.assign({}, v);
                });
                stateEigene.values[kid('4.5.14')] = { count: 0, period: 'W' };

                pruefe('Gemeldeter Fall: Einzelpunkte sinken',
                    [calculateInternal('orig').raws[4], calculateInternal('own').raws[4]], [3, 2]);
                pruefe('Gemeldeter Fall: gewichtete Punkte bleiben gleich',
                    [calculateInternal('orig').weights[4], calculateInternal('own').weights[4]], [10, 10]);

                const satz = m5WirkungSatz('4.5.14', 'orig', 'own');
                pruefeWahr('Satz nennt die Gruppe', satz.includes('4.5.12–4.5.15')
                    && satz.includes('nicht einzeln, sondern als Gruppe'));
                pruefeWahr('Satz nennt die Einzelpunkte des Moduls', satz.includes('2 statt 3 Einzelpunkte'));
                pruefeWahr('Satz erklärt, warum sich nichts ändert',
                    satz.includes('bleiben bei 10,00') && satz.includes('2 bis 3 Einzelpunkte'));

                // Der Satz muss in ALLEN vier Vorgangsarten im Schriftstück stehen.
                const rein = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                const bauen = m => {
                    appModus = m;
                    if (m === 'anhoerung') return rein(buildAnhoerung('N', {}, ''));
                    if (m === 'widerspruch') return rein(baueDokument('N', {}, ''));
                    return rein(buildHoeherstufung('N', {}, ''));
                };
                // Die Gruppenwertung wird in ALLEN vier Vorgangsarten erklärt – aber
                // unterschiedlich: Widerspruch und Anhörung stellen gegenüber („bleiben
                // bei 10,00"), der Antrag nennt nur den erreichten Stand.
                ['widerspruch', 'anhoerung'].forEach(m => {
                    const t = bauen(m);
                    pruefeWahr(m + ': Modul-5-Wirkung steht im Schriftstück',
                        t.includes('nicht einzeln, sondern als Gruppe gewertet')
                        && t.includes('bleiben bei 10,00'));
                });
                ['hoeherstufung', 'erstantrag'].forEach(m => {
                    const t = bauen(m);
                    pruefeWahr(m + ': Modul 5 wird erklärt, ohne zu vergleichen',
                        t.includes('nicht einzeln, sondern gruppenweise gewertet')
                        && t.includes('Modul 5 kommt damit auf')
                        && !t.includes('bleiben bei 10,00'));
                    pruefe(m + ': der Modul-5-Satz steht nur einmal',
                        (t.match(/Modul 5 kommt damit auf/g) || []).length, 1);
                });

                // Kippt die Spanne, muss der Satz die Änderung nennen – nicht das Gegenteil.
                leeren();
                stateOrig.values[kid('4.5.13')] = { count: 1, period: 'W' };
                stateOrig.values[kid('4.5.14')] = { count: 1, period: 'W' };
                stateEigene.values[kid('4.5.13')] = { count: 1, period: 'W' };
                stateEigene.values[kid('4.5.14')] = { count: 0, period: 'W' };
                pruefe('Kippende Spanne: gewichtete Punkte ändern sich',
                    [calculateInternal('orig').weights[4], calculateInternal('own').weights[4]], [10, 5]);
                const satz2 = m5WirkungSatz('4.5.14', 'orig', 'own');
                pruefeWahr('Satz nennt die Änderung', satz2.includes('von 10,00 auf 5,00'));
                pruefeWahr('Satz behauptet nicht Gleichbleiben', !satz2.includes('bleiben bei'));

                // Kein Modul-5-Kriterium -> kein Satz
                pruefe('Kein Satz außerhalb von Modul 5', m5WirkungSatz('4.1.1', 'orig', 'own'), '');
            } finally {
                stateOrig.values = mO.values; stateEigene.values = mE.values;
                stateZweit.values = mZ.values; stateOrig.extracted = mEx; appModus = mModus;
            }

            // Derselbe Sachverhalt muss auch IN DER APP stehen – dort schaut der Berater
            // hin, nicht ins fertige Schriftstück.
            const rO = { raws: [0,0,0,0,3,0], weights: [0,0,0,0,10,0] };
            const rE = { raws: [0,0,0,0,2,0], weights: [0,0,0,0,10,0] };
            const hin = modulHinweisText(5, rO, rE);
            pruefeWahr('Ansicht erklärt gleichbleibende Punkte',
                hin.includes('3 → 2') && hin.includes('bleiben bei 10,00')
                && hin.includes('2 bis 3 Einzelpunkte') && hin.includes('richtig gerechnet'));
            pruefe('Kein Hinweis, wenn die Einzelpunkte gleich bleiben',
                modulHinweisText(5, rO, { raws: [0,0,0,0,3,0], weights: [0,0,0,0,10,0] }), '');
            pruefe('Kein Hinweis, wenn sich die gewichteten Punkte ändern',
                modulHinweisText(5, rO, { raws: [0,0,0,0,1,0], weights: [0,0,0,0,5,0] }), '');

            // Die KI darf für Modul 5 keinen Punktgewinn behaupten – sie kennt die
            // Gruppenwertung nicht von selbst.
            const bp = buildBegruendungPrompt.toString();
            pruefeWahr('KI-Anweisung warnt vor Punktangaben in Modul 5',
                bp.includes('ACHTUNG MODUL 5') && bp.includes('KEINEN Punktgewinn'));
        }

        // ---------- 9c. Nummerierung nach der Zählung des Gutachtens ----------
        // Medicproof nummeriert dieselben Module 5.1 bis 5.6. Im erzeugten Schriftstück
        // muss die Nummerierung DES GUTACHTENS stehen, sonst sucht der Leser bei „4.1.1"
        // eine Zeile, die in seinem Gutachten „5.1.1" heißt.
        if (typeof nummernImText === 'function') {
            const MD = 'Medizinischer Dienst Nord';
            const MP = 'Medicproof GmbH';

            pruefeWahr('Medicproof wird erkannt', istMedicproof(MP) && istMedicproof('medicproof gmbh'));
            pruefeWahr('Medizinischer Dienst bleibt 4.x',
                !istMedicproof(MD) && !istMedicproof('') && !istMedicproof('MD Bund'));

            pruefe('Kriteriumsnummer umgestellt', zeigeNr('4.1.1', MP), '5.1.1');
            pruefe('Kriteriumsnummer bleibt beim MD', zeigeNr('4.1.1', MD), '4.1.1');
            pruefe('Sonderkriterium umgestellt', zeigeNr('F 4.1.B', MP), 'F 5.1.B');
            pruefe('Modulnummer der Tabelle', modulNr(4, MP), '5.4');
            pruefe('Modulnummer beim MD', modulNr(4, MD), '4.4');

            pruefe('Fließtext: alle Nummern umgestellt',
                nummernImText('Bei 4.1.1 und 4.5.13 sowie 4.3.10 wurde falsch gewertet.', MP),
                'Bei 5.1.1 und 5.5.13 sowie 5.3.10 wurde falsch gewertet.');
            pruefe('Fließtext: beim MD unverändert',
                nummernImText('Bei 4.1.1 wurde falsch gewertet.', MD),
                'Bei 4.1.1 wurde falsch gewertet.');
            pruefe('Modulnummer nach Hinweiswort',
                nummernImText('Unter Ziffer 4.4 des Gutachtens.', MP),
                'Unter Ziffer 5.4 des Gutachtens.');

            // Das darf NICHT passieren: aus einer Dezimalzahl eine Modulnummer machen.
            pruefe('Dezimalzahl bleibt unangetastet',
                nummernImText('Es fehlen 4.5 Punkte bis zur Schwelle.', MP),
                'Es fehlen 4.5 Punkte bis zur Schwelle.');
            pruefe('Datum bleibt unangetastet',
                nummernImText('Die Begutachtung fand am 4.1.2026 statt.', MP),
                'Die Begutachtung fand am 4.1.2026 statt.');

            // Wörtliche BRi-Zitate bleiben unverändert: die Nummerierung 4.x.y ist die
            // der Richtlinie selbst. Sie zu ändern hieße, ein Zitat zu verfälschen.
            const AUF = '„', ZU = '“';   // „ und “
            pruefe('BRi-Zitat bleibt wörtlich',
                nummernImText('Zu 4.2.1 heißt es: ' + AUF + 'Die Kriterien 4.2.1 bis 4.2.8 beziehen sich auf die kognitiven Funktionen.' + ZU + ' Das trifft zu.', MP),
                'Zu 5.2.1 heißt es: ' + AUF + 'Die Kriterien 4.2.1 bis 4.2.8 beziehen sich auf die kognitiven Funktionen.' + ZU + ' Das trifft zu.');
            pruefe('Text nach dem Zitat wird wieder umgestellt',
                nummernImText(AUF + 'Zitat 4.1.1' + ZU + ' danach 4.1.2 Ende.', MP),
                AUF + 'Zitat 4.1.1' + ZU + ' danach 5.1.2 Ende.');

            pruefe('Leerer Text bleibt leer', nummernImText('', MP), '');
            pruefe('Nichts übergeben ergibt leeren Text', nummernImText(null, MP), '');

            // Und nun am erzeugten Schriftstück selbst – für ALLE vier Vorgangsarten.
            // Geprüft wird beides: dass bei Medicproof keine 4.x.y übrig bleibt UND dass
            // beim Medizinischen Dienst keine einzige 5.x.y auftaucht.
            const merkOrg = document.getElementById('stam-organisation').value;
            const merkModus = appModus;
            const merkO = JSON.parse(JSON.stringify(stateOrig));
            const merkE = JSON.parse(JSON.stringify(stateEigene));
            const merkZ = JSON.parse(JSON.stringify(stateZweit));
            try {
                const kid = nr => ITEMS.find(i => i.nr === nr).id;
                setzeBewertung('orig', kid('4.1.1'), 0, 'gutachten');
                setzeBewertung('own', kid('4.1.1'), 2, 'berater');
                setzeBewertung('zweit', kid('4.1.1'), 1, 'gutachten');
                const bg = { '4.1.1': 'Zu 4.1.1 fehlt jede Erhebung.' };
                const rein = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                const bauen = m => {
                    appModus = m;
                    if (m === 'anhoerung') return rein(buildAnhoerung('N', bg, 'Einleitung 4.1.1.'));
                    if (m === 'widerspruch') return rein(baueDokument('N', bg, 'Einleitung 4.1.1.'));
                    return rein(buildHoeherstufung('N', bg, 'Einleitung 4.1.1.'));
                };
                ['widerspruch', 'hoeherstufung', 'erstantrag', 'anhoerung'].forEach(m => {
                    document.getElementById('stam-organisation').value = MP;
                    const mp = bauen(m);
                    document.getElementById('stam-organisation').value = MD;
                    const md = bauen(m);
                    const mpVier = (mp.match(/\b4\.[1-6]\.\d+/g) || []).length;
                    const mpFuenf = (mp.match(/\b5\.[1-6]\.\d+/g) || []).length;
                    const mdVier = (md.match(/\b4\.[1-6]\.\d+/g) || []).length;
                    const mdFuenf = (md.match(/\b5\.[1-6]\.\d+/g) || []).length;
                    pruefe(m + ': bei Medicproof keine 4.x.y mehr', mpVier, 0);
                    pruefe(m + ': beim Med. Dienst keine 5.x.y', mdFuenf, 0);
                    // Gleiche Anzahl heißt: umgestellt, nicht verloren und nicht erfunden.
                    pruefe(m + ': Anzahl der Nummern unverändert', mpFuenf, mdVier);
                    pruefeWahr(m + ': es gibt überhaupt Nummern', mdVier > 0);
                });
            } finally {
                document.getElementById('stam-organisation').value = merkOrg;
                appModus = merkModus;
                stateOrig.values = merkO.values; stateEigene.values = merkE.values;
                stateZweit.values = merkZ.values;
            }
        }

        // ---------- 9a. Namensprüfung gegen den Dokumenttext ----------
        // Anlass: Aus „Erika Mahl" wurde beim Einlesen „Erika Mahi".
        if (typeof pruefeName === 'function') {
            const dokument = 'Medizinischer Dienst\nFrau Erika Mahl\nMusterweg 3\n12345 Musterstadt\n\n'
                + 'Betreffend: Frau Erika Mahl, geboren am 01.01.1950\n'
                + 'Frau Mahl wurde im Hausbesuch begutachtet.';

            pruefe('Namensschlüssel: l und i sind gleichwertig',
                namensSchluessel('Mahl'), namensSchluessel('Mahi'));
            pruefe('Namensschlüssel: rn und m sind gleichwertig',
                namensSchluessel('Sturn'), namensSchluessel('Stum'));
            pruefeWahr('Namensschlüssel unterscheidet echte Namen',
                namensSchluessel('Meier') !== namensSchluessel('Schulz'));

            const falsch = pruefeName('Frau Erika Mahi', dokument);
            pruefe('Falsch gelesener Name wird beanstandet', falsch.length, 1);
            pruefe('Beanstandet wird der Nachname', falsch[0] && falsch[0].wort, 'Mahi');
            pruefe('Die richtige Schreibweise wird angeboten',
                falsch[0] && falsch[0].alternativen, ['Mahl']);

            pruefe('Richtig gelesener Name wird nicht beanstandet',
                pruefeName('Frau Erika Mahl', dokument).length, 0);
            pruefe('Ohne Dokumenttext keine Beanstandung',
                pruefeName('Frau Erika Mahi', '').length, 0);
            pruefe('Anrede wird nicht geprüft',
                pruefeName('Frau Erika Mahl', dokument).filter(x => /Frau/.test(x.wort)).length, 0);
            // Ein Name, den es im Dokument gar nicht gibt, ergibt keine erfundene Alternative
            pruefe('Fremder Name ergibt keine Alternative',
                pruefeName('Herr Kurt Probemann', dokument).length, 0);

            // Ersetzen eines Namensbestandteils
            const merkReviewN = reviewData;
            reviewData = { stam: { betreffend: 'Frau Erika Mahi' }, text: dokument };
            uebernehmeNamensteil('Mahi', 'Mahl');
            pruefe('Übernehmen ersetzt nur den falschen Teil',
                reviewData.stam.betreffend, 'Frau Erika Mahl');
            pruefe('Danach ist nichts mehr zu beanstanden',
                pruefeName(reviewData.stam.betreffend, dokument).length, 0);
            reviewData = merkReviewN;

            // Der Dokumenttext muss bis in die Prüfstruktur gelangen
            const norm = normalizeImport({ _text: dokument, stam_betreffend: 'Frau Erika Mahi',
                                           diagnoses: [], values_orig: [] });
            pruefe('Dokumenttext steht in der Prüfstruktur zur Verfügung', norm.text, dokument);
            pruefe('Prüfung greift auf die Prüfstruktur zu',
                pruefeName(norm.stam.betreffend, norm.text).length, 1);
            pruefeWahr('Anweisung an die KI nennt die Verwechslungsgefahr',
                aiReadGutachten.toString().includes('BUCHSTABENGENAUIGKEIT'));
        }

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
            // Nicht am Wortlaut der Zeile prüfen, sondern an der Wirkung – sonst
            // scheitert die Prüfung an jeder Erweiterung des Zustands (zuletzt an der
            // hinzugekommenen Kontinenzangabe).
            const merkO2 = stateOrig, merkE2 = stateEigene, merkZ2 = stateZweit;
            try {
                stateZweit.values[k('4.4.1').id] = 3;
                applyImportedData(normalizeImport({ values_orig: [], _localValues: true }));
                pruefeWahr('Neues Erstgutachten leert das Anhörungsgutachten',
                    Object.keys(stateZweit.values || {}).length === 0);
            } finally { stateOrig = merkO2; stateEigene = merkE2; stateZweit = merkZ2; }

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
            pruefe('Anhörung: Reiter werden neu nummeriert',
                document.getElementById('btn-tab-3').innerText, '3. EINSCHÄTZUNG & VERGLEICH');
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
            pruefeWahr('Anhörung erzeugt ihre eigene Vorlage',
                (baueDokument('', {}, '') || '').includes('Zweitgutachten'));
            setzeModus('hoeherstufung');
            pruefeWahr('Höherstufung erzeugt weiterhin ihr Dokument', !!baueDokument('', {}, ''));
            setzeModus('widerspruch');
            pruefeWahr('Widerspruch erzeugt weiterhin sein Dokument', !!baueDokument('', {}, ''));

            // Die Felder gehören in die Falldatei
            // Tatsächlich in den Falldaten nachsehen, nicht im Quelltext
            pruefeWahr('Anhörungsfelder werden mitgespeichert',
                typeof fallDaten === 'function' && Object.keys(fallDaten().stammdaten).some(k => k.indexOf('anh-') === 0));

            stateZweit = merkZweitA;
            Object.keys(merkFelderA).forEach(id => {
                const el = document.getElementById(id); if (el) el.value = merkFelderA[id];
            });
            setzeModus(merkModusA);
            protokollLeeren();
            leeren();
        }

        // ---------- 9b3. Dreiervergleich und Schwellenwertrechnung ----------
        if (typeof vergleichsLagen === 'function') {
            const k = nr => ITEMS.find(i => i.nr === nr);
            const merkModusV = appModus, merkZweitV = JSON.parse(JSON.stringify(stateZweit));

            // Was-wäre-wenn: calculateInternal muss auch einen übergebenen Stand rechnen
            leeren();
            const probe = { special: 0, values: {} };
            ITEMS.forEach(i => { probe.values[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
            [k('4.4.1'), k('4.4.2'), k('4.4.3')].forEach(i => { probe.values[i.id] = 3; });
            pruefe('Rechnung aus einem übergebenen Stand', calculateInternal(probe).weights[3], 20);
            // Modul 4 mit 9 Einzelpunkten ergibt 20 gewichtete Punkte, also Pflegegrad 1 –
            // eine mitgegebene Zusammenfassung (hier Pflegegrad 5) darf das nicht überstimmen.
            probe.extracted = { raws: [0,0,0,0,0,0], weights: [0,0,0,0,0,0], total: 99, pg: 5 };
            pruefe('Übergebener Stand ignoriert die Zusammenfassung', calculateInternal(probe).pg, 1);

            // Vergleichbarer Zahlenwert
            pruefe('Stufenwert: gewöhnliches Kriterium', stufenwert(k('4.4.1'), 2), 2);
            pruefe('Stufenwert: Modul 5 rechnet auf den Tag um',
                Math.round(stufenwert(k('4.5.1'), { count: 7, period: 'W' }) * 100) / 100, 1);

            // Die vier Lagen
            leeren();
            stateZweit = { special: 0, values: {} };
            ITEMS.forEach(i => { if (i.m && i.opts) stateZweit.values[i.id] = 0; });
            // gefolgt: Erst 0, ich 2, Zweit 2
            stateOrig.values[k('4.4.1').id] = 0; stateEigene.values[k('4.4.1').id] = 2; stateZweit.values[k('4.4.1').id] = 2;
            // teilweise: Erst 0, ich 3, Zweit 1
            stateOrig.values[k('4.4.2').id] = 0; stateEigene.values[k('4.4.2').id] = 3; stateZweit.values[k('4.4.2').id] = 1;
            // nicht gefolgt: Erst 1, ich 3, Zweit 1
            stateOrig.values[k('4.4.3').id] = 1; stateEigene.values[k('4.4.3').id] = 3; stateZweit.values[k('4.4.3').id] = 1;
            // verschlechtert: Erst 2, ich 3, Zweit 1
            stateOrig.values[k('4.4.4').id] = 2; stateEigene.values[k('4.4.4').id] = 3; stateZweit.values[k('4.4.4').id] = 1;
            // ohne Abweichung im Widerspruch -> taucht gar nicht auf
            stateOrig.values[k('4.4.5').id] = 1; stateEigene.values[k('4.4.5').id] = 1; stateZweit.values[k('4.4.5').id] = 3;

            const lagen = vergleichsLagen();
            const lageVon = nr => (lagen.find(l => l.nr === nr) || {}).lage;
            pruefe('Lage: gefolgt', lageVon('4.4.1'), 'gefolgt');
            pruefe('Lage: teilweise gefolgt', lageVon('4.4.2'), 'teilweise');
            pruefe('Lage: nicht gefolgt', lageVon('4.4.3'), 'nicht');
            pruefe('Lage: verschlechtert', lageVon('4.4.4'), 'verschlechtert');
            pruefeWahr('Ohne eigene Abweichung keine Lage', lageVon('4.4.5') === undefined);
            pruefe('Strittig sind drei Kriterien', strittigeLagen(lagen).length, 3);
            pruefeWahr('Klartext der Bewertungen wird mitgeliefert',
                lagen.every(l => l.eText && l.zText && l.bText));

            // Schwellenwertrechnung an einem eigens gerechneten Fall.
            // Nur Modul 4 ist belegt: 8 Einzelpunkte ergeben 20 gewichtete Punkte
            // (Stufen: ab 3 -> 10, ab 8 -> 20, ab 19 -> 30). Gesamt 20 Punkte = Pflegegrad 1,
            // nächste Schwelle 27, es fehlen also 7 Punkte.
            const a = schwellenAnalyse();
            pruefe('Anhörungsgutachten: Modul 4 aus den Kriterien', a.basis.raws[3], 8);
            pruefe('Anhörungsgutachten: Pflegegrad', a.basis.pg, 1);
            pruefe('Mit allen strittigen Punkten steigt Modul 4', a.gesamt.raws[3], 14);
            pruefe('Nächste Schwelle', a.naechsteSchwelle, 27);
            pruefe('Fehlende Punkte werden genannt', a.fehlendePunkte, 7);
            pruefeWahr('Jede strittige Zeile hat eine Was-wäre-wenn-Rechnung',
                a.strittig.every(l => typeof l.punkteMit === 'number' && typeof l.kipptAllein === 'boolean'));
            // 4.4.3 allein: Modul 4 von 8 auf 10 – immer noch 20 gewichtete Punkte, kippt nicht
            pruefe('Ein einzelnes Kriterium kippt hier nicht',
                a.strittig.find(l => l.nr === '4.4.3').kipptAllein, false);

            // Zweiter, eigens gerechneter Fall: Anhörungsgutachten knapp unter der Schwelle.
            // Modul 4 hat dort 7 Einzelpunkte -> 10 gewichtete -> kein Pflegegrad (Schwelle 12,5).
            // Ein einziges Kriterium von „überw. selbst." auf „unselbständig" ergibt 9 Einzelpunkte
            // -> 20 gewichtete -> Pflegegrad 1. Genau das muss die App finden.
            leeren();
            stateZweit = { special: 0, values: {} };
            ITEMS.forEach(i => {
                if (i.m === 5 && i.group !== 'D') {
                    stateOrig.values[i.id] = { count: 0, period: 'W' };
                    stateEigene.values[i.id] = { count: 0, period: 'W' };
                    stateZweit.values[i.id] = { count: 0, period: 'W' };
                } else if (i.m) {
                    stateZweit.values[i.id] = 0;
                }
            });
            stateOrig.values[k('4.4.1').id] = 0; stateEigene.values[k('4.4.1').id] = 3; stateZweit.values[k('4.4.1').id] = 3;
            stateOrig.values[k('4.4.2').id] = 0; stateEigene.values[k('4.4.2').id] = 3; stateZweit.values[k('4.4.2').id] = 3;
            stateOrig.values[k('4.4.3').id] = 0; stateEigene.values[k('4.4.3').id] = 3; stateZweit.values[k('4.4.3').id] = 1;
            const a2 = schwellenAnalyse();
            pruefe('Knapper Fall: Anhörungsgutachten ohne Pflegegrad', a2.basis.pg, 0);
            pruefe('Knapper Fall: ein strittiges Kriterium', a2.strittig.length, 1);
            pruefe('Knapper Fall: zwei Punkte wurden übernommen', a2.gefolgt.length, 2);
            pruefeWahr('Kippendes Kriterium wird erkannt',
                a2.kipper.length === 1 && a2.kipper[0].nr === '4.4.3');
            pruefe('Kippen bedeutet einen höheren Pflegegrad', a2.kipper[0].pgMit, 1);

            // Erwiderungsmuster
            const muster = erwiderungsMuster(a2.strittig[0], a2);
            pruefeWahr('Muster C wird immer vorgeschlagen', muster.includes('C'));
            pruefeWahr('Knappe Schwelle schlägt Muster E vor', muster.includes('E'));
            pruefe('Sechs Muster sind hinterlegt', Object.keys(MUSTER_TEXTE).length, 6);

            // Der Reiter
            setzeModus('anhoerung');
            pruefeWahr('Vergleichsreiter nur im Anhörungsverfahren sichtbar',
                document.getElementById('btn-tab-vergleich').style.display !== 'none');
            pruefe('Reiter werden neu nummeriert',
                document.getElementById('btn-tab-3').innerText, '3. EINSCHÄTZUNG & VERGLEICH');
            renderVergleich();
            const inhalt = document.getElementById('tab-vergleich').innerText;
            pruefeWahr('Übersicht nennt die drei Stände',
                inhalt.includes('Erstgutachten') && inhalt.includes('Anhörungsgutachten')
                && inhalt.includes('Meine Beurteilung'));
            pruefeWahr('Übersicht nennt die fehlenden Punkte', inhalt.includes('fehlen'));
            pruefeWahr('Übersicht trennt übernommen und strittig',
                inhalt.includes('Übernommen') && inhalt.includes('Strittig geblieben'));
            setzeModus('widerspruch');
            pruefeWahr('Vergleichsreiter sonst verborgen',
                document.getElementById('btn-tab-vergleich').style.display === 'none');

            // Ohne Zweitgutachten eine Erklärung statt einer leeren Seite
            stateZweit = { special: 0, values: {} };
            setzeModus('anhoerung');
            renderVergleich();
            pruefeWahr('Ohne Anhörungsgutachten erscheint eine Erläuterung',
                document.getElementById('tab-vergleich').innerText.includes('noch kein Anhörungsgutachten'));

            stateZweit = merkZweitV;
            setzeModus(merkModusV);
            leeren();
        }

        // ---------- 9b4. Vorlage des Anhörungsverfahrens ----------
        if (typeof buildAnhoerung === 'function') {
            const k = nr => ITEMS.find(i => i.nr === nr);
            const merkModusB = appModus, merkZweitB = JSON.parse(JSON.stringify(stateZweit));
            const merkFelderB = {};
            document.querySelectorAll('[id^="stam-"], [id^="anh-"]').forEach(el => merkFelderB[el.id] = el.value);

            leeren();
            stateZweit = { special: 0, values: {} };
            ITEMS.forEach(i => {
                if (i.m === 5 && i.group !== 'D') {
                    stateOrig.values[i.id] = { count: 0, period: 'W' };
                    stateEigene.values[i.id] = { count: 0, period: 'W' };
                    stateZweit.values[i.id] = { count: 0, period: 'W' };
                } else if (i.m) { stateZweit.values[i.id] = 0; }
            });
            // gefolgt / teilweise / nicht gefolgt
            stateOrig.values[k('4.4.1').id] = 0; stateEigene.values[k('4.4.1').id] = 3; stateZweit.values[k('4.4.1').id] = 3;
            stateOrig.values[k('4.4.2').id] = 0; stateEigene.values[k('4.4.2').id] = 3; stateZweit.values[k('4.4.2').id] = 1;
            stateOrig.values[k('4.4.3').id] = 0; stateEigene.values[k('4.4.3').id] = 2; stateZweit.values[k('4.4.3').id] = 0;
            setzeModus('anhoerung');
            renderAnhoerungBereich();
            document.getElementById('stam-betreffend').value = 'Herr Max Mustermann';
            document.getElementById('stam-kasse').value = 'Debeka';
            document.getElementById('stam-bescheid').value = '2026-02-04';
            document.getElementById('stam-organisation').value = 'Medicproof GmbH';
            document.getElementById('stam-begutachtung').value = '2026-01-29';
            document.getElementById('anh-schreiben-datum').value = '2026-04-21';
            document.getElementById('anh-gutachten-datum').value = '2026-04-08';
            document.getElementById('anh-art').value = DURCHFUEHRUNGSARTEN[1];
            /* Handeingabe PASSEND zu den Kriterien des Zweitgutachtens. Vorher stand hier „1" und
               „25,00", obwohl die Kriterien etwas anderes ergaben – genau dieser Widerspruch landete
               im Schriftstück. Er wird jetzt in Abschnitt 26 eigens geprüft. */
            const rZb = calculateInternal('zweit');
            document.getElementById('anh-pg').value = String(rZb.pg);
            document.getElementById('anh-pts').value = punkteDE(rZb.total);

            const dok = buildAnhoerung('', {}, '');
            const el = document.createElement('div'); el.innerHTML = dok;
            const text = el.innerText.replace(/\s+/g, ' ');

            pruefeWahr('Anhörung: Vorlage wird erzeugt', !!dok && dok.length > 500);
            pruefeWahr('Anhörung: Einleitung mit „aufrecht"',
                text.includes('erhält den Widerspruch gegen den Bescheid vom 04.02.2026 der Debeka aufrecht'));
            pruefeWahr('Anhörung: Einleitung nennt beide Gutachten',
                text.includes('die Gutachten der Medicproof GmbH vom 29.01.2026 und vom 08.04.2026'));
            pruefeWahr('Anhörung: Kopf nennt das Datum des Anhörungsschreibens',
                text.includes('Datum Anhörungsschreiben: 21.04.2026'));
            pruefeWahr('Anhörung: Kopf nennt das Zweitgutachten',
                text.includes('Datum Zweitgutachten: 08.04.2026'));
            pruefeWahr('Anhörung: Kopf nennt den Pflegegrad des Zweitgutachtens',
                text.includes('Pflegegrad: ' + pflegegradWort(rZb.pg)));
            // Drei Spalten
            const kopfzellen = Array.from(el.querySelectorAll('table.cmp thead th')).map(t => t.innerText.trim());
            pruefe('Anhörung: drei Spalten in der Gegenüberstellung',
                kopfzellen.slice(0, 4), ['Modul', 'Vorgutachten', 'Zweitgutachten', 'Beurteilung']);
            pruefe('Anhörung: jede Modulzeile hat vier Zellen',
                el.querySelectorAll('#stmt-cmp-body tr')[0].children.length, 4);
            // Nur strittige Kriterien
            const crits = Array.from(el.querySelectorAll('.crit[data-nr]')).map(c => c.getAttribute('data-nr'));
            pruefe('Anhörung: nur strittige Kriterien', crits.sort(), ['4.4.2', '4.4.3']);
            pruefeWahr('Anhörung: gefolgtes Kriterium fehlt zu Recht', crits.indexOf('4.4.1') === -1);
            // Die drei Stände stehen in der GEGENÜBERSTELLUNG, nicht im Kriterienblock.
            // Dort steht nach der Vorlage des Verfassers nur die gutachterliche Bewertung.
            // Dieser Fall läuft mit Medicproof – die Überschrift trägt dort 5.4.2.
            pruefeWahr('Anhörung: Kriterienblock nur mit gutachterlicher Bewertung',
                /[45]\.4\.2:[^]{0,80}Gutachterliche Bewertung:/.test(text)
                && !text.includes('Meine Beurteilung:'));
            pruefeWahr('Anhörung: Fazit nennt beide Gutachten',
                text.includes('Die vorliegenden Gutachten der Medicproof GmbH vom 29.01.2026'));
            pruefeWahr('Anhörung: kein „Pflegegrad 0" im Dokument', !/Pflegegrad 0/.test(text));
            pruefeWahr('Anhörung: richtiger Fall nach „führte zu"',
                !/führte zu kein Pflegegrad/.test(text));

            // Der Zusammenführungs-Schlüssel muss zur Vorlage passen
            const l = schwellenAnalyse().strittig.find(x => x.nr === '4.4.2');
            pruefe('Anhörung: Schlüssel der Begründung',
                el.querySelector('.crit[data-nr="4.4.2"]').getAttribute('data-vals'), lagenSchluessel(l));

            // Übergebene Begründungen werden eingesetzt
            const mitText = buildAnhoerung('', { '4.4.2': 'Eine geprüfte Begründung.' }, '');
            pruefeWahr('Anhörung: übergebene Begründung erscheint',
                mitText.includes('Eine geprüfte Begründung.'));

            // Kippendes Kriterium wird im Dokument benannt
            const a = schwellenAnalyse();
            if (a.kipper.length) {
                pruefeWahr('Anhörung: kippendes Kriterium wird benannt',
                    text.includes('Bereits die richtlinienkonforme Wertung dieses einen Kriteriums'));
            } else {
                pruefeWahr('Anhörung: ohne Kipper kein Kipper-Satz',
                    !text.includes('Bereits die richtlinienkonforme Wertung dieses einen Kriteriums'));
            }

            // Baueweiche und Längengrenzen
            pruefeWahr('Anhörung: baueDokument nutzt die eigene Vorlage',
                baueDokument('', {}, '') === buildAnhoerung('', {}, ''));
            pruefe('Anhörung: acht Sätze erlaubt', satzGrenze(), 8);
            setzeModus('widerspruch');
            pruefe('Widerspruch: weiterhin fünf Sätze', satzGrenze(), 5);
            pruefeWahr('Widerspruch nutzt weiterhin seine Vorlage',
                baueDokument('', {}, '') === buildStellungnahme('', {}, ''));

            // Eigene Stilvorlage je Vorgangsart
            const merkStil = { w: null, a: null };
            try { merkStil.w = localStorage.getItem(STIL_STORAGE); merkStil.a = localStorage.getItem(STIL_STORAGE + '_anhoerung'); } catch (e) {}
            pruefe('Stilvorlage: Widerspruch', stilSchluessel(), STIL_STORAGE);
            setzeModus('anhoerung');
            pruefe('Stilvorlage: Anhörung getrennt', stilSchluessel(), STIL_STORAGE + '_anhoerung');
            try {
                localStorage.setItem(STIL_STORAGE, 'WIDERSPRUCH-BEISPIEL');
                localStorage.setItem(STIL_STORAGE + '_anhoerung', 'ANHOERUNG-BEISPIEL');
                const feld = document.getElementById('stil-beispiele');
                const merkFeld = feld ? feld.value : null;
                if (feld) feld.value = '';
                pruefe('Stilvorlage: Anhörung nutzt ihre eigene', getStilBeispiele(), 'ANHOERUNG-BEISPIEL');
                setzeModus('widerspruch');
                pruefe('Stilvorlage: Widerspruch bleibt unberührt', getStilBeispiele(), 'WIDERSPRUCH-BEISPIEL');
                if (feld && merkFeld !== null) feld.value = merkFeld;
            } finally {
                try {
                    if (merkStil.w === null) localStorage.removeItem(STIL_STORAGE); else localStorage.setItem(STIL_STORAGE, merkStil.w);
                    if (merkStil.a === null) localStorage.removeItem(STIL_STORAGE + '_anhoerung'); else localStorage.setItem(STIL_STORAGE + '_anhoerung', merkStil.a);
                } catch (e) {}
            }

            // ---------- Anlagen ----------
            setzeModus('anhoerung');
            const merkAnlagen = JSON.parse(JSON.stringify(anlagen));
            anlagen = [];
            renderAnlagen();
            pruefe('Anlagen: Liste beginnt leer', anlagen.length, 0);
            pruefeWahr('Anlagen: Hinweis auf leere Liste',
                document.getElementById('anlagen-liste').innerText.includes('Noch keine Anlagen'));

            anlagen.push({ bezeichnung: 'Verordnung Physiotherapie', art: 'Verordnung',
                           datum: '2026-03-12', kriterium: '4.4.2',
                           bemerkung: 'belegt den dauerhaften Bedarf', dateiname: 'VO_Physio.pdf' });
            anlagen.push({ bezeichnung: 'Bericht Orthopädie', art: 'Arztbericht',
                           datum: '', kriterium: '', bemerkung: '', dateiname: 'Ortho.pdf' });
            renderAnlagen();
            pruefe('Anlagen: beide Zeilen erscheinen',
                document.querySelectorAll('#anlagen-liste .befund-zeile').length, 2);
            pruefeWahr('Anlagen: fehlende Zuordnung wird gemeldet',
                document.getElementById('anlagen-hinweis').innerText.includes('1 ohne Zuordnung'));

            pruefe('Anlagen: Bezeichnung im Schriftstück', anlageText(anlagen[0], 0),
                'Anlage 1: Verordnung – Verordnung Physiotherapie vom 12.03.2026');
            pruefe('Anlagen: ohne Datum ohne Datumszusatz', anlageText(anlagen[1], 1),
                'Anlage 2: Arztbericht – Bericht Orthopädie');
            pruefe('Anlagen: Zuordnung greift', anlagenZuKriterium('4.4.2').length, 1);
            pruefe('Anlagen: nicht zugeordnete zählen nicht mit', anlagenZuKriterium('4.4.3').length, 0);
            pruefeWahr('Anlagen: Verweis nennt die Bemerkung',
                anlagenVerweisHtml('4.4.2').includes('belegt den dauerhaften Bedarf'));
            pruefe('Anlagen: kein Verweis ohne Zuordnung', anlagenVerweisHtml('4.6.1'), '');

            // Im Dokument
            const dokA = buildAnhoerung('', {}, '');
            const elA = document.createElement('div'); elA.innerHTML = dokA;
            const textA = elA.innerText.replace(/\s+/g, ' ');
            pruefeWahr('Anlagen: Verzeichnis erscheint im Dokument', !!elA.querySelector('#stmt-anlagen'));
            pruefeWahr('Anlagen: Verzeichnis nennt beide',
                textA.includes('Anlage 1: Verordnung') && textA.includes('Anlage 2: Arztbericht'));
            pruefeWahr('Anlagen: Verzeichnis nennt das Kriterium',
                textA.includes('zu Kriterium 4.4.2'));
            pruefeWahr('Anlagen: Verweis steht bei der Begründung',
                (elA.querySelector('.crit[data-nr="4.4.2"]')?.innerText || '').includes('Beigefügt: Anlage 1'));
            pruefeWahr('Anlagen: KI erhält die Zuordnung',
                anlagenFuerPrompt('4.4.2').includes('Anlage 1'));
            pruefe('Anlagen: KI erhält nichts ohne Zuordnung', anlagenFuerPrompt('4.6.1'), '');

            // Entfernen und Numerierung
            anlageEntfernen(0);
            pruefe('Anlagen: entfernen wirkt', anlagen.length, 1);
            pruefe('Anlagen: Nummern rücken nach', anlageText(anlagen[0], 0),
                'Anlage 1: Arztbericht – Bericht Orthopädie');

            // Ohne Anlagen kein Verzeichnis
            anlagen = [];
            pruefe('Ohne Anlagen kein Verzeichnis', anlagenVerzeichnisHtml(), '');
            pruefeWahr('Ohne Anlagen kein Abschnitt im Dokument',
                !buildAnhoerung('', {}, '').includes('stmt-anlagen'));

            // Speichern und Laden
            anlagen = [{ bezeichnung: 'Probe', art: 'Verordnung', datum: '', kriterium: '4.4.2',
                         bemerkung: '', dateiname: 'p.pdf' }];
            const gesichertA = JSON.parse(JSON.stringify(anlagenSichern()));
            anlagen = [];
            anlagenLaden(gesichertA);
            pruefe('Anlagen: übersteht Sichern und Laden', anlagen.length, 1);
            pruefe('Anlagen: Zuordnung bleibt erhalten', anlagen[0].kriterium, '4.4.2');
            anlagenLaden(undefined);
            pruefe('Ältere Falldatei ohne Anlagen', anlagen.length, 0);

            anlagen = merkAnlagen;
            renderAnlagen();

            stateZweit = merkZweitB;
            Object.keys(merkFelderB).forEach(id => { const e2 = document.getElementById(id); if (e2) e2.value = merkFelderB[id]; });
            setzeModus(merkModusB);
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
            // Der Antrag nennt die heutige Häufigkeit; dass das Vorgutachten hier nichts sah,
            // erfährt die KI als „ohne Einschränkung" – nie als „0x".
            pruefeWahr('Antragsvorlage nennt die heutige Häufigkeit',
                antrag.includes('Medikation „3x pro Tag“'));
            pruefeWahr('KI erfährt: im Vorgutachten ohne Einschränkung',
                buildAntragPrompt(antragBereiche(), false).includes('Medikation: heute „3x pro Tag"; im Vorgutachten ohne Einschränkung'));
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
                laengenVerstoesse({}, 'Wort '.repeat(150)).length, 0);
            pruefeWahr('Frühere Länge von 300 Wörtern gilt nicht mehr',
                laengenVerstoesse({}, 'Wort '.repeat(300)).length > 0);
            // Die Grenze entspricht einer HALBEN A4-Seite (rund 3.600 Zeichen je voller Seite)
            pruefeWahr('Grenze passt zu einer halben A4-Seite',
                LAENGE.allgemeinZeichenMax >= 1600 && LAENGE.allgemeinZeichenMax <= 2000);
            pruefe('Wortgrenze der Einleitung', LAENGE.allgemeinWoerterMax, 260);

            // Die Vorgaben stehen tatsächlich in den Anweisungen an die KI
            pruefeWahr('Vorgabe nennt die Satzgrenze',
                laengenVorgabeBegruendung().includes(String(LAENGE.begruendungSaetzeMax) + ' Sätzen'));
            pruefeWahr('Vorgabe nennt die Wortgrenze der Einleitung',
                laengenVorgabeAllgemein('Anamnese').includes(String(LAENGE.allgemeinWoerterMax)));
            pruefeWahr('Vorgabe nennt den richtigen Abschnittstitel',
                laengenVorgabeAllgemein('Anamnese').includes('Anamnese'));

            // Zweck der Einleitung je Vorgangsart
            const aufgabeW = allgemeinAufgabe('widerspruch');
            const aufgabeE = allgemeinAufgabe('erstantrag');
            const aufgabeH = allgemeinAufgabe('hoeherstufung');
            pruefeWahr('Widerspruch: Lücken und Widersprüche aufzeigen',
                aufgabeW.includes('AUFZEIGEN VON LÜCKEN UND WIDERSPRÜCHEN'));
            pruefeWahr('Erstantrag: aktuelle Pflegesituation darstellen',
                aufgabeE.includes('DARSTELLUNG DER AKTUELLEN PFLEGESITUATION'));
            pruefeWahr('Höherstufung: aktuelle Pflegesituation darstellen',
                aufgabeH.includes('DARSTELLUNG DER AKTUELLEN PFLEGESITUATION'));
            pruefeWahr('Höherstufung fragt zusätzlich nach der Verschlechterung',
                aufgabeH.includes('verschlechtert hat'));
            pruefeWahr('Erstantrag fragt nicht nach einer Verschlechterung',
                !aufgabeE.includes('verschlechtert hat'));
            pruefe('Widerspruch überschreibt „Allgemeine Angaben"',
                aufgabeW.includes('„Allgemeine Angaben"'), true);
            pruefe('Antrag überschreibt „Anamnese"', aufgabeE.includes('„Anamnese"'), true);
            // Die Begründung gehört NICHT in die Einleitung
            [['Widerspruch', aufgabeW], ['Erstantrag', aufgabeE], ['Höherstufung', aufgabeH]].forEach(([n, a]) => {
                pruefeWahr(n + ': Begründung ist in der Einleitung untersagt',
                    a.includes('STRENG VERBOTEN'));
                pruefeWahr(n + ': Richtlinienbezug ist untersagt',
                    a.includes('Begutachtungs-Richtlinien'));
                pruefeWahr(n + ': zwei bis drei Absätze', a.includes('2 bis 3'));
            });
            pruefeWahr('Einleitung baut weiterhin auf den Notizen auf',
                aufgabeW.includes('MEINEN NOTIZEN'));

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
            // BRi Fußnote 13: auf die 4. Nachkommastelle, nicht auf die zweite
            pruefe('Einmal im Quartal ergibt 0,3333 pro Monat',
                zq['4.5.13'] && zq['4.5.13'].count + zq['4.5.13'].period, '0.3333M');
            erfassung.arztbesuche = [
                { fach: 'Augenarzt', anzahl: '2', zeitraum: 'im Jahr', begleitung: 'in Begleitung', dauer3h: 'nein' }
            ];
            zq = modul5AusErfassung();
            pruefe('Zweimal im Jahr ergibt 0,1667 pro Monat',
                zq['4.5.13'] && zq['4.5.13'].count + zq['4.5.13'].period, '0.1667M');
            // Zusammen mit häufigeren Terminen wird korrekt aufsummiert
            erfassung.arztbesuche = [
                { fach: 'Hausarzt', anzahl: '1', zeitraum: 'pro Monat', begleitung: 'in Begleitung', dauer3h: 'nein' },
                { fach: 'Kardiologe', anzahl: '1', zeitraum: 'im Quartal', begleitung: 'in Begleitung', dauer3h: 'nein' }
            ];
            zq = modul5AusErfassung();
            pruefe('Monatlich und quartalsweise werden addiert',
                zq['4.5.13'] && zq['4.5.13'].count + zq['4.5.13'].period, '1.3333M');
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

            // ---------- 13b. Medikation: eine Zeile je Applikationsort (BRi F 4.5.1) ----------
            const medSp = ERFASSUNG_TABELLEN.find(t => t.id === 'medikation').spalten.map(s => s.k);
            pruefe('Medikation: Spalten je Applikationsort', medSp,
                ['applikation', 'praeparate', 'anzahl', 'zeitraum', 'unterstuetzung']);
            pruefeWahr('Medikation: kein Feld mehr für einzelne Medikamente', medSp.indexOf('bezeichnung') === -1);
            pruefeWahr('Augen und Ohren sind getrennte Applikationsorte',
                APPLIKATION.indexOf('Augentropfen') > -1 && APPLIKATION.indexOf('Ohrentropfen') > -1
                && !APPLIKATION.some(a => /Augen- oder Ohren/.test(a)));
            pruefe('Fünf Abstufungen der Unterstützung', MEDIKATION_HILFE,
                ['selbständig', 'Erinnerung', 'Bereitstellen', 'Stellen', 'Gabe durch Pflegeperson']);

            // Die Zahl der Präparate darf die Bewertung NICHT verändern
            erfassung.arztbesuche = []; erfassung.hilfsmittel = []; erfassung.behandlungspflege = [];
            erfassung.medikation = [{ applikation: 'oral (Tabletten, Tropfen, Säfte)', praeparate: '1',
                anzahl: '3', zeitraum: 'pro Tag', unterstuetzung: 'Gabe durch Pflegeperson' }];
            // Kurzform, die auch dann noch etwas liefert, wenn gar nichts gezählt wurde -
            // sonst reisst eine kaputte Funktion den ganzen Testlauf ab.
            const med5 = () => { const x = modul5AusErfassung()['4.5.1']; return x ? x.count + x.period : 'fehlt'; };
            const einPraeparat = med5();
            erfassung.medikation[0].praeparate = '9';
            pruefe('Zahl der Präparate verändert die Bewertung nicht', med5(), einPraeparat);
            pruefe('Gezählt wird die Applikationshäufigkeit', einPraeparat, '3D');

            // Jede Unterstützungsart außer „selbständig" zählt
            MEDIKATION_HILFE.forEach(h => {
                erfassung.medikation = [{ applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '2',
                    zeitraum: 'pro Tag', unterstuetzung: h }];
                const gezaehlt = !!modul5AusErfassung()['4.5.1'];
                pruefe('Medikation „' + h + '" zählt' + (h === 'selbständig' ? ' nicht' : ''),
                    gezaehlt, h !== 'selbständig');
            });

            // BRi: „Werden Medikamente verabreicht, ist das Stellen nicht gesondert zu berücksichtigen."
            erfassung.medikation = [
                { applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '3', zeitraum: 'pro Tag',
                  unterstuetzung: 'Gabe durch Pflegeperson' },
                { applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '1', zeitraum: 'pro Woche',
                  unterstuetzung: 'Stellen' }
            ];
            pruefe('Neben der Gabe wird das Stellen nicht zusätzlich gezählt', med5(), '3D');
            // Ohne Gabe ist das Stellen für sich eine Maßnahme
            erfassung.medikation = [{ applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '1',
                zeitraum: 'pro Woche', unterstuetzung: 'Stellen' }];
            pruefe('Ohne Gabe zählt das Stellen für sich', med5(), '1W');
            // Ein anderer Applikationsort bleibt davon unberührt
            erfassung.medikation = [
                { applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '3', zeitraum: 'pro Tag',
                  unterstuetzung: 'Gabe durch Pflegeperson' },
                { applikation: 'Augentropfen', anzahl: '2', zeitraum: 'pro Tag', unterstuetzung: 'Stellen' }
            ];
            pruefe('Stellen an einem anderen Ort zählt weiter', med5(), '5D');

            // Alte Fälle: „durchfuehrung" wird weiter verstanden
            erfassung.medikation = [
                { bezeichnung: 'Metformin', applikation: 'oral', anzahl: '3', zeitraum: 'pro Tag',
                  durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Vitamin D', applikation: 'oral', anzahl: '1', zeitraum: 'pro Tag',
                  durchfuehrung: 'selbständig' }
            ];
            pruefe('Alte Fälle werden weiter richtig gewertet', med5(), '3D');
            pruefe('Alte Durchführung wird als Gabe gelesen',
                medikationHilfe({ durchfuehrung: 'durch Pflegeperson' }), 'Gabe durch Pflegeperson');
            pruefe('Ohne jede Angabe keine Unterstützung', medikationHilfe({}), '');

            // Ein alter Fall wird beim Laden in die heutige Form gebracht – sichtbar, nicht heimlich
            const alterFall = { tabellen: { medikation: [
                { bezeichnung: 'Metformin 850 mg', applikation: 'oral', anzahl: '2', zeitraum: 'pro Tag',
                  durchfuehrung: 'durch Pflegeperson' },
                { bezeichnung: 'Latanoprost', applikation: 'Augentr.', anzahl: '1', zeitraum: 'pro Tag',
                  durchfuehrung: 'selbständig' },
                { bezeichnung: 'Insulin', applikation: 's.c.', anzahl: '3', zeitraum: 'pro Tag',
                  durchfuehrung: 'durch Pflegeperson' },
                {}
            ] }, extra: {} };
            // Summe der Maßnahmen pro Tag – sie darf sich durch das Umstellen nicht ändern
            const proTagSumme = () => { const x = modul5AusErfassung();
                const f = { D: 1, W: 1 / 7, M: 1 / 30 };
                return Math.round(Object.keys(x).reduce((s, k) => s + x[k].count * f[x[k].period], 0) * 100) / 100; };
            erfassung = JSON.parse(JSON.stringify(alterFall.tabellen));
            const summeVorher = proTagSumme();
            const altZuordnung = Object.keys(modul5AusErfassung()).sort();
            erfassungLaden(JSON.parse(JSON.stringify(alterFall)));
            const um = erfassung.medikation;
            pruefe('Alter Fall: Applikationsort aus der Liste', um[0].applikation, 'oral (Tabletten, Tropfen, Säfte)');
            pruefe('Alter Fall: Augentropfen erkannt', um[1].applikation, 'Augentropfen');
            pruefe('Alter Fall: Insulin als Injektion erkannt', um[2].applikation, 'Injektion');
            pruefe('Alter Fall: Durchführung wird zur Unterstützung', um[0].unterstuetzung, 'Gabe durch Pflegeperson');
            pruefeWahr('Alter Fall: alte Spalte ist weg', um.every(z => z.durchfuehrung === undefined));
            pruefeWahr('Alter Fall: Medikamentennamen gehen nicht verloren',
                medikationAlteNamen().join(', ') === 'Metformin 850 mg, Latanoprost, Insulin');
            pruefe('Alter Fall: jede Zeile war ein Präparat', um[0].praeparate, '1');
            pruefeWahr('Alter Fall: die leere Zeile bleibt leer', !Object.keys(um[3]).length);
            pruefe('Alter Fall: keine Maßnahme geht verloren oder kommt hinzu', proTagSumme(), summeVorher);
            /* Die Zuordnung wird dabei richtiger: Ein „s.c." verabreichtes Insulin landete früher
               unter 4.5.1 Medikation, weil dort auf das Wort „Injektion" geprüft wurde. Jetzt zählt
               es zu 4.5.2 Injektionen. Beide gehören zur Modul-5-Gruppe A, die als Summe bepunktet
               wird – die Punkte bleiben also gleich, nur die Zeile stimmt. */
            pruefe('Alter Fall: Insulin lag früher unter Medikation', altZuordnung, ['4.5.1']);
            pruefe('Alter Fall: Insulin zählt jetzt zu den Injektionen',
                Object.keys(modul5AusErfassung()).sort(), ['4.5.1', '4.5.2']);
            pruefe('Beide gehören zur selben Modul-5-Gruppe – die Punkte bleiben gleich',
                ITEMS.find(i => i.nr === '4.5.1').group, ITEMS.find(i => i.nr === '4.5.2').group);
            pruefeWahr('Umstellen läuft nicht zweimal',
                JSON.stringify(medikationUmstellen(um)) === JSON.stringify(um));

            // Mehrere zählende Zeilen am selben Ort werden gemeldet, nicht heimlich verrechnet
            erfassung.medikation = [
                { applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '2', zeitraum: 'pro Tag',
                  unterstuetzung: 'Gabe durch Pflegeperson' },
                { applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '1', zeitraum: 'pro Tag',
                  unterstuetzung: 'Erinnerung' }
            ];
            pruefe('Zwei zählende Zeilen am selben Ort werden gemeldet', medikationMehrfachOrt(),
                ['oral (Tabletten, Tropfen, Säfte)']);
            erfassung.medikation[1].unterstuetzung = 'Stellen';
            pruefe('Gabe und Stellen am selben Ort sind kein Fall dafür', medikationMehrfachOrt(), []);
            erfassung.medikation[1].unterstuetzung = 'selbständig';
            pruefe('Selbständiges am selben Ort ist kein Fall dafür', medikationMehrfachOrt(), []);

            // Aus Arztberichten: je Applikationsort eine Zeile, nicht je Präparat
            const gruppiert = medikationGruppiert([
                { bezeichnung: 'Metformin', applikation: 'oral', anzahl: '2', zeitraum: 'pro Tag' },
                { bezeichnung: 'Ramipril', applikation: 'Tablette', anzahl: '1', zeitraum: 'pro Tag' },
                { bezeichnung: 'ASS 100', applikation: '', anzahl: '1', zeitraum: 'pro Tag' },
                { bezeichnung: 'Insulin', applikation: 's.c.', anzahl: '4', zeitraum: 'pro Tag' },
                { bezeichnung: 'Latanoprost', applikation: 'Augentropfen', anzahl: '1', zeitraum: 'pro Tag' }
            ]);
            pruefe('Fünf Präparate ergeben drei Zeilen', (gruppiert || []).length, 3);
            const oral = (gruppiert || []).find(z => /^oral/.test(z.applikation || ''));
            pruefeWahr('Drei orale Präparate in einer Zeile',
                !!oral && oral.praeparate === '3' && oral.anzahl === '2' && oral.zeitraum === 'pro Tag');
            pruefeWahr('Insulin wird als Injektion erkannt',
                (gruppiert || []).some(z => z.applikation === 'Injektion' && z.anzahl === '4'));
            pruefeWahr('Augentropfen bleiben ein eigener Ort',
                (gruppiert || []).some(z => z.applikation === 'Augentropfen'));
            pruefeWahr('Wer hilft, wird aus einem Arztbericht nicht geraten',
                (gruppiert || []).every(z => z.unterstuetzung === undefined));
            erfassung.medikation = gruppiert;
            pruefe('Zusammengefasste Zeilen zählen erst mit einer Unterstützung',
                Object.keys(modul5AusErfassung()).length, 0);

            erfassungLaden(sicherungErf);
        }

        // ---------- 13c. Tippen darf die Schreibmarke nicht verlieren ----------
        if (typeof erfZeileAnhaengen === 'function' && document.getElementById('erfassung-bereich')) {
            const sicherungErf2 = JSON.parse(JSON.stringify(erfassungSichern()));
            const modusVorTipp = appModus;
            setzeModus('hoeherstufung');
            erfassung = {}; erfassungExtra = {};
            renderErfassung();

            const feldVon = (tid, i, key) => document.querySelector('[data-erf="' + tid + '|' + i + '|' + key + '"]');
            const feld = feldVon('behandlungspflege', 0, 'beschreibung');
            pruefeWahr('Eingabefelder sind eindeutig auffindbar', !!feld);
            if (feld) {
                feld.focus();
                // Erster Buchstabe in der letzten Zeile: dabei entsteht eine weitere Zeile
                feld.value = 'V';
                erfSetzen('behandlungspflege', 0, 'beschreibung', 'V');
                pruefe('Nach dem ersten Buchstaben gibt es eine zweite Zeile',
                    (erfassung.behandlungspflege || []).length, 2);
                pruefeWahr('Die Schreibmarke bleibt im selben Feld', document.activeElement === feld);
                pruefeWahr('Das Feld behält seinen Inhalt', feld.value === 'V');
                pruefeWahr('Das Feld wurde nicht ersetzt',
                    feldVon('behandlungspflege', 0, 'beschreibung') === feld);
                // Weiterschreiben in derselben Zeile
                feld.value = 'Verband';
                erfSetzen('behandlungspflege', 0, 'beschreibung', 'Verband');
                pruefe('Weiterschreiben landet in derselben Zeile',
                    erfassung.behandlungspflege[0].beschreibung, 'Verband');
                pruefe('Es entsteht keine dritte Zeile', (erfassung.behandlungspflege || []).length, 2);
                pruefeWahr('Die Schreibmarke ist immer noch dort', document.activeElement === feld);
                pruefeWahr('Die neue Zeile ist auch angezeigt', !!feldVon('behandlungspflege', 1, 'beschreibung'));
            }
            // Auch das berechnete Feld wird nachgezogen, ohne die Tabelle neu zu zeichnen
            const tagFeld = feldVon('pflegepersonen', 0, 'tage');
            if (tagFeld) {
                tagFeld.focus();
                erfSetzen('pflegepersonen', 0, 'tage', '5');
                erfSetzen('pflegepersonen', 0, 'stunden', '4');
                const wo = feldVon('pflegepersonen', 0, 'wochenstunden');
                pruefe('Wochenstunden erscheinen im Feld', wo ? wo.value : null, '20');
                pruefeWahr('Auch dabei bleibt die Schreibmarke stehen', document.activeElement === tagFeld);
            }
            // ---------- 13d. Eigene Angabe statt Liste ----------
            const spalte = (tid, k) => ERFASSUNG_TABELLEN.find(t => t.id === tid).spalten.find(c => c.k === k);
            // Beschreibende Listen sind offen, rechnende bleiben geschlossen
            [['medikation', 'applikation'], ['medikation', 'unterstuetzung'], ['arztbesuche', 'fach'],
             ['behandlungspflege', 'art'], ['pflegepersonen', 'art']].forEach(([tid, k]) => {
                pruefeWahr('Eigene Angabe möglich: ' + tid + '.' + k, spalte(tid, k).frei === true);
            });
            [['medikation', 'zeitraum'], ['arztbesuche', 'zeitraum'], ['arztbesuche', 'begleitung'],
             ['behandlungspflege', 'durchfuehrung'], ['hilfsmittel', 'nutzung']].forEach(([tid, k]) => {
                pruefeWahr('Rechnende Liste bleibt geschlossen: ' + tid + '.' + k, !spalte(tid, k).frei);
            });
            // Die KI darf nur dort frei formulieren, wo die Angabe rein beschreibend ist
            pruefeWahr('KI darf die Fachrichtung frei nennen', spalte('arztbesuche', 'fach').kiFrei === true);
            pruefeWahr('KI darf die Maßnahme frei nennen', spalte('behandlungspflege', 'art').kiFrei === true);
            pruefeWahr('KI muss den Applikationsort aus der Liste wählen',
                !spalte('medikation', 'applikation').kiFrei);
            pruefeWahr('KI muss die Unterstützung aus der Liste wählen',
                !spalte('medikation', 'unterstuetzung').kiFrei);

            // Offene Liste trägt den zusätzlichen Eintrag, geschlossene nicht
            const auswahl = (tid, i, k) => {
                const el = document.querySelector('[data-erf="' + tid + '|' + i + '|' + k + '"]');
                return el && el.tagName === 'SELECT' ? [...el.options].map(o => o.value) : null;
            };
            erfassung = {}; renderErfassung();
            pruefeWahr('Offene Liste bietet „eigene Angabe" an',
                (auswahl('medikation', 0, 'applikation') || []).indexOf(ERF_FREI) > -1);
            pruefeWahr('Geschlossene Liste bietet sie nicht an',
                (auswahl('medikation', 0, 'zeitraum') || []).indexOf(ERF_FREI) === -1);

            // Umschalten: aus dem Auswahlfeld wird ein Schreibfeld – und wieder zurück
            erfSetzen('behandlungspflege', 0, 'art', ERF_FREI);
            const frei = document.querySelector('[data-erf="behandlungspflege|0|art"]');
            pruefeWahr('Nach der Wahl steht dort ein Schreibfeld', !!frei && frei.tagName === 'INPUT');
            pruefeWahr('Die Schreibmarke steht gleich darin', document.activeElement === frei);
            pruefeWahr('Der Platzhalter nennt ein Beispiel', !!frei && /Trachealkanüle/.test(frei.placeholder));
            pruefe('Die Sonderkennung landet nie in den Daten',
                (erfassung.behandlungspflege[0] || {}).art, undefined);
            pruefe('Ohne Angabe entsteht keine weitere Zeile', erfassung.behandlungspflege.length, 1);
            if (frei) {
                frei.value = 'Trachealkanüle wechseln';
                erfSetzen('behandlungspflege', 0, 'art', 'Trachealkanüle wechseln');
                pruefe('Die eigene Angabe wird gespeichert',
                    erfassung.behandlungspflege[0].art, 'Trachealkanüle wechseln');
                pruefeWahr('Die Schreibmarke bleibt auch hier stehen', document.activeElement === frei);
                pruefeWahr('Das Feld wurde dabei nicht ersetzt',
                    document.querySelector('[data-erf="behandlungspflege|0|art"]') === frei);
            }
            // Sie zählt in Modul 5 wie jede andere Maßnahme
            erfSetzen('behandlungspflege', 0, 'anzahl', '2');
            erfSetzen('behandlungspflege', 0, 'zeitraum', 'pro Tag');
            erfSetzen('behandlungspflege', 0, 'durchfuehrung', 'durch Pflegeperson');
            const zFrei = modul5AusErfassung();
            pruefeWahr('Eine eigene Maßnahme wird gewertet',
                !!zFrei['4.5.11'] && zFrei['4.5.11'].count === 2);
            // Zurück zur Liste
            erfZurListe('behandlungspflege', 0, 'art');
            const wiederListe = document.querySelector('[data-erf="behandlungspflege|0|art"]');
            pruefeWahr('Zurück zur Liste liefert wieder ein Auswahlfeld',
                !!wiederListe && wiederListe.tagName === 'SELECT');
            pruefe('Dabei wird die eigene Angabe verworfen',
                erfassung.behandlungspflege[0].art, undefined);

            // Ein gespeicherter Wert außerhalb der Liste erscheint von selbst als Schreibfeld
            erfassungLaden({ tabellen: { medikation: [
                { applikation: 'Nasenspray', anzahl: '2', zeitraum: 'pro Tag',
                  unterstuetzung: 'Gabe durch Pflegeperson' }, {} ] }, extra: {} });
            renderErfassung();
            const gespeichert = document.querySelector('[data-erf="medikation|0|applikation"]');
            pruefeWahr('Eigene Angabe übersteht Speichern und Laden',
                !!gespeichert && gespeichert.tagName === 'INPUT' && gespeichert.value === 'Nasenspray');
            const eigenM5 = modul5AusErfassung();
            pruefeWahr('Ein eigener Applikationsort zählt zur Medikation',
                !!eigenM5['4.5.1'] && eigenM5['4.5.1'].count === 2);
            pruefeWahr('Der Ort steht auch im Dokument',
                /Nasenspray/.test(buildHoeherstufung('', {}, '', '')));

            erfassungLaden(sicherungErf2); setzeModus(modusVorTipp); renderErfassung();
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
            // Name nach der Vorgabe des Verfassers: „Vorname, Nachname, Bezeichnung.json"
            pruefe('Fall speichern: Dateiname wird vorgeschlagen', dialogName,
                'Speicher, Test, Widerspruch.json');
            pruefeWahr('Fall speichern nutzt den Speichern-unter-Dialog',
                saveCase.toString().includes('speichereDatei'));
            pruefe('Fall speichern: Dialog beginnt im Download-Ordner', dialogStart, 'downloads');
            pruefeWahr('Speichern wird nachgewiesen',
                leseSpeicherungen().some(e => e.name === 'Speicher, Test, Widerspruch.json'));
            pruefeWahr('Nachweis erscheint in der Auswertung',
                speicherungenHtml().includes('Speicher, Test, Widerspruch.json'));
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
            // Feld vorher leeren: sonst koennte die Wartebedingung schon erfuellt sein,
            // bevor das Laden ueberhaupt gewirkt hat (der Test liefe dann zu frueh weiter).
            document.getElementById('stam-kasse').value = '';
            loadCase({ target: { files: [new File([json], 'probe.json', { type: 'application/json' })], value: '' } });
            await warteAuf(() => document.getElementById('stam-kasse').value === 'Testkasse');
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
            const ladeFall = async (t, erwarteterName) => {
                document.getElementById('stam-betreffend').value = '';
                loadCase({ target: { files: [new File([t], 'f.json', { type: 'application/json' })], value: '' } });
                await warteAuf(() => document.getElementById('stam-betreffend').value === erwarteterName);
            };
            await ladeFall(fallA, 'Frau AAA');
            renderAuswertung();                       // Fall A ansehen
            await ladeFall(fallB, 'Herr BBB');         // Fall B laden, ohne Reiter 4 zu öffnen
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
            document.getElementById('stam-betreffend').value = '';
            loadCase({ target: { files: [new File([altJson], 'alt.json', { type: 'application/json' })], value: '' } });
            await warteAuf(() => document.getElementById('stam-betreffend').value === 'Frau Alt');
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

        // ---------- 19. Befund aus dem Vorgutachten (nur Höherstufungsantrag) ----------
        if (typeof vorbefundPruefen === 'function') {
            const merkeModusVb = appModus;
            const merkeBefundVb = JSON.parse(JSON.stringify(befundSichern()));
            const merkeErfVb = JSON.parse(JSON.stringify(erfassungSichern()));
            const merkeBefundText = document.getElementById('stam-befund')
                ? document.getElementById('stam-befund').value : '';

            // 19a. Die Vorbelegung gehört ausschließlich zum Höherstufungsantrag
            const feldB = document.getElementById('stam-befund');
            if (feldB) feldB.value = 'Gehen: erfolgt selbständig. Schürzengriff links bis zum hinteren '
                + 'Beckenkamm möglich. Körpergröße 172 cm, Gewicht 68 kg. Metformin oral zweimal täglich.';
            ['widerspruch', 'erstantrag', 'anhoerung'].forEach(m => {
                setzeModus(m);
                pruefe('Vorbelegung nicht im ' + m, vorbefundMoeglich(), false);
                pruefe('Keine Vorbelegungskarte im ' + m, vorbefundKarteHtml(), '');
            });
            setzeModus('hoeherstufung');
            pruefeWahr('Vorbelegung im Höherstufungsantrag möglich', vorbefundMoeglich() === true);
            pruefeWahr('Vorbelegungskarte im Höherstufungsantrag vorhanden',
                vorbefundKarteHtml().indexOf('leseVorbefund()') > -1);

            // Ohne eingelesenes Gutachten steht nichts zum Übernehmen bereit
            if (feldB) feldB.value = '';
            pruefe('Ohne Gutachtentext keine Vorbelegung', vorbefundMoeglich(), false);
            pruefeWahr('Karte weist auf das fehlende Gutachten hin',
                vorbefundKarteHtml().indexOf('disabled') > -1);
            if (feldB) feldB.value = merkeBefundText || 'Gehen: erfolgt selbständig.';

            // 19b. Was aus dem Gutachten kommt, steht ohne KI schon in der Maske:
            // NBA-Einträge lesen unmittelbar aus der eingelesenen Bewertung.
            const nbaEintrag = befundEintrag('k_4_1_1');
            if (nbaEintrag) {
                const itemNba = ITEMS.find(i => i.nr === '4.1.1');
                const merkNba = stateEigene.values[itemNba.id];
                stateEigene.values[itemNba.id] = 2;
                pruefe('NBA-Eintrag zeigt den eingelesenen Wert ohne Übernahme', befundWert(nbaEintrag, null), 2);
                if (typeof merkNba === 'number') stateEigene.values[itemNba.id] = merkNba;
                else delete stateEigene.values[itemNba.id];
            }

            // 19c. Die Aufgabe an die KI wird aus dem Katalog erzeugt
            const aufgabe = vorbefundAufgabe();
            pruefeWahr('Aufgabe nennt beschreibende Befunde', /Gangbild/.test(aufgabe));
            pruefeWahr('Aufgabe nennt keine NBA-Kriterien', !/4\.1\.1|4\.2\.1\b/.test(aufgabe));
            pruefeWahr('Aufgabe nennt den berechneten BMI nicht', !/„BMI"/.test(aufgabe));
            pruefeWahr('Anweisung verbietet Raten',
                /Erfinde nichts/.test(vorbefundAnweisung()) && /LASS IHN WEG/.test(vorbefundAnweisung()));
            pruefeWahr('Anweisung verlangt eine Fundstelle',
                /Ohne Beleg kein Eintrag/.test(vorbefundAnweisung())
                && /Jede Zeile braucht „beleg"/.test(vorbefundAnweisung()));

            // 19d. Prüfung der KI-Antwort: nur Belegtes und nur Bekanntes wird angenommen
            const geprueft = vorbefundPruefen({
                befunde: [
                    { id: 'gangbild', stufe: 'Sicher', beleg: 'Gehen: erfolgt selbständig' },
                    { id: 'schuerzengriff', seite: 'links', stufe: 'Bis zum hinteren Beckenkamm möglich',
                      beleg: 'Schürzengriff links bis hinterer Beckenkamm' },
                    { id: 'groesse', text: '172', beleg: 'Körpergröße 172 cm' },
                    { id: 'gangbild', stufe: 'geht gar nicht', beleg: 'irgendwas' },       // Stufe gibt es nicht
                    { id: 'bmi', text: '23', beleg: 'BMI 23' },                            // wird berechnet
                    { id: 'gibtsnicht', stufe: 'x', beleg: 'y' },                          // unbekannt
                    { id: 'stuerze', text: 'zwei Stürze', beleg: '' }                      // ohne Fundstelle
                ],
                medikation: [
                    { applikation: 'oral (Tabletten, Tropfen, Säfte)', praeparate: '4', anzahl: '2',
                      zeitraum: 'pro Tag', unterstuetzung: 'Gabe durch Pflegeperson',
                      beleg: 'vier Tabletten, zweimal täglich gereicht' },
                    { applikation: 'Augentropfen', praeparate: '1', anzahl: '1', zeitraum: 'pro Tag',
                      unterstuetzung: 'hilft manchmal', beleg: 'Augentropfen' },   // Unterstützung unbekannt
                    { applikation: 'unter die Zunge', anzahl: '1', zeitraum: 'pro Tag',
                      beleg: 'sublingual' },                                       // Applikationsort unbekannt
                    { applikation: 'Injektion' }                                   // ohne Beleg
                ],
                hilfsmittel: [
                    { bezeichnung: 'Rollator', nutzung: 'genutzt', beleg: 'nutzt einen Rollator' }
                ],
                // Beschreibende Spalte: hier darf die KI etwas nennen, das nicht in der Liste steht
                behandlungspflege: [
                    { art: 'Trachealkanüle wechseln', anzahl: '1', zeitraum: 'pro Woche',
                      durchfuehrung: 'durch Pflegeperson', beleg: 'Trachealkanüle wird woechentlich gewechselt' }
                ]
            });
            pruefe('Nur belegte und bekannte Befunde angenommen', geprueft.befunde.length, 3);
            pruefe('Erste Stufe richtig zugeordnet', geprueft.befunde[0] ? geprueft.befunde[0].stufe : null, 'Sicher');
            pruefe('Seite übernommen', geprueft.befunde[1] ? geprueft.befunde[1].seite : null, 'links');
            pruefeWahr('Freitext übernommen',
                !!geprueft.befunde[2] && geprueft.befunde[2].frei === true && geprueft.befunde[2].text === '172');
            pruefe('Nicht Übernommenes wird benannt', geprueft.verworfen.length, 7);
            pruefe('Nur brauchbare Tabellenzeilen', geprueft.erfassung.length, 4);
            pruefeWahr('Beschreibende Spalte nimmt auch eine freie Angabe der KI an',
                geprueft.erfassung.some(z => z._tabelle === 'behandlungspflege'
                    && z.art === 'Trachealkanüle wechseln'));
            const med = geprueft.erfassung.filter(z => z._tabelle === 'medikation');
            pruefeWahr('Unbekannte Auswahl wird verworfen, die Zeile bleibt',
                med.length === 2 && med[1].unterstuetzung === undefined && med[1].applikation === 'Augentropfen');
            pruefeWahr('Ohne gültigen Applikationsort keine Medikationszeile',
                !med.some(z => z.applikation === 'unter die Zunge'));
            pruefeWahr('Jede Tabellenzeile trägt ihre Fundstelle',
                geprueft.erfassung.every(z => !!z._beleg));

            // 19e. Übernahme: nichts ist vorausgewählt, Angehaktes landet in der Maske
            befundLaden({}); erfassungLaden({});
            vorbefundFunde = geprueft;
            zeigeVorbefundVorschlaege();
            const kaesten = document.querySelectorAll('#vorschlag-body input[type="checkbox"]');
            pruefe('Auswahlliste zeigt alle Vorschläge', kaesten.length, 7);
            pruefeWahr('Nichts ist vorausgewählt',
                Array.prototype.every.call(kaesten, c => !c.checked));
            pruefeWahr('Jeder Vorschlag zeigt seine Fundstelle',
                document.querySelectorAll('#vorschlag-body .vs-fund').length === 7);
            pruefeWahr('Warnung vor dem alten Stand steht in der Liste',
                /damalige/.test(document.getElementById('vorschlag-body').innerHTML));
            pruefeWahr('Übernahmeknopf gehört zur Vorbelegung',
                (document.querySelector('#vorschlag-overlay .review-header .btn-primary')
                    .getAttribute('onclick') || '').indexOf('uebernehmeVorbefund') > -1);

            // Ohne Haken darf nichts geschrieben werden
            pruefe('Ohne Auswahl wird nichts übernommen', uebernehmeVorbefund(), 0);
            pruefe('Befund bleibt leer', Object.keys(befundWerte).length, 0);

            // Mit Haken: zwei Befunde und eine Tabellenzeile
            vorbefundFunde = geprueft;
            zeigeVorbefundVorschlaege();
            // Die Medikationszeile über ihre Tabelle suchen, nicht über die Position –
            // die Reihenfolge der Tabellen ist kein Versprechen.
            const medIdx = geprueft.erfassung.findIndex(z => z._tabelle === 'medikation');
            document.querySelectorAll('#vorschlag-body input[type="checkbox"]').forEach(c => {
                const k = c.getAttribute('data-vb');
                if (k === 'b0' || k === 'b2' || k === 'e' + medIdx) c.checked = true;
            });
            const uebernommen = uebernehmeVorbefund();
            pruefe('Angehaktes wird übernommen', uebernommen, 3);
            pruefe('Stufe steht in der Maske', befundWerte['gangbild'],
                geprueft.befunde[0] ? geprueft.befunde[0].idx : -1);
            pruefe('Freitext steht in der Maske', befundTexte['groesse'], '172');
            pruefeWahr('Tabellenzeile angelegt',
                (erfassung.medikation || []).some(z => z.applikation === 'oral (Tabletten, Tropfen, Säfte)'));
            pruefeWahr('Tabelle behält eine leere Zeile zum Weiterschreiben',
                (erfassung.medikation || []).length > 0
                && Object.keys(erfassung.medikation[erfassung.medikation.length - 1]).length === 0);
            pruefe('Nicht Angehaktes bleibt draußen', befundWerte['schuerzengriff|links'], undefined);

            // 19f. Kennzeichnung „noch aus dem Vorgutachten"
            pruefe('Übernommenes ist gekennzeichnet', vorbefundOffen().sort(), ['gangbild', 'groesse']);
            pruefeWahr('Kennzeichnung erscheint in der Maske',
                befundZeile({ id: 'gehen' }, befundEintrag('gangbild')).indexOf('befund-vg') > -1);
            pruefeWahr('Hinweis nennt die offenen Einträge', /2 Eintrag/.test(vorbefundHinweisHtml()));
            setzeBefund('gehen', 'gangbild', null, '1');
            pruefe('Nach eigener Eingabe entfällt die Kennzeichnung', vorbefundOffen(), ['groesse']);
            setzeBefundText('groesse', null, '175');
            pruefe('Auch der Freitext verliert die Kennzeichnung', vorbefundOffen(), []);
            pruefe('Ohne offene Einträge kein Hinweis', vorbefundHinweisHtml(), '');

            // 19g. Die Kennzeichnung gehört zum gespeicherten Fall
            befundWerte['gangbild'] = 0;
            befundHerkunft['gangbild'] = 'vorgutachten';
            const gesichertVb = JSON.parse(JSON.stringify(befundSichern()));
            befundLaden({});
            pruefe('Nach dem Leeren keine Kennzeichnung', vorbefundOffen(), []);
            befundLaden(gesichertVb);
            pruefe('Kennzeichnung übersteht Speichern und Laden', vorbefundOffen(), ['gangbild']);

            // 19h. Die Auswahlliste fällt auf ihren Ursprungszweck zurück
            vorschlagListe = [];
            renderVorschlaege();
            pruefeWahr('Auswahlliste wieder für Widerspruchspunkte',
                (document.querySelector('#vorschlag-overlay .review-header .btn-primary')
                    .getAttribute('onclick') || '').indexOf('uebernehmeVorschlaege') > -1);
            closeVorschlaege();

            // 19i. Die anderen Vorgangsarten bleiben unberührt
            pruefeWahr('Befunderhebung kennt die Vorbelegung nur über eine Prüfung',
                renderBefund.toString().indexOf("typeof vorbefundKarteHtml === 'function'") > -1);
            // Im Erstantrag gibt es kein Vorgutachten – dort darf auch keine Kennzeichnung stehen
            befundLaden({}); befundWerte['gangbild'] = 1; befundHerkunft['gangbild'] = 'vorgutachten';
            setzeModus('hoeherstufung');
            pruefeWahr('Kennzeichnung im Höherstufungsantrag sichtbar', vorbefundStammtVon('gangbild') === true);
            setzeModus('erstantrag');
            pruefe('Keine Kennzeichnung im Erstantrag', vorbefundStammtVon('gangbild'), false);
            renderBefund();
            pruefe('Erstantrag zeigt keine Vorgutachten-Markierung',
                (document.getElementById('tab-befund').innerHTML.match(/befund-vg/g) || []).length, 0);
            pruefeWahr('Befunderhebung steht im Erstantrag unverändert zur Verfügung',
                document.getElementById('tab-befund').innerHTML.indexOf('Beweglichkeit obere Extremitäten') > -1);
            setzeModus('hoeherstufung');
            pruefe('Beim Zurückwechseln ist die Kennzeichnung wieder da', vorbefundOffen(), ['gangbild']);

            befundLaden(merkeBefundVb); erfassungLaden(merkeErfVb); setzeModus(merkeModusVb);
            if (feldB) feldB.value = merkeBefundText;
            vorbefundFunde = null;
        }

        // ---------- 20. Versorgung beim Einlesen des Vorgutachtens (Höherstufungsantrag) ----------
        // Erfundene Angaben, gebaut nach dem Aufbau eines echten Gutachtens (1.3, 1.4, 4.5.1).
        if (typeof vorbefundImportAktiv === 'function') {
            const merkModus20 = appModus, merkZiel20 = importZiel;
            const merkBef20 = JSON.parse(JSON.stringify(befundSichern()));
            const merkErf20 = JSON.parse(JSON.stringify(erfassungSichern()));
            const merkReview20 = reviewData;
            const merkOrig20 = JSON.parse(JSON.stringify(stateOrig));
            const merkEigen20 = JSON.parse(JSON.stringify(stateEigene));

            // 20a. Nur im Höherstufungsantrag und nur beim Vorgutachten
            importZiel = 'orig';
            ['widerspruch', 'erstantrag', 'anhoerung'].forEach(m => {
                setzeModus(m);
                pruefe('Einlesen ohne Versorgung im ' + m, vorbefundImportAktiv(), false);
            });
            setzeModus('hoeherstufung');
            pruefe('Einlesen mit Versorgung im Höherstufungsantrag', vorbefundImportAktiv(), true);
            importZiel = 'zweit';
            pruefe('Nicht beim Zweitgutachten', vorbefundImportAktiv(), false);
            importZiel = 'orig';
            const anw20 = vorbefundImportAnweisung();
            pruefeWahr('Anweisung nennt die Fundorte 1.3, 1.4 und 4.5.1',
                /1\.3/.test(anw20) && /1\.4/.test(anw20) && /4\.5\.1/.test(anw20));
            pruefeWahr('Schema bekommt das Feld „versorgung"',
                !!vorbefundImportSchema({ properties: {} }).properties.versorgung);

            // 20b. Die Antwort wird geprüft und in die Form der Maske gebracht
            const versorgung20 = {
                befunde: [
                    { id: 'schuerzengriff', stufe: 'Bis zum hinteren Beckenkamm möglich',
                      beleg: 'Schürzenbandgriff bds. nicht endständig möglich' },          // beidseits
                    { id: 'groesse', text: '160', beleg: 'Größe: 160cm' },
                    { id: 'gewicht', text: '80', beleg: 'Gewicht: 80kg' },
                    { id: 'ernaehrungszustand', stufe: 'Übergewicht', beleg: 'optisch übergewichtig' }, // abgeleitet
                    { id: 'atmung', stufe: 'Dyspnoe bei geringer Belastung', beleg: 'Luftnot nach wenigen Metern' }
                ],
                befund_weitere: [
                    { gruppe: 'sonstiges', titel: 'Haut', text: 'Pigmentierung der Unterschenkel bds.',
                      beleg: 'Pigmentierung der Unterschenkel bds.' },
                    { gruppe: 'gibtsnicht', titel: 'Pflegezustand', text: 'unauffällig',
                      beleg: 'Der Pflegezustand ist unauffällig.' }
                ],
                pflegepersonen: [
                    { art: 'Pflegeperson', name: 'Otto Probe', geboren: '01.02.1940', tage: '2',
                      wochenstunden: '10', unterstuetzung: 'Wäsche, Einkäufe', beleg: 'Otto Probe 2 10' },
                    { art: 'Ambulanter Pflegedienst', name: 'Probepflege e.V.', tage: '1',
                      unterstuetzung: 'Medikamente richten, Kompressionsstrümpfe', beleg: 'Ambulante Pflege' }
                ],
                krankenhaus: [ { von: '03.01.2026', bis: '10.01.2026', grund: 'Sturz', beleg: 'stationär wegen Sturz' } ],
                hilfsmittel: [
                    { bezeichnung: 'Rollator', nutzung: 'genutzt', beleg: 'Rollator' },
                    { bezeichnung: 'Gehstock', nutzung: 'ungenutzt', beleg: 'Gehstock ungenutzt' },
                    { bezeichnung: 'Kompressionsstrümpfe Kl. II', nutzung: 'genutzt', beleg: 'Kompressionsstrümpfe Kl. II' }
                ],
                arztbesuche: [
                    { fach: 'Hausarzt', anzahl: '1', zeitraum: 'im Quartal', begleitung: 'in Begleitung', beleg: 'Hausarzt: 1 mal im Quartal' },
                    { fach: 'Physiotherapie', anzahl: '1', zeitraum: 'pro Woche', begleitung: 'in Begleitung', beleg: 'Physiotherapie: 1 mal wöchentlich' }
                ],
                medikation: [
                    { applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '1', zeitraum: 'pro Woche',
                      unterstuetzung: 'Stellen', beleg: 'Hilfe beim Richten der Medikamente 1x wöchentlich' },
                    { applikation: 'Augentropfen', unterstuetzung: 'selbständig', beleg: 'Augentropfen selbständig' }
                ],
                // Steht im Gutachten unter Behandlungspflege – gehört aber zum Hilfsmittel
                behandlungspflege: [
                    { art: 'Anziehen Kompressionsstrümpfe', anzahl: '1', zeitraum: 'pro Tag',
                      durchfuehrung: 'durch Pflegeperson', beleg: 'Anziehen Kompressionsstrümpfe ab Kl. II: 1 mal täglich' },
                    { art: 'Ausziehen Kompressionsstrümpfe', anzahl: '1', zeitraum: 'pro Tag',
                      durchfuehrung: 'durch Pflegeperson', beleg: 'Ausziehen Kompressionsstrümpfe ab Kl. II: 1 mal täglich' }
                ]
            };
            const rev20 = normalizeImport({ stam_betreffend: 'Frau Probe Beispiel', stam_pg_manual: '2',
                stam_begutachtung: '17.06.2026', values_orig: [], diagnoses: [], versorgung: versorgung20 });
            const vb20 = rev20.vorbefund || { befunde: [], erfassung: [], verworfen: [] };
            const zeilenVon = tid => vb20.erfassung.filter(z => z._tabelle === tid);
            pruefeWahr('Prüfansicht bekommt die Versorgung', !!rev20.vorbefund);
            pruefeWahr('In der Prüfansicht ist alles vorausgewählt',
                vb20.erfassung.every(z => z._an === true) && vb20.befunde.every(b => b._an === true));

            // Kompressionsstrümpfe: EINE Zeile im Hilfsmittel, keine in der Behandlungspflege
            const kompr = zeilenVon('hilfsmittel').filter(z => /kompression/i.test(z.bezeichnung));
            pruefe('Kompressionsstrümpfe stehen genau einmal', kompr.length, 1);
            pruefe('Nichts davon bleibt in der Behandlungspflege', zeilenVon('behandlungspflege').length, 0);
            pruefeWahr('An- und Ausziehen ergeben 2× pro Tag',
                !!kompr[0] && kompr[0].anzahl === '2' && kompr[0].zeitraum === 'pro Tag');
            pruefeWahr('Die Tätigkeit nennt beides',
                !!kompr[0] && /Anziehen/.test(kompr[0].taetigkeit || '') && /Ausziehen/.test(kompr[0].taetigkeit || ''));
            pruefe('Ungenutzt bleibt ungenutzt',
                (zeilenVon('hilfsmittel').find(z => z.bezeichnung === 'Gehstock') || {}).nutzung, 'ungenutzt');

            // Pflegepersonen: Wochenstunden aus dem Gutachten, Stunden am Tag umgerechnet
            const pp = zeilenVon('pflegepersonen').find(z => z.name === 'Otto Probe') || {};
            pruefe('Geburtsdatum in der Form des Eingabefelds', pp.geboren, '1940-02-01');
            pruefe('Wochenstunden aus dem Gutachten', pp.wochenstunden, '10');
            pruefe('Stunden am Tag umgerechnet', pp.stunden, '5');
            pruefeWahr('Pflegedienst ist eine eigene Zeile',
                zeilenVon('pflegepersonen').some(z => z.art === 'Ambulanter Pflegedienst'));
            pruefe('Krankenhaus: Datum umgewandelt', (zeilenVon('krankenhaus')[0] || {}).von, '2026-01-03');
            pruefe('Arztbesuch im Quartal bleibt im Quartal',
                (zeilenVon('arztbesuche').find(z => z.fach === 'Hausarzt') || {}).zeitraum, 'im Quartal');

            // Befund: beidseits gilt für beide Seiten, Abgeleitetes nicht, Weiteres in seine Gruppe
            const sg = vb20.befunde.filter(b => b.id === 'schuerzengriff');
            pruefe('Beidseits ergibt rechts und links', sg.map(b => b.seite).sort(), ['links', 'rechts']);
            pruefeWahr('Ernährungszustand wird nicht als Stufe gesetzt (kommt aus dem BMI)',
                !vb20.befunde.some(b => b.id === 'ernaehrungszustand'));
            const weitere = vb20.befunde.filter(b => b.weitere);
            pruefe('Weitere Befunde werden übernommen', weitere.length, 2);
            pruefeWahr('Unbekannte Gruppe landet unter Sonstiges',
                weitere.every(b => b.gruppe === 'sonstiges'));

            // 20c. Prüfansicht zeigt den Abschnitt, Abwählen wirkt
            reviewData = rev20;
            const html20 = vorbefundReviewHtml(rev20);
            pruefeWahr('Prüfansicht hat den Abschnitt für die Erfassung', /Für die Erfassung im Höherstufungsantrag/.test(html20));
            pruefeWahr('Jede Zeile zeigt ihre Fundstelle', (html20.match(/Laut Gutachten/g) || []).length
                === vb20.erfassung.length + vb20.befunde.length);
            pruefeWahr('Abschnitt steht im Formular der Prüfansicht',
                buildReviewForm(rev20).indexOf('rev-vorbefund') > -1);
            const gehIdx = vb20.erfassung.findIndex(z => z.bezeichnung === 'Gehstock');
            rvVorbefund('e', gehIdx, false);
            pruefe('Abwählen in der Prüfansicht wirkt', vb20.erfassung[gehIdx]._an, false);

            // 20d. Freigabe: Der vorige Fall verschwindet, der neue steht in der Maske
            erfassungLaden({ tabellen: { pflegepersonen: [{ name: 'Vorige Person', adresse: 'Alte Straße 1' }, {}] }, extra: { pg: '' } });
            befundLaden({ texte: { groesse: '199' } });
            applyImportedData(rev20);
            const pp20 = erfassung.pflegepersonen || [];
            pruefeWahr('Daten des vorigen Falls sind weg', !pp20.some(z => z.name === 'Vorige Person'));
            pruefeWahr('Pflegeperson steht in der Maske', pp20.some(z => z.name === 'Otto Probe' && z.tage === '2'));
            pruefeWahr('Hilfsmittel steht in der Maske', (erfassung.hilfsmittel || []).some(z => z.bezeichnung === 'Rollator'));
            pruefeWahr('Abgewähltes wird nicht eingetragen', !(erfassung.hilfsmittel || []).some(z => z.bezeichnung === 'Gehstock'));
            pruefeWahr('Arztbesuch steht in der Maske', (erfassung.arztbesuche || []).some(z => z.fach === 'Hausarzt'));
            pruefeWahr('Medikation steht in der Maske', (erfassung.medikation || []).some(z => z.unterstuetzung === 'Stellen'));
            pruefeWahr('Krankenhausaufenthalt steht in der Maske', (erfassung.krankenhaus || []).some(z => z.grund === 'Sturz'));
            pruefeWahr('Jede übernommene Zeile ist als Vorgutachten markiert',
                ['pflegepersonen', 'hilfsmittel', 'arztbesuche', 'medikation', 'krankenhaus']
                    .every(tid => (erfassung[tid] || []).filter(z => Object.keys(z).length).every(z => z._vg === true)));
            pruefeWahr('Jede Tabelle behält eine leere Zeile zum Weiterschreiben',
                ['pflegepersonen', 'hilfsmittel', 'medikation'].every(tid =>
                    Object.keys((erfassung[tid] || [])[(erfassung[tid] || []).length - 1] || { x: 1 }).length === 0));
            pruefe('Pflegegrad des Vorgutachtens eingetragen', erfassungExtra.pg, '2');
            pruefe('Datum des Vorgutachtens eingetragen', erfassungExtra.vorgutachten, '2026-06-17');
            pruefe('Größe in der Befunderhebung', befundTexte['groesse'], '160');
            pruefe('BMI daraus berechnet', befundTexte['bmi'], '31,3');
            pruefeWahr('Schürzengriff beidseits in der Maske',
                typeof befundWerte['schuerzengriff|rechts'] === 'number' && typeof befundWerte['schuerzengriff|links'] === 'number');
            pruefeWahr('Weiterer Befund unter Sonstiges', (befundExtra['sonstiges'] || []).some(x => x.titel === 'Haut'));
            pruefeWahr('Befundeinträge sind als Vorgutachten markiert', vorbefundOffen().indexOf('groesse') > -1);

            // Modul 5 aus den übernommenen Zeilen – Kompressionsstrümpfe einmal, nicht doppelt
            const m5_20 = modul5AusErfassung();
            pruefeWahr('Kompressionsstrümpfe zählen einmal zu 4.5.7 (2× pro Tag)',
                !!m5_20['4.5.7'] && m5_20['4.5.7'].count === 2 && m5_20['4.5.7'].period === 'D');
            pruefeWahr('Keine Behandlungspflege daneben', !m5_20['4.5.11']);

            // 20e. Markierung verschwindet mit der ersten Änderung – ohne die Tabelle neu zu zeichnen
            renderErfassung();
            const rIdx = erfassung.hilfsmittel.findIndex(z => z.bezeichnung === 'Rollator');
            const rFeld = document.querySelector('[data-erf="hilfsmittel|' + rIdx + '|bezeichnung"]');
            pruefeWahr('Markierte Zeile ist in der Maske sichtbar',
                !!rFeld && !!rFeld.closest('tr') && rFeld.closest('tr').classList.contains('erf-vg'));
            pruefeWahr('Tabelle nennt die unbearbeiteten Zeilen',
                /aus dem Vorgutachten/.test((document.getElementById('erf-vg-hilfsmittel') || {}).innerHTML || ''));
            if (rFeld) {
                rFeld.focus();
                erfSetzen('hilfsmittel', rIdx, 'bezeichnung', 'Rollator, insgesamt drei');
                pruefe('Nach der Änderung ist die Marke weg', erfassung.hilfsmittel[rIdx]._vg, undefined);
                pruefeWahr('Die Zeile ist nicht mehr markiert', !rFeld.closest('tr').classList.contains('erf-vg'));
                pruefeWahr('Die Schreibmarke bleibt dabei stehen', document.activeElement === rFeld);
            }
            // Außerhalb des Höherstufungsantrags keine Markierung
            setzeModus('erstantrag');
            pruefe('Keine Tabellenmarkierung im Erstantrag', erfVgAnzahl('arztbesuche'), 0);
            setzeModus('hoeherstufung');

            // 20f. Im Widerspruch trägt die Freigabe keine Versorgung ein
            setzeModus('widerspruch');
            applyImportedData(normalizeImport({ values_orig: [], diagnoses: [], versorgung: versorgung20 }));
            pruefeWahr('Widerspruch: keine Versorgungszeilen eingetragen',
                !(erfassung.hilfsmittel || []).some(z => Object.keys(z).length));
            pruefe('Widerspruch: Befund bleibt leer', Object.keys(befundTexte).filter(k => k !== 'bmi').length, 0);

            reviewData = merkReview20; importZiel = merkZiel20;
            stateOrig = merkOrig20; stateEigene = merkEigen20;
            befundLaden(merkBef20); erfassungLaden(merkErf20); setzeModus(merkModus20);
        }


        // ---------- 21. Antrag: Lebensbereiche statt Einzelbegründungen, höchstens rund 7 Seiten ----------
        /* Gemeldet: Im Höherstufungsantrag standen drei Seiten Anamnese aus dem Vorgutachten und
           je Kriterium ein Widerspruchsblock. Der Antrag ersetzt den Fragebogen des Medizinischen
           Dienstes – je Lebensbereich ein kurzer Absatz, die Einschätzung darunter. */
        if (typeof antragBereiche === 'function') {
            const merk21 = {
                modus: appModus, orig: JSON.parse(JSON.stringify(stateOrig)), eigen: JSON.parse(JSON.stringify(stateEigene)),
                bef: JSON.parse(JSON.stringify(befundSichern())), erf: JSON.parse(JSON.stringify(erfassungSichern())),
                anam: document.getElementById('stam-anamnese').value, befTxt: document.getElementById('stam-befund').value,
                notes: document.getElementById('erstgespraech-notes') ? document.getElementById('erstgespraech-notes').value : '',
                doc: (document.getElementById('appeal-document') || {}).innerHTML || '', draft: appealDraft,
                key: (typeof userApiKey !== 'undefined') ? userApiKey : '', ki: window.callGeminiWithFallback
            };
            const id21 = nr => ITEMS.find(i => i.nr === nr).id;
            const leer21 = () => ITEMS.forEach(i => {
                const l = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                stateOrig.values[i.id] = JSON.parse(JSON.stringify(l));
                stateEigene.values[i.id] = JSON.parse(JSON.stringify(l));
            });
            try {
                setzeModus('hoeherstufung');
                stateOrig.extracted = null;
                leer21();
                // Vorgutachten: leichte Einschränkungen; heute: deutlich mehr
                stateOrig.values[id21('4.1.1')] = 1;
                stateEigene.values[id21('4.1.1')] = 1;             // unverändert
                stateEigene.values[id21('4.1.5')] = 3;             // neu
                stateEigene.values[id21('4.4.5')] = 2;
                stateEigene.values[id21('4.5.1')] = { count: 6, period: 'D' };
                stateEigene.values[id21('4.5.4')] = { count: 4, period: 'D' };

                // 21a. Bereiche: nur Module mit Einschränkung, je Kriterium heute und früher
                const b21 = antragBereiche();
                pruefe('Bereiche nur mit Einschränkung', b21.map(b => b.nr), ['M1', 'M4', 'M5']);
                const mob = b21.find(b => b.nr === 'M1') || { kriterien: [] };
                pruefeWahr('Unverändertes Kriterium ist nicht als verschlechtert markiert',
                    mob.kriterien.some(k => k.nr === '4.1.1' && k.geaendert === false));
                pruefeWahr('Neue Einschränkung ist als verschlechtert markiert',
                    mob.kriterien.some(k => k.nr === '4.1.5' && k.geaendert === true && k.o === null));
                const sigVorher = mob.sig;
                stateEigene.values[id21('4.1.5')] = 2;
                pruefeWahr('Kennung ändert sich mit der Einschätzung',
                    (antragBereiche().find(b => b.nr === 'M1') || {}).sig !== sigVorher);
                stateEigene.values[id21('4.1.5')] = 3;
                setzeModus('erstantrag');
                pruefeWahr('Erstantrag: kein Vergleich mit einem Vorgutachten',
                    antragBereiche().every(b => b.kriterien.every(k => k.o === null && !k.geaendert)));
                setzeModus('hoeherstufung');

                // 21b. Das Schriftstück
                const bau21 = texte => { const d = document.createElement('div');
                    d.innerHTML = buildHoeherstufung('', texte || {}, '', ''); return d; };
                let d21 = bau21({});
                const t21 = d21.innerText.replace(/\s+/g, ' ');
                pruefeWahr('Abschnitt „Einschränkungen in den Lebensbereichen"', t21.includes('Einschränkungen in den Lebensbereichen'));
                pruefeWahr('Kein „Befund und Stellungnahme" im Antrag', !t21.includes('Befund und Stellungnahme'));
                pruefeWahr('Kein Füllsatz je Kriterium', !t21.includes('Die Einstufung ergibt sich aus dem erhobenen Befund'));
                pruefeWahr('Kein Ableitungssatz', !/Wertung mit .* ableitbar/.test(t21));
                pruefe('Je Lebensbereich ein Block', d21.querySelectorAll('#stmt-crit .crit.bereich').length, 3);
                pruefeWahr('Ohne KI: Block als Ersatz markiert',
                    Array.from(d21.querySelectorAll('#stmt-crit .crit')).every(c => c.getAttribute('data-ai') === '0'));
                pruefeWahr('Einschätzung steht unter dem Bereich',
                    t21.includes('Einschätzung: Positionswechsel im Bett „überwiegend selbständig“ · Treppensteigen „unselbständig“'));
                pruefe('Modul-5-Satz genau einmal', (t21.match(/Modul 5 kommt damit auf/g) || []).length, 1);
                /* Die Kennung eines Bereichs muss das HTML-Attribut unbeschaedigt ueberstehen. Sie war
                   nach zwei Zeichen abgeschnitten (escapeHtml maskierte keine Anfuehrungszeichen) -
                   jeder Bereich wurde bei jedem Klick neu geschrieben, Handkorrekturen gingen verloren. */
                const m1Block = d21.querySelector('.crit[data-nr="M1"]');
                pruefe('Kennung des Bereichs uebersteht das Attribut',
                    m1Block ? m1Block.getAttribute('data-vals') : null, (antragBereiche().find(b => b.nr === 'M1') || {}).sig);
                pruefe('Anfuehrungszeichen werden maskiert', escapeHtml("a \"b\" 'c'"), 'a &quot;b&quot; &#39;c&#39;');
                const hmSp = ERFASSUNG_TABELLEN.find(x => x.id === 'hilfsmittel');
                const feldDiv = document.createElement('div');
                feldDiv.innerHTML = erfFeld(hmSp, 0, hmSp.spalten[0], 'Rollator "Premium" mit Korb');
                pruefe('Eingabe mit Anfuehrungszeichen bleibt vollstaendig im Feld',
                    (feldDiv.querySelector('input') || {}).value, 'Rollator "Premium" mit Korb');
                pruefeWahr('Tabelle ohne „abweichende Bepunktung"', !t21.includes('abweichenden Bepunktung'));
                d21 = bau21({ M1: 'Das Aufstehen gelingt nur noch mit Hilfe des Ehemannes.' });
                pruefeWahr('Mit KI-Text: Absatz steht im Bereich und ist markiert',
                    (d21.querySelector('.crit[data-nr="M1"]') || {}).getAttribute
                    && d21.querySelector('.crit[data-nr="M1"]').getAttribute('data-ai') === '1'
                    && d21.querySelector('.crit[data-nr="M1"]').innerText.includes('Hilfe des Ehemannes'));

                // Befundtabellen ohne NBA-Kriterien – die stehen in den Lebensbereichen (Regel 17)
                befundLaden({ werte: { 'schuerzengriff|rechts': 1 } });
                const bb = befundBlock();
                pruefeWahr('Befundtabellen enthalten Befunde', bb.includes('Schürzengriff'));
                pruefeWahr('Befundtabellen enthalten keine NBA-Kriterien', !/Positionswechsel im Bett/.test(bb));

                // 21c. Die Anweisung an die KI – Antrag, kein Widerspruch
                const p21 = buildAntragPrompt(antragBereiche(), true);
                const sys21 = generateBegruendungenAntrag.toString();
                pruefeWahr('KI bekommt je Bereich die Kennung', /--- M1: Mobilität ---/.test(p21) && /--- M5: /.test(p21));
                pruefeWahr('KI sieht, was sich verschlechtert hat', p21.includes('VERSCHLECHTERT'));
                pruefeWahr('KI-Vorgabe verbietet BRi-Zitate und Ableitungssatz',
                    sys21.includes('jedes Zitat aus den Begutachtungs-Richtlinien') && sys21.includes('ableitbar'));
                pruefeWahr('KI-Vorgabe nennt den Zweck: Fragebogen ersetzen', sys21.includes('ersetzt den Fragebogen'));
                pruefeWahr('Keine Stilbeispiele aus Widersprüchen im Antrag', !sys21.includes('getStilBeispiele'));
                pruefeWahr('Keine „Widerspruch"-Rahmung in der Eingabe', !/gesamten Widerspruchs/.test(p21));
                pruefeWahr('Einleitung verweist auf die Lebensbereiche',
                    allgemeinAufgabe('hoeherstufung').includes('Einschränkungen in den Lebensbereichen'));
                pruefeWahr('Widerspruch behält seinen Verweis',
                    allgemeinAufgabe('widerspruch').includes('Befund und Stellungnahme'));
                pruefe('Antrag: Absatz höchstens 5 Sätze / 110 Wörter', [satzGrenze(), wortGrenze()], [5, 110]);
                pruefeWahr('Zu langer Bereich wird erkannt',
                    laengenVerstoesse({ M1: 'Wort '.repeat(130) }, '', '').some(v => v.nr === 'M1'));
                setzeModus('widerspruch');
                pruefe('Widerspruch: Grenzen unverändert', [satzGrenze(), wortGrenze()], [5, 150]);
                setzeModus('hoeherstufung');

                // 21d. Genau der gemeldete Fall: KI fällt aus, dann klappt es
                const docEl = document.getElementById('appeal-document');
                const notizFeld = document.getElementById('erstgespraech-notes');
                if (docEl && notizFeld) {
                    if (typeof userApiKey !== 'undefined') userApiKey = 'TEST-OHNE-NETZ';
                    notizFeld.value = '';                    // ohne Notizen keine Rechtschreibprüfung
                    document.getElementById('stam-anamnese').value = 'Langer Anamnesetext des Vorgutachtens. '.repeat(120);
                    setzeStellungnahme('');
                    let aufrufe = 0, antragAufrufe = 0;
                    window.callGeminiWithFallback = async () => { aufrufe++; throw new Error('429 (Test)'); };
                    await generateAppealText();
                    const erst = docEl.innerHTML;
                    pruefeWahr('KI aus: kein Rohtext der Anamnese', erst.indexOf('Langer Anamnesetext') === -1);
                    pruefeWahr('KI aus: Abschnitt „Angaben laut Vorgutachten" entfällt', erst.indexOf('Angaben laut Vorgutachten') === -1);
                    pruefeWahr('KI aus: Bereiche als Ersatz markiert', /class="crit bereich"[^>]*data-ai="0"/.test(erst));

                    window.callGeminiWithFallback = async (payload) => {
                        aufrufe++;
                        const props = payload.generationConfig && payload.generationConfig.responseSchema
                            && payload.generationConfig.responseSchema.properties;
                        if (props && props.bereiche) {
                            antragAufrufe++;
                            return { candidates: [{ content: { parts: [{ text: JSON.stringify({
                                bereiche: [{ nr: 'M1', text: 'Treppen kann sie nicht mehr allein steigen.' },
                                           { nr: 'M4', text: 'Beim Ankleiden des Oberkörpers hilft der Ehemann.' },
                                           { nr: 'M5', text: 'Die Medikamente werden gereicht.' },
                                           { nr: 'M9', text: 'Erfundener Bereich.' }],
                                anamnese: 'Kurzfassung des Vorgutachtens in wenigen Sätzen.',
                                allgemein: 'Aktuelle Lage in knapper Form.' }) }] } }] };
                        }
                        throw new Error('unerwarteter Aufruf');
                    };
                    await generateAppealText();
                    const zweit = docEl.innerHTML;
                    pruefe('Zweiter Versuch: genau ein KI-Aufruf für den Antrag', antragAufrufe, 1);
                    pruefeWahr('Zweiter Versuch: Ersatzblöcke durch KI-Text ersetzt',
                        zweit.includes('Treppen kann sie nicht mehr allein steigen.')
                        && !/class="crit bereich"[^>]*data-ai="0"/.test(zweit));
                    pruefeWahr('Zweiter Versuch: Kurzfassung des Vorgutachtens steht da',
                        zweit.includes('Kurzfassung des Vorgutachtens in wenigen Sätzen.'));
                    pruefeWahr('Ein von der KI erfundener Bereich fällt weg', zweit.indexOf('Erfundener Bereich') === -1);

                    // Ein älteres Antragsdokument (alter Aufbau, drei Seiten Rohtext) wird umgebaut
                    const alt = '<div class="stmt" data-vorgang="hoeherstufung"><h2>Anamnese</h2>'
                        + '<h3>Angaben laut Vorgutachten</h3><div id="stmt-anamnese" data-ai="0"><p>'
                        + 'Roher Text. '.repeat(400) + '</p></div><h3>Aktuelle Situation</h3><div id="stmt-notes" data-sig="x" data-ai="0"></div>'
                        + '<h2>Befund und Stellungnahme</h2><div id="stmt-crit"><div class="crit" data-nr="4.1.1" data-vals="a|b">'
                        + '<div>Die Einstufung ergibt sich aus dem erhobenen Befund und den Angaben zur Versorgung.</div></div></div></div>';
                    const gemischt = document.createElement('div');
                    gemischt.innerHTML = mergeStellungnahme(alt, buildHoeherstufung('', {}, '', ''));
                    const gt = gemischt.innerText;
                    pruefeWahr('Altes Dokument: Rohtext der Anamnese entfernt', gt.indexOf('Roher Text.') === -1);
                    pruefeWahr('Altes Dokument: leere Überschrift entfernt', gt.indexOf('Angaben laut Vorgutachten') === -1);
                    pruefeWahr('Altes Dokument: Abschnitt heißt jetzt Lebensbereiche',
                        gt.includes('Einschränkungen in den Lebensbereichen') && !gt.includes('Befund und Stellungnahme'));
                    pruefeWahr('Altes Dokument: Füllsätze je Kriterium verschwunden',
                        gt.indexOf('Die Einstufung ergibt sich') === -1);
                    // Eine von der KI erzeugte Kurzfassung bleibt, auch wenn diesmal keine neue kommt
                    const mitKurz = alt.replace('data-ai="0"><p>' + 'Roher Text. '.repeat(400), 'data-ai="1"><p>Kurz.');
                    gemischt.innerHTML = mergeStellungnahme(mitKurz, buildHoeherstufung('', {}, '', ''));
                    pruefeWahr('Vorhandene Kurzfassung bleibt erhalten', gemischt.innerText.includes('Kurz.'));
                }

                // 21e. Seitenzahl: ein voller Fall passt in rund 7 Seiten
                if (typeof seitenAufteilen === 'function' && typeof injectStellungnahmeCss === 'function') {
                    injectStellungnahmeCss();
                    leer21();
                    ITEMS.filter(i => i.opts && i.m !== 5).forEach((i, k) => { if (k % 2 === 0) stateEigene.values[i.id] = 2; });
                    stateEigene.values[id21('4.5.1')] = { count: 6, period: 'D' };
                    stateEigene.values[id21('4.5.13')] = { count: 2, period: 'M' };
                    const satz = 'Die versicherte Person benötigt dabei regelmäßig personelle Unterstützung durch den Ehemann. ';
                    const texte = {}; ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].forEach(m => { texte[m] = satz.repeat(8); });
                    ensureDiagRows(12);
                    for (let n = 1; n <= 12; n++) {
                        document.getElementById('diag-icd-' + n).value = 'I' + (10 + n) + '.9';
                        document.getElementById('diag-txt-' + n).value = 'Diagnose Nummer ' + n;
                    }
                    erfassungLaden({ tabellen: {
                        pflegepersonen: [{ art: 'Pflegeperson', name: 'A B', tage: '7', stunden: '2', unterstuetzung: 'Körperpflege, Haushalt' },
                                         { art: 'Pflegeperson', name: 'C D', tage: '2', stunden: '5', unterstuetzung: 'Einkäufe' }],
                        hilfsmittel: Array.from({ length: 10 }, (_, k) => ({ bezeichnung: 'Hilfsmittel ' + k, nutzung: 'genutzt' })),
                        arztbesuche: [{ fach: 'Hausarzt', anzahl: '2', zeitraum: 'pro Monat', begleitung: 'in Begleitung' }],
                        medikation: [{ applikation: 'oral (Tabletten, Tropfen, Säfte)', anzahl: '2', zeitraum: 'pro Tag', unterstuetzung: 'Gabe durch Pflegeperson' }]
                    }, extra: { pg: '3' } });
                    befundLaden({ texte: { groesse: '160', gewicht: '80' }, werte: { 'schuerzengriff|rechts': 1, 'schuerzengriff|links': 1, gangbild: 2 } });
                    document.getElementById('stam-anamnese').value = 'Anamnese.';
                    const html = buildHoeherstufung('', texte, 'Aktuelle Situation. '.repeat(25), 'Vorgutachten. '.repeat(20));
                    const q = document.createElement('div');
                    q.style.cssText = 'position:absolute;left:-10000px;top:0;width:170mm';
                    q.innerHTML = html;
                    document.body.appendChild(q);
                    const z = document.createElement('div');
                    z.style.cssText = 'position:absolute;left:-10000px;top:0';
                    document.body.appendChild(z);
                    const seiten = seitenAufteilen(q, z);
                    q.remove(); z.remove();
                    pruefeWahr('Voller Höherstufungsantrag: höchstens ' + LAENGE.antragSeitenMax + ' Seiten (gemessen: ' + seiten + ')',
                        seiten > 0 && seiten <= LAENGE.antragSeitenMax);
                }
            } finally {
                window.callGeminiWithFallback = merk21.ki;
                if (typeof userApiKey !== 'undefined') userApiKey = merk21.key;
                stateOrig = merk21.orig; stateEigene = merk21.eigen;
                befundLaden(merk21.bef); erfassungLaden(merk21.erf);
                document.getElementById('stam-anamnese').value = merk21.anam;
                document.getElementById('stam-befund').value = merk21.befTxt;
                const nf = document.getElementById('erstgespraech-notes'); if (nf) nf.value = merk21.notes;
                const de = document.getElementById('appeal-document'); if (de) de.innerHTML = merk21.doc;
                appealDraft = merk21.draft;
                const box = document.getElementById('appeal-result-container');
                if (box) box.style.display = (merk21.doc || '').trim() ? 'block' : 'none';
                setzeModus(merk21.modus);
                hideOverlay();
            }
        }

        /* 22. Fassung der Begutachtungs-Richtlinien.
           Jedes Schriftstück nennt unter der Überschrift die Rechtsgrundlage. Sie muss in
           allen vier Vorgangsarten dieselbe und die geltende sein: erlassen am 21.08.2024,
           in Kraft seit 26.09.2024. Die Vorgängerfassung darf nirgends mehr auftauchen. */
        {
            const merk22 = { modus: appModus };
            try {
                const ueberholt = /2017|Dezember 2023/;
                const bauen = {
                    widerspruch: () => buildStellungnahme('', {}, ''),
                    anhoerung: () => buildAnhoerung('', {}, ''),
                    erstantrag: () => buildHoeherstufung('', {}, '', ''),
                    hoeherstufung: () => buildHoeherstufung('', {}, '', '')
                };
                Object.keys(bauen).forEach(m => {
                    setzeModus(m);
                    const h = document.createElement('div');
                    h.innerHTML = bauen[m]();
                    const zeile = h.querySelector('#stmt-grundlage');
                    pruefeWahr(m + ': Zeile zur Rechtsgrundlage vorhanden', !!zeile);
                    const t = zeile ? zeile.textContent : '';
                    pruefeWahr(m + ': Richtlinien vom 21. August 2024', t.includes('vom 21. August 2024'));
                    pruefeWahr(m + ': Inkrafttreten 26. September 2024',
                        t.includes('in Kraft getreten am 26. September 2024'));
                    pruefeWahr(m + ': Rechtsgrundlage § 17 Absatz 1 SGB XI genannt', t.includes('§ 17 Absatz 1 SGB XI'));
                    pruefeWahr(m + ': keine überholte Fassung im Schriftstück', !ueberholt.test(h.textContent));
                });
                // Ein früher gespeichertes Schriftstück trägt die alte Zeile noch ohne Kennung
                setzeModus('widerspruch');
                const altDoc = '<div class="stmt" data-vorgang="widerspruch"><h1>Pflegefachliche Stellungnahme</h1>'
                    + '<p>auf Grundlage der Richtlinien des Medizinischen Dienstes Bund zur Feststellung der '
                    + 'Pflegebedürftigkeit nach dem SGB XI vom 21. Dezember 2023</p>'
                    + '<div class="data-block" id="stmt-data"></div>'
                    + '<h2>Begründung</h2><div id="stmt-crit"></div></div>';
                const zus = document.createElement('div');
                zus.innerHTML = mergeStellungnahme(altDoc, buildStellungnahme('', {}, ''));
                pruefeWahr('Gespeichertes Schriftstück: alte Fassung verschwindet beim Aktualisieren',
                    zus.textContent.indexOf('21. Dezember 2023') === -1);
                pruefeWahr('Gespeichertes Schriftstück: geltende Fassung steht danach da',
                    zus.textContent.includes('vom 21. August 2024'));
                // Beruft sich die KI auf die alte Fassung, wird die Stelle gemeldet
                if (typeof ueberholteBegriffeImText === 'function') {
                    pruefeWahr('Berufung auf die Fassung von 2017 wird gemeldet',
                        ueberholteBegriffeImText('Nach den Begutachtungs-Richtlinien von 2017 gilt anderes.')
                            .some(f => /2017/.test(f.wort)));
                    pruefe('Die geltende Fassung wird nicht angemahnt',
                        ueberholteBegriffeImText(BRI_GRUNDLAGE_SATZ).length, 0);
                }
            } finally {
                setzeModus(merk22.modus);
            }
        }

        /* 23. Fazit bei gleichem Pflegegrad.
           Ergibt die eigene Einschätzung denselben Pflegegrad wie das Gutachten, heißt es
           „berücksichtigt … hinreichend" und „weiterhin den Pflegegrad". Bei einem höheren
           Ergebnis bleibt die bisherige Formulierung. Der Pflegegrad wird hier über eine
           ersetzte Berechnung vorgegeben – nur pg und total, alles andere rechnet echt. */
        {
            const ids23 = ['stam-pg-manual', 'stam-pts-manual', 'anh-pg', 'anh-pts', 'stam-antrag', 'stam-betreffend',
                           'stam-organisation', 'stam-begutachtung'];
            const merk23 = { modus: appModus, calc: window.calculateInternal,
                             extra: JSON.parse(JSON.stringify(erfassungExtra || {})),
                             felder: ids23.map(id => { const el = document.getElementById(id); return el ? el.value : null; }) };
            const setze = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            const fazit = html => {
                const d = document.createElement('div'); d.innerHTML = html;
                const p = d.querySelector('#stmt-fazit');
                return { el: p, text: p ? p.textContent.replace(/\s+/g, ' ').trim() : '' };
            };
            const vorgabe = (orig, zweit, eigen) => {
                window.calculateInternal = s => Object.assign({}, merk23.calc(s),
                    s === 'own' ? { pg: eigen, total: 60 } : s === 'zweit' ? { pg: zweit, total: 45 } : { pg: orig, total: 50 });
            };
            try {
                pruefe('Pflegegrad lesen: leer, 0 und „kein" sind gleich',
                    [pflegegradZahl(''), pflegegradZahl(0), pflegegradZahl('kein Pflegegrad')], [0, 0, 0]);
                pruefe('Pflegegrad lesen: „Pflegegrad 4" und 4', [pflegegradZahl('Pflegegrad 4'), pflegegradZahl(4)], [4, 4]);
                ['stam-pg-manual', 'stam-pts-manual', 'anh-pg', 'anh-pts', 'stam-organisation', 'stam-begutachtung']
                    .forEach(id => setze(id, ''));
                setze('stam-antrag', '2026-03-01'); setze('stam-betreffend', 'Frau Erika Mahl');

                // Widerspruch
                setzeModus('widerspruch');
                vorgabe(3, 3, 3);
                let f = fazit(buildStellungnahme('', {}, ''));
                pruefe('Widerspruch gleich: Art', f.el && f.el.getAttribute('data-art'), 'gleich');
                pruefeWahr('Widerspruch gleich: „berücksichtigt … hinreichend"',
                    /berücksichtigt die tatsächlichen Einschränkungen von Frau Erika Mahl hinreichend\./.test(f.text)
                    && !/nicht hinreichend/.test(f.text));
                pruefeWahr('Widerspruch gleich: „weiterhin den Pflegegrad 3 ab dem 01.03.2026 (Antragsdatum)"',
                    f.text.includes('der gemäß den Richtlinien weiterhin den Pflegegrad 3 ab dem 01.03.2026 (Antragsdatum) rechtfertigt.'));
                pruefeWahr('Widerspruch gleich: Gutachten mit Pflegegrad und Punkten genannt',
                    f.text.includes('mit einem Pflegegrad 3 und 50,00 Punkten'));
                vorgabe(2, 2, 3);
                f = fazit(buildStellungnahme('', {}, ''));
                pruefe('Widerspruch höher: Art', f.el && f.el.getAttribute('data-art'), 'abweichend');
                pruefeWahr('Widerspruch höher: bisherige Formulierung bleibt',
                    f.text.includes('von Frau Erika Mahl nicht hinreichend.')
                    && f.text.includes('der gemäß den Richtlinien den Pflegegrad 3 ab dem')
                    && !f.text.includes('weiterhin'));
                /* Handeingabe in anderer Schreibweise. Das Gutachten hat hier KEINE erfassten
                   Einzelkriterien (sonst gälte deren Rechnung, siehe gutachtenAngaben). */
                window.calculateInternal = s => Object.assign({}, merk23.calc(s),
                    s === 'own' ? { pg: 3, total: 60 } : { pg: 0, total: 0 });
                setze('stam-pg-manual', 'Pflegegrad 3');
                f = fazit(buildStellungnahme('', {}, ''));
                pruefe('Widerspruch: Handeingabe „Pflegegrad 3" zählt als gleich', f.el && f.el.getAttribute('data-art'), 'gleich');
                setze('stam-pg-manual', '');

                // Aktualisieren: aus „nicht hinreichend" wird „hinreichend" …
                vorgabe(3, 3, 4);
                const altDoc = buildStellungnahme('', {}, '');
                vorgabe(3, 3, 3);
                let z = fazit(mergeStellungnahme(altDoc, buildStellungnahme('', {}, '')));
                pruefeWahr('Aktualisieren: Fazit wechselt auf „hinreichend … weiterhin"',
                    !z.text.includes('nicht hinreichend') && z.text.includes('weiterhin den Pflegegrad 3'));
                // … auch in einem älteren Schriftstück ohne Kennung
                const ohneId = altDoc.replace(/ id="stmt-fazit" data-art="abweichend"/, '');
                pruefeWahr('Älteres Schriftstück hat noch keine Kennung', ohneId.indexOf('stmt-fazit') === -1);
                z = fazit(mergeStellungnahme(ohneId, buildStellungnahme('', {}, '')));
                pruefeWahr('Älteres Schriftstück: Fazit wird erkannt und angepasst',
                    !!z.el && !z.text.includes('nicht hinreichend') && z.text.includes('weiterhin'));
                // … eine Handkorrektur bleibt, solange die Art gleich bleibt
                const handDoc = buildStellungnahme('', {}, '').replace('hinreichend.', 'hinreichend. HANDKORREKTUR.');
                z = fazit(mergeStellungnahme(handDoc, buildStellungnahme('', {}, '')));
                pruefeWahr('Aktualisieren bei gleicher Art: Handkorrektur im Fazit bleibt', z.text.includes('HANDKORREKTUR'));

                // Anhörung: beide Gutachten müssen gleich sein
                setzeModus('anhoerung');
                vorgabe(3, 3, 3);
                f = fazit(buildAnhoerung('', {}, ''));
                pruefeWahr('Anhörung gleich: „berücksichtigen … hinreichend … weiterhin den Pflegegrad 3"',
                    /berücksichtigen die tatsächlichen Einschränkungen von Frau Erika Mahl hinreichend\./.test(f.text)
                    && f.text.includes('weiterhin den Pflegegrad 3 ab dem'));
                vorgabe(2, 3, 3);
                f = fazit(buildAnhoerung('', {}, ''));
                pruefeWahr('Anhörung: Erstgutachten niedriger – bisherige Formulierung',
                    f.text.includes('nicht hinreichend') && !f.text.includes('weiterhin'));

                // Höherstufungsantrag: Vorgutachten mit gleichem Pflegegrad
                setzeModus('hoeherstufung');
                erfassungExtra = Object.assign({}, merk23.extra, { pg: '3', vorgutachten: '2025-11-20' });
                vorgabe(3, 3, 3);
                f = fazit(buildHoeherstufung('', {}, '', ''));
                pruefe('Höherstufung gleich: Art', f.el && f.el.getAttribute('data-art'), 'gleich');
                pruefeWahr('Höherstufung gleich: Vorgutachten „hinreichend" berücksichtigt',
                    f.text.startsWith('Das vorliegende Gutachten') && f.text.includes('vom 20.11.2025 mit einem Pflegegrad 3')
                    && /von Frau Erika Mahl hinreichend\./.test(f.text));
                pruefeWahr('Höherstufung gleich: „weiterhin den Pflegegrad 3"',
                    f.text.includes('der gemäß den Richtlinien weiterhin den Pflegegrad 3 ab dem 01.03.2026 (Antragsdatum) rechtfertigt.')
                    && !f.text.includes('mindestens'));
                erfassungExtra.pg = '2';
                vorgabe(2, 2, 3);                                  // Vorgutachten auch rechnerisch Pflegegrad 2
                f = fazit(buildHoeherstufung('', {}, '', ''));
                pruefeWahr('Höherstufung höher: bisherige Formulierung bleibt',
                    f.text.startsWith('Unter Berücksichtigung der oben genannten Einschätzung ergibt sich ein Punktwert von mindestens')
                    && !f.text.includes('weiterhin'));
                erfassungExtra.pg = '';
                vorgabe(0, 0, 3);
                f = fazit(buildHoeherstufung('', {}, '', ''));
                pruefe('Höherstufung ohne Pflegegrad des Vorgutachtens: kein Vergleich', f.el && f.el.getAttribute('data-art'), 'abweichend');

                // Erstantrag: es gibt kein Vorgutachten, also nie „weiterhin"
                setzeModus('erstantrag');
                erfassungExtra.pg = '3';
                vorgabe(3, 3, 3);
                f = fazit(buildHoeherstufung('', {}, '', ''));
                pruefeWahr('Erstantrag: bisherige Formulierung', f.text.includes('mindestens') && !f.text.includes('weiterhin'));
                erfassungExtra.pg = '';

                /* Eigene Einschätzung NIEDRIGER als das Gutachten: Hinweis auf das Risiko einer
                   Rückstufung, kein „rechtfertigt" und kein Antragsdatum. */
                const RUECK = 'Es besteht ein geringerer Pflegegrad und das reelle Risiko einer Rückstufung.';
                setzeModus('widerspruch');
                vorgabe(3, 3, 2);
                f = fazit(buildStellungnahme('', {}, ''));
                pruefe('Widerspruch niedriger: Art', f.el && f.el.getAttribute('data-art'), 'niedriger');
                pruefeWahr('Widerspruch niedriger: Wortlaut vollständig',
                    f.text === 'Das vorliegende Gutachten des Medizinischen Dienstes vom — mit einem Pflegegrad 3 und 50,00 Punkten '
                        + 'berücksichtigt die tatsächlichen Einschränkungen von Frau Erika Mahl nicht hinreichend. '
                        + 'Unter Berücksichtigung der oben genannten Korrekturen ergibt sich ein Punktwert von 60,00 Punkten. ' + RUECK);
                // Aktualisieren: aus „weiterhin" (gleich) wird der Rückstufungshinweis
                vorgabe(3, 3, 3);
                const gleichDoc = buildStellungnahme('', {}, '');
                vorgabe(3, 3, 2);
                z = fazit(mergeStellungnahme(gleichDoc, buildStellungnahme('', {}, '')));
                pruefeWahr('Aktualisieren: Fazit wechselt auf den Rückstufungshinweis',
                    z.text.endsWith(RUECK) && !z.text.includes('weiterhin'));
                // und zurück, wenn die Einschätzung wieder höher ausfällt
                const rueckDoc = buildStellungnahme('', {}, '');
                vorgabe(3, 3, 4);
                z = fazit(mergeStellungnahme(rueckDoc, buildStellungnahme('', {}, '')));
                pruefeWahr('Aktualisieren: Rückstufungshinweis verschwindet bei höherem Ergebnis',
                    !z.text.includes('Rückstufung') && z.text.includes('den Pflegegrad 4 ab dem'));

                setzeModus('anhoerung');
                vorgabe(3, 3, 2);
                f = fazit(buildAnhoerung('', {}, ''));
                pruefeWahr('Anhörung niedriger: Rückstufungshinweis',
                    f.el && f.el.getAttribute('data-art') === 'niedriger'
                    && f.text.includes('berücksichtigen die tatsächlichen Einschränkungen von Frau Erika Mahl nicht hinreichend.')
                    && f.text.endsWith('ergibt sich ein Punktwert von 60,00 Punkten. ' + RUECK));
                vorgabe(2, 3, 3);
                f = fazit(buildAnhoerung('', {}, ''));
                pruefeWahr('Anhörung: gleich dem Zweitgutachten ist kein Rückstufungsfall', !f.text.includes('Rückstufung'));

                setzeModus('hoeherstufung');
                erfassungExtra.pg = '3';
                vorgabe(3, 3, 2);
                f = fazit(buildHoeherstufung('', {}, '', ''));
                pruefeWahr('Höherstufung niedriger: Rückstufungshinweis',
                    f.el && f.el.getAttribute('data-art') === 'niedriger'
                    && f.text.startsWith('Das vorliegende Gutachten') && f.text.includes('vom 20.11.2025 mit einem Pflegegrad 3')
                    && f.text.includes('von Frau Erika Mahl nicht hinreichend.')
                    && f.text.endsWith('ergibt sich ein Punktwert von 60,00 Punkten. ' + RUECK));
                setzeModus('erstantrag');
                f = fazit(buildHoeherstufung('', {}, '', ''));
                pruefeWahr('Erstantrag: nie ein Rückstufungshinweis', !f.text.includes('Rückstufung'));
            } finally {
                window.calculateInternal = merk23.calc;
                erfassungExtra = merk23.extra;
                ids23.forEach((id, k) => { const el = document.getElementById(id); if (el && merk23.felder[k] !== null) el.value = merk23.felder[k]; });
                setzeModus(merk23.modus);
            }
        }

        /* 24. Übernommener Vorschlag bekommt eine Begründung.
           Gemeldet: Vorschlag für 4.4.6 übernommen, in der Stellungnahme stand dazu nur die
           Überschrift und der Ableitungssatz. Übernommen wurde nur die Bewertung; Begründung
           und Fundstelle gingen verloren, die KI ließ das Kriterium aus, und der Ersatzblock
           blieb still stehen. Nachgestellt: Vorschlag übernehmen, KI lässt 4.4.6 zuerst aus. */
        if (typeof uebernehmeVorschlaege === 'function' && typeof generateAppealText === 'function') {
            const merk24 = {
                modus: appModus, orig: JSON.parse(JSON.stringify(stateOrig)), eigen: JSON.parse(JSON.stringify(stateEigene)),
                gruende: JSON.parse(JSON.stringify(vorschlagGruende)), liste: vorschlagListe,
                notes: document.getElementById('erstgespraech-notes') ? document.getElementById('erstgespraech-notes').value : '',
                doc: (document.getElementById('appeal-document') || {}).innerHTML || '', draft: appealDraft,
                key: (typeof userApiKey !== 'undefined') ? userApiKey : '', ki: window.callGeminiWithFallback,
                toast: window.showToast
            };
            const id24 = nr => ITEMS.find(i => i.nr === nr).id;
            const i446 = ITEMS.find(i => i.nr === '4.4.6');
            let meldung = '';
            try {
                setzeModus('widerspruch');
                ITEMS.forEach(i => {
                    const l = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0;
                    stateOrig.values[i.id] = JSON.parse(JSON.stringify(l));
                    stateEigene.values[i.id] = JSON.parse(JSON.stringify(l));
                });
                stateOrig.values[id24('4.4.6')] = 1; stateEigene.values[id24('4.4.6')] = 1;
                stateEigene.values[id24('4.1.1')] = 1;                         // zweite Abweichung, von Hand
                vorschlagGruende = {};

                // 24a. Vorschlag übernehmen: Bewertung UND Begründung werden gemerkt
                vorschlagListe = [{ item: i446, stufe: 2, alt: 1,
                    begruendung: 'Beim Anziehen von Hose und Strümpfen hilft die Tochter täglich, weil die Person sich nicht bücken kann.',
                    fundstelle: 'Hilfe beim Anziehen der Strümpfe durch die Tochter' }];
                renderVorschlaege();
                const box24 = document.querySelector('#vorschlag-body input[type="checkbox"]');
                if (box24) box24.checked = true;
                window.showToast = (t) => { meldung = t; };
                uebernehmeVorschlaege();
                pruefe('Vorschlag: Bewertung übernommen', stateEigene.values[id24('4.4.6')], 2);
                pruefeWahr('Vorschlag: Begründung und Fundstelle gemerkt',
                    !!vorschlagGruende['4.4.6'] && vorschlagGruende['4.4.6'].stufe === 2
                    && /Tochter täglich/.test(vorschlagGruende['4.4.6'].begruendung)
                    && /Strümpfe/.test(vorschlagGruende['4.4.6'].fundstelle));

                // 24b. Die Begründung geht als Grundlage an die KI – nur bei dieser Stufe
                const d446 = computeDiffs().find(d => d.nr === '4.4.6');
                const prompt24 = buildBegruendungPrompt([d446], false);
                pruefeWahr('Prompt: Grundlage des Vorschlags steht beim Kriterium',
                    prompt24.includes('GRUNDLAGE DIESER BEWERTUNG') && prompt24.includes('Tochter täglich')
                    && prompt24.includes('Hilfe beim Anziehen der Strümpfe'));
                pruefeWahr('Prompt: Fundstelle ohne Anführungszeichen wiedergeben', prompt24.includes('OHNE Anführungszeichen'));
                stateEigene.values[id24('4.4.6')] = 3;                         // danach von Hand geändert
                pruefeWahr('Prompt: nach Handänderung keine veraltete Grundlage',
                    !buildBegruendungPrompt([computeDiffs().find(d => d.nr === '4.4.6')], false).includes('GRUNDLAGE DIESER BEWERTUNG'));
                stateEigene.values[id24('4.4.6')] = 2;

                // 24c. Nummern aus der KI-Antwort
                const erl = new Set(['4.4.6', '4.1.1']);
                pruefe('KI-Nummer: „F 4.4.6", „4.4.6: An- …", „5.4.6" werden erkannt',
                    [kiKriteriumNr('F 4.4.6', erl), kiKriteriumNr('4.4.6: An- und Auskleiden', erl), kiKriteriumNr('5.4.6', erl)],
                    ['4.4.6', '4.4.6', '4.4.6']);
                pruefe('KI-Nummer: nicht angefragte Nummer fällt weg', kiKriteriumNr('4.4.7', erl), null);

                // 24d. Ablauf: KI lässt 4.4.6 aus, die App holt es gezielt nach
                const docEl = document.getElementById('appeal-document');
                const notizFeld = document.getElementById('erstgespraech-notes');
                if (docEl && notizFeld) {
                    if (typeof userApiKey !== 'undefined') userApiKey = 'TEST-OHNE-NETZ';
                    notizFeld.value = '';                                    // keine Rechtschreibprüfung
                    setzeStellungnahme('');
                    const abl = e => `Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „${e}" ableitbar.`;
                    const aufrufe24 = [];
                    window.callGeminiWithFallback = async (payload) => {
                        const text = payload.contents[0].parts[0].text;
                        aufrufe24.push(text);
                        const bg = [];
                        if (aufrufe24.length === 1) {
                            bg.push({ nr: '4.1.1', text: 'Die Person kann sich im Bett nur mit Hilfe drehen. ' + abl('überwiegend selbständig') });
                        } else if (text.includes('4.4.6')) {
                            bg.push({ nr: 'F 4.4.6', text: 'Die Tochter hilft täglich beim Anziehen von Hose und Strümpfen. ' + abl('überwiegend unselbständig') });
                        }
                        return { candidates: [{ content: { parts: [{ text: JSON.stringify({ allgemein: aufrufe24.length === 1 ? 'Allgemeine Lage.' : '', begruendungen: bg }) }] } }] };
                    };
                    await generateAppealText();
                    const block = docEl.querySelector('.crit[data-nr="4.4.6"]');
                    pruefe('Nachholen: genau ein zusätzlicher KI-Aufruf', aufrufe24.length, 2);
                    pruefeWahr('Nachholen: der zweite Aufruf fragt nur 4.4.6 an',
                        aufrufe24.length === 2 && aufrufe24[1].includes('Kriterium 4.4.6') && !aufrufe24[1].includes('Kriterium 4.1.1'));
                    pruefeWahr('Erster Aufruf enthält die Grundlage des Vorschlags', /Tochter täglich/.test(aufrufe24[0] || ''));
                    pruefeWahr('4.4.6 hat jetzt eine Begründung',
                        !!block && block.getAttribute('data-ai') === '1' && block.textContent.includes('Anziehen von Hose und Strümpfen'));
                    pruefeWahr('Keine Fehlt-Markierung, wenn alles da ist', !docEl.querySelector('.begruendung-fehlt'));

                    // 24e. Bleibt es trotzdem leer, wird es sichtbar gemeldet
                    setzeStellungnahme('');
                    aufrufe24.length = 0;
                    window.callGeminiWithFallback = async (payload) => {
                        aufrufe24.push(payload.contents[0].parts[0].text);
                        const bg = aufrufe24.length === 1 ? [{ nr: '4.1.1', text: 'Hilfe beim Drehen. ' + abl('überwiegend selbständig') }] : [];
                        return { candidates: [{ content: { parts: [{ text: JSON.stringify({ allgemein: 'Lage.', begruendungen: bg }) }] } }] };
                    };
                    meldung = '';
                    await generateAppealText();
                    const leer = docEl.querySelector('.crit[data-nr="4.4.6"]');
                    pruefeWahr('Weiter leer: Block ist sichtbar markiert',
                        !!leer && leer.getAttribute('data-ai') === '0' && !!leer.querySelector('.begruendung-fehlt'));
                    pruefeWahr('Weiter leer: die Meldung nennt das Kriterium', /4\.4\.6/.test(meldung) && /fehlt die Begründung/.test(meldung));
                    pruefeWahr('Die Markierung zählt nicht als unbelegtes Zitat',
                        !docEl.querySelector('.begruendung-fehlt[data-warn]'));
                    pruefe('Markierung nur beim leeren Kriterium', docEl.querySelectorAll('.begruendung-fehlt').length, 1);

                    /* 24g. Vorschlag in eine BESTEHENDE Stellungnahme einfügen. Sie enthält 4.1.1 mit
                       einer Handänderung; dann wird der Vorschlag für 4.4.6 übernommen. Erwartet:
                       Hinweis „veraltet", nach dem Neu-Erstellen steht 4.4.6 mit Begründung an
                       seinem Platz, die Handänderung bei 4.1.1 bleibt, der Hinweis verschwindet. */
                    stateEigene.values[id24('4.4.6')] = 1;                     // Vorschlag noch nicht übernommen
                    vorschlagGruende = {};
                    setzeStellungnahme('');
                    aufrufe24.length = 0;
                    window.callGeminiWithFallback = async (payload) => {
                        const text = payload.contents[0].parts[0].text;
                        aufrufe24.push(text);
                        const bg = [];
                        if (text.includes('Kriterium 4.1.1')) bg.push({ nr: '4.1.1', text: 'Hilfe beim Drehen im Bett. ' + abl('überwiegend selbständig') });
                        if (text.includes('Kriterium 4.4.6')) bg.push({ nr: '4.4.6', text: 'Die Tochter hilft täglich beim Anziehen von Hose und Strümpfen. ' + abl('überwiegend unselbständig') });
                        return { candidates: [{ content: { parts: [{ text: JSON.stringify({ allgemein: 'Lage.', begruendungen: bg }) }] } }] };
                    };
                    await generateAppealText();
                    const b411 = docEl.querySelector('.crit[data-nr="4.1.1"] div:last-child');
                    if (b411) b411.textContent = b411.textContent + ' HANDÄNDERUNG 4.1.1';
                    pruefe('Bestehende Stellungnahme: 4.4.6 noch nicht enthalten', docEl.querySelectorAll('.crit[data-nr="4.4.6"]').length, 0);
                    vorschlagListe = [{ item: i446, stufe: 2, alt: 1, begruendung: 'Die Tochter hilft täglich beim Anziehen.', fundstelle: '' }];
                    renderVorschlaege();
                    const box24g = document.querySelector('#vorschlag-body input[type="checkbox"]');
                    if (box24g) box24g.checked = true;
                    uebernehmeVorschlaege();
                    pruefeWahr('Nach dem Übernehmen: Stellungnahme als veraltet gekennzeichnet (mit Anlass)',
                        stellungnahmeVeraltet === true && veraltetGruende.includes('4.4.6 (Vorschlag übernommen)'));
                    aufrufe24.length = 0;
                    await generateAppealText();
                    const reihenfolge = Array.from(docEl.querySelectorAll('.crit[data-nr]')).map(e => e.getAttribute('data-nr'));
                    pruefe('Neu erstellt: 4.4.6 steht an seinem Platz', reihenfolge, ['4.1.1', '4.4.6']);
                    const b446 = docEl.querySelector('.crit[data-nr="4.4.6"]');
                    pruefeWahr('Neu erstellt: 4.4.6 mit Begründung und neuer Bewertung',
                        !!b446 && b446.getAttribute('data-ai') === '1' && b446.textContent.includes('Anziehen von Hose')
                        && b446.getAttribute('data-vals') === 'überwiegend selbständig|überwiegend unselbständig');
                    pruefeWahr('Neu erstellt: Handänderung bei 4.1.1 bleibt erhalten',
                        (docEl.querySelector('.crit[data-nr="4.1.1"]') || {}).textContent.includes('HANDÄNDERUNG 4.1.1'));
                    pruefeWahr('Neu erstellt: nur 4.4.6 wurde neu formuliert',
                        aufrufe24.length >= 1 && aufrufe24[0].includes('Kriterium 4.4.6') && !aufrufe24[0].includes('Kriterium 4.1.1'));
                    pruefe('Neu erstellt: Veraltet-Hinweis verschwindet', stellungnahmeVeraltet, false);
                }
                // 24f. Die Grundlagen werden mit dem Fall gespeichert
                pruefeWahr('Fall speichern sichert die Vorschlagsgründe',
                    typeof fallDaten === 'function' && !!fallDaten().vorschlagGruende['4.4.6']
                    && /vorschlagGruende/.test(loadCase.toString()));
            } finally {
                window.callGeminiWithFallback = merk24.ki;
                window.showToast = merk24.toast;
                if (typeof userApiKey !== 'undefined') userApiKey = merk24.key;
                stateOrig = merk24.orig; stateEigene = merk24.eigen;
                vorschlagGruende = merk24.gruende; vorschlagListe = merk24.liste;
                const nf = document.getElementById('erstgespraech-notes'); if (nf) nf.value = merk24.notes;
                const de = document.getElementById('appeal-document'); if (de) de.innerHTML = merk24.doc;
                appealDraft = merk24.draft;
                const box = document.getElementById('appeal-result-container');
                if (box) box.style.display = (merk24.doc || '').trim() ? 'block' : 'none';
                if (typeof closeVorschlaege === 'function') closeVorschlaege();
                setzeModus(merk24.modus);
                hideOverlay();
            }
        }

        /* 25. Jede Änderung wird gespeichert und kommt in der Stellungnahme an.
           a) Nach jeder Änderung, die die Stellungnahme betrifft, wird sie als veraltet
              gekennzeichnet – mit Anlass. Vorher nur nach Korrektur, Kontinenz, Unterlagen.
           b) Die Falldatei enthält Protokoll, Veraltet-Hinweis und Vorschlagsgründe; Laden
              stellt alles wieder her, auch die von Hand bearbeitete Stellungnahme. */
        if (typeof markiereStellungnahmeVeraltet === 'function' && typeof fallDaten === 'function') {
            const id25 = nr => ITEMS.find(i => i.nr === nr).id;
            const dok25 = '<div class="stmt" data-vorgang="widerspruch"><p>Stellungnahme mit HANDÄNDERUNG 25</p></div>';
            const probe = (name, fn, soll) => {
                veraltetZuruecksetzen();
                fn();
                pruefe(name, stellungnahmeVeraltet, soll);
            };
            setzeModus('widerspruch');
            setzeStellungnahme(dok25);
            const i446 = id25('4.4.6');
            const start446 = stateEigene.values[i446];
            const anders = v => (v === 2 ? 3 : 2);
            probe('Veraltet nach übernommenem Vorschlag', () => setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'vorschlag'), true);
            pruefeWahr('Anlass nennt Kriterium und Weg', veraltetGruende.some(g => g === '4.4.6 (Vorschlag übernommen)'));
            pruefeWahr('Hinweis über der Stellungnahme nennt den Anlass',
                veraltetHinweisHtml().includes('4.4.6 (Vorschlag übernommen)') && veraltetHinweisHtml().includes('korrigiert'));
            probe('Veraltet nach Änderung am Regler', () => setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'berater'), true);
            probe('Veraltet nach Befunderhebung (Bewertung)', () => setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'befund'), true);
            probe('Veraltet nach „Modul 5 übernehmen"', () => setzeBewertung('own', id25('4.5.1'), { count: 3, period: 'D' }, 'modul5'), true);
            probe('Import meldet sich nicht selbst (neuer Fall)', () => setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'import'), false);
            probe('Laden meldet sich nicht selbst', () => setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'laden'), false);
            if (typeof setzeBefundText === 'function') probe('Veraltet nach Befundtext', () => setzeBefundText('groesse', undefined, '171'), true);
            if (typeof erfSetzen === 'function') probe('Veraltet nach Eintrag in der Erfassung', () => erfSetzen('hilfsmittel', 0, 'bezeichnung', 'Rollator'), true);
            const nf25 = document.getElementById('erstgespraech-notes');
            if (nf25) probe('Veraltet nach Änderung der Notizen', () => { nf25.value += ' Ergänzung'; nf25.dispatchEvent(new Event('input')); }, true);
            setzeStellungnahme('');
            probe('Ohne Stellungnahme keine Veraltet-Kennzeichnung', () => setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'berater'), false);

            // b) Speichern und Laden im Kreis
            setzeStellungnahme(dok25);
            veraltetZuruecksetzen();
            vorschlagGruende = { '4.4.6': { stufe: 2, begruendung: 'Grund 25', fundstelle: 'Fundstelle 25' } };
            setzeBewertung('own', i446, anders(stateEigene.values[i446]), 'vorschlag');
            const wert446 = stateEigene.values[i446];
            const daten = fallDaten();
            pruefeWahr('Falldatei: Stellungnahme mit Handänderung', (daten.appealDraft || '').includes('HANDÄNDERUNG 25'));
            pruefeWahr('Falldatei: Protokoll mit Ursprung', Array.isArray(daten.bewertungsProtokoll)
                && daten.bewertungsProtokoll.some(e => e.nr === '4.4.6' && e.quelle === BEWERTUNG_QUELLEN.vorschlag));
            pruefeWahr('Falldatei: Veraltet-Hinweis mit Anlass', daten.stellungnahmeVeraltet === true
                && daten.veraltetGruende.includes('4.4.6 (Vorschlag übernommen)'));
            pruefeWahr('Falldatei: Vorschlagsgründe', daten.vorschlagGruende && daten.vorschlagGruende['4.4.6'].begruendung === 'Grund 25');
            const ladeDatei = async d => {
                const f = new File([JSON.stringify(d)], 'Probe, Fall, Widerspruch.json', { type: 'application/json' });
                loadCase({ target: { files: [f], value: '' } });
                await new Promise(r => setTimeout(r, 400));
            };
            // Zwischenstand verändern, damit das Laden etwas zu tun hat
            setzeStellungnahme(''); bewertungsProtokoll = []; veraltetZuruecksetzen(); vorschlagGruende = {};
            await ladeDatei(daten);
            pruefeWahr('Laden: Stellungnahme mit Handänderung wieder da',
                (document.getElementById('appeal-document')?.innerHTML || '').includes('HANDÄNDERUNG 25'));
            pruefe('Laden: Bewertung wieder da', stateEigene.values[i446], wert446);
            pruefeWahr('Laden: Protokoll mit Ursprung wieder da, dazu der Ladevermerk',
                bewertungsProtokoll.some(e => e.nr === '4.4.6' && e.quelle === BEWERTUNG_QUELLEN.vorschlag)
                && bewertungsProtokoll.some(e => e.quelle === BEWERTUNG_QUELLEN.laden));
            pruefeWahr('Laden: Veraltet-Hinweis mit Anlass wieder da',
                stellungnahmeVeraltet === true && veraltetGruende.includes('4.4.6 (Vorschlag übernommen)'));
            pruefeWahr('Laden: Vorschlagsgründe wieder da', !!vorschlagGruende['4.4.6'] && vorschlagGruende['4.4.6'].fundstelle === 'Fundstelle 25');
            // Eine aktuelle Stellungnahme darf beim Laden nicht als veraltet erscheinen
            veraltetZuruecksetzen();
            const aktuell = fallDaten();
            pruefe('Falldatei einer aktuellen Stellungnahme: nicht veraltet', aktuell.stellungnahmeVeraltet, false);
            await ladeDatei(aktuell);
            pruefe('Laden einer aktuellen Stellungnahme: kein Veraltet-Hinweis', stellungnahmeVeraltet, false);
            if (start446 === undefined) delete stateEigene.values[i446]; else stateEigene.values[i446] = start446;
            setzeModus('widerspruch');
        }

        /* 26. Pflegegrad und Punkte eines Gutachtens: Handeingabe gegen Einzelkriterien.
           Gemeldet (Anhörung): Spalte „Vorgutachten" 10,00 Punkte, darunter „Pflegegrad 3",
           im Fazit „47,5 Punkten", beim Zweitgutachten „10.00" und „mit kein Pflegegrad". */
        if (typeof gutachtenAngaben === 'function' && typeof buildAnhoerung === 'function') {
            const merk26 = { modus: appModus, extra: JSON.parse(JSON.stringify(erfassungExtra || {})),
                             orig: JSON.parse(JSON.stringify(stateOrig)), zweit: JSON.parse(JSON.stringify(stateZweit)),
                             eigen: JSON.parse(JSON.stringify(stateEigene)) };
            const set26 = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            try {
                // Bausteine
                pruefe('Punkte: „47,5", „10.00", 25 → deutsch mit zwei Stellen',
                    [punkteDE('47,5'), punkteDE('10.00'), punkteDE(25), punkteDE('')], ['47,50', '10,00', '25,00', '']);
                pruefe('„mit …": nie „mit kein Pflegegrad"',
                    [pflegegradMit(0), pflegegradMit('kein Pflegegrad'), pflegegradMit('3'), pflegegradMit('Pflegegrad 4')],
                    ['der Feststellung keines Pflegegrades', 'der Feststellung keines Pflegegrades', 'Pflegegrad 3', 'Pflegegrad 4']);
                pruefe('Pflegegrad-Wort: nie „Pflegegrad Pflegegrad" oder „Pflegegrad 0"',
                    [pflegegradWort('Pflegegrad 3'), pflegegradWort('3'), pflegegradWort('0'), pflegegradWort('')],
                    ['Pflegegrad 3', 'Pflegegrad 3', 'kein Pflegegrad', 'kein Pflegegrad']);
                let a = gutachtenAngaben({ total: 10, pg: 0 }, '3', '47,5');
                pruefeWahr('Widerspruch Handeingabe/Kriterien: es gilt die Rechnung', a.pg === '0' && a.pts === '10,00' && !!a.widerspruch);
                a = gutachtenAngaben({ total: 0, pg: 0 }, '3', '47,5');
                pruefeWahr('Ohne erfasste Kriterien gilt die Handeingabe', a.pg === '3' && a.pts === '47,50' && !a.widerspruch);
                a = gutachtenAngaben({ total: 50, pg: 3 }, 'Pflegegrad 3', '50');
                pruefeWahr('Passende Handeingabe: kein Widerspruch, Punkte formatiert', a.pg === 'Pflegegrad 3' && a.pts === '50,00' && !a.widerspruch);

                // Der gemeldete Anhörungsfall
                const id26 = nr => ITEMS.find(i => i.nr === nr).id;
                const leer26 = st => ITEMS.forEach(i => { st.values[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
                stateZweit = { special: 0, values: {}, kontinenz: { harn: null, stuhl: null } };
                [stateOrig, stateZweit, stateEigene].forEach(leer26);
                ['4.4.1', '4.4.3'].forEach(nr => { stateOrig.values[id26(nr)] = 3; stateZweit.values[id26(nr)] = 3; });
                ['4.4.1', '4.4.2', '4.4.3', '4.4.4', '4.4.5', '4.4.6'].forEach(nr => { stateEigene.values[id26(nr)] = 3; });
                setzeModus('anhoerung');
                if (typeof renderAnhoerungBereich === 'function') renderAnhoerungBereich();
                set26('stam-pg-manual', '3'); set26('stam-pts-manual', '47,5');
                set26('anh-pg', ''); set26('anh-pts', '10.00');
                const rO26 = calculateInternal('orig'), rE26 = calculateInternal('own');
                const d26 = document.createElement('div'); d26.innerHTML = buildAnhoerung('', {}, '');
                const pgZeile = Array.from(d26.querySelectorAll('table.cmp tr')).map(tr => Array.from(tr.children).map(c => c.textContent.trim()))
                    .find(z => z[0] === 'Pflegegrad') || [];
                pruefe('Anhörung: Pflegegrad-Zeile passt zu den Punkten jeder Spalte',
                    pgZeile.slice(1), [pflegegradWort(rO26.pg), 'kein Pflegegrad', pflegegradWort(rE26.pg)]);
                const fz26 = d26.querySelector('#stmt-fazit').textContent.replace(/\s+/g, ' ');
                pruefeWahr('Anhörung-Fazit: Erstgutachten mit Punkten aus den Kriterien',
                    fz26.includes('mit der Feststellung keines Pflegegrades und ' + punkteDE(rO26.total) + ' Punkten'));
                pruefeWahr('Anhörung-Fazit: kein „47,5", kein „10.00", kein „mit kein Pflegegrad"',
                    !/47,5|10\.00|mit kein Pflegegrad/.test(fz26));
                const w26 = gutachtenWidersprueche();
                pruefeWahr('Widerspruch wird gemeldet und nennt beide Werte',
                    w26.length === 1 && /Erstgutachten/.test(w26[0]) && /Pflegegrad 3/.test(w26[0]) && /47,50/.test(w26[0]));
                pruefeWahr('Hinweis im Reiter „Auswertung"', /passt nicht/.test(gutachtenWiderspruchHtml()));
                const dm = document.createElement('div'); dm.innerHTML = buildAnhoerung('', {}, '');
                const l26 = markiereGutachtenWiderspruch(dm);
                pruefeWahr('Schriftstück: Arbeitshinweis oben, nicht als Zitatfehler gezählt',
                    l26.length >= 1 && !!dm.querySelector('.angaben-widerspruch') && !dm.querySelector('.angaben-widerspruch[data-warn]'));
                set26('stam-pg-manual', ''); set26('stam-pts-manual', '');
                pruefe('Ohne Handeingabe kein Widerspruch', gutachtenWidersprueche().length, 0);

                // Fehlende Pflichtangaben werden genannt
                const nameVor = document.getElementById('stam-betreffend').value;
                set26('stam-betreffend', '');
                pruefeWahr('Fehlender Name wird genannt', fehlendePflichtangaben().includes('Name der versicherten Person'));
                set26('stam-betreffend', nameVor);

                // Widerspruch und Deckblatt: nie „Pflegegrad Pflegegrad"
                setzeModus('widerspruch');
                [stateOrig, stateEigene].forEach(leer26);                  // Gutachten ohne erfasste Kriterien
                stateEigene.values[id26('4.4.1')] = 3;
                set26('stam-pg-manual', 'Pflegegrad 3');
                const dw = buildStellungnahme('', {}, '');
                pruefeWahr('Widerspruch: Eingabe „Pflegegrad 3" ergibt kein „Pflegegrad Pflegegrad"',
                    !/Pflegegrad Pflegegrad/.test(dw) && dw.includes('mit einem <span data-f="opgfazit">Pflegegrad 3</span>'));
                set26('stam-pg-manual', '');
                setzeModus('hoeherstufung');
                erfassungExtra = Object.assign({}, merk26.extra, { pg: '3' });
                const db = buildDeckblatt();
                pruefeWahr('Deckblatt: „Bisheriger Pflegegrad: Pflegegrad 3" ohne Doppelung',
                    db.includes('Pflegegrad 3') && !/Pflegegrad Pflegegrad/.test(db));
            } finally {
                stateOrig = merk26.orig; stateZweit = merk26.zweit; stateEigene = merk26.eigen;
                erfassungExtra = merk26.extra;
                setzeModus(merk26.modus);
            }
        }

    } catch (e) {
        pruefungen.push({ name: 'Testlauf abgebrochen', ok: false, ist: e.message, soll: 'ohne Fehler' });
    } finally {
        // Fall wiederherstellen
        stateOrig = sicherung.orig;
        stateEigene = sicherung.eigen;
        erstgespraechNotes = sicherung.notizen;
        appealDraft = sicherung.entwurf;
        try {
            if (sicherung.zweit) stateZweit = sicherung.zweit;
            if (sicherung.anlagen && typeof anlagenLaden === 'function') anlagenLaden(sicherung.anlagen);
            if (sicherung.befund) befundLaden(sicherung.befund);
            if (sicherung.erfassung) erfassungLaden(sicherung.erfassung);
            if (sicherung.modus) setzeModus(sicherung.modus);
            // Erst genug Diagnosezeilen anlegen (wie beim Laden eines Falls), dann die Felder füllen
            if (typeof ensureDiagRows === 'function' && typeof maxDiagIndex === 'function') {
                ensureDiagRows(maxDiagIndex(sicherung.felder));
            }
            Object.keys(sicherung.felder || {}).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = sicherung.felder[id];
            });
            // Von Tests angelegte, leere Diagnosezeilen wieder entfernen
            const diagBody = document.getElementById('diag-rows-container');
            if (diagBody && sicherung.diagZeilen) {
                const behalten = Math.max(sicherung.diagZeilen, maxDiagIndex(sicherung.felder) + 1);
                while (diagBody.rows.length > behalten) diagBody.deleteRow(-1);
            }
            const notizFeld = document.getElementById('erstgespraech-notes');
            if (notizFeld) notizFeld.value = erstgespraechNotes || '';
        } catch (e) {}
        // Probedateien des Tests wieder aus dem Speicher-Nachweis entfernen
        try {
            if (sicherung.speicherungen === null) localStorage.removeItem(SPEICHER_PROTOKOLL);
            else localStorage.setItem(SPEICHER_PROTOKOLL, sicherung.speicherungen);
        } catch (e) {}
        try { fillTable('own'); calculate('own'); } catch (e) {}
        // Stellungnahme, Protokoll, Veraltet-Hinweis und Vorschlagsgründe zurück – zuletzt,
        // weil die Wiederherstellung der Felder oben selbst Veraltet-Hinweise auslöst.
        try {
            if (typeof setzeStellungnahme === 'function') setzeStellungnahme(sicherung.dokument);
            if (sicherung.protokoll && typeof bewertungsProtokoll !== 'undefined') bewertungsProtokoll = sicherung.protokoll;
            if (typeof vorschlagGruende !== 'undefined') vorschlagGruende = sicherung.vorschlagGruende;
            if (typeof stellungnahmeVeraltet !== 'undefined') {
                stellungnahmeVeraltet = sicherung.veraltet;
                veraltetGruende = sicherung.veraltetGruende;
                const w = document.getElementById('appeal-veraltet');
                if (w && typeof veraltetHinweisHtml === 'function') w.innerHTML = veraltetHinweisHtml();
            }
        } catch (e) {}
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
