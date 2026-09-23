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
    // Nicht im Kopf, aber im Text: „In meiner pflegefachlichen Stellungnahme vom …"
    { id: 'anh-ps-datum',        l: 'Datum meiner Stellungnahme (Widerspruch)', typ: 'date' },
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
                <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;
                            text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px">
                    Schritt 1 · Grundlage aus dem Widerspruch</div>
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    <b>Regelweg:</b> Laden Sie den gespeicherten Widerspruchsfall über „Fall laden“.
                    Darin stehen alle 65 Kriterien genau so, wie Sie sie damals gesetzt haben –
                    nichts wird geraten. Das ist immer der genauere Weg.
                </p>
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    <b>Ausweichweg für Altfälle</b> ohne gespeicherte Falldatei: Lesen Sie zuerst das
                    <b>Erstgutachten</b> wie gewohnt ein und danach hier Ihre damalige
                    <b>pflegefachliche Stellungnahme</b>. Aus beidem zusammen entsteht Ihr damaliger
                    Stand: Die Stellungnahme nennt die strittigen Kriterien, alle übrigen entsprechen
                    dem Gutachten. Jede gelesene Wertung wird Ihnen zur Prüfung vorgelegt.
                </p>
                <button class="btn btn-secondary" onclick="document.getElementById('grundlageStellungnahme').click()">
                    📄 Damalige Stellungnahme einlesen (Ausweichweg)</button>
                <input type="file" id="grundlageStellungnahme" accept=".pdf,image/*"
                       onchange="leseAlteStellungnahme(event)" style="display:none">
                <div id="grundlage-status" style="font-size:11px;color:var(--text-muted);margin:10px 0 18px"></div>

                <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;
                            text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px">
                    Schritt 2 · Anhörungsschreiben und Zweitgutachten</div>
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Lesen Sie das Anhörungsschreiben der Kasse und das beigefügte Zweitgutachten ein –
                    beides zusammen oder einzeln, je nachdem wie die Kasse es verschickt hat. Danach
                    zeigt Reiter 2 alle drei Stände nebeneinander; in die Stellungnahme gehen nur die
                    Kriterien ein, in denen Sie dem Zweitgutachten widersprechen.
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
                              oninput="autoResize(this); if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Begründung der Pflegekasse')"></textarea>
                </div>

                <div class="field-group" style="margin-top:14px">
                    <label class="field-label">Befund und Begründungen des Zweitgutachtens</label>
                    <p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-bottom:6px">
                        Wird beim Einlesen gefüllt – bitte prüfen. Nur was hier steht, darf die Begründung
                        dem Zweitgutachten zuschreiben („Das Zweitgutachten bestätigt im Befund …“). Der
                        Befund des Erstgutachtens steht weiterhin auf Reiter 1 unter den Stammdaten.
                    </p>
                    <textarea id="anh-zweit-befund" class="field-input"
                              style="min-height:110px;font-size:12px;line-height:1.6;padding:12px"
                              placeholder="Befund, Erläuterungen und wörtliche Begründungen des Zweitgutachtens"
                              oninput="autoResize(this); if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Befund des Zweitgutachtens')"></textarea>
                </div>

                <!-- Anlagen (Arztberichte usw.) stehen seit v66.57 in einer eigenen Karte darunter
                     (js/belege.js) – dieselbe für Widerspruch und Anhörung. -->

                <div class="field-group" style="margin-top:14px">
                    <label class="field-label">Eigene Anmerkungen zum Anhörungsverfahren</label>
                    <textarea id="anh-notizen" class="field-input"
                              style="min-height:110px;font-size:12px;line-height:1.6;padding:12px"
                              placeholder="Was ist zum Zweitgutachten anzumerken? Diese Notizen fließen in die Begründung ein."
                              oninput="autoResize(this); if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Anmerkungen zum Anhörungsverfahren')"></textarea>
                </div>
            </div>
        </div>`;
    ziel.dataset.gebaut = '1';
    if (typeof renderBelegeBereich === 'function') renderBelegeBereich();
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
    if (typeof aktualisiereGrundlageStatus === 'function') aktualisiereGrundlageStatus();
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

    /* KOPF VOLLSTÄNDIG. In den Vorlagen stehen Geburtsdatum, Versicherungs-Nr. und
       Antragsdatum immer im Kopf; in älteren Falldateien fehlen sie oft. Das Zweitgutachten
       nennt sie ebenfalls. Gefüllt wird NUR ein leeres Feld – die Angaben des geladenen
       Widerspruchsfalls haben Vorrang und werden nie überschrieben. */
    const st = rev.stam || {};
    [['stam-betreffend', st.betreffend], ['stam-geboren', st.geboren], ['stam-kasse', st.kasse],
     ['stam-versnr', st.versnr], ['stam-antrag', st.antrag], ['stam-bescheid', st.bescheid],
     ['stam-organisation', st.organisation]].forEach(([id, wert]) => {
        const el = document.getElementById(id);
        if (el && wert && !String(el.value || '').trim()) el.value = wert;
    });
    // Befund und Begründungen des Zweitgutachtens – eigene Quelle, getrennt vom Erstgutachten
    const zb = document.getElementById('anh-zweit-befund');
    if (zb && !zb.value.trim()) {
        const roh = String(rev.befund || '').trim() || String(rev.text || '').trim().slice(0, 8000);
        if (roh) { zb.value = roh; autoResize(zb); }
    }

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

/* ==================================================================================
   DIE URSPRÜNGLICHE STELLUNGNAHME DES WIDERSPRUCHS.
   Jede Begründung der Anhörung soll sagen, was in der pflegefachlichen Stellungnahme
   stand – und warum das Zweitgutachten sie nicht widerlegt. Dafür braucht es deren Text.
   Nach „Fall laden" steht er im Dokumentfeld; mit der ersten Anhörung wird er dort aber
   ersetzt. Deshalb wird er hier gesondert gemerkt und mit dem Fall gespeichert.
   Ausweichweg (PDF der alten Stellungnahme): dort liefert die Auslese je Kriterium die
   Kernaussage (widerspruchKerne). */
let widerspruchStellungnahme = '';
let widerspruchKerne = {};

// Merkt den Text, wenn er eine Widerspruchs-Stellungnahme ist. Rückgabe: gemerkt?
function merkeWiderspruchStellungnahme(html) {
    const h = String(html || '');
    if (!h.trim()) return false;
    const d = document.createElement('div'); d.innerHTML = h;
    const v = d.querySelector('[data-vorgang]');
    const art = v ? v.getAttribute('data-vorgang') : '';
    // Ältere Schriftstücke tragen keine Kennung – das waren immer Widersprüche.
    if (art && art !== 'widerspruch') return false;
    if (!d.querySelector('.crit[data-nr]')) return false;
    widerspruchStellungnahme = h;
    return true;
}

// Was die Stellungnahme zu einem Kriterium ausgeführt hat (reiner Text, ohne Kopfzeilen)
function widerspruchKern(nr) {
    if (widerspruchKerne && widerspruchKerne[nr]) return String(widerspruchKerne[nr]).trim();
    if (!widerspruchStellungnahme) return '';
    const d = document.createElement('div'); d.innerHTML = widerspruchStellungnahme;
    const c = Array.from(d.querySelectorAll('.crit[data-nr]')).find(x => x.getAttribute('data-nr') === nr);
    if (!c) return '';
    return Array.from(c.children)
        .filter(ch => !ch.classList.contains('ct') && !ch.classList.contains('zitat-warnung')
                   && !ch.classList.contains('m5-wirkung'))
        .map(ch => (ch.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(t => t && !/^(Gutachterliche Bewertung|Meine Beurteilung|Beigefügt):/.test(t))
        .join(' ');
}

/* AUFBAU JE KRITERIUM (Vorgabe des Verfassers): was das Erstgutachten sagt (kurz), was die
   Stellungnahme festgestellt hat, warum das Zweitgutachten falsch ist, warum die
   Stellungnahme nach den Richtlinien zutrifft. Die Bezeichnungen setzt die App – die KI
   liefert nur die Inhalte. So kann kein Teil still fehlen. */
const ANH_TEILE = [
    { key: 'erstgutachten',  label: 'Erstgutachten' },
    { key: 'stellungnahme',  label: 'Pflegefachliche Stellungnahme' },
    { key: 'zweitgutachten', label: 'Zweitgutachten' },
    { key: 'richtlinien',    label: 'Würdigung nach den Begutachtungs-Richtlinien' }
];
const ANH_TEIL_MUSTER = new RegExp('^(' + ANH_TEILE.map(t => t.label).join('|') + '):\\s*');

function anhAbleitungssatz(bText) {
    return 'Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „' + bText + '“ ableitbar.';
}

/* Setzt die vier Teile zu EINEM Text zusammen (Absätze mit Bezeichnung). Der Text läuft
   danach durch dieselben Wege wie jede Begründung (Länge, Zitatprüfung, Zusammenführen).
   Fehlt der Ableitungssatz, hängt die App ihn an – er ist Pflicht. */
function anhoerungBegruendungZusammen(b, bText) {
    if (!b) return '';
    const ohneLabel = t => String(t || '').trim().replace(ANH_TEIL_MUSTER, '');
    const teile = ANH_TEILE.map(t => ({ label: t.label, text: ohneLabel(b[t.key]) })).filter(t => t.text);
    if (!teile.length) return String(b.text || '').trim();
    const ganz = teile.map(t => t.text).join(' ');
    if (bText && !(/ableitbar/.test(ganz) && ganz.includes(bText))) {
        const letzter = teile.find(t => t.label === ANH_TEILE[3].label);
        if (letzter) letzter.text += ' ' + anhAbleitungssatz(bText);
        else teile.push({ label: ANH_TEILE[3].label, text: anhAbleitungssatz(bText) });
    }
    return teile.map(t => t.label + ': ' + t.text).join('\n\n');
}

/* Ersatz ohne KI: dieselben vier Teile, nur aus dem, was feststeht. Keine Behauptung, die
   nicht aus den Wertungen oder dem Text der Stellungnahme folgt. */
function anhoerungErsatzBegruendung(l) {
    const kern = widerspruchKern(l.nr);
    const kurz = kern.length > 600 ? kern.slice(0, 600).replace(/\s+\S*$/, '') + ' …' : kern;
    const zweit = {
        nicht: `Das Zweitgutachten hält an der Wertung „${l.zText}“ fest. Die in der pflegefachlichen Stellungnahme dargelegten Einschränkungen widerlegt es damit nicht.`,
        teilweise: `Das Zweitgutachten hebt die Wertung auf „${l.zText}“ an und erkennt damit einen Unterstützungsbedarf an, bleibt aber hinter der in der Stellungnahme begründeten Stufe zurück.`,
        verschlechtert: `Das Zweitgutachten senkt die Wertung auf „${l.zText}“ ab. Die in der pflegefachlichen Stellungnahme dargelegten Einschränkungen widerlegt es damit nicht.`
    }[l.lage] || `Das Zweitgutachten bewertet mit „${l.zText}“.`;
    return [
        'Erstgutachten: Das Erstgutachten bewertete mit „' + l.eText + '“.',
        'Pflegefachliche Stellungnahme: ' + (kurz || 'In meiner pflegefachlichen Stellungnahme habe ich eine Wertung mit „' + l.bText + '“ begründet.'),
        'Zweitgutachten: ' + zweit,
        ANH_TEILE[3].label + ': ' + anhAbleitungssatz(l.bText)
    ].join('\n\n');
}

// ==================================================================================
// Vorlage für die Stellungnahme im Anhörungsverfahren.
// Aufbau nach den Vorlagen des Verfassers (Vorlagen A bis D):
// zwei Gutachtenblöcke im Kopf, Einleitung mit „aufrecht", neu verfasste Allgemeine
// Angaben, DREI Spalten in der Gegenüberstellung und nur die strittig gebliebenen
// Kriterien unter „Befund und Stellungnahme".
// ==================================================================================

function buildAnhoerung(notesOverride, begruendungen, allgemeinText) {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const esc = escapeHtml;
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    const df = (key, val) => `<span data-f="${key}">${esc(val == null ? '' : String(val))}</span>`;

    let name = g('stam-betreffend');
    const cm = name.match(/^([^,]+),\s*(.+)$/);
    if (cm && !/^(herr|frau)/i.test(name)) name = (cm[2] + ' ' + cm[1]).trim();
    if (!name) name = 'Herr/ Frau';
    const geb = formatDE(g('stam-geboren'));
    const kasse = g('stam-kasse');
    const versnr = g('stam-versnr');
    const bescheid = formatDE(g('stam-bescheid'));
    const org = g('stam-organisation') || 'Medizinischer Dienst';
    const begut = formatDE(g('stam-begutachtung'));
    const art = g('stam-art');
    const antrag = formatDE(g('stam-antrag')) || '__.__.____';
    const verf = getVerfasser();

    // Angaben des Anhörungsverfahrens
    const anhSchreiben = formatDE(g('anh-schreiben-datum'));
    const zweitDatum = formatDE(g('anh-gutachten-datum'));
    const zweitArt = g('anh-art');
    const notizenAnh = (typeof notesOverride === 'string' && notesOverride.trim())
        ? notesOverride.trim() : g('anh-notizen');

    const rO = calculateInternal('orig');
    const rZ = calculateInternal('zweit');
    const rE = calculateInternal('own');
    const istKeinPG = v => { const s = String(v == null ? '' : v).trim(); return s === '' || s === '0' || /^kein/i.test(s); };
    const pgWert = v => istKeinPG(v) ? 'kein Pflegegrad'
        : (/^pflegegrad/i.test(String(v).trim()) ? String(v).trim() : 'Pflegegrad ' + String(v).trim());
    const pgSatz = pgWert;

    // Handeingaben und Einzelkriterien abgleichen – je Gutachten (siehe gutachtenAngaben)
    const gaO = gutachtenAngaben(rO, g('stam-pg-manual'), g('stam-pts-manual'));
    const gaZ = gutachtenAngaben(rZ, g('anh-pg'), g('anh-pts'));
    const origPG = gaO.pg;
    const origPts = gaO.pts;
    const zweitPG = gaZ.pg;
    const zweitPts = gaZ.pts;
    /* Fazit: Das Fazit spricht über BEIDE Gutachten. „hinreichend" und „weiterhin" stimmen
       nur, wenn beide denselben Pflegegrad festgestellt haben wie die eigene Einschätzung. */
    const fazitGleich = gleicherPflegegrad(origPG, rE.pg) && gleicherPflegegrad(zweitPG, rE.pg);
    /* Rückstufungsrisiko: Maßgeblich ist der Pflegegrad, der zuletzt festgestellt wurde – der
       des Zweitgutachtens. Liegt die eigene Einschätzung darunter, droht eine Rückstufung. */
    const fazitNiedriger = !fazitGleich && niedrigererPflegegrad(zweitPG, rE.pg);
    const fazitArt = fazitGleich ? 'gleich' : (fazitNiedriger ? 'niedriger' : 'abweichend');

    const analyse = schwellenAnalyse();
    const strittig = analyse.strittig;

    // Gegenüberstellung mit drei Spalten
    const row = (label, o, z, e, bold) => `<tr><td${bold ? ' style="font-weight:bold"' : ''}>${esc(label)}</td>`
        + `<td class="num">${o}</td><td class="num">${z}</td><td class="num">${e}</td></tr>`;
    const tableRows = [
        row(modulNr(1, org) + ' Mobilität', f2(rO.weights[0]), f2(rZ.weights[0]), f2(rE.weights[0])),
        row(modulNr(2, org) + ' Kognitive und kommunikative Fähigkeiten', f2(rO.weights[1]), f2(rZ.weights[1]), f2(rE.weights[1])),
        row(modulNr(3, org) + ' Verhaltensweisen und psychische Problemlagen', f2(rO.weights[2]), f2(rZ.weights[2]), f2(rE.weights[2])),
        row('Höchster Wert aus Modul 2 und Modul 3',
            f2(Math.max(rO.weights[1], rO.weights[2])), f2(Math.max(rZ.weights[1], rZ.weights[2])),
            f2(Math.max(rE.weights[1], rE.weights[2])), true),
        row(modulNr(4, org) + ' Selbstversorgung', f2(rO.weights[3]), f2(rZ.weights[3]), f2(rE.weights[3])),
        row(modulNr(5, org) + ' Krankheits- und therapiebedingten Anforderungen', f2(rO.weights[4]), f2(rZ.weights[4]), f2(rE.weights[4])),
        row(modulNr(6, org) + ' Gestaltung des Alltagslebens und sozialer Kontakte', f2(rO.weights[5]), f2(rZ.weights[5]), f2(rE.weights[5])),
        row('Summe der gewichteten Punkte', f2(rO.total), f2(rZ.total), f2(rE.total), true),
        row('Pflegegrad', esc(pgWert(origPG)), esc(pgWert(zweitPG)), esc(pgWert(rE.pg)), true)
    ].join('');

    // Nur die strittig gebliebenen Kriterien. Angegeben werden ALLE DREI Stände,
    // damit der Ausschuss die Entwicklung auf einen Blick sieht.
    const bg = begruendungen || {};
    const critHtml = strittig.length
        ? strittig.map(l => {
            const txt = (bg[l.nr] || '').trim();
            // Nummern auf die Zählung des Gutachtens umstellen (bei Medicproof 5.x.y).
            // Ohne KI-Text: die vier Teile aus dem, was feststeht (anhoerungErsatzBegruendung).
            const txtAnz = nummernImText(txt || anhoerungErsatzBegruendung(l), org);
            // Die vier Teile tragen ihre Bezeichnung fett – wie „MD-Einwand:" in den Vorlagen.
            const absatz = p => {
                const m = p.match(ANH_TEIL_MUSTER);
                return m ? `<div><b>${esc(m[1])}:</b> ${esc(p.slice(m[0].length)).replace(/\n/g, '<br>')}</div>`
                         : `<div>${esc(p).replace(/\n/g, '<br>')}</div>`;
            };
            let body = txtAnz.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(absatz).join('');
            if (txt) {
                // Geprüft wird der Originaltext – die BRi kennt nur ihre eigene Nummerierung.
                const offen = unbelegteZitate(l.nr, txt);
                if (offen.length) {
                    body += `<div class="zitat-warnung" data-warn="1">⚠ Bitte prüfen: Folgende Passage${offen.length > 1 ? 'n sind' : ' ist'} `
                          + `nicht wörtlich im BRi-Text zu ${esc(zeigeNr(l.nr, org))} belegt – vor dem Versand streichen oder korrigieren: `
                          + offen.map(z => `„${esc(z)}“`).join(' · ') + `</div>`;
                }
            }
            // Modul 5 wird je Gruppe gewertet. Verglichen wird hier das
            // Anhörungsgutachten mit der eigenen Beurteilung.
            const m5 = (l.item && l.item.m === 5 && typeof m5WirkungSatz === 'function')
                ? m5WirkungSatz(l.nr, 'zweit', 'own') : '';
            if (m5) body += `<div class="m5-wirkung">${esc(nummernImText(m5, org))}</div>`;
            const kipp = l.kipptAllein
                ? `<div>Bereits die richtlinienkonforme Wertung dieses einen Kriteriums ergäbe ${esc(pgSatz(l.pgMit))}.</div>` : '';
            const anl = (typeof anlagenVerweisHtml === 'function') ? anlagenVerweisHtml(l.nr) : '';
            // data-ai: stammt der Text von der KI? Ersatzbloecke werden beim naechsten Mal nachgeholt.
            return `<div class="crit" data-nr="${esc(l.nr)}" data-vals="${esc(lagenSchluessel(l))}" data-ai="${txt ? '1' : '0'}">`
                 + `<div class="ct">${esc(zeigeNr(l.nr, org))}: ${esc(l.titel)}</div>`
                 // Wie in der Vorlage des Verfassers: nur die Bewertung, gegen die sich die
                 // Stellungnahme richtet – das ist im Anhörungsverfahren die des
                 // ZWEITGUTACHTENS. Die eigene Beurteilung steht nicht in der Kopfzeile;
                 // sie ergibt sich aus der Begründung und steht in der Gegenüberstellung.
                 + `<div>Gutachterliche Bewertung: „${esc(l.zText)}“</div>`
                 + body + kipp + anl + `</div>`;
        }).join('')
        : `<p>Nach dem Zweitgutachten sind keine Einzelkriterien strittig geblieben.</p>`;

    // Der Verweis auf das Verhältnis zur ursprünglichen Stellungnahme steht IMMER –
    // er wird gerechnet und angehängt, nicht der KI überlassen. Der Standardtext ohne
    // KI enthält dieselbe Gegenüberstellung bereits im Fließtext.
    const kiText = (allgemeinText && allgemeinText.trim()) ? allgemeinText.trim() : '';
    // Nur anhängen, wenn der Text den Bezug nicht ohnehin schon herstellt.
    const verweis = (kiText && anhoerungVerweisVorhanden(kiText))
        ? '' : anhoerungVerweisSatz(analyse, org);
    const allgemein = kiText
        ? nummernImText(kiText, org).split(/\n\s*\n/).map(a => `<p>${esc(a.trim()).replace(/\n/g, '<br>')}</p>`).join('')
          + (verweis ? `<p class="anh-verweis">${esc(verweis)}</p>` : '')
        : anhoerungAllgemeinStandard(analyse, { org, begut, art, zweitDatum, zweitArt, origPts, zweitPts,
              origPG, zweitPG, ePts: f2(rE.total), ePG: rE.pg, psDatum: formatDE(g('anh-ps-datum')),
              notizen: notizenAnh });

    // Doppelpunkt direkt hinter der Bezeichnung; die Angaben bleiben in ihrer Spalte
    // (Breite von .k in STELLUNGNAHME_CSS).
    const dataRow = (k, v) => `<div class="data-row"><span class="k">${esc(k)}:</span> <span>${esc(v || '')}</span></div>`;

    return `<div class="stmt" data-vorgang="anhoerung">
    <div class="stmt-head">
      <img class="stmt-logo" src="${FAMILIARA_LOGO}" alt="Familiara">
      <div class="stmt-address">Familiara GmbH<br>Wiesbadener Straße 3<br>12161 Berlin<br><br>Telefon 030 577 015 900<br>Fax 030 577 015 901<br><br>Geschäftsführer: Dr. med. Jörg A. Zimmermann<br><br>HRB 184522 B<br>Amtsgericht Berlin-Charlottenburg<br>Umsatzsteuer-ID: DE311459777<br><br>www.familiara.de<br>kontakt@familiara.de</div>
    </div>

    <div class="stmt-top">
      <div class="left">
        <div>${esc(verf.name)}</div>
        ${verf.zeilen.map(z => `<div>${esc(z)}</div>`).join('')}
      </div>
    </div>

    <h1>Pflegefachliche Stellungnahme</h1>
    <p id="stmt-grundlage">${BRI_GRUNDLAGE_SATZ}</p>

    <div class="data-block" id="stmt-data">
      ${dataRow('Betreffend', name)}
      ${dataRow('geboren am', geb)}
      ${dataRow('Kasse', kasse)}
      ${dataRow('Versicherungs-Nr.', versnr)}
      ${dataRow('Antragsdatum', antrag !== '__.__.____' ? antrag : '')}
      ${dataRow('Bescheiddatum', bescheid)}
      ${dataRow('Datum Anhörungsschreiben', anhSchreiben)}
      ${dataRow('Gutachtenorganisation', org)}
      ${dataRow('Begutachtungsdatum', begut)}
      ${dataRow('Durchführungsart', art)}
      ${dataRow('Pflegegrad', pgWert(origPG))}
      ${dataRow('Gesamtpunkte', origPts)}
      ${dataRow('Datum Zweitgutachten', zweitDatum)}
      ${dataRow('Durchführungsart', zweitArt)}
      ${dataRow('Pflegegrad', pgWert(zweitPG))}
      ${dataRow('Gesamtpunkte', zweitPts)}
    </div>

    <p>${df('name', name)} erhält den Widerspruch gegen den Bescheid vom ${df('bescheid', bescheid || '—')} der ${df('kasse', kasse || 'Kasse')} aufrecht. Diese pflegefachliche Stellungnahme dient der Unterstützung des Rechtsbeistands von ${df('name', name)} bei der Präzisierung der Begründung des Widerspruchs. Dazu habe ich die Gutachten ${df('org', orgGenitiv(org))} vom ${df('begut', begut || '—')} und vom ${df('zweitdatum', zweitDatum || '—')} gewürdigt.</p>

    <hr>

    <h2>Allgemeine Angaben</h2>
    <div id="stmt-notes" data-sig="${esc(anhoerungSignatur(analyse, notizenAnh))}" data-ai="${(allgemeinText && allgemeinText.trim()) ? '1' : '0'}">${allgemein}</div>
    ${(typeof verfahrenAbsatzHtml === 'function') ? verfahrenAbsatzHtml() : ''}
    ${(typeof belegeAllgemeinHtml === 'function') ? belegeAllgemeinHtml() : ''}
    <p>Die nachfolgende Übersicht stellt die Ergebnisse des Erstgutachtens, des Zweitgutachtens und meiner Beurteilung einander gegenüber:</p>

    <h2>Gegenüberstellung des Gutachtens und der abweichenden Bepunktung</h2>
    <table class="cmp">
      <thead>
        <tr><th rowspan="2">Modul</th><th>Vorgutachten</th><th>Zweitgutachten</th><th>Beurteilung</th></tr>
        <tr><th>Gewichtete Punkte</th><th>Gewichtete Punkte</th><th>Gewichtete Punkte</th></tr>
      </thead>
      <tbody id="stmt-cmp-body">${tableRows}</tbody>
    </table>

    <h2>Befund und Stellungnahme</h2>
    <div id="stmt-crit">${critHtml}</div>

    <hr>

    <h2>Fazit</h2>
    <p id="stmt-fazit" data-art="${fazitArt}">Die vorliegenden Gutachten ${df('org', orgGenitiv(org))} vom ${df('begut', begut || '—')} mit ${df('opgfazit', pflegegradMit(origPG))} und ${df('opts', origPts)} Punkten sowie vom ${df('zweitdatum', zweitDatum || '—')} mit ${df('zpgfazit', pflegegradMit(zweitPG))} und ${df('zpts', zweitPts)} Punkten berücksichtigen die tatsächlichen Einschränkungen von ${df('name', name)} ${fazitGleich ? '' : 'nicht '}hinreichend. ${fazitNiedriger
        ? `Unter Berücksichtigung der oben genannten Korrekturen ergibt sich ein Punktwert von ${df('etotal', f2(rE.total))} Punkten. Es besteht ein geringerer Pflegegrad und das reelle Risiko einer Rückstufung.`
        : `Unter Berücksichtigung der oben genannten Korrekturen ergibt sich ein Punktwert von ${df('etotal', f2(rE.total))} Gesamtpunkten, der gemäß den Richtlinien ${istKeinPG(rE.pg) ? 'weiterhin ' + df('epgfazit', 'keinen Pflegegrad') : (fazitGleich ? 'weiterhin ' : '') + 'den ' + df('epgfazit', pgSatz(rE.pg))} ab dem ${df('antrag', antrag)} (Antragsdatum) rechtfertigt.`}</p>
    ${(typeof anlagenVerzeichnisHtml === 'function') ? anlagenVerzeichnisHtml() : ''}
  </div>`;
}

// Kennung für den Abschnitt „Allgemeine Angaben": ändert sich, sobald sich die Lagen,
// die Punktstände oder die eigenen Anmerkungen ändern. Nur dann wird er neu verfasst.
function anhoerungSignatur(analyse, notizen) {
    const basis = (notizen || '').trim() + '||'
        + analyse.lagen.map(l => l.nr + ':' + l.lage).sort().join(',') + '||'
        + analyse.basis.total + '|' + analyse.gesamt.total;
    let h = 5381;
    for (let i = 0; i < basis.length; i++) { h = ((h * 33) ^ basis.charCodeAt(i)) >>> 0; }
    return 'h' + h.toString(36);
}

// Ohne KI: ein sachlicher Standardtext, der ausschließlich die Rechnung wiedergibt.
/* PFLICHTVERWEIS IN DEN ALLGEMEINEN ANGABEN.
   Der Ausschuss muss auf einen Blick sehen, wie sich das Anhörungsgutachten zur
   ursprünglichen pflegefachlichen Stellungnahme verhält: worin ihr gefolgt wurde und
   worin nicht. Dieser Satz wird GERECHNET und von der App eingesetzt – er darf nicht
   davon abhängen, ob die KI ihn schreibt oder die Zahlen richtig trifft.
   Rückgabe: leerer Text, wenn es nichts zu vergleichen gibt. */
function anhoerungVerweisSatz(analyse, org) {
    const a = analyse || (typeof schwellenAnalyse === 'function' ? schwellenAnalyse() : null);
    if (!a || (!a.gefolgt.length && !a.strittig.length)) return '';
    // Bewusst ohne den Namen der Organisation: „ist der Medicproof GmbH gefolgt" wäre
    // grammatisch falsch. Das Zweitgutachten ist als Handelnder eindeutig.
    //
    // Und bewusst OHNE Nummernliste. In den Vorlagen des Verfassers steht der Verweis im
    // Fließtext mit zwei bis drei benannten Beispielen; eine Reihe aus zwanzig Nummern
    // ist genau das Abzählen, das dieser Abschnitt nicht enthalten soll.
    const gesamt = a.gefolgt.length + a.strittig.length;
    const zahlwort = n => n === 1 ? 'einem' : String(n);
    /* „Teilweise gefolgt" ist etwas anderes als „nicht gefolgt". Gemeldet wurde ein Schriftstück,
       das in einem Satz „teilweise berücksichtigt" und im nächsten „in keinem Punkt gefolgt"
       sagte. Nachbesserungen werden deshalb eigens benannt. */
    const kriterien = n => n === 1 ? 'einem Kriterium' : n + ' Kriterien';
    const teilw = a.strittig.filter(l => l.lage === 'teilweise').length;
    const schlechter = a.strittig.filter(l => l.lage === 'verschlechtert').length;
    const unveraendert = a.strittig.length - teilw - schlechter;
    const rest = [];
    if (teilw) rest.push('in ' + kriterien(teilw) + ' bessert es nach, ohne die begründete Stufe zu erreichen');
    if (schlechter) rest.push('in ' + kriterien(schlechter) + ' senkt es die Wertung sogar ab');
    if (unveraendert && rest.length) rest.push('in den übrigen bleibt es bei der bisherigen Wertung');
    if (!a.gefolgt.length) {
        return 'Den in der pflegefachlichen Stellungnahme beanstandeten Kriterien ist das '
             + 'Zweitgutachten in keinem Punkt ' + (teilw ? 'vollständig ' : '') + 'gefolgt'
             + (rest.length ? '; ' + rest.join(', ') : '') + '.';
    }
    if (!a.strittig.length) {
        return 'Das Zweitgutachten folgt der pflegefachlichen Stellungnahme in allen '
             + gesamt + ' beanstandeten Kriterien.';
    }
    return 'Das Zweitgutachten folgt der pflegefachlichen Stellungnahme in '
         + zahlwort(a.gefolgt.length) + ' von ' + gesamt + ' beanstandeten Kriterien; '
         + (rest.length ? rest.join(', ') : 'in den übrigen bleibt es bei der bisherigen Wertung') + '.';
}

/* Steht der Verweis schon im Text der KI? Dann wird er nicht ein zweites Mal angehängt –
   zwei Sätze mit derselben Aussage direkt hintereinander lesen sich schlecht.
   Bewusst eng geprüft: Es genügt nicht, dass das Wort „Stellungnahme" vorkommt; es muss
   auch das Verhältnis zum Zweitgutachten benannt sein. */
function anhoerungVerweisVorhanden(text) {
    const t = String(text || '').toLowerCase();
    if (!t) return false;
    const nenntStellungnahme = t.includes('stellungnahme');
    const nenntVerhaeltnis = /gefolgt|folgt\s|folgte|übereinstimmung|ueberstimmung/.test(t);
    return nenntStellungnahme && nenntVerhaeltnis;
}

/* Ohne KI: kurz und prägnant, im Dreiklang Erstgutachten – Stellungnahme – Zweitgutachten
   (Vorgabe des Verfassers). Nur Gerechnetes und Eingetragenes, keine Behauptung darüber
   hinaus. Die Begründung je Kriterium steht unter „Befund und Stellungnahme". */
function anhoerungAllgemeinStandard(a, f) {
    const esc = escapeHtml;
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    // Die genannten Zahlen sind dieselben wie in der Gegenüberstellung – sonst stünde im
    // Text etwas anderes als in der Tabelle.
    // „zu kein Pflegegrad" wäre falsch – im Dativ heißt es „zu keinem Pflegegrad".
    const dativ = v => { const s = pflegegradWort(v); return /^kein/i.test(s) ? 'keinem Pflegegrad' : s; };
    // „mit 10,00 Punkten keinen Pflegegrad begründet" liest sich schief – ohne Pflegegrad
    // wird die Bewertung genannt, nicht ihr Fehlen.
    const begruendet = pflegegradZahl(f.ePG) > 0
        ? 'mit ' + f.ePts + ' Punkten den ' + pflegegradWort(f.ePG) + ' begründet'
        : 'eine Bewertung mit ' + f.ePts + ' Punkten begründet';
    const artZ = String(f.zweitArt || '').trim();
    const aktenlage = /aktenlage/i.test(artZ);
    let p = `<p>Das Erstgutachten ${esc(orgGenitiv(f.org))} vom ${esc(f.begut || '—')} kam mit ${esc(f.origPts)} `
          + `gewichteten Punkten zu ${esc(dativ(f.origPG))}. In meiner pflegefachlichen Stellungnahme`
          + `${f.psDatum ? ' vom ' + esc(f.psDatum) : ''} habe ich ${a.lagen.length === 1 ? 'ein Kriterium' : esc(String(a.lagen.length)) + ' Kriterien'} `
          + `beanstandet und ${esc(begruendet)}. Das Zweitgutachten vom `
          + `${esc(f.zweitDatum || '—')}${artZ ? ' (' + esc(artZ) + ')' : ''} kommt zu ${esc(dativ(f.zweitPG))} `
          + `mit ${esc(f.zweitPts)} Punkten.</p>`;
    // Worin gefolgt wurde und worin nicht – gerechnet, ohne Nummernreihe
    const verweis = anhoerungVerweisSatz(a, f.org);
    let fehler = verweis ? esc(verweis) : '';
    if (aktenlage && a.strittig.length) {
        fehler += (fehler ? ' ' : '') + 'Das Zweitgutachten wurde nach Aktenlage erstellt; eine persönliche '
                + 'Befunderhebung zu den in der Stellungnahme vorgetragenen Einschränkungen fand damit nicht statt.';
    }
    // Der Abstand zur Schwelle wird nur genannt, wenn die Angabe des Gutachtens zu seinen
    // eigenen Kriterien passt. Sonst wäre die Aussage nicht belastbar.
    if (a.naechsteSchwelle !== null && !a.abweichung && a.strittig.length) {
        fehler += ` Es bleibt mit ${esc(f2(a.basis.total))} Punkten um ${esc(f2(a.fehlendePunkte))} Punkte unter der `
                + `Schwelle von ${esc(f2(a.naechsteSchwelle))} Punkten.`;
        if (a.kipper.length) {
            fehler += ` Bereits die richtlinienkonforme Wertung eines einzelnen der strittigen Kriterien `
                    + `(${esc(a.kipper.map(l => zeigeNr(l.nr, f.org)).join(', '))}) würde diese Schwelle überschreiten.`;
        }
    }
    if (fehler.trim()) p += `<p>${fehler.trim()}</p>`;
    const notizen = f.notizen;
    if ((notizen || '').trim()) {
        p += (notizen || '').trim().split(/\r?\n\s*\r?\n/)
            .map(t => `<p>${esc(t.trim()).replace(/\n/g, '<br>')}</p>`).join('');
    }
    return p;
}
