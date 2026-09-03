// Unterlagen zur Akte: Arztberichte, Entlassungsberichte, Befunde, Verordnungen,
// Pflegetagebücher und sonstige Schriftstücke.
//
// Anders als js/arztberichte.js, das Diagnosen und Hilfsmittel in die ERFASSUNGSTABELLEN
// überträgt, dokumentiert dieser Weg jede Unterlage als NACHVOLLZIEHBAREN EINTRAG IN DEN
// NOTIZEN: von wem, welche Profession, wann erstellt, bei Krankenhausaufenthalt von wann
// bis wann und warum, dazu eine Zusammenfassung der Diagnosen und des Inhalts.
//
// Die Notizen sind die Hauptquelle für die erzeugten Texte. Was hier hineinkommt, steht
// damit dem Widerspruch, dem Antrag und der Anhörung zur Verfügung.
//
// Grundsatz wie überall: Nichts ist vorausgewählt, nichts wird ungefragt eingetragen.

let unterlagenFunde = [];   // [{ art, verfasser, profession, erstelltAm, ... , _datei }]

const UNTERLAGEN_SCHEMA = {
    type: 'OBJECT',
    properties: {
        art: { type: 'STRING' },
        verfasser: { type: 'STRING' },
        profession: { type: 'STRING' },
        einrichtung: { type: 'STRING' },
        erstelltAm: { type: 'STRING' },
        zeitraumVon: { type: 'STRING' },
        zeitraumBis: { type: 'STRING' },
        aufenthaltVon: { type: 'STRING' },
        aufenthaltBis: { type: 'STRING' },
        aufenthaltGrund: { type: 'STRING' },
        diagnosen: { type: 'STRING' },
        zusammenfassung: { type: 'STRING' },
        pflegerelevant: { type: 'STRING' }
    },
    required: ['zusammenfassung']
};

const UNTERLAGEN_PROMPT = `Du erfasst eine Unterlage für eine Pflegeakte. Es kann ein Arztbrief,
ein Entlassungsbericht, ein Befund, eine Verordnung, ein Pflegetagebuch oder ein sonstiges
Schriftstück sein.

Zwingend: Gib NUR wieder, was tatsächlich im Dokument steht. Erfinde nichts. Findest du eine
Angabe nicht, lass das Feld LEER – schreibe nicht „unbekannt" und rate nicht.

Felder:
- art          Was für eine Unterlage ist es? Zum Beispiel „Entlassungsbericht",
               „Facharztbericht", „Verordnung häuslicher Krankenpflege", „Pflegetagebuch".
- verfasser    Wer hat sie erstellt? Bei Ärzten mit Titel, etwa „Dr. med. A. Muster".
               Bei einem Pflegetagebuch die führende Person, etwa „Tochter, Frau B. Muster".
- profession   Die Fachrichtung oder Funktion: „Facharzt für Neurologie", „Hausarzt",
               „Pflegedienst", „Angehörige". Nur wenn im Dokument genannt.
- einrichtung  Praxis, Klinik oder Pflegedienst, sofern genannt.
- erstelltAm   Datum der Erstellung als tt.mm.jjjj.
- zeitraumVon / zeitraumBis
               Nur bei Unterlagen, die einen Zeitraum abdecken (Pflegetagebuch,
               Verlaufsdokumentation): von wann bis wann, als tt.mm.jjjj.
- aufenthaltVon / aufenthaltBis / aufenthaltGrund
               NUR bei einem stationären Krankenhausaufenthalt: Aufnahme- und
               Entlassdatum als tt.mm.jjjj sowie der Grund der Aufnahme.
- diagnosen    Die im Dokument genannten Diagnosen in einem knappen Fließtext, mit
               ICD-Code, wo einer angegeben ist. Keine Aufzählungszeichen.
- zusammenfassung
               Drei bis fünf Sätze: Worum geht es, was wurde festgestellt, was wurde
               veranlasst? Sachlich, ohne Wertung, ohne Wiederholung der Kopfdaten.
- pflegerelevant
               Ein bis drei Sätze NUR zu dem, was für den Pflegebedarf von Bedeutung ist:
               Einschränkungen, Hilfebedarf, Hilfsmittel, verordnete Therapien, Anleitung
               oder Beaufsichtigung. Steht dazu nichts im Dokument, lass das Feld leer.`;

