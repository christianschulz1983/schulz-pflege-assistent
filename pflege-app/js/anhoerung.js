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
                              oninput="autoResize(this)"></textarea>
                </div>

                <div class="field-group" style="margin-top:14px">
                    <label class="field-label">Anlagen (Arztberichte, Verordnungen, Befundberichte)</label>
                    <p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-bottom:10px">
                        Ordnen Sie jede Anlage dem strittigen Kriterium zu, das sie belegt – etwa eine
                        Verordnung Physiotherapie zu 4.5.14. Im Schriftstück erscheint dann ein Verweis
                        und am Ende ein Anlagenverzeichnis. Die Dateien selbst legen Sie beim Versand bei;
                        in ein Word-Dokument lassen sie sich nicht einbetten.
                    </p>
                    <button class="btn btn-secondary" onclick="document.getElementById('anlagenFiles').click()">
                        + Anlagen hinzufügen</button>
                    <input type="file" id="anlagenFiles" accept=".pdf,image/*" multiple
                           onchange="anlagenHinzufuegen(event)" style="display:none">
                    <span id="anlagen-hinweis" style="font-size:11px;color:var(--text-muted);margin-left:10px"></span>
                    <div id="anlagen-liste" style="margin-top:12px"></div>
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
    if (typeof renderAnlagen === 'function') renderAnlagen();
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

