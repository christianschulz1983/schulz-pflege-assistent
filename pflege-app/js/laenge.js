// Längenvorgaben für die erzeugten Texte.
//
// Grundlage der Zeichenzahl: A4 (21 cm) mit 2 cm Rand ergibt 17 cm Satzbreite. Calibri 11 pt
// ergibt darin rund 88 Zeichen je Zeile; bei Zeilenabstand 1,45 stehen etwa 45 Zeilen auf der
// Seite, abzüglich der Absatzabstände rund 41 – also grob 3.600 Zeichen je voller Seite.
// Eine halbe Seite sind demnach etwa 1.800, drei viertel Seiten etwa 2.700 Zeichen.

const LAENGE = {
    allgemeinZeichenMin: 1500,   // darunter wirkt der Abschnitt dünn (nur Hinweis, kein Verstoß)
    allgemeinZeichenMax: 2700,   // drei viertel A4-Seite
    allgemeinWoerterMax: 390,
    begruendungSaetzeMax: 5,
    begruendungWoerterMax: 150,
    // Anhoerungsverfahren: weniger Kriterien, dafuer tiefer begruendet.
    begruendungSaetzeAnhoerung: 8,
    begruendungWoerterAnhoerung: 230
};

// Grenzen je nach Vorgangsart
function satzGrenze() {
    return (typeof appModus !== 'undefined' && appModus === 'anhoerung')
        ? LAENGE.begruendungSaetzeAnhoerung : LAENGE.begruendungSaetzeMax;
}
function wortGrenze() {
    return (typeof appModus !== 'undefined' && appModus === 'anhoerung')
        ? LAENGE.begruendungWoerterAnhoerung : LAENGE.begruendungWoerterMax;
}

// Abkürzungen und Nummern, an denen NICHT getrennt werden darf.
const _KEIN_SATZENDE = [
    'z. B.', 'z.B.', 'u. a.', 'u.a.', 'd. h.', 'd.h.', 'ggf.', 'bzw.', 'ca.', 'evtl.',
    'inkl.', 'zzgl.', 'Nr.', 'Abs.', 'Art.', 'Ziff.', 'vgl.', 'Dr.', 'Prof.', 'med.',
    'Hr.', 'Fr.', 'usw.', 'etc.', 'max.', 'min.', 'Std.', 'Min.', 'lt.', 'sog.', 'i. d. R.', 'i.d.R.'
];

function zaehleWoerter(text) {
    const t = (text || '').replace(/<[^>]*>/g, ' ').trim();
    return t ? t.split(/\s+/).length : 0;
}

