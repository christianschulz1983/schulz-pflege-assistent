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
            if (VORBEFUND_ABGELEITET.indexOf(e.id) > -1) return;
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
        }, required: ['art'] } },
        pflegepersonen: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            art: { type: 'STRING' }, name: { type: 'STRING' }, geboren: { type: 'STRING' },
            telefon: { type: 'STRING' }, adresse: { type: 'STRING' }, tage: { type: 'STRING' },
            wochenstunden: { type: 'STRING' }, unterstuetzung: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['name'] } },
        krankenhaus: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            von: { type: 'STRING' }, bis: { type: 'STRING' }, grund: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['grund'] } },
        // Befunde, für die der Katalog keinen Eintrag hat (Haut, Pflegezustand, Luftnot …)
        befund_weitere: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            gruppe: { type: 'STRING' }, titel: { type: 'STRING' }, text: { type: 'STRING' }, beleg: { type: 'STRING' }
        }, required: ['titel', 'text'] } }
    },
    required: ['befunde']
};

/* Einträge, die die App selbst ableitet und die deshalb nicht aus dem Gutachten gesetzt
   werden: Der Ernährungszustand folgt aus dem BMI. Die Beschreibung des Gutachters
   („optisch übergewichtig") geht als weiterer Befund mit – verloren geht sie nicht. */
const VORBEFUND_ABGELEITET = ['ernaehrungszustand'];

// Welche Spalte eine Tabellenzeile trägt. Ohne sie ist die Zeile ohne Gegenstand.
const VORBEFUND_PFLICHTSPALTE = { pflegepersonen: 'name', krankenhaus: 'grund' };

// Die Regeln für die Befundeinträge – gebraucht beim Einlesen und beim Knopf.
function vorbefundBefundRegeln() {
    return [
        'ZWINGEND – dies ist eine Übertragung, keine Beurteilung:',
        '1. Gib NUR wieder, was im Gutachten tatsächlich steht. Erfinde nichts, schließe nichts.',
        '2. Findest du zu einem Eintrag nichts, LASS IHN WEG. Eine fehlende Angabe ist eine',
        '   Information; eine geratene ist ein Schaden.',
        '3. Zu JEDEM Eintrag gehört „beleg": die Textstelle aus dem Gutachten, auf die er sich',
        '   stützt – wörtlich, höchstens ein Satz. Ohne Beleg kein Eintrag.',
        '4. „stufe" MUSS wörtlich eine der zu diesem Eintrag genannten Stufen sein. Passt keine,',
        '   schreib die Feststellung stattdessen unter „befund_weitere".',
        '5. Bei Einträgen mit [je rechts und links] gib zwei Zeilen zurück, „seite" ist',
        '   „rechts" oder „links". Steht nur eine gemeinsame Angabe („beidseits", „bds."), gib',
        '   zwei Zeilen mit derselben Stufe zurück.',
        '6. Freitexteinträge füllst du in „text", knapp und wörtlich am Gutachten.',
        '',
        'BEFUNDEINTRÄGE MIT FESTER SKALA:',
        vorbefundAufgabe(),
        '',
        'befund_weitere: Befunde, für die es oben keinen Eintrag gibt – Hautauffälligkeiten,',
        'Pflegezustand, Luftnot, Schmerzen, Ernährungszustand laut Gutachter und Ähnliches.',
        '„gruppe" ist eine dieser Kennungen: ' + BEFUND_GRUPPEN.map(g => g.id).join(', ') + '.',
        '„titel" ist die Bezeichnung (z. B. „Haut"), „text" die Feststellung am Wortlaut.',
        'Den Ernährungszustand NICHT als Stufe angeben – die App leitet ihn aus dem BMI ab.'
    ].join('\n');
}

/* Die Regeln für die Erfassungstabellen. Sie nennen ausdrücklich, WO im Gutachten die
   Angaben stehen: Die Versorgung steht nicht im Befund, sondern in 1.3, 1.4 und unter
   4.5.1 „Angaben zur Versorgung". Wer nur den Befund liest, findet sie nie – genau daran
   ist die erste Fassung dieser Funktion gescheitert. */
