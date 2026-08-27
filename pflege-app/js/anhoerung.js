// Anhörungsverfahren: Der Widerspruch wurde abgelehnt, der Medizinische Dienst hat ein
// Zweitgutachten erstellt, die Sache geht an den Widerspruchsausschuss.
//
// Der Vorgang beginnt NICHT bei null: Der Berater lädt den gespeicherten Widerspruchsfall.
// Damit stehen das Erstgutachten (stateOrig) und seine eigene Bewertung (stateEigene)
// bereits fest. Neu hinzu kommt nur das Anhörungsgutachten (stateZweit).

// Kopfangaben des Anhörungsverfahrens. Die Kennungen beginnen mit "anh-", damit sie
// beim Speichern eines Falls mit erfasst werden (siehe saveCase).
const ANHOERUNG_FELDER = [
    { id: 'anh-schreiben-datum', l: 'Datum Anhörungsschreiben', typ: 'date' },
    { id: 'anh-frist',           l: 'Frist zur Stellungnahme',  typ: 'text', platz: 'Datum oder Angabe wie „zwei Wochen"' },
    { id: 'anh-gutachten-datum', l: 'Datum Zweitgutachten',     typ: 'date' },
    { id: 'anh-art',             l: 'Durchführungsart Zweitgutachten', typ: 'select', opt: () => DURCHFUEHRUNGSARTEN },
    { id: 'anh-pg',              l: 'Pflegegrad (Zweitgutachten)',   typ: 'text' },
    { id: 'anh-pts',             l: 'Gesamtpunkte (Zweitgutachten)', typ: 'text' }
];

function anhoerungFeldHtml(f) {
    if (f.typ === 'select') {
        return `<div class="field-group"><label class="field-label">${escapeHtml(f.l)}</label>
            <select id="${f.id}" class="field-input">
                <option value="">– keine Angabe –</option>
                ${f.opt().map(o => `<option>${escapeHtml(o)}</option>`).join('')}
            </select></div>`;
    }
    return `<div class="field-group"><label class="field-label">${escapeHtml(f.l)}</label>
        <input type="${f.typ}" id="${f.id}" class="field-input"
               placeholder="${escapeHtml(f.platz || '')}"></div>`;
}

