// Verfahrensfehler-Checkliste – Widerspruch und Anhörung.
//
// Diese Rügen schreibt der Verfasser in fast jedem Schreiben neu: zu kurze Begutachtung,
// nicht durchgeführte Funktionstests, Entscheidung nach Aktenlage, übergangene Unterlagen,
// fehlende Plausibilitätsprüfung. Jetzt stehen sie als Liste bereit: abhaken, bei Bedarf
// eine Angabe ergänzen, fertig. Der Textbaustein geht in die Allgemeinen Angaben und an
// die KI.
//
// Grundsatz wie überall: Nichts ist vorausgewählt. Die App EMPFIEHLT einen Punkt nur dort,
// wo sie ihn aus den erfassten Daten belegen kann (Durchführungsart Aktenlage oder
// Telefoninterview, vorhandene Anlagen, gemessene Textgleichheit).

let verfahrensfehler = {};   // { schluessel: { an: true, detail: '…' } }

const VERFAHREN_KATALOG = [
    { key: 'dauer', titel: 'Begutachtungsdauer zu kurz', detail: 'Dauer in Minuten', platz: 'z. B. 25',
      text: d => 'Die Begutachtung dauerte ausweislich des Gutachtens lediglich ' + (d || '– ') + ' Minuten. Eine '
        + 'kriterienscharfe Erhebung aller sechs Module, wie sie die Begutachtungs-Richtlinien verlangen, ist in '
        + 'dieser Zeit nicht möglich.' },
    { key: 'tests', titel: 'Funktionsprüfungen nicht durchgeführt', detail: 'welche Prüfungen',
      platz: 'z. B. Schürzengriff, Nackengriff, Pinzettengriff, Treppensteigen',
      text: d => 'Wesentliche Funktionsprüfungen' + (d ? ' (' + d + ')' : '') + ' wurden nicht durchgeführt. Die '
        + 'Bewertung stützt sich insoweit nicht auf eine eigene Befunderhebung, sondern auf eine Annahme.' },
    { key: 'aktenlage', titel: 'Entscheidung nach Aktenlage', detail: '',
      text: () => 'Die Begutachtung erfolgte nach Aktenlage. Eine persönliche Befunderhebung zu den vorgetragenen '
        + 'Einschränkungen fand damit nicht statt; dem Untersuchungsgrundsatz (§ 20 SGB X) ist so nicht genügt.' },
    { key: 'telefon', titel: 'Strukturiertes Telefoninterview statt Hausbesuch', detail: '',
      text: () => 'Die Erhebung erfolgte im strukturierten Telefoninterview. Motorische Funktionen, Gangbild und '
        + 'Transfers lassen sich auf diesem Weg nicht prüfen; die Bewertung dieser Kriterien beruht damit nicht '
        + 'auf einer eigenen Beobachtung.' },
    { key: 'unterlagen', titel: 'Vorgelegte Unterlagen nicht berücksichtigt', detail: 'welche Unterlagen',
      platz: 'wird aus den Anlagen vorgeschlagen',
      text: d => 'Die vorgelegten ärztlichen Unterlagen' + (d ? ' (' + d + ')' : '') + ' sind in der Bewertung nicht '
        + 'berücksichtigt worden; eine Auseinandersetzung mit ihnen ist dem Gutachten nicht zu entnehmen.' },
    { key: 'plausi', titel: 'Keine Plausibilitätsprüfung zwischen Befund und Bewertung', detail: '',
      text: () => 'Der eigene Befund beschreibt Einschränkungen, die in der Bewertung nicht abgebildet sind. Eine '
        + 'Plausibilitätsprüfung zwischen Befunderhebung und Wertung, wie sie die Begutachtungs-Richtlinien '
        + 'vorsehen, ist nicht erkennbar.' },
    { key: 'pflegeperson', titel: 'Angaben der Pflegeperson nicht gewürdigt', detail: '',
      text: () => 'Die Angaben der Pflegeperson zum täglichen Hilfebedarf sind im Gutachten nicht gewürdigt worden, '
        + 'obwohl die Richtlinien die Fremdanamnese ausdrücklich einbeziehen.' },
    { key: 'tagesform', titel: 'Tagesform statt Wochenverlauf bewertet', detail: '',
      text: () => 'Maßgeblich ist nach den Begutachtungs-Richtlinien der Zustand im Verlauf einer Woche, nicht die '
        + 'Tagesform am Begutachtungstag. Schwankende Einschränkungen sind so nicht abgebildet.' },
    { key: 'hilfsmittel', titel: 'Hilfsmittel oder Verordnungen unberücksichtigt', detail: 'welche',
      text: d => 'Ärztlich verordnete Maßnahmen oder Hilfsmittel' + (d ? ' (' + d + ')' : '') + ' sind in der '
        + 'Bewertung nicht berücksichtigt, obwohl sie belegt sind.' },
    { key: 'begruendung', titel: 'Formelhafte Begründung', detail: '',
      text: () => 'Die Bewertung wird mit formelhaften Textbausteinen begründet, ohne auf den Einzelfall einzugehen. '
        + 'Das genügt der Begründungspflicht (§ 35 SGB X) nicht.' },
    // Nur im Anhörungsverfahren
    { key: 'wortgleich', nurAnhoerung: true, titel: 'Befundtext wortgleich aus dem Erstgutachten übernommen',
      detail: 'gemessener Anteil', platz: 'wird gemessen',
      text: d => 'Der Befundtext des Zweitgutachtens stimmt' + (d ? ' zu rund ' + d : ' über weite Strecken') + ' '
        + 'wörtlich mit dem Erstgutachten überein. Eine eigenständige Befunderhebung und eine eigene Würdigung der '
        + 'Einwände sind darin nicht erkennbar.' },
    { key: 'keineneuen', nurAnhoerung: true, titel: '„Keine neuen Gesichtspunkte" ohne Würdigung', detail: '',
      text: () => 'Das Zweitgutachten begnügt sich mit der Feststellung, es ergäben sich keine neuen Gesichtspunkte, '
        + 'ohne sich mit der Begründung des Widerspruchs auseinanderzusetzen.' }
];