function vorbefundTabellenRegeln() {
    return [
        'WO DIE ANGABEN STEHEN (Medizinischer Dienst; bei Medicproof entsprechend 5.x):',
        '- 1.3 „Vorhandene Hilfsmittel, Pflegehilfsmittel, Nutzung"',
        '- 1.4 „Pflegerelevante Aspekte der Versorgungs- und Wohnsituation" mit der',
        '  Beschreibung der Versorgungssituation, der Tabelle „Pflege durch" (Pflegetage und',
        '  Pflegestunden pro Woche) und der Beschreibung der Wohnsituation',
        '- 4.5.1 „Angaben zur Versorgung": Arztbesuche, Medikamente, Heilmitteltherapie,',
        '  Behandlungspflege',
        '- Krankenhausaufenthalte stehen meist in der Anamnese (1.2).',
        '',
        'pflegepersonen: je Pflegeperson und je Pflegedienst eine Zeile.',
        '  „art" ist „Pflegeperson" oder „Ambulanter Pflegedienst". „name" ist der Name bzw. die',
        '  Einrichtung, „geboren" tt.mm.jjjj, „adresse" die Anschrift. „tage" = Pflegetage pro Woche,',
        '  „wochenstunden" = Pflegestunden pro Woche – beides aus der Tabelle „Pflege durch".',
        '  „unterstuetzung" = wobei geholfen wird, knapp am Wortlaut der Versorgungssituation.',
        'krankenhaus: „von" und „bis" als tt.mm.jjjj, „grund" = Aufnahmediagnose.',
        'hilfsmittel: JEDES genannte Hilfsmittel eine Zeile, auch Brille und Hausnotruf.',
        '  „nutzung" ist „ungenutzt", wenn das Gutachten das sagt, sonst „genutzt".',
        '  Auch Hilfsmittel aus der Beschreibung der Wohnsituation (Treppenlift, Haltegriffe),',
        '  wenn sie dort ausdrücklich als vorhanden genannt sind.',
        '  Mengen gehören in die Bezeichnung („Rollator, insgesamt drei") – „anzahl" und',
        '  „zeitraum" sind AUSSCHLIESSLICH die Häufigkeit, mit der eine Person dabei hilft.',
        '  „taetigkeit" = was die Pflegeperson damit tut; leer, wenn niemand hilft.',
        '  KÖRPERNAHE HILFSMITTEL (Kompressionsstrümpfe, CPAP-Maske, Hörgerät, Prothese) gehören',
        '  mit ihrer Hilfe HIERHER, auch wenn das Gutachten sie unter Behandlungspflege nennt:',
        '  „Anziehen 1 mal täglich" und „Ausziehen 1 mal täglich" ergeben EINE Zeile mit',
        '  anzahl 2, zeitraum „pro Tag", taetigkeit „An- und Ausziehen".',
        'arztbesuche: je Fachrichtung oder Therapie eine Zeile; „anzahl" und „zeitraum" („pro',
        '  Woche", „pro Monat", „im Quartal", „im Jahr"); „begleitung" ist „in Begleitung", wenn',
        '  das Gutachten Begleitung oder Hilfe beim Praxisbesuch nennt, sonst „selbständig".',
        '  Heilmittel wie Physiotherapie gehören ebenfalls hierher.',
        'medikation: EINE Zeile je Applikationsort, NICHT je Medikament. Präparate nicht benennen.',
        '  „applikation" wörtlich einer dieser Orte: ' + APPLIKATION.map(a => '„' + a + '"').join(' | ') + '.',
        '  „praeparate" = Anzahl unterschiedlicher Arzneimittel an diesem Ort, falls genannt.',
        '  „anzahl" und „zeitraum" („pro Tag", „pro Woche", „pro Monat") = Häufigkeit der Hilfe.',
        '  „unterstuetzung" wörtlich eines von: ' + MEDIKATION_HILFE.map(h => '„' + h + '"').join(' | ') + '.',
        '  Verschiedene Hilfen am selben Ort sind getrennte Zeilen: „Richten 1x wöchentlich und',
        '  bereitstellen für den Tag" ergibt eine Zeile „Stellen", 1, „pro Woche" und eine Zeile',
        '  „Bereitstellen", 1, „pro Tag". „Sprays und Augentropfen selbständig" ergibt je eine',
        '  Zeile mit „selbständig".',
        'behandlungspflege: NUR pflegerische Maßnahmen wie Verbandswechsel, Wundversorgung,',
        '  Absaugen, Injektionen, Messungen, Stoma, Katheter. „durchfuehrung" ist',
        '  „durch Pflegeperson" oder „selbständig".',
        'Jede Zeile braucht „beleg" – die Textstelle, wörtlich, höchstens ein Satz.'
    ].join('\n');
}

