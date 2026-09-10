// Erweiterte Erfassung für Erstantrag und Höherstufungsantrag:
// Pflegepersonen, Krankenhausaufenthalte, Hilfsmittel, Arzt- und Therapiebesuche,
// Medikation und Behandlungspflege. Alle Tabellen wachsen beim Ausfüllen mit.
// Aus den Angaben zu Besuchen, Medikation und Behandlungspflege lässt sich Modul 5 füllen.

let erfassung = {};        // { tabellenId: [ {spalte: wert, ...}, ... ] }
let erfassungExtra = {};   // Einzelfelder (Vorgutachten, Veränderung)

const HAEUFIGKEIT_ZEITRAUM = ['pro Tag', 'pro Woche', 'pro Monat'];
// Arztbesuche finden oft nur quartalsweise oder jährlich statt (Kontrolltermine).
const ARZT_ZEITRAUM = ['pro Tag', 'pro Woche', 'pro Monat', 'im Quartal', 'im Jahr'];

// Umrechnung eines Zeitraums auf die Einheiten des NBA (Tag/Woche/Monat).
// Modul 5 kennt nur diese drei; Quartal und Jahr werden auf den Monat umgelegt.
// Beispiel: viermal im Jahr entspricht 0,33 pro Monat. Das ist für sich genommen
// wenig, zählt in der Gruppe C aber zur Summe aller Besuche hinzu.
const ZEITRAUM_UMRECHNUNG = {
    'pro Tag':    { period: 'D', teiler: 1 },
    'pro Woche':  { period: 'W', teiler: 1 },
    'pro Monat':  { period: 'M', teiler: 1 },
    'im Quartal': { period: 'M', teiler: 3 },
    'im Jahr':    { period: 'M', teiler: 12 }
};
const BEGLEITUNG = ['selbständig', 'in Begleitung'];
const DURCHFUEHRUNG = ['selbständig', 'durch Pflegeperson'];

const ARZT_FACH = ['Hausarzt', 'Facharzt (bitte ergänzen)', 'Neurologe', 'Psychiater', 'Kardiologe',
    'Orthopäde', 'Urologe', 'Onkologe', 'Augenarzt', 'Zahnarzt'];
const THERAPIE_ART = ['Physiotherapie', 'Ergotherapie', 'Logopädie',
    'Medizinische Fußpflege bei Diabetes mellitus', 'Rehasport', 'Psychotherapie',
    'Dialyse', 'Chemotherapie', 'Tagespflege'];
/* Medikation: Eine Zeile je APPLIKATIONSORT, nicht je Medikament. Die BRi (F 4.5.1) sagt
   das ausdrücklich: „Berücksichtigt wird der einzelne Applikationsort (Ohren- und Augen
   zählen als jeweils ein Ort) und die Applikationshäufigkeit (unabhängig von der Anzahl
   der dort applizierten Arzneimittel)." Augen und Ohren standen bisher in einer Zeile –
   wer beides bekam, verlor dadurch eine Maßnahme. */
const APPLIKATION = ['oral (Tabletten, Tropfen, Säfte)', 'über PEG', 'Augentropfen', 'Ohrentropfen',
    'Dosieraerosol oder Pulverinhalator', 'Zäpfchen oder rektal', 'Medikamentenpflaster', 'Injektion'];

/* Wie hilft die Pflegeperson? Alles außer „selbständig" ist personelle Unterstützung.
   Zur Reihenfolge: Sie steigt vom geringsten zum größten Aufwand. */
const MEDIKATION_HILFE = ['selbständig', 'Erinnerung', 'Bereitstellen', 'Stellen', 'Gabe durch Pflegeperson'];

const HILFSMITTEL_NUTZUNG = ['genutzt', 'ungenutzt'];

/* Behandlungspflege: nur noch die eigentlichen pflegerischen Maßnahmen.
   Körpernahe Hilfsmittel – Kompressionsversorgung, CPAP-Maske, Hörgerät – stehen jetzt
   in der Hilfsmitteltabelle, zusammen mit der Tätigkeit der Pflegeperson. Standen sie
   an beiden Stellen, hat die App die Häufigkeiten addiert. */
const BEHANDLUNGSPFLEGE_ART = ['Verbandswechsel', 'Wundversorgung', 'Absaugen',
    'Injektion verabreichen', 'Blutzucker messen', 'Blutdruck messen',
    'Stoma versorgen', 'Einmalkatheterisierung', 'Abführmaßnahme',
    'Therapiemaßnahme in häuslicher Umgebung'];

// Maßnahmen, die zu einem körpernahen Hilfsmittel gehören und deshalb dort hingehören.
const HILFSMITTEL_MASSNAHMEN = /kompression|cpap|hörgerät|hoergeraet|sauerstoffbrille|schlafapnoe|prothese|orthese|bandage/i;