// ==================================================================================
// Vorlage für die Stellungnahme im Anhörungsverfahren.
// Aufbau nach den Vorlagen des Verfassers (Deckner, Nebeling, Reitz, Adams):
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

    const origPG = g('stam-pg-manual') || String(rO.pg);
    const origPts = g('stam-pts-manual') || f2(rO.total);
    const zweitPG = g('anh-pg') || String(rZ.pg);
    const zweitPts = g('anh-pts') || f2(rZ.total);

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
            const txtAnz = nummernImText(txt, org);
            let body = txtAnz
                ? txtAnz.split(/\n\s*\n/).map(p => `<div>${esc(p.trim()).replace(/\n/g, '<br>')}</div>`).join('')
                : `<div>Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „${esc(l.bText)}“ ableitbar.</div>`;
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
            return `<div class="crit" data-nr="${esc(l.nr)}" data-vals="${esc(lagenSchluessel(l))}">`
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
        : anhoerungAllgemeinStandard(analyse, org, begut, zweitDatum, origPts, zweitPts, pgSatz, origPG, zweitPG, notizenAnh);

    // Doppelpunkt direkt hinter der Bezeichnung; die Angaben bleiben in ihrer Spalte
    // (Breite von .k in STELLUNGNAHME_CSS).
    const dataRow = (k, v) => `<div class="data-row"><span class="k">${esc(k)}:</span> <span>${esc(v || '')}</span></div>`;

    return `<div class="stmt">
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
    <p>auf Grundlage der Richtlinien des Medizinischen Dienstes Bund zur Feststellung der Pflegebedürftigkeit nach dem SGB XI vom 21. Dezember 2023</p>

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

    <p>${df('name', name)} erhält den Widerspruch gegen den Bescheid vom ${df('bescheid', bescheid || '—')} der ${df('kasse', kasse || 'Kasse')} aufrecht. Diese pflegefachliche Stellungnahme dient der Unterstützung des Rechtsbeistands von ${df('name', name)} bei der Präzisierung der Begründung des Widerspruchs. Dazu habe ich die Gutachten des ${df('org', org)} vom ${df('begut', begut || '—')} und vom ${df('zweitdatum', zweitDatum || '—')} gewürdigt.</p>

    <hr>

    <h2>Allgemeine Angaben</h2>
    <div id="stmt-notes" data-sig="${esc(anhoerungSignatur(analyse, notizenAnh))}" data-ai="${(allgemeinText && allgemeinText.trim()) ? '1' : '0'}">${allgemein}</div>
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
    <p>Die vorliegenden Gutachten des ${df('org', org)} vom ${df('begut', begut || '—')} mit ${df('opgfazit', pgSatz(origPG))} und ${df('opts', origPts)} Punkten sowie vom ${df('zweitdatum', zweitDatum || '—')} mit ${df('zpgfazit', pgSatz(zweitPG))} und ${df('zpts', zweitPts)} Punkten berücksichtigen die tatsächlichen Einschränkungen von ${df('name', name)} nicht hinreichend. Unter Berücksichtigung der oben genannten Korrekturen ergibt sich ein Punktwert von ${df('etotal', f2(rE.total))} Gesamtpunkten, der gemäß den Richtlinien ${istKeinPG(rE.pg) ? 'weiterhin ' + df('epgfazit', 'keinen Pflegegrad') : 'den ' + df('epgfazit', pgSatz(rE.pg))} ab dem ${df('antrag', antrag)} (Antragsdatum) rechtfertigt.</p>
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
    if (!a.gefolgt.length) {
        return 'Den in der pflegefachlichen Stellungnahme beanstandeten Kriterien ist das '
             + 'Zweitgutachten in keinem Punkt gefolgt.';
    }
    if (!a.strittig.length) {
        return 'Das Zweitgutachten folgt der pflegefachlichen Stellungnahme in allen '
             + gesamt + ' beanstandeten Kriterien.';
    }
    return 'Das Zweitgutachten folgt der pflegefachlichen Stellungnahme in '
         + zahlwort(a.gefolgt.length) + ' von ' + gesamt + ' beanstandeten Kriterien; in den '
         + 'übrigen bleibt es bei der bisherigen Wertung.';
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

function anhoerungAllgemeinStandard(a, org, begut, zweitDatum, origPts, zweitPts, pgSatz, origPG, zweitPG, notizen) {
    const esc = escapeHtml;
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    // Die genannten Zahlen sind dieselben wie in der Gegenüberstellung – sonst stünde im
    // Text etwas anderes als in der Tabelle.
    // „führte zu kein Pflegegrad" wäre falsch – im Dativ heißt es „zu keinem Pflegegrad".
    const dativ = v => { const s = pgSatz(v); return /^kein/i.test(s) ? 'keinem Pflegegrad' : s; };
    let p = `<p>Das Gutachten des ${esc(org)} vom ${esc(begut || '—')} führte zu ${esc(dativ(origPG))} `
          + `bei ${esc(origPts)} gewichteten Punkten. Das im Anhörungsverfahren erstellte Gutachten vom `
          + `${esc(zweitDatum || '—')} kommt zu ${esc(dativ(zweitPG))} bei ${esc(zweitPts)} gewichteten Punkten.</p>`;
    if (a.gefolgt.length) {
        p += `<p>In ${a.gefolgt.length} Kriterium/Kriterien ist der Medizinische Dienst den Ausführungen der `
           + `pflegefachlichen Stellungnahme gefolgt (${esc(a.gefolgt.map(l => zeigeNr(l.nr, org)).join(', '))}). `
           + `Dies bestätigt die Tragfähigkeit der dort erhobenen Befunde.</p>`;
    }
    if (a.strittig.length) {
        p += `<p>In ${a.strittig.length} Kriterium/Kriterien blieb es bei der bisherigen Wertung `
           + `(${esc(a.strittig.map(l => zeigeNr(l.nr, org)).join(', '))}), obwohl sich die Befundlage nicht geändert hat.</p>`;
    }
    // Der Abstand zur Schwelle wird nur genannt, wenn die Angabe des Gutachtens zu seinen
    // eigenen Kriterien passt. Sonst wäre die Aussage nicht belastbar.
    if (a.naechsteSchwelle !== null && !a.abweichung) {
        p += `<p>Das Zweitgutachten bleibt mit ${esc(f2(a.basis.total))} gewichteten Punkten um `
           + `${esc(f2(a.fehlendePunkte))} Punkte unter der für den nächsten Pflegegrad maßgeblichen Schwelle `
           + `von ${esc(f2(a.naechsteSchwelle))} Punkten.`;
        if (a.kipper.length) {
            p += ` Bereits die richtlinienkonforme Wertung eines einzelnen der strittigen Kriterien `
               + `(${esc(a.kipper.map(l => zeigeNr(l.nr, org)).join(', '))}) würde diese Schwelle überschreiten.`;
        }
        p += `</p>`;
    }
    if ((notizen || '').trim()) {
        p += (notizen || '').trim().split(/\r?\n\s*\r?\n/)
            .map(t => `<p>${esc(t.trim()).replace(/\n/g, '<br>')}</p>`).join('');
    }
    return p;
}
