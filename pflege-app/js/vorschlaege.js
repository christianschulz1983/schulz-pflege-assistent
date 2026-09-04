// Teil des Pflegegradassistenten für Berater. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
function briFor(nr) { return (typeof BRI_KRITERIEN !== 'undefined') ? BRI_KRITERIEN[nr] : null; }
// BRi-Ausprägung zum Options-Index (Reihenfolge im BRi = Reihenfolge der Skala)
function briLevel(nr, idx) {
    const b = briFor(nr);
    if (!b || !b.levels) return null;
    const keys = Object.keys(b.levels);
    if (idx == null || idx < 0 || idx >= keys.length) return null;
    return { name: keys[idx], text: b.levels[keys[idx]] };
}

/* ============ Weitere Widerspruchspunkte aus Notizen und Befund vorschlagen ============
   Die Anzahl der Widerspruchspunkte hängt daran, wie viele Kriterien abweichend bewertet sind.
   Diese Funktion prüft alle noch NICHT abweichenden Kriterien gegen Notizen, Befund und Anamnese
   und schlägt vor, wo das Material eine höhere Bewertung trägt. Übernommen wird nur, was der
   Nutzer bestätigt.                                                                          */
let vorschlagListe = [];

// Alle Kriterien, die aktuell genauso wie im Vorgutachten bewertet sind und noch Luft nach oben haben.
function sammleKandidaten() {
    const out = [];
    ITEMS.forEach(i => {
        if (!i.m || !i.opts) return;
        const vO = stateOrig.values[i.id];
        const vE = stateEigene.values[i.id];
        if (i.m === 5 && i.group !== 'D') return;          // Häufigkeitskriterien hier auslassen
        if (typeof vO !== 'number' || typeof vE !== 'number') return;
        if (vO !== vE) return;                              // weicht bereits ab
        if (vO >= i.opts.length - 1) return;                // schon höchste Stufe
        out.push(i);
    });
    return out;
}

function buildVorschlagPrompt(kand) {
    const cut = (s, n) => (s && s.length > n) ? s.slice(0, n) + ' …' : (s || '');
    const notizen = (erstgespraechNotes || '').trim();
    const befund = (document.getElementById('stam-befund')?.value || '').trim();
    const anam = (document.getElementById('stam-anamnese')?.value || '').trim();
    let p = 'MEINE NOTIZEN AUS DEM ERSTGESPRÄCH (wichtigste Quelle):\n' + (notizen ? cut(notizen, 6000) : '(keine)') + '\n\n';
    if (befund) p += 'BEFUND – EIGENER TEXT DES GUTACHTERS:\n' + cut(befund, 5000) + '\n\n';
    if (anam) p += 'ANAMNESE – EIGENER TEXT DES GUTACHTERS:\n' + cut(anam, 3000) + '\n\n';
    p += 'ZU PRÜFENDE KRITERIEN (aktuell genauso bewertet wie im Gutachten):\n\n';
    kand.forEach(i => {
        const vO = stateOrig.values[i.id];
        const lh = (typeof LAIEN_HINWEISE !== 'undefined') ? LAIEN_HINWEISE[i.nr] : null;
        p += `${i.nr} ${i.title} | derzeit: „${expandLabel(i.opts[vO])}" | mögliche höhere Stufen: `
           + i.opts.slice(vO + 1).map((o, k) => `${vO + 1 + k}=„${expandLabel(o)}"`).join(', ') + '\n';
        if (lh) {
            if (lh.check) p += `   Prüffrage: ${cut(lh.check, 240)}\n`;
            if (lh.hilfsmittel) p += `   Hilfsmittel-Regel: ${cut(lh.hilfsmittel, 240)}\n`;
            if (lh.wichtig) p += `   Achtung: ${cut(lh.wichtig, 300)}\n`;
        }
        p += '\n';
    });
    return p;
}

async function schlageWiderspruchspunkteVor() {
    const keyPresent = ((document.getElementById('user-api-key')?.value || '').trim() || userApiKey.trim() || apiKey.trim());
    if (!keyPresent) { showToast('Dafür wird ein Google-API-Schlüssel benötigt – bitte oben rechts eintragen.', 'error'); return; }
    const notizen = (erstgespraechNotes || '').trim();
    const befund = (document.getElementById('stam-befund')?.value || '').trim();
    if (!notizen && !befund) {
        showToast('Bitte zuerst Notizen aus dem Erstgespräch oder den Befund erfassen – darauf stützt sich die Prüfung.', 'error');
        return;
    }
    const kand = sammleKandidaten();
    if (!kand.length) { showToast('Alle Kriterien weichen bereits ab oder stehen auf der höchsten Stufe.', 'success'); return; }

    const systemPrompt = `Du bist ein erfahrener Pflegeberater und prüfst ein Pflegegutachten (NBA, SGB XI) auf übersehene Einschränkungen.

Dir werden die Notizen des Pflegeberaters aus dem Erstgespräch sowie Befund und Anamnese des Gutachters vorgelegt, dazu eine Liste von Kriterien, die derzeit genauso bewertet sind wie im Gutachten.

Aufgabe: Nenne ausschließlich jene Kriterien, für die das vorgelegte Material eine HÖHERE Bewertung tatsächlich trägt.

Zwingende Regeln:
1. Stütze jeden Vorschlag auf eine konkrete Stelle im Material. Gib diese Stelle im Feld "fundstelle" wörtlich wieder (kurzes Zitat aus Notizen, Befund oder Anamnese). Ohne belegbare Stelle KEIN Vorschlag.
2. Erfinde nichts. Schlussfolgere nur, was das Material hergibt. Lieber wenige belastbare Vorschläge als viele schwache.
3. Beachte die mitgelieferte Hilfsmittel-Regel: Führt ein Hilfsmittel laut Regel zu „selbständig", ist seine bloße Nutzung KEIN Grund für eine höhere Stufe.
4. Beachte die Hinweise unter „Achtung" – sie benennen Abgrenzungen und Ausschlüsse. Ein Vorschlag, der ihnen widerspricht, ist unzulässig.
5. Denke in Zusammenhängen: Belegt das Material eine Einschränkung, wirkt sie sich oft auf mehrere Kriterien aus (etwa Erinnerungsbedarf auf Termine, Tagesstruktur und Medikation). Prüfe solche Ketten, aber nur, wenn sie fachlich tragen.
6. "stufe" ist der Zahlenindex der vorgeschlagenen Stufe aus der Liste der möglichen höheren Stufen. Er muss höher sein als die derzeitige Bewertung.
7. "begruendung" ist ein bis zwei Sätze: warum diese Stufe fachlich zutrifft.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            vorschlaege: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        nr: { type: "STRING" },
                        stufe: { type: "INTEGER" },
                        begruendung: { type: "STRING" },
                        fundstelle: { type: "STRING" }
                    },
                    required: ["nr", "stufe", "begruendung", "fundstelle"]
                }
            }
        },
        required: ["vorschlaege"]
    };

    showOverlay('Widerspruchspunkte werden gesucht...', `${kand.length} Kriterien werden gegen Ihre Notizen und den Befund geprüft`);
    try {
        const payload = {
            contents: [{ role: "user", parts: [{ text: buildVorschlagPrompt(kand) }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema }
        };
        const res = await callGeminiWithFallback(payload, systemPrompt);
        let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!txt) throw new Error('Keine Antwort der KI erhalten.');
        const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) txt = fence[1];
        const data = JSON.parse(txt.trim());
        // Nur plausible Vorschläge behalten: bekanntes Kriterium, echte Höherstufung
        vorschlagListe = (data.vorschlaege || []).map(v => {
            const item = ITEMS.find(i => i.nr === v.nr);
            if (!item || !item.opts) return null;
            const vO = stateOrig.values[item.id];
            const stufe = parseInt(v.stufe, 10);
            if (!(stufe > vO) || stufe > item.opts.length - 1) return null;
            return { item, stufe, alt: vO, begruendung: (v.begruendung || '').trim(), fundstelle: (v.fundstelle || '').trim() };
        }).filter(Boolean);
        hideOverlay();
        renderVorschlaege();
    } catch (e) {
        hideOverlay();
        console.warn('Vorschläge fehlgeschlagen:', e);
        showToast('Die Prüfung ist fehlgeschlagen: ' + e.message, 'error');
    }
}

function renderVorschlaege() {
    const box = document.getElementById('vorschlag-body');
    if (!vorschlagListe.length) {
        box.innerHTML = '<div class="vs-leer">Aus den Notizen, dem Befund und der Anamnese lässt sich derzeit keine weitere Höherbewertung belastbar begründen. '
                      + 'Ergänzen Sie gegebenenfalls Ihre Notizen und starten Sie die Prüfung erneut.</div>';
    } else {
        // Nichts ist vorausgewählt: die App aendert von sich aus keine Bewertung.
        // Uebernommen wird ausschliesslich, was der Berater ausdruecklich anhakt.
        box.innerHTML = `<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px">`
            + `${vorschlagListe.length} Vorschlag${vorschlagListe.length > 1 ? 'e' : ''} – bitte fachlich prüfen. `
            + `<b>Nichts ist vorausgewählt.</b> Übernommen wird nur, was Sie anhaken; ohne Haken bleibt jede Bewertung unverändert.</p>`
            + vorschlagListe.map((v, idx) => `
            <label class="vs-item">
                <input type="checkbox" data-idx="${idx}">
                <div style="flex:1">
                    <div class="vs-nr">${escapeHtml(v.item.nr)}</div>
                    <div class="vs-titel">${escapeHtml(v.item.title)}</div>
                    <div class="vs-wert">Gutachten: „${escapeHtml(expandLabel(v.item.opts[v.alt]))}" &nbsp;→&nbsp; Vorschlag: <b>„${escapeHtml(expandLabel(v.item.opts[v.stufe]))}"</b></div>
                    <div class="vs-grund">${escapeHtml(v.begruendung)}</div>
                    ${v.fundstelle ? `<div class="vs-fund">Fundstelle: „${escapeHtml(v.fundstelle)}“</div>` : ''}
                </div>
            </label>`).join('');
    }
    document.getElementById('vorschlag-overlay').classList.add('active');
}

