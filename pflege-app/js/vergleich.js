// Dreiervergleich für das Anhörungsverfahren:
// Erstgutachten (E) – Anhörungsgutachten (Z) – eigene Beurteilung (B).
//
// Betrachtet werden nur Kriterien, in denen die eigene Beurteilung vom Erstgutachten
// abweicht. Nur dort gab es überhaupt etwas, dem der Medizinische Dienst folgen konnte.
// Alles hier ist Rechnen, keine KI – die Aussagen sind damit belastbar.

const VERGLEICH_LAGEN = {
    gefolgt:        { titel: 'gefolgt',           farbe: 'gruen',  text: 'Der Medizinische Dienst hat die Bewertung übernommen.' },
    teilweise:      { titel: 'teilweise gefolgt', farbe: 'gelb',   text: 'Nachgebessert, aber nicht bis zur begründeten Stufe.' },
    nicht:          { titel: 'nicht gefolgt',     farbe: 'rot',    text: 'Unverändert gegenüber dem Erstgutachten.' },
    verschlechtert: { titel: 'verschlechtert',    farbe: 'rot',    text: 'Im Zweitgutachten niedriger als im Erstgutachten.' }
};

// Vergleichbarer Zahlenwert einer Bewertung. Bei den Häufigkeitskriterien des Moduls 5
// ist das die Häufigkeit pro Tag, sonst der Stufenindex.
function stufenwert(item, wert) {
    if (item && item.m === 5 && item.group !== 'D') {
        if (!wert || typeof wert !== 'object') return 0;
        let d = Number(wert.count) || 0;
        if (wert.period === 'W') d /= 7;
        else if (wert.period === 'M') d /= 30;
        return d;
    }
    return (typeof wert === 'number') ? wert : 0;
}

// Lesbare Fassung einer Bewertung – für die Übersicht und später für das Schriftstück.
function bewertungText(item, wert) {
    if (item && item.m === 5 && item.group !== 'D') {
        return (typeof m5HaeufigkeitText === 'function')
            ? m5HaeufigkeitText(item.nr, wert)
            : String(wert && wert.count || 0);
    }
    const i = (typeof wert === 'number') ? wert : 0;
    const roh = (item && item.opts && item.opts[i]) ? item.opts[i] : '—';
    return (typeof expandLabel === 'function') ? expandLabel(roh) : roh;
}

// Kopie eines Bewertungsstandes – Grundlage der Was-wäre-wenn-Rechnung.
function standKopie(st) {
    return { special: st.special || 0, values: JSON.parse(JSON.stringify(st.values || {})) };
}

/* Kernstück: je abweichendem Kriterium die Lage bestimmen.
   Rückgabe: [{ item, e, z, b, lage, eText, zText, bText, kipptAllein, punkteMit }] */
function vergleichsLagen() {
    const lagen = [];
    ITEMS.forEach(item => {
        if (!item.m) return;                     // Sonderbedarf gesondert
        const e = stufenwert(item, stateOrig.values[item.id]);
        const b = stufenwert(item, stateEigene.values[item.id]);
        if (e === b) return;                     // im Widerspruch nicht abgewichen
        const z = stufenwert(item, stateZweit.values[item.id]);
        const richtung = (b > e) ? 1 : -1;

        let lage;
        if ((z - b) * richtung >= 0) lage = 'gefolgt';
        else if ((z - e) * richtung > 0) lage = 'teilweise';
        else if (z === e) lage = 'nicht';
        else lage = 'verschlechtert';

        lagen.push({
            item: item, nr: item.nr, titel: item.title, lage: lage,
            eText: bewertungText(item, stateOrig.values[item.id]),
            zText: bewertungText(item, stateZweit.values[item.id]),
            bText: bewertungText(item, stateEigene.values[item.id])
        });
    });
    return lagen;
}

