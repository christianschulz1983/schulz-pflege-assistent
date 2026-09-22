// Ärztliche Unterlagen als Beleg – Widerspruch und Anhörung.
//
// Wunsch des Verfassers: Arztberichte hochladen und in die Stellungnahme einbauen, etwa
// wenn Diagnosen oder Annahmen des Gutachtens schlicht falsch sind. In seinen
// Anhörungsschreiben gehören solche Belege zu den stärksten Argumenten (Entlassbericht mit
// Delir gegen „Kognition unbeeinträchtigt", genehmigte Orthese gegen „nicht vorhanden",
// Verordnung Physiotherapie gegen „4.5.14 nicht gewertet").
//
// Ablauf:
//   1. Hochladen (die Anlagenliste aus js/anlagen.js – jetzt auch im Widerspruch).
//   2. Auslesen je Unterlage: Art, Datum, Diagnosen, Verordnungen, wörtliche Befunde.
//   3. Abgleich mit dem Gutachten (gerechnet, keine KI): fehlende Diagnosen, nicht
//      gewertete Verordnungen. Jeder Fund ist ein VORSCHLAG zum Abhaken – nichts ist
//      vorausgewählt, und keine Bewertung wird von der App gesetzt.
//   4. Bestätigte Funde erscheinen knapp in den Allgemeinen Angaben (#stmt-belege), die
//      Inhalte zugeordneter Anlagen gehen je Kriterium an die KI – mit Quelle und nur
//      wörtlich zitiert (die Zitatprüfung kennt die Anlagen).

// Dateien bleiben nur im Arbeitsspeicher (für „erneut auslesen"); gespeichert wird die
// Auswertung, nicht die Datei.
const belegDateien = {};

function istBelegModus() {
    return (typeof appModus !== 'undefined') && (appModus === 'widerspruch' || appModus === 'anhoerung');
}

// Der Karteireiter-Bereich. Einmal aufgebaut; sichtbar in Widerspruch und Anhörung.
function renderBelegeBereich() {
    const ziel = document.getElementById('belege-bereich');
    if (!ziel) return;
    ziel.style.display = istBelegModus() ? '' : 'none';
    if (ziel.dataset.gebaut === '1') { if (typeof renderAnlagen === 'function') renderAnlagen(); return; }
    ziel.innerHTML = `
        <div class="card">
            <div class="card-header"><div class="dot"></div>Ärztliche Unterlagen und Anlagen</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:10px">
                    Arztberichte, Entlassberichte, Verordnungen oder Hilfsmittelgenehmigungen hochladen.
                    Die App liest jede Unterlage aus und gleicht sie mit dem Gutachten ab – etwa fehlende
                    Diagnosen oder verordnete Maßnahmen, die im Gutachten nicht gewertet sind. <b>Nichts
                    ist vorausgewählt:</b> Nur was Sie abhaken, erscheint im Schriftstück; Bewertungen
                    ändern Sie wie gewohnt selbst. Ordnen Sie eine Anlage dem Kriterium zu, das sie
                    belegt – dann wird sie dort mit Quelle genannt und steht im Anlagenverzeichnis.
                    Die Dateien selbst legen Sie beim Versand bei.
                </p>
                <button class="btn btn-secondary" onclick="document.getElementById('anlagenFiles').click()">
                    + Unterlagen hinzufügen</button>
                <input type="file" id="anlagenFiles" accept=".pdf,image/*" multiple
                       onchange="anlagenHinzufuegen(event)" style="display:none">
                <span id="anlagen-hinweis" style="font-size:11px;color:var(--text-muted);margin-left:10px"></span>
                <div id="anlagen-liste" style="margin-top:12px"></div>
            </div>
        </div>`;
    ziel.dataset.gebaut = '1';
    if (typeof renderAnlagen === 'function') renderAnlagen();
}

// ------------------------------------------------------------------ Auslesen
const BELEG_SCHEMA = {
    type: 'OBJECT',
    properties: {
        art: { type: 'STRING' }, datum: { type: 'STRING' }, aussteller: { type: 'STRING' },
        diagnosen: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            icd: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['text'] } },
        verordnungen: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            bezeichnung: { type: 'STRING' }, haeufigkeit: { type: 'STRING' }, dauer: { type: 'STRING' } },
            required: ['bezeichnung'] } },
        befunde: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            bereich: { type: 'STRING' }, zitat: { type: 'STRING' } }, required: ['zitat'] } },
        dauer: { type: 'STRING' }
    },
    required: ['diagnosen']
};

