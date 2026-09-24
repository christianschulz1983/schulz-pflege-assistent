// Einzige Schreibstelle für Bewertungen (Vorgutachten und eigene Einschätzung).
//
// Grundregel: Nach dem geprüften und bestätigten Import trägt die App von sich aus
// KEINE Punkte mehr ein. Die KI darf ausschliesslich vorschlagen; übernommen wird nur,
// was der Pflegeberater ausdrücklich anhakt. Jede Änderung wird mit ihrer Quelle
// protokolliert und ist im Reiter „Auswertung" einsehbar.

const BEWERTUNG_QUELLEN = {
    import:    'Import – von Ihnen geprüft und bestätigt',
    berater:   'Ihre Eingabe am Regler',
    vorschlag: 'Vorschlag – von Ihnen angehakt',
    befund:    'Ihre Eingabe in der Befunderhebung',
    modul5:    'Erfassung – von Ihnen mit „Modul 5 übernehmen" übertragen',
    laden:     'Gespeicherter Fall geladen'
};

// Quellen, die eine ausdrückliche Handlung des Beraters voraussetzen.
const QUELLEN_MIT_HANDLUNG = ['import', 'berater', 'vorschlag', 'befund', 'modul5', 'laden'];

let bewertungsProtokoll = [];   // { zeit, spalte, nr, titel, alt, neu, quelle }

function bewertungLesbar(item, wert) {
    if (wert === undefined || wert === null) return 'nicht bewertet';
    if (item && item.m === 5 && item.group !== 'D') {
        const o = (typeof wert === 'object') ? wert : { count: 0, period: 'W' };
        return o.count + '× ' + (o.period === 'D' ? 'pro Tag' : o.period === 'W' ? 'pro Woche' : 'pro Monat');
    }
    if (item && item.opts && typeof wert === 'number' && item.opts[wert]) return item.opts[wert];
    return String(wert);
}

// Schreibt einen Wert und hält fest, wer ihn gesetzt hat.
// Ein unbekannter Ursprung wird abgewiesen – so kann sich kein automatischer
// Schreibzugriff mehr einschleichen.
function setzeBewertung(spalte, id, wert, quelle) {
    if (QUELLEN_MIT_HANDLUNG.indexOf(quelle) === -1) {
        console.error('Bewertung abgewiesen – unzulässiger Ursprung:', quelle, 'Kriterium', id);
        return false;
    }
    const zustand = zustandZu(spalte);
    const item = ITEMS.find(i => i.id === id);
    const alt = zustand.values[id];
    if (JSON.stringify(alt) === JSON.stringify(wert)) return false;   // nichts geändert
    zustand.values[id] = wert;
    bewertungsProtokoll.push({
        zeit: new Date().toLocaleTimeString('de-DE'),
        spalte: SPALTEN_NAMEN[spalte] || SPALTEN_NAMEN.own,
        nr: item ? item.nr : String(id),
        titel: item ? item.title : '',
        alt: bewertungLesbar(item, alt),
        neu: bewertungLesbar(item, wert),
        quelle: BEWERTUNG_QUELLEN[quelle] || quelle
    });
    // Eine fertige Stellungnahme passt jetzt nicht mehr. Import und Laden ausgenommen:
    // Beim Import beginnt ein neuer Fall (die Korrektur meldet sich selbst), beim Laden
    // kommt die Stellungnahme mit.
    const anlass = { berater: 'Regler', vorschlag: 'Vorschlag übernommen', befund: 'Befunderhebung',
                     modul5: 'Modul 5 aus der Erfassung' }[quelle];
    if (anlass && typeof markiereStellungnahmeVeraltet === 'function') {
        markiereStellungnahmeVeraltet((item ? item.nr + ' ' : '') + '(' + anlass + ')');
    }
    return true;
}

// Sammeleintrag für den bestätigten Import – die Einzelwerte hat der Berater
// in der Prüfansicht gesehen und freigegeben.
function protokolliereImport(anzahl) {
    bewertungsProtokoll = [{
        zeit: new Date().toLocaleTimeString('de-DE'),
        spalte: 'Vorgutachten und eigene Einschätzung',
        nr: '—', titel: anzahl + ' Kriterien aus dem Gutachten',
        alt: 'leer', neu: 'übernommen',
        quelle: BEWERTUNG_QUELLEN.import
    }];
}

function protokollLeeren() { bewertungsProtokoll = []; }

