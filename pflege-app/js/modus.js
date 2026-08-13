// Startauswahl: Verfasser und Vorgangsart. Der Widerspruch verhält sich unverändert;
// die beiden anderen Vorgänge werden in den nächsten Ausbaustufen ergänzt.

let appModus = 'widerspruch';

const MODI = {
    widerspruch: {
        titel: 'Widerspruch',
        zeichen: '⚖',
        text: 'Gutachten und Bescheid liegen vor. Werte prüfen, abweichend bewerten und die Widerspruchsbegründung erstellen.',
        fertig: true
    },
    erstantrag: {
        titel: 'Erstantrag',
        zeichen: '📄',
        text: 'Noch kein Gutachten vorhanden. Ärztliche Unterlagen einlesen, Befund erheben und den Antrag samt Deckblatt erstellen.',
        fertig: false,
        geplant: 'Mehrfach-Upload für Arztberichte, Befundkatalog, Antragsformular und Deckblatt an die Pflegekasse.'
    },
    hoeherstufung: {
        titel: 'Höherstufungsantrag',
        zeichen: '📈',
        text: 'Vorgutachten liegt vor, der Zustand hat sich verschlechtert. Befund erheben und die Verschlechterung begründen.',
        fertig: false,
        geplant: 'Angaben zu Pflegeperson und Pflegedienst, Krankenhausaufenthalte, Arzt- und Therapiebesuche, Behandlungspflege, Befundkatalog und die Begründung über die Veränderung seit der Begutachtung.'
    }
};

function modusTitel() {
    return (MODI[appModus] || MODI.widerspruch).titel;
}

// Startauswahl anzeigen. schliessbar = false beim ersten Öffnen (es muss gewählt werden).
function zeigeStart(schliessbar) {
    const ov = document.getElementById('start-overlay');
    if (!ov) return;
    const kacheln = Object.keys(MODI).map(k => {
        const m = MODI[k];
        const aktiv = (k === appModus) ? ' aktiv' : '';
        return `<button type="button" class="start-kachel${aktiv}${m.fertig ? '' : ' vorbereitung'}" onclick="waehleModus('${k}')">
            <div class="sk-kopf"><span class="sk-zeichen">${m.zeichen}</span><span class="sk-titel">${escapeHtml(m.titel)}</span></div>
            <div class="sk-text">${escapeHtml(m.text)}</div>
            ${m.fertig ? '<div class="sk-status bereit">einsatzbereit</div>'
                       : '<div class="sk-status offen">in Vorbereitung</div>'}
        </button>`;
    }).join('');
    document.getElementById('start-modi').innerHTML = kacheln;
    const fuss = document.getElementById('start-fuss');
    if (fuss) fuss.style.display = schliessbar ? 'flex' : 'none';
    ov.classList.add('active');
    loadVerfasser();   // Auswahl des Beraters wiederherstellen
}

function schliesseStart() {
    document.getElementById('start-overlay')?.classList.remove('active');
}

// Auswahl einer Kachel
function waehleModus(key) {
    if (!MODI[key]) return;
    if (!MODI[key].fertig) { zeigeVorbereitung(key); return; }
    setzeModus(key);
    schliesseStart();
}

function setzeModus(key) {
    if (!MODI[key]) key = 'widerspruch';
    appModus = key;
    const anz = document.getElementById('modus-anzeige');
    if (anz) anz.innerText = MODI[key].zeichen + ' ' + MODI[key].titel;
    // Die Befunderhebung gehört zu Erstantrag und Höherstufungsantrag.
    // Im Widerspruch bleibt die Reiterleiste unverändert.
    const btn = document.getElementById('btn-tab-befund');
    const mitBefund = (key === 'erstantrag' || key === 'hoeherstufung');
    if (btn) {
        btn.style.display = mitBefund ? '' : 'none';
        btn.innerText = (key === 'erstantrag') ? '2. Befunderhebung' : '2. Befunderhebung';
    }
    // Nummerierung der übrigen Reiter anpassen
    const b3 = document.getElementById('btn-tab-3'), b4 = document.getElementById('btn-tab-4');
    if (b3) b3.innerText = (mitBefund ? '3.' : '2.') + ' Einschätzung & Vergleich';
    if (b4) b4.innerText = (mitBefund ? '4.' : '3.') + ' Auswertung';
    // Steht die Befunderhebung nicht zur Verfügung, nicht darauf stehen bleiben
    if (!mitBefund && document.getElementById('tab-befund')?.classList.contains('active')) switchTab(1);
}

// Hinweis für noch nicht gebaute Vorgänge
function zeigeVorbereitung(key) {
    const m = MODI[key];
    const alt = document.getElementById('vorbereitung-box');
    if (alt) alt.remove();
    const box = document.createElement('div');
    box.id = 'vorbereitung-box';
    box.style.cssText = 'position:fixed;inset:0;z-index:9700;background:rgba(15,23,42,0.5);'
        + 'display:flex;align-items:center;justify-content:center;padding:24px;';
    box.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border-bright);border-radius:14px;
            max-width:520px;width:100%;overflow:hidden">
        <div style="padding:22px 24px">
            <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:10px">
                ${escapeHtml(m.zeichen + ' ' + m.titel)}</div>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                Dieser Vorgang wird gerade gebaut und ist noch nicht nutzbar.</p>
            <p style="font-size:12px;color:var(--text-muted);line-height:1.6">Geplant: ${escapeHtml(m.geplant)}</p>
        </div>
        <div style="padding:14px 24px;background:var(--bg-card2);border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px">
            <button class="btn btn-secondary" onclick="document.getElementById('vorbereitung-box').remove()">Zurück zur Auswahl</button>
            <button class="btn btn-primary" onclick="document.getElementById('vorbereitung-box').remove();waehleModus('widerspruch')">Widerspruch öffnen</button>
        </div>
    </div>`;
    document.body.appendChild(box);
}

// Kurzanzeige des Verfassers in Reiter 1
function aktualisiereVerfasserAnzeige() {
    const el = document.getElementById('verfasser-anzeige');
    if (!el) return;
    const v = getVerfasser();
    el.innerText = v.name + (v.zeilen.length ? ' · ' + v.zeilen.join(' · ') : '');
}
