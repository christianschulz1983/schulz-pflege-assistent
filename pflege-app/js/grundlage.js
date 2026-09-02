// Grundlage für das Anhörungsverfahren.
//
// DER REGELWEG ist „Fall laden": Die gespeicherte Falldatei enthält alle 65 Kriterien
// genau so, wie der Berater sie im Widerspruch gesetzt hat. Nichts wird geraten.
//
// DER AUSWEICHWEG ist dieser hier – für Altfälle, zu denen keine Falldatei mehr
// existiert. Dann werden das Erstgutachten und die damalige pflegefachliche
// Stellungnahme als PDF eingelesen.
//
// Warum das überhaupt geht: Im Widerspruch entspricht die eigene Einschätzung dem
// Gutachten ÜBERALL DORT, wo nicht widersprochen wurde. Die Stellungnahme führt unter
// „Befund und Stellungnahme" genau die Kriterien auf, in denen widersprochen wurde, und
// nennt zu jedem beide Wertungen. Aus Gutachten + Stellungnahme lässt sich der damalige
// Stand also vollständig zusammensetzen – nicht raten.
//
// Was daran unsicher bleibt: Die Wertungen stehen im Fließtext, nicht in einer Tabelle.
// Deshalb wird jede rekonstruierte Wertung in der Prüfansicht als solche gekennzeichnet
// und gegen die Modulsummen der Stellungnahme gegengerechnet.

// Kriterien, die aus der Stellungnahme gelesen wurden (Kennungen). Nur für die Anzeige.
let rekonstruierteKriterien = [];

function stellungnahmeAnweisung() {
    return `Du liest eine PFLEGEFACHLICHE STELLUNGNAHME (Widerspruch) von Familiara.
Es ist KEIN Gutachten. Aufbau des Dokuments:

- Ein Kopf mit Betreffend, Kasse, Bescheiddatum und dergleichen.
- Ein Abschnitt „Allgemeine Angaben".
- Eine Tabelle „Gegenüberstellung" mit den gewichteten Punkten je Modul in ZWEI Spalten:
  links das Gutachten, rechts die Beurteilung des Verfassers.
- Ein Abschnitt „Befund und Stellungnahme". Dort steht je strittigem Kriterium ein Block:
      4.1.1: Positionswechsel im Bett
      Gutachterliche Bewertung: „selbständig"
      <Begründung> … ist somit eine Wertung mit „überwiegend unselbständig" ableitbar.

DEINE AUFGABE – gib für JEDES im Abschnitt „Befund und Stellungnahme" aufgeführte
Kriterium zurück:
  crit      die Kriteriumsnummer, wie sie dort steht (etwa „4.1.1"; bei Medicproof „5.1.1")
  gutachten die Wertung des Gutachters in Anführungszeichen hinter „Gutachterliche Bewertung"
  eigene    die Wertung, die der Verfasser vertritt – sie steht im Begründungstext, meist im
            Schlusssatz („… ist somit eine Wertung mit „X" ableitbar"). Nimm den Wortlaut.

REGELN, die den häufigsten Fehler verhindern:
1. Führe NUR Kriterien auf, die im Abschnitt „Befund und Stellungnahme" einen eigenen
   Block haben. Kriterien, die nur im Fließtext erwähnt werden, gehören NICHT dazu.
2. Erfinde keine Wertung. Steht im Text keine abweichende Wertung, lass „eigene" leer.
3. Bei Kriterien aus Modul 5 (4.5.1 bis 4.5.15) sind die Wertungen HÄUFIGKEITEN, etwa
   „1x pro Woche", „3x pro Tag" oder „entfällt oder selbständig". Gib sie wörtlich zurück.
4. Übernimm aus der Tabelle „Gegenüberstellung" die gewichteten Punkte der Spalte des
   VERFASSERS (nicht des Gutachtens) als eigene_modul_1_weight bis eigene_modul_6_weight
   sowie die Summe als eigene_total_weight. Daran wird gegengerechnet.
5. Die Stellungnahme nennt Zahlen mit Komma (7,50). Gib sie als Zahl zurück (7.5).`;
}

