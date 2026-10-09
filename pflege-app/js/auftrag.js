/* AUFTRAGSBOGEN S1 UND A1 EINLESEN (nur Erstantrag).

   Beim Erstantrag gibt es kein Gutachten, aus dem die Stammdaten kommen könnten – wohl
   aber den unterschriebenen Auftragsbogen. Blatt S1 trägt die Kundendaten (Name,
   Geburtsdatum, Anschrift, Telefon, E-Mail, Kasse, Versicherten-Nr., Kunden-Nr.),
   Blatt A1 den Auftrag selbst. Bisher wurden diese Angaben abgetippt.

   Gelesen wird im Browser mit pdf.js – ohne lokalen Server und ohne KI. Die Blätter sind
   gescannt und durch eine Schrifterkennung gelaufen; der Text ist daher stellenweise
   verrauscht. Deshalb gilt hier dieselbe Regel wie beim Gutachten: Die App trägt nichts
   von sich aus ein. Sie zeigt, was sie gefunden hat, und der Berater hakt an. */

let auftragFunde = null;     // { feld: wert } aus dem letzten Einlesen

const AUFTRAG_FELDER = [
    { id: 'stam-betreffend',   titel: 'Betreffend' },
    { id: 'stam-geboren',      titel: 'Geboren am',        typ: 'date' },
    { id: 'stam-kundennummer', titel: 'Kundennummer' },
    { id: 'stam-kasse',        titel: 'Kasse' },
    { id: 'stam-versnr',       titel: 'Versicherungs-Nr.' },
    { id: 'stam-anschrift',    titel: 'Anschrift' },
    { id: 'stam-telefon',      titel: 'Telefon' },
    { id: 'stam-email',        titel: 'E-Mail' }
];

function auftragWaehlen() {
    const el = document.getElementById('auftragFile');
    if (el) { el.value = ''; el.click(); }
}

/* Den Text des Bogens besorgen – ZUERST über den lokalen Server.

   Gemessen an einem echten Bogen: Die Blätter werden unterschrieben, eingescannt und in
   Goodnotes abgelegt. Aus dieser Textebene liest pdf.js im Browser GAR NICHTS (zwei
   Seiten, ein Zeichen), während der lokale Server mit PyMuPDF 4.500 Zeichen liefert –
   und bei reinen Bildseiten zusätzlich die Schrifterkennung mitbringt. pdf.js bleibt als
   Rückfall für Bögen, die am Rechner ausgefüllt wurden. */
async function auftragText(datei) {
    const base64 = await new Promise((fertig, schief) => {
        const leser = new FileReader();
        leser.onerror = () => schief(new Error('Datei nicht lesbar'));
        leser.onload = () => fertig(String(leser.result).split(',')[1]);
        leser.readAsDataURL(datei);
    });
    const lokal = await tryLocalExtract(base64, datei.type || 'application/pdf');
    const vomServer = (lokal && lokal.text) ? lokal.text : '';
    if (vomServer.replace(/\s/g, '').length > 40) return vomServer;
    const imBrowser = await auftragPdfText(datei);
    if (imBrowser.replace(/\s/g, '').length > 40) return imBrowser;
    throw new Error(lastServerReachable
        ? 'In dem Blatt steht kein lesbarer Text.'
        : 'In dem Blatt steht kein lesbarer Text. Der Bogen ist vermutlich ein reines Bild – '
          + 'dafür wird der lokale Server gebraucht, er bringt die Schrifterkennung mit.');
}

// Rückfall: Text im Browser lesen – dieselbe Bibliothek, die auch die Vorschau zeichnet.
async function auftragPdfText(datei) {
    try {
        const puffer = await datei.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: puffer }).promise;
        const seiten = [];
        for (let n = 1; n <= pdf.numPages; n++) {
            const seite = await pdf.getPage(n);
            const inhalt = await seite.getTextContent();
            seiten.push(inhalt.items.map(i => i.str).join(' '));
        }
        return seiten.join('\n');
    } catch (e) {
        return '';
    }
}

