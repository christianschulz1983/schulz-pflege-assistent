// Startauswahl: Verfasser und Vorgangsart. Der Widerspruch verhält sich unverändert;
// die beiden anderen Vorgänge werden in den nächsten Ausbaustufen ergänzt.

let appModus = 'widerspruch';

/* KINDERVORGANG – die Kachel sagt die Absicht, das Alter entscheidet die Rechnung.
   ------------------------------------------------------------------------------
   Die Kindersystematik hing bisher allein am Geburtsdatum und schaltete sich damit
   still zu. Rechnerisch ist das richtig – zu bedienen war es schlecht: Beim Start war
   nicht zu sehen, dass es den Weg überhaupt gibt, und wer das Geburtsdatum vergaß,
   bekam ohne Warnung eine Rechnung nach dem Erwachsenenmaßstab.

   Deshalb vier zusätzliche Kacheln. Sie legen NICHT fest, wie gerechnet wird – das
   täte sonst ein Haken, und ein Haken kann falsch gesetzt sein. Maßgeblich bleibt das
   Alter am Begutachtungstag (BRi Seite 146). Die Kachel bewirkt zweierlei:
     1. Sie fordert Geburts- und Begutachtungsdatum ein, solange sie fehlen.
     2. Weichen Kachel und Alter voneinander ab, wird das benannt statt verschwiegen.
   Die Vorgangsart selbst bleibt dieselbe – ein Widerspruch für ein Kind ist ein
   Widerspruch. Deshalb ändern sich weder die Vorlagen noch die Dateinamen
   (PS_/HA_/EA_, Regel 51). */
let appKindVorgang = false;

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
        text: 'Noch kein Gutachten vorhanden. Angaben und Befund erheben und den Antrag erstellen.',
        fertig: true,
        geplant: 'Noch offen: Mehrfach-Upload für Arztberichte und das Deckblatt an die Pflegekasse.'
    },
    hoeherstufung: {
        titel: 'Höherstufungsantrag',
        zeichen: '📈',
        text: 'Vorgutachten liegt vor, der Zustand hat sich verschlechtert. Befund erheben und die Verschlechterung begründen.',
        fertig: true,
        geplant: ''
    },
    anhoerung: {
        titel: 'Anhörung',
        zeichen: '🔁',
        text: 'Der Widerspruch wurde abgelehnt, ein Zweitgutachten liegt vor. Erstgutachten, eigene Stellungnahme '
            + 'und Anhörungsgutachten vergleichen und die Begründung für den Widerspruchsausschuss erstellen.',
        fertig: true,
        geplant: ''
    }
};

/* Was an den vier Vorgängen anders ist, wenn es um ein Kind geht. Nur der Text –
   der Ablauf ist derselbe. */
const MODI_KINDER_TEXT = {
    widerspruch: 'Gutachten und Bescheid für ein Kind liegen vor. Bewertet wird die Abweichung '
        + 'von einem altersentsprechend entwickelten Kind (BRi Kapitel 5).',
    erstantrag: 'Erstmaliger Antrag für ein Kind. Angaben, Entwicklungsstand und Befund erheben '
        + 'und den Antrag erstellen.',
    hoeherstufung: 'Vorgutachten für ein Kind liegt vor, der Zustand hat sich verschlechtert. '
        + 'Achtung: Kinder lernen dazu – das Rückstufungsrisiko vorher prüfen.',
    anhoerung: 'Der Widerspruch für ein Kind wurde abgelehnt, ein Zweitgutachten liegt vor. '
        + 'Erstgutachten, eigene Stellungnahme und Zweitgutachten vergleichen.'
};

function startKachel(k, kind) {
    const m = MODI[k];
    const aktiv = (k === appModus && !!kind === !!appKindVorgang) ? ' aktiv' : '';
    const titel = kind ? m.titel + ' (Kind)' : m.titel;
    const text = kind ? MODI_KINDER_TEXT[k] : m.text;
    return `<button type="button" class="start-kachel${aktiv}${kind ? ' kind' : ''}${m.fertig ? '' : ' vorbereitung'}" onclick="waehleModus('${k}',${kind ? 'true' : 'false'})">
        <div class="sk-kopf"><span class="sk-zeichen">${m.zeichen}</span><span class="sk-titel">${escapeHtml(titel)}</span></div>
        <div class="sk-text">${escapeHtml(text)}</div>
        ${m.fertig ? '<div class="sk-status bereit">einsatzbereit</div>'
                   : '<div class="sk-status offen">in Vorbereitung</div>'}
    </button>`;
}

// Startauswahl anzeigen. schliessbar = false beim ersten Öffnen (es muss gewählt werden).
function zeigeStart(schliessbar) {
    const ov = document.getElementById('start-overlay');
    if (!ov) return;
    const schluessel = Object.keys(MODI);
    document.getElementById('start-modi').innerHTML =
        schluessel.map(k => startKachel(k, false)).join('');
    const kinder = document.getElementById('start-modi-kinder');
    if (kinder) kinder.innerHTML = schluessel.map(k => startKachel(k, true)).join('');
    const fuss = document.getElementById('start-fuss');
    if (fuss) fuss.style.display = schliessbar ? 'flex' : 'none';
    ov.classList.add('active');
    loadVerfasser();   // Auswahl des Beraters wiederherstellen
}

