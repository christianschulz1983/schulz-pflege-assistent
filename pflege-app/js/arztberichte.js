// Mehrfach-Upload für ärztliche Unterlagen (Erstantrag und Höherstufungsantrag).
// Jede Datei wird einzeln ausgelesen, die Ergebnisse werden zusammengeführt und
// entdoppelt. Übernommen wird nur, was der Pflegeberater bestätigt.

let berichtFunde = null;   // { diagnosen:[], krankenhaus:[], hilfsmittel:[], medikation:[], therapien:[] }

const BERICHT_SCHEMA = {
    type: "OBJECT",
    properties: {
        diagnosen: { type: "ARRAY", items: { type: "OBJECT", properties: {
            icd: { type: "STRING" }, text: { type: "STRING" }, ed: { type: "STRING" } }, required: ["text"] } },
        krankenhaus: { type: "ARRAY", items: { type: "OBJECT", properties: {
            von: { type: "STRING" }, bis: { type: "STRING" }, grund: { type: "STRING" } }, required: ["grund"] } },
        hilfsmittel: { type: "ARRAY", items: { type: "OBJECT", properties: {
            bezeichnung: { type: "STRING" }, seit: { type: "STRING" } }, required: ["bezeichnung"] } },
        medikation: { type: "ARRAY", items: { type: "OBJECT", properties: {
            bezeichnung: { type: "STRING" }, applikation: { type: "STRING" },
            anzahl: { type: "STRING" }, zeitraum: { type: "STRING" } }, required: ["bezeichnung"] } },
        therapien: { type: "ARRAY", items: { type: "OBJECT", properties: {
            fach: { type: "STRING" }, anzahl: { type: "STRING" }, zeitraum: { type: "STRING" } }, required: ["fach"] } }
    },
    required: ["diagnosen"]
};

const BERICHT_PROMPT = `Du liest ärztliche Unterlagen (Arztbriefe, Entlassungsberichte, Befunde, Verordnungen)
und trägst die darin enthaltenen Angaben zusammen.

Zwingend:
1. Gib NUR wieder, was tatsächlich im Dokument steht. Erfinde nichts.
2. Diagnosen: ICD-10-Code, Bezeichnung und – nur wenn ausdrücklich angegeben – das Datum der Erstdiagnose
   im Feld "ed" als tt.mm.jjjj. Steht dort nur das Berichtsdatum, lasse "ed" LEER. Rate niemals.
3. Krankenhausaufenthalte: Aufnahme- und Entlassdatum als tt.mm.jjjj sowie die Aufnahmediagnose.
4. Hilfsmittel: nur tatsächlich genannte Hilfsmittel (Rollator, Pflegebett, Hörgerät und Ähnliches).
5. Medikation: Wirkstoff oder Handelsname, Applikationsform und Häufigkeit, sofern angegeben.
   "zeitraum" ist eines von: pro Tag, pro Woche, pro Monat.
6. Therapien: verordnete Heilmittel (Physiotherapie, Ergotherapie, Logopädie und Ähnliches) mit Häufigkeit.
7. Findet sich zu einem Bereich nichts, gib eine leere Liste zurück.`;

function berichteWaehlen() {
    document.getElementById('berichtFiles').click();
}

async function leseArztberichte(event) {
    const dateien = Array.from(event.target.files || []);
    event.target.value = '';
    if (!dateien.length) return;
    const keyPresent = ((document.getElementById('user-api-key')?.value || '').trim() || userApiKey.trim() || apiKey.trim());
    if (!keyPresent) { showToast('Zum Auslesen wird ein Google-API-Schlüssel benötigt – bitte oben rechts eintragen.', 'error'); return; }

    const gesamt = { diagnosen: [], krankenhaus: [], hilfsmittel: [], medikation: [], therapien: [] };
    const fehler = [];
    showOverlay('Ärztliche Unterlagen werden gelesen...', dateien.length + ' Datei(en)');

    for (let i = 0; i < dateien.length; i++) {
        const datei = dateien[i];
        // Für die spätere Korrektur merken, damit die Unterlage danebengelegt werden kann
        if (typeof merkeImportDokument === 'function') merkeImportDokument(datei, datei.type);
        updateOverlay(`Datei ${i + 1} von ${dateien.length}: ${datei.name}`, Math.round((i / dateien.length) * 90));
        try {
            const teile = await berichtTeile(datei);
            const res = await callGeminiWithFallback({
                contents: [{ role: 'user', parts: teile }],
                generationConfig: { responseMimeType: 'application/json', responseSchema: BERICHT_SCHEMA }
            }, BERICHT_PROMPT);
            let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!txt) throw new Error('keine Antwort');
            const zaun = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (zaun) txt = zaun[1];
            const d = JSON.parse(txt.trim());
            Object.keys(gesamt).forEach(k => (d[k] || []).forEach(e => {
                e._quelle = datei.name;
                gesamt[k].push(e);
            }));
        } catch (e) {
            fehler.push(datei.name + ': ' + e.message);
        }
    }
    hideOverlay();

    // Entdoppeln über alle Dateien hinweg
    berichtFunde = {
        diagnosen: entdoppeln(gesamt.diagnosen, e => ((e.icd || '') + '|' + (e.text || '')).toLowerCase().replace(/\s+/g, ' ')),
        krankenhaus: entdoppeln(gesamt.krankenhaus, e => ((e.von || '') + '|' + (e.bis || '')).toLowerCase()),
        hilfsmittel: entdoppeln(gesamt.hilfsmittel, e => (e.bezeichnung || '').toLowerCase().replace(/\s+/g, ' ')),
        medikation: entdoppeln(gesamt.medikation, e => (e.bezeichnung || '').toLowerCase().replace(/\s+/g, ' ')),
        therapien: entdoppeln(gesamt.therapien, e => (e.fach || '').toLowerCase().replace(/\s+/g, ' '))
    };
    if (fehler.length) showToast('Nicht lesbar: ' + fehler.join(' | '), 'error');
    zeigeBerichtFunde();
}

