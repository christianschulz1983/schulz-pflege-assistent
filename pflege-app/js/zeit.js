/* js/zeit.js – Transparente Zeiterfassung je Fall.
   Vier Phasen, immer nur eine gleichzeitig laufend, Aufrundung auf 5 Minuten. Die Zeiten
   gehören zum Fall und werden mit der Falldatei gespeichert (Regel 74). Reine Erfassung –
   KEIN Einfluss auf die NBA-Rechnung oder eine Bewertung (Regel 11 bleibt unberührt).

   Zuordnung zu den Spalten der Tabelle des Verfassers (Reiter „Christian"):
     Vorbereitung          -> Admin
     Telefonat             -> ET
     Nachbereitung         -> PS/GA
     Vorbereitungsgespräch -> Coaching

   Aufrundung: Math.ceil(Minuten / 5) * 5 – 6 Min -> 10, 23 Min -> 25 (Vorgabe des Verfassers).
   Gemessen wird über WANDUHR-Zeitstempel, nicht über einen Zähler: So läuft der Timer nach
   einem Neuladen korrekt weiter und verliert nichts. Beim Laden eines Falls, dessen Timer vor
   langer Zeit lief (> Kappung), wird die Pause NICHT mitgezählt – ein über Nacht offener
   Timer würde die Zeit sonst aufblähen. */

const ZEIT_PHASEN = [
    { key: 'admin',    label: 'Vorbereitung',          spalte: 'Admin' },
    { key: 'et',       label: 'Telefonat',             spalte: 'ET' },
    { key: 'psga',     label: 'Nachbereitung',         spalte: 'PS/GA' },
    { key: 'coaching', label: 'Vorbereitungsgespräch', spalte: 'Coaching' }
];
const ZEIT_LADE_KAPPUNG_MS = 4 * 3600 * 1000;   // 4 Stunden

let zeitSek = { admin: 0, et: 0, psga: 0, coaching: 0 };
let zeitLaufend = null;      // Schlüssel der laufenden Phase oder null
let zeitStartEpoch = null;   // ms (Date.now) beim Start der laufenden Phase
let zeitTicker = null;       // setInterval-Kennung der Live-Anzeige

// Die laufende Phase in die Summe falten und die Startmarke neu setzen. Ohne Nebenwirkung,
// wenn nichts läuft. EINE Stelle, die Sekunden akkumuliert.
function zeitFold() {
    if (zeitLaufend && zeitStartEpoch) {
        zeitSek[zeitLaufend] = (zeitSek[zeitLaufend] || 0) + (Date.now() - zeitStartEpoch) / 1000;
        zeitStartEpoch = Date.now();
    }
}

// Sekunden einer Phase JETZT (inklusive laufendem Abschnitt).
function zeitSekundenJetzt(key) {
    let s = zeitSek[key] || 0;
    if (zeitLaufend === key && zeitStartEpoch) s += (Date.now() - zeitStartEpoch) / 1000;
    return s;
}

// Aufgerundete Minuten auf das nächste Vielfache von 5. 0 bleibt 0.
// Das -1e-9 fängt den Binärfehler: genau 5,00 Minuten bleiben 5, werden nicht zu 10.
function zeitMinutenAufgerundet(key) {
    const m = zeitSekundenJetzt(key) / 60;
    if (m <= 0) return 0;
    return Math.ceil(m / 5 - 1e-9) * 5;
}

// mm:ss für die Live-Anzeige.
function zeitMMSS(key) {
    const g = Math.floor(zeitSekundenJetzt(key));
    const mm = Math.floor(g / 60), ss = g % 60;
    return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
}

// Eine Phase starten. Läuft eine andere, wird sie zuerst gefaltet (gestoppt) –
// es läuft immer nur EINE Phase.
function zeitStart(key) {
    if (!ZEIT_PHASEN.some(p => p.key === key)) return;
    if (zeitLaufend === key) return;   // läuft bereits
    zeitFold();                        // laufende Phase sichern
    zeitLaufend = key;
    zeitStartEpoch = Date.now();
    zeitTickerStart();
    renderZeiterfassung();
}

// Die laufende Phase stoppen.
function zeitStopp() {
    zeitFold();
    zeitLaufend = null;
    zeitStartEpoch = null;
    zeitTickerStop();
    renderZeiterfassung();
}

// Alles zurücksetzen – bei einem neuen Gutachten (Regel 26).
function zeitReset() {
    zeitSek = { admin: 0, et: 0, psga: 0, coaching: 0 };
    zeitLaufend = null;
    zeitStartEpoch = null;
    zeitTickerStop();
    if (document.getElementById('zeit-bereich')) renderZeiterfassung();
}

// Für die Falldatei. Faltet zuerst, damit der gespeicherte Stand aktuell ist.
function zeitState() {
    zeitFold();
    return { sek: { admin: zeitSek.admin || 0, et: zeitSek.et || 0,
                    psga: zeitSek.psga || 0, coaching: zeitSek.coaching || 0 },
             laufend: zeitLaufend, start: zeitLaufend ? zeitStartEpoch : null };
}