function closeVorschlaege() {
    document.getElementById('vorschlag-overlay').classList.remove('active');
}

function uebernehmeVorschlaege() {
    const boxen = document.querySelectorAll('#vorschlag-body input[type="checkbox"]');
    let n = 0;
    boxen.forEach(cb => {
        if (!cb.checked) return;
        const v = vorschlagListe[parseInt(cb.getAttribute('data-idx'), 10)];
        if (!v) return;
        setzeBewertung('own', v.item.id, v.stufe, 'vorschlag');
        n++;
    });
    closeVorschlaege();
    if (!n) { showToast('Es wurde nichts ausgewählt – die Bewertungen bleiben unverändert.', 'error'); return; }
    fillTable('own');
    calculate('own');
    showToast(`${n} Bewertung${n > 1 ? 'en' : ''} übernommen. Bitte in der Liste prüfen und anschließend die Stellungnahme neu erstellen.`, 'success');
}

// Kennung für den Abschnitt „Allgemeine Angaben": ändert sich, sobald sich die Notizen oder
// die Abweichungen ändern. Nur dann wird der Abschnitt neu verfasst – sonst bleibt der
// vorhandene (ggf. von Hand überarbeitete) Text erhalten.
function allgemeinSignature(notes, diffs) {
    const basis = (notes || '').trim() + '||' + (diffs || []).map(d => `${d.nr}:${d.o}>${d.e}`).sort().join(',');
    let h = 5381;
    for (let i = 0; i < basis.length; i++) { h = ((h * 33) ^ basis.charCodeAt(i)) >>> 0; }
    return 'a' + h.toString(36);
}

// Modul 5: Die Kriterien 4.5.1 bis 4.5.14 werden über Häufigkeiten erfasst. Wurde keine
// Maßnahme festgestellt, darf im erzeugten Schriftstück NICHT „0x pro Woche" stehen – das
// läse sich wie eine erhobene Bewertung. Nach der BRi entfällt das Kriterium dann oder die
// versicherte Person ist selbständig; genau das wird ausgewiesen.
const M5_KEINE_WERTUNG = 'entfällt oder selbständig';

function m5OhneWertungMoeglich(nr) {
    const t = /^4\.5\.(\d+)$/.exec(nr || '');
    if (!t) return false;
    const n = Number(t[1]);
    return n >= 1 && n <= 14;
}

// Häufigkeit als Text für das Schriftstück. Dezimalwerte (etwa aus „im Quartal")
// werden mit Komma geschrieben, wie im Deutschen üblich.
function m5HaeufigkeitText(nr, wert) {
    const o = (wert && typeof wert === 'object') ? wert : { count: 0, period: 'W' };
    const anzahl = Number(o.count) || 0;
    if (anzahl === 0 && m5OhneWertungMoeglich(nr)) return M5_KEINE_WERTUNG;
    const zahl = String(anzahl).replace('.', ',');
    return zahl + 'x pro ' + (o.period === 'D' ? 'Tag' : o.period === 'W' ? 'Woche' : 'Monat');
}

/* WAS EINE ÄNDERUNG IN MODUL 5 TATSÄCHLICH BEWIRKT.
   Modul 5 wird je Gruppe gewertet, nicht je Kriterium, und die gewichteten Punkte
   liegen in breiten Spannen. Deshalb kann ein Kriterium sich ändern, ohne dass die
   Punkte des Moduls sich bewegen. Ohne diese Erklärung liest sich das Schriftstück
   widersprüchlich: Es wird für ein Kriterium argumentiert, und die Punktzahl bleibt
   gleich. Der Satz wird GERECHNET, nicht von der KI verfasst.
   von/nach sind Bewertungsstände ('orig' | 'zweit' | 'own'). */
function m5WirkungSatz(nr, von, nach) {
    const item = ITEMS.find(i => i.nr === nr);
    if (!item || item.m !== 5) return '';
    const stV = zustandZu(von), stN = zustandZu(nach);
    const gV = m5Gruppen(stV), gN = m5Gruppen(stN);
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    const grp = item.group;
    const einzelV = gV.gesamt, einzelN = gN.gesamt;
    const gewV = m5Gewichtet(einzelV), gewN = m5Gewichtet(einzelN);

    let s = '';
    if (grp !== 'D') {
        s += 'Die Kriterien ' + M5_BEREICHE[grp] + ' werden nach den Begutachtungs-Richtlinien '
           + 'nicht einzeln, sondern als Gruppe gewertet. ';
        if (gV[grp].pkt !== gN[grp].pkt) {
            s += 'Die Gruppe kommt damit auf ' + gN[grp].pkt + ' statt ' + gV[grp].pkt + ' Einzelpunkte. ';
        } else {
            s += 'Die Gruppe bleibt damit bei ' + gN[grp].pkt + ' Einzelpunkten. ';
        }
    }
    if (einzelV !== einzelN) {
        s += 'Modul 5 erreicht ' + einzelN + ' statt ' + einzelV + ' Einzelpunkte';
    } else {
        s += 'Modul 5 bleibt bei ' + einzelN + ' Einzelpunkten';
    }
    if (gewV !== gewN) {
        s += '; die gewichteten Punkte ändern sich damit von ' + f2(gewV) + ' auf ' + f2(gewN) + '.';
    } else {
        // Das ist der Fall, der ohne Erklärung wie ein Rechenfehler aussieht.
        s += '. Die gewichteten Punkte bleiben bei ' + f2(gewN) + ', weil beide Werte in dieselbe '
           + 'Bewertungsspanne der Richtlinien fallen (' + m5SpannenText(einzelN) + ').';
    }
    return s;
}

