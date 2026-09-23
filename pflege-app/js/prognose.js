// Prognose, Schwellen, Rückstufungsrisiko, Quervergleich und Tragfähigkeit.
//
// Alles hier ist GERECHNET – keine KI. Die Aussagen müssen belastbar sein, denn der
// Berater entscheidet danach, woran er arbeitet und ob sich ein Antrag lohnt.
// Die App setzt dabei NIE eine Bewertung; sie zeigt nur, was die vorhandenen Werte ergeben.
//
// Je Vorgang:
//   Erstantrag/Höherstufung – Prognose: welcher Pflegegrad, wie weit bis zum nächsten.
//   Höherstufung/Widerspruch – Rückstufungsrisiko: Wo liegt die eigene Einschätzung UNTER
//       dem Gutachten? Genau dort kann der Medizinische Dienst bei erneuter Begutachtung
//       kürzen. Daraus: lohnt sich der Vorgang?
//   Widerspruch – Schwellenanalyse (wie im Anhörungsverfahren): Welches abweichende
//       Kriterium kippt für sich allein den Pflegegrad?
//   Widerspruch – Quervergleich: Wo hat der Gutachter selbst schon eine Einschränkung
//       anerkannt? Die KI nutzt das längst, der Berater sah es bisher nicht.
//   Alle – Tragfähigkeit: Modul 3 ohne fachärztliche Diagnose, Modul 5 ohne Nachweis.

const PG_SCHWELLEN = [12.5, 27, 47.5, 70, 90];

// Nächste Schwelle oberhalb eines Punktwerts – null, wenn schon über der letzten.
function naechsteSchwelle(total) {
    const s = PG_SCHWELLEN.find(x => x > Number(total) + 0.001);
    if (s === undefined) return null;
    // 12,5 -> Pflegegrad 1, 27 -> 2, 47,5 -> 3, 70 -> 4, 90 -> 5
    return { schwelle: s, fehlend: Math.round((s - total) * 100) / 100, pg: PG_SCHWELLEN.indexOf(s) + 1 };
}

// Ein Stand mit genau einem geänderten Kriterium – Grundlage der Kipp-Rechnung.
function standMit(basis, itemId, wert) {
    const probe = standKopie(basis);
    probe.values[itemId] = JSON.parse(JSON.stringify(wert));
    return probe;
}

/* Vergleich zweier Stände: Welche Kriterien weichen ab, und welches davon würde für sich
   allein den Pflegegrad ändern? Für den Widerspruch (Gutachten gegen eigene Einschätzung)
   dieselbe Rechnung wie schwellenAnalyse() im Anhörungsverfahren. */
function kippAnalyse(basisStand, zielStand) {
    const basis = calculateInternal(standKopie(basisStand));
    const gesamt = calculateInternal(standKopie(zielStand));
    const abweichend = [];
    ITEMS.forEach(item => {
        if (!item.m) return;
        const b = stufenwert(item, basisStand.values[item.id]);
        const z = stufenwert(item, zielStand.values[item.id]);
        if (b === z) return;
        const r = calculateInternal(standMit(basisStand, item.id, zielStand.values[item.id]));
        abweichend.push({
            item: item, nr: item.nr, titel: item.title, m: item.m,
            basisText: bewertungText(item, basisStand.values[item.id]),
            zielText: bewertungText(item, zielStand.values[item.id]),
            hoeher: z > b, punkteMit: r.total, pgMit: r.pg, kipptAllein: r.pg > basis.pg
        });
    });
    const s = naechsteSchwelle(basis.total);
    return {
        basis: basis, gesamt: gesamt, abweichend: abweichend,
        hoeher: abweichend.filter(a => a.hoeher), niedriger: abweichend.filter(a => !a.hoeher),
        kipper: abweichend.filter(a => a.kipptAllein),
        naechsteSchwelle: s ? s.schwelle : null, fehlendePunkte: s ? s.fehlend : 0
    };
}

/* RÜCKSTUFUNGSRISIKO – vor dem Antrag, nicht erst im Fazit.
   Schlimmster Fall: Der Medizinische Dienst übernimmt die Kriterien, in denen die eigene
   Einschätzung UNTER dem Gutachten liegt, erkennt die höheren aber nicht an. */
