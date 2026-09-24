/* KURZFASSUNG DER MITSCHRIFT FÜR DEN EINLEITENDEN ABSCHNITT.

   Gemeldet: Im Schriftstück standen unter „Allgemeine Angaben" die Notizen des
   Erstgesprächs als Stichpunktliste – wörtlich so, wie sie während des Gesprächs
   getippt wurden („Die Begutachtung erfolgte innerhalb von ca. 45 Minuten." als
   Aufzählungszeichen). Das ist keine pflegefachliche Stellungnahme.

   Ursache: Der ausformulierte Abschnitt kommt von der KI. Fiel sie aus (kein
   Schlüssel, Limit, Netz), fielen ersatzweise die Rohnotizen in das Dokument –
   unformuliert und ohne Längengrenze.

   Regel ab jetzt, für ALLE Vorgänge: In das Schriftstück kommt nie der Rohtext,
   sondern immer eine zusammenhängende Kurzfassung, thematisch gebündelt und
   höchstens so lang, wie es die Vorgabe für den Abschnitt erlaubt (js/laenge.js:
   halbe Seite im Widerspruch, Drittelseite in Anhörung und Antrag). Was nicht mehr
   hineinpasst, wird weggelassen UND gemeldet – nicht heimlich angehängt. */

// Themen, nach denen die Sätze gebündelt werden. Reihenfolge = Reihenfolge im Text.
// Die Einleitung steht im Fließtext vor den Sätzen des Themas.
const NOTIZ_THEMEN = [
    { key: 'ablauf', ein: 'Zum Ablauf der Begutachtung',
      re: /begutachtung|gutachterin|gutachter\b|hausbesuch|aktenlage|telefonisch|minuten|stunde|befragung|aufgeschrieben|nachgefragt|erprob|inaugenschein|vor ort|termin|besuch/i },
    { key: 'mobilitaet', ein: 'Zur Mobilität',
      re: /treppe|gehen|geht |rollator|rollstuhl|umsetzen|aufstehen|sturz|stürz|bett|fortbeweg|gehstock|position|sitzen|laufen|gangbild|gehstrecke|transfer/i },
    { key: 'selbst', ein: 'Zur Selbstversorgung',
      re: /wasch|dusch|baden|anziehen|ankleide|kleidung|essen|trinken|ernährung|toilette|\bwc\b|inkontinen|vorlage|körperpflege|zähne|rasier|kämm|mahlzeit|gewicht/i },
    { key: 'psych', ein: 'Zur psychischen Situation',
      re: /demenz|verwirrt|orientier|gedächtnis|vergisst|angst|unruhe|depress|antrieb|aggress|nachts|nächtlich|schlaf|stimmung|wahn|panik|rückzug|weint/i },
    { key: 'therapie', ein: 'Zu den krankheits- und therapiebedingten Anforderungen',
      re: /medikament|tablett|insulin|spritz|verband|wunde|katheter|stoma|absaug|physio|ergo|logopäd|therapie|arzt|ärzt|klinik|krankenhaus|reha|verordn|diät|schmerz/i },
    { key: 'versorgung', ein: 'Zur Versorgung im Alltag',
      re: /tochter|sohn|ehefrau|ehemann|partner|angehörig|pflegedienst|nachbar|betreu|hilft|unterstütz|übernimmt|versorg|haushalt|einkauf|kocht|allein/i }
];
const NOTIZ_REST_EIN = 'Ergänzend';

// Absatzaufbau je Vorgang. Im Antrag gibt es keine Begutachtung zu rügen – was dort
// zum Ablauf notiert ist, gehört ans Ende, nicht an den Anfang.
const NOTIZ_ABSAETZE = {
    widerspruch: [['ablauf'], ['mobilitaet', 'selbst', 'psych', 'therapie'], ['versorgung', 'rest']],
    anhoerung:   [['ablauf'], ['mobilitaet', 'selbst', 'psych', 'therapie'], ['versorgung', 'rest']],
    erstantrag:  [['mobilitaet', 'selbst', 'psych', 'therapie'], ['versorgung'], ['ablauf', 'rest']],
    hoeherstufung: [['mobilitaet', 'selbst', 'psych', 'therapie'], ['versorgung'], ['ablauf', 'rest']]
};

