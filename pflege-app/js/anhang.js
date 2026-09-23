// Stellungnahme und Arztberichte zu EINER PDF zusammenfügen – alle Vorgänge.
//
// Wunsch des Verfassers: Die Arztberichte sollen „wie die Stellungnahme als PDF" angehängt
// werden – als echte Seiten, nicht als Bild. Die PDF der Stellungnahme erzeugt aber die
// Druckfunktion des Browsers, und die gibt die fertige Datei nicht an die App zurück.
// Deshalb zwei Schritte:
//   1. „Drucken / PDF speichern" wie gewohnt.
//   2. „PDF mit Anlagen zusammenfügen": diese Datei wählen, Unterlagen abhaken – die App
//      fügt alles mit pdf-lib (liegt der App bei, MIT-Lizenz, läuft lokal wie online) zu
//      einer Datei zusammen. Die Seiten der Arztberichte bleiben ORIGINALSEITEN (volle
//      Qualität, Text markierbar); oben am Rand steht klein „Anlage N – Seite x von y".
//      Bilder (JPG, PNG) werden auf eine A4-Seite gesetzt.
//
// Die Dateien liegen nur im Arbeitsspeicher. Nach „Fall laden" müssen sie erneut
// hinzugefügt werden – die Falldatei speichert bewusst keine Dateien.

// Arztberichte aus Erstantrag und Höherstufung (dort gibt es keine Anlagenliste)
let antragBerichtDateien = [];   // [{ id, name, datei }]
let zusammenStellungnahme = null; // die gewählte, gespeicherte Stellungnahme (PDF)

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

// Das Fenster: gespeicherte Stellungnahme wählen, Unterlagen abhaken. Nichts ist
// vorausgewählt – Arztberichte verlassen die Praxis nur, wenn der Berater sie anhakt.
function zeigeZusammenfuegen() {
    const kandidaten = anhangKandidaten();
    zusammenStellungnahme = null;
    const box = document.getElementById('vorschlag-body');
    vorschlagOverlayZweck('PDF mit Anlagen zusammenfügen', 'fuegePdfZusammen()', '📎 Zusammenfügen und speichern');
    const fehlen = kandidaten.filter(k => !k.datei).length;
    box.innerHTML = `
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
            <b>Schritt 1:</b> Speichern Sie die Stellungnahme zuerst über „Drucken / PDF speichern" als PDF.
            Wählen Sie diese Datei hier aus.</p>
        <button class="btn btn-secondary" onclick="document.getElementById('zusammen-stellungnahme').click()">📄 Gespeicherte Stellungnahme wählen</button>
        <input type="file" id="zusammen-stellungnahme" accept=".pdf,application/pdf" style="display:none"
               onchange="zusammenStellungnahmeGewaehlt(event)">
        <span id="zusammen-datei" style="font-size:11px;color:var(--text-muted);margin-left:10px">noch keine Datei gewählt</span>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin:18px 0 10px">
            <b>Schritt 2:</b> Welche Unterlagen sollen dahinter stehen? <b>Nichts ist vorausgewählt.</b>
            Die Seiten bleiben Originalseiten; oben am Rand steht klein „Anlage N – Seite x von y".</p>
        ${kandidaten.length ? (kandidaten.some(k => k.datei)
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
          : '<div class="vs-leer">Es sind noch keine Unterlagen hochgeladen – in Widerspruch und Anhörung über die Karte '
            + '„Ärztliche Unterlagen und Anlagen", in den Anträgen über das Einlesen der Arztberichte.</div>'}
        ${fehlen ? `<p style="font-size:11px;color:var(--text-muted);margin-top:10px">${fehlen} Unterlage(n) ohne Datei – die Falldatei speichert keine Dateien.</p>` : ''}`;
    document.getElementById('vorschlag-overlay').classList.add('active');
}

function zusammenStellungnahmeGewaehlt(event) {
    const d = (event.target.files || [])[0];
    event.target.value = '';
    if (!d) return;
    if (!/pdf/i.test(d.type || '') && !/\.pdf$/i.test(d.name || '')) {
        showToast('Bitte die als PDF gespeicherte Stellungnahme wählen.', 'error');
        return;
    }
    zusammenStellungnahme = d;
    const el = document.getElementById('zusammen-datei');
    if (el) el.textContent = '✓ ' + d.name;
}

