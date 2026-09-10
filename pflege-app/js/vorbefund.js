// Befund aus dem Vorgutachten vorbelegen – NUR im Höherstufungsantrag.
//
// Ausgangspunkt: Im Höherstufungsverfahren liegt ein Gutachten vor. Sein Befundtext
// beschreibt genau das, was der Berater sonst von Hand in die Befunderhebung tippt –
// Gangbild, Schürzengriff, Handkraft, Medikation, Hilfsmittel. Das abzuschreiben kostet
// Zeit und erzeugt Übertragungsfehler.
//
// Was dabei NICHT nötig ist: Die Kriterien der Module 1, 2 und 4 stehen in der
// Befunderhebung ohnehin schon, weil diese Einträge unmittelbar aus der eigenen
// Einschätzung lesen (siehe befundWert) – und die wurde beim Einlesen des Gutachtens
// gesetzt. Gebraucht wird die Vorbelegung nur für die BESCHREIBENDEN Befunde und die
// Erfassungstabellen.
//
// FACHLICHER VORBEHALT, der die Bauweise bestimmt: Ein aus dem Vorgutachten übernommener
// Befund ist der ALTE Stand. Der Höherstufungsantrag behauptet eine Verschlechterung.
// Bliebe die Vorbelegung ungeprüft stehen, widerspräche das Schriftstück seinem eigenen
// Argument. Deshalb: nichts ist vorausgewählt, jeder Vorschlag zeigt seine Fundstelle im
// Gutachten, und übernommene Einträge bleiben als „noch aus dem Vorgutachten"
// gekennzeichnet, bis der Berater sie anfasst.

let vorbefundFunde = null;          // { befunde: [], erfassung: [] }
let befundHerkunft = {};            // Schlüssel wie befundWerte -> 'vorgutachten'

function vorbefundMoeglich() {
    if (typeof appModus === 'undefined' || appModus !== 'hoeherstufung') return false;
    const b = (document.getElementById('stam-befund')?.value || '').trim();
    const a = (document.getElementById('stam-anamnese')?.value || '').trim();
    return (b.length + a.length) > 80;
}

/* Die Aufgabe wird AUS DEM KATALOG erzeugt, nicht von Hand geschrieben. Kommt ein
   Befundeintrag hinzu oder ändert sich eine Skala, folgt die Anweisung automatisch –
   sonst würde sie mit der Zeit auseinanderlaufen. */
function vorbefundEintraege() {
    const liste = [];
    BEFUND_GRUPPEN.forEach(g => {
        (g.eintraege || []).forEach(e => {
            if (e.nba) return;                       // steht bereits aus der Bewertung
            if (e.berechnet) return;                 // BMI und Ähnliches rechnet die App selbst
            liste.push({ gruppe: g.titel, eintrag: e });
        });
    });
    return liste;
}

function vorbefundAufgabe() {
    const zeilen = [];
    vorbefundEintraege().forEach(({ gruppe, eintrag: e }) => {
        const seiten = e.seiten ? '  [je rechts und links]' : '';
        if (e.frei) {
            zeilen.push('- ' + e.id + '  „' + e.titel + '" (' + gruppe + '): FREITEXT'
                + (e.platzhalter ? ' – ' + e.platzhalter : ''));
        } else if (e.skala) {
            zeilen.push('- ' + e.id + '  „' + e.titel + '" (' + gruppe + '): '
                + e.skala.map(s => '„' + s + '"').join(' | ') + seiten);
        }
    });
    return zeilen.join('\n');
}

const VORBEFUND_SCHEMA = {
    type: 'OBJECT',
    properties: {
        befunde: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            id: { type: 'STRING' }, seite: { type: 'STRING' },
            stufe: { type: 'STRING' }, text: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['id'] } },
        medikation: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            applikation: { type: 'STRING' }, praeparate: { type: 'STRING' },
            anzahl: { type: 'STRING' }, zeitraum: { type: 'STRING' },
            unterstuetzung: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['applikation'] } },
        hilfsmittel: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            bezeichnung: { type: 'STRING' }, nutzung: { type: 'STRING' },
            anzahl: { type: 'STRING' }, zeitraum: { type: 'STRING' },
            taetigkeit: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['bezeichnung'] } },
        arztbesuche: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            fach: { type: 'STRING' }, anzahl: { type: 'STRING' },
            zeitraum: { type: 'STRING' }, begleitung: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['fach'] } },
        behandlungspflege: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            art: { type: 'STRING' }, beschreibung: { type: 'STRING' },
            anzahl: { type: 'STRING' }, zeitraum: { type: 'STRING' },
            durchfuehrung: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['art'] } }
    },
    required: ['befunde']
};

