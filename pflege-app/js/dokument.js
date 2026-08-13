// Teil des Schulz Pflege-Assistenten. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
function buildStellungnahme(notesOverride, begruendungen, allgemeinText) {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const esc = escapeHtml;
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    // Datenfeld im Fließtext: wird beim erneuten Generieren gezielt aktualisiert (Text bleibt erhalten).
    const df = (key, val) => `<span data-f="${key}">${esc(val == null ? '' : String(val))}</span>`;

    // Name immer als "Herr/Frau Vorname Nachname". Liegt noch "Nachname, Vorname" vor,
    // wird umgedreht (Anrede ergänzt die Auslese).
    let name = g('stam-betreffend');
    const cm = name.match(/^([^,]+),\s*(.+)$/);
    if (cm && !/^(herr|frau)/i.test(name)) name = (cm[2] + ' ' + cm[1]).trim();
    if (!name) name = 'Herr/ Frau';
    const geb = formatDE(g('stam-geboren'));
    const kasse = g('stam-kasse');
    const versnr = g('stam-versnr');
    const bescheid = formatDE(g('stam-bescheid'));
    const org = g('stam-organisation') || 'Medizinischer Dienst';
    const begut = formatDE(g('stam-begutachtung'));
    const art = g('stam-art');
    const antrag = formatDE(g('stam-antrag')) || '__.__.____';

    const notesEl = document.getElementById('erstgespraech-notes');
    if (notesEl) erstgespraechNotes = notesEl.value;
    const notes = (typeof notesOverride === 'string' ? notesOverride : (erstgespraechNotes || '')).trim();
    const verf = getVerfasser();

    const rO = calculateInternal('orig');
    const rE = calculateInternal('own');
    const origPG = g('stam-pg-manual') || String(rO.pg);
    const origPts = g('stam-pts-manual') || f2(rO.total);
    // Ein Pflegegrad 0 existiert nicht – dort heißt es immer „kein Pflegegrad".
    const istKeinPG = v => { const s = String(v == null ? '' : v).trim(); return s === '' || s === '0' || /^kein/i.test(s); };
    const pgWert = v => istKeinPG(v) ? 'kein Pflegegrad' : String(v).trim();          // für Datenzeile und Tabelle
    const pgSatz = v => istKeinPG(v) ? 'kein Pflegegrad' : 'Pflegegrad ' + String(v).trim();  // im Fließtext
    const origPGTxt = pgWert(origPG);
    const eigPGTxt = pgWert(rE.pg);

    // Abweichende Einzelkriterien ermitteln
    const diffs = computeDiffs();

    const row = (label, o, e, bold) => `<tr><td${bold ? ' style="font-weight:bold"' : ''}>${esc(label)}</td><td class="num">${o}</td><td class="num">${e}</td></tr>`;
    const tableRows = [
        row('4.1 Mobilität', f2(rO.weights[0]), f2(rE.weights[0])),
        row('4.2 Kognitive und kommunikative Fähigkeiten', f2(rO.weights[1]), f2(rE.weights[1])),
        row('4.3 Verhaltensweisen und psychische Problemlagen', f2(rO.weights[2]), f2(rE.weights[2])),
        row('Höchster Wert aus Modul 2 und Modul 3', f2(Math.max(rO.weights[1], rO.weights[2])), f2(Math.max(rE.weights[1], rE.weights[2])), true),
        row('4.4 Selbstversorgung', f2(rO.weights[3]), f2(rE.weights[3])),
        row('4.5 Krankheits- und therapiebedingten Anforderungen', f2(rO.weights[4]), f2(rE.weights[4])),
        row('4.6 Gestaltung des Alltagslebens und sozialer Kontakte', f2(rO.weights[5]), f2(rE.weights[5])),
        row('Summe der gewichteten Punkte', f2(rO.total), f2(rE.total), true),
        row('Pflegegrad', esc(origPGTxt), esc(eigPGTxt), true)
    ].join('');

    // Je Abweichung: KI-Begründung (BRi-gestützt) verwenden, sonst der bisherige Standardsatz.
    const bg = begruendungen || {};
    const critHtml = diffs.length
        ? diffs.map(d => {
            const txt = (bg[d.nr] || '').trim();
            let body = txt
                ? txt.split(/\n\s*\n/).map(p => `<div>${esc(p.trim()).replace(/\n/g, '<br>')}</div>`).join('')
                : `<div>Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „${esc(d.e)}“ ableitbar.</div>`;
            // Nicht im BRi belegte Zitate sichtbar machen – sie müssen geprüft oder gestrichen werden.
            if (txt) {
                const offen = unbelegteZitate(d.nr, txt);
                if (offen.length) {
                    body += `<div class="zitat-warnung" data-warn="1">⚠ Bitte prüfen: Folgende Passage${offen.length > 1 ? 'n sind' : ' ist'} `
                          + `nicht wörtlich im BRi-Text zu ${esc(d.nr)} belegt – vor dem Versand streichen oder korrigieren: `
                          + offen.map(z => `„${esc(z)}“`).join(' · ') + `</div>`;
                }
            }
            return `<div class="crit" data-nr="${esc(d.nr)}" data-vals="${esc(d.o)}|${esc(d.e)}"><div class="ct">${esc(d.nr)}: ${esc(d.title)}</div><div>Gutachterliche Bewertung: „${esc(d.o)}“</div>${body}</div>`;
        }).join('')
        : `<p>Es wurden keine von der Begutachtung abweichenden Einzelkriterien erfasst.</p>`;

    // „Allgemeine Angaben": bevorzugt der ausformulierte, fallbezogene Text der KI (Absätze).
    // Ohne KI-Text werden die Notizen wie bisher als Stichpunkte übernommen.
    const notesBullets = (allgemeinText && allgemeinText.trim())
        ? allgemeinText.trim().split(/\n\s*\n/).map(a => `<p>${esc(a.trim()).replace(/\n/g, '<br>')}</p>`).join('')
        : (notes
            ? `<ul class="aa">${notes.split(/\r?\n/).filter(l => l.trim()).map(l => `<li>${esc(l.trim())}</li>`).join('')}</ul>`
            : '');

    const dataRow = (k, v) => `<div class="data-row"><span class="k">${esc(k)}</span><span>: ${esc(v || '')}</span></div>`;

    return `<div class="stmt">
    <div class="stmt-head">
      <img class="stmt-logo" src="${FAMILIARA_LOGO}" alt="Familiara">
      <div class="stmt-address">Familiara GmbH<br>Wiesbadener Straße 3<br>12161 Berlin<br><br>Telefon 030 577 015 900<br>Fax 030 577 015 901<br><br>Geschäftsführer: Dr. med. Jörg A. Zimmermann<br><br>HRB 184522 B<br>Amtsgericht Berlin-Charlottenburg<br>Umsatzsteuer-ID: DE311459777<br><br>www.familiara.de<br>kontakt@familiara.de</div>
    </div>

    <div class="stmt-top">
      <div class="left">
        <div>${esc(verf.name)}</div>
        ${verf.zeilen.map(z => `<div>${esc(z)}</div>`).join('')}
      </div>
    </div>

    <h1>Pflegefachliche Stellungnahme</h1>
    <p>auf Grundlage der Richtlinien des Medizinischen Dienstes Bund zur Feststellung der Pflegebedürftigkeit nach dem SGB XI vom 21. Dezember 2023</p>

    <div class="data-block" id="stmt-data">
      ${dataRow('Betreffend', name)}
      ${dataRow('geboren am', geb)}
      ${dataRow('Kasse', kasse)}
      ${dataRow('Versicherungs-Nr.', versnr)}
      ${dataRow('Antragsdatum', antrag !== '__.__.____' ? antrag : '')}
      ${dataRow('Bescheiddatum', bescheid)}
      ${dataRow('Gutachtenorganisation', org)}
      ${dataRow('Begutachtungsdatum', begut)}
      ${dataRow('Durchführungsart', art)}
      ${dataRow('Pflegegrad', origPGTxt)}
      ${dataRow('Gesamtpunkte', origPts)}
    </div>

    <p>${df('name', name)} erhebt Widerspruch gegen den Bescheid vom ${df('bescheid', bescheid || '—')} der ${df('kasse', kasse || 'Kasse')}. Diese pflegefachliche Stellungnahme dient der Unterstützung des Rechtsbeistands von ${df('name', name)} bei der Begründung des Widerspruchs. Dazu habe ich ${df('name', name)} persönlich befragt und Befunde erhoben sowie das Gutachten des ${df('org', org)} vom ${df('begut', begut || '—')} gewürdigt.</p>

    <hr>

    <h2>Allgemeine Angaben</h2>
    <p>Im Gutachten des ${df('org', org)} vom ${df('begut', begut || '—')} erfolgte die Einstufung mit ${df('opts', origPts)} gewichteten Punkten, woraus sich ${istKeinPG(origPG) ? df('opgsatz', 'kein Pflegegrad') : 'ein ' + df('opgsatz', pgSatz(origPG))} ergeben hat. Die Verteilung der gewichteten Punkte auf die einzelnen Module ist der nachfolgenden Übersicht zu entnehmen.</p>
    <div id="stmt-notes" data-sig="${esc(allgemeinSignature(notes, diffs))}" data-ai="${(allgemeinText && allgemeinText.trim()) ? '1' : '0'}">${notesBullets}</div>
    <p>Ich bin in mehreren dieser Module zu abweichenden Einschätzungen gekommen. Dies ergibt eine höhere Punktzahl in den Modulen und in der Folge eine höhere Gesamtpunktzahl. Die nachfolgende Übersicht stellt die Ergebnisse des Vorgutachtens und meiner Beurteilung einander gegenüber:</p>

    <h2>Gegenüberstellung des Gutachtens und der abweichenden Bepunktung</h2>
    <table class="cmp">
      <thead>
        <tr><th rowspan="2">Modul</th><th>Vorgutachten</th><th>Beurteilung</th></tr>
        <tr><th>Gewichtete Punkte</th><th>Gewichtete Punkte</th></tr>
      </thead>
      <tbody id="stmt-cmp-body">${tableRows}</tbody>
    </table>

    <h2>Befund und Stellungnahme</h2>
    <div id="stmt-crit">${critHtml}</div>

    <hr>

    <h2>Fazit</h2>
    <p>Das vorliegende Gutachten des ${df('org', org)} vom ${df('begut', begut || '—')} ${istKeinPG(origPG) ? 'mit der Feststellung ' + df('opgfazit', 'keines Pflegegrades') : 'mit einem ' + df('opgfazit', pgSatz(origPG))} und ${df('opts', origPts)} Punkten berücksichtigt die tatsächlichen Einschränkungen von ${df('name', name)} nicht hinreichend. Unter Berücksichtigung der oben genannten Korrekturen ergibt sich ein Punktwert von ${df('etotal', f2(rE.total))} Gesamtpunkten, der gemäß den Richtlinien ${istKeinPG(rE.pg) ? 'weiterhin ' + df('epgfazit', 'keinen Pflegegrad') : 'den ' + df('epgfazit', pgSatz(rE.pg))} ab dem ${df('antrag', antrag)} (Antragsdatum) rechtfertigt.</p>
  </div>`;
}

