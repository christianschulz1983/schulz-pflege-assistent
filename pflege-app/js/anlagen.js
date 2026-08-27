// Anlagen zur Stellungnahme: Arztberichte, Verordnungen, Befundberichte.
//
// Zweck: Wo der Medizinische Dienst eine Leistung nicht berücksichtigt hat – etwa eine
// verordnete Physiotherapie oder ein Hilfsmittel –, wird der Nachweis beigefügt und im
// Schriftstück beim strittigen Kriterium benannt.
//
// EHRLICHE GRENZE: Die PDF selbst lässt sich nicht in das Word-Dokument einbetten; das
// Format gibt das nicht her. Die App benennt die Anlage, ordnet sie einem Kriterium zu und
// verweist darauf. Die Dateien legt der Berater beim Versand bei.

let anlagen = [];   // [{ bezeichnung, art, datum, kriterium, bemerkung, dateiname }]

const ANLAGE_ARTEN = [
    'Arztbericht', 'Verordnung', 'Befundbericht', 'Medikamentenplan',
    'Krankenhausbericht', 'Hilfsmittelverordnung', 'Sonstiges'
];

// Aus dem Dateinamen eine brauchbare Bezeichnung ableiten (ohne Endung, ohne Unterstriche).
function anlageBezeichnungAus(dateiname) {
    return String(dateiname || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
}

function anlagenHinzufuegen(event) {
    const dateien = Array.from(event.target.files || []);
    event.target.value = '';
    if (!dateien.length) return;
    dateien.forEach(d => {
        if (typeof merkeImportDokument === 'function') merkeImportDokument(d, d.type);
        anlagen.push({
            bezeichnung: anlageBezeichnungAus(d.name), art: '', datum: '',
            kriterium: '', bemerkung: '', dateiname: d.name
        });
    });
    renderAnlagen();
    showToast(dateien.length + ' Anlage(n) hinzugefügt. Bitte Art und Zuordnung ergänzen.', 'success');
}

function anlageSetzen(i, feld, wert) {
    if (!anlagen[i]) return;
    anlagen[i][feld] = wert;
    if (feld === 'kriterium' || feld === 'art') renderAnlagen();
}

function anlageEntfernen(i) {
    anlagen.splice(i, 1);
    renderAnlagen();
}

// Die strittigen Kriterien, denen sich eine Anlage zuordnen lässt.
function anlagenKriterien() {
    if (typeof strittigeLagen !== 'function' || !hatZweitgutachten()) return [];
    return strittigeLagen().map(l => ({ nr: l.nr, titel: l.titel }));
}

function anlagenZeile(a, i) {
    const krit = anlagenKriterien();
    return `<div class="befund-zeile">
        <div class="bz-titel">Anlage ${i + 1}
            <span style="font-weight:400;color:var(--text-muted);font-size:11px">${escapeHtml(a.dateiname || '')}</span>
            <button type="button" class="btn btn-ghost pz-weg" style="margin-left:auto"
                    onclick="anlageEntfernen(${i})" title="Anlage entfernen">✕</button>
        </div>
        <div class="pz-raster">
            <div><span class="bz-seite">Bezeichnung</span>
                <input type="text" class="field-input" value="${escapeHtml(a.bezeichnung || '')}"
                       oninput="anlageSetzen(${i},'bezeichnung',this.value)"></div>
            <div><span class="bz-seite">Art</span>
                <select class="field-input" onchange="anlageSetzen(${i},'art',this.value)">
                    <option value="">– keine Angabe –</option>
                    ${ANLAGE_ARTEN.map(x => `<option ${a.art === x ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('')}
                </select></div>
            <div><span class="bz-seite">Datum</span>
                <input type="date" class="field-input" value="${escapeHtml(a.datum || '')}"
                       oninput="anlageSetzen(${i},'datum',this.value)"></div>
        </div>
        <div class="pz-raster" style="margin-top:8px">
            <div style="grid-column:span 2"><span class="bz-seite">Belegt welches strittige Kriterium?</span>
                <select class="field-input" onchange="anlageSetzen(${i},'kriterium',this.value)">
                    <option value="">– keinem bestimmten –</option>
                    ${krit.map(k => `<option value="${escapeHtml(k.nr)}" ${a.kriterium === k.nr ? 'selected' : ''}>${escapeHtml(k.nr + ' ' + k.titel)}</option>`).join('')}
                </select></div>
            <div><span class="bz-seite">Bemerkung</span>
                <input type="text" class="field-input" value="${escapeHtml(a.bemerkung || '')}"
                       placeholder="was die Anlage belegt"
                       oninput="anlageSetzen(${i},'bemerkung',this.value)"></div>
        </div>
    </div>`;
}

function renderAnlagen() {
    const ziel = document.getElementById('anlagen-liste');
    if (!ziel) return;
    ziel.innerHTML = anlagen.length
        ? anlagen.map((a, i) => anlagenZeile(a, i)).join('')
        : '<p style="font-size:12px;color:var(--text-muted)">Noch keine Anlagen hinzugefügt.</p>';
    const hinweis = document.getElementById('anlagen-hinweis');
    if (hinweis) {
        const ohneZuordnung = anlagen.filter(a => !a.kriterium).length;
        hinweis.innerText = anlagen.length
            ? anlagen.length + ' Anlage(n)' + (ohneZuordnung ? ', davon ' + ohneZuordnung + ' ohne Zuordnung' : '')
            : '';
    }
}

// Bezeichnung einer Anlage im Schriftstück
function anlageText(a, i) {
    const teile = [];
    if (a.art) teile.push(a.art);
    if (a.bezeichnung) teile.push(a.bezeichnung);
    let t = 'Anlage ' + (i + 1) + ': ' + (teile.join(' – ') || 'ohne Bezeichnung');
    if (a.datum && typeof formatDE === 'function') {
        const d = formatDE(a.datum);
        if (d) t += ' vom ' + d;
    }
    return t;
}

// Anlagen zu einem Kriterium – für den Verweis in der Begründung.
function anlagenZuKriterium(nr) {
    return anlagen.map((a, i) => ({ a: a, i: i })).filter(x => x.a.kriterium === nr);
}

function anlagenVerweisHtml(nr) {
    const treffer = anlagenZuKriterium(nr);
    if (!treffer.length) return '';
    return '<div>Beigefügt: ' + treffer.map(x =>
        escapeHtml(anlageText(x.a, x.i)) + (x.a.bemerkung ? ' (' + escapeHtml(x.a.bemerkung) + ')' : '')
    ).join(' · ') + '</div>';
}

// Anlagenverzeichnis am Ende des Schriftstücks
function anlagenVerzeichnisHtml() {
    if (!anlagen.length) return '';
    const zeilen = anlagen.map((a, i) => {
        const zu = a.kriterium ? ' – zu Kriterium ' + escapeHtml(a.kriterium) : '';
        const bem = a.bemerkung ? ': ' + escapeHtml(a.bemerkung) : '';
        return `<div>${escapeHtml(anlageText(a, i))}${zu}${bem}</div>`;
    }).join('');
    return `<hr><h2>Anlagen</h2><div id="stmt-anlagen">${zeilen}</div>`;
}

// Für die KI: welche Anlage belegt was?
function anlagenFuerPrompt(nr) {
    const treffer = anlagenZuKriterium(nr);
    if (!treffer.length) return '';
    return 'BEIGEFÜGTE ANLAGEN zu diesem Kriterium (im Text als „Anlage N" benennen, '
         + 'nichts über ihren Inhalt erfinden): '
         + treffer.map(x => anlageText(x.a, x.i) + (x.a.bemerkung ? ' – ' + x.a.bemerkung : '')).join('; ') + '\n';
}

// ------------------------------------------------------- Speichern und Laden
function anlagenSichern() { return anlagen; }
function anlagenLaden(d) { anlagen = Array.isArray(d) ? d : []; }