// Eintrag mit den meisten ausgefüllten Feldern gewinnt; Quellen werden gesammelt.
function entdoppeln(liste, schluessel) {
    const map = {};
    liste.forEach(e => {
        const k = schluessel(e);
        if (!k.replace(/\|/g, '').trim()) return;
        // Verwaltungsfelder nicht mitzählen, sonst gewinnt nie der vollständigere Eintrag
        const gefuellt = o => Object.keys(o)
            .filter(x => x !== '_quelle' && x !== '_quellen' && (o[x] || '').toString().trim()).length;
        if (!map[k]) { map[k] = Object.assign({}, e, { _quellen: [e._quelle] }); return; }
        if (!map[k]._quellen.includes(e._quelle)) map[k]._quellen.push(e._quelle);
        if (gefuellt(e) > gefuellt(map[k])) {
            const q = map[k]._quellen;
            map[k] = Object.assign({}, e, { _quellen: q });
        }
    });
    return Object.keys(map).map(k => map[k]);
}

async function berichtTeile(datei) {
    // Erst lokal auslesen (Text und OCR), sonst die Datei selbst an Google geben
    const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(datei);
    });
    if (!isOnlineHosted()) {
        try {
            const lokal = await tryLocalExtract(base64, datei.type);
            if (lokal && lokal.ok && lokal.text && lokal.text.trim().length > 60) {
                return [{ text: 'Lies aus folgender ärztlicher Unterlage die Angaben aus.\n\n=== UNTERLAGE ===\n' + lokal.text }];
            }
        } catch (e) {}
    }
    return [{ text: 'Lies aus der beigefügten ärztlichen Unterlage die Angaben aus.' },
            { inlineData: { mimeType: datei.type, data: base64 } }];
}

// ------------------------------------------------------------- Auswahlliste
function zeigeBerichtFunde() {
    const box = document.getElementById('vorschlag-body');
    vorschlagOverlayZweck('Gefundene Angaben aus den Unterlagen', 'uebernehmeBerichtFunde()');
    const abschnitte = [
        ['diagnosen', 'Diagnosen', e => [e.icd, e.text, e.ed ? 'Erstdiagnose ' + e.ed : 'Erstdiagnose unbekannt']],
        ['krankenhaus', 'Krankenhausaufenthalte', e => [e.von, e.bis, e.grund]],
        ['hilfsmittel', 'Hilfsmittel', e => [e.bezeichnung, e.seit]],
        ['medikation', 'Medikation', e => [e.bezeichnung, e.applikation, [e.anzahl, e.zeitraum].filter(Boolean).join(' ')]],
        ['therapien', 'Therapien', e => [e.fach, [e.anzahl, e.zeitraum].filter(Boolean).join(' ')]]
    ];
    const leer = abschnitte.every(([k]) => !(berichtFunde[k] || []).length);
    if (leer) {
        box.innerHTML = '<div class="vs-leer">In den Unterlagen ließen sich keine übernehmbaren Angaben finden.</div>';
    } else {
        box.innerHTML = '<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px">'
            + 'Bitte prüfen. <b>Nichts ist vorausgewählt.</b> Nur Angehaktes wird übernommen und an die vorhandenen Einträge angehängt.</p>'
            + abschnitte.filter(([k]) => (berichtFunde[k] || []).length).map(([k, titel, felder]) => `
                <div class="rev-sec-title" style="margin-top:14px">${escapeHtml(titel)}</div>
                ${berichtFunde[k].map((e, i) => `
                    <label class="vs-item" style="border-left-color:var(--accent2)">
                        <input type="checkbox" data-bereich="${k}" data-idx="${i}">
                        <div style="flex:1">
                            <div class="vs-grund">${felder(e).filter(Boolean).map(escapeHtml).join(' · ')}</div>
                            <div class="vs-fund">Quelle: ${escapeHtml((e._quellen || []).join(', '))}</div>
                        </div>
                    </label>`).join('')}
                ${k === 'medikation' ? '<div style="font-size:11px;color:var(--text-muted);line-height:1.55;'
                    + 'margin:4px 0 0 4px">Angehaktes wird zu einer Zeile je Applikationsort zusammengefasst – '
                    + 'nach der BRi zählt der Ort und seine Häufigkeit, nicht die Zahl der Präparate.</div>' : ''}`).join('');
    }
    document.getElementById('vorschlag-overlay').classList.add('active');
}