// Alle Abweichungen Vorgutachten <-> eigene Einschätzung ermitteln
function computeDiffs() {
    const diffs = [];
    ITEMS.forEach(i => {
        if (!i.m) return;                       // Sonderbedarf (id 0) auslassen
        const vO = stateOrig.values[i.id];
        const vE = stateEigene.values[i.id];
        if (i.m === 5 && i.group !== 'D') {
            const oO = (vO && typeof vO === 'object') ? vO : { count: 0, period: 'W' };
            const oE = (vE && typeof vE === 'object') ? vE : { count: 0, period: 'W' };
            if (oO.count !== oE.count || oO.period !== oE.period) {
                diffs.push({ id: i.id, m: i.m, nr: i.nr, title: i.title,
                             o: m5HaeufigkeitText(i.nr, oO), e: m5HaeufigkeitText(i.nr, oE),
                             oIdx: null, eIdx: null });
            }
        } else if (i.opts) {
            if (vO !== vE) {
                diffs.push({ id: i.id, m: i.m, nr: i.nr, title: i.title,
                             o: expandLabel(i.opts[vO] || '—'), e: expandLabel(i.opts[vE] || '—'),
                             oIdx: (typeof vO === 'number' ? vO : null), eIdx: (typeof vE === 'number' ? vE : null) });
            }
        }
    });
    return diffs;
}

// Baut die Aufgabenbeschreibung für die KI (BRi-Texte + Quervergleichs-Material + Stil).
// mitAllgemein = zusätzlich den einleitenden Abschnitt "Allgemeine Angaben" verfassen.
/* Aufgabenstellung für den einleitenden Abschnitt. Er hat je nach Vorgangsart einen
   anderen Zweck – und in KEINEM Fall die Aufgabe, die Bewertung zu begründen. Das
   geschieht weiter unten, kriteriumsweise, mit Richtlinienbezug. */
function allgemeinAufgabe(vorgang) {
    const titel = (vorgang === 'widerspruch' || vorgang === 'anhoerung') ? 'Allgemeine Angaben' : 'Anamnese';
    const gemeinsam = `ZUSÄTZLICHE AUFGABE – Abschnitt „${titel}":\n`
        + laengenVorgabeAllgemein(titel) + '\n'
        + `Zusammenhängender Fließtext, 2 bis 3 knappe Absätze (durch Leerzeile getrennt),\n`
        + 'KEINE Aufzählungszeichen, individuell auf diesen Fall bezogen.\n'
        + 'ZWINGEND: Er baut auf MEINEN NOTIZEN auf. Übernimm deren Feststellungen und forme die\n'
        + 'Stichpunkte zu Fließtext aus, ohne Inhalte zu verändern oder hinzuzuerfinden.\n';

    // Diese Sperre ist der Kern der Änderung: keine Begründung, keine Richtlinien, keine Stufen.
    const sperre = 'STRENG VERBOTEN in diesem Abschnitt – all das gehört ausschließlich in den\n'
        + 'Abschnitt „Befund und Stellungnahme":\n'
        + '- jede Begründung, warum eine andere Wertung richtig wäre\n'
        + '- jeder Bezug auf die Begutachtungs-Richtlinien und jedes Zitat daraus\n'
        + '- jede Stufenbezeichnung („überwiegend selbständig" und dergleichen)\n'
        + '- jeder Ableitungssatz („… ist somit eine Wertung mit … ableitbar")\n'
        + '- das Abzählen einzelner Kriterien und jede Punktzahlen-Zusammenfassung\n'
        + 'Beginne NICHT mit „Im Gutachten des … erfolgte die Einstufung …".\n\n';

    if (vorgang === 'erstantrag' || vorgang === 'hoeherstufung') {
        return gemeinsam
            + `ZWECK: Eine knappe DARSTELLUNG DER AKTUELLEN PFLEGESITUATION. Wer den Abschnitt\n`
            + 'liest, soll in wenigen Sätzen wissen, wie die versicherte Person lebt und wobei sie\n'
            + 'Unterstützung braucht. Nenne thematisch gebündelt:\n'
            + '- die tragenden gesundheitlichen Einschränkungen und ihren Verlauf\n'
            + '- wer wie oft unterstützt (Angehörige, Pflegedienst) und wobei\n'
            + (vorgang === 'hoeherstufung'
                ? '- was sich seit der letzten Begutachtung verschlechtert hat, seit wann und wodurch\n'
                : '- welche Versorgung derzeit sichergestellt ist und wo sie an Grenzen stößt\n')
            + sperre;
    }

    return gemeinsam
        + `ZWECK: Das AUFZEIGEN VON LÜCKEN UND WIDERSPRÜCHEN im Gutachten – mehr nicht.\n`
        + 'Wer den Abschnitt liest, soll in wenigen Sätzen erkennen, wo das Gutachten\n'
        + 'unvollständig oder in sich widersprüchlich ist. Nenne thematisch gebündelt:\n'
        + '- innere Widersprüche: was der Gutachter im Befundtext selbst feststellt, in der\n'
        + '  Bewertung aber nicht berücksichtigt\n'
        + '- Lücken: was nicht erhoben, nicht praktisch erprobt, nicht erfragt wurde – dazu\n'
        + '  eine zu kurze Begutachtungsdauer, wenn sie im Material genannt ist\n'
        + '- übergangene Angaben der versicherten Person oder der Pflegeperson aus meinen Notizen\n'
        + 'Bündele nach Themen (etwa Mobilität, Selbstversorgung, psychische Situation), nicht\n'
        + 'nach Kriterien. Keine meiner Notizen darf unter den Tisch fallen: Was dort steht und\n'
        + 'keinem einzelnen Kriterium zuzuordnen ist, gehört hierher.\n'
        + sperre;
}

