// Befunderhebung für Erstantrag und Höherstufungsantrag.
// Einträge, die einem NBA-Kriterium entsprechen, schreiben unmittelbar in die eigene
// Einschätzung – dieselbe Angabe wird also nur einmal erfasst. Funktionsbefunde
// (Schürzengriff und Ähnliches) schlagen lediglich Bewertungen vor.

let befundWerte = {};    // Schlüssel: eintragId oder eintragId|seite   ->  Stufenindex
let befundTexte = {};    // Schlüssel wie oben, jeweils Ergänzungstext
let befundExtra = {};    // Zusätzliche Einträge je Gruppe: { gruppenId: [{titel, text}] }

function befundSchluessel(eintrag, seite) {
    return seite ? eintrag.id + '|' + seite : eintrag.id;
}

// Aktueller Wert: bei NBA-Einträgen aus der eigenen Einschätzung, sonst aus befundWerte
function befundWert(eintrag, seite) {
    if (eintrag.nba) {
        const item = ITEMS.find(i => i.nr === eintrag.nba);
        const v = item ? stateEigene.values[item.id] : null;
        return (typeof v === 'number') ? v : null;
    }
    const w = befundWerte[befundSchluessel(eintrag, seite)];
    return (typeof w === 'number') ? w : null;
}

function setzeBefund(gruppenId, eintragId, seite, wert) {
    const eintrag = befundEintrag(eintragId);
    if (!eintrag) return;
    const idx = (wert === '') ? null : parseInt(wert, 10);
    if (eintrag.nba) {
        const item = ITEMS.find(i => i.nr === eintrag.nba);
        if (item && idx !== null) {
            stateEigene.values[item.id] = idx;      // gemeinsame Angabe, keine Doppelerfassung
            try { fillTable('own'); calculate('own'); } catch (e) {}
        }
    } else {
        if (idx === null) delete befundWerte[befundSchluessel(eintrag, seite)];
        else befundWerte[befundSchluessel(eintrag, seite)] = idx;
        // Eine eigene Angabe zum Ernährungszustand hat Vorrang vor der BMI-Ableitung
        if (eintragId === 'ernaehrungszustand') {
            if (idx === null) {
                delete befundTexte['ernaehrungszustand_manuell'];
                leiteErnaehrungszustandAb();
            } else {
                befundTexte['ernaehrungszustand_manuell'] = '1';
                const h = document.getElementById('befund-ez-hinweis');
                if (h) h.innerText = 'von Hand gesetzt – die BMI-Ableitung wird nicht mehr angewendet';
            }
        }
    }
    aktualisiereBefundHinweis();
}

// Setzt den Ernährungszustand wieder auf die Ableitung aus dem BMI zurück
function ernaehrungszustandAutomatisch() {
    delete befundTexte['ernaehrungszustand_manuell'];
    leiteErnaehrungszustandAb();
    const h = document.getElementById('befund-ez-hinweis');
    if (h && !befundTexte['bmi']) h.innerText = 'wird aus dem BMI abgeleitet, sobald Größe und Gewicht erfasst sind';
}

function setzeBefundText(eintragId, seite, text) {
    const eintrag = befundEintrag(eintragId);
    if (!eintrag) return;
    const s = befundSchluessel(eintrag, seite);
    if (text && text.trim()) befundTexte[s] = text; else delete befundTexte[s];
    if (eintragId === 'groesse' || eintragId === 'gewicht') berechneBmi();
}

function setzeBefundZusatz(eintragId, wert) {
    if (wert === '') delete befundWerte[eintragId + '_zw'];
    else befundWerte[eintragId + '_zw'] = parseInt(wert, 10);
}

// Text der zweiten Auswahl, etwa „in Ruhe" beim Tremor
function befundZusatzText(e) {
    if (!e.zusatzAuswahl) return '';
    const i = befundWerte[e.id + '_zw'];
    return (typeof i === 'number') ? e.zusatzAuswahl.skala[i] : '';
}

function befundEintrag(id) {
    for (const g of BEFUND_GRUPPEN) {
        const e = g.eintraege.find(x => x.id === id);
        if (e) return e;
    }
    return null;
}

