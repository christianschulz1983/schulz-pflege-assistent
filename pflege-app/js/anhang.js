// Anlagen an die PDF anhängen – alle Vorgänge.
//
// Wunsch des Verfassers: Beim Erstellen der PDF per Häkchen auswählen, welche Arztberichte
// angehängt werden, sodass die PDF die Anhänge enthält.
//
// Weg: Die PDF entsteht wie bisher über die Druckfunktion des Browsers. Die ausgewählten
// Unterlagen werden mit pdf.js (liegt der App bei, läuft lokal wie online) Seite für Seite
// in Bilder umgewandelt und hinter die Stellungnahme gesetzt – je Seite mit der Kopfzeile
// „Anlage N – Seite x von y". EHRLICHE GRENZE: Die Anlagen erscheinen als Bild (wie
// gescannt); ihr Text lässt sich in der PDF nicht markieren. Anders geht es mit der
// Druckfunktion nicht, und ein Zusatzprogramm soll nicht nötig sein.
//
// Die Dateien liegen nur im Arbeitsspeicher. Nach „Fall laden" müssen sie erneut
// hinzugefügt werden – die Falldatei speichert bewusst keine Dateien.

// Arztberichte aus Erstantrag und Höherstufung (dort gibt es keine Anlagenliste)
let antragBerichtDateien = [];   // [{ id, name, datei }]

// A4 bei 150 dpi – gut lesbar, und die PDF bleibt per E-Mail versendbar
const ANHANG_BREITE_PX = 1240;
const ANHANG_JPEG_QUALITAET = 0.82;
const ANHANG_MAX_SEITEN = 60;     // je Unterlage – schützt vor versehentlich riesigen Dateien

function merkeAntragBericht(datei) {
    if (!datei) return;
    const doppelt = antragBerichtDateien.some(b => b.name === datei.name && b.datei.size === datei.size);
    if (!doppelt) antragBerichtDateien.push({ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                                              name: datei.name, datei: datei });
}

/* Was sich anhängen lässt. In Widerspruch und Anhörung die Anlagenliste (mit Nummer wie im
   Anlagenverzeichnis), in den Anträgen die hochgeladenen Arztberichte. datei = null heißt:
   Die Unterlage ist bekannt, die Datei liegt aber nicht mehr vor. */
function anhangKandidaten() {
    const modus = (typeof appModus !== 'undefined') ? appModus : 'widerspruch';
    if (modus === 'widerspruch' || modus === 'anhoerung') {
        return (typeof anlagen !== 'undefined' ? anlagen : []).map((a, i) => ({
            key: a.id || ('i' + i), titel: anlageText(a, i), nummer: i + 1,
            datei: (typeof belegDateien !== 'undefined' && a.id) ? (belegDateien[a.id] || null) : null
        }));
    }
    return antragBerichtDateien.map((b, i) => ({
        key: b.id, titel: 'Anlage ' + (i + 1) + ': ' + anlageBezeichnungAus(b.name), nummer: i + 1, datei: b.datei
    }));
}

// Auswahlfenster vor dem Drucken. Nichts ist vorausgewählt – Arztberichte verlassen die
// Praxis nur, wenn der Berater sie ausdrücklich anhakt.
function zeigeAnhangAuswahl(kandidaten) {
    const box = document.getElementById('vorschlag-body');
    vorschlagOverlayZweck('Anlagen an die PDF anhängen', 'druckeMitAnlagen()', '🖨 PDF erstellen');
    const fehlen = kandidaten.filter(k => !k.datei).length;
    box.innerHTML = '<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px">'
        + 'Welche Unterlagen sollen hinter der Stellungnahme in der PDF stehen? <b>Nichts ist vorausgewählt.</b> '
        + 'Ohne Häkchen entsteht die PDF wie bisher ohne Anlagen. Die Anlagen erscheinen als Bild, je Seite mit '
        + '„Anlage N – Seite x von y".</p>'
        + (kandidaten.some(k => k.datei)
            ? '<p style="margin-bottom:10px"><a href="#" onclick="document.querySelectorAll(\'#vorschlag-body input[data-anhang]:not(:disabled)\').forEach(c=>c.checked=true);return false;">Alle auswählen</a></p>' : '')
        + kandidaten.map(k => `
            <label class="vs-item" style="border-left-color:var(--accent2);${k.datei ? '' : 'opacity:.6'}">
                <input type="checkbox" data-anhang="${escapeHtml(k.key)}" ${k.datei ? '' : 'disabled'}>
                <div style="flex:1">
                    <div class="vs-grund">${escapeHtml(k.titel)}</div>
                    <div class="vs-fund">${k.datei ? escapeHtml(k.datei.name || '')
                        : 'Die Datei liegt nicht mehr vor (nach „Fall laden"). Bitte die Unterlage erneut hinzufügen.'}</div>
                </div>
            </label>`).join('')
        + (fehlen ? `<p style="font-size:11px;color:var(--text-muted);margin-top:10px">${fehlen} Unterlage(n) ohne Datei – `
            + 'die Falldatei speichert keine Dateien.</p>' : '');
    document.getElementById('vorschlag-overlay').classList.add('active');
}

// Knopf „PDF erstellen" im Auswahlfenster – läuft im Klick, damit das Druckfenster nicht
// vom Pop-up-Blocker abgefangen wird.
function druckeMitAnlagen() {
    const gewaehlt = Array.from(document.querySelectorAll('#vorschlag-body input[data-anhang]'))
        .filter(c => c.checked).map(c => c.getAttribute('data-anhang'));
    const auswahl = anhangKandidaten().filter(k => k.datei && gewaehlt.includes(k.key));
    closeVorschlaege();
    druckeStellungnahme(auswahl);
}