function buildBegruendungPrompt(diffs, mitAllgemein) {
    const cut = (s, n) => (s && s.length > n) ? s.slice(0, n) + ' …' : (s || '');
    let p = '';
    const vName = (document.getElementById('stam-betreffend')?.value || '').trim();
    const vOrg = (document.getElementById('stam-organisation')?.value || '').trim();
    if (vName) p += `VERSICHERTE PERSON: ${vName}\n`;
    if (vOrg) p += `PRÜFORGANISATION: ${vOrg}\n`;
    // Die eigenen Notizen sind die Hauptquelle und stehen deshalb ganz am Anfang.
    const notizen = (document.getElementById('erstgespraech-notes')?.value || '').trim();
    if (notizen) {
        p += '\n==================== HAUPTQUELLE ====================\n'
           + 'MEINE EIGENEN FESTSTELLUNGEN AUS DEM ERSTGESPRÄCH\n'
           + 'Dies ist die inhaltliche Grundlage des gesamten Widerspruchs. Alles Folgende dient nur\n'
           + 'dazu, diese Feststellungen zu stützen. Die Aufzeichnungen sind häufig stichpunktartig –\n'
           + 'forme sie zu vollständigem Fließtext aus, ohne den Inhalt zu verändern:\n\n'
           + cut(notizen, 6000) + '\n'
           + '=====================================================\n\n';
    } else {
        p += '\nHINWEIS: Es liegen keine eigenen Notizen aus dem Erstgespräch vor. Begründe daher\n'
           + 'ausschließlich aus dem Befundtext des Gutachters und den BRi-Texten.\n\n';
    }
    p += 'ABWEICHENDE KRITERIEN (hierzu je eine Begründung schreiben):\n\n';
    diffs.forEach(d => {
        const b = briFor(d.nr);
        p += `--- Kriterium ${d.nr}: ${d.title} (Modul ${d.m}) ---\n`;
        p += `Bewertung des Gutachters: „${d.o}"\nMeine Bewertung: „${d.e}"\n`;
        p += `Stufenbezeichnungen: verwende ausschließlich „${d.o}" und „${d.e}" – keine anderen Wörter für diese Stufen.\n`;
        if (d.m === 5) {
            // Ohne diesen Hinweis behauptet die KI regelmäßig einen Punktgewinn, den es
            // wegen der Gruppenwertung gar nicht gibt.
            p += 'ACHTUNG MODUL 5: Dieses Kriterium wird NICHT einzeln bepunktet. Die Häufigkeiten\n'
               + 'der Gruppe werden zuerst zusammengezählt, dann erhält die GRUPPE einen Punktwert.\n'
               + 'Nenne deshalb KEINE Punktzahl und behaupte KEINEN Punktgewinn für dieses Kriterium.\n'
               + 'Begründe ausschließlich fachlich, warum die Maßnahme in dieser Häufigkeit zu werten\n'
               + 'ist oder nicht zu werten ist. Die rechnerische Auswirkung ergänzt die App selbst.\n';
        }
        if (b) {
            p += `BRi-Definition: ${cut(b.definition, 1400)}\n`;
            const lo = briLevel(d.nr, d.oIdx), le = briLevel(d.nr, d.eIdx);
            if (lo) p += `BRi-Text zur Bewertung des Gutachters ("${lo.name}"): ${cut(lo.text, 700)}\n`;
            if (le) p += `BRi-Text zu meiner Bewertung ("${le.name}"): ${cut(le.text, 700)}\n`;
        }
        // Praxishinweise: verhindern typische Bewertungsfehler (Hilfsmittel, Abgrenzung)
        const lh = (typeof LAIEN_HINWEISE !== 'undefined') ? LAIEN_HINWEISE[d.nr] : null;
        if (lh) {
            if (lh.check) p += `Prüffrage zu diesem Kriterium: ${lh.check}\n`;
            if (lh.hilfsmittel) p += `HILFSMITTEL-REGEL (zwingend beachten): ${lh.hilfsmittel}\n`;
            if (lh.wichtig) p += `WICHTIG / FEHLERQUELLE (zwingend beachten): ${lh.wichtig}\n`;
            if (Array.isArray(lh.stufen)) {
                if (d.oIdx != null && lh.stufen[d.oIdx]) p += `Praxisbeschreibung der Bewertung des Gutachters: ${lh.stufen[d.oIdx]}\n`;
                if (d.eIdx != null && lh.stufen[d.eIdx]) p += `Praxisbeschreibung meiner Bewertung: ${lh.stufen[d.eIdx]}\n`;
            }
        }
        p += '\n';
    });
    // Quervergleich: Kriterien, in denen der Gutachter selbst schon eine Einschränkung sah
    const diffNrs = new Set(diffs.map(d => d.nr));
    let quer = '';
    ITEMS.forEach(i => {
        if (!i.m || !i.opts || diffNrs.has(i.nr)) return;
        const vO = stateOrig.values[i.id];
        if (typeof vO !== 'number' || vO <= 0) return;   // nur anerkannte Einschränkungen
        const lv = briLevel(i.nr, vO);
        quer += `- ${i.nr} ${i.title}: Gutachter wertet „${expandLabel(i.opts[vO])}"`
             + (lv ? `. BRi-Text dazu: ${cut(lv.text, 450)}` : '') + '\n';
    });
    if (quer) {
        p += 'VOM GUTACHTER BEREITS ANERKANNTE EINSCHRÄNKUNGEN (Material für Quervergleiche –\n'
           + 'nutze diese, um Widersprüche in der Bewertung aufzuzeigen):\n' + quer + '\n';
    }
    const befund = (document.getElementById('stam-befund')?.value || '').trim();
    const anam = (document.getElementById('stam-anamnese')?.value || '').trim();
    if (befund) p += 'BEFUND – EIGENER TEXT DES GUTACHTERS (ergänzende Quelle: hier nach Feststellungen\n'
                   + 'suchen, die meine Notizen bestätigen oder der Bewertung des Gutachters widersprechen):\n'
                   + cut(befund, 5000) + '\n\n';
    if (anam) p += 'ANAMNESE – ebenfalls eigener Text des Gutachters:\n' + cut(anam, 2500) + '\n\n';
    if (mitAllgemein) {
        // Modulweiser Überblick als Grundlage für den einleitenden Abschnitt
        const rO = calculateInternal('orig'), rE = calculateInternal('own');
        const mN = ['Mobilität', 'Kognitive und kommunikative Fähigkeiten', 'Verhaltensweisen und psychische Problemlagen',
                    'Selbstversorgung', 'Krankheits- und therapiebedingte Anforderungen', 'Gestaltung des Alltagslebens'];
        // Als abweichend gilt ein Modul, sobald darin ein Kriterium abweicht – die gewichteten
        // Punkte allein genügen nicht, da sie trotz geänderter Kriterien gleich bleiben können.
        const modMitDiff = new Set(diffs.map(d => d.m));
        let mo = '';
        for (let m = 1; m <= 6; m++) {
            const a = rO.weights[m - 1], b = rE.weights[m - 1];
            const anz = diffs.filter(d => d.m === m).length;
            mo += `- Modul ${m} (${mN[m - 1]}): Gutachten ${a.toFixed(2)} / meine Einschätzung ${b.toFixed(2)}`
                + (modMitDiff.has(m) ? `  <-- abweichend, ${anz} Kriterium/Kriterien\n` : '\n');
        }
        p += 'MODULÜBERSICHT (gewichtete Punkte):\n' + mo
           + `Gesamt: Gutachten ${rO.total.toFixed(2)} (${rO.pg ? 'Pflegegrad ' + rO.pg : 'kein Pflegegrad'}) / meine Einschätzung `
           + `${rE.total.toFixed(2)} (${rE.pg ? 'Pflegegrad ' + rE.pg : 'kein Pflegegrad'})\n\n`;
        p += allgemeinAufgabe((typeof appModus !== 'undefined') ? appModus : 'widerspruch');
    }
    return p;
}