// Beim Online-Import stammt das Vorgutachten-Ergebnis (Punkte und Pflegegrad) aus der
// Zusammenfassung der KI, nicht aus den Einzelkriterien, die Sie freigegeben haben.
// Weichen beide voneinander ab, wird in der Stellungnahme eine Zahl behauptet, die zur
// Kriterienliste nicht passt. Diese Abweichung wird deshalb ausgewiesen – verändert
// wird nichts, die Entscheidung bleibt beim Berater.
function vorgutachtenAbweichung() {
    if (!stateOrig.extracted) return null;
    const gemerkt = stateOrig.extracted;
    delete stateOrig.extracted;
    let ausKriterien;
    try { ausKriterien = calculateInternal('orig'); } finally { stateOrig.extracted = gemerkt; }
    const gleich = Math.abs(ausKriterien.total - Number(gemerkt.total)) < 0.01
                && ausKriterien.pg === Number(gemerkt.pg);
    if (gleich) return null;
    return {
        lautGutachten: { total: Number(gemerkt.total), pg: Number(gemerkt.pg) },
        ausKriterien: { total: ausKriterien.total, pg: ausKriterien.pg }
    };
}

const MODUL_NAMEN = ['Mobilität', 'Kognitive Fähigkeiten', 'Verhaltensweisen',
                     'Selbstversorgung', 'Krankheitsbedingte Anforderungen', 'Alltagsgestaltung'];

/* WO die Zusammenfassung des Gutachtens und die eingelesenen Kriterien auseinandergehen.
   Gemeldet wurde genau dieser Fall: In der Kriterienliste stand „4.3.13 Vorgutachten:
   selten", in den Modulergebnissen „Modul 3 laut Vorgutachten: 0,00" und in der
   Auswertung „23,75 gegen 27,50" – drei Ansichten, die einander widersprachen, ohne zu
   sagen, wo der Fehler steckt. Diese Prüfung nennt das Modul und die dort bewerteten
   Kriterien, damit das falsch gelesene Kreuz zu finden ist.
   Rückgabe je Modul: was das Gutachten ausweist, was die Kriterien ergeben. */
function modulAbweichungen() {
    if (!stateOrig.extracted) return [];
    const gemerkt = stateOrig.extracted;
    delete stateOrig.extracted;
    let k;
    try { k = calculateInternal('orig'); } finally { stateOrig.extracted = gemerkt; }
    const out = [];
    for (let m = 0; m < 6; m++) {
        const gEinzel = Number(gemerkt.raws[m]), gGew = Number(gemerkt.weights[m]);
        if (!Number.isFinite(gEinzel) || !Number.isFinite(gGew)) continue;
        const kEinzel = Number(k.raws[m]), kGew = Number(k.weights[m]);
        if (Math.round(gEinzel) === Math.round(kEinzel) && Math.abs(gGew - kGew) < 0.005) continue;
        out.push({
            modul: m + 1, name: MODUL_NAMEN[m],
            lautGutachten: { einzel: gEinzel, gew: gGew },
            ausKriterien: { einzel: kEinzel, gew: kGew },
            kriterien: bewerteteKriterien('orig', m + 1)
        });
    }
    return out;
}

// Die in einem Modul überhaupt bewerteten Kriterien – die Kandidaten für ein falsch
// gelesenes Kreuz, wenn die Kriterien MEHR ergeben als das Gutachten ausweist.
function bewerteteKriterien(spalte, m) {
    const st = zustandZu(spalte);
    return ITEMS.filter(i => i.m === m).filter(i => {
        const v = st.values[i.id];
        return (v && typeof v === 'object') ? (Number(v.count) || 0) > 0 : (Number(v) || 0) > 0;
    }).map(i => i.nr);
}

/* Ein Satz je Modul – gleich lautend in der Kriterienliste und in der Auswertung,
   damit beide Ansichten dasselbe sagen. */
function modulAbweichungSatz(a) {
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    const zuViel = a.ausKriterien.gew > a.lautGutachten.gew
                || a.ausKriterien.einzel > a.lautGutachten.einzel;
    return 'Modul ' + a.modul + ' ' + a.name + ': Das Gutachten weist ' + a.lautGutachten.einzel
        + ' Einzelpunkte (' + f2(a.lautGutachten.gew) + ' gewichtet) aus, die eingelesenen '
        + 'Kriterien ergeben ' + a.ausKriterien.einzel + ' (' + f2(a.ausKriterien.gew) + '). '
        + (zuViel
            ? 'Hier wurde beim Einlesen mindestens ein Kreuz zu viel erkannt'
              + (a.kriterien.length ? ' – bewertet sind ' + a.kriterien.join(', ') : '') + '.'
            : 'Hier wurde beim Einlesen mindestens ein Kreuz nicht erkannt.');
}

