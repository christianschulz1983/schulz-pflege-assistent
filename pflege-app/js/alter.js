/* ALTER AM TAG DER BEGUTACHTUNG – Grundlage der Kinderbegutachtung.
   ------------------------------------------------------------------------------
   Die BRi (21.08.2024, Seite 146) sagt es in einem Satz: „Es gilt das Alter am Tag
   der Begutachtung." Nicht heute, nicht das Antragsdatum – der Begutachtungstag.
   Bei einem Kind kurz vor einer Altersgrenze entscheidet ein Monat über Punkte.

   KALENDERRECHNUNG, NICHT TAGE ZÄHLEN. Die Grenzen der BRi lauten „ab 18 Monaten",
   „ab 2 Jahren und 6 Monaten", bei zwei Kriterien „ab 6 Wochen". Ein Monat hat keine
   feste Zahl von Tagen; wer 18 Monate als 540 Tage rechnet, liegt je nach Geburtsdatum
   um mehrere Tage daneben. Deshalb wird in Kalendermonaten gerechnet und nur die
   Wochengrenze in Tagen.

   §§ 187, 188 BGB, auf die die BRi auf Seite 144 ausdrücklich verweist: Der Geburtstag
   zählt mit (§ 187 Absatz 2). Ein Kind erreicht ein Alter von n Monaten an dem Tag,
   der im n-ten Folgemonat dieselbe Tageszahl trägt wie der Geburtstag. Gibt es diesen
   Tag im Zielmonat nicht – 31. August plus 18 Monate –, gilt der letzte Tag des
   Monats (§ 188 Absatz 3).

   Beispiel aus der BRi: Die Sonderregelung gilt „für pflegebedürftige Kinder im Alter
   bis zu 18 Monaten (der Tag, an dem das Kind seinen 18. Lebensmonat vollendet)".
   Ein am 15.01.2025 geborenes Kind erreicht 18 Monate am 15.07.2026; an diesem Tag
   gilt die Regelung nicht mehr.                                                      */

// Drei Altersklassen. Die Namen stehen hier, damit sie nirgends als Text geraten werden.
const ALTERSKLASSE = {
    SAEUGLING: 'saeugling',    // bis zu 18 Monaten – nur Modul 3 und 5, eigene Schwellen
    KIND: 'kind',              // 18 Monate bis unter 11 Jahre – Differenz zur Altersnorm
    ERWACHSEN: 'erwachsen'     // ab 11 Jahren – wie bisher, ohne jede Kinderlogik
};

const ALTERSKLASSE_TEXT = {
    saeugling: 'Kind bis 18 Monate',
    kind: 'Kind unter 11 Jahren',
    erwachsen: 'Erwachsenenmaßstab'
};

/* Ein Datumsfeld (`yyyy-mm-dd`) in ein Datum umwandeln – ohne Zeitzonenfalle.
   `new Date('2019-05-19')` wird als UTC-Mitternacht gelesen; westlich von Greenwich
   ist das örtlich der 18. Mai. Für eine Altersgrenze wäre das ein Tag zu früh. */
function alterDatum(wert) {
    const s = String(wert || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const jahr = Number(m[1]), monat = Number(m[2]), tag = Number(m[3]);
    if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
    const d = new Date(jahr, monat - 1, tag);
    // Fängt den 31. Februar: Der Browser schiebt ihn stillschweigend auf den 3. März.
    if (d.getFullYear() !== jahr || d.getMonth() !== monat - 1 || d.getDate() !== tag) return null;
    return d;
}

/* Datum plus n Kalendermonate, mit der Regel des § 188 Absatz 3 BGB:
   Fehlt der entsprechende Tag im Zielmonat, gilt dessen letzter Tag. */
function alterPlusMonate(d, monate) {
    const jahr = d.getFullYear();
    const monat = d.getMonth() + monate;
    const tag = d.getDate();
    const letzterImZielmonat = new Date(jahr, monat + 1, 0).getDate();
    return new Date(jahr, monat, Math.min(tag, letzterImZielmonat));
}

function alterPlusTage(d, tage) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + tage);
}

/* Hat das Kind am Stichtag die Grenze erreicht?
   Die Grenze ist { m: Monate } oder { w: Wochen } – so, wie die BRi sie schreibt.
   „Erreicht" schließt den Tag selbst ein: Wer am Stichtag 18 Monate alt wird, IST
   18 Monate alt. */
function alterErreicht(geburt, stichtag, grenze) {
    if (!geburt || !stichtag || !grenze) return false;
    const ziel = (grenze.w !== undefined)
        ? alterPlusTage(geburt, grenze.w * 7)
        : alterPlusMonate(geburt, grenze.m || 0);
    return stichtag.getTime() >= ziel.getTime();
}

/* Vollendete Lebensmonate am Stichtag – nur für die Anzeige und für die Altersklasse.
   Gerechnet wird über die Kalenderdifferenz, nicht über Tage. */
function alterInMonaten(geburt, stichtag) {
    if (!geburt || !stichtag) return null;
    let monate = (stichtag.getFullYear() - geburt.getFullYear()) * 12
               + (stichtag.getMonth() - geburt.getMonth());
    // Der Tag im laufenden Monat ist noch nicht erreicht -> ein Monat weniger.
    if (alterPlusMonate(geburt, monate).getTime() > stichtag.getTime()) monate--;
    return monate < 0 ? null : monate;
}