const BELEG_PROMPT = `Du liest EINE ärztliche Unterlage (Arztbrief, Entlassbericht, Befundbericht, Verordnung,
Hilfsmittelgenehmigung, Medikamentenplan) für eine pflegefachliche Stellungnahme.

Zwingend:
1. Gib NUR wieder, was tatsächlich im Dokument steht. Erfinde nichts, ergänze nichts.
2. art: eine von Arztbericht, Krankenhausbericht, Befundbericht, Verordnung,
   Hilfsmittelverordnung, Medikamentenplan, Sonstiges. datum: Datum der Unterlage (tt.mm.jjjj).
   aussteller: Fachrichtung oder Einrichtung (z. B. „Neurologische Praxis", „Klinik für Geriatrie").
3. diagnosen: ICD-10-Code (falls angegeben) und Bezeichnung, wie im Dokument.
4. verordnungen: verordnete oder genehmigte Maßnahmen – Heilmittel (Physiotherapie, Ergotherapie,
   Logopädie …), Hilfsmittel (Orthese, Kompressionsstrümpfe, Hörgerät …), Medikamente,
   Injektionen, Messungen, Wundversorgung, Sauerstoff und Ähnliches – mit Häufigkeit
   („2x pro Woche", „täglich") und Dauer, soweit angegeben.
5. befunde: bis zu acht Aussagen zu Einschränkungen im Alltag (Mobilität, Kognition, Verhalten
   und Psyche, Selbstversorgung, Sturzereignisse) als WÖRTLICHES Zitat (höchstens 35 Wörter,
   zeichengenau aus dem Dokument). bereich: Mobilität, Kognition, Verhalten und Psyche,
   Selbstversorgung, Therapie oder Sonstiges.
6. dauer: wörtliche Angaben zur Dauer oder Prognose (z. B. „seit 2019", „dauerhaft"), sonst leer.
7. Findet sich zu einem Bereich nichts, gib eine leere Liste bzw. einen leeren Text zurück.`;

// Liest eine Datei aus und legt das Ergebnis an der Anlage ab.
async function belegAuslesen(a, datei) {
    if (!a || !datei) return false;
    const teile = await berichtTeile(datei);
    const res = await callGeminiWithFallback({
        contents: [{ role: 'user', parts: teile }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: BELEG_SCHEMA }
    }, BELEG_PROMPT);
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('keine Antwort');
    const zaun = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (zaun) txt = zaun[1];
    belegUebernehmen(a, JSON.parse(txt.trim()));
    return true;
}

// Auswertung an der Anlage ablegen; leere Stammfelder der Anlage ergänzen (nie überschreiben).
function belegUebernehmen(a, d) {
    const liste = x => Array.isArray(x) ? x : [];
    a.auswertung = {
        art: String(d.art || '').trim(), datum: String(d.datum || '').trim(),
        aussteller: String(d.aussteller || '').trim(), dauer: String(d.dauer || '').trim(),
        diagnosen: liste(d.diagnosen).filter(x => x && (x.text || x.icd))
            .map(x => ({ icd: String(x.icd || '').trim(), text: String(x.text || '').trim() })),
        verordnungen: liste(d.verordnungen).filter(x => x && x.bezeichnung)
            .map(x => ({ bezeichnung: String(x.bezeichnung).trim(), haeufigkeit: String(x.haeufigkeit || '').trim(),
                         dauer: String(x.dauer || '').trim() })),
        befunde: liste(d.befunde).filter(x => x && x.zitat)
            .map(x => ({ bereich: String(x.bereich || '').trim(), zitat: String(x.zitat).trim() })).slice(0, 8)
    };
    a.status = 'gelesen';
    if (!a.bestaetigt) a.bestaetigt = [];
    if (!a.art && ANLAGE_ARTEN.includes(a.auswertung.art)) a.art = a.auswertung.art;
    if (!a.datum && a.auswertung.datum && typeof formatToYYYYMMDD === 'function') a.datum = formatToYYYYMMDD(a.auswertung.datum) || '';
    if (a.auswertung.aussteller && (!a.bezeichnung || a.bezeichnung === anlageBezeichnungAus(a.dateiname))) {
        a.bezeichnung = a.auswertung.aussteller;
    }
}

