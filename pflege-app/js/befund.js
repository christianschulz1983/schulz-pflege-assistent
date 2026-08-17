// Befunderhebung für Erstantrag und Höherstufungsantrag.
// Einträge, die einem NBA-Kriterium entsprechen, schreiben unmittelbar in die eigene
// Einschätzung – dieselbe Angabe wird also nur einmal erfasst. Funktionsbefunde
// (Schürzengriff und Ähnliches) schlagen lediglich Bewertungen vor.

let befundWerte = {};    // Schlüssel: eintragId oder eintragId|seite   ->  Stufenindex
let befundTexte = {};    // Schlüssel wie oben, jeweils Ergänzungstext
let befundExtra = {};    // Zusätzliche Einträge je Gruppe: { gruppenId: [{titel, text}] }

// Modul 3 wird nicht als vollständige Liste erfasst, sondern nur die tatsächlich
// bestehenden Problemlagen: [{ nr, haeufigkeit, wertung, bemerkung }]
let psycheListe = [];

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
            setzeBewertung('own', item.id, idx, 'befund');   // gemeinsame Angabe, keine Doppelerfassung
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

// ------------------------------------------------- Modul 3: psychische Problemlagen
// Erfasst werden nur bestehende Problemlagen. Die Bewertung wird ausschließlich dann in
// die eigene Einschätzung übernommen, wenn eine Häufigkeit gewählt ist UND umfassende
// personelle Intervention notwendig ist – nach der BRi zählt allein die Häufigkeit von
// Ereignissen mit personellem Unterstützungsbedarf.

function psycheGruppe() {
    return BEFUND_GRUPPEN.find(g => g.sonder === 'psyche') || null;
}

function psycheTitel(nr) {
    const item = ITEMS.find(i => i.nr === nr);
    return nr + ' ' + (item ? item.title : '');
}

// Noch nicht erfasste Kriterien – nur diese stehen in der Auswahl zur Verfügung
function psycheOffen() {
    const g = psycheGruppe();
    if (!g) return [];
    const belegt = psycheListe.map(z => z.nr);
    return g.kriterien.filter(nr => belegt.indexOf(nr) === -1);
}

function psycheHinzu(nr) {
    if (!nr) return;
    if (psycheListe.some(z => z.nr === nr)) return;
    psycheListe.push({ nr: nr, haeufigkeit: null, wertung: null, bemerkung: '' });
    psycheZeichnen();
}

function psycheEntfernen(i) {
    const z = psycheListe[i];
    if (!z) return;
    psycheListe.splice(i, 1);
    // Die Bewertung nicht einfach löschen: liegt ein Vorgutachten vor, gilt wieder dessen
    // Wert, sonst null (nicht bewertet).
    const item = ITEMS.find(x => x.nr === z.nr);
    if (item) {
        const vorher = stateOrig.values[item.id];
        if (typeof vorher === 'number') setzeBewertung('own', item.id, vorher, 'befund');
        else { delete stateEigene.values[item.id]; }
        psycheNeuBerechnen();
    }
    psycheZeichnen();
}

function psycheSetzen(i, feld, wert) {
    const z = psycheListe[i];
    if (!z) return;
    if (feld === 'bemerkung') { z.bemerkung = wert; return; }
    z[feld] = (wert === '') ? null : parseInt(wert, 10);
    psycheUebernehmen(i);
    psycheZeichnen();
}

// Schreibt eine Zeile in die eigene Einschätzung
function psycheUebernehmen(i) {
    const z = psycheListe[i];
    if (!z) return;
    const item = ITEMS.find(x => x.nr === z.nr);
    if (!item) return;
    if (z.wertung === PSYCHE_WERTUNG_ZAEHLT) {
        if (typeof z.haeufigkeit === 'number') setzeBewertung('own', item.id, z.haeufigkeit, 'befund');
    } else if (z.wertung === null) {
        return;                              // noch keine Aussage getroffen
    } else {
        setzeBewertung('own', item.id, 0, 'befund');   // kompensiert oder nach BRi nicht zu werten
    }
    psycheNeuBerechnen();
}

function psycheNeuBerechnen() {
    try { fillTable('own'); calculate('own'); } catch (e) {}
}