// Wandelt einen Wertungstext aus der Stellungnahme in einen Stufenindex bzw. eine
// Häufigkeit um. Rückgabe null, wenn der Text zu keiner Stufe des Kriteriums passt –
// dann wird nichts eingetragen, statt etwas zu raten.
function wertungAusText(nr, text) {
    const item = ITEMS.find(i => i.nr === nr);
    if (!item || !text) return null;
    const t = String(text).trim().toLowerCase().replace(/^[„"']|[""']$/g, '').trim();
    if (!t) return null;

    if (item.m === 5 && item.group !== 'D') {
        if (/entf[äa]llt|selbst[äa]ndig|keine|nicht zu werten/.test(t)) return { count: 0, period: 'W' };
        const m = t.match(/([\d]+(?:[.,]\d+)?)\s*(?:x|mal)?\s*(?:pro|je|im)?\s*(tag|t[äa]glich|woche|w[öo]chentlich|monat|monatlich)/);
        if (!m) return null;
        const zahl = parseFloat(m[1].replace(',', '.'));
        const zeit = /tag|t[äa]glich/.test(m[2]) ? 'D' : /woche|w[öo]chentlich/.test(m[2]) ? 'W' : 'M';
        if (!Number.isFinite(zahl)) return null;
        return { count: zahl, period: zeit };
    }
    if (!item.opts) return null;
    // Zuerst exakt, dann über die ausgeschriebene Bezeichnung (expandLabel).
    for (let k = 0; k < item.opts.length; k++) {
        const kurz = String(item.opts[k]).toLowerCase();
        const lang = (typeof expandLabel === 'function' ? String(expandLabel(item.opts[k])) : kurz).toLowerCase();
        if (t === kurz || t === lang) return k;
    }
    for (let k = 0; k < item.opts.length; k++) {
        const lang = (typeof expandLabel === 'function' ? String(expandLabel(item.opts[k])) : String(item.opts[k])).toLowerCase();
        if (t.includes(lang) || lang.includes(t)) return k;
    }
    return null;
}

/* Gegenprobe: Ergibt der rekonstruierte Stand dieselben Modulpunkte, die in der
   Stellungnahme stehen? Weicht etwas ab, wurde mindestens ein Kriterium falsch gelesen.
   Gleiche Bauart wie modulGegenprobe() für Gutachten. */
function stellungnahmeGegenprobe(rev) {
    if (!rev || !rev.eigeneSummen) return [];
    const stand = { special: rev.special || 0, values: {} };
    ITEMS.forEach(i => {
        const v = rev.valuesMap[i.id];
        stand.values[i.id] = (i.m === 5 && i.group !== 'D')
            ? { count: (v && typeof v === 'object') ? Number(v.count) || 0 : 0,
                period: (v && typeof v === 'object') ? (v.period || 'W') : 'W' }
            : (Number(v) || 0);
    });
    const r = calculateInternal(stand);
    const modNamen = ['Modul 1 Mobilität', 'Modul 2 Kognition', 'Modul 3 Verhalten',
                      'Modul 4 Selbstversorgung', 'Modul 5 Krankheitsbewältigung', 'Modul 6 Alltagsgestaltung'];
    const abw = [];
    for (let m = 0; m < 6; m++) {
        const laut = rev.eigeneSummen.weights[m];
        if (laut === null || laut === undefined || laut === '') continue;
        if (Math.abs(Number(r.weights[m]) - Number(laut)) > 0.01) {
            abw.push({ modul: modNamen[m], ausKriterien: r.weights[m], lautStellungnahme: Number(laut) });
        }
    }
    return abw;
}

function rvZeigeStellungnahmePruefung() {
    const box = document.getElementById('rev-stellungnahme-pruefung');
    if (!box) return;
    const abw = stellungnahmeGegenprobe(reviewData);
    if (!abw.length) { box.innerHTML = ''; return; }
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    box.innerHTML = '<div class="hinweis-warnung"><b>Bitte prüfen – die gelesenen Wertungen ergeben '
        + 'nicht die Punkte Ihrer damaligen Stellungnahme:</b><br>'
        + abw.map(a => escapeHtml(a.modul) + ': aus den Kriterien ' + f2(a.ausKriterien)
            + ', laut Stellungnahme ' + f2(a.lautStellungnahme)).join('<br>')
        + '<br>In diesen Modulen wurde mindestens eine Wertung falsch gelesen. Gleichen Sie sie '
        + 'mit der PDF links ab.</div>';
}

// Einlesen der damaligen Stellungnahme. Setzt voraus, dass das Erstgutachten schon
// eingelesen ist – ohne dessen Werte gäbe es nichts, worauf die Abweichungen aufsetzen.
async function leseAlteStellungnahme(event) {
    const datei = (event.target.files || [])[0];
    if (!datei) return;
    event.target.value = '';

    if (!Object.keys(stateOrig.values || {}).length) {
        showToast('Bitte zuerst das Erstgutachten einlesen. Die Stellungnahme nennt nur die '
            + 'strittigen Kriterien; alle übrigen Wertungen stammen aus dem Gutachten.', 'error');
        return;
    }

    showOverlay('Damalige Stellungnahme wird gelesen...', 'Datei wird vorbereitet');
    try {
        const daten = await leseStellungnahmeDatei(datei);
        if (!daten) { hideOverlay(); return; }
        importZiel = 'stellungnahme';
        openImportReview(datei, daten, datei.type);
        hideOverlay();
        showToast('Stellungnahme gelesen – bitte die Wertungen prüfen und übernehmen.', 'success');
    } catch (e) {
        hideOverlay();
        console.error('Stellungnahme konnte nicht gelesen werden', e);
        showToast('Die Stellungnahme konnte nicht gelesen werden: ' + (e && e.message ? e.message : e), 'error');
    }
}

// Trennt das Lesen vom Anzeigen – so lässt es sich prüfen, ohne eine Datei zu öffnen.
async function leseStellungnahmeDatei(datei) {
    const base64 = await new Promise((ok, fehler) => {
        const r = new FileReader();
        r.onload = () => ok(r.result.split(',')[1]);
        r.onerror = fehler;
        r.readAsDataURL(datei);
    });
    const mime = datei.type || 'application/pdf';

    const lokal = (typeof isOnlineHosted === 'function' && isOnlineHosted())
        ? null : await tryLocalExtract(base64, mime);
    const textVollstaendig = (typeof textDecktDokumentAb === 'function') && textDecktDokumentAb(lokal);
    const hatText = !!(lokal && lokal.ok && lokal.text && lokal.text.trim().length > 40);

    let teile;
    if (textVollstaendig) {
        teile = [{ text: 'Hier der Text der Stellungnahme:\n\n' + lokal.text }];
    } else if (hatText) {
        teile = [{ text: 'Maschinell gelesener Text (unvollständig, maßgeblich ist das Dokument):\n\n' + lokal.text },
                 { inlineData: { mimeType: mime, data: base64 } }];
    } else {
        teile = [{ text: 'Hier die Stellungnahme als Dokument.' },
                 { inlineData: { mimeType: mime, data: base64 } }];
    }

    const schema = {
        type: 'OBJECT',
        properties: {
            kriterien: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
                crit: { type: 'STRING' }, gutachten: { type: 'STRING' }, eigene: { type: 'STRING' }
            }, required: ['crit'] } },
            eigene_modul_1_weight: { type: 'NUMBER' }, eigene_modul_2_weight: { type: 'NUMBER' },
            eigene_modul_3_weight: { type: 'NUMBER' }, eigene_modul_4_weight: { type: 'NUMBER' },
            eigene_modul_5_weight: { type: 'NUMBER' }, eigene_modul_6_weight: { type: 'NUMBER' },
            eigene_total_weight: { type: 'NUMBER' }
        },
        required: ['kriterien']
    };
    const antwort = await callGeminiWithFallback({
        contents: [{ role: 'user', parts: teile }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
    }, stellungnahmeAnweisung());

    const roh = antwort && antwort.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!roh) throw new Error('Keine Antwort erhalten.');
    let txt = roh.trim();
    const zaun = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (zaun) txt = zaun[1].trim();
    return stellungnahmeZuImport(JSON.parse(txt), lokal && lokal.text);
}