// Korrigiert ausschließlich Rechtschreibung/Grammatik/Zeichensetzung (Google-Gemini-Code, unverändert genutzt).
async function correctText(text) {
    const systemPrompt = "Du bist ein professioneller Korrektor für deutschsprachige Texte. Korrigiere ausschließlich Rechtschreibung, Grammatik und Zeichensetzung des dir übergebenen Textes. Ändere weder Inhalt, Bedeutung noch Stil; füge nichts hinzu und lasse nichts weg. Behalte vorhandene Zeilenumbrüche exakt bei. Gib ausschließlich den korrigierten Text zurück – ohne Anführungszeichen, ohne Kommentare, ohne Einleitung.";
    const payload = { contents: [{ role: "user", parts: [{ text: text }] }] };
    const result = await callGeminiWithFallback(payload, systemPrompt);
    const out = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out || !out.trim()) throw new Error("Keine Korrektur erhalten.");
    return out.trim();
}

/* Zitatprüfung: Jedes wörtliche Zitat in einer Begründung muss tatsächlich im BRi-Text des
   jeweiligen Kriteriums stehen. Anweisungen allein genügen nicht – erfundene oder aus anderen
   Kriterien zusammengesetzte Zitate werden hier technisch aufgedeckt und im Dokument markiert. */