function rueckstufungsAnalyse() {
    const gut = calculateInternal('orig');
    const eigen = calculateInternal('own');
    const schlechter = [];
    const schlimmst = standKopie(stateOrig);
    ITEMS.forEach(item => {
        if (!item.m) return;
        const g = stufenwert(item, stateOrig.values[item.id]);
        const e = stufenwert(item, stateEigene.values[item.id]);
        if (e >= g) return;
        schlechter.push({ nr: item.nr, titel: item.title,
                          gutachten: bewertungText(item, stateOrig.values[item.id]),
                          eigene: bewertungText(item, stateEigene.values[item.id]) });
        schlimmst.values[item.id] = JSON.parse(JSON.stringify(stateEigene.values[item.id]));
    });
    const risiko = calculateInternal(schlimmst);
    return {
        gutachten: gut, eigene: eigen, schlechter: schlechter, risiko: risiko,
        chance: eigen.pg > gut.pg, rueckstufung: risiko.pg < gut.pg
    };
}

// ------------------------------------------------------- Tragfähigkeit der Angaben
// Modul 3 setzt eine fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz
// voraus (BRi). Ohne eine solche Diagnose in den Diagnosezeilen trägt die Wertung nicht.
function psychDiagnoseVorhanden() {
    for (let n = 1; n <= 60; n++) {
        const icdEl = document.getElementById('diag-icd-' + n);
        const txtEl = document.getElementById('diag-txt-' + n);
        if (!icdEl && !txtEl) { if (n > 12) break; continue; }
        const icd = String(icdEl && icdEl.value || '').toUpperCase().replace(/\s+/g, '');
        const txt = String(txtEl && txtEl.value || '');
        if (/^F\d/.test(icd) || /^G3[01]/.test(icd)) return true;
        if (/demenz|alzheimer|depress|angstst|panik|psychos|schizophren|bipolar|delir|sucht|abh[äa]ngigkeit|zwangsst/i.test(txt)) return true;
    }
    return false;
}

// Gibt es zu einem Kriterium aus Modul 5 einen erfassten Nachweis? Gesucht wird in den
// Erfassungstabellen (Anträge) und in den ausgelesenen ärztlichen Unterlagen (Belege).
function m5NachweisVorhanden(nr) {
    const regel = (typeof BELEG_M5_REGELN !== 'undefined') ? BELEG_M5_REGELN.find(r => r.nr === nr) : null;
    const passt = t => !!t && (regel ? regel.re.test(t) : false);
    // Erfassungstabellen: jede Zeile zu einem Text zusammenfassen
    if (typeof erfassung !== 'undefined') {
        const tabellen = { medikation: ['4.5.1'], arztbesuche: ['4.5.13', '4.5.14'], hilfsmittel: ['4.5.7'] };
        for (const tid of Object.keys(erfassung || {})) {
            const zeilen = (erfassung[tid] || []).filter(z => Object.keys(z).some(k => k.charAt(0) !== '_' && String(z[k] || '').trim()));
            if (!zeilen.length) continue;
            if ((tabellen[tid] || []).includes(nr)) return true;      // eigene Tabelle je Kriterium
            if (zeilen.some(z => passt(Object.keys(z).filter(k => k.charAt(0) !== '_').map(k => z[k]).join(' ')))) return true;
        }
    }
    // Ärztliche Unterlagen (js/belege.js)
    if (typeof anlagen !== 'undefined') {
        if (anlagen.some(a => ((a.auswertung && a.auswertung.verordnungen) || [])
                .some(v => (typeof belegKriteriumFuer === 'function' ? belegKriteriumFuer(v.bezeichnung) : '') === nr))) return true;
    }
    return false;
}

/* Warnungen zu Angaben, die nach den Richtlinien ohne Nachweis nicht tragen.
   Es sind HINWEISE, keine Sperren: Die Bewertung bleibt Sache des Beraters. */