// Wählt die Dateien aus. Eigener Knopf neben den Notizen.
function unterlagenWaehlen() {
    const el = document.getElementById('unterlagenFiles');
    if (el) el.click();
}

async function leseUnterlagen(event) {
    const dateien = Array.from(event.target.files || []);
    event.target.value = '';
    if (!dateien.length) return;

    const schluessel = ((document.getElementById('user-api-key')?.value || '').trim()
        || (typeof userApiKey !== 'undefined' ? userApiKey.trim() : '')
        || (typeof apiKey !== 'undefined' ? apiKey.trim() : ''));
    if (!schluessel) {
        showToast('Zum Auslesen wird ein Google-API-Schlüssel benötigt – bitte oben rechts eintragen.', 'error');
        return;
    }

    unterlagenFunde = [];
    const fehler = [];
    showOverlay('Unterlagen werden gelesen...', dateien.length + ' Datei(en)');

    for (let i = 0; i < dateien.length; i++) {
        const datei = dateien[i];
        if (typeof merkeImportDokument === 'function') merkeImportDokument(datei, datei.type);
        updateOverlay(`Datei ${i + 1} von ${dateien.length}: ${datei.name}`,
            Math.round((i / dateien.length) * 90));
        try {
            const fund = await leseEineUnterlage(datei);
            fund._datei = datei.name;
            unterlagenFunde.push(fund);
        } catch (e) {
            fehler.push(datei.name + ': ' + (e && e.message ? e.message : e));
        }
    }
    hideOverlay();
    if (fehler.length) showToast('Nicht lesbar: ' + fehler.join(' | '), 'error');
    if (!unterlagenFunde.length) return;
    zeigeUnterlagenFunde();
}

// Getrennt von der Dateiauswahl, damit es sich ohne Datei prüfen lässt.
async function leseEineUnterlage(datei) {
    const teile = (typeof berichtTeile === 'function')
        ? await berichtTeile(datei)
        : [{ text: 'Lies die beigefügte Unterlage aus.' }];
    const res = await callGeminiWithFallback({
        contents: [{ role: 'user', parts: teile }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: UNTERLAGEN_SCHEMA }
    }, UNTERLAGEN_PROMPT);
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('keine Antwort');
    const zaun = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (zaun) txt = zaun[1];
    return JSON.parse(txt.trim());
}

/* Der Eintrag, wie er in den Notizen steht. Bewusst als schlichter Text mit festen
   Zeilen – die Notizen sind ein Textfeld, und der Berater muss darin weiterschreiben,
   ergänzen und streichen können. Leere Angaben werden weggelassen statt mit
   „unbekannt" gefüllt: Eine fehlende Angabe ist eine Information, eine erfundene nicht. */
function unterlagenEintrag(f) {
    if (!f) return '';
    const z = [];
    const hat = v => v !== undefined && v !== null && String(v).trim() !== '';
    const art = hat(f.art) ? String(f.art).trim() : 'Unterlage';
    z.push('--- ' + art + (hat(f._datei) ? ' (' + f._datei + ')' : '') + ' ---');

    const wer = [f.verfasser, f.profession, f.einrichtung].filter(hat).map(s => String(s).trim());
    if (wer.length) z.push('Verfasser: ' + wer.join(', '));
    if (hat(f.erstelltAm)) z.push('Erstellt am: ' + String(f.erstelltAm).trim());
    if (hat(f.zeitraumVon) || hat(f.zeitraumBis)) {
        z.push('Zeitraum: ' + [f.zeitraumVon, f.zeitraumBis].filter(hat).map(s => String(s).trim()).join(' bis '));
    }
    if (hat(f.aufenthaltVon) || hat(f.aufenthaltBis) || hat(f.aufenthaltGrund)) {
        const dauer = [f.aufenthaltVon, f.aufenthaltBis].filter(hat).map(s => String(s).trim()).join(' bis ');
        z.push('Krankenhausaufenthalt: ' + (dauer || 'Zeitraum nicht angegeben')
            + (hat(f.aufenthaltGrund) ? ' – Grund: ' + String(f.aufenthaltGrund).trim() : ''));
    }
    if (hat(f.diagnosen)) z.push('Diagnosen: ' + String(f.diagnosen).trim());
    if (hat(f.zusammenfassung)) z.push('Zusammenfassung: ' + String(f.zusammenfassung).trim());
    if (hat(f.pflegerelevant)) z.push('Pflegerelevant: ' + String(f.pflegerelevant).trim());
    return z.join('\n');
}

