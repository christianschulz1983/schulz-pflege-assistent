// Teil des Pflegegradassistenten für Berater. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
function renderNBASection(prefix) {
    const isEig = (prefix === 'own');
    return `
    <div class="grid-2col">
        <div class="space-y-6">
            ${isEig ? `<div class="card" style="border:1px solid rgba(13,148,136,0.25)">
                <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Allgemeine Angaben / Anamnese (Mitschrift Erstgespräch)</div>
                <div style="padding:20px">
                    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">
                        Notieren Sie hier alle Anmerkungen aus dem Erstgespräch – unmittelbar neben der Einschätzung der einzelnen Module. Diese Mitschrift wird beim Erzeugen der Begründung berücksichtigt: sie fließt in die modulbezogene Argumentation ein und erscheint zusätzlich als zusammenfassender Fließtext.
                    </p>
                    <textarea id="erstgespraech-notes" class="field-input" style="min-height:160px;font-size:13px;line-height:1.6;padding:14px" placeholder="Mitschrift des Erstgesprächs / allgemeine Angaben / Anamnese ..." oninput="erstgespraechNotes = this.value; autoResize(this)"></textarea>
                </div>
            </div>` : ''}

            <div class="special-card" onclick="selectItem(0,'${prefix}')">
                <div class="special-header">⚠ Besondere Bedarfskonstellation (§ 15 Abs. 4 SGB XI)</div>
                <div class="special-body">
                    <span class="special-title">Gebrauchsunfähigkeit beider Arme und Beine</span>
                    <div style="display:flex;align-items:center;gap:12px;flex-shrink:0" onclick="event.stopPropagation()">
                        <input type="range" id="special-${prefix}" min="0" max="1" step="1" value="0" oninput="updateSpecial('${prefix}',this.value)" style="width:100px">
                        <span id="special-label-${prefix}" style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--red);min-width:28px;text-align:right">Nein</span>
                    </div>
                </div>
            </div>

            ${isEig ? `<div class="card" style="border:1px solid rgba(37,99,235,0.2)">
                <div class="card-header"><div class="dot" style="background:var(--accent)"></div>Widerspruchspunkte finden (KI)</div>
                <div style="padding:16px 20px">
                    <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                        Prüft alle Kriterien, die Sie bisher wie der Gutachter bewertet haben, gegen Ihre Notizen aus dem Erstgespräch, den Befund und die Anamnese – und schlägt vor, wo sich aus dem Material eine höhere Bewertung begründen ließe. Sie entscheiden, was übernommen wird.
                    </p>
                    <button class="btn btn-primary" onclick="schlageWiderspruchspunkteVor()">🔎 Weitere Widerspruchspunkte vorschlagen</button>
                </div>
            </div>` : ''}

            <div class="card">
                <table class="nba-table">
                    <thead>
                        <tr>
                            <th style="width:60px;border-right:1px solid var(--border);text-align:center">Nr.</th>
                            <th>Kriterien (BRi offiziell)</th>
                            <th style="width:270px;text-align:center">Einstufung (Slider)</th>
                            <th style="width:52px;text-align:center;border-left:1px solid var(--border)">Pkt</th>
                            <th style="width:46px;text-align:center;border-left:1px solid var(--border)">Info</th>
                        </tr>
                    </thead>
                    <tbody id="table-body-${prefix}"></tbody>
                </table>
            </div>

            <div class="card">
                <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Ergebnis: ${isEig ? 'EIGENE EINSCHÄTZUNG' : 'VORGUTACHTEN'}</div>
                <div style="overflow-x:auto">
                    <table class="result-table">
                        <thead>
                            <tr>
                                <th style="width:35%">Modulbezeichnung</th>
                                <th class="center">Gew. Pkt</th>
                                <th class="center">Einzel Pkt</th>
                                ${isEig ? `<th class="center" style="color:var(--accent);opacity:0.7">Gew. Pkt (Vorg.)</th><th class="center" style="color:var(--accent);opacity:0.7">Einzel (Vorg.)</th>` : ''}
                                <th>Fehlende Pkt / Nächste Stufe</th>
                            </tr>
                        </thead>
                        <tbody id="res-grid-${prefix}"></tbody>
                        <tfoot>
                            ${isEig ? `
                            <tr class="orig-ref-tfoot">
                                <td style="text-align:right">Summe laut Vorgutachten:</td>
                                <td id="total-w-orig-ref" class="center" style="font-size:15px;font-family:var(--font-mono);font-weight:700"></td>
                                <td colspan="4" id="pg-title-orig-ref" style="font-size:13px;font-family:var(--font-mono);font-weight:700;text-align:center">—</td>
                            </tr>` : ''}
                            <tr class="result-tfoot-row">
                                <td style="text-align:right;font-size:11px;font-family:var(--font-mono);color:var(--text-muted)">NBA Gesamtpunkte:</td>
                                <td id="total-w-${prefix}" class="total-pts"></td>
                                <td colspan="${isEig?'4':'2'}" id="pg-title-${prefix}" class="pg-display">—</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div id="gap-footer-${prefix}" class="gap-footer danger" style="display:none"></div>
                <div class="pg-thresholds">
                    <span>PG1: 12,5</span><span>PG2: 27</span><span>PG3: 47,5</span><span>PG4: 70</span><span>PG5: 90</span>
                </div>
            </div>
        </div>

        <div>
            <div class="sidebar-card">
                <div class="sidebar-header">
                    <div class="sidebar-icon">i</div>
                    <div class="sidebar-title-text">Experten-Assistent</div>
                </div>
                <div class="sidebar-empty" id="sidebar-empty-${prefix}">Info-Button (i) wählen</div>
                <div class="sidebar-content" id="sidebar-content-${prefix}">
                    <div class="side-item-title" id="side-title-${prefix}"></div>
                    <div id="side-body-${prefix}"></div>
                </div>
            </div>
        </div>
    </div>`;
}