function schliesseStart() {
    document.getElementById('start-overlay')?.classList.remove('active');
}

// Auswahl einer Kachel
function waehleModus(key, kind) {
    if (!MODI[key]) return;
    if (!MODI[key].fertig) { zeigeVorbereitung(key); return; }
    setzeModus(key, !!kind);
    schliesseStart();
}

/* `kind` ist absichtlich dreiwertig: Wird es weggelassen, bleibt die bisherige
   Einstellung stehen. `setzeModus` wird auch aus „Fall laden", dem Selbsttest und
   der Wiederherstellung heraus aufgerufen – dort darf die Angabe nicht verlorengehen. */
function setzeModus(key, kind) {
    if (!MODI[key]) key = 'widerspruch';
    appModus = key;
    if (kind !== undefined) appKindVorgang = !!kind;
    const anz = document.getElementById('modus-anzeige');
    if (anz) anz.innerText = MODI[key].zeichen + ' ' + MODI[key].titel
        + (appKindVorgang ? ' · Kind' : '');
    // Die Befunderhebung gehört zu Erstantrag und Höherstufungsantrag.
    // Im Widerspruch bleibt die Reiterleiste unverändert.
    const btn = document.getElementById('btn-tab-befund');
    const mitBefund = (key === 'erstantrag' || key === 'hoeherstufung');
    if (btn) {
        btn.style.display = mitBefund ? '' : 'none';
        btn.innerText = (key === 'erstantrag') ? '2. Befunderhebung' : '2. Befunderhebung';
    }
    // Der Vergleichsreiter gehört ausschließlich zum Anhörungsverfahren.
    const istAnh = (key === 'anhoerung');
    const bv = document.getElementById('btn-tab-vergleich');
    if (bv) bv.style.display = istAnh ? '' : 'none';
    // Nummerierung der übrigen Reiter anpassen
    const zweiter = (mitBefund || istAnh);
    const b3 = document.getElementById('btn-tab-3'), b4 = document.getElementById('btn-tab-4');
    if (b3) b3.innerText = (zweiter ? '3.' : '2.') + ' Einschätzung & Vergleich';
    if (b4) b4.innerText = (zweiter ? '4.' : '3.') + ' Auswertung';
    // Steht ein Reiter nicht zur Verfügung, nicht darauf stehen bleiben
    if (!mitBefund && document.getElementById('tab-befund')?.classList.contains('active')) switchTab(1);
    if (!istAnh && document.getElementById('tab-vergleich')?.classList.contains('active')) switchTab(1);
    /* Auftragsbogen S1/A1: Nur beim Erstantrag gibt es ihn, und nur dort fehlt ein
       Gutachten, aus dem die Stammdaten kommen könnten (js/auftrag.js). */
    const auftrag = document.getElementById('auftrag-bereich');
    if (auftrag) auftrag.style.display = (key === 'erstantrag') ? '' : 'none';
    // Anschrift, Telefon und E-Mail stammen aus dem Auftragsbogen und stehen im Antrag.
    document.querySelectorAll('.kontakt-feld').forEach(el => {
        el.style.display = mitBefund ? '' : 'none';
    });
    // Erweiterte Erfassung (Pflegepersonen, Aufenthalte, Versorgung) ebenfalls nur dort
    const erf = document.getElementById('erfassung-bereich');
    if (erf) {
        erf.style.display = mitBefund ? '' : 'none';
        if (mitBefund && typeof renderErfassung === 'function') renderErfassung();
    }
    // Ärztliche Unterlagen als Beleg: Widerspruch und Anhörung (js/belege.js)
    if (typeof renderBelegeBereich === 'function') renderBelegeBereich();
    // Die Analysekarten hängen am Vorgang (js/prognose.js)
    if (typeof renderAnalyseBereich === 'function') renderAnalyseBereich();
    // Verfahrensfehler-Checkliste: Widerspruch und Anhörung (js/verfahren.js)
    if (typeof renderVerfahrenBereich === 'function') renderVerfahrenBereich();
    /* Kindervorgang: nur den Hinweis neu setzen – NICHT die ganze Ansicht.
       Die Kachel ändert keine Sperre und keine Punktzahl, sie ändert allein den
       Hinweistext. `kinderAnsichtAktualisieren()` würde hier die Kriterienliste neu
       zeichnen und die Analyse ein zweites Mal rechnen (setzeModus ruft
       `renderAnalyseBereich` bereits selbst auf, und `calculate('own')` tut es
       nochmals). Die Analyse rechnet den ganzen Fall je abweichendem Kriterium neu –
       der Selbsttest lief damit nicht mehr durch. */
    if (typeof alterHinweisZeigen === 'function') alterHinweisZeigen();
    // Bereich für das Anhörungsverfahren nur dort
    const anh = document.getElementById('anhoerung-bereich');
    if (anh) {
        const istAnhoerung = (key === 'anhoerung');
        anh.style.display = istAnhoerung ? '' : 'none';
        if (istAnhoerung && typeof renderAnhoerungBereich === 'function') {
            renderAnhoerungBereich();
            aktualisiereAnhoerungStatus();
        }
    }
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