function zaehleZeichen(text) {
    return (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length;
}

// Zählt Sätze. Kriteriennummern (4.5.13), Dezimalzahlen und gängige Abkürzungen
// beenden keinen Satz.
function zaehleSaetze(text) {
    let t = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return 0;
    _KEIN_SATZENDE.forEach((a, i) => { t = t.split(a).join('' + i + ''); });
    t = t.replace(/(\d)\.(\d)/g, '$1$2');          // 4.5.13 und 3.24
    const teile = t.split(/[.!?…]+(?=["»„“\s]|$)/).map(s => s.trim()).filter(Boolean);
    return teile.length;
}

// Prüft die erzeugten Texte gegen die Vorgaben. Liefert eine Liste der Überschreitungen.
function laengenVerstoesse(map, allgemein) {
    const v = [];
    if (allgemein && allgemein.trim()) {
        const z = zaehleZeichen(allgemein), w = zaehleWoerter(allgemein);
        if (z > LAENGE.allgemeinZeichenMax || w > LAENGE.allgemeinWoerterMax) {
            v.push({ art: 'allgemein', nr: null, ist: w + ' Wörter / ' + z + ' Zeichen',
                     soll: 'höchstens ' + LAENGE.allgemeinWoerterMax + ' Wörter (drei viertel A4-Seite)' });
        }
    }
    Object.keys(map || {}).forEach(nr => {
        const s = zaehleSaetze(map[nr]), w = zaehleWoerter(map[nr]);
        if (s > satzGrenze() || w > wortGrenze()) {
            v.push({ art: 'begruendung', nr: nr, ist: s + ' Sätze / ' + w + ' Wörter',
                     soll: 'höchstens ' + satzGrenze() + ' Sätze' });
        }
    });
    return v;
}

// Anweisungstext für die KI – wird in beide Systemvorgaben eingesetzt, damit die
// Grenzen nur an einer Stelle gepflegt werden.
function laengenVorgabeBegruendung() {
    return `LÄNGE – HARTE OBERGRENZE, WICHTIGER ALS JEDE ANDERE FORMVORGABE:
Jede Begründung besteht aus HÖCHSTENS ${satzGrenze()} Sätzen und höchstens
${wortGrenze()} Wörtern. Nicht mehr – lieber weniger. ${satzGrenze() <= 5
    ? 'Die fünf Bestandteile des Aufbaus sind je EIN Satz; fasse zusammen, statt aufzuzählen.'
    : 'Nutze den Raum für die Argumentation, nicht für Ausschmückung.'} Jeder Satz muss tragen:
keine Einleitungsfloskeln, keine Wiederholung der Kriteriumsbezeichnung, keine
Zusammenfassung des bereits Gesagten. Streiche zuerst Füllwörter und Nebensätze, die
nichts beweisen – niemals aber meine Feststellungen aus den Notizen, das BRi-Zitat oder
den Schlusssatz. Ein prägnanter Vierzeiler ist besser als ein vollständiger Absatz.`;
}

// Hält die KI die Grenzen nicht ein, wird EINMAL gezielt nachgekürzt – nur die zu langen
// Stücke, und ohne die inhaltlichen Vorgaben aufzugeben. Wird ein Text dabei leer oder
// länger als zuvor, bleibt die ursprüngliche Fassung stehen: lieber zu lang als zerstört.
async function kuerzeUeberlaenge(map, allgemein, einleitTitel) {
    const verstoesse = laengenVerstoesse(map, allgemein);
    if (!verstoesse.length) return { map: map, allgemein: allgemein, gekuerzt: 0, offen: [] };

    const stuecke = [];
    verstoesse.forEach(v => {
        if (v.art === 'allgemein') stuecke.push({ nr: '__allgemein__', text: allgemein });
        else stuecke.push({ nr: v.nr, text: map[v.nr] });
    });

    const systemPrompt = `Du kürzt bereits fertige Textabschnitte einer pflegefachlichen Stellungnahme.
Kürze AUSSCHLIESSLICH – formuliere nicht neu, ergänze nichts, ändere keine Aussage und keine Zahl.

Vorgaben:
- Abschnitte mit einer Kriteriumsnummer: höchstens ${satzGrenze()} Sätze und
  ${wortGrenze()} Wörter.
- Der Abschnitt „__allgemein__" (Überschrift „${einleitTitel || 'Allgemeine Angaben'}"):
  höchstens ${LAENGE.allgemeinWoerterMax} Wörter in 3 bis 4 Absätzen.

Was erhalten bleiben MUSS: alle Feststellungen aus den Notizen des Verfassers, jedes wörtliche
Zitat aus den Richtlinien einschließlich der Anführungszeichen, jede Stufenbezeichnung und der
Schlusssatz „Laut gutachterlichen Richtlinien SGB XI ist somit eine Wertung mit „…" ableitbar."
Gestrichen werden Füllwörter, Wiederholungen, Allgemeinplätze und Nebensätze ohne Beweiswert.
Gib zu jeder Nummer den gekürzten Text zurück, sonst nichts.`;

    const eingabe = stuecke.map(s => `--- ${s.nr} ---\n${s.text}`).join('\n\n');
    const schema = { type: "OBJECT", properties: { abschnitte: { type: "ARRAY", items: { type: "OBJECT",
        properties: { nr: { type: "STRING" }, text: { type: "STRING" } }, required: ["nr", "text"] } } },
        required: ["abschnitte"] };

    let gekuerzt = 0;
    try {
        const res = await callGeminiWithFallback({
            contents: [{ role: "user", parts: [{ text: eingabe }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schema }
        }, systemPrompt);
        let txt = res?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!txt) throw new Error('keine Antwort');
        const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) txt = fence[1];
        (JSON.parse(txt.trim()).abschnitte || []).forEach(a => {
            if (!a || !a.nr || !a.text) return;
            const neu = a.text.trim();
            const alt = (a.nr === '__allgemein__') ? allgemein : map[a.nr];
            if (!neu || zaehleZeichen(neu) >= zaehleZeichen(alt)) return;   // nicht besser: verwerfen
            if (a.nr === '__allgemein__') allgemein = neu; else map[a.nr] = neu;
            gekuerzt++;
        });
    } catch (e) {
        console.warn('Nachkürzen übersprungen:', e);
    }
    return { map: map, allgemein: allgemein, gekuerzt: gekuerzt, offen: laengenVerstoesse(map, allgemein) };
}

function laengenVorgabeAllgemein(titel) {
    return `LÄNGE – HARTE OBERGRENZE: höchstens ${LAENGE.allgemeinWoerterMax} Wörter
(etwa ${LAENGE.allgemeinZeichenMax} Zeichen, also eine halbe bis drei viertel A4-Seite),
in 3 bis 4 knappen Absätzen. Der Abschnitt „${titel}" ordnet den Fall ein und benennt die
Schwerpunkte – er nimmt die Einzelbegründungen NICHT vorweg und zählt keine Kriterien auf.
Wird es länger, kürze durch Weglassen von Wiederholungen und Allgemeinplätzen, nicht durch
Weglassen meiner Feststellungen.`;
}
