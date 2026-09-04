// Teil des Pflegegradassistenten für Berater. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
let activeSidebarBtn = {};

// Erlaeuterung des Verfassers zu einem Kriterium (Handreichung in einfacher Sprache).
function laienText(nr) {
    return (typeof LAIEN_TEXTE !== 'undefined' && nr) ? (LAIEN_TEXTE[nr] || null) : null;
}

function hatErlaeuterung(item) {
    if (!item) return false;
    if (laienText(item.nr)) return true;
    return !!(item.info && (item.info.check || item.info.steps));
}

// Gibt den Wortlaut unveraendert wieder. Hervorgehoben wird lediglich die Beschriftung
// vor dem ersten Doppelpunkt („Laien-Check:", „Hilfsmittel-Regel:", „0:" und so weiter).
function laienZeileHtml(ebene, text) {
    const t = escapeHtml(text);
    const m = t.match(/^([^:]{1,40}):\s*([\s\S]*)$/);
    const inhalt = m
        ? `<span class="laien-lead">${m[1]}:</span>${m[2] ? ' ' + m[2] : ''}`
        : t;
    return `<div class="laien-zeile ${ebene ? 'stufe' : 'punkt'}">${inhalt}</div>`;
}

function selectItem(id, pref, btn) {
    const item=ITEMS.find(i=>i.id===id);
    if(!item || !hatErlaeuterung(item)) return;
    if(activeSidebarBtn[pref] && activeSidebarBtn[pref] !== btn) activeSidebarBtn[pref].classList.remove('active');
    if(btn){ btn.classList.toggle('active'); if(!btn.classList.contains('active')){ document.getElementById('sidebar-empty-'+pref).style.display='flex'; document.getElementById('sidebar-content-'+pref).style.display='none'; activeSidebarBtn[pref]=null; return; } }
    activeSidebarBtn[pref]=btn;
    document.getElementById('sidebar-empty-'+pref).style.display='none';
    document.getElementById('sidebar-content-'+pref).style.display='block';

    const lt = laienText(item.nr);
    document.getElementById('side-title-'+pref).innerText =
        (item.nr ? item.nr+' ' : '') + ((lt && lt.titel) ? lt.titel : item.title);

    const koerper = document.getElementById('side-body-'+pref);
    if (lt) {
        koerper.innerHTML = lt.zeilen.map(z => laienZeileHtml(z[0], z[1])).join('');
        return;
    }
    // Kriterien ohne Handreichung (Modul 6): bisherige Kurzhinweise
    let html = '';
    if (item.info?.check) {
        html += '<div class="side-section-label">Laien-Check</div>'
              + `<div class="side-check-box">${item.info.check}</div>`;
    }
    const steps = item.info?.steps;
    if (steps && steps.length) {
        html += '<div class="side-section-label">Offizielle Abstufungen</div>'
              + steps.map(s=>`<div class="side-step"><div class="side-step-label">${s.l}</div><div class="side-step-text">${s.d}</div></div>`).join('');
    } else if (item.info?.rule) {
        html += `<div class="side-step"><div class="side-step-label">Hinweis</div><div class="side-step-text">${item.info.rule}</div></div>`;
    }
    koerper.innerHTML = html || '<div style="color:var(--text-muted);font-size:11px;font-family:var(--font-mono)">Keine weiteren Details.</div>';
}