function vorbefundAnweisung() {
    return [
        'Du liest den Befund- und Anamnesetext eines Pflegegutachtens und überträgst die dort',
        'BESCHRIEBENEN Feststellungen in die Erfassungsmaske eines Höherstufungsantrags.',
        '',
        'ZWINGEND – dies ist eine Übertragung, keine Beurteilung:',
        '1. Gib NUR wieder, was im Text tatsächlich steht. Erfinde nichts, schließe nichts.',
        '2. Findest du zu einem Eintrag nichts, LASS IHN WEG. Eine fehlende Angabe ist eine',
        '   Information; eine geratene ist ein Schaden.',
        '3. Zu JEDEM Vorschlag gehört „beleg": die Textstelle aus dem Gutachten, auf die er sich',
        '   stützt – wörtlich, höchstens ein Satz. Ohne Beleg keinen Vorschlag.',
        '4. „stufe" MUSS wörtlich eine der zu diesem Eintrag genannten Stufen sein. Passt keine,',
        '   lass den Eintrag weg.',
        '5. Bei Einträgen mit [je rechts und links] gib zwei Zeilen zurück, „seite" ist',
        '   „rechts" oder „links". Steht im Text nur eine gemeinsame Angabe, gib EINE Zeile',
        '   ohne „seite".',
        '6. Freitexteinträge füllst du in „text", knapp und wörtlich am Gutachten.',
        '',
        'ZU ÜBERTRAGENDE BEFUNDEINTRÄGE:',
        vorbefundAufgabe(),
        '',
        'AUSSERDEM aus dem Text übernehmen, soweit dort genannt:',
        '- medikation: EINE Zeile je Applikationsort, NICHT je Medikament. Die einzelnen Präparate',
        '  werden nicht benannt. „applikation" muss wörtlich einer dieser Orte sein:',
        '  ' + APPLIKATION.map(a => '„' + a + '"').join(' | ') + '.',
        '  „praeparate" ist die Anzahl unterschiedlicher Arzneimittel an diesem Ort, „anzahl" und',
        '  „zeitraum" („pro Tag", „pro Woche", „pro Monat") sind die Häufigkeit der Applikation.',
        '  „unterstuetzung" ist wörtlich eines von: ' + MEDIKATION_HILFE.map(h => '„' + h + '"').join(' | ')
            + '. Steht dazu nichts im Text, lass das Feld LEER.',
        '- hilfsmittel: Bezeichnung, nutzung („genutzt" oder „ungenutzt"), Anzahl, Zeitraum und',
        '  taetigkeit – was die Pflegeperson damit tut. Bleibt die Tätigkeit unerwähnt, lass sie leer.',
        '- arztbesuche: Fachrichtung oder Therapie, Anzahl, Zeitraum („pro Woche", „pro Monat",',
        '  „im Quartal", „im Jahr"), begleitung („in Begleitung" oder „selbständig").',
        '- behandlungspflege: NUR pflegerische Maßnahmen wie Verbandswechsel, Wundversorgung,',
        '  Absaugen, Injektionen, Messungen, Stoma, Katheter. Kompressionsversorgung, CPAP-Maske',
        '  und Hörgerät gehören zu den Hilfsmitteln, NICHT hierher.',
        '',
        'Die Angaben stammen aus dem VORGUTACHTEN und sind damit der frühere Stand. Bewerte',
        'nicht, ob sie noch zutreffen – das prüft der Berater.'
    ].join('\n');
}

// ------------------------------------------------------------------ Lesen
async function leseVorbefund() {
    if (!vorbefundMoeglich()) {
        showToast('Dafür wird der Befundtext aus dem Vorgutachten benötigt. Bitte zuerst das '
            + 'Gutachten einlesen.', 'error');
        return;
    }
    // Den API-Schlüssel prüft callGeminiWithFallback selbst und meldet ihn verständlich.
    showOverlay('Befund aus dem Vorgutachten wird übertragen...', 'Der Gutachtentext wird gelesen');
    try {
        vorbefundFunde = await vorbefundLesen(
            (document.getElementById('stam-befund')?.value || ''),
            (document.getElementById('stam-anamnese')?.value || ''));
        hideOverlay();
        zeigeVorbefundVorschlaege();
    } catch (e) {
        hideOverlay();
        console.warn('Befundübernahme fehlgeschlagen', e);
        showToast('Der Befund konnte nicht übertragen werden: ' + (e && e.message ? e.message : e), 'error');
    }
}

