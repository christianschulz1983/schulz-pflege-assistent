// Abgleich der eingelesenen Namen gegen den Text des Gutachtens.
//
// Anlass: Aus „Beate Eul" wurde beim Einlesen „Beate Eui" – das kleine L wurde als i
// gelesen. Solche Verwechslungen sind bei Schrifterkennung unvermeidbar; unbemerkt bleiben
// dürfen sie nicht, denn der Name steht im Kopf eines Schriftstücks an die Pflegekasse.
//
// Verfahren: Der Name steht in einem Gutachten mehrfach. Kommt die eingelesene Schreibweise
// im Dokumenttext NICHT vor, wohl aber eine Schreibweise, die sich nur in typischen
// Verwechslungszeichen unterscheidet, wird das gemeldet und die Alternative angeboten.

// Zeichen, die bei Schrifterkennung regelmäßig verwechselt werden, auf eine gemeinsame
// Form gebracht. „Eul" und „Eui" ergeben damit denselben Schlüssel.
function namensSchluessel(wort) {
    return String(wort || '')
        .toLowerCase()
        .replace(/rn/g, 'm')          // rn <-> m
        .replace(/cl/g, 'd')          // cl <-> d
        .replace(/vv/g, 'w')          // vv <-> w
        .replace(/[ilj1|!¡]/g, 'i')   // l, I, j, 1, | <-> i
        .replace(/[0oöq]/g, 'o')
        .replace(/[5s]/g, 's')
        .replace(/[8bß]/g, 'b')
        .replace(/[6g]/g, 'g')
        .replace(/[uüv]/g, 'u')
        .replace(/[aä]/g, 'a')
        .replace(/[2z]/g, 'z')
        .replace(/[^a-zäöüß]/g, '');
}

// Alle Wörter des Dokuments, die als Namensbestandteil in Frage kommen.
function namensWoerter(text) {
    return String(text || '').match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-']{1,}/g) || [];
}

/* Prüft einen einzelnen Namensbestandteil.
   Rückgabe: { wort, gefunden, alternativen: [] }
   gefunden = true  -> die Schreibweise steht so im Dokument, alles in Ordnung
   gefunden = false -> steht nicht da; alternativen nennt gleichklingende Schreibweisen */
function pruefeNamensteil(wort, text) {
    const w = String(wort || '').trim();
    if (w.length < 3) return { wort: w, gefunden: true, alternativen: [] };
    if (!String(text || '').trim()) return { wort: w, gefunden: true, alternativen: [] };

    const woerter = namensWoerter(text);
    if (woerter.some(x => x === w)) return { wort: w, gefunden: true, alternativen: [] };

    const schluessel = namensSchluessel(w);
    const treffer = [];
    woerter.forEach(x => {
        if (x === w) return;
        if (namensSchluessel(x) === schluessel && treffer.indexOf(x) === -1) treffer.push(x);
    });
    return { wort: w, gefunden: false, alternativen: treffer };
}

// Anrede und Namensbestandteile trennen
function namensteile(name) {
    return String(name || '').replace(/^\s*(Herr|Frau)\s+/i, '').split(/\s+/).filter(t => t.length > 2);
}

/* Prüft den vollständigen Namen. Liefert die Bestandteile, zu denen es eine abweichende
   Schreibweise im Dokument gibt. */
function pruefeName(name, text) {
    if (!String(text || '').trim()) return [];
    return namensteile(name)
        .map(t => pruefeNamensteil(t, text))
        .filter(e => !e.gefunden && e.alternativen.length);
}

// Anzeige in der Prüfansicht
function nameHinweisAnzeigen() {
    const box = document.getElementById('rev-name-pruefung');
    if (!box || !reviewData) return;
    const funde = pruefeName(reviewData.stam.betreffend, reviewData.text || '');
    if (!funde.length) { box.innerHTML = ''; return; }
    box.innerHTML = funde.map(f => `<div class="hinweis-warnung">
        <b>Bitte prüfen:</b> „${escapeHtml(f.wort)}" kommt im Gutachten so nicht vor.
        Dort steht ${f.alternativen.map(a => `„${escapeHtml(a)}"`).join(' oder ')}.
        Vermutlich ein Lesefehler bei ähnlichen Zeichen.
        ${f.alternativen.map(a => `<button type="button" class="btn btn-secondary"
            style="margin-top:8px;margin-right:6px;padding:4px 10px;font-size:11px"
            onclick="uebernehmeNamensteil('${escapeHtml(f.wort)}','${escapeHtml(a)}')">„${escapeHtml(a)}" übernehmen</button>`).join('')}
    </div>`).join('');
}

// Einen Namensbestandteil durch die im Dokument gefundene Schreibweise ersetzen
function uebernehmeNamensteil(alt, neu) {
    if (!reviewData) return;
    const name = String(reviewData.stam.betreffend || '');
    reviewData.stam.betreffend = name.split(/(\s+)/).map(t => t === alt ? neu : t).join('');
    const feld = document.getElementById('rev-stam-betreffend');
    if (feld) feld.value = reviewData.stam.betreffend;
    nameHinweisAnzeigen();
}