// Klick auf „Zusammenfügen und speichern"
async function fuegePdfZusammen() {
    if (!zusammenStellungnahme) { showToast('Bitte zuerst die gespeicherte Stellungnahme (PDF) wählen.', 'error'); return; }
    const gewaehlt = Array.from(document.querySelectorAll('#vorschlag-body input[data-anhang]'))
        .filter(c => c.checked).map(c => c.getAttribute('data-anhang'));
    const auswahl = anhangKandidaten().filter(k => k.datei && gewaehlt.includes(k.key));
    if (!auswahl.length) { showToast('Bitte mindestens eine Unterlage anhaken.', 'error'); return; }
    showOverlay('PDF wird zusammengefügt...', auswahl.length + ' Anlage(n)');
    let erg;
    try {
        erg = await pdfZusammenfuegen(await zusammenStellungnahme.arrayBuffer(), auswahl);
    } catch (e) {
        hideOverlay();
        showToast('Die Stellungnahme ließ sich nicht öffnen: ' + e.message, 'error');
        return;
    }
    hideOverlay();
    closeVorschlaege();
    const name = (document.getElementById('stam-betreffend')?.value || '').trim() || 'Stellungnahme';
    const blob = new Blob([erg.bytes], { type: 'application/pdf' });
    await speichereDatei(blob, 'Pflegefachliche Stellungnahme mit Anlagen - ' + name + '.pdf', 'pdf-mit-anlagen',
        'Die PDF enthält die Stellungnahme und ' + erg.angehaengt + ' Anlage(n).');
    if (erg.fehler.length) showToast('Nicht angehängt: ' + erg.fehler.join(' | '), 'error');
}

/* Der eigentliche Zusammenbau – ohne Oberfläche, damit der Selbsttest ihn prüfen kann.
   stellung: Bytes der Stellungnahme; auswahl: [{ titel, datei }].
   Rückgabe: { bytes, angehaengt, fehler, seiten }. Eine nicht lesbare Unterlage bricht nicht ab. */
async function pdfZusammenfuegen(stellung, auswahl) {
    if (typeof PDFLib === 'undefined') throw new Error('pdf-lib ist nicht geladen.');
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const ziel = await PDFDocument.load(stellung);          // wirft, wenn es keine PDF ist
    const schrift = await ziel.embedFont(StandardFonts.Helvetica);
    const fehler = [];
    let angehaengt = 0;
    const stempel = (seite, text) => {
        // Klein oben links am Rand – WinAnsi-Zeichen genügen (Umlaute, Gedankenstrich)
        const { height } = seite.getSize();
        const sicher = String(text).replace(/[^\x20-\x7E -ÿ–—„“”’]/g, '?');
        try { seite.drawText(sicher, { x: 18, y: height - 14, size: 7.5, font: schrift, color: rgb(0.3, 0.3, 0.3) }); } catch (e) {}
    };
    for (const a of auswahl) {
        const name = String(a.datei && a.datei.name || '');
        const typ = String(a.datei && a.datei.type || '');
        try {
            const bytes = await a.datei.arrayBuffer();
            if (/pdf/i.test(typ) || /\.pdf$/i.test(name)) {
                const quelle = await PDFDocument.load(bytes, { ignoreEncryption: true });
                const seiten = await ziel.copyPages(quelle, quelle.getPageIndices());
                seiten.forEach((s, k) => { ziel.addPage(s); stempel(s, a.titel + ' – Seite ' + (k + 1) + ' von ' + seiten.length); });
            } else if (/png/i.test(typ) || /\.png$/i.test(name) || /jpe?g/i.test(typ) || /\.jpe?g$/i.test(name)) {
                const bild = (/png/i.test(typ) || /\.png$/i.test(name)) ? await ziel.embedPng(bytes) : await ziel.embedJpg(bytes);
                const s = ziel.addPage([595.28, 841.89]);       // A4
                const rand = 28, oben = 24;
                const f = Math.min((595.28 - 2 * rand) / bild.width, (841.89 - rand - oben - 8) / bild.height, 1.5);
                const w = bild.width * f, h = bild.height * f;
                s.drawImage(bild, { x: (595.28 - w) / 2, y: 841.89 - oben - 8 - h, width: w, height: h });
                stempel(s, a.titel + ' – Seite 1 von 1');
            } else {
                throw new Error('Dateityp nicht unterstützt (nur PDF, JPG und PNG)');
            }
            angehaengt++;
        } catch (e) {
            fehler.push((a.titel || name) + ': ' + (/encrypt/i.test(e.message) ? 'die PDF ist verschlüsselt' : e.message));
        }
    }
    return { bytes: await ziel.save(), angehaengt, fehler, seiten: ziel.getPageCount() };
}

/* FALLWECHSEL. Unterlagen gehören zu genau einer Person. Beim Einlesen eines neuen
   Gutachtens (neuer Fall) und beim Laden einer Falldatei werden die Dateien im
   Arbeitsspeicher geleert – sonst hätte die PDF der nächsten Person den Arztbericht der
   vorigen enthalten können. Beim neuen Fall auch die Anlagenliste und die gemerkte
   Widerspruchs-Stellungnahme (beim Laden liefert die Falldatei beides neu). */
function unterlagenZuruecksetzen(neuerFall) {
    antragBerichtDateien = [];
    zusammenStellungnahme = null;
    if (typeof belegDateien !== 'undefined') Object.keys(belegDateien).forEach(k => delete belegDateien[k]);
    if (neuerFall) {
        if (typeof anlagenLaden === 'function') anlagenLaden([]);
        if (typeof verfahrenLaden === 'function') verfahrenLaden({});
        if (typeof widerspruchStellungnahme !== 'undefined') { widerspruchStellungnahme = ''; widerspruchKerne = {}; }
        if (typeof renderAnlagen === 'function') renderAnlagen();
    }
}