function uebernehmeBerichtFunde() {
    const ziel = { diagnosen: 0, krankenhaus: 0, hilfsmittel: 0, medikation: 0, therapien: 0 };
    // Medikamente werden gesammelt und erst am Ende je Applikationsort zusammengefasst.
    const medikamente = [];
    document.querySelectorAll('#vorschlag-body input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) return;
        const bereich = cb.getAttribute('data-bereich');
        const e = berichtFunde[bereich][parseInt(cb.getAttribute('data-idx'), 10)];
        if (!e) return;
        if (bereich === 'diagnosen') {
            const n = naechsteDiagZeile();
            ensureDiagRows(n);
            const a = document.getElementById('diag-icd-' + n), b = document.getElementById('diag-txt-' + n);
            if (a) a.value = e.icd || '';
            if (b) b.value = (e.text || '') + (e.ed ? ' (Erstdiagnose ' + e.ed + ')' : '');
        } else if (bereich === 'krankenhaus') {
            erfHinzufuegen('krankenhaus', { von: formatToYYYYMMDD(e.von) || '', bis: formatToYYYYMMDD(e.bis) || '', grund: e.grund || '' });
        } else if (bereich === 'hilfsmittel') {
            // Aus einem Arztbericht ist nicht ersichtlich, ob eine Pflegeperson hilft –
            // das Feld „Tätigkeit" bleibt deshalb leer und der Berater trägt es ein.
            erfHinzufuegen('hilfsmittel', { bezeichnung: e.bezeichnung || '',
                nutzung: 'genutzt', taetigkeit: e.seit ? 'vorhanden seit ' + e.seit : '' });
        } else if (bereich === 'medikation') {
            medikamente.push(e);
        } else if (bereich === 'therapien') {
            erfHinzufuegen('arztbesuche', { fach: e.fach || '', anzahl: e.anzahl || '', zeitraum: e.zeitraum || '' });
        }
        ziel[bereich]++;
    });
    // Je Applikationsort eine Zeile – nicht je Präparat (BRi F 4.5.1)
    const zeilen = medikationGruppiert(medikamente);
    zeilen.forEach(z => erfHinzufuegen('medikation', z));
    closeVorschlaege();
    if (typeof renderErfassung === 'function') renderErfassung();
    const summe = Object.values(ziel).reduce((a, b) => a + b, 0);
    const medHinweis = (ziel.medikation > zeilen.length)
        ? ' ' + ziel.medikation + ' Medikamente stehen als ' + zeilen.length + ' Zeile(n) je Applikationsort '
          + 'in der Tabelle – nach der BRi zählt der Ort, nicht die Zahl der Präparate. '
          + 'Die Spalte „Unterstützung" ist offen: Wer hilft, steht in keinem Arztbrief.'
        : '';
    showToast(summe ? summe + ' Angabe(n) übernommen. Bitte in den Tabellen prüfen und ergänzen.' + medHinweis
                    : 'Es wurde nichts ausgewählt.', summe ? 'success' : 'error');
}

function naechsteDiagZeile() {
    let n = 1;
    while (true) {
        const a = document.getElementById('diag-icd-' + n), b = document.getElementById('diag-txt-' + n);
        if (!a && !b) return n;
        if (!(a && a.value.trim()) && !(b && b.value.trim())) return n;
        n++;
        if (n > 60) return n;
    }
}

// erfHinzufuegen() steht jetzt in js/erfassung.js – dort, wo die Tabellen liegen.