// Mehrere Unterlagen nacheinander auslesen (eine KI-Anfrage je Unterlage).
async function belegeAuslesen(liste) {
    const keyPresent = ((document.getElementById('user-api-key')?.value || '').trim() || userApiKey.trim() || apiKey.trim());
    if (!keyPresent) {
        showToast('Zum Auslesen der Unterlagen wird ein Google-API-Schlüssel benötigt. Die Anlagen sind '
            + 'trotzdem hinzugefügt – Art, Datum und Zuordnung lassen sich von Hand eintragen.', 'error');
        return;
    }
    const fehler = [];
    showOverlay('Ärztliche Unterlagen werden gelesen...', liste.length + ' Datei(en)');
    try {
        for (let k = 0; k < liste.length; k++) {
            const a = liste[k];
            updateOverlay(`Unterlage ${k + 1} von ${liste.length}: ${a.dateiname}`, Math.round((k / liste.length) * 90));
            try { await belegAuslesen(a, belegDateien[a.id]); }
            catch (e) {
                a.status = 'fehler';
                fehler.push(a.dateiname + ': ' + ((typeof kiFehlerErklaerung === 'function') ? kiFehlerErklaerung(e) : e.message));
                if (/abgebrochen/i.test(fehler[fehler.length - 1])) break;
            }
        }
    } finally { hideOverlay(); }
    renderAnlagen();
    if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Ärztliche Unterlagen');
    const funde = liste.reduce((n, a) => n + belegAbgleich(a).length, 0);
    if (fehler.length) showToast('Nicht gelesen: ' + fehler.join(' | '), 'error');
    else showToast(liste.length + ' Unterlage(n) gelesen. ' + (funde
        ? funde + ' Abweichung(en) zum Gutachten gefunden – bitte prüfen und abhaken.'
        : 'Keine Abweichung zum Gutachten gefunden.'), 'success');
}

function belegErneutAuslesen(i) {
    const a = anlagen[i];
    if (!a) return;
    if (!belegDateien[a.id]) {
        showToast('Die Datei liegt nicht mehr vor (nach dem Laden eines Falls). Bitte die Unterlage erneut hinzufügen.', 'error');
        return;
    }
    belegeAuslesen([a]);
}

// ------------------------------------------------------------------ Abgleich
// Welche Bewertung gilt als „Gutachten"? Im Widerspruch das Erstgutachten, in der Anhörung
// das Zweitgutachten (gegen das sich die Stellungnahme richtet).
function belegGutachtenStand() {
    return (typeof appModus !== 'undefined' && appModus === 'anhoerung' && typeof stateZweit !== 'undefined') ? stateZweit : stateOrig;
}

function icdNorm(c) {
    return String(c || '').toUpperCase().replace(/\s+[GVZLRBA]{1,2}$/, '').replace(/[^A-Z0-9.]/g, '').replace(/\.-?$/, '');
}

// ICD-Codes, die im Gutachten (Diagnosezeilen auf Reiter 1) stehen
function gutachtenIcds() {
    const out = [];
    for (let n = 1; n <= 60; n++) {
        const el = document.getElementById('diag-icd-' + n);
        if (!el) { if (n > 12) break; continue; }
        const c = icdNorm(el.value);
        if (c) out.push(c);
    }
    return out;
}

/* Welches Kriterium in Modul 5 betrifft eine Verordnung? Nach dem BRi-Wortlaut:
   Heilmittel beim Therapeuten -> 4.5.14 (Besuch therapeutischer Einrichtungen),
   Eigenübungen -> 4.5.11 (Therapie im Hausbesuch zählt dort ausdrücklich NICHT),
   Prothesen, Orthesen, Epithesen, Sehhilfen, Hörgeräte, Kompressionsstrümpfe -> 4.5.7. */