// Wird eine Zeile gewertet, obwohl noch etwas fehlt? Text für den Hinweis unter der Zeile.
function psycheZeilenHinweis(z) {
    if (z.wertung === PSYCHE_WERTUNG_ZAEHLT) {
        if (typeof z.haeufigkeit !== 'number') return 'Häufigkeit fehlt – noch nicht gewertet.';
        const item = ITEMS.find(x => x.nr === z.nr);
        const p = (item && item.val) ? item.val[z.haeufigkeit] : null;
        return 'In die Modulbewertung übernommen' + (p === null ? '' : ' (' + p + ' Punkte)') + '.';
    }
    if (z.wertung === null) return 'Bewertung noch offen.';
    return 'Mit 0 Punkten übernommen – kein personeller Unterstützungsbedarf.';
}

function psycheZeile(z, i) {
    const sel = (feld, skala, wert) => `
        <select class="field-input" onchange="psycheSetzen(${i},'${feld}',this.value)">
            <option value="">– keine Angabe –</option>
            ${skala.map((s, k) => `<option value="${k}" ${wert === k ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
        </select>`;
    const gewertet = (z.wertung === PSYCHE_WERTUNG_ZAEHLT && typeof z.haeufigkeit === 'number');
    return `<div class="psyche-zeile">
        <div class="pz-kopf">
            <span class="pz-titel">${escapeHtml(psycheTitel(z.nr))}</span>
            <button type="button" class="btn btn-ghost pz-weg" onclick="psycheEntfernen(${i})" title="Problemlage entfernen">✕</button>
        </div>
        <div class="pz-raster">
            <div><span class="bz-seite">Häufigkeit</span>${sel('haeufigkeit', PSYCHE_HAEUFIGKEIT, z.haeufigkeit)}</div>
            <div><span class="bz-seite">Bewertung</span>${sel('wertung', PSYCHE_WERTUNG, z.wertung)}</div>
            <div><span class="bz-seite">Bemerkung</span>
                <input type="text" class="field-input" value="${escapeHtml(z.bemerkung || '')}"
                       placeholder="Ausprägung, Auslöser, Diagnose"
                       oninput="psycheSetzen(${i},'bemerkung',this.value)"></div>
        </div>
        <div class="pz-hinweis ${gewertet ? 'ist-gewertet' : ''}">${escapeHtml(psycheZeilenHinweis(z))}</div>
    </div>`;
}

function psycheBlockHtml() {
    const offen = psycheOffen();
    return psycheListe.map((z, i) => psycheZeile(z, i)).join('')
        + (offen.length
            ? `<div class="psyche-wahl">
                 <span class="bz-seite">Problemlage hinzufügen</span>
                 <select class="field-input" onchange="psycheHinzu(this.value)">
                     <option value="">– auswählen –</option>
                     ${offen.map(nr => `<option value="${nr}">${escapeHtml(psycheTitel(nr))}</option>`).join('')}
                 </select>
               </div>`
            : `<p style="font-size:11px;color:var(--text-muted)">Alle Problemlagen des Moduls 3 sind erfasst.</p>`);
}

function psycheZeichnen() {
    const box = document.getElementById('befund-psyche');
    if (box) box.innerHTML = psycheBlockHtml();
    aktualisiereBefundHinweis();
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
                ${g.sonder === 'psyche' ? `<div id="befund-psyche">${psycheBlockHtml()}</div>` : ''}
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
        if (g.sonder === 'psyche') psycheZusammenfassung().forEach(t => teil.push(t));
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

// Die erfassten Problemlagen als Textzeilen (für die KI und für das Dokument)
function psycheZusammenfassung() {
    return psycheListe.filter(z => z.wertung !== null || typeof z.haeufigkeit === 'number').map(z => {
        const teile = [];
        if (typeof z.haeufigkeit === 'number') teile.push(PSYCHE_HAEUFIGKEIT[z.haeufigkeit]);
        if (z.wertung !== null) teile.push(PSYCHE_WERTUNG[z.wertung]);
        if ((z.bemerkung || '').trim()) teile.push(z.bemerkung.trim());
        return psycheTitel(z.nr) + ': ' + teile.join('; ');
    });
}

// ------------------------------------------------------- Speichern und Laden
function befundSichern() {
    return { werte: befundWerte, texte: befundTexte, extra: befundExtra, psyche: psycheListe };
}
function befundLaden(d) {
    befundWerte = (d && d.werte) || {};
    befundTexte = (d && d.texte) || {};
    befundExtra = (d && d.extra) || {};
    psycheListe = (d && Array.isArray(d.psyche)) ? d.psyche : [];
}
