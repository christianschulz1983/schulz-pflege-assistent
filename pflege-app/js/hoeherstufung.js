// Dokumentvorlage für Erstantrag und Höherstufungsantrag.
// Aufbau nach den Formularen des Verfassers. Die Marken #stmt-data, #stmt-notes,
// #stmt-cmp-body und #stmt-crit sind dieselben wie beim Widerspruch, damit das
// Zusammenführen beim erneuten Erstellen unverändert funktioniert.

function tabellenBlock(titel, kopf, zeilen) {
    if (!zeilen.length) return '';
    return `<h2>${escapeHtml(titel)}</h2>
    <table class="cmp"><thead><tr>${kopf.map(k => `<th>${escapeHtml(k)}</th>`).join('')}</tr></thead>
    <tbody>${zeilen.map(z => `<tr>${z.map(c => `<td>${escapeHtml(c == null ? '' : String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

// Zeilen einer Erfassungstabelle, leere übersprungen
function erfZeilenGefuellt(tid, felder) {
    return (erfassung[tid] || [])
        .filter(z => felder.some(f => (z[f] || '').toString().trim()))
        .map(z => felder.map(f => z[f] || ''));
}

function haeufigkeitText(z) {
    if (!z.anzahl || !z.zeitraum) return '';
    return z.anzahl + '× ' + z.zeitraum;
}

// Befundeinträge mit Angabe, gruppiert nach den Überschriften des Katalogs
/* Gruppen, die im Schriftstück NICHT noch einmal als Tabelle erscheinen, weil ihre
   Angaben dort schon stehen. „Ernährung" enthält Körpergröße, Gewicht, BMI und
   Ernährungszustand – genau die vier Felder der Tabelle „Körperlicher Befund".
   Vorher standen sie zweimal im Dokument. */
const BEFUND_GRUPPEN_DOPPELT = ['ernaehrung'];

/* Die Befundtabellen enthalten nur noch BEFUNDE – Griffe, Gangbild, Sehen, Hören, Wunden,
   Kontinenz, Atmung. Die NBA-Kriterien (Einträge mit „nba") und die Problemlagen des
   Moduls 3 stehen mit ihrer Einschätzung im Abschnitt „Einschränkungen in den
   Lebensbereichen". Standen sie auch hier, war jede Einschätzung zweimal im Dokument
   (Regel 17) – und das Schriftstück entsprechend länger. */
function befundBlock() {
    let html = '';
    BEFUND_GRUPPEN.forEach(g => {
        if (BEFUND_GRUPPEN_DOPPELT.indexOf(g.id) !== -1) return;
        const zeilen = [];
        g.eintraege.forEach(e => {
            if (e.nba) return;                    // steht in den Lebensbereichen
            if (e.frei) {
                const t = befundTexte[e.id];
                if (t && t.trim()) zeilen.push([e.titel, t]);
                return;
            }
            const seiten = e.seiten ? ['rechts', 'links'] : [null];
            seiten.forEach(s => {
                const w = befundWert(e, s);
                if (w === null) return;
                const zusatz = [befundZusatzText(e), befundTexte[e.id + '_zusatz']].filter(Boolean).join(', ');
                zeilen.push([nummernImText(e.titel) + (s ? ' ' + s : ''), e.skala[w] + (zusatz ? ' – ' + zusatz : '')]);
            });
        });
        (befundExtra[g.id] || []).forEach(x => {
            if ((x.titel || '').trim() || (x.text || '').trim()) zeilen.push([x.titel || '', x.text || '']);
        });
        if (zeilen.length) html += tabellenBlock(g.titel, ['Kriterium', 'Befund'], zeilen);
    });
    return html;
}

// ====================================================== Lebensbereiche (Antrag)
/* EIN ANTRAG IST KEIN WIDERSPRUCH – AUCH NICHT IM AUFBAU.
   Der Antrag ersetzt den Fragebogen des Medizinischen Dienstes: Er soll zeigen, welche
   Einschränkungen heute bestehen und – im Höherstufungsantrag – was sich seit dem
   Vorgutachten verschlechtert hat. Eine Begründung je Kriterium mit BRi-Zitat und
   Ableitungssatz („… ist somit eine Wertung mit … ableitbar") ist die Form des Widerspruchs;
   im Antrag machte sie das Schriftstück zehn Seiten lang und liest sich wie ein Streit.
   Stattdessen: je Lebensbereich (Modul) ein kurzer Absatz und darunter eine Zeile mit der
   eigenen Einschätzung. Die Gegenüberstellung mit dem Vorgutachten steht in der Tabelle. */
const ANTRAG_BEREICHE = {
    1: 'Mobilität', 2: 'Kognitive und kommunikative Fähigkeiten',
    3: 'Verhaltensweisen und psychische Problemlagen', 4: 'Selbstversorgung',
    5: 'Krankheits- und therapiebedingte Anforderungen', 6: 'Gestaltung des Alltagslebens und sozialer Kontakte'
};

// Einschätzung eines Kriteriums als Text, wie sie im Schriftstück erscheint
function antragStufe(item, wert) {
    if (item.m === 5 && item.group !== 'D') {
        const o = (wert && typeof wert === 'object') ? wert : { count: 0, period: 'W' };
        return (Number(o.count) > 0) ? m5HaeufigkeitText(item.nr, o) : null;
    }
    if (!item.opts || typeof wert !== 'number' || wert <= 0) return null;
    return expandLabel(item.opts[wert] || '');
}

/* Die Lebensbereiche, zu denen etwas zu sagen ist: jedes Modul mit mindestens einer
   Einschränkung in der eigenen Einschätzung. Je Bereich die eingeschränkten Kriterien und,
   im Höherstufungsantrag, ihre Stufe laut Vorgutachten – die braucht die KI, um die
   Veränderung zu beschreiben. „sig" ändert sich, sobald sich eine Einschätzung ändert;
   nur dann wird der Absatz neu verfasst, sonst bleibt ein von Hand überarbeiteter stehen. */
function antragBereiche() {
    const hoeher = (typeof appModus !== 'undefined' && appModus === 'hoeherstufung');
    const liste = [];
    for (let m = 1; m <= 6; m++) {
        const kriterien = [];
        ITEMS.filter(i => i.m === m).forEach(i => {
            const e = antragStufe(i, stateEigene.values[i.id]);
            if (!e) return;
            const o = hoeher ? antragStufe(i, stateOrig.values[i.id]) : null;
            const eintrag = { nr: i.nr, title: i.title, e: e, o: o, geaendert: hoeher && o !== e };
            // Modul 3: die Bemerkung aus der Befunderhebung gehört zur Einschätzung
            if (m === 3 && typeof psycheListe !== 'undefined') {
                const pz = psycheListe.find(z => z.nr === i.nr);
                if (pz && (pz.bemerkung || '').trim()) eintrag.bemerkung = pz.bemerkung.trim();
            }
            kriterien.push(eintrag);
        });
        if (!kriterien.length) continue;
        liste.push({ nr: 'M' + m, m: m, titel: ANTRAG_BEREICHE[m], kriterien: kriterien,
                     sig: JSON.stringify(kriterien.map(k => [k.nr, k.e, k.o, k.bemerkung || ''])) });
    }
    return liste;
}

// Die Zeile „Einschätzung: …" unter dem Absatz – ohne Gegenüberstellung (Regel 19)
function bereichEinschaetzung(b, org) {
    return b.kriterien.map(k => nummernImText(k.title, org) + ' „' + k.e + '“'
        + (k.bemerkung ? ' (' + k.bemerkung + ')' : '')).join(' · ');
}

/* Modul 5 wird je Gruppe gewertet (siehe m5Gruppen). Im Bereich steht dazu EIN gerechneter
   Satz – nicht, wie vorher, derselbe Satz unter jedem Kriterium des Moduls. */
function m5ModulSatz(spalte) {
    const g = m5Gruppen(zustandZu(spalte || 'own'));
    const einzel = g.gesamt;
    return 'Die Maßnahmen dieses Bereichs werden nach den Begutachtungs-Richtlinien nicht einzeln, '
        + 'sondern gruppenweise gewertet; Modul 5 kommt damit auf ' + einzel
        + (einzel === 1 ? ' Einzelpunkt' : ' Einzelpunkte') + ' und ' + zahlDE(m5Gewichtet(einzel))
        + ' gewichtete Punkte.';
}

function lebensbereicheHtml(bereiche, texte, org) {
    const esc = escapeHtml;
    if (!bereiche.length) return '<p>Es wurden keine Einschränkungen der Selbständigkeit erfasst.</p>';
    return bereiche.map(b => {
        const txt = ((texte || {})[b.nr] || '').trim();
        const absaetze = txt
            ? nummernImText(txt, org).split(/\n\s*\n/).map(p => `<div>${esc(p.trim()).replace(/\n/g, '<br>')}</div>`).join('')
            : '';
        const m5 = (b.m === 5) ? `<div class="m5-wirkung">${esc(m5ModulSatz('own'))}</div>` : '';
        return `<div class="crit bereich" data-nr="${esc(b.nr)}" data-vals="${esc(b.sig)}" data-ai="${txt ? '1' : '0'}">`
             + `<div class="ct">${esc(modulNr(b.m, org))} ${esc(b.titel)}</div>`
             + absaetze
             + `<div class="bereich-wertung">Einschätzung: ${esc(bereichEinschaetzung(b, org))}</div>`
             + m5 + `</div>`;
    }).join('');
}

// Deckblatt: Antragsschreiben an die Pflegekasse, das die versicherte Person unterschreibt.
function buildDeckblatt() {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const esc = escapeHtml;
    const hoeher = (appModus === 'hoeherstufung');
    let name = g('stam-betreffend');
    const cm = name.match(/^([^,]+),\s*(.+)$/);
    if (cm && !/^(herr|frau)/i.test(name)) name = (cm[2] + ' ' + cm[1]).trim();
    if (!name) name = 'Herr/ Frau';
    const kasse = g('stam-kasse') || 'Pflegekasse';
    const pgAlt = erfassungExtra.pg;
    // Doppelpunkt direkt hinter der Bezeichnung; die Angaben bleiben in ihrer Spalte
    // (Breite von .k in STELLUNGNAHME_CSS).
    const dataRow = (k, v) => `<div class="data-row"><span class="k">${esc(k)}:</span> <span>${esc(v || '')}</span></div>`;

    return `<div class="stmt deckblatt">
    <div class="stmt-head">
      <img class="stmt-logo" src="${FAMILIARA_LOGO}" alt="Familiara">
      <div class="stmt-address">Familiara GmbH<br>Wiesbadener Straße 3<br>12161 Berlin<br><br>Telefon 030 577 015 900<br>Fax 030 577 015 901<br><br>www.familiara.de<br>kontakt@familiara.de</div>
    </div>

    <div class="stmt-top"><div class="left">
      <div><b>An die</b></div>
      <div>${esc(kasse)}</div>
      <div>– Pflegekasse –</div>
    </div></div>

    <h1>${hoeher ? 'Antrag auf Höherstufung des Pflegegrades' : 'Antrag auf Feststellung der Pflegebedürftigkeit'}</h1>

    <div class="data-block">
      ${dataRow('Versicherte Person', name)}
      ${dataRow('geboren am', formatDE(g('stam-geboren')))}
      ${dataRow('Versicherungs-Nr.', g('stam-versnr'))}
      ${hoeher && pgAlt ? dataRow('Bisheriger Pflegegrad', 'Pflegegrad ' + pgAlt) : ''}
    </div>

    <p>Sehr geehrte Damen und Herren,</p>

    <p>hiermit beantrage ich ${hoeher
        ? 'die Höherstufung meines Pflegegrades. Mein Gesundheitszustand hat sich seit der letzten Begutachtung '
          + 'verschlechtert, sodass ein höherer pflegerischer Unterstützungsbedarf besteht'
          + (erfassungExtra.verschlechterung ? ' (' + esc(erfassungExtra.verschlechterung) + ')' : '') + '.'
        : 'die Feststellung meiner Pflegebedürftigkeit und die Zuordnung zu einem Pflegegrad nach dem SGB XI.'}</p>

    <p>Zur fachlichen Begründung füge ich die beigefügte pflegefachliche Stellungnahme bei. Sie enthält die
    erhobenen Befunde, die pflegerelevanten Diagnosen sowie eine Bewertung der sechs Begutachtungsmodule
    nach den Richtlinien des Medizinischen Dienstes Bund.</p>

    <p>Ich bitte um Bestätigung des Antragseingangs und um Mitteilung des Begutachtungstermins.
    ${hoeher ? '' : 'Bitte teilen Sie mir mit, welche Unterlagen Sie darüber hinaus benötigen.'}</p>

    <p>Mit freundlichen Grüßen</p>

    <div style="margin-top:46px">
      <div style="border-top:1px solid #000;width:280px;padding-top:5px">Ort, Datum</div>
    </div>
    <div style="margin-top:34px">
      <div style="border-top:1px solid #000;width:280px;padding-top:5px">Unterschrift ${esc(name)}</div>
    </div>
    <p style="margin-top:26px;font-size:9pt;color:#555">Anlage: Pflegefachliche Stellungnahme</p>
  </div>`;
}

function buildHoeherstufung(notesOverride, begruendungen, allgemeinText, anamneseZusammenfassung) {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const esc = escapeHtml;
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    const istHoeher = (appModus === 'hoeherstufung');
    const verf = getVerfasser();

    let name = g('stam-betreffend');
    const cm = name.match(/^([^,]+),\s*(.+)$/);
    if (cm && !/^(herr|frau)/i.test(name)) name = (cm[2] + ' ' + cm[1]).trim();
    if (!name) name = 'Herr/ Frau';

    const rO = calculateInternal('orig');
    const rE = calculateInternal('own');
    const istKeinPG = v => { const s = String(v == null ? '' : v).trim(); return s === '' || s === '0' || /^kein/i.test(s); };
    const pgWert = v => istKeinPG(v) ? 'kein Pflegegrad' : 'Pflegegrad ' + String(v).trim();
    const altPG = erfassungExtra.pg || (rO.pg ? String(rO.pg) : '');
    const vorgutachtenDatum = formatDE(erfassungExtra.vorgutachten || g('stam-begutachtung'));
    const org = g('stam-organisation') || 'Medizinischer Dienst';

    const notesEl = document.getElementById('erstgespraech-notes');
    if (notesEl) erstgespraechNotes = notesEl.value;
    const notes = (typeof notesOverride === 'string' ? notesOverride : (erstgespraechNotes || '')).trim();

    // Doppelpunkt direkt hinter der Bezeichnung; die Angaben bleiben in ihrer Spalte
    // (Breite von .k in STELLUNGNAHME_CSS).
    const dataRow = (k, v) => `<div class="data-row"><span class="k">${esc(k)}:</span> <span>${esc(v || '')}</span></div>`;
    const df = (key, val) => `<span data-f="${key}">${esc(val == null ? '' : String(val))}</span>`;

    // Pflegepersonen
    const pp = (erfassung.pflegepersonen || []).filter(z => (z.name || '').trim());
    const ppBlock = pp.map(z => `<div class="data-block">
        ${dataRow(z.art || 'Pflegeperson', z.name)}
        ${z.geboren ? dataRow('geboren am', formatDE(z.geboren)) : ''}
        ${z.adresse ? dataRow('Adresse', z.adresse) : ''}
        ${z.telefon ? dataRow('Telefon', z.telefon) : ''}
        ${(z.tage || z.stunden) ? dataRow('Pflegezeiten', `Tage: ${z.tage || '–'}   Stunden am Tag: ${z.stunden || '–'}   Wochenstunden: ${z.wochenstunden || '–'}`) : ''}
        ${z.unterstuetzung ? dataRow('Wobei unterstützt wird', z.unterstuetzung) : ''}
      </div>`).join('');

    // Diagnosen aus Reiter 1
    const diagZeilen = [];
    for (let i = 1; i <= (typeof diagRowCount === 'function' ? diagRowCount() : 6); i++) {
        const icd = g('diag-icd-' + i), txt = g('diag-txt-' + i);
        if (icd || txt) diagZeilen.push([icd, txt, '']);
    }

    // Abweichungen – für die Kennung der „Aktuellen Situation" (allgemeinSignature)
    const diffs = computeDiffs();
    // Kern des Antrags: je Lebensbereich ein Absatz und die eigene Einschätzung
    const bereiche = antragBereiche();
    const critHtml = lebensbereicheHtml(bereiche, begruendungen || {}, org);

    // Gegenüberstellung: beim Erstantrag nur eine Wertespalte
    const row = (label, o, e, bold) => istHoeher
        ? `<tr><td${bold ? ' style="font-weight:bold"' : ''}>${esc(label)}</td><td class="num">${o}</td><td class="num">${e}</td></tr>`
        : `<tr><td${bold ? ' style="font-weight:bold"' : ''}>${esc(label)}</td><td class="num">${e}</td></tr>`;
    // Modulnummern nach der Zählung des Gutachtens: 4.x beim Medizinischen Dienst, 5.x bei Medicproof.
    const mN = [modulNr(1, org) + ' Mobilität', modulNr(2, org) + ' Kognitive und kommunikative Fähigkeiten',
                modulNr(3, org) + ' Verhaltensweisen und psychische Problemlagen', modulNr(4, org) + ' Selbstversorgung',
                modulNr(5, org) + ' Krankheits- und therapiebedingten Anforderungen', modulNr(6, org) + ' Gestaltung des Alltagslebens und sozialer Kontakte'];
    const tableRows = [
        row(mN[0], f2(rO.weights[0]), f2(rE.weights[0])),
        row(mN[1], f2(rO.weights[1]), f2(rE.weights[1])),
        row(mN[2], f2(rO.weights[2]), f2(rE.weights[2])),
        row('Höchster Wert aus Modul 2 und Modul 3', f2(Math.max(rO.weights[1], rO.weights[2])), f2(Math.max(rE.weights[1], rE.weights[2])), true),
        row(mN[3], f2(rO.weights[3]), f2(rE.weights[3])),
        row(mN[4], f2(rO.weights[4]), f2(rE.weights[4])),
        row(mN[5], f2(rO.weights[5]), f2(rE.weights[5])),
        row('Summe der gewichteten Punkte', f2(rO.total), f2(rE.total), true),
        row('Pflegegrad', pgWert(altPG), pgWert(rE.pg), true)
    ].join('');

    const notesBlock = (allgemeinText && allgemeinText.trim())
        ? nummernImText(allgemeinText.trim(), org).split(/\n\s*\n/).map(a => `<p>${esc(a.trim()).replace(/\n/g, '<br>')}</p>`).join('')
        : (notes ? `<p>${esc(notes).replace(/\n/g, '<br>')}</p>` : '');

    /* Angaben laut Vorgutachten: NUR die von der KI gekürzte Fassung (Viertelseite).
       Früher stand hier ersatzweise der ROHTEXT, wenn die KI ausfiel – im Fall des Verfassers
       drei Seiten Anamnese aus dem Vorgutachten, das der Medizinische Dienst ohnehin hat.
       Ohne Kurzfassung entfällt der Abschnitt; die App meldet das (generateAppealText). */
    const anamneseRoh = g('stam-anamnese');
    const anamneseKurz = (anamneseZusammenfassung && anamneseZusammenfassung.trim())
        ? anamneseZusammenfassung.trim() : '';
    const anamneseBlock = (anamneseRoh && anamneseKurz)
        ? anamneseKurz.split(/\n\s*\n/)
            .map(a => `<p>${esc(a.trim()).replace(/\n/g, '<br>')}</p>`).join('')
        : '';

    const zweck = istHoeher
        ? `Diese pflegefachliche Stellungnahme dient der Unterstützung von ${df('name', name)} bei der Beantragung einer Höherstufung. `
          + `Zu diesem Zweck habe ich ${df('name', name)} persönlich befragt, pflegefachliche Befunde erhoben und das Gutachten `
          + `${df('org', orgGenitiv(org))} vom ${df('vgdatum', vorgutachtenDatum || '—')} hinzugezogen.`
        : `Diese pflegefachliche Stellungnahme dient der Unterstützung von ${df('name', name)} bei der Beantragung eines Pflegegrades. `
          + `Zu diesem Zweck habe ich ${df('name', name)} persönlich befragt und pflegefachliche Befunde erhoben.`;

    const einleitung = istHoeher
        ? `<p>Im Gutachten ${df('org', orgGenitiv(org))} vom ${df('vgdatum', vorgutachtenDatum || '—')} wurde ${df('name', name)} mit `
          + `${df('opg', pgWert(altPG))} und ${df('opts', f2(rO.total))} gewichteten Punkten eingestuft. Die Bewertung erfolgte auf Basis der zu `
          + `diesem Zeitpunkt vorliegenden Einschränkungen in den sechs Begutachtungsmodulen. Seit der Begutachtung haben sich jedoch relevante `
          + `Veränderungen im Gesundheitszustand und in der Alltagskompetenz ergeben, die zu einer höheren pflegerischen Versorgungsnotwendigkeit `
          + `führen und somit eine Neubewertung der Module erforderlich machen`
          + (erfassungExtra.verschlechterung ? ` (${df('vschl', erfassungExtra.verschlechterung)})` : '')
          + `. Die folgende Tabelle stellt die gewichteten Punkte des Vorgutachtens der heutigen Einschätzung gegenüber; `
          + `die Einschränkungen selbst sind im Anschluss je Lebensbereich beschrieben.</p>`
        : `<p>Es bestehen relevante Einschränkungen der Selbständigkeit und ein daraus resultierender personeller Unterstützungsbedarf, `
          + `der zu einer pflegerischen Versorgungsnotwendigkeit führt und somit eine Bewertung der Module erforderlich macht. `
          + `Im Folgenden werden die wesentlichen Bewertungen anhand der gutachterlichen Richtlinien SGB XI tabellarisch dargestellt:</p>`;

    return `${erfassungExtra.deckblatt ? buildDeckblatt() : ''}<div class="stmt" data-vorgang="${istHoeher ? 'hoeherstufung' : 'erstantrag'}">
    <div class="stmt-head">
      <img class="stmt-logo" src="${FAMILIARA_LOGO}" alt="Familiara">
      <div class="stmt-address">Familiara GmbH<br>Wiesbadener Straße 3<br>12161 Berlin<br><br>Telefon 030 577 015 900<br>Fax 030 577 015 901<br><br>Geschäftsführer: Dr. med. Jörg A. Zimmermann<br><br>HRB 184522 B<br>Amtsgericht Berlin-Charlottenburg<br>Umsatzsteuer-ID: DE311459777<br><br>www.familiara.de<br>kontakt@familiara.de</div>
    </div>

    <div class="stmt-top"><div class="left">
        <div>${esc(verf.name)}</div>
        ${verf.zeilen.map(z => `<div>${esc(z)}</div>`).join('')}
    </div></div>

    <h1>Pflegefachliche Stellungnahme</h1>
    <p>auf Grundlage der Richtlinien des Medizinischen Dienstes Bund zur Feststellung der Pflegebedürftigkeit nach dem SGB XI vom 21. Dezember 2023</p>

    <h2>Versicherte Person</h2>
    <div class="data-block" id="stmt-data">
      ${dataRow('Betreffend', name)}
      ${dataRow('geboren am', formatDE(g('stam-geboren')))}
      ${dataRow('Kasse', g('stam-kasse'))}
      ${dataRow('Versicherungs-Nr.', g('stam-versnr'))}
      ${istHoeher ? dataRow('Gutachtenorganisation', org) : ''}
      ${istHoeher ? dataRow('Datum Vorgutachten', vorgutachtenDatum) : ''}
      ${istHoeher ? dataRow('Bisheriger Pflegegrad', pgWert(altPG)) : ''}
    </div>

    ${pp.length ? '<h2>Pflegeperson und Kontaktperson</h2>' + ppBlock : ''}

    <p>${zweck}</p>

    ${tabellenBlock('Krankenhausaufenthalte', ['von', 'bis', 'Aufnahmediagnose'],
        erfZeilenGefuellt('krankenhaus', ['von', 'bis', 'grund']).map(z => [formatDE(z[0]), formatDE(z[1]), z[2]]))}

    ${tabellenBlock('Diagnosen', ['ICD-10-Code', 'Diagnose', 'Erstdiagnose'], diagZeilen)}

    ${/* „Anamnese" bleibt die große Überschrift. Darunter zwei untergeordnete Abschnitte:
          was das Vorgutachten festgehalten hat (kurz zusammengefasst, Viertelseite) und
          wie es heute aussieht (Drittelseite). Ohne Vorgutachten entfällt der erste. */''}
    <h2>Anamnese</h2>
    ${anamneseBlock ? `<h3>Angaben laut Vorgutachten</h3>
    <div id="stmt-anamnese" data-ai="1">${anamneseBlock}</div>` : ''}
    <h3>Aktuelle Situation</h3>
    <div id="stmt-notes" data-sig="${esc(allgemeinSignature(notes, diffs))}" data-ai="${(allgemeinText && allgemeinText.trim()) ? '1' : '0'}">${notesBlock}</div>

    ${/* Einfache Aufzählung: welche Hilfsmittel liegen vor, werden sie genutzt, und was
          tut die Pflegeperson damit. Die Häufigkeit steht dort, wo sie hingehört – in der
          Begründung zum Kriterium 4.5.7. */''}
    ${tabellenBlock('Hilfsmittel', ['Hilfsmittel', 'Nutzung', 'Tätigkeit der Pflegeperson'],
        (erfassung.hilfsmittel || []).filter(z => (z.bezeichnung || '').trim())
            .map(z => [z.bezeichnung, z.nutzung || '', z.taetigkeit || z.anmerkung || '']))}

    <h2>Körperlicher Befund</h2>
    <table class="cmp"><thead><tr><th>Körpergröße (cm)</th><th>Gewicht (kg)</th><th>BMI</th><th>Status</th></tr></thead>
    <tbody><tr><td>${esc(befundTexte['groesse'] || '')}</td><td>${esc(befundTexte['gewicht'] || '')}</td>
    <td>${esc(befundTexte['bmi'] || '')}</td>
    <td>${esc((() => { const e = befundEintrag('ernaehrungszustand'); const w = e ? befundWert(e, null) : null; return w === null ? '' : e.skala[w]; })())}</td></tr></tbody></table>

    ${befundBlock()}

    ${tabellenBlock('Arzt- und Therapiebesuche', ['Fachrichtung', 'Häufigkeit', 'Durchführung'],
        (erfassung.arztbesuche || []).filter(z => (z.fach || '').trim()).map(z => [z.fach, haeufigkeitText(z), z.begleitung || '']))}

    ${tabellenBlock('Medikation', ['Applikationsort', 'Unterschiedliche Präparate', 'Häufigkeit', 'Unterstützung'],
        (erfassung.medikation || []).filter(z => (z.applikation || z.bezeichnung || '').toString().trim())
            .map(z => [z.applikation || z.bezeichnung || '', z.praeparate || '', haeufigkeitText(z), medikationHilfe(z)]))}

    ${tabellenBlock('Behandlungspflege', ['Maßnahme', 'Tätigkeitsbeschreibung', 'Häufigkeit', 'Durchführung'],
        (erfassung.behandlungspflege || []).filter(z => (z.art || '').trim()).map(z => [z.art, z.beschreibung || '', haeufigkeitText(z), z.durchfuehrung || '']))}

    <h2>${istHoeher ? 'Bewertung der Module: Vorgutachten und heutige Einschätzung' : 'Bewertung der Module'}</h2>
    ${einleitung}
    <table class="cmp">
      <thead><tr><th>Modul</th>${istHoeher ? '<th>Gewichtete Punkte laut Vorgutachten</th>' : ''}<th>Gewichtete Punkte heute</th></tr></thead>
      <tbody id="stmt-cmp-body">${tableRows}</tbody>
    </table>

    <h2 id="stmt-crit-titel">Einschränkungen in den Lebensbereichen</h2>
    <div id="stmt-crit">${critHtml}</div>

    <hr>

    <h2>Fazit</h2>
    <p>Unter Berücksichtigung der oben genannten Einschätzung ergibt sich ein Punktwert von mindestens
    ${df('etotal', f2(rE.total))} Gesamtpunkten, der gemäß den Richtlinien ${df('epg', pgWert(rE.pg))} rechtfertigt.</p>
  </div>`;
}