// BMI aus Größe und Gewicht
function berechneBmi() {
    const gr = parseFloat((befundTexte['groesse'] || '').replace(',', '.'));
    const gw = parseFloat((befundTexte['gewicht'] || '').replace(',', '.'));
    // Der Wert wird immer berechnet, auch wenn der Reiter gerade nicht angezeigt wird.
    if (gr > 50 && gw > 10) befundTexte['bmi'] = (gw / Math.pow(gr / 100, 2)).toFixed(1).replace('.', ',');
    else delete befundTexte['bmi'];
    const feld = document.getElementById('befund-text-bmi');
    if (feld) feld.value = befundTexte['bmi'] || '';
    leiteErnaehrungszustandAb();
}

// Leitet den Ernährungszustand aus dem BMI ab – aber NUR, solange er nicht von Hand
// gesetzt wurde. Eine eigene Eingabe hat immer Vorrang und bleibt erhalten.
function leiteErnaehrungszustandAb() {
    if (befundTexte['ernaehrungszustand_manuell'] === '1') return;
    const bmi = parseFloat((befundTexte['bmi'] || '').replace(',', '.'));
    if (!(bmi > 0)) { delete befundWerte['ernaehrungszustand']; return; }
    // Skala: 0 Normalgewicht, 1 Untergewicht, 2 Übergewicht, 3 Adipositas
    const stufe = bmi < 18.5 ? 1 : bmi < 25 ? 0 : bmi < 30 ? 2 : 3;
    befundWerte['ernaehrungszustand'] = stufe;
    const feld = document.getElementById('befund-sel-ernaehrungszustand');
    if (feld) feld.value = String(stufe);
    const hinweis = document.getElementById('befund-ez-hinweis');
    if (hinweis) hinweis.innerText = 'aus dem BMI abgeleitet – jederzeit änderbar';
}