function syncSpecialUI() {
    [['orig', stateOrig], ['own', stateEigene]].forEach(([pref, st]) => {
        const slider = document.getElementById('special-' + pref);
        const label = document.getElementById('special-label-' + pref);
        if (slider) slider.value = st.special ? 1 : 0;
        if (label) label.innerText = st.special == 1 ? 'Ja' : 'Nein';
    });
}

// --- Diagnoseliste: wächst mit der Anzahl der Diagnosen -------------------------------------
const DIAG_MIN_ROWS = 6;          // so viele Zeilen sind immer sichtbar

function diagRowCount() {
    return document.querySelectorAll('#diag-rows-container tr').length;
}

// Hängt eine einzelne Zeile an. Beim Tippen in der letzten Zeile entsteht automatisch eine neue.
function appendDiagRow(i) {
    const body = document.getElementById('diag-rows-container');
    if (!body) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="border-right:1px solid var(--border)"><input type="text" id="diag-icd-${i}" class="field-input" style="border:none;background:transparent;border-radius:0" placeholder="..." oninput="onDiagInput()"></td>`
                 + `<td><input type="text" id="diag-txt-${i}" class="field-input" style="border:none;background:transparent;border-radius:0" placeholder="Diagnose eingeben..." oninput="onDiagInput()"></td>`;
    body.appendChild(tr);
}

// Stellt sicher, dass mindestens n Zeilen vorhanden sind (bestehende Eingaben bleiben erhalten).
function ensureDiagRows(n) {
    const body = document.getElementById('diag-rows-container');
    if (!body) return;
    const soll = Math.max(DIAG_MIN_ROWS, n || 0);
    for (let i = diagRowCount() + 1; i <= soll; i++) appendDiagRow(i);
}

// Sobald in der letzten Zeile etwas steht, wird eine weitere Leerzeile angeboten.
function onDiagInput() {
    const n = diagRowCount();
    const icd = document.getElementById('diag-icd-' + n);
    const txt = document.getElementById('diag-txt-' + n);
    if ((icd && icd.value.trim()) || (txt && txt.value.trim())) appendDiagRow(n + 1);
}

// Höchste belegte Diagnosenummer in einem gespeicherten Fall ermitteln.
function maxDiagIndex(stammdaten) {
    let max = 0;
    Object.keys(stammdaten || {}).forEach(k => {
        const m = /^diag-(?:icd|txt)-(\d+)$/.exec(k);
        if (m && (stammdaten[k] || '').toString().trim()) max = Math.max(max, parseInt(m[1], 10));
    });
    return max;
}

function init() {
    loadVerfasser();
    const diagBody = document.getElementById('diag-rows-container');
    diagBody.innerHTML = '';
    ensureDiagRows(DIAG_MIN_ROWS);

    // Reiter "Laut Vorgutachten" entfällt – die Vorgutachten-Werte kommen aus dem Import
    // (Prüfansicht) und werden in Reiter "Einschätzung & Vergleich" je Kriterium angezeigt.
    document.getElementById('tab-3').innerHTML = renderNBASection('own');
    // Das Notizfeld steht jetzt in diesem Reiter und wird hier neu aufgebaut –
    // beim Laden eines Falls muss der gespeicherte Text zurückgeschrieben werden.
    const notizen = document.getElementById('erstgespraech-notes');
    if (notizen) { notizen.value = erstgespraechNotes || ''; autoResize(notizen); }
    fillTable('own');
    calculate('own');
    syncSpecialUI();
}

function fillTable(pref) {
    const table = document.getElementById('table-body-'+pref);
    if(!table) return;
    table.innerHTML='';
    const modNames = ["Mobilität","Kognitive Fähigkeiten","Verhaltensweisen","Selbstversorgung","Krankheitsbedingte Anforderungen","Alltagsgestaltung"];
    const st = zustandZu(pref);
    for(let m=1;m<=6;m++){
        table.innerHTML += `<tr class="module-header-row"><td colspan="5">${m}. ${modNames[m-1]}</td></tr>`;
        ITEMS.filter(i=>i.m===m).forEach(i=>{
            if(!st.values[i.id]) st.values[i.id] = (i.m===5 && i.group!=='D') ? {count:0,period:'W'} : 0;
            table.innerHTML += renderRow(i, pref);
        });
        table.innerHTML += `
        <tr class="mod-result-row">
            <td colspan="2">Modul-Ergebnis ${m}</td>
            <td>Gewichtet: <span id="mod-w-${pref}-${m}">0,00</span></td>
            <td id="mod-r-${pref}-${m}" style="text-align:center;border-left:1px solid var(--border)">0</td>
            <td></td>
        </tr>
        ${pref==='own' ? `<tr class="mod-comp-row">
            <td colspan="2" style="padding-left:28px">↳ laut Vorgutachten</td>
            <td>Gew.: <span id="mod-w-comp-${m}">0,00</span></td>
            <td id="mod-r-comp-${m}" style="text-align:center;border-left:1px solid var(--border)">0</td>
            <td></td>
        </tr>` : ''}`;
    }
}

function renderRow(i, pref) {
    const st = zustandZu(pref);
    // Prominenter Vorgutachten-Balken ÜBER der eigenen Einschätzung (nur Reiter "own").
    // Liegt ein Anhörungsgutachten vor, steht dessen Balken dazwischen.
    const vorgBox = pref === 'own' ? `<div class="vorg-box" id="origref-own-${i.id}">${getOriginalRef(i.id)}</div>`
        + (hatZweitgutachten() ? `<div class="vorg-box zweit-box" id="zweitref-own-${i.id}">${getVergleichsRef('zweit', i.id)}</div>` : '')
        : '';
    const hasInfo = hatErlaeuterung(i);

    if(i.m===5 && i.group!=='D'){
        const val = st.values[i.id];
        const noDaily = [55,56,57].includes(i.id);
        return `<tr id="row-${pref}-${i.id}" class="nba-row">
            <td class="nr">${i.nr}</td>
            <td class="title">${i.title}</td>
            <td class="slider-cell">
                ${vorgBox}
                <div class="own-box">
                    <div class="own-label">Eigene Einschätzung</div>
                    <div class="m5-count-box">
                        <input type="range" min="0" max="15" step="1" value="${val.count}" oninput="updateM5Count('${pref}',${i.id},this.value)">
                        <span class="m5-disp" id="m5-disp-${pref}-${i.id}" style="font-family:var(--font-mono);font-size:13px;font-weight:700;min-width:22px;text-align:right">${val.count}</span>
                    </div>
                    <div class="m5-period-row">
                        ${!noDaily?`<button class="m5-period-btn ${val.period==='D'?'active':''}" onclick="updateM5Period('${pref}',${i.id},'D')">Tägl.</button>`:''}
                        <button class="m5-period-btn ${val.period==='W'?'active':''}" onclick="updateM5Period('${pref}',${i.id},'W')">Wöch.</button>
                        <button class="m5-period-btn ${val.period==='M'?'active':''}" onclick="updateM5Period('${pref}',${i.id},'M')">Mon.</button>
                    </div>
                </div>
            </td>
            <td class="pts" id="pts-${pref}-${i.id}">0</td>
            <td class="info-cell"><button class="info-btn" onclick="selectItem(${i.id},'${pref}',this)">${hasInfo?'i':'—'}</button></td>
        </tr>`;
    }
    const curIdx = st.values[i.id] || 0;
    return `<tr id="row-${pref}-${i.id}" class="nba-row">
        <td class="nr">${i.nr}</td>
        <td class="title">${i.title}</td>
        <td class="slider-cell">
            ${vorgBox}
            <div class="own-box">
                <div class="own-label">Eigene Einschätzung</div>
                <div class="slider-wrapper">
                    <input type="range" min="0" max="${i.opts.length-1}" step="1" value="${curIdx}" oninput="updateValue('${pref}',${i.id},this.value)">
                    <span class="slider-label" id="label-${pref}-${i.id}">${i.opts[curIdx]}</span>
                </div>
            </div>
        </td>
        <td class="pts" id="pts-${pref}-${i.id}">0</td>
        <td class="info-cell"><button class="info-btn" onclick="selectItem(${i.id},'${pref}',this)">${hasInfo?'i':'—'}</button></td>
    </tr>`;
}

// Inhalt eines Vergleichsbalkens (Vorgutachten oder Anhörungsgutachten):
// Wert groß + visuelle Punkte-Skala mit markierter Stufe.
function getVergleichsRef(spalte, itemId) {
    const item = ITEMS.find(it=>it.id===itemId);
    const val = zustandZu(spalte).values[itemId];
    const tag = `<span class="vorg-tag">${SPALTEN_NAMEN[spalte] || ''}</span>`;
    if(val===undefined || val===null) {
        return tag + '<div class="vorg-content"><span class="vorg-val vorg-empty">—</span></div>';
    }
    if(item.m===5 && item.group!=='D'){
        const c = (val && typeof val==='object') ? val.count : 0;
        const p = (val && typeof val==='object') ? val.period : 'W';
        const pTxt = p==='D' ? 'pro Tag' : p==='W' ? 'pro Woche' : 'pro Monat';
        return tag + `<div class="vorg-content"><span class="vorg-val">${c}× ${pTxt}</span></div>`;
    }
    const idx = (typeof val==='number') ? val : 0;
    const label = (item.opts && item.opts[idx]) ? item.opts[idx] : '-';
    let dots = '';
    if(item.opts){ for(let k=0;k<item.opts.length;k++){ dots += `<span class="vorg-dot${k===idx?' on':''}"></span>`; } }
    return tag + `<div class="vorg-content"><span class="vorg-val">${escapeHtml(label)}</span><span class="vorg-scale">${dots}</span></div>`;
}

// Bisheriger Name – der Vorgutachten-Balken ist der Regelfall.
function getOriginalRef(itemId) { return getVergleichsRef('orig', itemId); }

// Aktualisiert nur die "Vorgutachten:"-Anzeige einer einzelnen Zeile (statt der ganzen Tabelle).
function refreshOrigRef(id) {
    const el = document.getElementById('origref-own-' + id);
    if (el) el.innerHTML = getOriginalRef(id);
    const z = document.getElementById('zweitref-own-' + id);
    if (z) z.innerHTML = getVergleichsRef('zweit', id);
    applyVorgHighlight(id);
}

// Vergleich eigene Einschätzung vs. Vorgutachten: 1 = eigene höher, -1 = niedriger, 0 = gleich/kein Vorwert.
function ownVsVorg(id) {
    const item = ITEMS.find(it=>it.id===id);
    const ov = stateEigene.values[id];
    const vv = stateOrig.values[id];
    if (vv === undefined || vv === null) return 0; // ohne Vorgutachten-Wert keine Rot-Markierung
    if (item && item.m===5 && item.group!=='D') {
        const daily = v => { if(!v || typeof v!=='object') return 0; let d=Number(v.count)||0; if(v.period==='W') d/=7; else if(v.period==='M') d/=30; return d; };
        const o = daily(ov), w = daily(vv);
        return o>w ? 1 : (o<w ? -1 : 0);
    }
    const oi = (typeof ov==='number') ? ov : 0;
    const wi = (typeof vv==='number') ? vv : 0;
    return oi>wi ? 1 : (oi<wi ? -1 : 0);
}

// Färbt die Vorgutachten-Box rot, wenn die eigene Einschätzung höher ist (sonst gelb).
function applyVorgHighlight(id) {
    const box = document.getElementById('origref-own-' + id);
    if (box) box.classList.toggle('vorg-higher', ownVsVorg(id) === 1);
}

function updateValue(pref, id, idx) {
    const st = zustandZu(pref);
    // Wird ein Gutachtenwert von Hand geaendert, gilt die Zusammenfassung aus dem
    // Gutachten nicht mehr – sonst blieben Punktzahl und Kriterien auseinander.
    if (pref === 'orig' || pref === 'zweit') { delete zustandZu(pref).extracted; }
    setzeBewertung(pref, id, parseInt(idx), 'berater');
    const labelEl = document.getElementById('label-'+pref+'-'+id);
    if(labelEl) labelEl.innerText = ITEMS.find(it=>it.id===id).opts[idx];
    calculate(pref);
    if(pref==='orig'){ refreshOrigRef(id); calculate('own'); updateLiveCompRows(); }
}
function updateM5Count(pref, id, val) {
    const st = zustandZu(pref);
    // Wird ein Gutachtenwert von Hand geaendert, gilt die Zusammenfassung aus dem
    // Gutachten nicht mehr – sonst blieben Punktzahl und Kriterien auseinander.
    if (pref === 'orig' || pref === 'zweit') { delete zustandZu(pref).extracted; }
    const a = st.values[id] || {count:0,period:'W'};
    setzeBewertung(pref, id, {count:Number(val), period:a.period||'W'}, 'berater');
    const disp = document.getElementById('m5-disp-'+pref+'-'+id);
    if(disp) disp.innerText = val;
    calculate(pref);
    if(pref==='orig'){ refreshOrigRef(id); calculate('own'); updateLiveCompRows(); }
}
function updateM5Period(pref, id, p) {
    const st = zustandZu(pref);
    // Wird ein Gutachtenwert von Hand geaendert, gilt die Zusammenfassung aus dem
    // Gutachten nicht mehr – sonst blieben Punktzahl und Kriterien auseinander.
    if (pref === 'orig' || pref === 'zweit') { delete zustandZu(pref).extracted; }
    const b = st.values[id] || {count:0,period:'W'};
    setzeBewertung(pref, id, {count:Number(b.count)||0, period:p}, 'berater');
    fillTable(pref); calculate(pref);
    if(pref==='orig'){ refreshOrigRef(id); calculate('own'); updateLiveCompRows(); }
}
function updateSpecial(pref, val) {
    const st = zustandZu(pref);
    // Wird ein Gutachtenwert von Hand geaendert, gilt die Zusammenfassung aus dem
    // Gutachten nicht mehr – sonst blieben Punktzahl und Kriterien auseinander.
    if (pref === 'orig' || pref === 'zweit') { delete zustandZu(pref).extracted; }
    st.special = parseInt(val);
    document.getElementById('special-label-'+pref).innerText = val==1 ? 'Ja' : 'Nein';
    calculate(pref);
    if(pref==='orig') calculate('own');
}

