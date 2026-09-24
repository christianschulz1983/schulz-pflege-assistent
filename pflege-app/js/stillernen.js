// Aus den eigenen Überarbeitungen lernen.
//
// Wunsch des Verfassers: Wenn er einen erzeugten Absatz überarbeitet, soll sich die App das
// Vorher und Nachher merken und mit der Zeit näher an seinem Ton schreiben – zusätzlich zur
// Stilvorlage, die er von Hand pflegt.
//
// So funktioniert es:
//   1. Beim Erzeugen merkt sich die App den Wortlaut jedes Blocks (Allgemeine Angaben und
//      jede Begründung) – das ist das „Vorher" (stilStandMerken).
//   2. Vor dem nächsten Erzeugen, beim Speichern, Drucken und beim Word-Export vergleicht
//      sie den angezeigten Text damit. Jeder geänderte Block wird ein Paar (stilLernenErfassen).
//   3. Die Paare gehen als Stilhinweis in die KI-Anweisung: „so formuliere ich es lieber".
//
// DATENSCHUTZ. Die Paare enthalten Text aus echten Fällen. Deshalb:
//   - Vor dem Speichern werden Name, Anrede mit Nachname, Geburts- und andere Daten,
//     Versicherungs- und lange Nummern sowie die Kasse ersetzt (stilAnonym).
//   - Sie liegen NUR im Browser (localStorage), nie in der Falldatei und nie im Repository.
//   - Die KI wird ausdrücklich angewiesen, aus den Paaren NUR die Sprache zu übernehmen und
//     niemals einen Sachverhalt daraus in den aktuellen Fall zu tragen.
//   - Der Berater sieht jedes Paar in der Auswertung, kann es löschen und die Nutzung ganz
//     abschalten.

const STIL_LERNEN_STORAGE = 'pflege_stil_lernen';
const STIL_LERNEN_AUS = 'pflege_stil_lernen_aus';
const STIL_LERNEN_MAX = 80;          // Paare insgesamt
const STIL_LERNEN_ZEICHEN = 1200;    // je Seite eines Paares
const STIL_LERNEN_PROMPT_MAX = 6;    // wie viele Paare je KI-Aufruf mitgehen

let stilErzeugterStand = null;       // { vorgang, bloecke: { nr|'allgemein': Text } }