// Getrennt vom Knopf, damit es sich ohne Oberfläche prüfen lässt.
async function vorbefundLesen(befundText, anamneseText) {
    const cut = (t, n) => (t && t.length > n) ? t.slice(0, n) + ' …' : (t || '');
    const eingabe = '=== BEFUND AUS DEM VORGUTACHTEN ===\n' + cut(befundText, 12000)
        + '\n\n=== ANAMNESE AUS DEM VORGUTACHTEN ===\n' + cut(anamneseText, 6000);
    const res = await callGeminiWithFallback({
        contents: [{ role: 'user', parts: [{ text: eingabe }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: VORBEFUND_SCHEMA }
    }, vorbefundAnweisung());
    let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('keine Antwort');
    const zaun = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (zaun) txt = zaun[1];
    return vorbefundPruefen(JSON.parse(txt.trim()));
}

/* Prüft jeden Vorschlag gegen den Katalog, BEVOR er angezeigt wird. Eine Stufe, die es
   nicht gibt, oder ein unbekannter Eintrag wird verworfen statt irgendwie eingepasst. */
function vorbefundPruefen(antwort) {
    const befunde = [];
    const verworfen = [];
    (antwort.befunde || []).forEach(v => {
        const e = (typeof befundEintrag === 'function') ? befundEintrag(v.id) : null;
        if (!e || e.nba || e.berechnet) { verworfen.push((v.id || '?') + ': kein solcher Eintrag'); return; }
        if (!(v.beleg || '').trim()) { verworfen.push(e.titel + ': ohne Fundstelle'); return; }
        const seite = (e.seiten && /^(rechts|links)$/i.test(v.seite || '')) ? v.seite.toLowerCase() : null;
        if (e.frei) {
            if (!(v.text || '').trim()) { verworfen.push(e.titel + ': ohne Text'); return; }
            befunde.push({ id: e.id, titel: e.titel, seite: null, frei: true,
                           text: v.text.trim(), beleg: v.beleg.trim() });
            return;
        }
        const idx = (e.skala || []).findIndex(s => s.toLowerCase() === String(v.stufe || '').trim().toLowerCase());
        if (idx < 0) { verworfen.push(e.titel + ': Stufe „' + (v.stufe || '') + '" gibt es dort nicht'); return; }
        befunde.push({ id: e.id, titel: e.titel, seite: seite, frei: false,
                       idx: idx, stufe: e.skala[idx], beleg: v.beleg.trim() });
    });

    /* Tabellenzeilen werden gegen die Spaltendefinition geprüft, nicht bloß übernommen:
       Ein Auswahlfeld darf nur einen Wert bekommen, den es dort wirklich gibt – sonst steht
       in der Maske später eine Auswahl, die beim ersten Anfassen wieder verschwindet. */
    const tab = (name, liste) => {
        const t = ERFASSUNG_TABELLEN.find(x => x.id === name);
        if (!t) return [];
        const schluessel = t.spalten[0].k;
        return (liste || []).map(v => {
            const wert = (v[schluessel] || '').toString().trim();
            if (!wert) return null;
            if (!(v.beleg || '').trim()) { verworfen.push(t.titel + ' „' + wert + '": ohne Fundstelle'); return null; }
            const zeile = { _tabelle: name, _beleg: v.beleg.trim() };
            t.spalten.forEach(s => {
                if (s.berechnet) return;
                const w = (v[s.k] == null ? '' : String(v[s.k])).trim();
                if (!w) return;
                /* Freie Eingabe ist ein Recht des BERATERS, nicht des Modells: „frei" öffnet die
                   Maske, „kiFrei" öffnet die Prüfung. Wo eine Angabe die Rechnung steuert
                   (Applikationsort, Unterstützung), muss die KI aus der Liste wählen – sonst
                   stünde eine erfundene Angabe in der Maske, die niemand nachgeschlagen hat. */
                if (s.typ === 'select' && !s.kiFrei && s.opt.indexOf(w) < 0) {
                    verworfen.push(t.titel + ' „' + wert + '": ' + s.l + ' „' + w + '" ist dort nicht vorgesehen');
                    return;
                }
                if (s.typ === 'number' && !(parseFloat(w.replace(',', '.')) > 0)) return;
                zeile[s.k] = w;
            });
            // Fiel die erste Spalte durch die Prüfung, bliebe eine Zeile ohne ihren Gegenstand übrig.
            if (!zeile[schluessel]) return null;
            return zeile;
        }).filter(Boolean);
    };
    const erfassungZeilen = []
        .concat(tab('medikation', antwort.medikation))
        .concat(tab('hilfsmittel', antwort.hilfsmittel))
        .concat(tab('arztbesuche', antwort.arztbesuche))
        .concat(tab('behandlungspflege', antwort.behandlungspflege));
    return { befunde: befunde, erfassung: erfassungZeilen, verworfen: verworfen };
}

// ------------------------------------------------------------- Auswahlliste
function zeigeVorbefundVorschlaege() {
    const box = document.getElementById('vorschlag-body');
    vorschlagOverlayZweck('Befund aus dem Vorgutachten', 'uebernehmeVorbefund()');
    const f = vorbefundFunde || { befunde: [], erfassung: [], verworfen: [] };
    const datum = (typeof erfassungExtra !== 'undefined' && erfassungExtra.vorgutachten)
        ? formatDE(erfassungExtra.vorgutachten)
        : formatDE(document.getElementById('stam-begutachtung')?.value || '');

    if (!f.befunde.length && !f.erfassung.length) {
        box.innerHTML = '<div class="vs-leer">Im Befundtext des Vorgutachtens ließ sich nichts finden, '
            + 'was sich übertragen lässt.</div>'
            + (f.verworfen.length ? '<div class="hinweis-warnung" style="margin-top:12px">Nicht übernommen: '
                + escapeHtml(f.verworfen.join(' · ')) + '</div>' : '');
    } else {
        const zeile = (kennung, titel, wert, beleg) => `
            <label class="vs-item" style="border-left-color:var(--accent2);align-items:flex-start">
                <input type="checkbox" data-vb="${kennung}">
                <div style="flex:1">
                    <div class="vs-grund">${escapeHtml(titel)}${wert ? ': ' + escapeHtml(wert) : ''}</div>
                    <div class="vs-fund">Laut Gutachten: „${escapeHtml(beleg)}“</div>
                </div>
            </label>`;
        let html = '<p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px">'
            + 'Diese Angaben stehen im Gutachten' + (datum ? ' vom ' + escapeHtml(datum) : '') + '. '
            + '<b>Nichts ist vorausgewählt.</b> Angehaktes wird in die Maske eingetragen, damit Sie es nur '
            + 'noch korrigieren müssen. <b>Es ist der damalige Stand</b> – im Höherstufungsantrag geht es '
            + 'gerade um das, was sich seither geändert hat. Übernommene Einträge bleiben deshalb markiert, '
            + 'bis Sie sie angefasst haben.</p>';
        if (f.befunde.length) {
            html += '<div class="rev-sec-title" style="margin-top:14px">Befunderhebung</div>'
                + f.befunde.map((b, i) => zeile('b' + i,
                    b.titel + (b.seite ? ' ' + b.seite : ''),
                    b.frei ? b.text : b.stufe, b.beleg)).join('');
        }
        if (f.erfassung.length) {
            const namen = { medikation: 'Medikation', hilfsmittel: 'Hilfsmittel',
                            arztbesuche: 'Arzt- und Therapiebesuche', behandlungspflege: 'Behandlungspflege' };
            html += '<div class="rev-sec-title" style="margin-top:14px">Angaben zur Versorgung '
                + '<span style="font-weight:400;text-transform:none;letter-spacing:0">– landen in Reiter 1</span></div>'
                + f.erfassung.map((z, i) => {
                    const werte = Object.keys(z).filter(k => k.charAt(0) !== '_' && z[k]).map(k => z[k]);
                    return zeile('e' + i, namen[z._tabelle] || z._tabelle, werte.join(' · '), z._beleg);
                }).join('');
        }
        if (f.verworfen.length) {
            html += '<div class="hinweis-warnung" style="margin-top:14px"><b>Nicht übernommen:</b> '
                + escapeHtml(f.verworfen.join(' · '))
                + '<br>Diese Angaben passten zu keinem Eintrag oder hatten keine Fundstelle. '
                + 'Bitte von Hand erfassen – die App trägt hier bewusst nichts ein.</div>';
        }
        box.innerHTML = html;
    }
    document.getElementById('vorschlag-overlay').classList.add('active');
}

function uebernehmeVorbefund() {
    const f = vorbefundFunde || { befunde: [], erfassung: [] };
    let n = 0;
    document.querySelectorAll('#vorschlag-body input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) return;
        const k = cb.getAttribute('data-vb') || '';
        const idx = parseInt(k.slice(1), 10);
        if (k.charAt(0) === 'b') {
            const b = f.befunde[idx];
            if (!b) return;
            const e = befundEintrag(b.id);
            const schl = befundSchluessel(e, b.seite);
            if (b.frei) befundTexte[schl] = b.text;
            else befundWerte[schl] = b.idx;
            befundHerkunft[schl] = 'vorgutachten';
            n++;
        } else if (k.charAt(0) === 'e') {
            const z = f.erfassung[idx];
            if (!z) return;
            const werte = {};
            Object.keys(z).forEach(s => { if (s.charAt(0) !== '_') werte[s] = z[s]; });
            erfHinzufuegen(z._tabelle, werte);
            n++;
        }
    });
    closeVorschlaege();
    if (typeof renderBefund === 'function') renderBefund();
    if (typeof renderErfassung === 'function') renderErfassung();
    if (typeof leiteErnaehrungszustandAb === 'function') leiteErnaehrungszustandAb();
    showToast(n ? n + ' Angabe(n) übernommen. Sie stammen aus dem Vorgutachten – bitte durchgehen '
                + 'und auf den heutigen Stand bringen.'
                : 'Es wurde nichts ausgewählt.', n ? 'success' : 'error');
    return n;
}

// ------------------------------------------------------------- Kennzeichnung
// Wie viele Einträge stehen noch unverändert so da, wie sie aus dem Gutachten kamen?
function vorbefundOffen() {
    return Object.keys(befundHerkunft).filter(k => befundHerkunft[k] === 'vorgutachten');
}

/* Angezeigt wird die Kennzeichnung nur im Höherstufungsantrag. Wechselt jemand im selben
   Fall auf den Erstantrag, gibt es dort kein Vorgutachten, auf das sie sich beziehen könnte –
   gespeichert bleibt sie trotzdem, damit sie beim Zurückwechseln wieder stimmt. */
function vorbefundStammtVon(schluessel) {
    if (typeof appModus === 'undefined' || appModus !== 'hoeherstufung') return false;
    return befundHerkunft[schluessel] === 'vorgutachten';
}

// Sobald der Berater einen Eintrag anfasst, ist er nicht mehr „aus dem Vorgutachten".
function vorbefundAngefasst(schluessel) {
    if (befundHerkunft[schluessel]) delete befundHerkunft[schluessel];
}

function vorbefundHinweisHtml() {
    const offen = vorbefundOffen().length;
    if (!offen) return '';
    return '<div class="hinweis-warnung" style="margin-top:12px">' + offen + ' Eintrag/Einträge stehen noch '
         + 'unverändert so, wie sie aus dem Vorgutachten übernommen wurden. Im Höherstufungsantrag geht es um '
         + 'die Veränderung seit damals – bitte jeden davon prüfen und auf den heutigen Stand bringen.</div>';
}

// Die Karte über der Befunderhebung – nur im Höherstufungsantrag.
function vorbefundKarteHtml() {
    if (typeof appModus === 'undefined' || appModus !== 'hoeherstufung') return '';
    const bereit = vorbefundMoeglich();
    return `<div class="card" style="border:1px solid rgba(37,99,235,0.2)">
        <div class="card-header"><div class="dot" style="background:var(--accent)"></div>Befund aus dem Vorgutachten übernehmen</div>
        <div style="padding:16px 20px">
            <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                Liest den Befundtext des eingelesenen Gutachtens und schlägt vor, was sich davon in diese
                Maske übertragen lässt – Gangbild, Handfunktion, Größe und Gewicht. Angaben zur Versorgung
                (Medikation, Hilfsmittel, Arztbesuche, Behandlungspflege) landen in Reiter 1 bei den
                Erfassungstabellen. Die Kriterien der Module 1, 2 und 4 stehen bereits, sie kommen unmittelbar
                aus der eingelesenen Bewertung. <b>Nichts wird ungefragt eingetragen</b>; jeder Vorschlag zeigt seine
                Fundstelle. Übernommenes ist der <b>damalige</b> Stand und bleibt so lange markiert, bis Sie
                es geprüft haben.
            </p>
            <button class="btn btn-primary" onclick="leseVorbefund()" ${bereit ? '' : 'disabled'}>📄 Befund aus dem Vorgutachten lesen</button>
            ${bereit ? '' : '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Dafür muss zuerst ein Gutachten eingelesen sein.</div>'}
            ${vorbefundHinweisHtml()}
        </div>
    </div>`;
}

// Für „Fall speichern": die Kennzeichnung gehört zum Fall.
function vorbefundSichern() { return befundHerkunft; }
function vorbefundLaden(d) { befundHerkunft = d || {}; }