function normZitat(s) {
    return (s || '')
        .replace(/[„“”‚‘’"']/g, ' ')
        .replace(/\[[^\]]*\]/g, ' ')     // Einschübe wie [kommt] ignorieren
        .replace(/[\s ]+/g, ' ')
        .replace(/\s*…\s*/g, ' ')
        .toLowerCase().trim();
}

// Wortabgleich mit Toleranz: kleine grammatische Anpassungen eines Zitats (eingeschobenes
// „zwar", umgestellte Verbform, Einschub in eckigen Klammern) gelten weiterhin als belegt.
// Erst wenn ein nennenswerter Teil der Wörter im BRi-Text fehlt, liegt eine eigene Zutat vor.
function zitatGedeckt(zitat, quelle) {
    const woerter = zitat.split(' ')
        .map(w => w.replace(/[^\wäöüß]/gi, ''))
        .filter(w => w.length >= 4);
    if (woerter.length < 3) return true;              // zu kurz für eine belastbare Aussage
    let treffer = 0;
    woerter.forEach(w => {
        // Wortstamm-Toleranz: „Durchführung" gilt auch bei „durchführen" als belegt
        const stamm = w.length >= 7 ? w.slice(0, w.length - 2) : w;
        if (quelle.includes(w) || quelle.includes(stamm)) treffer++;
    });
    return (treffer / woerter.length) >= 0.85;
}

// Liefert alle Zitate einer Begründung, die sich NICHT im BRi-Text des Kriteriums finden.
function unbelegteZitate(nr, text) {
    const b = briFor(nr);
    if (!b || !text) return [];
    let quelle = normZitat(b.definition + ' ' + Object.values(b.levels || {}).join(' '));
    const modul = (typeof BRI_MODULE !== 'undefined') ? BRI_MODULE[nr.split('.').slice(0, 2).join('.')] : null;
    if (modul) quelle += ' ' + normZitat(modul.text);   // Modul-Einleitung zählt als Beleg
    const offen = [];
    const re = /[„"]([^„“”"]{25,})[“”"]/g;              // nur längere Passagen prüfen
    let m;
    while ((m = re.exec(text)) !== null) {
        const roh = m[1].trim();
        const z = normZitat(roh);
        if (!z) continue;
        // Stufenbezeichnungen sind Etiketten, keine Zitate
        if (/^(selbständig|überwiegend (un)?selbständig|unselbständig|unbeeinträchtigt|(fähigkeit )?(größtenteils|in geringem maße|nicht) vorhanden|fähigkeit vorhanden|häufig|selten|täglich|nie oder sehr selten)/.test(z)) continue;
        if (quelle.includes(z)) continue;
        // Teilstücke prüfen: lange Zitate dürfen an Satzgrenzen zusammengesetzt sein
        const teile = z.split(/,| und | oder /).map(t => t.trim()).filter(t => t.length > 30);
        if (teile.length && teile.every(t => quelle.includes(t))) continue;
        if (zitatGedeckt(z, quelle)) continue;      // nur grammatisch angepasst -> in Ordnung
        offen.push(roh.length > 160 ? roh.slice(0, 160) + ' …' : roh);
    }
    return offen;
}

// Beim erneuten Generieren: nur die datengetriebenen Teile (Kopfdaten, Vergleichstabelle,
// abweichende Kriterien, Name/Daten/Kennzahlen im Fließtext) aktualisieren – der vom Nutzer
// geschriebene bzw. bearbeitete Text bleibt vollständig erhalten.
function mergeStellungnahme(existingHtml, freshHtml) {
    const parse = h => { const d = document.createElement('div'); d.innerHTML = h; return d; };
    const cur = parse(existingHtml);
    const fresh = parse(freshHtml);
    // Inline-Datenfelder (Name, Daten, Kennzahlen) anhand von data-f übernehmen
    const vals = {};
    fresh.querySelectorAll('[data-f]').forEach(el => { const k = el.getAttribute('data-f'); if (!(k in vals)) vals[k] = el.innerHTML; });
    cur.querySelectorAll('[data-f]').forEach(el => { const k = el.getAttribute('data-f'); if (k in vals) el.innerHTML = vals[k]; });
    // Reine Datenblöcke komplett ersetzen (Kopfdaten, Vergleichstabelle).
    ['stmt-data', 'stmt-cmp-body'].forEach(id => {
        const f = fresh.querySelector('#' + id), c = cur.querySelector('#' + id);
        if (f && c) c.innerHTML = f.innerHTML;
    });
    // „Allgemeine Angaben": nur ersetzen, wenn sich Notizen oder Abweichungen geändert haben.
    // Sonst bleibt der vorhandene, ggf. überarbeitete Text unangetastet.
    const fN = fresh.querySelector('#stmt-notes'), cN = cur.querySelector('#stmt-notes');
    if (fN && cN) {
        const alt = cN.getAttribute('data-sig'), neu = fN.getAttribute('data-sig');
        const altLeer = !cN.innerHTML.trim();
        // Ersetzen nur, wenn bisher nichts dasteht oder tatsächlich ein neu verfasster
        // KI-Text vorliegt. Scheitert die KI, bleibt der vorhandene Text unangetastet.
        if (altLeer || (fN.getAttribute('data-ai') === '1' && alt !== neu)) {
            cN.innerHTML = fN.innerHTML;
            cN.setAttribute('data-sig', neu);
            cN.setAttribute('data-ai', fN.getAttribute('data-ai') || '0');
        }
    }
    // Begründungsblock kriteriengenau zusammenführen: bereits vorhandene (ggf. von Hand
    // überarbeitete) Begründungen bleiben erhalten, solange sich die Bewertung nicht geändert
    // hat. Neue Abweichungen kommen hinzu, weggefallene verschwinden.
    const fCrit = fresh.querySelector('#stmt-crit'), cCrit = cur.querySelector('#stmt-crit');
    if (fCrit && cCrit) {
        const alt = {};
        cCrit.querySelectorAll('.crit[data-nr]').forEach(el => { alt[el.getAttribute('data-nr')] = el; });
        const neu = document.createElement('div');
        const frischeBloecke = fCrit.querySelectorAll('.crit[data-nr]');
        if (!frischeBloecke.length) {
            cCrit.innerHTML = fCrit.innerHTML;      // keine Abweichungen mehr -> Hinweistext
        } else {
            frischeBloecke.forEach(f => {
                const nr = f.getAttribute('data-nr');
                const a = alt[nr];
                // Unverändert bewertet -> bestehenden Text behalten, sonst neuen übernehmen
                neu.appendChild((a && a.getAttribute('data-vals') === f.getAttribute('data-vals'))
                    ? a.cloneNode(true) : f.cloneNode(true));
            });
            cCrit.innerHTML = neu.innerHTML;
        }
    }
    return cur.innerHTML;
}

// Erzeugt die Stellungnahme im Familiara-Format (gefüllt aus den App-Daten, mit Rechtschreibkorrektur der Notizen).
async function generateAppealText() {
    try {
        injectStellungnahmeCss();

        // Notizen einlesen und – falls vorhanden und API-Schlüssel gesetzt – Rechtschreibung/Grammatik korrigieren
        const notesEl = document.getElementById('erstgespraech-notes');
        if (notesEl) erstgespraechNotes = notesEl.value;
        let notes = (erstgespraechNotes || '').trim();

        const keyPresent = ((document.getElementById('user-api-key')?.value || '').trim() || userApiKey.trim() || apiKey.trim());
        if (notes && keyPresent) {
            showOverlay("Stellungnahme wird erstellt...", "Rechtschreibung & Grammatik werden geprüft");
            try {
                const corrected = await correctText(notes);
                if (corrected) {
                    notes = corrected;
                    erstgespraechNotes = corrected;
                    if (notesEl) notesEl.value = corrected; // korrigierte Fassung auch im Notizfeld übernehmen
                }
            } catch (e) {
                console.warn("Korrektur übersprungen:", e);
                showToast("Rechtschreibprüfung übersprungen (" + e.message + "). Stellungnahme wurde mit Originaltext erstellt.", "error");
            } finally {
                hideOverlay();
            }
        }

        // BRi-gestützte Begründungen zu den abweichenden Kriterien (ein KI-Aufruf für alle).
        // Bereits vorhandene, unverändert bewertete Kriterien werden nicht erneut formuliert –
        // ihr (ggf. überarbeiteter) Text bleibt beim Zusammenführen ohnehin erhalten.
        let begruendungen = {};
        const diffs = computeDiffs();
        const vorhandenEl = document.getElementById('appeal-document');
        const vorhandenHtml = (vorhandenEl && vorhandenEl.innerHTML.trim()) ? vorhandenEl.innerHTML : (appealDraft || '');
        const bereitsDa = {};
        if (vorhandenHtml) {
            const tmp = document.createElement('div'); tmp.innerHTML = vorhandenHtml;
            tmp.querySelectorAll('.crit[data-nr]').forEach(el => { bereitsDa[el.getAttribute('data-nr')] = el.getAttribute('data-vals'); });
        }
        const zuErzeugen = diffs.filter(d => bereitsDa[d.nr] !== `${d.o}|${d.e}`);
        // „Allgemeine Angaben" nur neu verfassen, wenn sie fehlen oder sich Notizen/Abweichungen änderten
        let allgemeinText = '';
        let brauchtAllgemein = true;
        if (vorhandenHtml) {
            const tmp2 = document.createElement('div'); tmp2.innerHTML = vorhandenHtml;
            const n = tmp2.querySelector('#stmt-notes');
            if (n && n.innerHTML.trim() && n.getAttribute('data-sig') === allgemeinSignature(notes, diffs)) brauchtAllgemein = false;
        }
        if ((zuErzeugen.length || brauchtAllgemein) && keyPresent) {
            const was = [];
            if (zuErzeugen.length) was.push(`${zuErzeugen.length} Begründung(en)`);
            if (brauchtAllgemein) was.push('Allgemeine Angaben');
            showOverlay("Stellungnahme wird erstellt...", was.join(' und ') + ' werden verfasst');
            try {
                const erg = await generateBegruendungen(zuErzeugen, brauchtAllgemein);
                begruendungen = erg.map || {};
                allgemeinText = erg.allgemein || '';
            } catch (e) {
                console.warn("Texterstellung übersprungen:", e);
                showToast("Texte konnten nicht erzeugt werden (" + e.message + "). Es werden die Standardtexte verwendet.", "error");
            } finally {
                hideOverlay();
            }
        } else if ((zuErzeugen.length || brauchtAllgemein) && !keyPresent) {
            showToast("Ohne API-Schlüssel werden nur die Standardtexte eingesetzt. Für ausformulierte Begründungen und Allgemeine Angaben bitte oben rechts einen Google-API-Schlüssel eintragen.", "error");
        }

        const fresh = buildStellungnahme(notes, begruendungen, allgemeinText);
        const docEl = document.getElementById('appeal-document');
        const cont = document.getElementById('appeal-result-container');
        // Vorhandenen (ggf. vom Nutzer bearbeiteten) Stand ermitteln
        const existing = (docEl && docEl.innerHTML.trim()) ? docEl.innerHTML : (appealDraft || '');
        let finalHtml, merged = false;
        // Nur mergen, wenn bereits eine Stellungnahme im neuen Format (mit Markern) vorliegt
        if (existing.trim() && /data-f=|id="stmt-(data|crit|cmp-body)"/.test(existing)) {
            finalHtml = mergeStellungnahme(existing, fresh); // Text erhalten, nur Daten aktualisieren
            merged = true;
        } else {
            finalHtml = fresh;
        }
        appealDraft = finalHtml;
        if (docEl) docEl.innerHTML = finalHtml;
        if (cont) cont.style.display = 'block';
        // Auf nicht belegte BRi-Zitate hinweisen – die müssen vor dem Versand geprüft werden.
        const warnAnzahl = (docEl ? docEl.querySelectorAll('.zitat-warnung[data-warn]').length : 0);
        if (warnAnzahl) {
            showToast(`Achtung: In ${warnAnzahl} Begründung${warnAnzahl > 1 ? 'en' : ''} steht ein Zitat, das sich nicht wörtlich in den BRi belegen lässt. Die Stellen sind rot markiert – bitte streichen oder korrigieren.`, "error");
        } else {
            showToast(merged
                ? "Aktualisiert – Ihre Ergänzungen wurden beibehalten, nur die Falldaten wurden erneuert."
                : "Stellungnahme im Familiara-Format erstellt. Alle BRi-Zitate sind belegt.", "success");
        }
        if (docEl) docEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        hideOverlay();
        console.warn(e);
        showToast("Fehler bei der Erstellung: " + e.message, "error");
    }
}

function copyAppealText() {
    const docEl = document.getElementById('appeal-document');
    const text = docEl ? docEl.innerText : '';
    if (!text.trim()) { showToast("Bitte zuerst die Stellungnahme erstellen.", "error"); return; }
    const done = () => showToast("Stellungnahme in die Zwischenablage kopiert!", "success");
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { showToast("Kopieren nicht möglich. Bitte Text manuell markieren.", "error"); }
        document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else { fallback(); }
}

/* Word-Dokument erzeugen: bearbeitbar in Word und in Google Docs (dort hochladen und öffnen).
   Enthält Seitenzahlen in der Fußzeile und weder Erstellungsdatum noch Adresszeile des Browsers. */
function exportAppealWord() {
    const docEl = document.getElementById('appeal-document');
    if (!docEl || !docEl.innerHTML.trim()) { showToast("Bitte zuerst die Stellungnahme erstellen.", "error"); return; }
    // Arbeitshinweise zu ungeprüften Zitaten gehören nicht ins fertige Dokument
    const kopie = docEl.cloneNode(true);
    kopie.querySelectorAll('.zitat-warnung').forEach(el => el.remove());

    const name = (document.getElementById('stam-betreffend')?.value || 'Stellungnahme').trim();
    const dateiname = 'Pflegefachliche Stellungnahme - ' + name.replace(/[\\/:*?"<>|]/g, '') + '.doc';

    // Word-eigene Formatvorlagen: Seitenränder, Fußzeile mit Seitenzahl, Calibri als Standard
    const wordCss = `
@page Section1 { size:21cm 29.7cm; margin:2cm 2cm 2cm 2cm; mso-page-numbers:1;
                 mso-footer:f1; mso-footer-margin:1.2cm; }
div.Section1 { page:Section1; }
p.MsoFooter, li.MsoFooter, div.MsoFooter { margin:0cm; font-family:Calibri,sans-serif; font-size:9.0pt; text-align:center; color:#555; }
body { font-family:Calibri,'Segoe UI',sans-serif; font-size:11.0pt; }
${STELLUNGNAHME_CSS.replace(/\.stmt \.zitat-warnung\{[^}]*\}/g, '').replace(/@media print\{\.stmt \.zitat-warnung\{[^}]*\}\}/g, '')}
#appeal-document, .stmt { max-width:none; border:none; border-radius:0; padding:0; margin:0; }
`;
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
        + 'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
        + '<head><meta charset="utf-8">'
        + '<title>Pflegefachliche Stellungnahme</title>'
        + '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>'
        + '<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->'
        + '<style>' + wordCss + '</style></head><body>'
        + '<div class="Section1"><div id="appeal-document">' + kopie.innerHTML + '</div></div>'
        // Fußzeile mit fortlaufender Seitenzahl (Word-Feldfunktion)
        + '<div style="mso-element:footer" id="f1"><p class="MsoFooter">'
        + 'Seite <span style="mso-field-code: PAGE "></span> von <span style="mso-field-code: NUMPAGES "></span>'
        + '</p></div>'
        + '</body></html>';

    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = dateiname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('Word-Dokument gespeichert. Es lässt sich in Word bearbeiten oder in Google Drive hochladen und dort als Google-Dokument öffnen.', 'success');
}

function printAppealText() {
    const docEl = document.getElementById('appeal-document');
    if (!docEl || !docEl.innerHTML.trim()) { showToast("Bitte zuerst die Stellungnahme erstellen.", "error"); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast("Druckfenster wurde blockiert. Bitte Pop-ups für diese Seite erlauben.", "error");
        return;
    }
    const title = escapeHtml(document.getElementById('stam-betreffend').value || 'Stellungnahme');
    const kopie = docEl.cloneNode(true);
    kopie.querySelectorAll('.zitat-warnung').forEach(el => el.remove());
    printWindow.document.write(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Pflegefachliche Stellungnahme - ${title}</title><style>${STELLUNGNAHME_CSS}
        body{margin:0;}
        #appeal-document, .stmt{max-width:none;border:none;border-radius:0;}
        #appeal-document{padding:0;}
        body{padding:16mm 15mm;}
        @page{margin:14mm;}
    </style></head><body><div id="appeal-document">${kopie.innerHTML}</div><script>window.onload=function(){window.print();}<\/script></body></html>`);
    printWindow.document.close();
}