/* Die Felder des Bogens. Die Beschriftungen stehen im Formular fest; gesucht wird jeweils
   bis zur nächsten Beschriftung, damit aus „Straße/Nr.: Musterweg 3 PLZ/Ort: 12345 Musterstadt"
   nicht die halbe Zeile in der Straße landet. */
function auftragFelderLesen(text) {
    const t = String(text || '').replace(/\r/g, '');
    const eins = (muster) => { const m = t.match(muster); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
    const f = {};
    f.kundennummer = eins(/KUNDEN-?\s?NR\.?\s*:?\s*(\d{4,8})/i);
    // Vorname und Name stehen im ERSTEN Block (Pflegebedürftige(r)); die Blöcke der
    // Kontaktpersonen tragen dieselben Beschriftungen und sind meist leer.
    f.vorname = eins(/Vorname\s*:\s*([A-ZÄÖÜ][\wÄÖÜäöüß\-]+)/);
    f.nachname = eins(/\bName\s*:\s*([A-ZÄÖÜ][\wÄÖÜäöüß\-]+)/);
    f.strasse = eins(/Stra[ßs]e\s*\/?\s*Nr\.?\s*:\s*(.+?)\s+(?:PLZ|Telefon|E-?Mail|Geburtsdatum)/i);
    const ort = t.match(/PLZ\s*\/?\s*Ort\s*:\s*(\d{5})\s+([^\n]+?)(?:\s{2,}|\n|$)/i);
    f.plz = ort ? ort[1] : '';
    f.ort = ort ? ort[2].replace(/\s+/g, ' ').trim() : '';
    f.festnetz = eins(/Telefon\s*Festnetz\s*:\s*([+\d][\d\s\/()-]{4,})/i);
    f.mobil = eins(/Telefon\s*Mobil\s*:\s*([+\d][\d\s\/()-]{4,})/i);
    f.email = eins(/E-?Mail\s*:\s*([^\s@]+@[^\s@]+\.[A-Za-z]{2,})/i);
    f.geboren = eins(/Geburtsdatum\s*:\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
    f.kasse = eins(/Versicherung\s*:\s*(.+?)\s+Versicherten/i);
    f.versnr = eins(/Versicherten-?\s?Nr\.?\s*:\s*([A-Z]?\d[\dA-Z]{5,})/i);
    f.auftrag = eins(/Auftrag\s*:\s*([A-Z]{1,3}\s?\d)/);
    f.pflegeberater = eins(/Pflegeberater\(?in\)?\s*:\s*([^\n]{3,40})/i);
    return f;
}

// Aus den Fundstellen die Werte für die Felder der Oberfläche bauen.
function auftragZuFeldern(f) {
    const werte = {};
    const name = [f.vorname, f.nachname].filter(Boolean).join(' ');
    if (name) werte['stam-betreffend'] = name;
    if (f.geboren) {
        const [tt, mm, jjjj] = f.geboren.split('.');
        werte['stam-geboren'] = `${jjjj}-${mm.padStart(2, '0')}-${tt.padStart(2, '0')}`;
    }
    if (f.kundennummer) werte['stam-kundennummer'] = f.kundennummer;
    if (f.kasse) werte['stam-kasse'] = f.kasse;
    if (f.versnr) werte['stam-versnr'] = f.versnr;
    const anschrift = [f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (anschrift) werte['stam-anschrift'] = anschrift;
    const telefon = [f.festnetz, f.mobil].filter(Boolean).join(' / ');
    if (telefon) werte['stam-telefon'] = telefon;
    if (f.email) werte['stam-email'] = f.email;
    return werte;
}

async function leseAuftrag(event) {
    const datei = event.target.files && event.target.files[0];
    if (!datei) return;
    showOverlay('Auftragsbogen wird gelesen...', datei.name);
    let text = '';
    try {
        text = await auftragText(datei);
    } catch (e) {
        hideOverlay();
        showToast('Die Datei ließ sich nicht lesen: ' + e.message, 'error');
        return;
    }
    hideOverlay();
    const roh = auftragFelderLesen(text);
    auftragFunde = auftragZuFeldern(roh);
    zeigeAuftragPruefung(roh);
}

/* Prüfansicht: jedes gefundene Feld mit Haken. Nicht gefundene Felder werden genannt –
   sonst bliebe unklar, ob die App nichts gefunden hat oder nichts da war. */
function zeigeAuftragPruefung(roh) {
    const box = document.getElementById('vorschlag-body');
    if (!box) return;
    vorschlagOverlayZweck('Kundendaten aus dem Auftragsbogen', 'auftragUebernehmen()', '✓ Angehaktes übernehmen');
    const gefunden = AUFTRAG_FELDER.filter(f => auftragFunde[f.id]);
    const fehlend = AUFTRAG_FELDER.filter(f => !auftragFunde[f.id]);
    if (!gefunden.length) {
        box.innerHTML = `<div class="hinweis-warnung"><b>Nichts gefunden.</b> In dem Blatt ließ sich
            keine der erwarteten Angaben lesen. Häufigster Grund: Der Bogen wurde als Bild
            gescannt und ist nicht durch eine Schrifterkennung gelaufen.</div>`;
        document.getElementById('vorschlag-overlay').classList.add('active');
        return;
    }
    const zeile = (f) => {
        const vorhanden = (document.getElementById(f.id)?.value || '').trim();
        const wert = auftragFunde[f.id];
        const anzeige = f.typ === 'date' ? formatDE(wert) : wert;
        return `<label style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border)">
            <input type="checkbox" checked data-auftrag="${escapeHtml(f.id)}" style="margin-top:3px">
            <span style="flex:1">
                <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${escapeHtml(f.titel)}</span><br>
                <b style="font-size:13px">${escapeHtml(anzeige)}</b>
                ${vorhanden ? `<span style="font-size:11px;color:var(--red)"> — überschreibt „${escapeHtml(f.typ === 'date' ? formatDE(vorhanden) : vorhanden)}"</span>` : ''}
            </span></label>`;
    };
    box.innerHTML = `
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:10px">
            Gefunden wurden ${gefunden.length} Angaben. Haken Sie an, was übernommen werden soll.
            Rot markiert ist, was ein bereits ausgefülltes Feld überschreiben würde.
        </p>
        ${gefunden.map(zeile).join('')}
        ${fehlend.length ? `<p style="font-size:11px;color:var(--text-muted);margin-top:12px">
            Nicht gefunden: ${fehlend.map(f => escapeHtml(f.titel)).join(', ')}. Diese Felder bleiben,
            wie sie sind.</p>` : ''}
        ${roh.auftrag ? `<p style="font-size:11px;color:var(--text-muted);margin-top:6px">
            Auftragsart laut Bogen: <b>${escapeHtml(roh.auftrag)}</b>${roh.pflegeberater
                ? ' · Pflegeberater(in): ' + escapeHtml(roh.pflegeberater) : ''}</p>` : ''}`;
    document.getElementById('vorschlag-overlay').classList.add('active');
}

function auftragUebernehmen() {
    if (!auftragFunde) return;
    let n = 0;
    document.querySelectorAll('#vorschlag-body input[data-auftrag]').forEach(cb => {
        if (!cb.checked) return;
        const id = cb.getAttribute('data-auftrag');
        const el = document.getElementById(id);
        if (!el || !auftragFunde[id]) return;
        el.value = auftragFunde[id];
        n++;
    });
    closeVorschlaege();
    // Der Bogen bringt das Geburtsdatum mit – die Altersanzeige muss nachziehen.
    if (typeof alterHinweisZeigen === 'function') alterHinweisZeigen();
    if (typeof markiereStellungnahmeVeraltet === 'function' && n) markiereStellungnahmeVeraltet('Stammdaten');
    showToast(n ? n + ' Angabe(n) aus dem Auftragsbogen übernommen.' : 'Nichts übernommen.',
              n ? 'success' : 'error');
}
