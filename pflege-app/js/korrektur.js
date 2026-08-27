// Erfasste Daten nachträglich korrigieren.
//
// Öffnet dieselbe Prüfansicht wie nach dem Einlesen – links die hochgeladenen Unterlagen
// (Bescheid, Gutachten, Arztberichte), rechts die Werte, die tatsächlich in der App stehen.
// Anders als beim Einlesen wird dabei NICHTS zurückgesetzt: Notizen, Befund, Erfassung und
// die bereits geschriebene Stellungnahme bleiben erhalten.
//
// Wichtig für die Bewertungen: Korrigiert wird immer das Vorgutachten. Die eigene
// Einschätzung zieht nur dort mit, wo sie bisher unverändert dem Vorgutachten entsprach –
// eine bewusst abweichende Bewertung des Beraters wird niemals überschrieben.

let importDokumente = [];        // [{ name, file, mimeType }]
let korrekturModus = false;
let specialGeaendert = false;    // Ankreuzfeld „Besondere Bedarfskonstellation" angefasst?
let letzteProvided = null;       // Kriterien, die beim Einlesen erkannt wurden
let stellungnahmeVeraltet = false;

function merkeImportDokument(file, mimeType) {
    if (!file) return;
    const name = file.name || 'Dokument';
    if (importDokumente.some(d => d.name === name && d.file.size === file.size)) return;
    importDokumente.push({ name: name, file: file, mimeType: mimeType || file.type || '' });
}

// Baut die Prüfstruktur aus dem AKTUELLEN Stand der App – das ist es, was übernommen wurde.
function reviewAusAktuellemStand() {
    const g = id => (document.getElementById(id)?.value || '');
    const diagnosen = [];
    for (let i = 1; i <= 60; i++) {
        const a = document.getElementById('diag-icd-' + i), b = document.getElementById('diag-txt-' + i);
        if (!a && !b) break;
        diagnosen.push({ icd: a ? a.value : '', text: b ? b.value : '' });
    }
    const valuesMap = {};
    ITEMS.forEach(i => {
        const v = stateOrig.values[i.id];
        if (i.m === 5 && i.group !== 'D') {
            valuesMap[i.id] = (v && typeof v === 'object') ? { count: v.count, period: v.period } : { count: 0, period: 'W' };
        } else {
            valuesMap[i.id] = (typeof v === 'number') ? v : 0;
        }
    });
    // „erkannt/nicht erkannt" aus dem Einlesen beibehalten – gerade die nicht erkannten
    // Kriterien sind die, die hier am ehesten zu korrigieren sind.
    const provided = letzteProvided || new Set(ITEMS.map(i => i.id));
    return {
        stam: {
            betreffend: g('stam-betreffend'), geboren: g('stam-geboren'), kasse: g('stam-kasse'),
            versnr: g('stam-versnr'), bescheid: g('stam-bescheid'), antrag: g('stam-antrag'),
            organisation: g('stam-organisation'), begutachtung: g('stam-begutachtung'),
            art: normalizeArt(g('stam-art')), pg: g('stam-pg-manual'), pts: g('stam-pts-manual')
        },
        diagnoses: diagnosen,
        anamnese: g('stam-anamnese'),
        befund: g('stam-befund'),
        special: stateOrig.special || 0,
        extracted: stateOrig.extracted ? {
            raws: stateOrig.extracted.raws.slice(), weights: stateOrig.extracted.weights.slice(),
            total: stateOrig.extracted.total, pg: stateOrig.extracted.pg
        } : null,
        valuesMap: valuesMap, provided: provided
    };
}