function tragfaehigkeitFunde() {
    const funde = [];
    const m3 = ITEMS.filter(i => i.m === 3 && stufenwert(i, stateEigene.values[i.id]) > 0);
    if (m3.length && !psychDiagnoseVorhanden()) {
        funde.push({ art: 'modul3', nrn: m3.map(i => i.nr),
            text: 'Modul 3 ist in ' + m3.length + ' Kriterium/Kriterien gewertet (' + m3.map(i => i.nr).join(', ')
                + '), es ist aber keine psychiatrische Diagnose oder Demenz erfasst. Die Richtlinien setzen eine '
                + 'fachärztliche Diagnose voraus, die seit mindestens sechs Monaten behandelt wird – bitte Diagnose '
                + 'eintragen oder die Wertung prüfen.' });
    }
    const ohne = ITEMS.filter(i => i.m === 5 && i.group !== 'D'
        && stufenwert(i, stateEigene.values[i.id]) > 0 && !m5NachweisVorhanden(i.nr));
    if (ohne.length) {
        funde.push({ art: 'modul5', nrn: ohne.map(i => i.nr),
            text: 'In Modul 5 sind ' + ohne.length + ' Maßnahme(n) gewertet, zu denen kein Nachweis erfasst ist ('
                + ohne.map(i => i.nr + ' ' + i.title).join('; ') + '). Modul 5 setzt in der Regel eine ärztliche '
                + 'Verordnung und eine Dauer von mindestens sechs Monaten voraus – bitte Unterlage hochladen, '
                + 'Tabelle ergänzen oder die Wertung prüfen.' });
    }
    return funde;
}

// ------------------------------------------------------------------ Darstellung
function pgText(pg) { return pg > 0 ? 'Pflegegrad ' + pg : 'kein Pflegegrad'; }
function pkt(n) { return Number(n).toFixed(2).replace('.', ','); }

function karte(titel, farbe, inhalt) {
    return `<div class="card"><div class="card-header"><div class="dot" style="background:${farbe}"></div>${escapeHtml(titel)}</div>
        <div style="padding:16px 20px">${inhalt}</div></div>`;
}

// Sprung zum Kriterium in der Bewertungstabelle
function zeigeKriterium(nr) {
    const item = ITEMS.find(i => i.nr === nr);
    if (!item) return;
    if (typeof switchTab === 'function') switchTab(3);
    setTimeout(() => {
        const zeile = document.getElementById('row-own-' + item.id) || document.getElementById('slider-own-' + item.id);
        const ziel = zeile ? (zeile.closest('tr') || zeile) : null;
        if (!ziel) return;
        ziel.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const alt = ziel.style.background;
        ziel.style.background = 'rgba(13,148,136,0.14)';
        setTimeout(() => { ziel.style.background = alt; }, 2000);
    }, 60);
}

function nrKnopf(nr, titel) {
    return `<a href="#" onclick="zeigeKriterium('${escapeHtml(nr)}');return false;" style="font-family:var(--font-mono);font-size:11px">${escapeHtml(nr)}</a> ${escapeHtml(titel || '')}`;
}

// Prognose: welcher Pflegegrad ergibt sich, und wie weit ist es bis zum nächsten?
function prognoseHtml() {
    const r = calculateInternal('own');
    const s = naechsteSchwelle(r.total);
    const satz = `Ihre Angaben ergeben <b>${escapeHtml(pgText(r.pg))}</b> mit <b>${pkt(r.total)} Punkten</b>.`
        + (s ? ` Bis ${escapeHtml(pgText(s.pg))} (ab ${pkt(s.schwelle)} Punkten) fehlen <b>${pkt(s.fehlend)} Punkte</b>.`
             : ' Ein höherer Pflegegrad ist nicht vorgesehen.');
    const modul = [0, 1, 2, 3, 4, 5].map(i => `<tr><td style="font-size:12px">Modul ${i + 1}</td>`
        + `<td class="num" style="font-family:var(--font-mono);font-size:12px">${pkt(r.weights[i])}</td></tr>`).join('');
    return karte('Prognose', 'var(--accent2)',
        `<p style="font-size:13px;color:var(--text-secondary);line-height:1.7">${satz}</p>
         <p style="font-size:11px;color:var(--text-muted);line-height:1.6;margin-top:8px">
            Gerechnet aus Ihren Einzelkriterien nach den Richtlinien. Für Modul 2 und 3 zählt nur der höhere Wert.</p>
         <div style="overflow-x:auto;margin-top:10px"><table class="result-table" style="font-size:12px">
            <thead><tr><th>Modul</th><th class="center">Gewichtete Punkte</th></tr></thead><tbody>${modul}</tbody></table></div>`);
}