/* „5 Jahre und 2 Monate", „14 Monate", „3 Jahre" – wie ein Bericht es schreibt. */
function alterText(geburt, stichtag) {
    const monate = alterInMonaten(geburt, stichtag);
    if (monate === null) return '';
    if (monate < 24) return monate === 1 ? '1 Monat' : monate + ' Monate';
    const jahre = Math.floor(monate / 12);
    const rest = monate % 12;
    const j = jahre + ' Jahre';
    if (!rest) return j;
    return j + ' und ' + (rest === 1 ? '1 Monat' : rest + ' Monate');
}

/* Die Altersklasse am Stichtag.
   Grenzen: 18 Monate (§ 15 Absatz 7 SGB XI) und 11 Jahre (BRi Seite 145,
   „Die Tabelle endet mit vollendetem 11. Lebensjahr"). */
function altersklasseAm(geburt, stichtag) {
    if (!geburt || !stichtag) return null;
    if (stichtag.getTime() < geburt.getTime()) return null;   // Stichtag vor der Geburt
    if (alterErreicht(geburt, stichtag, { m: 132 })) return ALTERSKLASSE.ERWACHSEN;
    if (alterErreicht(geburt, stichtag, { m: 18 })) return ALTERSKLASSE.KIND;
    return ALTERSKLASSE.SAEUGLING;
}

/* DIE EINE FUNKTION, DIE DIE OBERFLÄCHE FRAGT.
   Sie liest die beiden Felder und sagt, was Sache ist – einschließlich des Grundes,
   wenn sich nichts sagen lässt.

   Der fehlende Stichtag wird NICHT stillschweigend durch das heutige Datum ersetzt.
   Vorgabe des Verfassers: lieber sichtbar nachfragen. Ein Kind, das heute acht Jahre
   alt ist, war bei einer Begutachtung vor zwei Jahren sechs – und sechs Jahre ist bei
   der Hälfte der Kriterien des Moduls 4 die Grenze.                                  */
function kinderLage() {
    const wert = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const geburt = alterDatum(wert('stam-geboren'));
    const stichtag = alterDatum(wert('stam-begutachtung'));

    if (!geburt) {
        return { klasse: null, geburt: null, stichtag: stichtag, text: '',
                 grund: 'kein Geburtsdatum' };
    }
    if (!stichtag) {
        return { klasse: null, geburt: geburt, stichtag: null, text: '',
                 grund: 'kein Begutachtungsdatum' };
    }
    const klasse = altersklasseAm(geburt, stichtag);
    if (!klasse) {
        return { klasse: null, geburt: geburt, stichtag: stichtag, text: '',
                 grund: 'Begutachtungsdatum liegt vor der Geburt' };
    }
    return {
        klasse: klasse,
        geburt: geburt,
        stichtag: stichtag,
        monate: alterInMonaten(geburt, stichtag),
        text: alterText(geburt, stichtag),
        grund: ''
    };
}

/* Gilt für diesen Fall die Kinderbegutachtung?
   Ab Stufe 4 hängt die Oberfläche daran, ab Stufe 5 die Rechnung. In Stufe 2 fragt
   das noch niemand – die Funktion steht hier, damit es später genau EINE Stelle ist,
   die diese Frage beantwortet. */
function istKinderfall() {
    const lage = kinderLage();
    return lage.klasse === ALTERSKLASSE.SAEUGLING || lage.klasse === ALTERSKLASSE.KIND;
}

/* Der Hinweistext unter dem Begutachtungsdatum. Reine Anzeige – er ändert nichts.  */
function alterHinweisHtml() {
    const lage = kinderLage();

    if (lage.grund === 'kein Geburtsdatum') return '';          // Normalfall, kein Lärm
    if (lage.grund === 'kein Begutachtungsdatum') {
        return '<span class="alter-offen">Für die Altersprüfung fehlt das '
             + 'Begutachtungsdatum. Maßgeblich ist das Alter an diesem Tag, nicht heute.</span>';
    }
    if (lage.grund) return '<span class="alter-offen">' + escapeHtml(lage.grund) + '</span>';

    const alter = escapeHtml(lage.text);
    if (lage.klasse === ALTERSKLASSE.ERWACHSEN) {
        return '<span class="alter-info">Alter bei der Begutachtung: ' + alter
             + ' – ab 11 Jahren gilt der Erwachsenenmaßstab.</span>';
    }
    if (lage.klasse === ALTERSKLASSE.SAEUGLING) {
        return '<span class="alter-kind">Kind, ' + alter + ' bei der Begutachtung – '
             + 'Sonderregelung bis 18 Monate (§ 15 Absatz 7 SGB XI).</span>';
    }
    return '<span class="alter-kind">Kind, ' + alter + ' bei der Begutachtung – '
         + 'Begutachtung nach den Maßstäben für Kinder.</span>';
}

/* Wird von den beiden Datumsfeldern aufgerufen. Zeichnet NUR den Hinweis neu –
   nicht die Karte und nicht die Kriterienliste (Regel 23). */
function alterHinweisZeigen() {
    const el = document.getElementById('alter-hinweis');
    if (!el) return;
    const html = alterHinweisHtml();
    el.innerHTML = html;
    el.style.display = html ? 'block' : 'none';
}