// Eine Unterlage -> Bilder ihrer Seiten (Daten-URLs, JPEG)
async function anhangSeitenBilder(datei) {
    const name = String(datei && datei.name || '');
    const typ = String(datei && datei.type || '');
    const leinwand = (w, h) => {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);   // JPEG kennt keine Transparenz
        return { c, ctx };
    };
    if (/pdf/i.test(typ) || /\.pdf$/i.test(name)) {
        if (typeof pdfjsLib === 'undefined') throw new Error('Die PDF-Anzeige (pdf.js) ist nicht geladen.');
        const pdf = await pdfjsLib.getDocument({ data: await datei.arrayBuffer() }).promise;
        const bilder = [];
        const anzahl = Math.min(pdf.numPages, ANHANG_MAX_SEITEN);
        for (let p = 1; p <= anzahl; p++) {
            const seite = await pdf.getPage(p);
            const v1 = seite.getViewport({ scale: 1 });
            // Querformat: die längere Seite auf die Breite begrenzen, sonst wird es riesig
            const vp = seite.getViewport({ scale: ANHANG_BREITE_PX / Math.max(v1.width, v1.height * 0.707) });
            const { c, ctx } = leinwand(vp.width, vp.height);
            await seite.render({ canvasContext: ctx, viewport: vp }).promise;
            bilder.push(c.toDataURL('image/jpeg', ANHANG_JPEG_QUALITAET));
        }
        return { bilder, gekuerzt: pdf.numPages > anzahl, seitenGesamt: pdf.numPages };
    }
    if (/^image\//i.test(typ) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) {
        const url = await new Promise((ok, fehler) => {
            const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fehler; r.readAsDataURL(datei);
        });
        const img = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fehler(new Error('Bild nicht lesbar')); i.src = url; });
        const f = Math.min(1, ANHANG_BREITE_PX / Math.max(1, img.naturalWidth));
        const { c, ctx } = leinwand(img.naturalWidth * f, img.naturalHeight * f);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return { bilder: [c.toDataURL('image/jpeg', ANHANG_JPEG_QUALITAET)], gekuerzt: false, seitenGesamt: 1 };
    }
    throw new Error('Dateityp nicht unterstützt (nur PDF und Bilder)');
}

const ANHANG_CSS = `
        .anh-seite{width:210mm;height:296mm;box-sizing:border-box;padding:8mm 10mm 10mm;
                   break-before:page;page-break-before:always;display:flex;flex-direction:column;background:#fff;}
        .anh-kopf{font-family:Calibri,Arial,Helvetica,sans-serif;font-size:9pt;color:#444;
                  border-bottom:1px solid #bbb;padding-bottom:2mm;margin-bottom:3mm;flex:0 0 auto;}
        .anh-bild{flex:1 1 auto;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;min-height:0;}
        .anh-bild img{max-width:100%;max-height:100%;object-fit:contain;}
`;

// HTML der Anhangsseiten: [{ titel, bilder, gekuerzt, seitenGesamt }]
function anhangHtml(anhaenge) {
    return (anhaenge || []).map(a => {
        const n = a.bilder.length;
        return a.bilder.map((b, k) => `<div class="anh-seite"><div class="anh-kopf">${escapeHtml(a.titel)} – Seite ${k + 1} von ${n}`
            + `${(a.gekuerzt && k === n - 1) ? ' (weitere ' + (a.seitenGesamt - n) + ' Seiten nicht angehängt)' : ''}</div>`
            + `<div class="anh-bild"><img src="${b}" alt=""></div></div>`).join('');
    }).join('');
}

// Die Unterlagen umwandeln; eine nicht lesbare Unterlage bricht die PDF nicht ab.
async function anhaengeVorbereiten(auswahl, fortschritt) {
    const fertig = [], fehler = [];
    for (let i = 0; i < auswahl.length; i++) {
        if (fortschritt) fortschritt(i, auswahl.length, auswahl[i].titel);
        try {
            const r = await anhangSeitenBilder(auswahl[i].datei);
            fertig.push({ titel: auswahl[i].titel, bilder: r.bilder, gekuerzt: r.gekuerzt, seitenGesamt: r.seitenGesamt });
        } catch (e) { fehler.push(auswahl[i].titel + ': ' + e.message); }
    }
    return { fertig, fehler };
}

/* FALLWECHSEL. Unterlagen gehören zu genau einer Person. Beim Einlesen eines neuen
   Gutachtens (neuer Fall) und beim Laden einer Falldatei werden die Dateien im
   Arbeitsspeicher geleert – sonst hätte die PDF der nächsten Person den Arztbericht der
   vorigen enthalten können. Beim neuen Fall auch die Anlagenliste und die gemerkte
   Widerspruchs-Stellungnahme (beim Laden liefert die Falldatei beides neu). */
function unterlagenZuruecksetzen(neuerFall) {
    antragBerichtDateien = [];
    if (typeof belegDateien !== 'undefined') Object.keys(belegDateien).forEach(k => delete belegDateien[k]);
    if (neuerFall) {
        if (typeof anlagenLaden === 'function') anlagenLaden([]);
        if (typeof widerspruchStellungnahme !== 'undefined') { widerspruchStellungnahme = ''; widerspruchKerne = {}; }
        if (typeof renderAnlagen === 'function') renderAnlagen();
    }
}