// Endet der Abschnitt auf eine Abkürzung („ca.", „z. B.")? Dann ist der Punkt kein Satzende.
function endetMitAbkuerzung(s) {
    const t = String(s || '').trim().toLowerCase();
    const liste = (typeof _KEIN_SATZENDE !== 'undefined') ? _KEIN_SATZENDE : [];
    return liste.some(a => t.endsWith(a.toLowerCase()));
}

/* Zerlegt eine Zeile in Sätze. Ohne Lookbehind, damit es in jedem Browser läuft.
   Nicht getrennt wird an Abkürzungen („ca. 45 Minuten") und an Aufzählungsziffern
   („1. Der Gutachter …"); an einem Datum („10.09.2026.") dagegen schon. */
function teileInSaetze(text) {
    const s = String(text || '');
    const re = /([.!?])\s+(?=[A-ZÄÖÜ„])/g;
    const teile = [];
    let letzter = 0, m;
    while ((m = re.exec(s)) !== null) {
        const kandidat = s.slice(letzter, m.index + 1);
        if (endetMitAbkuerzung(kandidat) || /(^|\s)\d{1,2}\.$/.test(kandidat)) continue;
        teile.push(kandidat.trim());
        letzter = re.lastIndex;
    }
    const schluss = s.slice(letzter).trim();
    if (schluss) teile.push(schluss);
    return teile.filter(Boolean);
}

/* Aus der Mitschrift saubere Sätze machen: Aufzählungszeichen weg, großer Anfang,
   Punkt am Ende, Wiederholungen nur einmal. Die Reihenfolge bleibt erhalten. */
function notizSaetze(text) {
    return notizEinheiten(text).reduce((a, e) => a.concat(e.saetze), []);
}

/* EINE ZEILE DER MITSCHRIFT = EINE ANGABE. Ihre Sätze bleiben zusammen und wandern
   gemeinsam in ein Thema. Sonst zerreißt es zusammengehörende Gedanken: „Das Umsetzen
   ist nicht möglich. Es ist somit nicht nachvollziehbar, wie er die Physiotherapiepraxis
   aufsuchen soll." – der zweite Satz gehört zum ersten, nicht zu „Therapie". */
function notizEinheiten(text) {
    const einheiten = [];
    const gesehen = new Set();
    String(text || '').replace(/\r/g, '').split('\n').forEach(zeile => {
        const z = zeile.replace(/^[\s•·◦▪\-–—*]+/, '').replace(/^\d+[.)]\s+/, '').trim();
        if (!z) return;
        const saetze = [];
        teileInSaetze(z).forEach(roh => {
            let t = roh.trim();
            if (t.replace(/[^A-Za-zÄÖÜäöüß0-9]/g, '').length < 3) return;   // Stichwort, kein Satz
            t = t.charAt(0).toUpperCase() + t.slice(1);
            if (!/[.!?]$/.test(t)) t += '.';
            const schluessel = t.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
            if (gesehen.has(schluessel)) return;
            gesehen.add(schluessel);
            saetze.push(t);
        });
        if (saetze.length) einheiten.push({ saetze: saetze, text: saetze.join(' ') });
    });
    return einheiten;
}

// Thema eines Satzes. Das erste passende Thema gewinnt – die Liste steht in der
// Reihenfolge, in der die Themen im Schriftstück auftauchen sollen.
function notizThema(satz) {
    const t = String(satz || '');
    const treffer = NOTIZ_THEMEN.find(x => x.re.test(t));
    return treffer ? treffer.key : 'rest';
}

function notizEinleitung(key) {
    const t = NOTIZ_THEMEN.find(x => x.key === key);
    return t ? t.ein : NOTIZ_REST_EIN;
}