// Begründungen für Höherstufungsantrag und Erstantrag. Kein Vorwurf an den Gutachter,
// sondern Darstellung der Veränderung beziehungsweise des bestehenden Hilfebedarfs.
async function generateBegruendungenAntrag(diffs, mitAllgemein, vorgang) {
    const hoeher = (vorgang === 'hoeherstufung');
    const verschlechterung = (typeof erfassungExtra !== 'undefined' && erfassungExtra.verschlechterung) || '';

    const systemPrompt = `Du bist ein erfahrener Pflegeberater und verfasst die Begründungen für ${hoeher
        ? 'einen Antrag auf Höherstufung des Pflegegrades' : 'einen Erstantrag auf einen Pflegegrad'} (NBA, SGB XI).

WICHTIG – anderer Charakter als ein Widerspruch:
${hoeher
    ? 'Das Vorgutachten war zum damaligen Zeitpunkt möglicherweise zutreffend. Kritisiere den Gutachter NICHT '
    + 'und wirf ihm keine Fehler vor. Begründe ausschließlich über die VERÄNDERUNG: Was hat sich seit der '
    + 'Begutachtung verschlechtert, wodurch, und welcher zusätzliche personelle Unterstützungsbedarf ist daraus '
    + 'entstanden?' + (verschlechterung ? ' Anlass der Verschlechterung laut Angabe: ' + verschlechterung : '')
    : 'Es liegt noch kein Gutachten vor. Stelle den bestehenden Hilfebedarf sachlich und erstmalig dar. '
    + 'Es gibt keine fremde Bewertung, die du angreifen könntest.'}

Schreibe zu JEDEM Kriterium eine Begründung im Stil der folgenden Beispiele des Verfassers – übernimm Aufbau,
Ton und Wortwahl, nicht aber die Kritik am Gutachter:

=== STILBEISPIELE DES VERFASSERS ===
${getStilBeispiele()}
=== ENDE STILBEISPIELE ===

RANGFOLGE DER QUELLEN:
1. Meine Notizen aus dem Erstgespräch und der erhobene Befund sind die Grundlage. Stichpunkte zu
   vollständigem Fließtext ausformulieren, ohne Inhalte zu verändern oder hinzuzuerfinden.
2. Danach die eigene Bewertung des Kriteriums.
3. Abgleich mit dem BRi-Text (wörtliches Zitat).

${laengenVorgabeBegruendung()}

AUFBAU je Begründung – GENAU EIN SATZ je Nummer, zusammenhängender Fließtext:
1. ${hoeher ? 'Was hat sich seit der Begutachtung verändert?' : 'Welche Einschränkung besteht?'}
2. Konkreter Sachverhalt aus Notizen und Befund, einschließlich der erforderlichen personellen
   Unterstützung – der einzige Satz, der etwas länger sein darf.
3. Richtlinienmaßstab mit einem wörtlichen, knapp gehaltenen BRi-Zitat.
4. Schluss: „Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „…" ableitbar."
Ein fünfter Satz ist zulässig, wenn der Sachverhalt es zwingend erfordert – mehr nicht.

ZITIERREGEL – wird technisch überprüft: Alles in Anführungszeichen MUSS zeichengenau in den
mitgelieferten BRi-Texten dieses Kriteriums stehen. Im Zweifel ohne Anführungszeichen sinngemäß wiedergeben.

Weiter zu beachten:
- Erfinde keine Befunde, Diagnosen, Zeitangaben oder Vorkommnisse.
- Verwende ausschließlich die je Kriterium angegebenen Stufenbezeichnungen. In den Modulen 2 und 3 gibt es
  keine Stufe „selbständig".
- Modul 5, Kriterien 4.5.1 bis 4.5.14: Ist keine Maßnahme festgestellt, lautet die Bewertung
  „${M5_KEINE_WERTUNG}". Schreibe dafür NIEMALS „0", „null" oder „0x pro Woche".
- Beachte die mitgelieferte Hilfsmittel-Regel und die Hinweise unter „Achtung"; widerspricht eine Argumentation
  ihnen, verwende sie nicht.
- Variiere die Eröffnungen über alle Begründungen hinweg.
- Sachlich-fachlicher Gutachterstil in der dritten Person, ohne Aufzählungszeichen und Überschriften.
- Gib NUR den Begründungstext zurück.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            allgemein: { type: "STRING" },
            begruendungen: { type: "ARRAY", items: { type: "OBJECT",
                properties: { nr: { type: "STRING" }, text: { type: "STRING" } }, required: ["nr", "text"] } }
        },
        required: ["begruendungen"]
    };
    let prompt = buildBegruendungPrompt(diffs, mitAllgemein);
    if (hoeher && verschlechterung) prompt = 'VERSCHLECHTERUNG SEIT DER BEGUTACHTUNG: ' + verschlechterung + '\n\n' + prompt;
    if (typeof befundZusammenfassung === 'function') {
        const bf = befundZusammenfassung();
        if (bf) prompt += 'ERHOBENER BEFUND:\n' + bf + '\n\n';
    }
    const res = await callGeminiWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema }
    }, systemPrompt);
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error("Keine Antwort der KI erhalten.");
    const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) txt = fence[1];
    const data = JSON.parse(txt.trim());
    const map = {};
    (data.begruendungen || []).forEach(b => { if (b && b.nr && b.text) map[b.nr] = b.text.trim(); });
    return await haltenLaengenGrenzen(map, (data.allgemein || '').trim());
}

// Hält die Längenvorgaben ein: Überschreitet die KI sie, wird einmal gezielt nachgekürzt.
// Bleibt danach etwas zu lang, wird das dem Berater gemeldet statt stillschweigend hingenommen.
async function haltenLaengenGrenzen(map, allgemein) {
    const titel = (typeof appModus !== 'undefined' && appModus !== 'widerspruch')
        ? 'Anamnese' : 'Allgemeine Angaben';
    const vorher = laengenVerstoesse(map, allgemein);
    if (!vorher.length) return { map: map, allgemein: allgemein };
    showOverlay('Stellungnahme wird erstellt...', vorher.length + ' Abschnitt(e) werden gekürzt');
    let e;
    try { e = await kuerzeUeberlaenge(map, allgemein, titel); } finally { hideOverlay(); }
    if (e.offen.length) {
        const namen = e.offen.map(v => v.art === 'allgemein' ? titel : v.nr).join(', ');
        showToast('Zu lang geblieben: ' + namen + '. Bitte im Text noch kürzen.', 'error');
    }
    return { map: e.map, allgemein: e.allgemein };
}

/* Begründungen für das Anhörungsverfahren. Anders als im Widerspruch wird nicht das
   Erstgutachten angegriffen, sondern das Zweitgutachten – vor dem Hintergrund, dass der
   Medizinische Dienst in anderen Punkten bereits gefolgt ist. */
async function generateBegruendungenAnhoerung(strittig, mitAllgemein, analyse) {
    const cut = (s, n) => (s && s.length > n) ? s.slice(0, n) + ' …' : (s || '');
    const anmerkungen = (document.getElementById('anh-notizen')?.value || '').trim();
    const kassenbegruendung = (document.getElementById('anh-kassenbegruendung')?.value || '').trim();
    const zweitArt = (document.getElementById('anh-art')?.value || '').trim();

    const systemPrompt = `Du bist ein erfahrener Pflegeberater und Pflegesachverständiger. Du verfasst eine
pflegefachliche Stellungnahme für den WIDERSPRUCHSAUSSCHUSS, nachdem der Widerspruch abgelehnt und
vom Medizinischen Dienst ein Zweitgutachten (Anhörungsgutachten) erstellt wurde.

Schreibe im Aufbau, Ton und in der Wortwahl exakt wie die folgenden Beispiele des Verfassers:

=== STILBEISPIELE DES VERFASSERS ===
${getStilBeispiele()}
=== ENDE STILBEISPIELE ===

DIE BESONDERE LAGE – darum geht es hier:
Der Medizinische Dienst ist der pflegefachlichen Stellungnahme in mehreren Punkten GEFOLGT.
Das belegt die Tragfähigkeit der dort erhobenen Befunde. In den entscheidenden Punkten ist er
ihr aber NICHT gefolgt. Genau darauf zielt jede Begründung: Warum ist es nicht nachvollziehbar,
dass hier an der alten Wertung festgehalten wurde, obwohl dieselbe Befundlage anderswo zur
Korrektur geführt hat?

${laengenVorgabeBegruendung()}
Eine nummerierte Aufzählung (1., 2., 3.) ist hier zulässig, wenn sie die Argumentation schärft.

DIE SECHS ERWIDERUNGSMUSTER. Zu jedem Kriterium ist angegeben, welche in Betracht kommen.
Verwende nur die genannten und nur, soweit das Material sie trägt:
A – Der Befund ist im Zweitgutachten bestätigt, die Wertung blieb dennoch unverändert.
    Muster: „Das Zweitgutachten bestätigt im Befund: „…“. Es bleibt unklar, wie … wenn …“
B – Die Wertung stützt sich auf die Selbsteinschätzung der versicherten Person statt auf den Befund.
    Muster: „… wird lediglich mit dem Zusatz „wie kenntlich gemacht“ begründet – eine reine Übernahme
    einer Selbsteinschätzung, die durch die objektive Befundlage widerlegt wird.“
C – Das Zweitgutachten setzt sich mit der Stellungnahme nicht auseinander.
    Muster: „… die in der pflegefachlichen Stellungnahme aufgeführten Einschränkungen kann das
    Zweitgutachten nicht widerlegen.“
D – Entscheidung nach Aktenlage ohne eigene Sachverhaltsaufklärung.
    Muster: „Eine Entscheidung nach Aktenlage, die diesen vorgetragenen Sachverhalt ignoriert, wird
    der Amtsermittlungspflicht nicht gerecht.“
E – Die Schwelle zum nächsten Pflegegrad wurde knapp unterschritten. Nenne die Zahlen, die dir
    unten mitgeteilt werden – erfinde keine.
F – Die Wertung ist inkonsistent zu den Kriterien, in denen der Medizinische Dienst gefolgt ist.
    Muster: „… wirkt fachlich inkonsistent zu den Heraufstufungen bei den übrigen … Kriterien.“

ZWINGEND:
- Beziehe dich auf die Wertung des ZWEITGUTACHTENS, nicht auf die des Erstgutachtens.
- Erfinde keine Befunde, Zitate, Zahlen oder Vorkommnisse. Zitiere die BRi ausschließlich wörtlich
  aus den mitgelieferten Texten; passt nichts wörtlich, gib es ohne Anführungszeichen sinngemäß wieder.
- Verwende ausschließlich die je Kriterium angegebenen Stufenbezeichnungen.
- Modul 5, Kriterien 4.5.1 bis 4.5.14: Ist keine Maßnahme festgestellt, lautet die Bewertung
  „${M5_KEINE_WERTUNG}". Schreibe dafür niemals „0" oder „0x pro Woche".
- Sachlich-fachlicher Gutachterstil in der dritten Person. Keine Unterstellungen ohne Beleg im Material.
- Gib NUR den Begründungstext zurück.`;

    let prompt = '';
    const vName = (document.getElementById('stam-betreffend')?.value || '').trim();
    if (vName) prompt += `VERSICHERTE PERSON: ${vName}\n`;
    prompt += `DURCHFÜHRUNGSART DES ZWEITGUTACHTENS: ${zweitArt || 'nicht angegeben'}\n\n`;

    prompt += `RECHENERGEBNIS (belastbar, nicht zu verändern):\n`
        + `- Erstgutachten: ${calculateInternal('orig').total.toFixed(2).replace('.', ',')} Punkte\n`
        + `- Zweitgutachten: ${analyse.basis.total.toFixed(2).replace('.', ',')} Punkte\n`
        + `- Eigene Beurteilung: ${analyse.gesamt.total.toFixed(2).replace('.', ',')} Punkte\n`;
    if (analyse.naechsteSchwelle !== null) {
        prompt += `- Bis zur nächsten Schwelle (${String(analyse.naechsteSchwelle).replace('.', ',')} Punkte) fehlen dem `
                + `Zweitgutachten ${String(analyse.fehlendePunkte).replace('.', ',')} Punkte.\n`;
    }
    if (analyse.gefolgt.length) {
        // Mit TITEL, nicht nur Nummer: In der Vorlage des Verfassers werden zwei bis drei
        // Kriterien beispielhaft benannt („wie dem Treffen von Entscheidungen (4.2.6)"),
        // nicht als Nummernliste abgezählt.
        prompt += `- GEFOLGT ist das Zweitgutachten der Stellungnahme in ${analyse.gefolgt.length} Kriterien: `
                + analyse.gefolgt.map(l => l.titel + ' (' + l.nr + ')').join(', ') + '\n';
    }
    if (analyse.kipper.length) {
        prompt += `- Allein die Korrektur folgender Kriterien würde den Pflegegrad ändern: `
                + analyse.kipper.map(l => l.nr).join(', ') + '\n';
    }
    prompt += '\n';

    if (anmerkungen) {
        prompt += '==================== HAUPTQUELLE ====================\n'
                + 'MEINE ANMERKUNGEN ZUM ANHÖRUNGSVERFAHREN\n'
                + 'Sie sind der inhaltliche Kern. Stichpunkte zu Fließtext ausformen, ohne den Inhalt zu ändern:\n\n'
                + cut(anmerkungen, 6000) + '\n=====================================================\n\n';
    }
    if (kassenbegruendung) {
        prompt += 'BEGRÜNDUNG DER PFLEGEKASSE AUS DEM ANHÖRUNGSSCHREIBEN:\n' + cut(kassenbegruendung, 3000) + '\n\n';
    }
    const befund = (document.getElementById('stam-befund')?.value || '').trim();
    if (befund) prompt += 'BEFUNDTEXT DES GUTACHTERS:\n' + cut(befund, 5000) + '\n\n';

    prompt += 'STRITTIG GEBLIEBENE KRITERIEN (hierzu je eine Begründung):\n\n';
    strittig.forEach(l => {
        const b = briFor(l.nr);
        prompt += `--- Kriterium ${l.nr}: ${l.titel} ---\n`;
        prompt += `Erstgutachten: „${l.eText}"\nZweitgutachten: „${l.zText}"\nMeine Beurteilung: „${l.bText}"\n`;
        prompt += `Lage: ${VERGLEICH_LAGEN[l.lage].titel} – ${VERGLEICH_LAGEN[l.lage].text}\n`;
        prompt += `Passende Erwiderungsmuster: ${erwiderungsMuster(l, analyse).join(', ')}\n`;
        if (l.kipptAllein) prompt += `Bereits dieses eine Kriterium würde den Pflegegrad ändern.\n`;
        if (typeof anlagenFuerPrompt === 'function') prompt += anlagenFuerPrompt(l.nr);
        prompt += `Stufenbezeichnungen: verwende ausschließlich „${l.zText}" und „${l.bText}".\n`;
        if (b) prompt += `BRi-Definition: ${cut(b.definition, 1400)}\n`;
        const lh = (typeof LAIEN_HINWEISE !== 'undefined') ? LAIEN_HINWEISE[l.nr] : null;
        if (lh) {
            if (lh.hilfsmittel) prompt += `HILFSMITTEL-REGEL (zwingend beachten): ${lh.hilfsmittel}\n`;
            if (lh.wichtig) prompt += `WICHTIG / FEHLERQUELLE: ${lh.wichtig}\n`;
        }
        prompt += '\n';
    });

    if (mitAllgemein) {
        /* Aufbau und Tonfall folgen den Vorlagen des Verfassers (Deckner, Nebeling).
           Dort steht KEINE Nummernliste, sondern Fließtext, in dem zwei bis drei
           Kriterien beispielhaft mit ihrem Namen benannt werden. Der tragende Gedanke
           ist immer derselbe: Der Medizinische Dienst folgt der Stellungnahme in
           mehreren Punkten – das bestätigt ihre Tragfähigkeit –, aber gerade nicht in
           den entscheidenden, sodass die Schwelle knapp unterschritten bleibt. */
        prompt += 'ZUSÄTZLICHE AUFGABE – Abschnitt „Allgemeine Angaben":\n'
                + laengenVorgabeAllgemein('Allgemeine Angaben') + '\n'
                + 'ZWECK: Das AUFZEIGEN VON LÜCKEN UND WIDERSPRÜCHEN im Zweitgutachten – mehr nicht.\n'
                + 'Verfasse ihn NEU, als zusammenhängenden Fließtext in 3 knappen Absätzen. Halte dich\n'
                + 'an Aufbau und Tonfall der folgenden Vorlage; die Formulierungen stammen aus meinen\n'
                + 'eigenen Stellungnahmen und sind bewusst so gewählt:\n\n'
                + 'ABSATZ 1 – die Diskrepanz benennen. Muster:\n'
                + '  „Die vorliegenden Gutachten des <Organisation> vom <Datum 1> und vom <Datum 2>\n'
                + '   weisen mit einer Bewertung von <Punkte> gewichteten Punkten und <der erneuten\n'
                + '   Ablehnung eines Pflegegrades / der Feststellung des Pflegegrades N> eine fachlich\n'
                + '   nicht nachvollziehbare Diskrepanz zwischen der Befunderhebung und der\n'
                + '   abschließenden Bewertung auf."\n'
                + '  Nenne dabei auch die Durchführungsart des Zweitgutachtens, wenn sie von der des\n'
                + '  Erstgutachtens abweicht (etwa Aktenlage statt Hausbesuch).\n\n'
                + 'ABSATZ 2 – worin gefolgt wurde. Muster:\n'
                + '  „Es ist auffällig, dass der Medizinische Dienst im Zweitgutachten in wesentlichen\n'
                + '   Modulpunkten – wie <Kriteriumsname (Nummer)>, <Kriteriumsname (Nummer)> und\n'
                + '   <Kriteriumsname (Nummer)> – den fachlich fundierten Korrekturhinweisen der\n'
                + '   pflegefachlichen Stellungnahme folgt. Diese Übereinstimmung unterstreicht die\n'
                + '   Validität der dort erhobenen Befunde."\n'
                + '  ZWINGEND: Nenne HÖCHSTENS DREI Kriterien, und zwar mit NAMEN und Nummer aus der\n'
                + '  Liste oben. Zähle NIEMALS alle auf – eine lange Nummernreihe gehört nicht in\n'
                + '  diesen Abschnitt. Wurde in keinem Punkt gefolgt, schreibe das in einem Satz.\n\n'
                + 'ABSATZ 3 – worin nicht gefolgt wurde. Muster:\n'
                + '  „Dennoch lässt die Auswertung den Schluss zu, dass den Änderungen der\n'
                + '   pflegefachlichen Stellungnahme nicht vollständig gefolgt wurde, sodass die für\n'
                + '   den Pflegegrad N maßgebliche Hürde von <Schwelle> Punkten knapp unterschritten\n'
                + '   bleibt." Nutze dafür die oben genannten Zahlen.\n'
                + '  Baue meine Anmerkungen zum Anhörungsverfahren hier vollständig ein.\n\n'
                + 'WORTWAHL: Es heißt PFLEGEGRAD, niemals „Pflegestufe" – Pflegestufen gibt es seit\n'
                + '2017 nicht mehr. Schreibe „Zweitgutachten", nicht „Anhörungsgutachten".\n'
                + 'STRENG VERBOTEN in diesem Abschnitt – das gehört in „Befund und Stellungnahme":\n'
                + 'jede Begründung, warum eine andere Wertung richtig wäre; jeder Bezug auf die\n'
                + 'Begutachtungs-Richtlinien und jedes Zitat daraus; jede Stufenbezeichnung; jeder\n'
                + 'Ableitungssatz; das Abzählen einzelner Kriterien über die drei Beispiele hinaus.\n\n';
    }

    const schema = {
        type: "OBJECT",
        properties: {
            allgemein: { type: "STRING" },
            begruendungen: { type: "ARRAY", items: { type: "OBJECT",
                properties: { nr: { type: "STRING" }, text: { type: "STRING" } }, required: ["nr", "text"] } }
        },
        required: ["begruendungen"]
    };
    const res = await callGeminiWithFallback({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    }, systemPrompt);
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error("Keine Antwort der KI erhalten.");
    const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) txt = fence[1];
    const data = JSON.parse(txt.trim());
    const map = {};
    (data.begruendungen || []).forEach(b => { if (b && b.nr && b.text) map[b.nr] = b.text.trim(); });
    return await haltenLaengenGrenzen(map, (data.allgemein || '').trim());
}