// Linke Seite: hochgeladene Unterlage anzeigen; bei mehreren eine Leiste zum Umschalten.
function zeigeKorrekturDokument(index) {
    const links = document.getElementById('review-pdf');
    if (!links) return;
    links.innerHTML = '';
    if (!importDokumente.length) {
        links.innerHTML = '<div class="review-pdf-bar"><span>Keine Unterlage vorhanden</span></div>'
            + '<div class="review-pdf-content" style="padding:24px">'
            + '<p style="font-size:12px;line-height:1.6;color:var(--text-secondary)">'
            + 'In dieser Sitzung wurde keine Datei eingelesen – etwa weil der Fall aus einer '
            + 'gespeicherten Datei geladen wurde. Die Werte rechts lassen sich trotzdem korrigieren. '
            + 'Soll die Unterlage danebenliegen, lesen Sie sie erneut ein.</p></div>';
        return;
    }
    const i = Math.max(0, Math.min(index || 0, importDokumente.length - 1));
    const dok = importDokumente[i];
    const url = URL.createObjectURL(dok.file);
    if (reviewBlobUrl) { try { URL.revokeObjectURL(reviewBlobUrl); } catch (e) {} }
    reviewBlobUrl = url;

    const leiste = document.createElement('div');
    leiste.className = 'review-pdf-bar';
    const auswahl = importDokumente.length > 1
        ? importDokumente.map((d, k) => `<button type="button" class="dok-tab ${k === i ? 'aktiv' : ''}"
              onclick="zeigeKorrekturDokument(${k})">${escapeHtml(d.name)}</button>`).join('')
        : `<span>${escapeHtml(dok.name)}</span>`;
    leiste.innerHTML = `<div class="dok-leiste">${auswahl}</div>`
        + `<a href="${url}" target="_blank" rel="noopener">In neuem Tab öffnen ↗</a>`;
    links.appendChild(leiste);

    const inhalt = document.createElement('div');
    inhalt.className = 'review-pdf-content';
    links.appendChild(inhalt);
    if (dok.mimeType && dok.mimeType.startsWith('image/')) {
        inhalt.innerHTML = `<img src="${url}" alt="${escapeHtml(dok.name)}" style="max-width:100%;display:block;margin:0 auto;">`;
    } else {
        renderPdfPreview(dok.file, inhalt);
    }
}

function oeffneKorrektur() {
    korrekturModus = true;
    reviewGeaendert = new Set();
    specialGeaendert = false;
    reviewData = reviewAusAktuellemStand();
    zeigeKorrekturDokument(0);
    document.getElementById('review-form').innerHTML = buildReviewForm(reviewData);
    rvPruefePlausibel();
    const titel = document.getElementById('review-titel');
    if (titel) titel.innerText = 'Erfasste Daten korrigieren';
    const abbrechen = document.getElementById('review-abbrechen');
    if (abbrechen) abbrechen.innerText = 'Abbrechen';
    const uebernehmen = document.getElementById('review-uebernehmen');
    if (uebernehmen) {
        uebernehmen.innerText = '✓ Korrekturen übernehmen';
        uebernehmen.setAttribute('onclick', 'uebernehmeKorrektur()');
    }
    const hinweis = document.getElementById('review-hinweis');
    if (hinweis) {
        hinweis.style.display = 'block';
        hinweis.innerHTML = 'Korrigiert wird das <b>Vorgutachten</b>. Ihre eigene Einschätzung zieht nur dort '
            + 'mit, wo sie bisher unverändert dem Vorgutachten entsprach – eine von Ihnen bewusst geänderte '
            + 'Bewertung bleibt stehen. Notizen, Befund und die geschriebene Stellungnahme bleiben erhalten.';
    }
    document.getElementById('review-overlay').classList.add('active');
}

// Setzt Überschrift und Schaltflächen wieder auf das Einlesen zurück.
function setzeReviewKopfZurueck() {
    korrekturModus = false;
    const titel = document.getElementById('review-titel');
    if (titel) titel.innerText = 'Gutachten prüfen & übernehmen';
    const abbrechen = document.getElementById('review-abbrechen');
    if (abbrechen) abbrechen.innerText = 'Verwerfen';
    const uebernehmen = document.getElementById('review-uebernehmen');
    if (uebernehmen) {
        uebernehmen.innerText = '✓ Werte übernehmen';
        uebernehmen.setAttribute('onclick', 'applyReviewedImport()');
    }
    const hinweis = document.getElementById('review-hinweis');
    if (hinweis) hinweis.style.display = 'none';
}