// Kennung einer Lage im Schriftstück (data-vals). Ändert sich einer der drei Werte,
// wird die Begründung neu verfasst – sonst bleibt der vorhandene Text stehen.
function lagenSchluessel(l) {
    return l.eText + '|' + l.zText + '|' + l.bText;
}

// Noch strittig ist alles, dem der MD nicht oder nur teilweise gefolgt ist.
function strittigeLagen(lagen) {
    return (lagen || vergleichsLagen()).filter(l => l.lage !== 'gefolgt');
}

/* Schwellenwertrechnung – das stärkste Argument in den Vorlagen des Verfassers.
   Für jedes noch strittige Kriterium wird gerechnet: Was ergäbe sich, wenn AUSSCHLIESSLICH
   dieses eine Kriterium auf die begründete Stufe angehoben würde – ausgehend vom
   Anhörungsgutachten? Kippt allein das den Pflegegrad, ist das der Angriffspunkt. */
function schwellenAnalyse() {
    const basis = calculateInternal(standKopie(stateZweit));   // aus den Kriterien, nicht aus der Zusammenfassung
    const lagen = vergleichsLagen();
    const strittig = strittigeLagen(lagen);

    strittig.forEach(l => {
        const probe = standKopie(stateZweit);
        probe.values[l.item.id] = JSON.parse(JSON.stringify(stateEigene.values[l.item.id]));
        const r = calculateInternal(probe);
        l.punkteMit = r.total;
        l.pgMit = r.pg;
        l.kipptAllein = (r.pg > basis.pg);
    });

    // Alle strittigen Punkte zusammen
    const alle = standKopie(stateZweit);
    strittig.forEach(l => { alle.values[l.item.id] = JSON.parse(JSON.stringify(stateEigene.values[l.item.id])); });
    const gesamt = calculateInternal(alle);

    // Das AUSGEWIESENE Ergebnis des Anhörungsgutachtens: die Angabe aus dem Gutachten,
    // sofern vorhanden. Sie kann von der Summe der Kriterien abweichen – dann stimmt
    // eines von beidem nicht, und das muss auffallen statt unbemerkt zu bleiben.
    const angezeigt = calculateInternal('zweit');
    const abweichung = Math.abs(angezeigt.total - basis.total) > 0.01 || angezeigt.pg !== basis.pg;

    const naechste = [12.5, 27, 47.5, 70, 90].find(t => t > basis.total);
    return {
        basis: basis,
        angezeigt: angezeigt,
        abweichung: abweichung,
        gesamt: gesamt,
        lagen: lagen,
        strittig: strittig,
        gefolgt: lagen.filter(l => l.lage === 'gefolgt'),
        naechsteSchwelle: naechste === undefined ? null : naechste,
        fehlendePunkte: naechste === undefined ? 0 : Math.round((naechste - basis.total) * 100) / 100,
        kipper: strittig.filter(l => l.kipptAllein)
    };
}

/* Welche Erwiderungsmuster aus den Vorlagen des Verfassers kommen in Betracht?
   Die App schlägt vor – formuliert wird in Phase 4. */
function erwiderungsMuster(lage, analyse) {
    const m = [];
    if (lage.lage === 'teilweise') m.push('A');           // Befund bestätigt, Wertung nicht bis zur Stufe
    if (lage.lage === 'nicht') m.push('A');
    if (lage.lage === 'verschlechtert') m.push('A');
    const art = (document.getElementById('anh-art')?.value || '');
    if (/aktenlage/i.test(art)) m.push('D');              // Amtsermittlung bei Entscheidung nach Aktenlage
    if (analyse && analyse.gefolgt.length) m.push('F');   // inkonsistent zu den übernommenen Punkten
    if (lage.kipptAllein || (analyse && analyse.fehlendePunkte > 0 && analyse.fehlendePunkte <= 5)) m.push('E');
    m.push('C');                                          // Zweitgutachten widerlegt die Stellungnahme nicht
    return Array.from(new Set(m));
}