function istVerfahrensModus() {
    return (typeof appModus !== 'undefined') && (appModus === 'widerspruch' || appModus === 'anhoerung');
}

function verfahrenKatalog() {
    const anh = (typeof appModus !== 'undefined') && appModus === 'anhoerung';
    return VERFAHREN_KATALOG.filter(v => anh || !v.nurAnhoerung);
}

/* EMPFEHLUNG – nur, was sich aus den erfassten Daten belegen lässt.
   Rückgabe: { key: 'Begründung der Empfehlung' } */
function verfahrenEmpfehlungen() {
    const e = {};
    const g = id => (document.getElementById(id)?.value || '').trim();
    const anh = (typeof appModus !== 'undefined') && appModus === 'anhoerung';
    const art = anh ? g('anh-art') : g('stam-art');
    if (/aktenlage/i.test(art)) e.aktenlage = 'Die Durchführungsart ist „' + art + '".';
    if (/telefon/i.test(art)) e.telefon = 'Die Durchführungsart ist „' + art + '".';
    const mitDatei = (typeof anlagen !== 'undefined') ? anlagen.length : 0;
    if (mitDatei) e.unterlagen = mitDatei + ' Anlage(n) sind erfasst.';
    if (anh && typeof befundAehnlichkeit === 'function') {
        const a = befundAehnlichkeit();
        if (a && a.anteil >= 0.4) e.wortgleich = 'Gemessen: ' + Math.round(a.anteil * 100) + ' % des Befundtextes sind wortgleich.';
    }
    return e;
}

// Vorschlag für das Beiwerk eines Punktes (Anlagen, gemessener Anteil)
function verfahrenDetailVorschlag(key) {
    if (key === 'unterlagen' && typeof anlagen !== 'undefined' && anlagen.length) {
        return anlagen.map((a, i) => anlageText(a, i).replace(/^Anlage \d+: /, '')).join(', ');
    }
    if (key === 'wortgleich' && typeof befundAehnlichkeit === 'function') {
        const a = befundAehnlichkeit();
        if (a && a.anteil) return Math.round(a.anteil * 100) + ' %';
    }
    return '';
}

function verfahrenSetzen(key, an) {
    if (!verfahrensfehler[key]) verfahrensfehler[key] = { an: false, detail: '' };
    verfahrensfehler[key].an = !!an;
    if (an && !verfahrensfehler[key].detail) verfahrensfehler[key].detail = verfahrenDetailVorschlag(key);
    if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Verfahrensfehler');
    renderVerfahrenBereich();
}