/* DIE KURZFASSUNG. Rückgabe:
   { text, absaetze, uebernommen, ausgelassen, ausgelasseneSaetze }
   Die Grenze ist die Zeichenzahl des Abschnitts (js/laenge.js); mit `budget` lässt
   sich weniger vorgeben, wenn vor der Kurzfassung schon Text steht (Anhörung). */
function kurzfassungAusNotizen(notizen, vorgang, budget) {
    const leer = { text: '', absaetze: [], uebernommen: 0, ausgelassen: 0, ausgelasseneSaetze: [] };
    const einheiten = notizEinheiten(notizen);
    if (!einheiten.length) return leer;
    const grenze = Number.isFinite(budget) ? budget
        : ((typeof allgemeinZeichenGrenze === 'function') ? allgemeinZeichenGrenze() : 1800);
    if (grenze < 120) return { text: '', absaetze: [], uebernommen: 0,
                               ausgelassen: einheiten.length,
                               ausgelasseneSaetze: einheiten.map(e => e.text) };

    const aufbau = NOTIZ_ABSAETZE[vorgang] || NOTIZ_ABSAETZE.widerspruch;
    const gruppen = {};
    einheiten.forEach(e => { const k = notizThema(e.text); (gruppen[k] = gruppen[k] || []).push(e); });

    /* Aufnehmen, solange der Platz reicht – in der Reihenfolge des Aufbaus, damit bei
       knappem Platz das Wichtigste des Vorgangs zuerst steht. Gezählt wird mit den
       Einleitungen, sonst wäre die fertige Fassung länger als erlaubt. */
    const genommen = {};
    let laenge = 0, ausgelassen = [];
    aufbau.forEach(absatz => absatz.forEach(key => {
        (gruppen[key] || []).forEach(e => {
            const zusatz = (genommen[key] ? 0 : notizEinleitung(key).length + 2) + e.text.length + 1;
            if (laenge + zusatz > grenze) { ausgelassen.push(e.text); return; }
            (genommen[key] = genommen[key] || []).push(e.text);
            laenge += zusatz;
        });
    }));

    const absaetze = aufbau.map(absatz => absatz
            .filter(key => (genommen[key] || []).length)
            .map(key => notizEinleitung(key) + ': ' + genommen[key].join(' '))
            .join(' '))
        .filter(Boolean);
    const uebernommen = Object.keys(genommen).reduce((n, k) => n + genommen[k].length, 0);
    return { text: absaetze.join('\n\n'), absaetze, uebernommen,
             ausgelassen: ausgelassen.length, ausgelasseneSaetze: ausgelassen };
}

/* Absätze eines fertigen Textes als Schriftstück-Absätze. Eine Stelle für alle
   Vorgänge – vorher stand dieselbe Zeile dreimal leicht verschieden da. */
function allgemeinAbsaetzeHtml(text) {
    return String(text || '').split(/\n\s*\n/).map(a => a.trim()).filter(Boolean)
        .map(a => `<p>${escapeHtml(a).replace(/\n/g, '<br>')}</p>`).join('');
}

/* Die KI ist angewiesen, Fließtext zu liefern. Kommt dennoch eine Aufzählung zurück,
   wird sie zu Fließtext zusammengezogen: Ein Schriftstück an eine Pflegekasse führt
   keine Stichpunkte. Absätze ohne Aufzählungszeichen bleiben unangetastet – sonst
   würden umbrochene Sätze zerschnitten. */
function alsFliesstext(text) {
    return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(absatz => {
        const zeilen = absatz.split('\n').map(z => z.trim()).filter(Boolean);
        const istListe = zeilen.some(z => /^[•·◦▪\-–—*]\s+/.test(z) || /^\d+[.)]\s+/.test(z));
        if (!istListe) return absatz.trim();
        return zeilen.map(z => {
            let t = z.replace(/^[•·◦▪\-–—*]+\s*/, '').replace(/^\d+[.)]\s+/, '').trim();
            if (!t) return '';
            t = t.charAt(0).toUpperCase() + t.slice(1);
            if (!/[.!?:;]$/.test(t)) t += '.';
            return t;
        }).filter(Boolean).join(' ');
    }).filter(Boolean).join('\n\n').trim();
}