const MUSTER_TEXTE = {
    A: 'Befund bestätigt, Wertung unverändert',
    B: 'Selbsteinschätzung statt Befund',
    C: 'Stellungnahme nicht widerlegt',
    D: 'Entscheidung nach Aktenlage – Amtsermittlung',
    E: 'Schwelle knapp unterschritten',
    F: 'Inkonsistent zu den übernommenen Punkten'
};

// ------------------------------------------------------------------ Darstellung
function renderVergleich() {
    const ziel = document.getElementById('tab-vergleich');
    if (!ziel) return;
    if (!hatZweitgutachten()) {
        ziel.innerHTML = `<div class="card"><div class="card-header"><div class="dot"></div>Vergleich</div>
            <div style="padding:20px">
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.7">
                    Es liegt noch kein Anhörungsgutachten vor. Laden Sie auf Reiter 1 zuerst den
                    gespeicherten Widerspruchsfall und lesen Sie anschließend das Anhörungsschreiben
                    mit dem beigefügten Gutachten ein.
                </p>
            </div></div>`;
        return;
    }

    const a = schwellenAnalyse();
    const pgTxt = p => p > 0 ? 'Pflegegrad ' + p : 'kein Pflegegrad';
    const z2 = n => n.toFixed(2).replace('.', ',');

    const kachel = (l, w, farbe) => `<div style="background:var(--bg-card2);padding:18px;text-align:center">
        <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:var(--text-secondary);margin-bottom:8px">${escapeHtml(l)}</div>
        <div style="font-size:24px;font-weight:800;color:${farbe}">${escapeHtml(w)}</div></div>`;

    let html = `<div class="space-y-6">
        <div class="card">
            <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Drei Stände im Vergleich</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border)">
                ${kachel('Erstgutachten', pgTxt(calculateInternal('orig').pg), 'var(--accent)')}
                ${kachel('Anhörungsgutachten', pgTxt(a.basis.pg), '#1d4ed8')}
                ${kachel('Meine Beurteilung', pgTxt(a.gesamt.pg), 'var(--accent2)')}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border)">
                ${kachel('Punkte', z2(calculateInternal('orig').total), 'var(--text-primary)')}
                ${kachel('Punkte', z2(a.basis.total), 'var(--text-primary)')}
                ${kachel('Punkte', z2(a.gesamt.total), 'var(--text-primary)')}
            </div>
        </div>`;

    // Weicht die Angabe im Gutachten von der Summe seiner Kriterien ab, ist die
    // Schwellenwertrechnung nur so verlässlich wie die erfassten Kriterien.
    if (a.abweichung) {
        html += `<div class="card"><div class="card-header"><div class="dot" style="background:var(--red)"></div>Bitte prüfen</div>
            <div style="padding:16px 20px"><div class="hinweis-warnung">
                <b>Das Anhörungsgutachten weist ${z2(a.angezeigt.total)} Punkte aus, seine erfassten Kriterien
                ergeben aber ${z2(a.basis.total)} Punkte.</b> Die folgende Rechnung stützt sich auf die Kriterien.
                Bitte ergänzen Sie fehlende Kriterien über „Erfasste Daten korrigieren“, sonst tragen die
                Aussagen zur Schwelle nicht.
            </div></div></div>`;
    }

    // Schwellenwert-Aussage
    if (a.naechsteSchwelle !== null) {
        html += `<div class="card"><div class="card-header"><div class="dot" style="background:var(--red)"></div>Wie knapp war es?</div>
            <div style="padding:16px 20px">
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.7">
                    Das Anhörungsgutachten liegt bei <b>${z2(a.basis.total)} Punkten</b>. Bis zur nächsten
                    Schwelle (<b>${z2(a.naechsteSchwelle)}</b>) fehlen <b>${z2(a.fehlendePunkte)} Punkte</b>.
                </p>
                ${a.kipper.length ? `<div class="hinweis-warnung" style="margin-top:12px">
                    <b>${a.kipper.length} Kriterium/Kriterien hätten allein genügt:</b><br>
                    ${a.kipper.map(l => escapeHtml(l.nr + ' ' + l.titel) + ' → ' + escapeHtml(pgTxt(l.pgMit))).join('<br>')}
                    </div>` : `<p style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:10px">
                    Kein einzelnes strittiges Kriterium würde für sich genommen den Pflegegrad ändern.</p>`}
            </div></div>`;
    }

    // Übernommene Punkte
    html += `<div class="card"><div class="card-header"><div class="dot" style="background:var(--green)"></div>
            Übernommen (${a.gefolgt.length})</div>
        <div style="padding:16px 20px">
            <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                Hier ist der Medizinische Dienst Ihrer Stellungnahme gefolgt. Das belegt die Tragfähigkeit
                Ihrer Befunde – und macht die nicht übernommenen Punkte begründungsbedürftig.
            </p>
            ${a.gefolgt.length ? tabelleLagen(a.gefolgt, false) :
                '<p style="font-size:12px;color:var(--text-muted)">Keiner Ihrer Punkte wurde übernommen.</p>'}
        </div></div>`;

    // Strittig geblieben
    html += `<div class="card"><div class="card-header"><div class="dot" style="background:var(--red)"></div>
            Strittig geblieben (${a.strittig.length})</div>
        <div style="padding:16px 20px">
            <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                Diese Kriterien kommen in die Stellungnahme an den Widerspruchsausschuss.
                „Muster“ nennt die Erwiderungsart aus Ihren Vorlagen, die hier fachlich trägt.
            </p>
            ${a.strittig.length ? tabelleLagen(a.strittig, true, a) :
                '<p style="font-size:12px;color:var(--text-muted)">Es ist nichts strittig geblieben.</p>'}
        </div></div>`;

    // Legende der Muster
    html += `<div class="card"><div class="card-header"><div class="dot"></div>Erwiderungsmuster</div>
        <div style="padding:16px 20px">
            ${Object.keys(MUSTER_TEXTE).map(k =>
                `<div style="font-size:12px;color:var(--text-secondary);line-height:1.9">
                    <b>${k}</b> — ${escapeHtml(MUSTER_TEXTE[k])}</div>`).join('')}
        </div></div></div>`;

    ziel.innerHTML = html;
}