function vorbefundAnweisung() {
    return [
        'Du liest ein Pflegegutachten und überträgst die dort BESCHRIEBENEN Feststellungen in die',
        'Erfassungsmaske eines Höherstufungsantrags.',
        '',
        vorbefundBefundRegeln(),
        '',
        vorbefundTabellenRegeln(),
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
        if (!e || e.nba || e.berechnet || VORBEFUND_ABGELEITET.indexOf(e.id) > -1) {
            verworfen.push((v.id || '?') + ': kein solcher Eintrag'); return;
        }
        if (!(v.beleg || '').trim()) { verworfen.push(e.titel + ': ohne Fundstelle'); return; }
        if (e.frei) {
            if (!(v.text || '').trim()) { verworfen.push(e.titel + ': ohne Text'); return; }
            befunde.push({ id: e.id, titel: e.titel, seite: null, frei: true,
                           text: v.text.trim(), beleg: v.beleg.trim() });
            return;
        }
        const idx = (e.skala || []).findIndex(s => s.toLowerCase() === String(v.stufe || '').trim().toLowerCase());
        if (idx < 0) { verworfen.push(e.titel + ': Stufe „' + (v.stufe || '') + '" gibt es dort nicht'); return; }
        /* Einträge mit rechts/links kennen keinen Wert „ohne Seite" – die Maske zeigt nur die
           beiden Seiten. Eine gemeinsame Angabe („beidseits") gilt deshalb für beide. */
        const seiten = !e.seiten ? [null]
            : (/^(rechts|links)$/i.test(v.seite || '') ? [v.seite.toLowerCase()] : ['rechts', 'links']);
        seiten.forEach(seite => {
            // Doppelt genannte Seite nur einmal
            if (befunde.some(b => b.id === e.id && b.seite === seite)) return;
            befunde.push({ id: e.id, titel: e.titel, seite: seite, frei: false,
                           idx: idx, stufe: e.skala[idx], beleg: v.beleg.trim() });
        });
    });

    // Befunde ohne Katalogeintrag – sie gehen als weiterer Eintrag in ihre Gruppe
    const gruppenIds = BEFUND_GRUPPEN.map(g => g.id);
    (antwort.befund_weitere || []).forEach(v => {
        const titel = (v.titel || '').trim(), text = (v.text || '').trim();
        if (!titel || !text) return;
        if (!(v.beleg || '').trim()) { verworfen.push(titel + ': ohne Fundstelle'); return; }
        const gruppe = gruppenIds.indexOf(v.gruppe) > -1 ? v.gruppe : 'sonstiges';
        befunde.push({ id: null, weitere: true, gruppe: gruppe, titel: titel, text: text,
                       seite: null, frei: true, beleg: v.beleg.trim() });
    });

    /* Tabellenzeilen werden gegen die Spaltendefinition geprüft, nicht bloß übernommen:
       Ein Auswahlfeld darf nur einen Wert bekommen, den es dort wirklich gibt – sonst steht
       in der Maske später eine Auswahl, die beim ersten Anfassen wieder verschwindet. */
    const tab = (name, liste) => {
        const t = ERFASSUNG_TABELLEN.find(x => x.id === name);
        if (!t) return [];
        const schluessel = VORBEFUND_PFLICHTSPALTE[name] || t.spalten[0].k;
        return (liste || []).map(v => {
            const wert = (v[schluessel] || '').toString().trim();
            if (!wert) return null;
            if (!(v.beleg || '').trim()) { verworfen.push(t.titel + ' „' + wert + '": ohne Fundstelle'); return null; }
            const zeile = { _tabelle: name, _beleg: v.beleg.trim() };
            t.spalten.forEach(s => {
                if (s.berechnet) return;
                const w = (v[s.k] == null ? '' : String(v[s.k])).trim();
                if (!w) return;
                // Datumsfelder kommen als tt.mm.jjjj und brauchen die Form des Eingabefelds
                if (s.typ === 'date') {
                    const d = formatToYYYYMMDD(w);
                    if (d) zeile[s.k] = d;
                    return;
                }
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
            // Fiel die Pflichtspalte durch die Prüfung, bliebe eine Zeile ohne ihren Gegenstand übrig.
            if (!zeile[schluessel]) return null;
            /* Pflegepersonen: Das Gutachten nennt Pflegetage und Pflegestunden PRO WOCHE, die
               Maske fragt Tage pro Woche und Stunden am Tag. Umgerechnet wird hier, damit die
               Wochenstunden stimmen und nicht aus einer geratenen Tagesstundenzahl entstehen. */
            if (name === 'pflegepersonen') {
                const wo = parseFloat(String(v.wochenstunden || '').replace(',', '.'));
                const tg = parseFloat(String(zeile.tage || '').replace(',', '.'));
                if (wo > 0) {
                    zeile.wochenstunden = haeufigkeitDE(rundeKaufmaennisch(wo, 1));
                    if (tg > 0 && !zeile.stunden) zeile.stunden = String(rundeKaufmaennisch(wo / tg, 1));
                }
            }
            return zeile;
        }).filter(Boolean);
    };
    const erfassungZeilen = vorbefundKoerpernahZusammenfuehren([]
        .concat(tab('pflegepersonen', antwort.pflegepersonen))
        .concat(tab('krankenhaus', antwort.krankenhaus))
        .concat(tab('hilfsmittel', antwort.hilfsmittel))
        .concat(tab('arztbesuche', antwort.arztbesuche))
        .concat(tab('medikation', antwort.medikation))
        .concat(tab('behandlungspflege', antwort.behandlungspflege)));
    return { befunde: befunde, erfassung: erfassungZeilen, verworfen: verworfen };
}

/* Körpernahe Hilfsmittel stehen im Gutachten oft unter Behandlungspflege („Anziehen
   Kompressionsstrümpfe 1 mal täglich", „Ausziehen … 1 mal täglich") UND in der Liste der
   Hilfsmittel. In die Maske gehört das genau EINMAL, in die Hilfsmitteltabelle – sonst
   addiert die App beide Häufigkeiten und 4.5.7 fällt zu hoch aus (Regel 17). Das wird hier
   fest zusammengeführt, statt sich darauf zu verlassen, dass die KI es richtig macht. */
function vorbefundKoerpernahZusammenfuehren(zeilen) {
    const stichwort = t => {
        const m = String(t || '').toLowerCase().match(HILFSMITTEL_MASSNAHMEN);
        return m ? m[0].toLowerCase().replace('hoergeraet', 'hörgerät') : null;
    };
    const ergebnis = zeilen.filter(z => !(z._tabelle === 'behandlungspflege'
        && stichwort((z.art || '') + ' ' + (z.beschreibung || ''))));
    zeilen.forEach(z => {
        if (z._tabelle !== 'behandlungspflege') return;
        const wort = stichwort((z.art || '') + ' ' + (z.beschreibung || ''));
        if (!wort) return;
        const taetigkeit = ((z.beschreibung || '').trim() || (z.art || '').trim());
        let hm = ergebnis.find(x => x._tabelle === 'hilfsmittel' && stichwort(x.bezeichnung) === wort);
        if (!hm) {
            hm = { _tabelle: 'hilfsmittel', _beleg: z._beleg, bezeichnung: (z.art || '').trim(), nutzung: 'genutzt' };
            ergebnis.push(hm);
        } else if (z._beleg && (hm._beleg || '').indexOf(z._beleg) === -1) {
            hm._beleg = (hm._beleg ? hm._beleg + ' · ' : '') + z._beleg;
        }
        // Gleicher Zeitraum: Häufigkeiten addieren (An- und Ausziehen sind zwei Maßnahmen)
        const n = parseFloat(z.anzahl), alt = parseFloat(hm.anzahl);
        if (n > 0 && (!hm.zeitraum || hm.zeitraum === z.zeitraum)) {
            hm.anzahl = String((alt > 0 ? alt : 0) + n);
            if (z.zeitraum) hm.zeitraum = z.zeitraum;
        }
        // Wer hilft, steht in der Tätigkeit – ohne sie zählt das Hilfsmittel nicht
        if (z.durchfuehrung !== 'selbständig' && taetigkeit) {
            const vorhanden = (hm.taetigkeit || '').toLowerCase();
            if (vorhanden.indexOf(taetigkeit.toLowerCase()) === -1) {
                hm.taetigkeit = (hm.taetigkeit ? hm.taetigkeit + '; ' : '') + taetigkeit;
            }
        }
        hm.nutzung = 'genutzt';
    });
    return ergebnis;
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
            if (vorbefundBefundEintragen(f.befunde[idx])) n++;
        } else if (k.charAt(0) === 'e') {
            if (vorbefundZeileEintragen(f.erfassung[idx])) n++;
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

/* Einen geprüften Befund in die Maske schreiben. Eine Stelle für beide Wege – den Knopf und
   die Übernahme nach dem Einlesen –, damit beide gleich kennzeichnen. */
function vorbefundBefundEintragen(b) {
    if (!b) return false;
    if (b.weitere) {
        if (!befundExtra[b.gruppe]) befundExtra[b.gruppe] = [];
        const liste = befundExtra[b.gruppe];
        // Dieselbe Feststellung nicht zweimal anhängen
        if (liste.some(x => (x.titel || '') === b.titel && (x.text || '') === b.text)) return false;
        liste.push({ titel: b.titel, text: b.text, _vg: true });
        return true;
    }
    const e = befundEintrag(b.id);
    if (!e) return false;
    const schl = befundSchluessel(e, b.seite);
    if (b.frei) befundTexte[schl] = b.text;
    else befundWerte[schl] = b.idx;
    befundHerkunft[schl] = 'vorgutachten';
    return true;
}

/* Eine geprüfte Tabellenzeile eintragen. Die Zeile trägt „_vg": Sie stammt aus dem
   Vorgutachten, ist also der frühere Stand, und bleibt markiert, bis sie bearbeitet wird. */
function vorbefundZeileEintragen(z) {
    if (!z || !z._tabelle) return false;
    const werte = {};
    Object.keys(z).forEach(s => { if (s.charAt(0) !== '_') werte[s] = z[s]; });
    werte._vg = true;
    erfHinzufuegen(z._tabelle, werte);
    return true;
}

// ============================================ Einlesen des Vorgutachtens (Höherstufung)
/* Der eigentliche Weg: Wer im Höherstufungsantrag das Vorgutachten einliest, erwartet, dass
   Hilfsmittel, Pflegepersonen, Arztbesuche, Medikation, Behandlungspflege und Befund danach
   in der Maske stehen – nicht erst nach einem zweiten Knopf. Deshalb liest DERSELBE
   Einleseaufruf diese Abschnitte mit (ein Aufruf, nicht zwei – der Schlüssel läuft sonst ins
   Limit). Die Angaben erscheinen in der Prüfansicht, jede mit Fundstelle, und werden nach
   der Freigabe eingetragen. Die Prüfansicht IST die Prüfung: Wie Stammdaten und Diagnosen
   sind die Zeilen dort vorausgewählt; was nicht stimmt, wird abgehakt.
   Widerspruch, Erstantrag und das Zweitgutachten der Anhörung lesen unverändert. */
function vorbefundImportAktiv() {
    return typeof appModus !== 'undefined' && appModus === 'hoeherstufung'
        && typeof importZiel !== 'undefined' && importZiel === 'orig';
}

function vorbefundImportAnweisung() {
    return [
        '',
        '============================================================',
        'ZUSÄTZLICH – HÖHERSTUFUNGSANTRAG: FELD „versorgung"',
        '============================================================',
        'Übertrage die im Gutachten beschriebenen Feststellungen in das Feld „versorgung". Sie',
        'werden dem Pflegeberater zur Prüfung angezeigt und nach seiner Freigabe in die',
        'Erfassungsmaske eingetragen. Es ist der Stand des Vorgutachtens – bewerte nicht, ob er',
        'noch zutrifft.',
        '',
        vorbefundBefundRegeln(),
        '',
        vorbefundTabellenRegeln()
    ].join('\n');
}

// Das Einleseschema um das Feld „versorgung" erweitern
function vorbefundImportSchema(schema) {
    if (schema && schema.properties) schema.properties.versorgung = VORBEFUND_SCHEMA;
    return schema;
}

// Rohe Antwort der KI -> geprüfte, in der Prüfansicht an- und abwählbare Angaben
function vorbefundAusImport(versorgung) {
    if (!versorgung || typeof versorgung !== 'object') return null;
    const f = vorbefundPruefen(versorgung);
    f.befunde.forEach(b => { b._an = true; });
    f.erfassung.forEach(z => { z._an = true; });
    return f;
}

const VORBEFUND_TABELLENNAMEN = {
    pflegepersonen: 'Pflegeperson und Pflegedienst', krankenhaus: 'Krankenhausaufenthalte',
    hilfsmittel: 'Hilfsmittel', arztbesuche: 'Arzt- und Therapiebesuche',
    medikation: 'Medikation', behandlungspflege: 'Behandlungspflege'
};

// Lesbare Kurzfassung einer Tabellenzeile für die Prüfansicht
function vorbefundZeileText(z) {
    const t = ERFASSUNG_TABELLEN.find(x => x.id === z._tabelle);
    if (!t) return '';
    return t.spalten.filter(s => z[s.k]).map(s => {
        const w = (s.typ === 'date') ? formatDE(z[s.k]) : z[s.k];
        return (s.typ === 'number' || s.berechnet) ? s.l + ' ' + w : w;
    }).join(' · ');
}

function vorbefundReviewHtml(rev) {
    if (!rev || !rev.vorbefund) return '';
    const f = rev.vorbefund;
    const esc = escapeHtml;
    const zeile = (art, idx, titel, wert, beleg, an) => `
        <label class="vs-item" style="border-left-color:var(--accent2);align-items:flex-start;margin-bottom:6px">
            <input type="checkbox" ${an ? 'checked' : ''} onchange="rvVorbefund('${art}',${idx},this.checked)">
            <div style="flex:1">
                <div class="vs-grund">${titel ? esc(titel) + (wert ? ': ' + esc(wert) : '') : esc(wert)}</div>
                <div class="vs-fund">Laut Gutachten: „${esc(beleg || '')}“</div>
            </div>
        </label>`;
    let html = `<div class="rev-section" id="rev-vorbefund"><div class="rev-sec-title">Für die Erfassung im Höherstufungsantrag</div>
        <p style="font-size:12px;line-height:1.65;color:var(--text-secondary);padding:0 2px;margin-bottom:10px">
          Diese Angaben stehen im Gutachten. Mit „Übernehmen" werden sie in Reiter 1 (Versorgung)
          und Reiter 2 (Befunderhebung) eingetragen. <b>Haken entfernen, was nicht übernommen werden soll.</b>
          Es ist der Stand des Vorgutachtens – übernommene Einträge bleiben markiert, bis Sie sie bearbeitet haben.
        </p>`;
    if (!f.befunde.length && !f.erfassung.length) {
        html += '<div class="vs-leer">Im Gutachten ließen sich keine Angaben zur Versorgung finden.</div>';
    }
    Object.keys(VORBEFUND_TABELLENNAMEN).forEach(tid => {
        const zeilen = f.erfassung.map((z, i) => ({ z, i })).filter(x => x.z._tabelle === tid);
        if (!zeilen.length) return;
        html += `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin:12px 0 6px">${esc(VORBEFUND_TABELLENNAMEN[tid])}</div>`
             + zeilen.map(x => zeile('e', x.i, '', vorbefundZeileText(x.z), x.z._beleg, x.z._an)).join('');
    });
    if (f.befunde.length) {
        html += `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin:12px 0 6px">Befunderhebung</div>`
             + f.befunde.map((b, i) => zeile('b', i, b.titel + (b.seite ? ' ' + b.seite : ''),
                    b.frei ? b.text : b.stufe, b.beleg, b._an)).join('');
    }
    if (f.verworfen.length) {
        html += `<div class="hinweis-warnung" style="margin-top:10px"><b>Nicht übernommen:</b> ${esc(f.verworfen.join(' · '))}<br>
            Diese Angaben passten zu keinem Feld oder hatten keine Fundstelle. Bitte von Hand erfassen.</div>`;
    }
    return html + '</div>';
}

// An- und Abwählen in der Prüfansicht
function rvVorbefund(art, idx, an) {
    if (!reviewData || !reviewData.vorbefund) return;
    const liste = (art === 'b') ? reviewData.vorbefund.befunde : reviewData.vorbefund.erfassung;
    if (liste[idx]) liste[idx]._an = !!an;
}

/* Nach der Freigabe eintragen. Die Erfassung wurde vorher geleert (neuer Fall).
   Auch der Kopf „Vorgutachten und Veränderung" wird gefüllt: Pflegegrad und Datum des
   Vorgutachtens stehen im Gutachten selbst – eine eigene Eingabe des Beraters bleibt stehen. */
function vorbefundImportUebernehmen(rev) {
    if (typeof appModus === 'undefined' || appModus !== 'hoeherstufung' || !rev) return 0;
    let n = 0;
    if (rev.vorbefund) {
        rev.vorbefund.erfassung.forEach(z => { if (z._an && vorbefundZeileEintragen(z)) n++; });
        rev.vorbefund.befunde.forEach(b => { if (b._an && vorbefundBefundEintragen(b)) n++; });
    }
    if (rev.stam) {
        const pg = String(rev.stam.pg == null ? '' : rev.stam.pg).trim();
        if (!erfassungExtra.pg && /^[1-5]$/.test(pg)) erfassungExtra.pg = pg;
        if (!erfassungExtra.vorgutachten && rev.stam.begutachtung) erfassungExtra.vorgutachten = rev.stam.begutachtung;
    }
    if (typeof berechneBmi === 'function') berechneBmi();
    if (typeof renderErfassung === 'function') renderErfassung();
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
                <b>Beim Einlesen des Vorgutachtens</b> werden Befund, Hilfsmittel, Pflegepersonen,
                Arztbesuche, Medikation und Behandlungspflege bereits übertragen – Sie sehen sie in der
                Prüfansicht und geben sie dort frei. Dieser Knopf ist nur der zweite Weg, etwa für ein Gutachten,
                das vor dieser Funktion eingelesen wurde. Er liest allerdings nur den gespeicherten Befund- und
                Anamnesetext; die Versorgungsangaben aus 1.3, 1.4 und 4.5.1 sind darin nicht enthalten.
                Übernommenes ist der <b>damalige</b> Stand und bleibt markiert, bis Sie es geprüft haben.
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