const BELEG_M5_REGELN = [
    { nr: '4.5.11', re: /eigen[üu]bung|heim[üu]bung|[üu]bungsprogramm/i },
    { nr: '4.5.14', re: /physio|krankengymnast|ergotherap|logop[äa]d|lymphdrainage|manuelle therapie|psychotherap|heilmittel/i },
    { nr: '4.5.7',  re: /orthese|schiene|prothese|epithese|kompression|h[öo]rger[äa]t|sehhilfe|brille|bandage/i },
    { nr: '4.5.2',  re: /injektion|spritze|insulin|heparin|subkutan/i },
    { nr: '4.5.4',  re: /sauerstoff|absaug|inhalation/i },
    { nr: '4.5.6',  re: /blutzucker|blutdruck|messung|gewichtskontrolle|bz-kontrolle/i },
    { nr: '4.5.8',  re: /verband|wund/i },
    { nr: '4.5.9',  re: /stoma/i },
    { nr: '4.5.10', re: /katheter|abf[üu]hr|einlauf|klistier/i },
    { nr: '4.5.5',  re: /salbe|creme|einreib|k[äa]lte|w[äa]rme/i },
    { nr: '4.5.12', re: /dialyse|beatmung/i },
    { nr: '4.5.1',  re: /tablette|tropfen|medikament|medikation|kapsel|\bmg\b|dosier/i }
];
function belegKriteriumFuer(bezeichnung) {
    const r = BELEG_M5_REGELN.find(x => x.re.test(String(bezeichnung || '')));
    return r ? r.nr : '';
}

function m5Gewertet(stand, nr) {
    const item = ITEMS.find(i => i.nr === nr);
    if (!item || !stand || !stand.values) return false;
    const v = stand.values[item.id];
    return (v && typeof v === 'object') ? (Number(v.count) || 0) > 0 : (Number(v) || 0) > 0;
}

/* Funde einer Anlage. Rückgabe: [{ key, typ, text, nr }] – key ist stabil, damit das Häkchen
   beim erneuten Aufbau erhalten bleibt. */
function belegAbgleich(a) {
    const au = a && a.auswertung;
    if (!au) return [];
    const funde = [];
    const vorhanden = gutachtenIcds();
    (au.diagnosen || []).forEach(d => {
        const c = icdNorm(d.icd);
        if (!c) return;                                   // ohne Code kein belastbarer Abgleich
        const kat = c.slice(0, 3);
        if (vorhanden.some(v => v === c || v.slice(0, 3) === kat)) return;
        const psych = /^F/.test(c);
        funde.push({ key: 'dx:' + c, typ: 'diagnose', nr: '',
            text: 'Diagnose nicht im Gutachten aufgeführt: ' + c + ' ' + d.text
                + (psych ? ' (fachärztliche Diagnose – bedeutsam für Modul 3)' : ''),
            // Wortlaut im Schriftstück – ohne die Arbeitshinweise für den Berater
            dok: 'die Diagnose ' + c + ' ' + d.text });
    });
    const stand = belegGutachtenStand();
    (au.verordnungen || []).forEach(v => {
        const nr = belegKriteriumFuer(v.bezeichnung);
        if (!nr || m5Gewertet(stand, nr)) return;
        const item = ITEMS.find(i => i.nr === nr);
        funde.push({ key: 'vo:' + nr + ':' + v.bezeichnung.toLowerCase().slice(0, 40), typ: 'verordnung', nr: nr,
            text: 'Verordnet: ' + v.bezeichnung + (v.haeufigkeit ? ' (' + v.haeufigkeit + ')' : '')
                + ' – im Gutachten unter ' + nr + ' ' + (item ? item.title : '') + ' nicht gewertet',
            dok: 'die Verordnung ' + v.bezeichnung + (v.haeufigkeit ? ' (' + v.haeufigkeit + ')' : '')
                + ', die im Gutachten unter ' + nr + ' nicht gewertet ist' });
    });
    return funde;
}

function belegFundUmschalten(i, key, an) {
    const a = anlagen[i];
    if (!a) return;
    if (!Array.isArray(a.bestaetigt)) a.bestaetigt = [];
    a.bestaetigt = a.bestaetigt.filter(k => k !== key);
    if (an) a.bestaetigt.push(key);
    if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Ärztliche Unterlagen');
}

// Nur die abgehakten Funde – sie allein erscheinen im Schriftstück.
function bestaetigteBelegFunde() {
    const out = [];
    (anlagen || []).forEach((a, i) => {
        const ok = new Set(a.bestaetigt || []);
        belegAbgleich(a).forEach(f => { if (ok.has(f.key)) out.push(Object.assign({ anlage: i }, f)); });
    });
    return out;
}

