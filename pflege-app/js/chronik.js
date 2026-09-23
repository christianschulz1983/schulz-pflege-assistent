// Zeitachse der Verschlechterung – Höherstufungsantrag.
//
// Der Höherstufungsantrag lebt von der Veränderung seit dem Vorgutachten. Die dafür nötigen
// Daten stehen längst in der App: Krankenhausaufenthalte und Hilfsmittel in den
// Erfassungstabellen, Erstdiagnosen in den Diagnosezeilen, dazu die ausgelesenen ärztlichen
// Unterlagen. Diese Funktion bringt sie in eine Chronologie und trennt, was NACH dem
// Vorgutachten liegt – nur das belegt die Verschlechterung.
//
// Alles gerechnet und aus erfassten Daten; nichts wird hinzugedichtet.

function chronikDatum(wert) {
    const s = String(wert || '').trim();
    if (!s) return '';
    const iso = (typeof formatToYYYYMMDD === 'function') ? formatToYYYYMMDD(s) : '';
    if (iso) return iso;
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function chronikEreignisse() {
    const ev = [];
    const zeilen = tid => (typeof erfassung !== 'undefined' && Array.isArray(erfassung[tid]))
        ? erfassung[tid].filter(z => Object.keys(z).some(k => k.charAt(0) !== '_' && String(z[k] || '').trim())) : [];

    zeilen('krankenhaus').forEach(r => {
        const d = chronikDatum(r.von) || chronikDatum(r.bis);
        if (!d) return;
        ev.push({ datum: d, art: 'Krankenhaus',
            text: 'Krankenhausaufenthalt' + (chronikDatum(r.bis) ? ' bis ' + formatDE(chronikDatum(r.bis)) : '')
                + (String(r.grund || '').trim() ? ': ' + String(r.grund).trim() : '') });
    });
    zeilen('hilfsmittel').forEach(r => {
        const m = String(r.taetigkeit || '').match(/seit\s+([0-9.\-]{6,10})/i);
        const d = m ? chronikDatum(m[1]) : '';
        if (!d) return;
        ev.push({ datum: d, art: 'Hilfsmittel', text: 'Hilfsmittel hinzugekommen: ' + String(r.bezeichnung || '').trim() });
    });
    // Diagnosen: Erstdiagnose-Datum steht in der Diagnosezeile („… (Erstdiagnose 12.02.2026)")
    for (let n = 1; n <= 60; n++) {
        const icdEl = document.getElementById('diag-icd-' + n);
        const txtEl = document.getElementById('diag-txt-' + n);
        if (!icdEl && !txtEl) { if (n > 12) break; continue; }
        const txt = String(txtEl && txtEl.value || '');
        const m = txt.match(/Erstdiagnose\s+([0-9.\-]{6,10})/i);
        const d = m ? chronikDatum(m[1]) : '';
        if (!d) continue;
        ev.push({ datum: d, art: 'Diagnose',
            text: 'Neue Diagnose: ' + [String(icdEl && icdEl.value || '').trim(), txt.replace(/\s*\(Erstdiagnose[^)]*\)/i, '').trim()]
                .filter(Boolean).join(' ') });
    }
    // Ärztliche Unterlagen (js/belege.js), soweit ausgelesen
    (typeof anlagen !== 'undefined' ? anlagen : []).forEach((a, i) => {
        const au = a.auswertung;
        const d = chronikDatum(a.datum) || (au ? chronikDatum(au.datum) : '');
        if (!d) return;
        ev.push({ datum: d, art: 'Unterlage',
            text: (a.art || 'Unterlage') + (au && au.aussteller ? ', ' + au.aussteller : '') + ' (Anlage ' + (i + 1) + ')' });
    });

    const vorgutachten = chronikDatum(document.getElementById('stam-begutachtung')?.value);
    ev.sort((a, b) => a.datum.localeCompare(b.datum));
    return ev.map(e => Object.assign({ nachVorgutachten: !!vorgutachten && e.datum > vorgutachten }, e));
}

// Nur die Ereignisse nach dem Vorgutachten – sie belegen die Verschlechterung
function chronikSeitVorgutachten() {
    return chronikEreignisse().filter(e => e.nachVorgutachten);
}

function chronikHtml() {
    const alle = chronikEreignisse();
    const seit = alle.filter(e => e.nachVorgutachten);
    const vorg = document.getElementById('stam-begutachtung')?.value;
    if (!alle.length) {
        return karte('Zeitachse seit dem Vorgutachten', 'var(--accent)',
            `<p style="font-size:12px;color:var(--text-muted);line-height:1.6">
                Noch keine datierten Ereignisse erfasst. Die Zeitachse entsteht aus Krankenhausaufenthalten und
                Hilfsmitteln in der Erfassung, aus Diagnosen mit Erstdiagnose-Datum und aus den ausgelesenen
                ärztlichen Unterlagen.</p>`);
    }
    const zeile = e => `<tr><td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap">${escapeHtml(formatDE(e.datum))}</td>`
        + `<td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${escapeHtml(e.art)}</td>`
        + `<td style="font-size:12px">${escapeHtml(e.text)}</td></tr>`;
    return karte('Zeitachse seit dem Vorgutachten', 'var(--accent2)',
        `<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:10px">
            ${vorg ? 'Vorgutachten vom <b>' + escapeHtml(formatDE(vorg)) + '</b>. ' : 'Kein Begutachtungsdatum erfasst – '
              + 'ohne dieses Datum lässt sich nicht trennen, was danach kam. '}
            ${seit.length ? '<b>' + seit.length + ' Ereignis(se) danach</b> belegen die Verschlechterung; sie erscheinen im Antrag.'
                          : 'Nach dem Vorgutachten ist bisher kein Ereignis erfasst.'}</p>
         <div style="overflow-x:auto"><table class="result-table" style="font-size:12px">
            <thead><tr><th>Datum</th><th>Art</th><th>Ereignis</th></tr></thead>
            <tbody>${alle.map(e => e.nachVorgutachten
                ? zeile(e).replace('<tr>', '<tr style="background:rgba(13,148,136,0.07)">') : zeile(e)).join('')}</tbody>
         </table></div>
         <p style="font-size:11px;color:var(--text-muted);line-height:1.6;margin-top:8px">
            Hervorgehoben: nach dem Vorgutachten. Nur diese Ereignisse gehen als „Veränderungen seit dem
            Vorgutachten" in den Antrag.</p>`);
}

// Abschnitt im Antrag – nur Ereignisse nach dem Vorgutachten
function chronikAbschnittHtml() {
    const seit = chronikSeitVorgutachten();
    if (!seit.length) return '';
    return `<h3>Veränderungen seit dem Vorgutachten</h3>
        <div id="stmt-chronik">${seit.map(e => `<div>${escapeHtml(formatDE(e.datum))} – ${escapeHtml(e.text)}</div>`).join('')}</div>`;
}

// Für die KI: die Chronologie als belegte Tatsachen
function chronikFuerPrompt() {
    const seit = chronikSeitVorgutachten();
    if (!seit.length) return '';
    return 'VERÄNDERUNGEN SEIT DEM VORGUTACHTEN (erfasste, datierte Ereignisse – die App setzt sie selbst als Liste '
         + 'in den Antrag; nutze sie für die Begründung der Verschlechterung, erfinde nichts dazu):\n'
         + seit.map(e => '- ' + formatDE(e.datum) + ': ' + e.text).join('\n') + '\n\n';
}