// Der Bereich auf Reiter 1. Wird einmal aufgebaut und je Vorgangsart ein- oder ausgeblendet.
function renderAnhoerungBereich() {
    const ziel = document.getElementById('anhoerung-bereich');
    if (!ziel || ziel.dataset.gebaut === '1') return;
    ziel.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="dot"></div>Anhörungsverfahren</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px">
                    Laden Sie zuerst den gespeicherten Widerspruchsfall über „Fall laden“. Damit stehen
                    das Erstgutachten und Ihre damalige Bewertung fest. Lesen Sie anschließend das
                    Anhörungsschreiben und das beigefügte Zweitgutachten ein – beides zusammen oder
                    einzeln, je nachdem wie die Kasse es verschickt hat.
                </p>
                <button class="btn btn-ai" onclick="document.getElementById('anhoerungFiles').click()">
                    ⚡ Anhörungsschreiben und Gutachten einlesen</button>
                <input type="file" id="anhoerungFiles" accept=".pdf,image/*" multiple
                       onchange="leseAnhoerung(event)" style="display:none">
                <div id="anh-status" style="font-size:11px;color:var(--text-muted);margin-top:10px"></div>

                <div class="field-grid" style="margin-top:16px">
                    ${ANHOERUNG_FELDER.map(anhoerungFeldHtml).join('')}
                </div>

                <div class="field-group" style="margin-top:14px">
                    <label class="field-label">Begründung der Pflegekasse (aus dem Anhörungsschreiben)</label>
                    <textarea id="anh-kassenbegruendung" class="field-input"
                              style="min-height:110px;font-size:12px;line-height:1.6;padding:12px"
                              placeholder="Warum will die Kasse dem Widerspruch nicht abhelfen?"
                              oninput="autoResize(this)"></textarea>
                </div>

                <div class="field-group" style="margin-top:14px">
                    <label class="field-label">Eigene Anmerkungen zum Anhörungsverfahren</label>
                    <textarea id="anh-notizen" class="field-input"
                              style="min-height:110px;font-size:12px;line-height:1.6;padding:12px"
                              placeholder="Was ist zum Zweitgutachten anzumerken? Diese Notizen fließen in die Begründung ein."
                              oninput="autoResize(this)"></textarea>
                </div>
            </div>
        </div>`;
    ziel.dataset.gebaut = '1';
    aktualisiereAnhoerungStatus();
}

// Zeigt an, was bereits vorliegt – und was noch fehlt.
function aktualisiereAnhoerungStatus() {
    const el = document.getElementById('anh-status');
    if (!el) return;
    const fallGeladen = Object.keys(stateOrig.values || {}).length > 0;
    const teile = [];
    teile.push(fallGeladen ? '✓ Widerspruchsfall geladen' : '– Widerspruchsfall noch nicht geladen');
    teile.push(hatZweitgutachten() ? '✓ Anhörungsgutachten übernommen' : '– Anhörungsgutachten fehlt noch');
    el.innerText = teile.join('   ·   ');
}

// Einlesen: mehrere Dateien möglich. Die erste wird ausgewertet, alle werden für die
// spätere Ansicht gemerkt – so lassen sich Schreiben und Gutachten nebeneinander prüfen.
async function leseAnhoerung(event) {
    const dateien = Array.from(event.target.files || []);
    if (!dateien.length) return;
    dateien.forEach(d => { if (typeof merkeImportDokument === 'function') merkeImportDokument(d, d.type); });
    // Die vorhandene Auslese arbeitet dateiweise; sie erhält die erste Datei und das Ziel.
    await aiReadGutachten({ target: { files: [dateien[0]], value: '' } }, 'zweit');
    if (dateien.length > 1) {
        showToast(dateien.length + ' Dateien gemerkt. Ausgelesen wurde „' + dateien[0].name
            + '“. Die übrigen können Sie in der Prüfansicht links durchsehen und die Felder ergänzen.', 'success');
    }
    event.target.value = '';
}

// Übernahme nach der Freigabe. Anders als beim Einlesen eines Erstgutachtens wird hier
// NICHTS zurückgesetzt: Stammdaten, Diagnosen, Notizen, Befund und die geschriebene
// Stellungnahme des Widerspruchs bleiben unangetastet.
function uebernehmeAnhoerung(rev) {
    if (!rev) return;
    let n = 0;
    ITEMS.forEach(i => {
        if (!i.m) return;
        const v = rev.valuesMap[i.id];
        const wert = (i.m === 5 && i.group !== 'D')
            ? { count: (v && typeof v === 'object') ? Number(v.count) || 0 : 0,
                period: (v && typeof v === 'object') ? (v.period || 'W') : 'W' }
            : (Number(v) || 0);
        stateZweit.values[i.id] = wert;
        n++;
    });
    stateZweit.special = rev.special || 0;
    if (rev.extracted) {
        stateZweit.extracted = { raws: rev.extracted.raws.slice(), weights: rev.extracted.weights.slice(),
                                 total: rev.extracted.total, pg: rev.extracted.pg };
    } else {
        delete stateZweit.extracted;
    }

    // Kopfangaben des Verfahrens
    const setz = (id, wert) => { const el = document.getElementById(id); if (el && wert) el.value = wert; };
    const a = rev.anh || {};
    setz('anh-schreiben-datum', a.schreiben);
    setz('anh-gutachten-datum', a.gutachten || formatToYYYYMMDD(rev.stam.begutachtung));
    setz('anh-frist', a.frist);
    setz('anh-art', a.art || normalizeArt(rev.stam.art));
    setz('anh-pg', rev.stam.pg);
    setz('anh-pts', rev.stam.pts);
    const kb = document.getElementById('anh-kassenbegruendung');
    if (kb && a.kassenbegruendung && !kb.value.trim()) { kb.value = a.kassenbegruendung; autoResize(kb); }

    // Nachweis im Bewertungsprotokoll
    if (typeof bewertungsProtokoll !== 'undefined') {
        bewertungsProtokoll.push({
            zeit: new Date().toLocaleTimeString('de-DE'),
            spalte: SPALTEN_NAMEN.zweit, nr: '—',
            titel: n + ' Kriterien aus dem Anhörungsgutachten',
            alt: 'leer', neu: 'übernommen', quelle: BEWERTUNG_QUELLEN.import
        });
    }

    fillTable('own'); calculate('own'); calculate('zweit'); syncSpecialUI();
    aktualisiereAnhoerungStatus();
}