const ERFASSUNG_TABELLEN = [
    {
        id: 'pflegepersonen', titel: 'Pflegeperson und Pflegedienst',
        hinweis: 'Mehrere Einträge möglich – Pflegeperson, Pflegedienst oder beides.',
        alsFormular: true,          // untereinander statt in einer schmalen Tabelle
        spalten: [
            { k: 'art', l: 'Art', typ: 'select', opt: ['Pflegeperson', 'Ambulanter Pflegedienst'], breit: 1,
              frei: true, kiFrei: true, platzhalter: 'z. B. Nachbarschaftshilfe' },
            { k: 'name', l: 'Name', typ: 'text', breit: 2 },
            { k: 'geboren', l: 'Geburtsdatum', typ: 'date', breit: 1 },
            { k: 'telefon', l: 'Telefon', typ: 'text', breit: 1 },
            { k: 'adresse', l: 'Adresse', typ: 'text', breit: 3 },
            { k: 'tage', l: 'Tage pro Woche', typ: 'number', breit: 1 },
            { k: 'stunden', l: 'Stunden am Tag', typ: 'number', breit: 1 },
            { k: 'wochenstunden', l: 'Wochenstunden', typ: 'text', breit: 1, berechnet: true },
            { k: 'unterstuetzung', l: 'Wobei wird unterstützt', typ: 'text', breit: 4 }
        ]
    },
    {
        id: 'krankenhaus', titel: 'Krankenhausaufenthalte',
        spalten: [
            { k: 'von', l: 'von', typ: 'date', b: '150px' },
            { k: 'bis', l: 'bis', typ: 'date', b: '150px' },
            { k: 'grund', l: 'Aufnahmediagnose / Grund', typ: 'text' }
        ]
    },
    {
        id: 'hilfsmittel', titel: 'Hilfsmittel',
        /* Eine Zeile je Hilfsmittel – hier steht ALLES dazu, auch was die Pflegeperson
           damit tut und wie oft. Vorher gab es dieselbe Angabe ein zweites Mal in der
           Behandlungspflege; die App hat beides addiert und 4.5.7 damit verdoppelt. */
        hinweis: 'Eine Zeile je Hilfsmittel. Das Feld „Tätigkeit der Pflegeperson" ist der Schalter: '
               + 'Steht dort etwas, liegt personelle Hilfe vor und das Hilfsmittel fließt in Modul 5 ein '
               + '(körpernahe Hilfsmittel zu 4.5.7). Bleibt es leer, wird nur aufgelistet. '
               + 'Ungenutzte Hilfsmittel zählen nie. Nicht gewertet werden laut BRi: Brille, '
               + 'Zahnprothese (gehört zu 4.4.2) sowie Gehhilfen wie Rollator, Gehstock oder Rollstuhl.',
        spalten: [
            { k: 'bezeichnung', l: 'Hilfsmittel', typ: 'text' },
            { k: 'nutzung', l: 'Nutzung', typ: 'select', opt: HILFSMITTEL_NUTZUNG, b: '130px' },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: HAEUFIGKEIT_ZEITRAUM, b: '120px' },
            { k: 'taetigkeit', l: 'Tätigkeit der Pflegeperson', typ: 'text' }
        ]
    },
    {
        id: 'arztbesuche', titel: 'Arzt- und Therapiebesuche',
        hinweis: 'Nur regelmäßig wiederkehrende Termine bei dauerhafter Erkrankung. '
               + 'Nur Termine „in Begleitung" fließen in Modul 5 ein.',
        spalten: [
            { k: 'fach', l: 'Fachrichtung oder Therapie', typ: 'select', opt: ARZT_FACH.concat(THERAPIE_ART),
              frei: true, kiFrei: true, platzhalter: 'z. B. Lymphdrainage' },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: ARZT_ZEITRAUM, b: '130px' },
            { k: 'begleitung', l: 'Durchführung', typ: 'select', opt: BEGLEITUNG, b: '140px' },
            { k: 'dauer3h', l: 'über 3 Std.', typ: 'select', opt: ['nein', 'ja'], b: '105px' }
        ]
    },
    {
        id: 'medikation', titel: 'Medikation',
        /* Eine Zeile je Applikationsort – die einzelnen Präparate werden nicht benannt.
           Nach der BRi zählt die Häufigkeit je Ort, nicht die Zahl der Arzneimittel. */
        hinweis: 'Nur ärztlich verordnete Dauermedikation. Eine Zeile je Applikationsort – nicht je '
               + 'Medikament. Nach der BRi zählt die Applikationshäufigkeit, unabhängig davon, wie viele '
               + 'Arzneimittel dort gegeben werden; Augen und Ohren zählen als je ein Ort. Die Zahl der '
               + 'Präparate wird nur festgehalten und verändert die Bewertung nicht. Wird verabreicht, '
               + 'wird das Stellen nicht zusätzlich gezählt. Alles außer „selbständig" fließt in Modul 5 ein.',
        spalten: [
            { k: 'applikation', l: 'Applikationsort', typ: 'select', opt: APPLIKATION, frei: true,
              platzhalter: 'z. B. Nasenspray, Vaginalzäpfchen' },
            { k: 'praeparate', l: 'Unterschiedliche Präparate', typ: 'number', b: '110px' },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: HAEUFIGKEIT_ZEITRAUM, b: '120px' },
            { k: 'unterstuetzung', l: 'Unterstützung', typ: 'select', opt: MEDIKATION_HILFE, b: '190px',
              frei: true, platzhalter: 'eigene Beschreibung der Hilfe' }
        ]
    },
    {
        id: 'behandlungspflege', titel: 'Behandlungspflege',
        hinweis: 'Nur die eigentlichen pflegerischen Maßnahmen: Verbände, Wundversorgung, '
               + 'Absaugen, Injektionen, Messungen, Stoma, Katheter. '
               + 'Körpernahe Hilfsmittel – Kompressionsversorgung, CPAP-Maske, Hörgerät – gehören '
               + 'in die Tabelle „Hilfsmittel", dort mit der Tätigkeit der Pflegeperson. '
               + 'An- und Ablegen zählen jeweils als eigene Maßnahme. '
               + 'Nur Maßnahmen „durch Pflegeperson" fließen in Modul 5 ein.',
        spalten: [
            { k: 'art', l: 'Maßnahme', typ: 'select', opt: BEHANDLUNGSPFLEGE_ART, frei: true, kiFrei: true,
              platzhalter: 'z. B. Trachealkanüle wechseln' },
            { k: 'beschreibung', l: 'Tätigkeitsbeschreibung', typ: 'text' },
            { k: 'anzahl', l: 'Anzahl', typ: 'number', b: '80px' },
            { k: 'zeitraum', l: 'Zeitraum', typ: 'select', opt: HAEUFIGKEIT_ZEITRAUM, b: '120px' },
            { k: 'durchfuehrung', l: 'Durchführung', typ: 'select', opt: DURCHFUEHRUNG, b: '160px' }
        ]
    }
];