function uebernehmeKorrektur() {
    const rev = reviewData;
    if (!rev) { closeReview(); return; }
    const setzeFeld = (id, wert) => {
        const el = document.getElementById(id);
        if (el && wert !== undefined && wert !== null) el.value = wert;
    };
    // Keine Felder leeren – nur die geprüften Angaben überschreiben.
    setzeFeld('stam-betreffend', rev.stam.betreffend);
    setzeFeld('stam-geboren', rev.stam.geboren);
    setzeFeld('stam-kasse', rev.stam.kasse);
    setzeFeld('stam-versnr', rev.stam.versnr);
    setzeFeld('stam-bescheid', rev.stam.bescheid);
    setzeFeld('stam-antrag', rev.stam.antrag);
    setzeFeld('stam-organisation', rev.stam.organisation);
    setzeFeld('stam-begutachtung', rev.stam.begutachtung);
    setzeFeld('stam-art', normalizeArt(rev.stam.art));
    setzeFeld('stam-pg-manual', rev.stam.pg);
    setzeFeld('stam-pts-manual', rev.stam.pts);
    setzeFeld('stam-anamnese', rev.anamnese);
    setzeFeld('stam-befund', rev.befund);
    ensureDiagRows((rev.diagnoses || []).length);
    (rev.diagnoses || []).forEach((d, i) => {
        setzeFeld('diag-icd-' + (i + 1), d.icd);
        setzeFeld('diag-txt-' + (i + 1), d.text);
    });

    const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    let korrigiert = 0, mitgezogen = 0, behalten = 0;
    ITEMS.forEach(i => {
        // NUR angefasste Kriterien. Sonst würde die App in unbewertete Kriterien
        // stillschweigend eine Null schreiben, die niemand eingegeben hat.
        if (!i.m || !reviewGeaendert.has(i.id)) return;
        const neu = rev.valuesMap[i.id];
        const altVorg = stateOrig.values[i.id];
        if (gleich(altVorg, neu)) return;
        const eigeneWarUnveraendert = gleich(stateEigene.values[i.id], altVorg);
        setzeBewertung('orig', i.id, neu, 'import');
        korrigiert++;
        if (eigeneWarUnveraendert) { setzeBewertung('own', i.id, neu, 'import'); mitgezogen++; }
        else behalten++;
    });

    const neuSpecial = rev.special || 0;
    if (specialGeaendert && (stateOrig.special || 0) !== neuSpecial) {
        const eigeneWarGleich = (stateEigene.special || 0) === (stateOrig.special || 0);
        stateOrig.special = neuSpecial;
        if (eigeneWarGleich) stateEigene.special = neuSpecial;
        korrigiert++;
    }
    if (rev.extracted) {
        stateOrig.extracted = { raws: rev.extracted.raws.slice(), weights: rev.extracted.weights.slice(),
                                total: rev.extracted.total, pg: rev.extracted.pg };
    } else {
        delete stateOrig.extracted;
    }

    fillTable('orig'); fillTable('own'); calculate('orig'); calculate('own'); syncSpecialUI();
    // Steht bereits eine Stellungnahme, passt sie nicht mehr zu den Werten.
    const vorhanden = (document.getElementById('appeal-document')?.innerHTML || appealDraft || '').trim();
    if (korrigiert && vorhanden) stellungnahmeVeraltet = true;

    closeReview();
    switchTab(1);
    if (!korrigiert) {
        showToast('Keine Bewertung verändert. Stammdaten und Diagnosen wurden übernommen.', 'success');
        return;
    }
    let text = korrigiert + ' Wert(e) im Vorgutachten korrigiert';
    if (mitgezogen) text += ', ' + mitgezogen + ' davon auch in Ihrer Einschätzung';
    if (behalten) text += '; ' + behalten + ' Ihrer abweichenden Bewertung(en) unverändert gelassen';
    if (stellungnahmeVeraltet) text += '. Bitte die Stellungnahme neu erstellen.';
    showToast(text, 'success');
}

// Warnung über der geschriebenen Stellungnahme, solange sie nicht zu den Werten passt.
function veraltetHinweisHtml() {
    if (!stellungnahmeVeraltet) return '';
    return '<div class="hinweis-warnung"><b>Bewertungen wurden nach dem Erstellen korrigiert.</b> '
         + 'Die untenstehende Stellungnahme gibt noch den früheren Stand wieder. Erstellen Sie sie neu – '
         + 'Ihre eigenen Textänderungen bleiben dabei erhalten, es werden nur die betroffenen '
         + 'Begründungen ersetzt.</div>';
}