// Rückstufungsrisiko – lohnt sich der Vorgang?
function risikoHtml() {
    const a = rueckstufungsAnalyse();
    const zeilen = a.schlechter.map(x => `<li style="margin-bottom:4px">${nrKnopf(x.nr, x.titel)}: `
        + `Gutachten „${escapeHtml(x.gutachten)}“, Ihre Einschätzung „${escapeHtml(x.eigene)}“</li>`).join('');
    let inhalt = `<p style="font-size:13px;color:var(--text-secondary);line-height:1.7">`
        + `Gutachten: <b>${escapeHtml(pgText(a.gutachten.pg))}</b> (${pkt(a.gutachten.total)} Punkte). `
        + `Ihre Einschätzung: <b>${escapeHtml(pgText(a.eigene.pg))}</b> (${pkt(a.eigene.total)} Punkte).</p>`;
    if (a.schlechter.length) {
        inhalt += `<div class="hinweis-warnung" style="margin-top:12px">
            <b>In ${a.schlechter.length} Kriterium/Kriterien liegt Ihre Einschätzung unter dem Gutachten.</b>
            Genau dort kann der Medizinische Dienst bei einer erneuten Begutachtung kürzen. Behält er die übrigen
            Werte des Gutachtens bei, ergäbe das <b>${escapeHtml(pgText(a.risiko.pg))}</b> mit ${pkt(a.risiko.total)} Punkten.
            <ul style="margin:8px 0 0 18px;font-size:12px">${zeilen}</ul></div>`;
    } else {
        inhalt += `<p style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:8px">
            Ihre Einschätzung liegt in keinem Kriterium unter dem Gutachten. Aus den erfassten Werten ergibt sich
            damit kein Anhaltspunkt für eine Rückstufung.</p>`;
    }
    const fazit = a.rueckstufung
        ? '⚠ Der Vorgang kann im schlechtesten Fall zu einem <b>niedrigeren</b> Pflegegrad führen. Bitte vorher mit der versicherten Person besprechen.'
        : (a.chance ? '✓ Aus den erfassten Werten ergibt sich ein höherer Pflegegrad, ohne erkennbares Rückstufungsrisiko.'
                    : 'Aus den erfassten Werten ergibt sich derzeit kein höherer Pflegegrad.');
    inhalt += `<p style="font-size:13px;line-height:1.7;margin-top:12px"><b>Lohnt sich der Vorgang?</b> ${fazit}</p>`;
    return karte('Rückstufungsrisiko', a.rueckstufung ? 'var(--red)' : 'var(--accent)', inhalt);
}

// Schwellenanalyse im Widerspruch: Welches abweichende Kriterium kippt den Pflegegrad?
function schwellenHtml() {
    const a = kippAnalyse(stateOrig, stateEigene);
    if (!a.abweichend.length) {
        return karte('Schwellenanalyse', 'var(--accent)',
            '<p style="font-size:12px;color:var(--text-muted);line-height:1.6">Es weicht bisher kein Kriterium vom Gutachten ab.</p>');
    }
    let inhalt = `<p style="font-size:13px;color:var(--text-secondary);line-height:1.7">`
        + `Das Gutachten liegt bei <b>${pkt(a.basis.total)} Punkten</b> (${escapeHtml(pgText(a.basis.pg))})`
        + (a.naechsteSchwelle !== null
            ? `; bis ${pkt(a.naechsteSchwelle)} Punkten fehlen <b>${pkt(a.fehlendePunkte)}</b>.` : '.')
        + ` Mit Ihren ${a.hoeher.length} Höherbewertungen ergeben sich <b>${pkt(a.gesamt.total)} Punkte</b> `
        + `(${escapeHtml(pgText(a.gesamt.pg))}).</p>`;
    inhalt += a.kipper.length
        ? `<div class="hinweis-warnung" style="margin-top:12px"><b>Diese Kriterien kippen den Pflegegrad für sich allein –
            hier lohnt die sorgfältigste Begründung:</b><ul style="margin:8px 0 0 18px;font-size:12px">`
            + a.kipper.map(k => `<li style="margin-bottom:4px">${nrKnopf(k.nr, k.titel)} → ${escapeHtml(pgText(k.pgMit))}</li>`).join('')
            + `</ul></div>`
        : `<p style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:10px">
            Kein einzelnes Kriterium ändert den Pflegegrad allein – erst mehrere zusammen.</p>`;
    return karte('Schwellenanalyse', 'var(--accent2)', inhalt);
}