/* Baut aus der KI-Antwort die Struktur, die die Prüfansicht erwartet.
   Grundlage sind die Werte des ERSTGUTACHTENS; darüber werden die in der Stellungnahme
   vertretenen Wertungen gelegt. Genau so ist der Widerspruch damals entstanden. */
function stellungnahmeZuImport(antwort, volltext) {
    const werte = [];
    rekonstruierteKriterien = [];
    const nichtZuordenbar = [];

    ITEMS.forEach(i => {
        if (!i.m) return;
        const v = stateOrig.values[i.id];
        if (i.m === 5 && i.group !== 'D') {
            const o = (v && typeof v === 'object') ? v : { count: 0, period: 'W' };
            werte.push({ id: i.id, val_obj_count: Number(o.count) || 0, val_obj_period: o.period || 'W' });
        } else {
            werte.push({ id: i.id, val_num: Number(v) || 0 });
        }
    });

    (antwort.kriterien || []).forEach(k => {
        // 5.1.1 (Medicproof) auf die interne Zählung 4.1.1 bringen
        const nr = String(k.crit || '').trim().replace(/^5\./, '4.');
        const item = ITEMS.find(i => i.nr === nr);
        if (!item) { if (k.crit) nichtZuordenbar.push(String(k.crit)); return; }
        const wert = wertungAusText(nr, k.eigene);
        if (wert === null) { nichtZuordenbar.push(nr + ' („' + (k.eigene || '') + '")'); return; }
        const eintrag = werte.find(w => w.id === item.id);
        if (!eintrag) return;
        if (typeof wert === 'object') { eintrag.val_obj_count = wert.count; eintrag.val_obj_period = wert.period; }
        else { eintrag.val_num = wert; }
        rekonstruierteKriterien.push(item.id);
    });

    const zahl = x => (x === undefined || x === null || x === '') ? null : Number(x);
    return {
        values_orig: werte,
        _localValues: true,               // keine Modul-Zusammenfassung eines Gutachtens
        _text: volltext || '',
        _nurKriterien: true,
        _rekonstruiert: rekonstruierteKriterien.slice(),
        _nichtZuordenbar: nichtZuordenbar,
        _eigeneSummen: {
            weights: [zahl(antwort.eigene_modul_1_weight), zahl(antwort.eigene_modul_2_weight),
                      zahl(antwort.eigene_modul_3_weight), zahl(antwort.eigene_modul_4_weight),
                      zahl(antwort.eigene_modul_5_weight), zahl(antwort.eigene_modul_6_weight)],
            total: zahl(antwort.eigene_total_weight)
        }
    };
}