// ------------------------------------------------------------------ Darstellung
function renderErfassung() {
    const ziel = document.getElementById('erfassung-bereich');
    if (!ziel) return;
    const hoeher = (appModus === 'hoeherstufung');
    ziel.innerHTML =
        `<div class="card" style="border:1px solid rgba(13,148,136,0.25)">
            <div class="card-header"><div class="dot" style="background:var(--accent2)"></div>Ärztliche Unterlagen einlesen</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Mehrere Arztbriefe, Entlassungsberichte oder Verordnungen auf einmal auswählen. Diagnosen,
                    Krankenhausaufenthalte, Hilfsmittel, Medikation und Therapien werden zusammengeführt und
                    entdoppelt. Sie entscheiden anschließend, was übernommen wird.
                </p>
                <button class="btn btn-ai" onclick="berichteWaehlen()">📎 Arztberichte auswählen</button>
                <input type="file" id="berichtFiles" accept=".pdf,image/*" multiple style="display:none"
                       onchange="leseArztberichte(event)">
            </div>
        </div>

        <div class="card">
            <div class="card-header"><div class="dot"></div>Deckblatt</div>
            <div style="padding:16px 20px">
                <label class="rev-field rev-inline" style="display:flex;align-items:center;gap:10px;cursor:pointer">
                    <input type="checkbox" ${erfassungExtra.deckblatt ? 'checked' : ''}
                           onchange="erfassungExtra.deckblatt=this.checked">
                    <span style="font-size:13px;color:var(--text-primary)">Antragsschreiben an die Pflegekasse voranstellen</span>
                </label>
                <p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-top:8px">
                    Erzeugt als erste Seite ein unterschriftsfertiges Antragsschreiben der versicherten Person
                    mit Anschrift der Kasse, Versichertendaten und Unterschriftszeile.
                </p>
            </div>
        </div>`
        + (hoeher ? `<div class="card">
            <div class="card-header"><div class="dot"></div>Vorgutachten und Veränderung</div>
            <div style="padding:20px"><div class="grid-4" style="gap:16px">
                <div><label class="field-label">Aktueller Pflegegrad</label>
                    <select id="erf-pg" class="field-input" onchange="erfassungExtra.pg=this.value">
                        ${['', '1', '2', '3', '4', '5'].map(p => `<option value="${p}" ${erfassungExtra.pg === p ? 'selected' : ''}>${p ? 'Pflegegrad ' + p : '– bitte wählen –'}</option>`).join('')}
                    </select></div>
                <div><label class="field-label">Datum des Vorgutachtens</label>
                    <input type="date" id="erf-vorgutachten" class="field-input" value="${escapeHtml(erfassungExtra.vorgutachten || '')}"
                           oninput="erfassungExtra.vorgutachten=this.value"></div>
                <div class="col-span-2"><label class="field-label">Verschlechterung seit wann und wodurch</label>
                    <input type="text" id="erf-verschlechterung" class="field-input" placeholder="z. B. seit dem Sturz im März 2026"
                           value="${escapeHtml(erfassungExtra.verschlechterung || '')}" oninput="erfassungExtra.verschlechterung=this.value"></div>
            </div></div></div>` : '')
        + ERFASSUNG_TABELLEN.map(t => `
            <div class="card">
                <div class="card-header"><div class="dot"></div>${escapeHtml(t.titel)}</div>
                <div style="padding:16px 20px">
                    ${t.hinweis ? `<p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-bottom:12px">${escapeHtml(t.hinweis)}</p>` : ''}
                    <div id="erf-vg-${t.id}">${erfVgHinweisHtml(t.id)}</div>
                    ${t.alsFormular
                        ? `<div id="erf-body-${t.id}">${erfZeilen(t)}</div>`
                        : `<div style="overflow-x:auto"><table class="erf-tabelle">
                        <thead><tr>${t.spalten.map(s => `<th${s.b ? ` style="width:${s.b}"` : ''}>${escapeHtml(s.l)}</th>`).join('')}<th style="width:38px"></th></tr></thead>
                        <tbody id="erf-body-${t.id}">${erfZeilen(t)}</tbody>
                    </table></div>`}
                    <button class="btn btn-secondary" style="margin-top:10px" onclick="erfZeileHinzu('${t.id}')">+ Weitere Zeile</button>
                </div>
            </div>`).join('')
        + `<div class="card" style="border:1px solid rgba(37,99,235,0.2)">
            <div class="card-header"><div class="dot" style="background:var(--accent)"></div>Modul 5 aus den Angaben füllen</div>
            <div style="padding:16px 20px">
                <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                    Überträgt Arzt- und Therapiebesuche, Medikation und Behandlungspflege in die Kriterien des
                    Moduls 5. Berücksichtigt werden nur Maßnahmen mit personeller Unterstützung. Bereits von Hand
                    gesetzte Werte werden dabei überschrieben.
                </p>
                <div id="erf-modul5-hinweis" style="font-size:12px;color:var(--text-muted);margin-bottom:12px"></div>
                <div id="erf-doppelt-hinweis" style="margin-bottom:12px"></div>
                <button class="btn btn-primary" onclick="uebernehmeModul5(true)">↧ Modul 5 übernehmen</button>
            </div>
        </div>`;
    zeigeModul5Vorschau();
}

function erfZeilen(t) {
    const zeilen = erfassung[t.id] || [];
    if (!zeilen.length) { erfassung[t.id] = [{}]; }
    return (erfassung[t.id]).map((z, i) => erfZeile(t, i, z)).join('');
}

/* Zeilen aus dem Vorgutachten tragen „_vg". Sie sind der FRÜHERE Stand – im
   Höherstufungsantrag geht es gerade um das, was sich seither geändert hat. Deshalb bleiben
   sie sichtbar markiert, bis der Berater sie bearbeitet. Angezeigt nur im
   Höherstufungsantrag; gespeichert bleibt die Marke, damit sie beim Zurückwechseln stimmt. */
function erfVgZeigen(z) {
    return !!(z && z._vg) && typeof appModus !== 'undefined' && appModus === 'hoeherstufung';
}

function erfVgAnzahl(tid) {
    return (erfassung[tid] || []).filter(erfVgZeigen).length;
}

function erfVgHinweisHtml(tid) {
    const n = erfVgAnzahl(tid);
    return n ? `<div class="erf-vg-hinweis">${n} ${n === 1 ? 'Zeile stammt' : 'Zeilen stammen'} noch unverändert `
             + 'aus dem Vorgutachten (markiert). Bitte auf den heutigen Stand bringen – mit der ersten '
             + 'Änderung entfällt die Markierung.</div>' : '';
}

// Markierung einer Zeile aufheben, ohne die Tabelle neu zu zeichnen (Regel 23)
function erfVgAufheben(tid, i) {
    const z = erfassung[tid] && erfassung[tid][i];
    if (!z || !z._vg) return;
    delete z._vg;
    const zelle = document.querySelector('[data-erf-zelle^="' + tid + '|' + i + '|"]');
    const reihe = zelle ? zelle.closest('tr, .erf-block') : null;
    if (reihe) reihe.classList.remove('erf-vg');
    const hinweis = document.getElementById('erf-vg-' + tid);
    if (hinweis) hinweis.innerHTML = erfVgHinweisHtml(tid);
}

function erfZeile(t, i, z) {
    const vg = erfVgZeigen(z) ? ' erf-vg' : '';
    const vgTitel = vg ? ' title="Aus dem Vorgutachten übernommen – noch nicht bearbeitet"' : '';
    if (t.alsFormular) {
        // Untereinander mit Beschriftung über dem Feld, damit alles lesbar bleibt
        return `<div class="erf-block${vg}"${vgTitel}>
            <div class="erf-block-kopf">
                <span class="erf-block-nr">Eintrag ${i + 1}</span>
                <button class="erf-weg" title="Eintrag entfernen" onclick="erfZeileWeg('${t.id}',${i})">×</button>
            </div>
            <div class="erf-raster">
                ${t.spalten.map(s => `<div style="grid-column:span ${s.breit || 1}">
                    <label class="field-label">${escapeHtml(s.l)}</label>
                    ${erfFeld(t, i, s, z[s.k])}
                </div>`).join('')}
            </div>
        </div>`;
    }
    return `<tr class="${vg.trim()}"${vgTitel}>${t.spalten.map(s => `<td>${erfFeld(t, i, s, z[s.k])}</td>`).join('')}
        <td><button class="erf-weg" title="Zeile entfernen" onclick="erfZeileWeg('${t.id}',${i})">×</button></td></tr>`;
}

/* Eigene Angabe statt Liste.
   Eine Auswahlliste ohne Ausweg ist eine Wand: Die seltene Maßnahme, die zu werten ist,
   ließe sich gar nicht erfassen. Jede Liste, in der eine Angabe BESCHREIBEND ist, trägt
   deshalb als letzten Eintrag „eigene Angabe". Wird er gewählt, wird aus dem Auswahlfeld
   ein Schreibfeld in derselben Zelle; ein kleiner Knopf führt zurück zur Liste.
   Geschlossen bleiben Listen, deren Wert die RECHNUNG steuert – Zeitraum, „in Begleitung",
   „durch Pflegeperson", genutzt/ungenutzt. Eine eigene Angabe würde dort stillschweigend
   nicht mehr zählen; das wäre schlimmer als die fehlende Freiheit. */
const ERF_FREI = '__eigene__';
let erfFreiModus = {};      // "tabelle|zeile|spalte" -> true, solange das Schreibfeld steht

function erfFreiSchluessel(tid, i, key) { return tid + '|' + i + '|' + key; }

function erfFeld(t, i, s, wert) {
    // Kennung, um genau dieses Feld später wiederzufinden, ohne die Tabelle neu zu zeichnen
    const kenn = `data-erf="${t.id}|${i}|${s.k}"`;
    const bei = `oninput="erfSetzen('${t.id}',${i},'${s.k}',this.value)"`;
    const zelle = inhalt => `<span class="erf-zelle" data-erf-zelle="${t.id}|${i}|${s.k}">${inhalt}</span>`;
    if (s.berechnet) {
        return zelle(`<input type="text" class="field-input" ${kenn} readonly style="background:var(--bg-card2)" value="${escapeHtml(wert || '')}">`);
    }
    if (s.typ === 'select') {
        const w = (wert == null) ? '' : String(wert);
        // Schreibfeld, wenn es gerade gewählt wurde ODER ein gespeicherter Wert nicht in der Liste steht
        const eigen = s.frei && (erfFreiModus[erfFreiSchluessel(t.id, i, s.k)] || (w && s.opt.indexOf(w) < 0));
        if (eigen) {
            return zelle(`<span class="erf-frei">`
                + `<input type="text" class="field-input" ${kenn} value="${escapeHtml(w)}"`
                + ` placeholder="${escapeHtml(s.platzhalter || 'eigene Angabe')}" ${bei}>`
                + `<button type="button" class="erf-liste" title="Wieder aus der Liste wählen"`
                + ` onclick="erfZurListe('${t.id}',${i},'${s.k}')">☰</button></span>`);
        }
        const opt = ['<option value=""></option>']
            .concat(s.opt.map(o => `<option ${w === o ? 'selected' : ''}>${escapeHtml(o)}</option>`))
            .concat(s.frei ? [`<option value="${ERF_FREI}">＋ eigene Angabe …</option>`] : []);
        return zelle(`<select class="field-input" ${kenn} onchange="erfSetzen('${t.id}',${i},'${s.k}',this.value)">${opt.join('')}</select>`);
    }
    return zelle(`<input type="${s.typ}" class="field-input" ${kenn} value="${escapeHtml(wert == null ? '' : wert)}" ${bei}>`);
}

/* Zeichnet EIN Feld neu – beim Umschalten zwischen Liste und eigener Angabe. Bewusst nur
   dieses eine: Ein Neuzeichnen der Tabelle würde jede andere Eingabe in der Tabelle stören. */
function erfZelleNeu(tid, i, key, mitFokus) {
    const t = ERFASSUNG_TABELLEN.find(x => x.id === tid);
    const s = t && t.spalten.find(c => c.k === key);
    const zelle = document.querySelector('[data-erf-zelle="' + erfFreiSchluessel(tid, i, key) + '"]');
    if (!t || !s || !zelle) return;
    const wert = (erfassung[tid] && erfassung[tid][i]) ? erfassung[tid][i][key] : '';
    zelle.outerHTML = erfFeld(t, i, s, wert);
    if (mitFokus) {
        const neu = document.querySelector('[data-erf="' + erfFreiSchluessel(tid, i, key) + '"]');
        if (neu) neu.focus();
    }
}

// Zurück zur Liste. Die eigene Angabe wird dabei verworfen – sonst stünde sie unsichtbar weiter da.
function erfZurListe(tid, i, key) {
    delete erfFreiModus[erfFreiSchluessel(tid, i, key)];
    if (erfassung[tid] && erfassung[tid][i]) delete erfassung[tid][i][key];
    erfZelleNeu(tid, i, key, true);
    zeigeModul5Vorschau();
}

function erfSetzen(tid, i, key, wert) {
    if (!erfassung[tid]) erfassung[tid] = [];
    if (!erfassung[tid][i]) erfassung[tid][i] = {};
    // Wer eine Zeile anfasst, hat sie geprüft – sie ist nicht mehr „aus dem Vorgutachten"
    erfVgAufheben(tid, i);
    // „eigene Angabe" gewählt: aus dem Auswahlfeld wird ein Schreibfeld, noch ohne Wert
    if (wert === ERF_FREI) {
        erfFreiModus[erfFreiSchluessel(tid, i, key)] = true;
        delete erfassung[tid][i][key];
        erfZelleNeu(tid, i, key, true);
        zeigeModul5Vorschau();
        return;
    }
    if (wert === '') delete erfassung[tid][i][key]; else erfassung[tid][i][key] = wert;
    // Wochenstunden aus Tagen und Stunden je Tag
    if (tid === 'pflegepersonen' && (key === 'tage' || key === 'stunden')) {
        const z = erfassung[tid][i];
        const t = parseFloat(z.tage), s = parseFloat(z.stunden);
        if (t > 0 && s > 0) z.wochenstunden = haeufigkeitDE(rundeKaufmaennisch(t * s, 1));
        else delete z.wochenstunden;
        erfFeldNachziehen(tid, i, 'wochenstunden', z.wochenstunden || '');
    }
    // Beim Ausfüllen der letzten Zeile eine weitere anbieten
    const t = ERFASSUNG_TABELLEN.find(x => x.id === tid);
    if (t && i === erfassung[tid].length - 1 && Object.keys(erfassung[tid][i]).length) {
        erfassung[tid].push({});
        erfZeileAnhaengen(t);
    }
    zeigeModul5Vorschau();
}

/* Schreibt einen berechneten Wert in sein Feld. Früher wurde dafür die ganze Tabelle neu
   gezeichnet – dabei verschwand das Feld, in dem gerade getippt wurde, samt Schreibmarke. */
function erfFeldNachziehen(tid, i, key, wert) {
    const el = document.querySelector('[data-erf="' + tid + '|' + i + '|' + key + '"]');
    if (el && el.value !== wert) el.value = wert;
}

/* Hängt NUR die neue letzte Zeile an. Das ist der eigentliche Punkt: Beim ersten Buchstaben
   in der letzten Zeile entsteht eine weitere. Wurde dafür die Tabelle neu gezeichnet, ersetzte
   der Browser auch das gerade beschriebene Eingabefeld – die Schreibmarke sprang weg und man
   musste zurückklicken. Angehängt wird jetzt nur, was neu ist; alles Bestehende bleibt stehen. */
function erfZeileAnhaengen(t) {
    const body = document.getElementById('erf-body-' + t.id);
    const i = (erfassung[t.id] || []).length - 1;
    if (!body || i < 0) { renderErfassungTabelle(t.id); return; }
    body.insertAdjacentHTML('beforeend', erfZeile(t, i, erfassung[t.id][i]));
}

function renderErfassungTabelle(tid) {
    const t = ERFASSUNG_TABELLEN.find(x => x.id === tid);
    const body = document.getElementById('erf-body-' + tid);
    if (t && body) body.innerHTML = erfZeilen(t);
}

function erfZeileHinzu(tid) {
    if (!erfassung[tid]) erfassung[tid] = [];
    erfassung[tid].push({});
    const t = ERFASSUNG_TABELLEN.find(x => x.id === tid);
    if (t) erfZeileAnhaengen(t);
}

/* Zeile in eine Tabelle eintragen (Arztberichte, Vorgutachten). Eine vorhandene leere Zeile
   wird gefüllt, statt eine zusätzliche anzulegen; am Ende bleibt immer eine leere übrig. */
function erfHinzufuegen(tid, werte) {
    if (!erfassung[tid]) erfassung[tid] = [];
    const leer = erfassung[tid].findIndex(z => !Object.keys(z).some(k => (z[k] || '').toString().trim()));
    if (leer >= 0) erfassung[tid][leer] = werte; else erfassung[tid].push(werte);
    if (!erfassung[tid].some(z => !Object.keys(z).length)) erfassung[tid].push({});
}

function erfZeileWeg(tid, i) {
    if (!erfassung[tid]) return;
    erfassung[tid].splice(i, 1);
    // Die Zeilennummern verschieben sich – Merker fuer offene Schreibfelder waeren danach falsch.
    // Eigene Angaben mit Inhalt bleiben trotzdem stehen: Sie erkennt erfFeld am Wert selbst.
    erfFreiModus = {};
    if (!erfassung[tid].length) erfassung[tid] = [{}];
    renderErfassungTabelle(tid);
    const vgHinweis = document.getElementById('erf-vg-' + tid);
    if (vgHinweis) vgHinweis.innerHTML = erfVgHinweisHtml(tid);
    zeigeModul5Vorschau();
}

/* Wie hilft die Pflegeperson bei der Medikation? Ältere Fälle kennen nur die Spalte
   „durchfuehrung" mit „selbständig" / „durch Pflegeperson". Die bleiben lesbar und richtig
   gewertet, ohne dass ein gespeicherter Fall umgeschrieben werden müsste. */
function medikationHilfe(z) {
    if (!z) return '';
    if (z.unterstuetzung) return z.unterstuetzung;
    if (z.durchfuehrung === 'durch Pflegeperson') return 'Gabe durch Pflegeperson';
    if (z.durchfuehrung) return 'selbständig';
    return '';
}

/* Ordnet eine frei formulierte Applikationsangabe einem Ort der Liste zu. Gebraucht bei der
   Übernahme aus Arztberichten: dort steht „s.c." oder „Augentr." statt eines Listeneintrags. */
function medikationOrt(applikation, bezeichnung) {
    const s = ((applikation || '') + ' ' + (bezeichnung || '')).toLowerCase();
    if (APPLIKATION.indexOf(applikation) > -1) return applikation;
    if (/injekt|s\.c\.|subkutan|insulin|spritze/.test(s)) return 'Injektion';
    if (/augentr|augen/.test(s)) return 'Augentropfen';
    if (/ohrentr|ohren/.test(s)) return 'Ohrentropfen';
    if (/inhalat|aerosol|spray|pulver/.test(s)) return 'Dosieraerosol oder Pulverinhalator';
    if (/zäpfchen|zaepfchen|suppositor|rektal/.test(s)) return 'Zäpfchen oder rektal';
    if (/pflaster|transderm/.test(s)) return 'Medikamentenpflaster';
    if (/peg|magensonde/.test(s)) return 'über PEG';
    return 'oral (Tabletten, Tropfen, Säfte)';
}

/* Alte Fälle: Bisher stand in der Medikationstabelle ein Medikament je Zeile, mit freier
   Applikationsangabe und der Spalte „durchfuehrung". Beim Laden wird das in die heutige Form
   gebracht – sonst stünden in der Maske leere Felder, während im Hintergrund noch die alten
   Werte liegen. Der Medikamentenname BLEIBT in der Zeile stehen und wird unter der Tabelle
   genannt; gelöscht wird nichts.
   Die Häufigkeiten bleiben unangetastet: Ein gespeicherter Fall darf seine Punkte nicht von
   selbst ändern. Stehen dadurch mehrere zählende Zeilen am selben Ort, weist die App darauf
   hin und der Berater entscheidet. */
function medikationUmstellen(liste) {
    return (liste || []).map(z => {
        if (!z || !Object.keys(z).length) return z;
        if (z.unterstuetzung || !(z.bezeichnung || z.durchfuehrung)) return z;   // schon in heutiger Form
        const neu = Object.assign({}, z);
        neu.applikation = medikationOrt(z.applikation, z.bezeichnung);
        const hilfe = medikationHilfe(z);
        if (hilfe) neu.unterstuetzung = hilfe;
        if (!neu.praeparate) neu.praeparate = '1';
        delete neu.durchfuehrung;
        return neu;
    });
}

// Namen aus einem älteren Stand – sie haben in der Tabelle keine Spalte mehr, gehen aber nicht verloren.
function medikationAlteNamen() {
    return (erfassung.medikation || []).map(z => ((z && z.bezeichnung) || '').trim()).filter(Boolean);
}

/* Die Zeilen der Medikation, die tatsächlich in Modul 5 eingehen. Eine einzige Stelle, damit
   Bewertung und Hinweis nicht auseinanderlaufen. Umgesetzt sind zwei Sätze der BRi (F 4.5.1):
   nur mit personeller Unterstützung, und „Werden Medikamente verabreicht, ist das Stellen
   nicht gesondert zu berücksichtigen." */
function medikationGezaehlt() {
    const gabeOrt = {};
    (erfassung.medikation || []).forEach(z => {
        if (medikationHilfe(z) === 'Gabe durch Pflegeperson') gabeOrt[(z && z.applikation) || ''] = true;
    });
    return (erfassung.medikation || []).filter(z => {
        const hilfe = medikationHilfe(z);
        if (!hilfe || hilfe === 'selbständig') return false;
        if (!(parseFloat(z.anzahl) > 0) || !z.zeitraum) return false;
        if (gabeOrt[z.applikation || ''] && (hilfe === 'Stellen' || hilfe === 'Bereitstellen')) return false;
        return true;
    });
}

/* Mehrere zählende Zeilen am selben Applikationsort werden addiert. Nach der BRi zählt aber
   der Ort und seine Häufigkeit, nicht die Zahl der Arzneimittel – das ergibt zu viele Punkte.
   Gemeldet, nicht heimlich korrigiert: Der Berater weiß, ob es zwei getrennte Vorgänge sind. */
function medikationMehrfachOrt() {
    const zaehler = {};
    medikationGezaehlt().forEach(z => {
        const ort = z.applikation || '';
        if (ort) zaehler[ort] = (zaehler[ort] || 0) + 1;
    });
    return Object.keys(zaehler).filter(o => zaehler[o] > 1);
}

/* Fasst einzeln genannte Präparate zu Zeilen je Applikationsort zusammen. Ein Arztbrief nennt
   jedes Medikament für sich; die Tabelle führt aber eine Zeile je Ort. Drei Tabletten zum
   Frühstück sind nach der BRi EINE Maßnahme, nicht drei – einzeln übernommen hätte die App
   die Häufigkeiten addiert und Modul 5 zu hoch gerechnet. Übernommen wird deshalb die
   HÖCHSTE Häufigkeit des Ortes; die Zahl der Präparate wird mitgeführt.
   Wer hilft, steht in keinem Arztbrief – „Unterstützung" bleibt leer und zählt damit nicht. */
function medikationGruppiert(liste) {
    const proTag = { 'pro Tag': 1, 'pro Woche': 1 / 7, 'pro Monat': 1 / 30 };
    const orte = {};
    const reihenfolge = [];
    (liste || []).forEach(e => {
        const ort = medikationOrt(e.applikation, e.bezeichnung);
        if (!orte[ort]) { orte[ort] = { praeparate: 0, anzahl: '', zeitraum: '', proTag: -1 }; reihenfolge.push(ort); }
        const g = orte[ort];
        g.praeparate++;
        const n = parseFloat(e.anzahl), f = proTag[e.zeitraum];
        if (n > 0 && f && n * f > g.proTag) { g.proTag = n * f; g.anzahl = String(n); g.zeitraum = e.zeitraum; }
    });
    return reihenfolge.map(ort => {
        const g = orte[ort];
        const zeile = { applikation: ort, praeparate: String(g.praeparate) };
        if (g.anzahl) { zeile.anzahl = g.anzahl; zeile.zeitraum = g.zeitraum; }
        return zeile;
    });
}

// ------------------------------------------------- Übernahme in Modul 5
// Liefert { kriteriumNr: {count, period} } aus den erfassten Angaben.
function modul5AusErfassung() {
    const ziel = {};
    const addieren = (nr, anzahl, zeitraum) => {
        let n = parseFloat(anzahl);
        if (!(n > 0) || !zeitraum) return;
        // Quartal und Jahr auf den Monat umlegen; alles Übrige bleibt, wie es ist.
        const u = ZEITRAUM_UMRECHNUNG[zeitraum] || { period: 'M', teiler: 1 };
        const p = u.period;
        // BRi Fußnote 13: jeder Rechenschritt auf die 4. Nachkommastelle (bisher nur 2)
        if (u.teiler !== 1) n = m5Runden(n / u.teiler);
        // je Kriterium auf einen gemeinsamen Zeitraum bringen (den bisher genutzten)
        if (!ziel[nr]) { ziel[nr] = { count: n, period: p }; return; }
        const proTag = { D: 1, W: 1 / 7, M: 1 / 30 };
        const summeTag = ziel[nr].count * proTag[ziel[nr].period] + n * proTag[p];
        // gröbsten der beteiligten Zeiträume beibehalten
        const rang = { D: 0, W: 1, M: 2 };
        const p2 = rang[p] > rang[ziel[nr].period] ? p : ziel[nr].period;
        ziel[nr] = { count: m5Runden(summeTag / proTag[p2]), period: p2 };
    };

    (erfassung.arztbesuche || []).forEach(z => {
        if (z.begleitung !== 'in Begleitung') return;          // ohne Hilfe keine Wertung
        const therapie = THERAPIE_ART.includes(z.fach);
        const nr = (z.dauer3h === 'ja') ? '4.5.15' : (therapie ? '4.5.14' : '4.5.13');
        addieren(nr, z.anzahl, z.zeitraum);
    });
    /* Medikation nach BRi F 4.5.1: Gezählt wird die Applikationshäufigkeit je Ort –
       „unabhängig von der Anzahl der dort applizierten Arzneimittel". Die Spalte
       „Unterschiedliche Präparate" verändert die Bewertung deshalb bewusst NICHT.
       Und: „Werden Medikamente verabreicht, ist das Stellen nicht gesondert zu
       berücksichtigen." Steht zu einem Ort eine Gabe, bleiben Stellen und Bereitstellen
       dort also außen vor – sonst würde derselbe Vorgang zweimal gezählt. */
    medikationGezaehlt().forEach(z => {
        addieren(z.applikation === 'Injektion' ? '4.5.2' : '4.5.1', z.anzahl, z.zeitraum);
    });
    // Hilfsmittel: nur mit personeller Hilfe. Laut BRi zählen Brille, Zahnprothese und
    // Gehhilfen hier NICHT – Zahnprothesen gehören zu 4.4.2, Gehhilfen begründen nichts.
    (erfassung.hilfsmittel || []).forEach(z => {
        // Der Schalter ist die eingetragene Tätigkeit: Steht dort etwas, hilft eine Person.
        // Ältere Fälle kennen das Feld nicht – dort gilt weiterhin die Durchführung.
        const hilft = (z.taetigkeit || '').trim()
            ? true : (z.taetigkeit === undefined && z.durchfuehrung === 'durch Pflegeperson');
        if (!hilft) return;
        if ((z.nutzung || '') === 'ungenutzt') return;   // ungenutzt begründet keinen Aufwand
        const b = (z.bezeichnung || '').toLowerCase();
        if (/brille|zahnprothese|gebiss|rollator|gehstock|walking|rollstuhl|gehhilfe/.test(b)) return;
        let nr = '4.5.7';
        if (/katheter/.test(b)) nr = '4.5.10';
        else if (/stoma/.test(b)) nr = '4.5.9';
        // „Schlafapnoemaske" ist dasselbe Gerät wie „CPAP-Maske" – ohne dieses Wort landete
        // dieselbe Sache je nach Schreibweise in zwei verschiedenen Kriterien.
        else if (/sauerstoff|cpap|schlafapnoe/.test(b)) nr = '4.5.4';
        addieren(nr, z.anzahl, z.zeitraum);
    });
    (erfassung.behandlungspflege || []).forEach(z => {
        if (z.durchfuehrung !== 'durch Pflegeperson') return;
        const a = (z.art || '').toLowerCase();
        let nr = '4.5.11';
        if (/kompressions|hörgerät|hoergeraet/.test(a)) nr = '4.5.7';
        else if (/verband|wund/.test(a)) nr = '4.5.8';
        else if (/sauerstoff|cpap|absaug/.test(a)) nr = '4.5.4';
        else if (/blutzucker|blutdruck|messen/.test(a)) nr = '4.5.6';
        else if (/stoma/.test(a)) nr = '4.5.9';
        else if (/katheter|abführ|abfuehr/.test(a)) nr = '4.5.10';
        addieren(nr, z.anzahl, z.zeitraum);
    });
    return ziel;
}

/* Warnt vor doppelter Erfassung. Anlass: Die Kompressionsversorgung stand in den
   Hilfsmitteln UND in der Behandlungspflege; die App hat beide Häufigkeiten addiert und
   4.5.7 damit von 8 auf 18 pro Tag getrieben. Körpernahe Hilfsmittel gehören nur noch
   in die Hilfsmitteltabelle – wer sie trotzdem unten einträgt, wird darauf hingewiesen. */
function doppelteErfassung() {
    return (erfassung.behandlungspflege || [])
        .filter(z => HILFSMITTEL_MASSNAHMEN.test((z.art || '') + ' ' + (z.beschreibung || '')))
        .map(z => (z.art || '').trim() || (z.beschreibung || '').trim())
        .filter(Boolean);
}

function zeigeModul5Vorschau() {
    const el = document.getElementById('erf-modul5-hinweis');
    if (!el) return;
    const z = modul5AusErfassung();
    const nrs = Object.keys(z);
    /* Zahlen deutsch schreiben. Ein Zeitraum wie „im Quartal" wird auf den Monat umgelegt –
       daraus entsteht zwangsläufig ein Durchschnittswert (0,33 statt 0.33). Genau so rechnet
       die BRi: „Bei allen Rechenschritten wird auf die 4. Stelle nach dem Komma gerundet." */
    el.innerText = nrs.length
        ? 'Bereit zur Übernahme: ' + nrs.map(nr => nr + ' = ' + haeufigkeitDE(z[nr].count) + '× '
            + (z[nr].period === 'D' ? 'pro Tag' : z[nr].period === 'W' ? 'pro Woche' : 'pro Monat')).join(' · ')
        : 'Noch keine Angaben mit personeller Unterstützung erfasst.';

    const warn = document.getElementById('erf-doppelt-hinweis');
    if (!warn) return;
    const doppelt = doppelteErfassung();
    const mehrfach = medikationMehrfachOrt();
    const namen = medikationAlteNamen();
    warn.innerHTML = (doppelt.length
        ? '<div class="hinweis-warnung">In der Behandlungspflege steht ' + escapeHtml(doppelt.join(', '))
          + '. Körpernahe Hilfsmittel gehören in die Tabelle „Hilfsmittel" – dort mit der Tätigkeit '
          + 'der Pflegeperson. Stehen sie an beiden Stellen, werden die Häufigkeiten addiert und '
          + 'Modul 5 fällt zu hoch aus.</div>'
        : '')
      + (mehrfach.length
        ? '<div class="hinweis-warnung">Mehrere zählende Zeilen zum selben Applikationsort: '
          + escapeHtml(mehrfach.join(', ')) + '. Die Häufigkeiten werden addiert. Nach der BRi zählt '
          + 'aber der Ort und wie oft dort appliziert wird – nicht, wie viele Arzneimittel es sind. '
          + 'Bitte prüfen, ob es wirklich getrennte Vorgänge sind, sonst zu einer Zeile zusammenfassen.</div>'
        : '')
      + (namen.length
        ? '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">Aus einem älteren Stand '
          + 'übernommen: ' + escapeHtml(namen.join(', ')) + '. Die Tabelle führt jetzt Applikationsorte '
          + 'statt einzelner Medikamente – die Namen bleiben gespeichert, werden aber nicht mehr benötigt.</div>'
        : '');
}

function uebernehmeModul5(mitMeldung) {
    const z = modul5AusErfassung();
    let n = 0;
    Object.keys(z).forEach(nr => {
        const item = ITEMS.find(i => i.nr === nr);
        if (!item || item.group === 'D') return;
        setzeBewertung('own', item.id, { count: z[nr].count, period: z[nr].period }, 'modul5');
        n++;
    });
    try { fillTable('own'); calculate('own'); } catch (e) {}
    if (mitMeldung) {
        showToast(n ? n + ' Kriterium/Kriterien in Modul 5 übernommen. Bitte in der Einschätzung prüfen.'
                    : 'Es liegen keine übertragbaren Angaben vor.', n ? 'success' : 'error');
    }
    return n;
}

// ------------------------------------------------------- Speichern und Laden
function erfassungSichern() { return { tabellen: erfassung, extra: erfassungExtra }; }
function erfassungLaden(d) {
    erfassung = (d && d.tabellen) || {};
    erfassungExtra = (d && d.extra) || {};
    erfFreiModus = {};
    // Fälle aus der Zeit vor der Umstellung auf Applikationsorte lesbar machen
    if (erfassung.medikation) erfassung.medikation = medikationUmstellen(erfassung.medikation);
}
