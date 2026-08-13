// Erweiterte Erfassung für Erstantrag und Höherstufungsantrag:
// Pflegepersonen, Krankenhausaufenthalte, Hilfsmittel, Arzt- und Therapiebesuche,
// Medikation und Behandlungspflege. Alle Tabellen wachsen beim Ausfüllen mit.
// Aus den Angaben zu Besuchen, Medikation und Behandlungspflege lässt sich Modul 5 füllen.

let erfassung = {};        // { tabellenId: [ {spalte: wert, ...}, ... ] }
let erfassungExtra = {};   // Einzelfelder (Vorgutachten, Veränderung)

const HAEUFIGKEIT_ZEITRAUM = ['pro Tag', 'pro Woche', 'pro Monat'];
const BEGLEITUNG = ['selbständig', 'in Begleitung'];
const DURCHFUEHRUNG = ['selbständig', 'durch Pflegeperson'];

const ARZT_FACH = ['Hausarzt', 'Facharzt (bitte ergänzen)', 'Neurologe', 'Psychiater', 'Kardiologe',
    'Orthopäde', 'Urologe', 'Onkologe', 'Augenarzt', 'Zahnarzt'];
const THERAPIE_ART = ['Physiotherapie', 'Ergotherapie', 'Logopädie',
    'Medizinische Fußpflege bei Diabetes mellitus', 'Rehasport', 'Psychotherapie',
    'Dialyse', 'Chemotherapie', 'Tagespflege'];
const APPLIKATION = ['oral', 'Augen- oder Ohrentropfen', 'Dosieraerosol oder Pulverinhalator',
    'Zäpfchen', 'Pflaster', 'Injektion', 'über PEG'];
const BEHANDLUNGSPFLEGE_ART = ['Kompressionsstrümpfe anlegen', 'Kompressionsstrümpfe ablegen',
    'Hörgerät einsetzen', 'Hörgerät herausnehmen', 'Verbandswechsel', 'Wundversorgung',
    'Sauerstoffbrille auf- oder absetzen', 'CPAP-Maske auf- oder absetzen',
    'Blutzucker messen', 'Blutdruck messen', 'Stoma versorgen', 'Einmalkatheterisierung'];

const ERFASSUNG_TABELLEN = [
    {
        id: 'pflegepersonen', titel: 'Pflegeperson und Pflegedienst',
        hinweis: 'Mehrere Einträge möglich – Pflegeperson, Pflegedienst oder beides.',
        spalten: [
            { k: 'art', l: 'Art', typ: 'select', opt: ['Pflegeperson', 'Ambulanter Pflegedienst'], b: '150px' },
            { k: 'name', l: 'Name', typ: 'text' },
            { k: 'geboren', l: 'Geburtsdatum', typ: 'date', b: '140px' },
            { k: 'adresse', l: 'Adresse', typ: 'text' },
            { k: 'telefon', l: 'Telefon', typ: 'text', b: '130px' },
            { k: 'tage', l: 'Tage/Woche', typ: 'number', b: '95px' },
            { k: 'stunden', l: 'Std./Tag', typ: 'number', b: '85px' },
            { k: 'wochenstunden', l: 'Wochenstd.', typ: 'text', b: '95px', berechnet: true },
            { k: 'unterstuetzung', l: 'Wobei wird unterstützt', typ: 'text' }
        ]
    },
    {
        id: 'krankenhaus', titel: 'Krankenhausaufenthalte',
        spalten: [
            { k: 'von', l: 'von', typ: 'date', b: '150px' },
            { k: 'bis', l: 'bis', typ: 'date', b: '150px' },
            { k: 'grund', l: 'Aufnahmediagnose / Grund', typ: 'text' }
        ]
    },
    {
        id: 'hilfsmittel', titel: 'Hilfsmittel',
        spalten: [
            { k: 'bezeichnung', l: 'Hilfsmittel', typ: 'text' },
            { k: 'seit', l: 'vorhanden seit', typ: 'text', b: '150px' },
            { k: 'anmerkung', l: 'Anmerkung', typ: 'text' }
        ]
    },
    {
        id: 'arztbesuche', titel: 'Arzt- und Therapiebesuche',
        hinweis: 'Nur regelmäßig wiederkehrende Termine bei dauerhafter Erkrankung. '
               + 'Nur Termine „in Begleitung" fließen in Modul 5 ein.',
        spalten: [
            { k: 'fach', l: 'Fachrichtung oder Therapie', typ: 'select', opt: ARZT_FACH.concat(THERAPIE_ART), frei: true },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: HAEUFIGKEIT_ZEITRAUM, b: '120px' },
            { k: 'begleitung', l: 'Durchführung', typ: 'select', opt: BEGLEITUNG, b: '140px' },
            { k: 'dauer3h', l: 'über 3 Std.', typ: 'select', opt: ['nein', 'ja'], b: '105px' }
        ]
    },
    {
        id: 'medikation', titel: 'Medikation',
        hinweis: 'Nur ärztlich verordnete Dauermedikation. Nur Gaben „durch Pflegeperson" fließen in Modul 5 ein.',
        spalten: [
            { k: 'bezeichnung', l: 'Medikament', typ: 'text' },
            { k: 'applikation', l: 'Applikation', typ: 'select', opt: APPLIKATION, b: '190px' },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: HAEUFIGKEIT_ZEITRAUM, b: '120px' },
            { k: 'durchfuehrung', l: 'Durchführung', typ: 'select', opt: DURCHFUEHRUNG, b: '160px' }
        ]
    },
    {
        id: 'behandlungspflege', titel: 'Behandlungspflege',
        hinweis: 'An- und Ablegen zählen jeweils als eigene Maßnahme. '
               + 'Nur Maßnahmen „durch Pflegeperson" fließen in Modul 5 ein.',
        spalten: [
            { k: 'art', l: 'Maßnahme', typ: 'select', opt: BEHANDLUNGSPFLEGE_ART, frei: true },
            { k: 'beschreibung', l: 'Tätigkeitsbeschreibung', typ: 'text' },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: HAEUFIGKEIT_ZEITRAUM, b: '120px' },
            { k: 'durchfuehrung', l: 'Durchführung', typ: 'select', opt: DURCHFUEHRUNG, b: '160px' }
        ]
    }
];