/* Übernahme: NUR die eigene Einschätzung wird gesetzt. Das Erstgutachten, die Stammdaten
   und alles andere bleiben unberührt. Geschrieben wird ausschließlich über setzeBewertung.
   Rückgabe: Anzahl der tatsächlich GEÄNDERTEN Kriterien (setzeBewertung meldet einen
   unveränderten Wert als „nicht geschrieben"). */
function uebernehmeAlteStellungnahme(rev) {
    if (!rev) return 0;
    let n = 0;
    ITEMS.forEach(i => {
        if (!i.m) return;
        const v = rev.valuesMap[i.id];
        const wert = (i.m === 5 && i.group !== 'D')
            ? { count: (v && typeof v === 'object') ? Number(v.count) || 0 : 0,
                period: (v && typeof v === 'object') ? (v.period || 'W') : 'W' }
            : (Number(v) || 0);
        // 'import' ist der SCHLÜSSEL der Quelle; BEWERTUNG_QUELLEN.import ist nur ihr
        // Anzeigetext und würde von setzeBewertung zu Recht abgewiesen.
        if (setzeBewertung('own', i.id, wert, 'import')) n++;
    });
    if (typeof fillTable === 'function') { fillTable('own'); calculate('own'); }
    if (typeof aktualisiereGrundlageStatus === 'function') aktualisiereGrundlageStatus();
    return n;
}

// Zeigt an, was für das Anhörungsverfahren schon vorliegt.
function aktualisiereGrundlageStatus() {
    const el = document.getElementById('grundlage-status');
    if (!el) return;
    const gutachten = Object.keys(stateOrig.values || {}).length > 0;
    const eigene = Object.keys(stateEigene.values || {}).length > 0;
    const zweit = (typeof hatZweitgutachten === 'function') && hatZweitgutachten();
    const zeile = (ok, text) => (ok ? '✓ ' : '– ') + text;
    el.innerHTML = [
        zeile(gutachten, 'Erstgutachten'),
        zeile(eigene, 'eigene Beurteilung aus dem Widerspruch'),
        zeile(zweit, 'Anhörungsgutachten')
    ].map(escapeHtml).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
}