// Quervergleich: Wo hat der Gutachter selbst schon eine Einschränkung anerkannt?
function quervergleichHtml() {
    const anerkannt = ITEMS.filter(i => i.m && stufenwert(i, stateOrig.values[i.id]) > 0)
        .map(i => ({ nr: i.nr, titel: i.title, text: bewertungText(i, stateOrig.values[i.id]),
                     abweichend: stufenwert(i, stateEigene.values[i.id]) !== stufenwert(i, stateOrig.values[i.id]) }));
    if (!anerkannt.length) {
        return karte('Vom Gutachter anerkannte Einschränkungen', 'var(--accent)',
            '<p style="font-size:12px;color:var(--text-muted);line-height:1.6">Der Gutachter hat in keinem Kriterium eine Einschränkung anerkannt.</p>');
    }
    const zeilen = anerkannt.map(x => `<tr><td style="font-size:12px">${nrKnopf(x.nr, x.titel)}</td>`
        + `<td style="font-size:11px">${escapeHtml(x.text)}</td>`
        + `<td style="font-size:11px;color:var(--text-muted)">${x.abweichend ? 'von Ihnen abweichend bewertet' : ''}</td></tr>`).join('');
    return karte('Vom Gutachter anerkannte Einschränkungen (' + anerkannt.length + ')', 'var(--green)',
        `<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:10px">
            Material für den Quervergleich: Hat der Gutachter hier eine Einschränkung gesehen, ist eine
            gegenteilige Wertung bei einem verwandten Kriterium begründungsbedürftig. Die KI nutzt diese
            Liste bereits für die Begründungen.</p>
         <div style="overflow-x:auto"><table class="result-table" style="font-size:12px">
            <thead><tr><th>Kriterium</th><th>Wertung des Gutachters</th><th></th></tr></thead>
            <tbody>${zeilen}</tbody></table></div>`);
}

function tragfaehigkeitHtml() {
    const f = tragfaehigkeitFunde();
    if (!f.length) return '';
    return karte('Bitte prüfen: Angaben ohne Nachweis', 'var(--red)',
        f.map(x => `<div class="hinweis-warnung" style="margin-bottom:8px">${escapeHtml(x.text)}</div>`).join('')
        + `<p style="font-size:11px;color:var(--text-muted);line-height:1.6">
            Die App ändert dabei nichts an Ihren Bewertungen – sie weist nur auf die Voraussetzungen der Richtlinien hin.</p>`);
}

/* Die Karten auf Reiter „Einschätzung". Je Vorgang das, was dort trägt. */
function renderAnalyseBereich() {
    const ziel = document.getElementById('analyse-bereich');
    if (!ziel) return;
    const modus = (typeof appModus !== 'undefined') ? appModus : 'widerspruch';
    const teile = [];
    if (modus === 'erstantrag' || modus === 'hoeherstufung') teile.push(prognoseHtml());
    if (modus === 'hoeherstufung' && typeof chronikHtml === 'function') teile.push(chronikHtml());
    if (modus === 'hoeherstufung' || modus === 'widerspruch') teile.push(risikoHtml());
    if (modus === 'widerspruch') { teile.push(schwellenHtml()); teile.push(quervergleichHtml()); }
    teile.push(tragfaehigkeitHtml());
    ziel.innerHTML = teile.filter(Boolean).join('');
}