// Aus der Falldatei laden. Ein über die Kappung hinaus offener Timer zählt die Pause nicht mit.
function zeitLadeState(obj) {
    zeitTickerStop();
    if (!obj || typeof obj !== 'object') { zeitReset(); return; }
    const s = obj.sek || {};
    zeitSek = { admin: Number(s.admin) || 0, et: Number(s.et) || 0,
                psga: Number(s.psga) || 0, coaching: Number(s.coaching) || 0 };
    zeitLaufend = ZEIT_PHASEN.some(p => p.key === obj.laufend) ? obj.laufend : null;
    zeitStartEpoch = null;
    if (zeitLaufend) {
        const offen = obj.start && (Date.now() - obj.start);
        // Kurze Lücke (schnelles Neuladen): genau weiterlaufen. Lange Lücke: nicht mitzählen.
        zeitStartEpoch = (offen && offen >= 0 && offen <= ZEIT_LADE_KAPPUNG_MS) ? obj.start : Date.now();
        zeitTickerStart();
    }
    if (document.getElementById('zeit-bereich')) renderZeiterfassung();
}

function zeitTickerStart() {
    zeitTickerStop();
    zeitTicker = setInterval(zeitAnzeigeNachziehen, 1000);
}
function zeitTickerStop() {
    if (zeitTicker) { clearInterval(zeitTicker); zeitTicker = null; }
}

// Nur die laufende Phase live nachziehen – ohne die ganze Karte neu zu zeichnen.
function zeitAnzeigeNachziehen() {
    if (!zeitLaufend) return;
    const t = document.getElementById('zeit-anzeige-' + zeitLaufend);
    if (t) t.textContent = zeitMMSS(zeitLaufend) + ' · ' + zeitMinutenAufgerundet(zeitLaufend) + ' Min';
}

// Kopffelder für Anzeige und Kopier-Zeile.
function zeitKundennummer() {
    return (document.getElementById('stam-kundennummer') || {}).value || '';
}
function zeitNachname() {
    const roh = (document.getElementById('stam-betreffend') || {}).value || '';
    if (typeof fallNamensteile === 'function') return fallNamensteile(roh).nachname || '';
    return roh;
}

/* Zeile für die Tabelle: nur die vier Phasenspalten (Admin, ET, PS/GA, Coaching), weil sie
   in der Tabelle nebeneinanderstehen. Tab-getrennt zum Einfügen in die Admin-Zelle der
   Fallzeile – so wird keine andere Spalte (Nummer, Nachname, Code) überschrieben.
   0 wird als leere Zelle kopiert, wie in der Tabelle des Verfassers. */
function zeitKopierZeile() {
    return ZEIT_PHASEN.map(p => {
        const m = zeitMinutenAufgerundet(p.key);
        return m > 0 ? String(m) : '';
    }).join('\t');
}

function zeitZeileKopieren() {
    const text = zeitKopierZeile();
    const fertig = () => showToast('Zeiten kopiert (Admin · ET · PS/GA · Coaching). '
        + 'In der Tabelle in die Admin-Zelle Ihrer Fallzeile einfügen.', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(fertig).catch(() => zeitKopierFallback(text, fertig));
    } else {
        zeitKopierFallback(text, fertig);
    }
}
function zeitKopierFallback(text, fertig) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); fertig(); } catch (e) {
        showToast('Kopieren nicht möglich – bitte die Zeiten von Hand übertragen.', 'error');
    }
    ta.remove();
}

function renderZeiterfassung() {
    const ziel = document.getElementById('zeit-bereich');
    if (!ziel) return;
    const kundennr = zeitKundennummer(), nachname = zeitNachname();
    const kopf = [nachname, kundennr && ('Kd.-Nr. ' + kundennr)].filter(Boolean).join(' · ') || 'kein Fall geladen';
    const reihen = ZEIT_PHASEN.map(p => {
        const laeuft = (zeitLaufend === p.key);
        const anzeige = zeitMMSS(p.key) + ' · ' + zeitMinutenAufgerundet(p.key) + ' Min';
        const knopf = laeuft
            ? '<button class="btn btn-primary" style="background:var(--red);box-shadow:none" onclick="zeitStopp()">■ Stopp</button>'
            : '<button class="btn btn-secondary" onclick="zeitStart(\'' + p.key + '\')">▶ Start</button>';
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;'
            + 'padding:9px 0;border-top:1px solid var(--border)">'
            + '<div style="min-width:170px"><div style="font-size:13px;font-weight:700;color:var(--text-primary)">'
            + escapeHtml(p.label) + '</div><div style="font-size:10px;color:var(--text-muted);'
            + 'font-family:var(--font-mono);letter-spacing:0.04em">Spalte „' + escapeHtml(p.spalte) + '"</div></div>'
            + '<div id="zeit-anzeige-' + p.key + '" style="font-family:var(--font-mono);font-size:13px;'
            + 'font-weight:700;color:' + (laeuft ? 'var(--accent)' : 'var(--text-secondary)') + ';'
            + 'min-width:120px;text-align:right">' + escapeHtml(anzeige) + '</div>'
            + '<div style="min-width:96px;text-align:right">' + knopf + '</div></div>';
    }).join('');
    ziel.innerHTML = '<div class="card">'
        + '<div class="card-header"><div class="dot"></div>Zeiterfassung</div>'
        + '<div style="padding:14px 20px">'
        + '<div style="font-size:11px;color:var(--text-muted);line-height:1.6;margin-bottom:6px">'
        + 'Pro Phase Start/Stopp – es läuft immer nur eine. Jede Zeit wird auf 5 Minuten aufgerundet '
        + 'und mit dem Fall gespeichert. ' + escapeHtml(kopf) + '</div>'
        + reihen
        + '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">'
        + '<button class="btn btn-secondary" onclick="zeitZeileKopieren()">📋 Zeile für die Tabelle kopieren</button>'
        + '<button class="btn btn-secondary" onclick="zeitReset()" '
        + 'style="color:var(--text-muted)">Zurücksetzen</button>'
        + '</div></div></div>';
}