function renderAuswertung() {
    const rO=calculateInternal('orig');
    const rE=calculateInternal('own');
    const mNames=['Mobilität','Kognition','Verhalten','Selbstversorgung','Med. Anf.','Alltagsgest.'];
    const diff=(rE.total-rO.total).toFixed(2).replace('.',',');
    const diffSign=rE.total>=rO.total?'+':'';
    const pgDiff=rE.pg-rO.pg;
    const pgDiffTxt=pgDiff>0?`+${pgDiff}`:pgDiff===0?'±0':pgDiff;
    const pgDiffClr=pgDiff>0?'var(--green)':pgDiff===0?'var(--text-muted)':'var(--red)';

    document.getElementById('auswertung-content').innerHTML=`
    <div class="space-y-6">
        <div class="card">
            <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Zuletzt gespeicherte Dateien</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Nachweis darüber, was tatsächlich geschrieben wurde – Falldateien und Word-Dokumente.
                    Wird ein Speichern-Dialog abgebrochen, erscheint hier nichts. Den Ordner wählen Sie
                    im Dialog selbst; der Browser gibt ihn der App nicht bekannt.
                </p>
                ${typeof speicherungenHtml === 'function' ? speicherungenHtml() : ''}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Woher stammen die Bewertungen?</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Nach dem geprüften Import trägt die App von sich aus keine Punkte mehr ein. Jede Änderung
                    steht hier mit ihrem Ursprung – so ist nachvollziehbar, was von Ihnen kommt und was aus
                    einem von Ihnen angehakten Vorschlag stammt.
                </p>
                ${abweichungHtml()}
                ${protokollHtml()}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Vergleichsbericht: Vorgutachten vs. Eigene Einschätzung</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border)">
                ${[
                    ['PG laut Vorgutachten', rO.pg>0?'Pflegegrad '+rO.pg:'Kein Pflegegrad', 'var(--accent)'],
                    ['PG Eigene Einschätzung', rE.pg>0?'Pflegegrad '+rE.pg:'Kein Pflegegrad', 'var(--accent2)'],
                    ['Differenz Pflegegrad', pgDiffTxt, pgDiffClr]
                ].map(([l,v,c])=>`<div style="background:var(--bg-card2);padding:20px;text-align:center">
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:var(--text-secondary);margin-bottom:8px">${l}</div>
                    <div style="font-size:28px;font-weight:800;color:${c}">${v}</div>
                </div>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border)">
                ${[
                    ['Punkte Vorgutachten', rO.total.toFixed(2).replace('.',','), 'var(--text-primary)'],
                    ['Punkte Eigene Einschätzung', rE.total.toFixed(2).replace('.',','), 'var(--text-primary)'],
                    ['Differenz Punkte', diffSign+diff, rE.total>=rO.total?'var(--green)':'var(--red)']
                ].map(([l,v,c])=>`<div style="background:var(--bg-card);padding:16px;text-align:center">
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:var(--text-secondary);margin-bottom:6px">${l}</div>
                    <div style="font-size:22px;font-weight:800;color:${c};font-family:var(--font-mono)">${v}</div>
                </div>`).join('')}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="dot"></div>Modul-Vergleich</div>
            <table class="result-table">
                <thead><tr>
                    <th>Modul</th>
                    <th class="center">Gew. Pkt (Vorg.)</th><th class="center">Einzel (Vorg.)</th>
                    <th class="center">Gew. Pkt (Eigen)</th><th class="center">Einzel (Eigen)</th>
                    <th class="center">Differenz</th>
                </tr></thead>
                <tbody>${[1,2,3,4,5,6].map(m=>{
                    const dw=rE.weights[m-1]-rO.weights[m-1];
                    const dr=rE.raws[m-1]-rO.raws[m-1];
                    const dwStr=(dw>=0?'+':'')+dw.toFixed(2);
                    const drStr=(dr>=0?'+':'')+dr;
                    const clr=dw>0?'var(--green)':dw<0?'var(--red)':'var(--text-muted)';
                    return `<tr>
                        <td>${m}. ${mNames[m-1]}</td>
                        <td class="center mono">${rO.weights[m-1].toFixed(2)}</td>
                        <td class="center mono">${rO.raws[m-1]}</td>
                        <td class="center" style="color:var(--accent2);font-family:var(--font-mono);font-weight:700">${rE.weights[m-1].toFixed(2)}</td>
                        <td class="center" style="color:var(--accent2);font-family:var(--font-mono)">${rE.raws[m-1]}</td>
                        <td class="center"><span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${clr}">${dwStr} (${drStr})</span></td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
        </div>

        <div class="card" style="border-color:var(--border);">
            <div class="card-header"><div class="dot" style="background:var(--accent)"></div>Mathematische Berechnungsgrundlage (SGB XI)</div>
            <div style="padding:20px; font-family:var(--font-mono); font-size:11px; line-height:1.6; color:var(--text-secondary);">
                <p style="margin-bottom:12px;">Die SGB XI Gesamtpunktzahl wird anhand der gewichteten Modulergebnisse berechnet. Modul 2 und 3 werden als Verbund gewertet, wobei nur das Modul mit der höheren Punktzahl in die Summe einfließt:</p>
                <div style="background:var(--bg-base); padding:16px; border-radius:8px; text-align:center; color:var(--accent); font-size:14px; margin-bottom:12px; border:1px solid var(--border)">
                    T = W_1 + max(W_2, W_3) + W_4 + W_5 + W_6
                </div>
                <p>Wobei:</p>
                <ul style="list-style-type:none; padding-left:14px; margin-top:8px;">
                    <li>- W_1: Gewichtete Punkte Mobilität (max 10 Pkt)</li>
                    <li>- W_2: Kognitive Fähigkeiten (max 15 Pkt)</li>
                    <li>- W_3: Verhaltensweisen (max 15 Pkt)</li>
                    <li>- W_4: Selbstversorgung (max 40 Pkt)</li>
                    <li>- W_5: Krankheitsbed. Anforderungen (max 20 Pkt)</li>
                    <li>- W_6: Gestaltung Alltagsleben (max 15 Pkt)</li>
                </ul>
            </div>
        </div>

        <div class="card" style="border: 1px solid rgba(37,99,235,0.2);">
            <div class="card-header">
                <div class="header-title-left"><div class="dot" style="background:var(--accent)"></div>Widerspruchs- &amp; Begründungs-Assistent (KI)</div>
            </div>
            <div style="padding:24px;">
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px; line-height:1.6">
                    Erstellt auf Knopfdruck eine formatgetreue „Pflegefachliche Stellungnahme" im Familiara-Layout. Alle Daten werden automatisch aus den eingegebenen bzw. eingelesenen Gutachten- und Bescheiddaten, dem Modulvergleich und Ihrer Mitschrift übernommen. Die Vorschau ist frei editierbar und kann als PDF gedruckt werden.
                </p>
                <button class="btn btn-yellow" onclick="generateAppealText()">⚡ Stellungnahme / Widerspruch erstellen</button>

                <details style="margin-top:16px; border:1px solid var(--border); border-radius:8px; padding:10px 14px;">
                    <summary style="cursor:pointer; font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-secondary);">Stilvorlage für die Begründungen (BRi-gestützt)</summary>
                    <p style="font-size:12px; color:var(--text-secondary); margin:10px 0; line-height:1.6">
                        Zu jedem abweichenden Kriterium wird eine Begründung im Stil der folgenden Beispiele verfasst – mit wörtlichen Zitaten aus den BRi und, wo fachlich tragfähig, einem Quervergleich zu Kriterien, in denen der Gutachter bereits eine Einschränkung anerkannt hat. Ergänzen Sie hier gern weitere eigene Begründungen (durch Leerzeile getrennt); je mehr Beispiele, desto genauer der Stil.
                    </p>
                    <textarea id="stil-beispiele" class="field-input" style="min-height:150px; font-size:12px; line-height:1.6; padding:12px;" oninput="saveStilBeispiele(); autoResize(this)"></textarea>
                    <button class="btn btn-secondary" style="margin-top:10px" onclick="resetStilBeispiele()">Auf Ausgangsbeispiel zurücksetzen</button>
                </details>

                <div id="appeal-result-container" style="display:none; margin-top:20px;">
                    <div id="appeal-veraltet">${typeof veraltetHinweisHtml === 'function' ? veraltetHinweisHtml() : ''}</div>
                    <label class="field-label">Generierte Stellungnahme (Vorschau – frei editierbar)</label>
                    <div id="appeal-document" contenteditable="true" spellcheck="false" oninput="appealDraft = this.innerHTML"></div>

                    <div style="display:flex; gap:12px; margin-top:16px;">
                        <button class="btn btn-yellow" onclick="exportAppealWord()">📄 Als Word-Dokument speichern</button>
                        <button class="btn btn-primary" onclick="copyAppealText()">Kopieren</button>
                        <button class="btn btn-secondary" onclick="printAppealText()">Drucken / PDF speichern</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // Eingaben nach dem Neu-Rendern wiederherstellen (Tab-Wechsel baut den Inhalt neu auf).
    // Das Notizfeld liegt jetzt im Reiter "Einschätzung" und wird davon nicht berührt.
    injectStellungnahmeCss();
    const stilEl = document.getElementById('stil-beispiele');
    if (stilEl) {
        let s = null;
        try { s = localStorage.getItem(stilSchluessel()); } catch (e) {}
        stilEl.value = (s && s.trim()) ? s : STIL_BEISPIEL_DEFAULT;
    }
    if (appealDraft) {
        const appealEl = document.getElementById('appeal-document');
        const cont = document.getElementById('appeal-result-container');
        if (appealEl && cont) {
            appealEl.innerHTML = appealDraft;
            cont.style.display = 'block';
        }
    }
}

/* NAME DER FALLDATEI: „Vorname, Nachname, Bezeichnung.json".
   Vorgabe des Verfassers. Vorher hieß sie „Frau_Stephanie_Kaftan_Pflegegradassistent.json" –
   die Anrede half nicht beim Suchen, und die Vorgangsart fehlte ganz, obwohl zu einer
   Person nacheinander Widerspruch und Anhörung entstehen. */
const VORGANG_BEZEICHNUNG = {
    widerspruch:   'Widerspruch',
    hoeherstufung: 'Höherstufung',
    erstantrag:    'Erstantrag',
    anhoerung:     'Anhörungsschreiben'
};

// Namenszusätze, die zum Nachnamen gehören: „Ludwig van Beethoven" -> „van Beethoven".
const NAMENSZUSAETZE = ['von', 'van', 'vom', 'der', 'den', 'zu', 'zur', 'zum', 'de', 'del', 'della', 'di', 'da', 'du', 'la', 'le', 'ten', 'ter'];

/* Zerlegt das Feld „Betreffend" in Vor- und Nachnamen.
   Erkannt werden „Frau Stephanie Kaftan", „Kaftan, Stephanie" und „Stephanie Kaftan".
   Mehrere Vornamen bleiben beim Vornamen; das letzte Wort ist der Nachname. */
function fallNamensteile(roh) {
    let s = String(roh == null ? '' : roh).replace(/\s+/g, ' ').trim();
    if (!s) return { vorname: '', nachname: '' };
    // „Kaftan, Stephanie" umdrehen – aber nicht „Frau Kaftan, Stephanie" falsch behandeln
    const komma = s.match(/^([^,]+),\s*(.+)$/);
    if (komma && !/^(herr|frau)\b/i.test(s)) s = (komma[2] + ' ' + komma[1]).trim();
    s = s.replace(/^(herrn|herr|frau)\s+/i, '').trim();
    if (!s) return { vorname: '', nachname: '' };
    const teile = s.split(' ').filter(Boolean);
    if (teile.length === 1) return { vorname: '', nachname: teile[0] };
    let ab = teile.length - 1;
    while (ab > 1 && NAMENSZUSAETZE.indexOf(teile[ab - 1].toLowerCase()) !== -1) ab--;
    return { vorname: teile.slice(0, ab).join(' '), nachname: teile.slice(ab).join(' ') };
}

// Zeichen, die Windows im Dateinamen nicht erlaubt. Kommas sind erlaubt und gewollt.
function dateinameSicher(s) {
    return String(s == null ? '' : s).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

function fallDateiname(betreffend, modus) {
    const n = fallNamensteile(betreffend);
    const bez = VORGANG_BEZEICHNUNG[modus] || VORGANG_BEZEICHNUNG.widerspruch;
    const teile = [n.vorname, n.nachname, bez].map(dateinameSicher).filter(Boolean);
    // Ohne Namen bleibt wenigstens die Vorgangsart übrig – nie eine namenlose Datei.
    if (teile.length === 1) teile.unshift('Fall');
    return teile.join(', ') + '.json';
}

// Speichert den Fall. Wie beim Word-Dokument über einen „Speichern unter"-Dialog, damit
// der Ordner frei wählbar ist und wiedergefunden wird. Kennt der Browser den Dialog nicht,
// landet die Datei wie bisher im Download-Ordner.
async function saveCase() {
    const stammdaten={};
    // Auch die Felder des Anhoerungsverfahrens ("anh-") gehoeren in die Falldatei.
    document.querySelectorAll('[id^="stam-"], [id^="diag-"], [id^="anh-"]').forEach(el=>stammdaten[el.id]=el.value);
    const notesEl = document.getElementById('erstgespraech-notes');
    if (notesEl) erstgespraechNotes = notesEl.value;
    // Aktuellen (ggf. editierten) Stand der generierten Stellungnahme mitspeichern
    const appealEl = document.getElementById('appeal-document');
    if (appealEl) appealDraft = appealEl.innerHTML;
    const data={stateOrig,stateEigene,stateZweit,stammdaten,erstgespraechNotes,appealDraft,appModus,
                befund: (typeof befundSichern === 'function') ? befundSichern() : null,
                erfassung: (typeof erfassungSichern === 'function') ? erfassungSichern() : null,
                anlagen: (typeof anlagenSichern === 'function') ? anlagenSichern() : null};
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    const dateiname=fallDateiname(document.getElementById('stam-betreffend').value, appModus);
    if (typeof speichereDatei === 'function') {
        // Eigene Kennung: der Ordner für Falldateien wird getrennt von dem der
        // Word-Dokumente gemerkt. Vorgabe ist der Download-Ordner – dort liegen die
        // bisher gespeicherten Fälle, und dort sucht auch „Fall laden" zuerst.
        return await speichereDatei(blob, dateiname, 'fall-datei-download',
            'Mit „Fall laden" lässt sich die Datei wieder öffnen.', 'downloads');
    }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=dateiname; a.click();
    return true;
}

function loadCase(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        showToast('Bitte eine gültige .json-Datei laden (zuvor mit "Speichern" erstellt).', 'error');
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!data.stateOrig || !data.stateEigene) throw new Error('Ungueltiges Format');
            stateOrig = data.stateOrig;
            stateEigene = data.stateEigene;
            // Ältere Falldateien kennen das Zweitgutachten nicht – dann bleibt es leer.
            stateZweit = data.stateZweit || { special: 0, values: {} };
            // Dateien lassen sich nicht mitspeichern; die Prüfansicht zeigt dann nur die Werte.
            if (typeof letzteProvided !== 'undefined') letzteProvided = null;
            if (typeof stellungnahmeVeraltet !== 'undefined') stellungnahmeVeraltet = false;
            protokollLeeren();
            bewertungsProtokoll.push({ zeit: new Date().toLocaleTimeString('de-DE'),
                spalte: 'Vorgutachten und eigene Einschätzung', nr: '—',
                titel: 'Bewertungen aus der gespeicherten Datei', alt: 'leer', neu: 'geladen',
                quelle: BEWERTUNG_QUELLEN.laden });
            erstgespraechNotes = data.erstgespraechNotes || "";
            // Auch das Anzeigefeld setzen – sonst wandert der Text des vorherigen Falls
            // beim nächsten Speichern in die Datei dieses Falls.
            if (typeof setzeStellungnahme === 'function') setzeStellungnahme(data.appealDraft || "");
            else appealDraft = data.appealDraft || "";
            setzeModus(data.appModus || 'widerspruch');   // ältere Fälle sind immer Widersprüche
            if (typeof befundLaden === 'function') befundLaden(data.befund);
            if (typeof erfassungLaden === 'function') erfassungLaden(data.erfassung);
            if (typeof anlagenLaden === 'function') anlagenLaden(data.anlagen);
            init();
            setTimeout(() => {
                // Erst genügend Diagnosezeilen anlegen, sonst gehen Einträge ab Zeile 7 verloren
                ensureDiagRows(maxDiagIndex(data.stammdaten));
                Object.keys(data.stammdaten || {}).forEach(k => {
                    const el = document.getElementById(k);
                    if (!el) return;
                    // Ältere Fälle enthalten noch die früheren Kurzformen der Durchführungsart
                    el.value = (k === 'stam-art') ? normalizeArt(data.stammdaten[k]) : data.stammdaten[k];
                });
                autoResize(document.getElementById('stam-anamnese'));
                autoResize(document.getElementById('stam-befund'));
            }, 100);
            showToast('Fall erfolgreich geladen!', 'success');
        } catch(err) {
            showToast('Fehler: Keine gültige Pflegegradassistent-Datei.', 'error');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

function showToast(msg, type) {
    type = type || 'success';
    const existing = document.getElementById('toast-msg');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'toast-msg';
    t.innerText = msg;
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:' +
        (type === 'error' ? 'rgba(220,38,38,0.97)' : 'rgba(13,148,136,0.97)') +
        ';color:white;padding:12px 24px;border-radius:10px;font-family:var(--font-mono);' +
        'font-size:11px;font-weight:700;z-index:9999;max-width:520px;text-align:center;' +
        'box-shadow:0 4px 24px rgba(15,23,42,0.1);letter-spacing:0.03em;';
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 4500);
}

window.onload = function() {
    init();
    loadApiKey();
    setzeModus(appModus);
    zeigeStart(false);   // Beim Start muss Verfasser und Vorgang gewählt werden
};