// ---------------------------------------------------------------- Darstellung
function renderBefund() {
    const ziel = document.getElementById('tab-befund');
    if (!ziel) return;
    ziel.innerHTML = BEFUND_GRUPPEN.map(g => `
        <div class="card">
            <div class="card-header"><div class="dot"></div>${escapeHtml(g.titel)}</div>
            <div style="padding:16px 20px">
                ${g.hinweis ? `<p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-bottom:14px">${escapeHtml(g.hinweis)}</p>` : ''}
                ${g.eintraege.map(e => befundZeile(g, e)).join('')}
                <div id="befund-extra-${g.id}">${(befundExtra[g.id] || []).map((x, i) => befundExtraZeile(g.id, i, x)).join('')}</div>
                <button class="btn btn-secondary" style="margin-top:10px" onclick="befundZeileHinzu('${g.id}')">+ Weiterer Eintrag</button>
            </div>
        </div>`).join('')
        + `<div class="card" style="border:1px solid rgba(37,99,235,0.2)">
            <div class="card-header"><div class="dot" style="background:var(--accent)"></div>Bewertung aus dem Befund ableiten</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Prüft die erhobenen Funktionsbefunde und schlägt vor, wo sie eine Einschränkung im NBA
                    stützen. Einträge, die unmittelbar einem Kriterium entsprechen, sind bereits übernommen.
                </p>
                <div id="befund-hinweis" style="font-size:12px;color:var(--text-muted);margin-bottom:12px"></div>
                <button class="btn btn-primary" onclick="zeigeBefundVorschlaege()">🔎 Vorschläge aus dem Befund</button>
            </div>
        </div>`;
    berechneBmi();
    aktualisiereBefundHinweis();
}

function befundZeile(gruppe, e) {
    const feldReihe = (seite) => {
        const sch = befundSchluessel(e, seite);
        const aktuell = befundWert(e, seite);
        if (e.frei) {
            return `<input type="${e.zahl ? 'number' : 'text'}" class="field-input" id="befund-text-${e.id}"
                        value="${escapeHtml(befundTexte[e.id] || '')}" placeholder="${escapeHtml(e.platzhalter || '')}"
                        ${e.berechnet ? 'readonly style="background:var(--bg-card2)"' : ''}
                        oninput="setzeBefundText('${e.id}',null,this.value)">`;
        }
        const kennung = (e.id === 'ernaehrungszustand') ? ' id="befund-sel-ernaehrungszustand"' : '';
        return `<select class="field-input"${kennung} onchange="setzeBefund('${gruppe.id}','${e.id}',${seite ? `'${seite}'` : 'null'},this.value)">
                <option value="">– keine Angabe –</option>
                ${e.skala.map((s, i) => `<option value="${i}" ${aktuell === i ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
            </select>`
            + (e.id === 'ernaehrungszustand'
                ? `<div style="display:flex;align-items:center;gap:10px;margin-top:5px">
                     <span id="befund-ez-hinweis" style="font-size:11px;color:var(--text-muted)">${
                        befundTexte['ernaehrungszustand_manuell'] === '1'
                            ? 'von Hand gesetzt – die BMI-Ableitung wird nicht mehr angewendet'
                            : (befundTexte['bmi'] ? 'aus dem BMI abgeleitet – jederzeit änderbar'
                                                  : 'wird aus dem BMI abgeleitet, sobald Größe und Gewicht erfasst sind')}</span>
                     <button type="button" class="btn btn-ghost" style="padding:3px 9px;font-size:10px"
                             onclick="ernaehrungszustandAutomatisch()">aus BMI ableiten</button>
                   </div>` : '');
    };
    const zusatz = e.zusatz
        ? `<input type="text" class="field-input" style="margin-top:6px" placeholder="${escapeHtml(e.zusatz)}"
              value="${escapeHtml(befundTexte[e.id + '_zusatz'] || '')}"
              oninput="setzeBefundText('${e.id}','_zusatz',this.value)">` : '';
    // Zweites Auswahlfeld, zum Beispiel beim Tremor das Auftreten
    const zusatzWahl = e.zusatzAuswahl
        ? `<div style="margin-top:6px"><span class="bz-seite">${escapeHtml(e.zusatzAuswahl.titel)}</span>
             <select class="field-input" onchange="setzeBefundZusatz('${e.id}',this.value)">
               <option value="">– keine Angabe –</option>
               ${e.zusatzAuswahl.skala.map((s, i) => `<option value="${i}" ${befundWerte[e.id + '_zw'] === i ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
             </select></div>` : '';
    const kennung = e.nba ? '<span class="befund-nba" title="Wird unmittelbar in die eigene Einschätzung übernommen">NBA</span>' : '';

    if (e.seiten) {
        return `<div class="befund-zeile">
            <div class="bz-titel">${escapeHtml(e.titel)} ${kennung}</div>
            <div class="bz-seiten">
                <div><span class="bz-seite">rechts</span>${feldReihe('rechts')}</div>
                <div><span class="bz-seite">links</span>${feldReihe('links')}</div>
            </div>
            ${zusatzWahl}${zusatz}
        </div>`;
    }
    return `<div class="befund-zeile">
        <div class="bz-titel">${escapeHtml(e.titel)} ${kennung}</div>
        ${feldReihe(null)}
        ${zusatz}
    </div>`;
}

function befundExtraZeile(gruppenId, i, x) {
    return `<div class="befund-zeile">
        <div class="bz-seiten">
            <input type="text" class="field-input" placeholder="Bezeichnung" value="${escapeHtml(x.titel || '')}"
                   oninput="befundExtraSetzen('${gruppenId}',${i},'titel',this.value)">
            <input type="text" class="field-input" placeholder="Befund" value="${escapeHtml(x.text || '')}"
                   oninput="befundExtraSetzen('${gruppenId}',${i},'text',this.value)">
        </div>
    </div>`;
}

function befundZeileHinzu(gruppenId) {
    if (!befundExtra[gruppenId]) befundExtra[gruppenId] = [];
    befundExtra[gruppenId].push({ titel: '', text: '' });
    const box = document.getElementById('befund-extra-' + gruppenId);
    if (box) {
        const i = befundExtra[gruppenId].length - 1;
        box.insertAdjacentHTML('beforeend', befundExtraZeile(gruppenId, i, befundExtra[gruppenId][i]));
    }
}

function befundExtraSetzen(gruppenId, i, feld, wert) {
    if (!befundExtra[gruppenId] || !befundExtra[gruppenId][i]) return;
    befundExtra[gruppenId][i][feld] = wert;
}

function aktualisiereBefundHinweis() {
    const el = document.getElementById('befund-hinweis');
    if (!el) return;
    const v = befundVorschlaege();
    el.innerText = v.length
        ? v.length + ' Kriterium/Kriterien könnten aufgrund des Befunds höher zu bewerten sein.'
        : 'Derzeit ergibt sich aus dem Befund kein Vorschlag.';
}

// ------------------------------------------------- Vorschläge aus dem Befund
// Liefert nur Kriterien, die aktuell NICHT bereits abweichend bewertet sind.
function befundVorschlaege() {
    const treffer = {};
    BEFUND_GRUPPEN.forEach(g => g.eintraege.forEach(e => {
        if (!e.stuetzt) return;
        const seiten = e.seiten ? ['rechts', 'links'] : [null];
        seiten.forEach(seite => {
            const w = befundWert(e, seite);
            if (w === null) return;
            e.stuetzt.forEach(s => {
                if (w < s.ab) return;
                const item = ITEMS.find(i => i.nr === s.nr);
                if (!item || !item.opts) return;
                const vO = stateOrig.values[item.id];
                const vE = stateEigene.values[item.id];
                if (typeof vO !== 'number' || typeof vE !== 'number') return;
                if (vE !== vO) return;                       // weicht bereits ab
                if (vE >= item.opts.length - 1) return;      // schon höchste Stufe
                const bisher = treffer[s.nr];
                const beleg = e.titel + (seite ? ' ' + seite : '') + ': „' + e.skala[w] + '"';
                if (bisher) { bisher.belege.push(beleg); }
                else treffer[s.nr] = { item, belege: [beleg], stufe: Math.min(vE + 1, item.opts.length - 1) };
            });
        });
    }));
    return Object.keys(treffer).map(nr => treffer[nr]);
}

function zeigeBefundVorschlaege() {
    const v = befundVorschlaege();
    vorschlagListe = v.map(x => ({
        item: x.item, stufe: x.stufe, alt: stateOrig.values[x.item.id],
        begruendung: 'Aus dem erhobenen Befund ableitbar.',
        fundstelle: x.belege.join(' · ')
    }));
    renderVorschlaege();   // gleiche Auswahlliste wie beim Widerspruch
}

// Kurzfassung des erhobenen Befunds für die KI (nur ausgefüllte Einträge)
function befundZusammenfassung() {
    const zeilen = [];
    BEFUND_GRUPPEN.forEach(g => {
        const teil = [];
        g.eintraege.forEach(e => {
            if (e.frei) { const t = befundTexte[e.id]; if (t && t.trim()) teil.push(e.titel + ': ' + t.trim()); return; }
            (e.seiten ? ['rechts', 'links'] : [null]).forEach(s => {
                const w = befundWert(e, s);
                if (w === null) return;
                if (e.nba && w === 0) return;   // unauffällige Kriterien tragen nichts bei
                const zusatz = [befundZusatzText(e), befundTexte[e.id + '_zusatz']].filter(Boolean).join(', ');
                teil.push(e.titel + (s ? ' ' + s : '') + ': ' + e.skala[w] + (zusatz ? ' (' + zusatz + ')' : ''));
            });
        });
        (befundExtra[g.id] || []).forEach(x => {
            if ((x.titel || '').trim() || (x.text || '').trim()) teil.push((x.titel || '') + ': ' + (x.text || ''));
        });
        if (teil.length) zeilen.push(g.titel + ' – ' + teil.join('; '));
    });
    return zeilen.join('\n');
}

// ------------------------------------------------------- Speichern und Laden
function befundSichern() {
    return { werte: befundWerte, texte: befundTexte, extra: befundExtra };
}
function befundLaden(d) {
    befundWerte = (d && d.werte) || {};
    befundTexte = (d && d.texte) || {};
    befundExtra = (d && d.extra) || {};
}