// ------------------------------------------------------------------ Darstellung
function renderErfassung() {
    const ziel = document.getElementById('erfassung-bereich');
    if (!ziel) return;
    const hoeher = (appModus === 'hoeherstufung');
    ziel.innerHTML =
        (hoeher ? `<div class="card">
            <div class="card-header"><div class="dot"></div>Vorgutachten und Veränderung</div>
            <div style="padding:20px"><div class="grid-4" style="gap:16px">
                <div><label class="field-label">Aktueller Pflegegrad</label>
                    <select id="erf-pg" class="field-input" onchange="erfassungExtra.pg=this.value">
                        ${['', '1', '2', '3', '4', '5'].map(p => `<option value="${p}" ${erfassungExtra.pg === p ? 'selected' : ''}>${p ? 'Pflegegrad ' + p : '– bitte wählen –'}</option>`).join('')}
                    </select></div>
                <div><label class="field-label">Datum des Vorgutachtens</label>
                    <input type="date" id="erf-vorgutachten" class="field-input" value="${escapeHtml(erfassungExtra.vorgutachten || '')}"
                           oninput="erfassungExtra.vorgutachten=this.value"></div>
                <div class="col-span-2"><label class="field-label">Verschlechterung seit wann und wodurch</label>
                    <input type="text" id="erf-verschlechterung" class="field-input" placeholder="z. B. seit dem Sturz im März 2026"
                           value="${escapeHtml(erfassungExtra.verschlechterung || '')}" oninput="erfassungExtra.verschlechterung=this.value"></div>
            </div></div></div>` : '')
        + ERFASSUNG_TABELLEN.map(t => `
            <div class="card">
                <div class="card-header"><div class="dot"></div>${escapeHtml(t.titel)}</div>
                <div style="padding:16px 20px">
                    ${t.hinweis ? `<p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-bottom:12px">${escapeHtml(t.hinweis)}</p>` : ''}
                    <div style="overflow-x:auto"><table class="erf-tabelle">
                        <thead><tr>${t.spalten.map(s => `<th${s.b ? ` style="width:${s.b}"` : ''}>${escapeHtml(s.l)}</th>`).join('')}<th style="width:38px"></th></tr></thead>
                        <tbody id="erf-body-${t.id}">${erfZeilen(t)}</tbody>
                    </table></div>
                    <button class="btn btn-secondary" style="margin-top:10px" onclick="erfZeileHinzu('${t.id}')">+ Weitere Zeile</button>
                </div>
            </div>`).join('')
        + `<div class="card" style="border:1px solid rgba(37,99,235,0.2)">
            <div class="card-header"><div class="dot" style="background:var(--accent)"></div>Modul 5 aus den Angaben füllen</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Überträgt Arzt- und Therapiebesuche, Medikation und Behandlungspflege in die Kriterien des
                    Moduls 5. Berücksichtigt werden nur Maßnahmen mit personeller Unterstützung. Bereits von Hand
                    gesetzte Werte werden dabei überschrieben.
                </p>
                <div id="erf-modul5-hinweis" style="font-size:12px;color:var(--text-muted);margin-bottom:12px"></div>
                <button class="btn btn-primary" onclick="uebernehmeModul5(true)">↧ Modul 5 übernehmen</button>
            </div>
        </div>`;
    zeigeModul5Vorschau();
}

function erfZeilen(t) {
    const zeilen = erfassung[t.id] || [];
    if (!zeilen.length) { erfassung[t.id] = [{}]; }
    return (erfassung[t.id]).map((z, i) => erfZeile(t, i, z)).join('');
}

function erfZeile(t, i, z) {
    return `<tr>${t.spalten.map(s => `<td>${erfFeld(t, i, s, z[s.k])}</td>`).join('')}
        <td><button class="erf-weg" title="Zeile entfernen" onclick="erfZeileWeg('${t.id}',${i})">×</button></td></tr>`;
}

function erfFeld(t, i, s, wert) {
    const bei = `oninput="erfSetzen('${t.id}',${i},'${s.k}',this.value)"`;
    if (s.berechnet) {
        return `<input type="text" class="field-input" readonly style="background:var(--bg-card2)" value="${escapeHtml(wert || '')}">`;
    }
    if (s.typ === 'select') {
        const opt = ['<option value=""></option>']
            .concat(s.opt.map(o => `<option ${wert === o ? 'selected' : ''}>${escapeHtml(o)}</option>`));
        if (s.frei && wert && !s.opt.includes(wert)) opt.push(`<option selected>${escapeHtml(wert)}</option>`);
        return `<select class="field-input" onchange="erfSetzen('${t.id}',${i},'${s.k}',this.value)">${opt.join('')}</select>`
             + (s.frei ? `<input type="text" class="field-input" style="margin-top:4px" placeholder="oder eigene Angabe"
                    value="${(!s.opt.includes(wert) && wert) ? escapeHtml(wert) : ''}" ${bei}>` : '');
    }
    return `<input type="${s.typ}" class="field-input" value="${escapeHtml(wert == null ? '' : wert)}" ${bei}>`;
}

function erfSetzen(tid, i, key, wert) {
    if (!erfassung[tid]) erfassung[tid] = [];
    if (!erfassung[tid][i]) erfassung[tid][i] = {};
    if (wert === '') delete erfassung[tid][i][key]; else erfassung[tid][i][key] = wert;
    // Wochenstunden aus Tagen und Stunden je Tag
    if (tid === 'pflegepersonen' && (key === 'tage' || key === 'stunden')) {
        const z = erfassung[tid][i];
        const t = parseFloat(z.tage), s = parseFloat(z.stunden);
        if (t > 0 && s > 0) z.wochenstunden = String(Math.round(t * s * 10) / 10).replace('.', ',');
        else delete z.wochenstunden;
        renderErfassungTabelle(tid);
    }
    // Beim Ausfüllen der letzten Zeile eine weitere anbieten
    const t = ERFASSUNG_TABELLEN.find(x => x.id === tid);
    if (t && i === erfassung[tid].length - 1 && Object.keys(erfassung[tid][i]).length) {
        erfassung[tid].push({});
        renderErfassungTabelle(tid);
    }
    zeigeModul5Vorschau();
}

function renderErfassungTabelle(tid) {
    const t = ERFASSUNG_TABELLEN.find(x => x.id === tid);
    const body = document.getElementById('erf-body-' + tid);
    if (t && body) body.innerHTML = erfZeilen(t);
}

function erfZeileHinzu(tid) {
    if (!erfassung[tid]) erfassung[tid] = [];
    erfassung[tid].push({});
    renderErfassungTabelle(tid);
}

function erfZeileWeg(tid, i) {
    if (!erfassung[tid]) return;
    erfassung[tid].splice(i, 1);
    if (!erfassung[tid].length) erfassung[tid] = [{}];
    renderErfassungTabelle(tid);
    zeigeModul5Vorschau();
}

// ------------------------------------------------- Übernahme in Modul 5
// Liefert { kriteriumNr: {count, period} } aus den erfassten Angaben.
function modul5AusErfassung() {
    const ziel = {};
    const zeitraumKurz = z => (z === 'pro Tag' ? 'D' : z === 'pro Woche' ? 'W' : 'M');
    const addieren = (nr, anzahl, zeitraum) => {
        const n = parseFloat(anzahl);
        if (!(n > 0) || !zeitraum) return;
        const p = zeitraumKurz(zeitraum);
        // je Kriterium auf einen gemeinsamen Zeitraum bringen (den bisher genutzten)
        if (!ziel[nr]) { ziel[nr] = { count: n, period: p }; return; }
        const proTag = { D: 1, W: 1 / 7, M: 1 / 30 };
        const summeTag = ziel[nr].count * proTag[ziel[nr].period] + n * proTag[p];
        // gröbsten der beteiligten Zeiträume beibehalten
        const rang = { D: 0, W: 1, M: 2 };
        const p2 = rang[p] > rang[ziel[nr].period] ? p : ziel[nr].period;
        ziel[nr] = { count: Math.round(summeTag / proTag[p2] * 100) / 100, period: p2 };
    };

    (erfassung.arztbesuche || []).forEach(z => {
        if (z.begleitung !== 'in Begleitung') return;          // ohne Hilfe keine Wertung
        const therapie = THERAPIE_ART.includes(z.fach);
        const nr = (z.dauer3h === 'ja') ? '4.5.15' : (therapie ? '4.5.14' : '4.5.13');
        addieren(nr, z.anzahl, z.zeitraum);
    });
    (erfassung.medikation || []).forEach(z => {
        if (z.durchfuehrung !== 'durch Pflegeperson') return;
        addieren(z.applikation === 'Injektion' ? '4.5.2' : '4.5.1', z.anzahl, z.zeitraum);
    });
    (erfassung.behandlungspflege || []).forEach(z => {
        if (z.durchfuehrung !== 'durch Pflegeperson') return;
        const a = (z.art || '').toLowerCase();
        let nr = '4.5.11';
        if (/kompressions|hörgerät|hoergeraet/.test(a)) nr = '4.5.7';
        else if (/verband|wund/.test(a)) nr = '4.5.8';
        else if (/sauerstoff|cpap|absaug/.test(a)) nr = '4.5.4';
        else if (/blutzucker|blutdruck|messen/.test(a)) nr = '4.5.6';
        else if (/stoma/.test(a)) nr = '4.5.9';
        else if (/katheter|abführ|abfuehr/.test(a)) nr = '4.5.10';
        addieren(nr, z.anzahl, z.zeitraum);
    });
    return ziel;
}

function zeigeModul5Vorschau() {
    const el = document.getElementById('erf-modul5-hinweis');
    if (!el) return;
    const z = modul5AusErfassung();
    const nrs = Object.keys(z);
    el.innerText = nrs.length
        ? 'Bereit zur Übernahme: ' + nrs.map(nr => nr + ' = ' + z[nr].count + '× '
            + (z[nr].period === 'D' ? 'pro Tag' : z[nr].period === 'W' ? 'pro Woche' : 'pro Monat')).join(' · ')
        : 'Noch keine Angaben mit personeller Unterstützung erfasst.';
}

function uebernehmeModul5(mitMeldung) {
    const z = modul5AusErfassung();
    let n = 0;
    Object.keys(z).forEach(nr => {
        const item = ITEMS.find(i => i.nr === nr);
        if (!item || item.group === 'D') return;
        stateEigene.values[item.id] = { count: z[nr].count, period: z[nr].period };
        n++;
    });
    try { fillTable('own'); calculate('own'); } catch (e) {}
    if (mitMeldung) {
        showToast(n ? n + ' Kriterium/Kriterien in Modul 5 übernommen. Bitte in der Einschätzung prüfen.'
                    : 'Es liegen keine übertragbaren Angaben vor.', n ? 'success' : 'error');
    }
    return n;
}

// ------------------------------------------------------- Speichern und Laden
function erfassungSichern() { return { tabellen: erfassung, extra: erfassungExtra }; }
function erfassungLaden(d) {
    erfassung = (d && d.tabellen) || {};
    erfassungExtra = (d && d.extra) || {};
}
