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
    const zustand = (spalte === 'orig') ? stateOrig : stateEigene;
    const item = ITEMS.find(i => i.id === id);
    const alt = zustand.values[id];
    if (JSON.stringify(alt) === JSON.stringify(wert)) return false;   // nichts geändert
    zustand.values[id] = wert;
    bewertungsProtokoll.push({
        zeit: new Date().toLocaleTimeString('de-DE'),
        spalte: (spalte === 'orig') ? 'Vorgutachten' : 'Eigene Einschätzung',
        nr: item ? item.nr : String(id),
        titel: item ? item.title : '',
        alt: bewertungLesbar(item, alt),
        neu: bewertungLesbar(item, wert),
        quelle: BEWERTUNG_QUELLEN[quelle] || quelle
    });
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

function abweichungHtml() {
    const a = vorgutachtenAbweichung();
    if (!a) return '';
    const pgTxt = p => p > 0 ? 'Pflegegrad ' + p : 'kein Pflegegrad';
    const z = n => n.toFixed(2).replace('.', ',');
    return `<div class="hinweis-warnung">
        <b>Bitte prüfen:</b> Die Angaben im Gutachten und die freigegebenen Einzelkriterien ergeben
        nicht dasselbe Ergebnis. Im Vergleich und in der Stellungnahme wird die Angabe aus dem
        Gutachten verwendet.<br>
        Laut Gutachten: <b>${z(a.lautGutachten.total)} Punkte, ${pgTxt(a.lautGutachten.pg)}</b> &nbsp;·&nbsp;
        Aus den Einzelkriterien errechnet: <b>${z(a.ausKriterien.total)} Punkte, ${pgTxt(a.ausKriterien.pg)}</b><br>
        Ursache ist meist ein Kriterium, das beim Einlesen nicht erkannt wurde. Ergänzen Sie es
        über den Regler, dann stimmen beide Angaben überein.
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