// Anzeige unter der Anlage: gelesene Inhalte und Funde zum Abhaken
function belegDetailHtml(a, i) {
    const au = a.auswertung;
    const knopf = belegDateien[a.id]
        ? `<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:11px" onclick="belegErneutAuslesen(${i})">${au ? '↻ erneut auslesen' : '⚡ auslesen'}</button>` : '';
    if (!au) {
        return `<div style="font-size:11px;color:var(--text-muted);margin-top:8px">${a.status === 'fehler'
            ? '⚠ Die Unterlage konnte nicht gelesen werden.' : 'Noch nicht ausgelesen.'} ${knopf}</div>`;
    }
    const zeile = (titel, werte) => werte.length
        ? `<div style="margin-top:4px"><b>${escapeHtml(titel)}:</b> ${werte.map(escapeHtml).join(' · ')}</div>` : '';
    const funde = belegAbgleich(a);
    const ok = new Set(a.bestaetigt || []);
    const fundHtml = funde.length
        ? `<div style="margin-top:8px;font-weight:700">Abweichungen zum Gutachten – abhaken, was ins Schriftstück soll:</div>`
          + funde.map(f => `<label class="vs-item" style="border-left-color:var(--accent2);margin-top:4px">
                <input type="checkbox" ${ok.has(f.key) ? 'checked' : ''}
                       onchange="belegFundUmschalten(${i}, ${escapeHtml(JSON.stringify(f.key))}, this.checked)">
                <div style="flex:1"><div class="vs-grund">${escapeHtml(f.text)}</div>
                ${f.nr ? `<div class="vs-fund">Wenn Sie das rügen: ${escapeHtml(f.nr)} auf Reiter „Einschätzung" bewerten und die Anlage diesem Kriterium zuordnen.</div>` : ''}</div>
            </label>`).join('')
        : `<div style="margin-top:8px;color:var(--text-muted)">Keine Abweichung zum Gutachten gefunden.</div>`;
    return `<div style="font-size:11px;line-height:1.55;color:var(--text-secondary);margin-top:8px;padding:8px 10px;background:var(--bg-card2);border-radius:8px">
        <div style="display:flex;align-items:center;gap:8px"><b>Aus der Unterlage gelesen</b> ${knopf}</div>
        ${zeile('Diagnosen', (au.diagnosen || []).map(d => [d.icd, d.text].filter(Boolean).join(' ')))}
        ${zeile('Verordnungen', (au.verordnungen || []).map(v => v.bezeichnung + (v.haeufigkeit ? ' (' + v.haeufigkeit + ')' : '')))}
        ${zeile('Befunde (wörtlich)', (au.befunde || []).map(b => '„' + b.zitat + '“'))}
        ${zeile('Dauer', au.dauer ? [au.dauer] : [])}
        ${fundHtml}
    </div>`;
}

// ------------------------------------------------------------------ Schriftstück
// Ein knapper Absatz in den Allgemeinen Angaben – nur bestätigte Funde, mit Anlagennummer.
function belegeAllgemeinHtml() {
    const f = bestaetigteBelegFunde();
    if (!f.length) return '';
    const teile = f.map(x => (x.dok || x.text) + ' (Anlage ' + (x.anlage + 1) + ')');
    return `<p id="stmt-belege">Die beigefügten ärztlichen Unterlagen belegen Umstände, die im Gutachten nicht `
         + `berücksichtigt sind: ${escapeHtml(teile.join('; '))}.</p>`;
}

// Für die KI: was eine zugeordnete Anlage enthält (nur Gelesenes, Zitate wörtlich)
function belegInhaltFuerPrompt(a, i) {
    const au = a && a.auswertung;
    if (!au) return '';
    const z = [];
    if ((au.diagnosen || []).length) z.push('Diagnosen: ' + au.diagnosen.map(d => [d.icd, d.text].filter(Boolean).join(' ')).join('; '));
    if ((au.verordnungen || []).length) z.push('Verordnungen: ' + au.verordnungen.map(v => v.bezeichnung + (v.haeufigkeit ? ' (' + v.haeufigkeit + ')' : '')).join('; '));
    if ((au.befunde || []).length) z.push('Wörtliche Befunde: ' + au.befunde.map(b => '„' + b.zitat + '“').join(' '));
    if (au.dauer) z.push('Dauer: ' + au.dauer);
    return z.length ? '  Inhalt von ' + anlageText(a, i) + ': ' + z.join(' | ') + '\n' : '';
}

// Alle wörtlichen Befunde und Diagnosen – die Zitatprüfung lässt sie als Beleg gelten.
function anlagenZitatText() {
    return (anlagen || []).map(a => {
        const au = a.auswertung || {};
        return [].concat((au.befunde || []).map(b => b.zitat), (au.diagnosen || []).map(d => d.text),
                         (au.verordnungen || []).map(v => v.bezeichnung)).join(' ');
    }).join(' ');
}