// ---------------------------------------------------------------- Speicher
function stilLernenListe() {
    try {
        const s = localStorage.getItem(STIL_LERNEN_STORAGE);
        const l = s ? JSON.parse(s) : [];
        return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
}

function stilLernenSpeichern(liste) {
    try { localStorage.setItem(STIL_LERNEN_STORAGE, JSON.stringify(liste.slice(-STIL_LERNEN_MAX))); }
    catch (e) { /* Speicher voll oder gesperrt: dann wird eben nicht gelernt */ }
}

function stilLernenAktiv() {
    try { return localStorage.getItem(STIL_LERNEN_AUS) !== '1'; } catch (e) { return true; }
}

function stilLernenUmschalten(an) {
    try { localStorage.setItem(STIL_LERNEN_AUS, an ? '0' : '1'); } catch (e) {}
    renderStilLernen();
}

function stilLernenEntfernen(id) {
    stilLernenSpeichern(stilLernenListe().filter(p => p.id !== id));
    renderStilLernen();
}

function stilLernenLeeren() {
    stilLernenSpeichern([]);
    renderStilLernen();
    showToast('Gelernte Formulierungen gelöscht.', 'success');
}

// ---------------------------------------------------------------- Anonymisieren
/* Aus dem Paar wird alles entfernt, was eine Person erkennbar macht. Was hier durchrutscht,
   ginge später an Google – deshalb lieber zu viel ersetzen als zu wenig. */
function stilAnonym(text) {
    let s = String(text || '');
    const feld = id => (document.getElementById(id)?.value || '').trim();
    const name = feld('stam-betreffend');
    /* Platzhalter statt Umschreibung: „bei die versicherte Person" wäre schlechtes Deutsch und
       würde der KI genau das beibringen. Mit <Name> ist erkennbar, dass dort etwas fehlt. */
    s = s.replace(/\b(Herr|Frau)\s+[A-ZÄÖÜ][a-zäöüß]+(\s+[A-ZÄÖÜ][a-zäöüß]+)?/g, '<Name>');
    name.split(/[\s,]+/)
        .filter(t => t.length > 2 && /[A-Za-zÄÖÜäöüß]/.test(t) && !/^(herr|frau)$/i.test(t))
        .forEach(t => { s = s.split(t).join('<Name>'); });
    const kasse = feld('stam-kasse');
    if (kasse.length > 2) s = s.split(kasse).join('<Kasse>');
    s = s.replace(/\b\d{1,2}\.\d{1,2}\.(?:19|20)?\d{2}\b/g, '<Datum>');
    s = s.replace(/\b[A-Z]\s?\d{3}\s?\d{3}\s?\d{3}\b/g, '<Versicherungsnummer>');
    s = s.replace(/\b\d{7,}\b/g, '<Nummer>');
    // Aus „<Name> <Name> <Name>" wird ein Platzhalter
    s = s.replace(/(<Name>)(\s*,?\s*<Name>)+/g, '<Name>');
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
}

// ---------------------------------------------------------------- Erfassen
// Der Wortlaut eines Kriterienblocks ohne Überschrift, Bewertungszeile und Warnungen
function stilBlockText(el) {
    if (!el) return '';
    return Array.from(el.children)
        .filter(ch => !ch.classList.contains('ct') && !ch.classList.contains('zitat-warnung')
                   && !ch.classList.contains('m5-wirkung') && !ch.classList.contains('begruendung-fehlt'))
        .map(ch => (ch.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(t => t && !/^(Gutachterliche Bewertung|Beigefügt):/.test(t))
        .join(' ');
}

// Der angezeigte Stand des Schriftstücks, Block für Block
function stilStandLesen(wurzel) {
    const el = wurzel || document.getElementById('appeal-document');
    const bloecke = {};
    if (!el) return bloecke;
    const notes = el.querySelector('#stmt-notes');
    if (notes) bloecke['allgemein'] = (notes.textContent || '').replace(/\s+/g, ' ').trim();
    el.querySelectorAll('.crit[data-nr]').forEach(c => {
        const t = stilBlockText(c);
        if (t) bloecke[c.getAttribute('data-nr')] = t;
    });
    return bloecke;
}

// Nach dem Erzeugen: das ist der Stand der KI („Vorher")
function stilStandMerken(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    stilErzeugterStand = {
        vorgang: (typeof appModus !== 'undefined') ? appModus : 'widerspruch',
        bloecke: stilStandLesen(d)
    };
}

// Zwei Fassungen desselben Blocks: Ist das eine echte Überarbeitung?
function stilEchteAenderung(vorher, nachher) {
    const a = String(vorher || '').replace(/\s+/g, ' ').trim();
    const b = String(nachher || '').replace(/\s+/g, ' ').trim();
    if (!a || !b || a === b) return false;
    if (b.length < 60) return false;                       // Stichwort statt Formulierung
    if (Math.abs(a.length - b.length) < 8 && a.slice(0, 40) === b.slice(0, 40)
        && a.slice(-40) === b.slice(-40)) return false;    // Tippfehler o. Ä.
    return true;
}

/* Vergleicht den angezeigten Text mit dem gemerkten Stand der KI und legt die Paare ab.
   Rückgabe: Anzahl der neu gelernten Paare. */
function stilLernenErfassen() {
    if (!stilLernenAktiv() || !stilErzeugterStand) return 0;
    const jetzt = stilStandLesen();
    let neu = 0;
    const liste = stilLernenListe();
    Object.keys(stilErzeugterStand.bloecke).forEach(nr => {
        const vorher = stilErzeugterStand.bloecke[nr];
        const nachher = jetzt[nr];
        if (!stilEchteAenderung(vorher, nachher)) return;
        const paar = {
            id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            nr: nr, vorgang: stilErzeugterStand.vorgang, zeit: new Date().toISOString().slice(0, 10),
            vorher: stilAnonym(vorher).slice(0, STIL_LERNEN_ZEICHEN),
            nachher: stilAnonym(nachher).slice(0, STIL_LERNEN_ZEICHEN)
        };
        // Dasselbe Paar nicht zweimal (mehrfaches Speichern desselben Textes)
        if (liste.some(p => p.nachher === paar.nachher && p.nr === paar.nr)) return;
        liste.push(paar);
        neu++;
        // Der neue Stand ist ab jetzt der Vergleichsmaßstab
        stilErzeugterStand.bloecke[nr] = nachher;
    });
    if (neu) stilLernenSpeichern(liste);
    return neu;
}

// Wird an den Stellen aufgerufen, an denen der Berater mit dem Text fertig ist
function stilLernenPruefen(stillMelden) {
    const n = stilLernenErfassen();
    if (n && !stillMelden) {
        showToast(n + ' Überarbeitung(en) gelernt. Die KI schreibt künftig näher an Ihrer Fassung '
            + '(Auswertung → „Gelernte Formulierungen").', 'success');
    }
    if (n) renderStilLernen();
    return n;
}

// ---------------------------------------------------------------- Für die KI
/* Die passendsten Paare: erst zum selben Kriterium, dann zum selben Vorgang, dann die
   jüngsten. Mehr als STIL_LERNEN_PROMPT_MAX gehen nie mit – sonst verdrängen sie das
   eigentliche Material des Falls. */
function stilLernenAuswahl(nrn) {
    if (!stilLernenAktiv()) return [];
    const gesucht = new Set(nrn || []);
    const vorgang = (typeof appModus !== 'undefined') ? appModus : 'widerspruch';
    const liste = stilLernenListe();
    const wert = p => (gesucht.has(p.nr) ? 4 : 0) + (p.vorgang === vorgang ? 2 : 0);
    return liste.slice().reverse()
        .map((p, i) => ({ p: p, rang: wert(p) * 1000 - i }))
        .sort((a, b) => b.rang - a.rang)
        .slice(0, STIL_LERNEN_PROMPT_MAX)
        .map(x => x.p);
}

function stilLernenFuerPrompt(nrn) {
    const paare = stilLernenAuswahl(nrn);
    if (!paare.length) return '';
    return 'MEINE ÜBERARBEITUNGEN AUS FRÜHEREN FÄLLEN – so formuliere ich es lieber:\n'
         + paare.map((p, i) => (i + 1) + '. Von dir vorgeschlagen: „' + p.vorher + '"\n'
                             + '   Von mir geändert zu: „' + p.nachher + '"').join('\n')
         + '\nÜbernimm daraus AUSSCHLIESSLICH Sprache, Satzbau und Reihenfolge der Gedanken.\n'
         + 'STRENG VERBOTEN: einen Sachverhalt, eine Zahl, eine Diagnose oder einen Befund aus diesen\n'
         + 'Beispielen in den vorliegenden Fall zu übernehmen. Sie stammen aus anderen Fällen.\n\n';
}

// ---------------------------------------------------------------- Anzeige
function renderStilLernen() {
    const ziel = document.getElementById('stil-lernen-liste');
    if (!ziel) return;
    const liste = stilLernenListe().slice().reverse();
    const an = stilLernenAktiv();
    const kopf = document.getElementById('stil-lernen-kopf');
    if (kopf) kopf.textContent = liste.length ? liste.length + ' gelernte Formulierung(en)' : 'noch nichts gelernt';
    const schalter = document.getElementById('stil-lernen-an');
    if (schalter) schalter.checked = an;
    ziel.innerHTML = liste.length
        ? liste.map(p => `<div class="befund-zeile">
            <div class="bz-titel">${escapeHtml(p.nr === 'allgemein' ? 'Allgemeine Angaben' : 'Kriterium ' + p.nr)}
                <span style="font-weight:400;color:var(--text-muted);font-size:11px">${escapeHtml(p.vorgang)} · ${escapeHtml(p.zeit)}</span>
                <button type="button" class="btn btn-ghost pz-weg" style="margin-left:auto"
                        onclick="stilLernenEntfernen('${escapeHtml(p.id)}')" title="Paar löschen">✕</button>
            </div>
            <div style="font-size:11px;line-height:1.55;color:var(--text-muted)"><b>Vorschlag:</b> ${escapeHtml(p.vorher)}</div>
            <div style="font-size:11px;line-height:1.55;margin-top:4px"><b>Ihre Fassung:</b> ${escapeHtml(p.nachher)}</div>
        </div>`).join('')
        : '<p style="font-size:12px;color:var(--text-muted)">Sobald Sie einen erzeugten Absatz überarbeiten, '
          + 'merkt sich die App das Vorher und Nachher – beim nächsten Erstellen, Speichern oder Drucken.</p>';
}