/* Handeingaben zu Pflegegrad/Punkten, die den erfassten Einzelkriterien widersprechen –
   je nach Vorgang für das (Erst-/Vor-)Gutachten und das Zweitgutachten. Siehe
   gutachtenAngaben in js/basis.js. Rückgabe: lesbare Meldungen. */
function gutachtenWidersprueche() {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const modus = (typeof appModus !== 'undefined') ? appModus : 'widerspruch';
    const out = [];
    if (modus === 'erstantrag') return out;              // kein Gutachten
    const pgHand = (modus === 'hoeherstufung')
        ? ((typeof erfassungExtra !== 'undefined' && erfassungExtra.pg) || '') : g('stam-pg-manual');
    const a = gutachtenAngaben(calculateInternal('orig'), pgHand, g('stam-pts-manual'));
    const name = modus === 'anhoerung' ? 'Erstgutachten' : (modus === 'hoeherstufung' ? 'Vorgutachten' : 'Gutachten');
    if (a.widerspruch) out.push(gutachtenWiderspruchText(name, a.widerspruch));
    if (modus === 'anhoerung') {
        const z = gutachtenAngaben(calculateInternal('zweit'), g('anh-pg'), g('anh-pts'));
        if (z.widerspruch) out.push(gutachtenWiderspruchText('Zweitgutachten', z.widerspruch));
    }
    return out;
}

function gutachtenWiderspruchHtml() {
    const l = gutachtenWidersprueche();
    if (!l.length) return '';
    return '<div class="hinweis-warnung"><b>Bitte prüfen – eingetragener Pflegegrad bzw. Punktwert passt nicht '
         + 'zu den erfassten Einzelkriterien:</b><br>' + l.map(escapeHtml).join('<br>') + '</div>';
}

function abweichungHtml() {
    const a = vorgutachtenAbweichung();
    if (!a) return '';
    const pgTxt = p => p > 0 ? 'Pflegegrad ' + p : 'kein Pflegegrad';
    const z = n => n.toFixed(2).replace('.', ',');
    const module = modulAbweichungen();
    return `<div class="hinweis-warnung">
        <b>Bitte prüfen:</b> Die Angaben im Gutachten und die freigegebenen Einzelkriterien ergeben
        nicht dasselbe Ergebnis. Im Vergleich und in der Stellungnahme wird die Angabe aus dem
        Gutachten verwendet.<br>
        Laut Gutachten: <b>${z(a.lautGutachten.total)} Punkte, ${pgTxt(a.lautGutachten.pg)}</b> &nbsp;·&nbsp;
        Aus den Einzelkriterien errechnet: <b>${z(a.ausKriterien.total)} Punkte, ${pgTxt(a.ausKriterien.pg)}</b>
        ${module.length ? '<br><b>Betroffen sind:</b><br>' + module.map(x => escapeHtml(modulAbweichungSatz(x))).join('<br>') : ''}
        <br>Ursache ist ein Kreuz, das beim Einlesen nicht erkannt oder zu viel erkannt wurde.
        Berichtigen Sie den Wert im Reiter „Einschätzung &amp; Vergleich“ unmittelbar am Kriterium
        (Zeile „Vorgutachten“, Feld „berichtigen“). Danach rechnen Kriterienliste,
        Modulergebnisse und Gesamtpunktzahl wieder dasselbe.
    </div>`;
}

// Darstellung im Reiter „Auswertung"
function protokollHtml() {
    if (!bewertungsProtokoll.length) {
        return '<p style="font-size:12px;color:var(--text-muted);line-height:1.6">'
             + 'Bisher wurde keine Bewertung verändert.</p>';
    }
    const zeilen = bewertungsProtokoll.slice().reverse().map(e => `
        <tr>
            <td style="white-space:nowrap;font-family:var(--font-mono);font-size:11px">${escapeHtml(e.zeit)}</td>
            <td style="font-family:var(--font-mono);font-size:11px">${escapeHtml(e.nr)}</td>
            <td>${escapeHtml(e.titel)}</td>
            <td style="font-size:11px;color:var(--text-muted)">${escapeHtml(e.alt)}</td>
            <td style="font-size:11px;font-weight:600">${escapeHtml(e.neu)}</td>
            <td style="font-size:11px">${escapeHtml(e.quelle)}</td>
        </tr>`).join('');
    return `<div style="overflow-x:auto"><table class="result-table" style="font-size:12px">
        <thead><tr><th>Zeit</th><th>Nr.</th><th>Kriterium</th><th>vorher</th><th>nachher</th><th>Ursprung</th></tr></thead>
        <tbody>${zeilen}</tbody></table></div>`;
}