function tabelleLagen(liste, mitMuster, analyse) {
    const kopf = mitMuster
        ? '<tr><th>Nr.</th><th>Kriterium</th><th>Erstgutachten</th><th>Anhörungsgutachten</th><th>Meine Beurteilung</th><th>Lage</th><th>Muster</th></tr>'
        : '<tr><th>Nr.</th><th>Kriterium</th><th>Erstgutachten</th><th>Anhörungsgutachten</th><th>Meine Beurteilung</th></tr>';
    const farbe = { gruen: 'var(--green)', gelb: '#b45309', rot: 'var(--red)' };
    const zeilen = liste.map(l => {
        const lg = VERGLEICH_LAGEN[l.lage];
        const muster = mitMuster ? erwiderungsMuster(l, analyse) : [];
        return `<tr>
            <td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap">${escapeHtml(l.nr)}</td>
            <td style="font-size:12px">${escapeHtml(l.titel)}</td>
            <td style="font-size:11px;color:var(--text-muted)">${escapeHtml(l.eText)}</td>
            <td style="font-size:11px">${escapeHtml(l.zText)}</td>
            <td style="font-size:11px;font-weight:600">${escapeHtml(l.bText)}</td>
            ${mitMuster ? `<td style="font-size:11px;font-weight:700;color:${farbe[lg.farbe]};white-space:nowrap">${escapeHtml(lg.titel)}${l.kipptAllein ? ' ⚑' : ''}</td>
            <td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap">${muster.join(' ')}</td>` : ''}
        </tr>`;
    }).join('');
    return `<div style="overflow-x:auto"><table class="result-table" style="font-size:12px">
        <thead>${kopf}</thead><tbody>${zeilen}</tbody></table></div>`;
}