// ------------------------------------------------------------- Auswahlliste
function zeigeUnterlagenFunde() {
    const box = document.getElementById('vorschlag-body');
    const kopf = document.querySelector('#vorschlag-overlay .rh-title');
    if (kopf) kopf.innerText = 'Gelesene Unterlagen';
    box.innerHTML = '<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px">'
        + 'Bitte prüfen. <b>Nichts ist vorausgewählt.</b> Angehaktes wird als Eintrag an Ihre '
        + 'Notizen angehängt – dort können Sie es weiter bearbeiten, ergänzen oder streichen. '
        + 'Fehlende Angaben bleiben leer; die App füllt sie nicht auf.</p>'
        + unterlagenFunde.map((f, i) => `
            <label class="vs-item" style="border-left-color:var(--accent2);align-items:flex-start">
                <input type="checkbox" data-idx="${i}">
                <div style="flex:1">
                    <div class="vs-grund" style="white-space:pre-wrap;font-size:12px;line-height:1.6">${escapeHtml(unterlagenEintrag(f))}</div>
                </div>
            </label>`).join('');
    const knopf = document.querySelector('#vorschlag-overlay .review-header .btn-primary');
    if (knopf) knopf.setAttribute('onclick', 'uebernehmeUnterlagen()');
    document.getElementById('vorschlag-overlay').classList.add('active');
}

function uebernehmeUnterlagen() {
    const eintraege = [];
    document.querySelectorAll('#vorschlag-body input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) return;
        const f = unterlagenFunde[parseInt(cb.getAttribute('data-idx'), 10)];
        if (f) eintraege.push(unterlagenEintrag(f));
    });
    const n = haengeAnNotizen(eintraege);
    closeVorschlaege();
    // Auswahlliste wieder auf ihren Ursprungszweck stellen
    const kopf = document.querySelector('#vorschlag-overlay .rh-title');
    if (kopf) kopf.innerText = 'Vorgeschlagene Widerspruchspunkte';
    const knopf = document.querySelector('#vorschlag-overlay .review-header .btn-primary');
    if (knopf) knopf.setAttribute('onclick', 'uebernehmeVorschlaege()');
    showToast(n ? n + ' Unterlage(n) in die Notizen übernommen.' : 'Es wurde nichts ausgewählt.',
        n ? 'success' : 'error');
    return n;
}

/* Hängt die Einträge an die Notizen an – vorhandene Notizen bleiben unangetastet.
   Genau das ist wichtig: Die Mitschrift des Erstgesprächs ist die Hauptquelle der
   erzeugten Texte und darf durch einen Upload nicht überschrieben werden. */
function haengeAnNotizen(eintraege) {
    const liste = (eintraege || []).filter(e => e && e.trim());
    if (!liste.length) return 0;
    const feld = document.getElementById('erstgespraech-notes');
    const alt = feld ? feld.value : (typeof erstgespraechNotes === 'string' ? erstgespraechNotes : '');
    const neu = (alt.trim() ? alt.replace(/\s+$/, '') + '\n\n' : '') + liste.join('\n\n');
    if (feld) { feld.value = neu; if (typeof autoResize === 'function') autoResize(feld); }
    if (typeof erstgespraechNotes !== 'undefined') erstgespraechNotes = neu;
    if (typeof stellungnahmeVeraltet !== 'undefined') stellungnahmeVeraltet = true;
    return liste.length;
}