function verfahrenDetail(key, wert) {
    if (!verfahrensfehler[key]) verfahrensfehler[key] = { an: true, detail: '' };
    verfahrensfehler[key].detail = wert;
    if (typeof markiereStellungnahmeVeraltet === 'function') markiereStellungnahmeVeraltet('Verfahrensfehler');
}

// Die abgehakten Punkte mit fertigem Satz
function verfahrenGewaehlt() {
    return verfahrenKatalog().filter(v => verfahrensfehler[v.key] && verfahrensfehler[v.key].an)
        .map(v => ({ key: v.key, titel: v.titel, satz: v.text((verfahrensfehler[v.key].detail || '').trim()) }));
}

function renderVerfahrenBereich() {
    const ziel = document.getElementById('verfahren-bereich');
    if (!ziel) return;
    ziel.style.display = istVerfahrensModus() ? '' : 'none';
    if (!istVerfahrensModus()) { ziel.innerHTML = ''; return; }
    const anh = appModus === 'anhoerung';
    const empf = verfahrenEmpfehlungen();
    const zeilen = verfahrenKatalog().map(v => {
        const st = verfahrensfehler[v.key] || { an: false, detail: '' };
        const vorschlag = verfahrenDetailVorschlag(v.key);
        return `<label class="vs-item" style="border-left-color:${empf[v.key] ? 'var(--accent)' : 'var(--border)'}">
            <input type="checkbox" data-verfahren="${escapeHtml(v.key)}" ${st.an ? 'checked' : ''}
                   onchange="verfahrenSetzen('${escapeHtml(v.key)}', this.checked)">
            <div style="flex:1">
                <div class="vs-grund">${escapeHtml(v.titel)}${empf[v.key] ? ' <span style="color:var(--accent);font-weight:700">· empfohlen</span>' : ''}</div>
                ${empf[v.key] ? `<div class="vs-fund">${escapeHtml(empf[v.key])}</div>` : ''}
                ${(st.an && v.detail) ? `<div style="margin-top:6px"><span class="bz-seite">${escapeHtml(v.detail)}</span>
                    <input type="text" class="field-input" value="${escapeHtml(st.detail || '')}"
                           placeholder="${escapeHtml(v.platz || '')}"
                           onclick="event.preventDefault();event.stopPropagation();"
                           oninput="verfahrenDetail('${escapeHtml(v.key)}', this.value)"></div>` : ''}
                ${(st.an && !v.detail && vorschlag) ? `<div class="vs-fund">${escapeHtml(vorschlag)}</div>` : ''}
            </div>
        </label>`;
    }).join('');
    ziel.innerHTML = `<div class="card">
        <div class="card-header"><div class="dot"></div>Verfahrensfehler der Begutachtung</div>
        <div style="padding:16px 20px">
            <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
                Abhaken, was auf ${anh ? 'das Zweitgutachten' : 'das Gutachten'} zutrifft. Die angehakten Punkte
                erscheinen als eigener Absatz in den Allgemeinen Angaben und gehen an die KI.
                <b>Nichts ist vorausgewählt;</b> „empfohlen" heißt nur, dass die App den Punkt aus den erfassten
                Daten belegen kann. Sie prüfen, ob er zutrifft.
            </p>
            ${zeilen}
        </div></div>`;
}

// Absatz im Schriftstück – nur die abgehakten Punkte
function verfahrenAbsatzHtml() {
    const g = verfahrenGewaehlt();
    if (!g.length) return '';
    return `<p id="stmt-verfahren">${escapeHtml(g.map(x => x.satz).join(' '))}</p>`;
}

// Für die KI: die Rügen als Vorgabe, nicht als Anregung zum Ausschmücken
function verfahrenFuerPrompt() {
    const g = verfahrenGewaehlt();
    if (!g.length) return '';
    return 'VON MIR GERÜGTE VERFAHRENSFEHLER (die App setzt diese Sätze selbst in die Allgemeinen Angaben; '
         + 'du darfst dich darauf beziehen, sie aber NICHT erneut aufzählen und nichts hinzuerfinden):\n'
         + g.map(x => '- ' + x.satz).join('\n') + '\n\n';
}

// ------------------------------------------------------- Speichern und Laden
function verfahrenSichern() { return verfahrensfehler; }
function verfahrenLaden(d) {
    verfahrensfehler = (d && typeof d === 'object') ? d : {};
    renderVerfahrenBereich();
}