// Erzeugt Begründungen je Abweichung und – auf Wunsch – den Abschnitt „Allgemeine Angaben"
// im Stil des Nutzers. Ein einziger KI-Aufruf für alles.
async function generateBegruendungen(diffs, mitAllgemein) {
    if (!diffs.length && !mitAllgemein) return { map: {}, allgemein: '' };
    // Bei Höherstufung und Erstantrag gilt eine andere Argumentation: Es geht nicht um Fehler
    // des Gutachters, sondern um die Verschlechterung seit der Begutachtung bzw. um die
    // erstmalige Darstellung des Hilfebedarfs.
    const vorgang = (typeof appModus !== 'undefined') ? appModus : 'widerspruch';
    if (vorgang !== 'widerspruch') return await generateBegruendungenAntrag(diffs, mitAllgemein, vorgang);

    const systemPrompt = `Du bist ein erfahrener Pflegeberater und Pflegesachverständiger und verfasst Begründungen für einen Widerspruch gegen ein Pflegegutachten (NBA, SGB XI).

Schreibe zu JEDEM abweichenden Kriterium eine Begründung, die im Aufbau, im Ton und in der Wortwahl exakt den folgenden Beispielen des Verfassers entspricht:

=== STILBEISPIELE DES VERFASSERS ===
${getStilBeispiele()}
=== ENDE STILBEISPIELE ===

RANGFOLGE DER QUELLEN – dies ist die wichtigste Vorgabe überhaupt:
1. MEINE EIGENEN NOTIZEN aus dem Erstgespräch (im Abschnitt HAUPTQUELLE) sind der eigentliche
   Grund des Widerspruchs. JEDE Begründung MUSS inhaltlich auf ihnen aufbauen. Suche zu jedem
   abweichenden Kriterium die Notizen heraus, die dazu inhaltlich passen, und mache sie zum Kern
   der Argumentation. Eine Notiz kann für mehrere Kriterien einschlägig sein.
   Die Notizen sind oft nur Stichpunkte oder unvollständige Sätze: Formuliere sie zu
   zusammenhängendem, fachsprachlichem Fließtext aus. Ergänze dabei NUR Sprache, niemals Inhalt –
   erfinde keine zusätzlichen Sachverhalte, Zahlen, Diagnosen oder Vorkommnisse.
2. Erst danach stützt du die Begründung auf meine abweichende Bewertung des Kriteriums.
3. Anschließend gleichst du beides mit dem BRi-Text ab (wörtliches Zitat) und suchst – wo
   vorhanden – im Befundtext des Gutachters eine Stelle, die meine Feststellung bestätigt oder
   seiner eigenen Bewertung widerspricht.
Enthalten die Notizen zu einem Kriterium nichts Einschlägiges, begründe aus BRi-Text und
Befundtext – aber erfinde niemals Feststellungen.

STARKES ZUSATZARGUMENT – der innere Widerspruch des Gutachtens:
Prüfe den Befund- und Anamnesetext daraufhin, ob der Gutachter dort selbst eine Einschränkung,
eine Hilfeleistung, einen pathologischen Messwert oder einen Hilfsmittelbedarf beschreibt, den er
anschließend in der Bewertung nicht berücksichtigt. Findest du eine solche Stelle, benenne die
Feststellung des Gutachters ausdrücklich („Der Gutachter dokumentiert im eigenen Befund, dass …"),
stelle den Widerspruch zur Bewertung heraus und verbinde ihn mit meiner Feststellung aus den
Notizen. Erfinde eine solche Stelle niemals.

${laengenVorgabeBegruendung()}

AUFBAU jeder Begründung – GENAU EIN SATZ je Nummer, zusammenhängender Fließtext:
1. Eröffnung: Stelle die gutachterliche Wertung fachlich infrage – zum Beispiel „Die gutachterliche Einstufung als … ignoriert …" oder „Die pauschale Bewertung dieses Kriteriums als … hält einer fachlichen Überprüfung nicht stand".
2. Konkreter Sachverhalt – der Kern und der einzige Satz, der etwas länger sein darf: Was ist der versicherten Person tatsächlich nicht möglich und welche personelle Unterstützung ist erforderlich? Baue dies auf MEINEN NOTIZEN auf. Ergänzend, nicht ersetzend, Angaben aus Befund und Anamnese.
3. Kritik am gutachterlichen Vorgehen, soweit das Material sie hergibt – NUR der stärkste Punkt, nicht mehrere: innerer Widerspruch, unterlassene Erprobung, übergangene Angaben oder zu kurze Begutachtungsdauer. Gibt das Material nichts her, lasse diesen Satz ersatzlos weg (dann sind es vier Sätze).
4. Richtlinienmaßstab mit einem wörtlichen, knapp gehaltenen BRi-Zitat.
5. Zwingender Schluss, in der Regel: „Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „…" ableitbar." (Varianten: „… ist … zwingend abzuleiten", „… muss die Bewertung zwingend auf „…" korrigiert werden".)

FACHLICHE FEHLER VERMEIDEN – prüfe vor jeder Begründung die mitgelieferte HILFSMITTEL-REGEL und
den Hinweis WICHTIG / FEHLERQUELLE des jeweiligen Kriteriums:
- Führt ein Hilfsmittel laut Regel zu „selbständig", darf seine bloße Nutzung NIEMALS als
  Begründung für eine Einschränkung dienen (etwa Rollator oder Gehstock bei 4.1.4, Treppengeländer
  bei 4.1.5, Haltegriffe bei 4.1.3). Argumentiere dann ausschließlich über die darüber hinaus
  erforderliche personelle Hilfe, über Sicherheit oder über Schmerz.
- Halte die Abgrenzung zwischen den Kriterien ein: Bei 4.2.7 und 4.2.8 ist Schwerhörigkeit oder
  eine Seheinschränkung ausdrücklich NICHT zu bewerten, bei 4.2.10 dagegen schon. Kognitiv
  bedingter Anleitungsbedarf bei Alltagshandlungen gehört zu 4.2.5. Reines Bereitlegen von
  Kleidung oder Decken des Tisches ist hauswirtschaftlich und begründet KEINE Einschränkung.
- Modul 3 setzt eine fachärztlich diagnostizierte psychiatrische Erkrankung oder Demenz voraus,
  die seit mindestens sechs Monaten behandelt wird. Bei 4.3.10 zählen allgemeine Zukunftsängste,
  Sturzangst und Angst vor dem Alleinsein NICHT. Bei 4.3.11 genügt gedrückte Stimmung NICHT.
- Modul 5 setzt in der Regel ärztliche Verordnung und Dauerhaftigkeit von mindestens sechs Monaten
  voraus; frei verkäufliche Mittel und Akuttermine zählen nicht.
Steht eine Argumentation im Widerspruch zu diesen Regeln, verwende sie NICHT – auch dann nicht,
wenn sie sich aus meinen Notizen nahelegen würde. Suche stattdessen die tragfähige Begründung.

ZITIERREGEL – wird technisch überprüft:
Alles, was du in Anführungszeichen setzt, MUSS zeichengenau in den mitgelieferten BRi-Texten
dieses Kriteriums stehen. Setze niemals Halbsätze in Anführungszeichen, die du sinngemäß
zusammengefasst, aus einem anderen Kriterium entnommen oder ergänzt hast. Passt keine Stelle
wörtlich zu deiner Argumentation, dann zitiere GAR NICHT, sondern gib den Inhalt ohne
Anführungszeichen sinngemäß wieder – oder wähle eine andere, tragfähige Begründung. Kürze ein
Zitat nur so, dass sein Sinn erhalten bleibt; lasse einschränkende Nachsätze nicht weg, um die
Stelle passender erscheinen zu lassen.

STUFENBEZEICHNUNGEN:
Verwende ausschließlich die je Kriterium angegebenen Bezeichnungen. In den Modulen 2 und 3 gibt
es KEINE Stufe „selbständig" – dort heißt es „unbeeinträchtigt" beziehungsweise „größtenteils
vorhanden", „in geringem Maße vorhanden", „nicht vorhanden" bzw. bei Modul 3 „nie oder sehr
selten", „selten", „häufig", „täglich". Formulierungen wie „Einstufung als vollständig
selbstständig" sind dort ein fachlicher Fehler.

Beachte zwingend:
0. Der Ableitungssatz („Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „…" ableitbar.") steht genau EINMAL, am Ende der Begründung. Beginne eine Begründung nicht mit ihm.
0a. Variiere über alle Begründungen hinweg die Eröffnungen und Satzmuster. Verwende keine Wendung in zwei Begründungen wörtlich – sonst wirkt der Text wie ein Textbaustein, was du gerade dem Gutachter vorwirfst.
0b. Führe KEINE Tatsache an, die die Position des Gutachters stützt (etwa eine noch ausgeübte Tätigkeit oder eine erhaltene Fähigkeit), es sei denn, du entkräftest sie im selben Zug schlüssig. Lenke keine Aufmerksamkeit auf Umstände, die gegen die eigene Bewertung sprechen.
1. Zitiere die BRi ausschließlich wörtlich aus den mitgelieferten BRi-Texten. Erfinde NIEMALS Zitate und gib nur wieder, was dort tatsächlich steht.
2. Erfinde keine Befunde, Diagnosen, Zeitangaben, Messwerte oder Vorkommnisse. Nutze nur, was in meinen Notizen, im Befund, in der Anamnese und den mitgelieferten Bewertungen steht. Gibt das Material zu einem Punkt nichts her, lasse ihn weg.
3. Nutze – wo fachlich tragfähig – den Quervergleich zu einem Kriterium, in dem der Gutachter bereits eine Einschränkung anerkannt hat, und leite daraus den Widerspruch in der Bewertung ab. Findest du keinen tragfähigen Vergleich, begründe aus BRi-Text und Befund; konstruiere niemals einen unpassenden Vergleich.
4. Module 1, 4 und 6 (Selbständigkeit): Begründe über die notwendige personelle Unterstützung bei wesentlichen Teilschritten sowie über Sicherheit und Schmerz – eine Aktivität gilt nur dann als selbständig, wenn sie ohne personelle Hilfe, adäquat und sicher durchführbar ist. Bei psychischer Grunderkrankung zählt auch der Bedarf an Aufforderung, Anleitung, Motivierung und Kontrolle: Ist die Handlung motorisch möglich, wird sie aber ohne personelle Anstöße nicht zuverlässig ausgeführt, liegt keine Selbständigkeit vor.
5. Modul 3 (Verhaltensweisen und psychische Problemlagen): Begründe über die nachgewiesene Häufigkeit der Ereignisse, die eine personelle Intervention erfordern; eine aufwändige Motivierung durch andere Personen ist dabei zwingend zu werten. Nenne die Zielstufe (nie oder sehr selten / selten / häufig / täglich).
6. Modul 5: Begründe über die dauerhafte, regelmäßige Häufigkeit der Maßnahmen und nenne die Zielfrequenz ausdrücklich, etwa „3 mal täglich" oder „2 mal wöchentlich". Personelle Hilfe ist auch dann zu werten, wenn die Maßnahme ohne Erinnerung, Anleitung oder Kontrolle nicht zuverlässig umgesetzt wird.
6a. Modul 5, Kriterien 4.5.1 bis 4.5.14: Ist im Gutachten keine Maßnahme festgestellt, lautet die dortige Bewertung „${M5_KEINE_WERTUNG}". Schreibe dafür NIEMALS „0", „null", „0x pro Woche" oder „keine Wertung" – eine Häufigkeit von null ist keine Bewertung.
7. Bei Kriterien der Module 2 und 3 nenne im Schlusssatz die Einzelpunkte in Klammern, zum Beispiel „größtenteils vorhanden" (1 Einzelpunkt).
8. Schreibe sachlich-fachlichen Gutachterstil in der dritten Person („die versicherte Person", „Herr/Frau …"), ohne Aufzählungszeichen und ohne Überschriften. Der Ton ist bestimmt und fachlich zugespitzt, aber sachlich begründet – keine pauschalen Unterstellungen ohne Beleg im Material.
9. Gib NUR den Begründungstext zurück – ohne die Zeilen "Kriterium ..." und "Gutachterliche Bewertung ...", diese ergänzt die Software selbst.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            allgemein: { type: "STRING" },
            begruendungen: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: { nr: { type: "STRING" }, text: { type: "STRING" } },
                    required: ["nr", "text"]
                }
            }
        },
        required: ["begruendungen"]
    };
    const payload = {
        contents: [{ role: "user", parts: [{ text: buildBegruendungPrompt(diffs, mitAllgemein) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema }
    };
    const res = await callGeminiWithFallback(payload, systemPrompt);
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error("Keine Antwort der KI erhalten.");
    const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) txt = fence[1];
    const data = JSON.parse(txt.trim());
    const map = {};
    (data.begruendungen || []).forEach(b => { if (b && b.nr && b.text) map[b.nr] = b.text.trim(); });
    return await haltenLaengenGrenzen(map, (data.allgemein || '').trim());
}

// Baut die Stellungnahme im Familiara-Format aus den App-Daten (Gutachten/Bescheide).
