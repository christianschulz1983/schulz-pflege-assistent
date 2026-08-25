// Teil des Pflegegradassistenten für Berater. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
const LOCAL_SERVER_URL = "http://127.0.0.1:8765";
let lastServerReachable = false; // wurde der lokale Server beim letzten Versuch erreicht?
async function tryLocalExtract(base64Data, mimeType) {
    // 1) Schnelle Erreichbarkeitsprüfung (max 2,5s) – verhindert Hängen, wenn der Server aus ist.
    lastServerReachable = false;
    try {
        const pc = new AbortController();
        const pt = setTimeout(() => pc.abort(), 2500);
        const pr = await fetch(LOCAL_SERVER_URL + "/ping", { signal: pc.signal, cache: "no-store" });
        clearTimeout(pt);
        if (!pr.ok) return null;
        lastServerReachable = true;
    } catch (e) {
        console.info("Lokaler Server nicht erreichbar – Direktweg an Gemini.", e && e.message);
        return null;
    }
    // 2) Eigentliche Extraktion (großzügiges Zeitlimit – gescannte PDFs brauchen OCR-Zeit).
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180000);
        const resp = await fetch(LOCAL_SERVER_URL + "/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64Data, mime: mimeType }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!resp.ok) return null;
        const json = await resp.json();
        return (json && json.ok) ? json : null;
    } catch (e) {
        console.info("Lokale Extraktion fehlgeschlagen – Direktweg an Gemini.", e && e.message);
        return null;
    }
}

// Lokal ausgelesene Stammdaten/Diagnosen/Texte (vom Server) ins Datenformat der App bringen.
function localMetaToData(local) {
    const m = (local && local.meta) ? local.meta : {};
    return {
        stam_betreffend: m.betreffend || '',
        stam_geboren: m.geboren || '',
        stam_kasse: m.kasse || '',
        stam_versnr: m.versnr || '',
        stam_bescheid: m.bescheid || '',
        stam_antrag: m.antrag || '',
        stam_organisation: m.organisation || '',
        stam_begutachtung: m.begutachtung || '',
        stam_pg_manual: m.pg || '',
        stam_pts_manual: m.pts || '',
        anamnese: m.anamnese || '',
        befund: m.befund || '',
        diagnoses: Array.isArray(m.diagnoses) ? m.diagnoses : []
    };
}

// Stufe 3: koordinatengenau lokal ausgelesene Werte (vom Server) in das values_orig-Format
// der App umwandeln. Diese haben Vorrang vor der KI-Schätzung der Einzelkriterien.
function serverValuesToValuesOrig(sv) {
    const arr = [];
    ITEMS.forEach(i => {
        if (!i.nr) return;
        const v = sv[i.nr];
        if (!v) return;
        if (i.m === 5 && i.group !== 'D') {
            arr.push({ id: i.id, val_obj_count: (v.count != null ? v.count : 0), val_obj_period: (v.period || 'W') });
        } else if (i.opts) {
            let idx = (v.idx != null ? v.idx : 0);
            if (idx < 0) idx = 0;
            if (idx > i.opts.length - 1) idx = i.opts.length - 1;
            arr.push({ id: i.id, val_num: idx });
        }
    });
    return arr;
}

// AI PDF / IMAGE GUTACHTEN PARSER (WITH SYSTEMATIC LOKALISIERUNG FOR SPECIFIED SECTIONS)
// Online gehostet (z.B. GitHub Pages) = NICHT vom lokalen Server (127.0.0.1) ausgeliefert.
// Dann ist der lokale OCR-Server nicht erreichbar und das Einlesen läuft über Google.
function isOnlineHosted() {
    const h = location.hostname;
    return (location.protocol === 'http:' || location.protocol === 'https:') && h !== '127.0.0.1' && h !== 'localhost';
}

async function aiReadGutachten(event) {
    const file = event.target.files[0];
    if (!file) return;

    showOverlay("KI liest Gutachten aus...", "Datei wird vorbereitet");

    const reader = new FileReader();
    reader.onerror = () => {
        hideOverlay();
        showToast("Die Datei konnte nicht gelesen werden.", "error");
        event.target.value = '';
    };
    reader.onload = async () => {
        try {
            updateOverlay("Inhalt an Gemini übergeben...", 30);
            const base64Data = reader.result.split(',')[1];
            const mimeType = file.type;

            const systemPrompt = `Du bist ein hochqualifizierter KI-Assistent für das deutsche Pflegerecht (SGB XI) und das Neue Begutachtungsassessment (NBA).
            Deine Aufgabe ist es, aus dem übermittelten Dokument (Pflegegutachten des MD, MEDICPROOF etc.) alle relevanten Stammdaten, ICD-10 Diagnosen, Anamnesedaten, Befunddaten sowie die exakten Modulbewertungen des VORGUTACHTENS (Originalgutachten) zu extrahieren.

            EXAKTE LOKALISIERUNGS- UND EXTRAKTIONSREGELN FÜR DIE STAMMDATEN:
            1. Name (stam_betreffend): IMMER im Format "Herr Vorname Nachname" bzw. "Frau Vorname Nachname" (Anrede + Vorname + Nachname). Die Anrede (Herr/Frau) aus dem Adress-/Briefkopf übernehmen (z.B. "Herrn Jürgen Maier" -> "Herr Jürgen Maier"). NICHT als "Nachname, Vorname" zurückgeben.
            2. Geburtsdatum (stam_geboren): MUSS immer ausgelesen werden. IMMER im Format tt.mm.jjjj zurückgeben (z.B. "12.04.1941"). Das gilt für ALLE Datumsfelder (geboren, Antrag, Bescheid, Begutachtung).
            3. Kundennummer (stam_kundennummer): MUSS immer zwingend leer bzw. ein leerer String sein (""). Sie wird nicht automatisch befüllt, da sie für das händische Ausfüllen freigelassen wird.
            4. Kasse (stam_kasse): Extrahiere die zuständige Pflegekasse/Krankenkasse.
            5. Versicherungs-Nr. (stam_versnr): Extrahiere die Versichertennummer des Patienten.
            6. Bescheiddatum (stam_bescheid): MUSS immer von der ersten Seite des Bescheids der jeweiligen Krankenkasse ausgelesen werden.
            7. Antragsdatum (stam_antrag): MUSS auf den ersten paar Seiten des Gutachtens des Medizinischen Dienstes (MD) gesucht werden. Wichtig: Bei Medicproof-Gutachten ist das Antragsdatum nicht vorhanden – in diesem Fall MUSS es zwingend leer gelassen werden ("").
            8. Gutachtenorganisation (stam_organisation): MUSS die tatsächliche Prüforganisation sein, NICHT die Krankenkasse/Pflegekasse (wie "AOK"). IMMER kanonisch formatieren als entweder "Medizinischer Dienst <Region>" (z.B. "Medizinischer Dienst Berlin-Brandenburg", "Medizinischer Dienst Baden-Württemberg") ODER "Medicproof GmbH". Suche im Briefkopf/Stempel/Logo der ersten Seiten.
            9. Begutachtungsdatum (stam_begutachtung): Steht immer relativ am Anfang des Gutachtens und MUSS von dort ausgelesen werden.
            9a. Durchführungsart (stam_art): MUSS ZWINGEND exakt einer dieser drei Formulierungen entsprechen – andere Schreibweisen sind unzulässig:
                - "Begutachtung im Hausbesuch mit persönlicher Befunderhebung" (bei Hausbesuch bzw. persönlicher Befunderhebung im häuslichen Wohnumfeld)
                - "Begutachtung per Aktenlage" (bei Begutachtung nach Aktenlage ohne persönlichen Kontakt)
                - "Begutachtung in Form eines strukturierten Telefoninterviews" (bei telefonischer Begutachtung)
                Ordne die im Gutachten gefundene Formulierung einer dieser drei Varianten zu und gib ausschließlich die zugeordnete Variante wörtlich zurück.
            10. Pflegegrad (stam_pg_manual): MUSS automatisch aus dem Gutachtenergebnis (z.B. "Pflegegrad 3" oder "Ergebnis: Pflegegrad 2") als einfache Zahl (0-5) extrahiert werden. Darf nicht leer gelassen werden!
            11. Gesamtpunkte (stam_pts_manual): MUSS automatisch aus dem Gutachten extrahiert werden (z.B. die Gesamtpunktzahl wie "62.50" oder "37.5"). Darf nicht leer gelassen werden!
            12. Diagnosen (diagnoses): Diese sind immer im Gutachten unter "Punkt 3. Pflegebegründende Diagnosen" (oder ähnlich formuliert) eingetragen. Extrahiere alle dort genannten Diagnosen. Falls im Text kein expliziter ICD-10-Code dabeisteht, recherchiere oder ergänze den passenden ICD-10-Code medizinisch korrekt (z.B. M16.9 bei Coxarthrose, G20 bei Parkinson, F32.9 bei Depression, G62.1 bei Alkohol-Polyneuropathie, M54.5 bei Rückenschmerzen). Liefere ein Array von Objekten mit "icd" (z.B. "M16.9") und "text" (z.B. "Koxarthrose, beidseitig") zurück.
            13. Anamnese (anamnese): MUSS immer vollständig unter "Punkt 1.2" (Anamnese) aus den Gutachten des medizinischen Dienstes ausgelesen und als Fließtext übergeben werden.
            14. Befund (befund): MUSS vollständig aus dem Gutachten ausgelesen werden. Lies alle Seiten des Gutachtens vollständig durch. Der gutachterliche Befund beginnt unter Kapitel "2." (Befunde zur Beeinträchtigung der Selbstständigkeit..." oder "Erhobene Befunde" oder "Befunde zur Beeinträchtigung" oder "Befunde zur Beeinträchtigung der Selbstständigkeit/Fähigkeiten") und endet erst dort, wo Kapitel "3." (Diagnosen) anfängt. Extrahiere alle strukturierten medizinischen und funktionellen Erhebungen vollständig dazwischen lückenlos (oft über 2-3 Seiten gehend) mit allen Stichpunkten, Zeilenumbrüchen (\\n) und Stichpunkten. Höre niemals am Ende der ersten Befundseite auf! Lese den Befund wortwörtlich und ungekürzt aus.
            15. Modulwertungen (Modul-Ergebnisse):
                Suche nach der Tabelle "Anlage: Berechnungs- und Bewertungsregeln zur Ermittlung der Pflegegrade" oder der Zusammenfassung der Modulwertungen des Originalgutachtens.
                Extrahiere die exakten Einzelpunkte ("raw") and gewichteten Punkte ("weight") für jedes der 6 Module:
                - Modul 1 (modul_1_raw, modul_1_weight)
                - Modul 2 (modul_2_raw, modul_2_weight)
                - Modul 3 (modul_3_raw, modul_3_weight)
                - Modul 4 (modul_4_raw, modul_4_weight)
                - Modul 5 (modul_5_raw, modul_5_weight)
                - Modul 6 (modul_6_raw, modul_6_weight)
                - Gesamtpunkte (total_weight)
                - Pflegegrad (pflegegrad)

            EXTRAKTIONSREGELN FÜR DIE MODULBEWERTUNGEN (values_orig):
            Lies systematisch alle Kriterien-Bewertungen aus dem Originalgutachten aus.
            - Beim Medizinischen Dienst (MD) findest du diese unter den Abschnitten "4.1" (Modul 1), "4.2" (Modul 2), "4.3" (Modul 3), "4.4" (Modul 4), "4.5" (Modul 5), "4.6" (Modul 6).
            - Bei MEDICPROOF findest du diese unter den Abschnitten "5.1" (Modul 1), "5.2" (Modul 2), "5.3" (Modul 3), "5.4" (Modul 4), "5.5" (Modul 5), "5.6" (Modul 6).
            Extrahiere die Einzelbewertung für jedes Kriterium und ordne sie der entsprechenden ID (0-64) in values_orig zu.

            SEHR WICHTIG – SPALTENGENAUES LESEN DER ANKREUZTABELLEN:
            Der übergebene Text ist layoutgetreu aufbereitet: Spalten sind durch mehrere Leerzeichen voneinander getrennt und stehen untereinander. Jede Kriterienzeile (z.B. "4.1.1 Positionswechsel im Bett") hat mehrere Bewertungsspalten. Nur EINE Spalte ist markiert.
            - Module 1, 2, 4, 6: Spalten sind "selbständig | überwiegend selbständig | überwiegend unselbständig | unselbständig" (Modul 2: "unbeeinträchtigt | größtenteils vorhanden | gering vorhanden | nicht vorhanden"). Bestimme anhand der horizontalen Position der Markierung GENAU, welche Spalte angekreuzt ist. Eine Markierung ist ein gefülltes Feld/Kreis/Kreuz (z.B. ●, ⊙, ⊠, X, ☒, "1"); leere Felder (○, ☐, "0") bedeuten NICHT markiert. Wähle val_num = Spaltenindex 0..3.
            - Modul 3 (4.3.x): Spalten "nie/selten=0 | selten=1 | häufig=2 | täglich=3"; val_num entsprechend 0..3.
            - Modul 5 (4.5.1–4.5.15): Hier zählt die HÄUFIGKEIT. In den Spalten "pro Tag | pro Woche | pro Monat" steht eine ZAHL. Lies die Zahl UND die zugehörige Spalte: val_obj_count = die Zahl, val_obj_period = "D" (pro Tag), "W" (pro Woche) oder "M" (pro Monat). Steht nichts/entfällt -> count 0. Ordne die Zahl exakt der Spalte zu, unter der sie steht.
            - Modul 5: 4.5.16 (Diät) ist KEINE Häufigkeit, sondern selbständig..unselbständig -> val_num 0..3.
            Verwechsle Spalten niemals: die horizontale Ausrichtung im Text entscheidet. Erfinde keine Werte; wenn eine Zeile leer/entfällt ist, gib 0 bzw. count 0 an.

            Liefere alle Ergebnisse strictly als valides JSON-Objekt zurück.`;

            const responseSchema = {
                type: "OBJECT",
                properties: {
                    stam_betreffend: { type: "STRING" },
                    stam_geboren: { type: "STRING" },
                    stam_kundennummer: { type: "STRING" },
                    stam_kasse: { type: "STRING" },
                    stam_versnr: { type: "STRING" },
                    stam_bescheid: { type: "STRING" },
                    stam_antrag: { type: "STRING" },
                    stam_organisation: { type: "STRING" },
                    stam_begutachtung: { type: "STRING" },
                    stam_art: { type: "STRING" },
                    stam_pg_manual: { type: "STRING" },
                    stam_pts_manual: { type: "STRING" },
                    modul_1_raw: { type: "INTEGER" },
                    modul_1_weight: { type: "NUMBER" },
                    modul_2_raw: { type: "INTEGER" },
                    modul_2_weight: { type: "NUMBER" },
                    modul_3_raw: { type: "INTEGER" },
                    modul_3_weight: { type: "NUMBER" },
                    modul_4_raw: { type: "INTEGER" },
                    modul_4_weight: { type: "NUMBER" },
                    modul_5_raw: { type: "INTEGER" },
                    modul_5_weight: { type: "NUMBER" },
                    modul_6_raw: { type: "INTEGER" },
                    modul_6_weight: { type: "NUMBER" },
                    total_weight: { type: "NUMBER" },
                    pflegegrad: { type: "INTEGER" },
                    diagnoses: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                icd: { type: "STRING" },
                                text: { type: "STRING" }
                            },
                            required: ["icd", "text"]
                        }
                    },
                    anamnese: { type: "STRING" },
                    befund: { type: "STRING" },
                    special_orig: { type: "INTEGER" },
                    values_orig: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                id: { type: "INTEGER" },
                                val_num: { type: "INTEGER" },
                                val_obj_count: { type: "INTEGER" },
                                val_obj_period: { type: "STRING" }
                            },
                            required: ["id"]
                        }
                    }
                },
                required: ["diagnoses", "values_orig"]
            };

            // Stufe 2 (lokaler Server / Alternative B): falls erreichbar, Text lokal extrahieren
            // (inkl. OCR) und nur den Text an Gemini schicken. Die Einzelkriterien liefert der
            // Server koordinatengenau selbst (Stufe 3); die KI übernimmt dann nur noch
            // Stammdaten, Diagnosen, Anamnese, Befund und die Modul-Zusammenfassung.
            // Lokal vorbereiten: Text (inkl. OCR bei Scans) + präzise Kriterien (Text-PDFs).
            updateOverlay("Lokaler Server liest aus (Scans: OCR, ~30 Sek.)...", 25);
            // Online (GitHub Pages) ist der lokale Server nicht erreichbar -> direkt über Google lesen.
            const local = isOnlineHosted() ? null : await tryLocalExtract(base64Data, mimeType);
            const haveLocalText = !!(local && local.ok && local.text && local.text.trim().length > 40);
            const haveLocalValues = !!(local && local.values && Object.keys(local.values).length);

            // Google liest Stammdaten/Diagnosen/Anamnese/Befund (genau). Bei vorhandenem lokalem
            // Text wird nur dieser kleine Text geschickt (statt großes Bild) -> deutlich weniger 429.
            let userParts;
            if (haveLocalText) {
                userParts = [{ text: "Lies aus folgendem Gutachten-Text die Stammdaten, Diagnosen, Anamnese und Befund vollständig aus.\n\n=== GUTACHTEN-TEXT ===\n" + local.text }];
                updateOverlay("Stammdaten/Diagnosen werden gelesen...", 55);
            } else {
                userParts = [
                    { text: "Hier ist das Gutachten zur Analyse. Extrahiere alle Daten lückenlos." },
                    { inlineData: { mimeType: mimeType, data: base64Data } }
                ];
                updateOverlay("KI analysiert das Dokument...", 60);
            }
            // Liegen die Kriterien lokal präzise vor, muss Google sie nicht liefern (kleinere Antwort).
            if (haveLocalValues) { delete responseSchema.properties.values_orig; responseSchema.required = ["diagnoses"]; }

            const payload = {
                contents: [{ role: "user", parts: userParts }],
                generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema }
            };

            let data = null, aiError = null;
            try {
                const response = await callGeminiWithFallback(payload, systemPrompt);
                const extractedText = response && response.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!extractedText) throw new Error("Keine Textantwort von der KI erhalten.");
                let jsonText = extractedText.trim();
                const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
                if (fence) jsonText = fence[1].trim();
                data = JSON.parse(jsonText);
            } catch (e) {
                aiError = e;
            }

            updateOverlay("Ergebnisse aufbereiten...", 85);

            if (data) {
                // Google erfolgreich -> präzise lokale Kriterien (Text-PDFs) haben Vorrang
                if (haveLocalValues) { data.values_orig = serverValuesToValuesOrig(local.values); data._localValues = true; }
                openImportReview(file, data, mimeType);
                showToast("Gutachten gelesen ✓ – bitte prüfen und übernehmen.", "success");
            } else {
                // Google nicht verfügbar (z.B. 429) -> lokale Reserve, damit nichts blockiert
                const fb = (local && local.ok) ? localMetaToData(local) : {};
                if (haveLocalValues) { fb.values_orig = serverValuesToValuesOrig(local.values); }
                fb._localValues = true;
                openImportReview(file, fb, mimeType);
                const online = isOnlineHosted();
                const keyPresent = !!((document.getElementById('user-api-key')?.value || '').trim() || userApiKey.trim());
                let msg;
                if (!keyPresent) {
                    msg = "Zum Einlesen bitte oben rechts einen kostenlosen Google-API-Schlüssel eintragen (aistudio.google.com)."
                        + (online ? " Das Einlesen läuft online über Google." : " Alternativ den lokalen Server über 'Pflege-Server starten.bat' nutzen.");
                } else if (online) {
                    msg = "Google nicht verfügbar (evtl. Limit erreicht oder Schlüssel ungültig). Tipp: ein neuer, kostenloser API-Schlüssel löst ein Limit sofort. Felder bitte anhand der PDF prüfen/ergänzen.";
                } else if (!lastServerReachable) {
                    msg = "Lokaler Server nicht erreicht und Google nicht verfügbar. Bitte 'Pflege-Server starten.bat' starten und die App über http://127.0.0.1:8765 öffnen – oder oben rechts einen Google-API-Schlüssel eintragen.";
                } else {
                    msg = "Google-Limit erreicht – Felder wurden lokal vorab gefüllt (ggf. unvollständig). Bitte anhand der PDF prüfen/ergänzen. Tipp: ein neuer, kostenloser API-Schlüssel löst das Limit sofort.";
                }
                showToast(msg, "error");
            }

        } catch (err) {
            console.warn("Analyse-Fehler abgefangen:", err);
            showToast("Fehler beim Einlesen: " + err.message, "error");
        } finally {
            hideOverlay();
            event.target.value = '';
        }
    };
    reader.readAsDataURL(file);
}

// ===== STUFE 1: HUMAN-IN-THE-LOOP IMPORT-PRÜFUNG =====
let reviewData = null;      // normalisierte Daten des aktuellen Imports (bearbeitbar)
let reviewBlobUrl = null;   // Blob-URL der Original-Datei für die PDF-Vorschau

// Wandelt die rohe KI-Antwort in eine bearbeitbare Struktur + Konfidenz-Info um.
function normalizeImport(data) {
    const valuesMap = {};
    const provided = new Set();
    ITEMS.forEach(i => { valuesMap[i.id] = (i.m === 5 && i.group !== 'D') ? { count: 0, period: 'W' } : 0; });
    if (Array.isArray(data.values_orig)) {
        data.values_orig.forEach(v => {
            const item = ITEMS.find(it => it.id === v.id);
            if (!item) return;
            provided.add(v.id);
            if (item.m === 5 && item.group !== 'D') {
                valuesMap[v.id] = { count: v.val_obj_count !== undefined ? v.val_obj_count : 0, period: v.val_obj_period || 'W' };
            } else {
                valuesMap[v.id] = v.val_num !== undefined ? v.val_num : 0;
            }
        });
    }
    return {
        stam: {
            betreffend: data.stam_betreffend || '', geboren: formatToYYYYMMDD(data.stam_geboren) || '',
            kasse: data.stam_kasse || '', versnr: data.stam_versnr || '',
            bescheid: formatToYYYYMMDD(data.stam_bescheid) || '', antrag: formatToYYYYMMDD(data.stam_antrag) || '',
            organisation: data.stam_organisation || '', begutachtung: formatToYYYYMMDD(data.stam_begutachtung) || '',
            art: normalizeArt(data.stam_art),
            pg: data.stam_pg_manual !== undefined && data.stam_pg_manual !== null ? String(data.stam_pg_manual) : '',
            pts: data.stam_pts_manual !== undefined && data.stam_pts_manual !== null ? String(data.stam_pts_manual) : ''
        },
        diagnoses: (Array.isArray(data.diagnoses) ? data.diagnoses : []).map(d => ({ icd: d.icd || '', text: d.text || '' })),
        anamnese: data.anamnese || '',
        befund: data.befund || '',
        special: data.special_orig || 0,
        // Bei lokal präzise ausgelesenen Kriterien das Vorgutachten-Modulergebnis aus eben
        // diesen Kriterien berechnen (extracted = null), statt aus der KI-Zusammenfassung.
        extracted: data._localValues ? null : {
            raws: [data.modul_1_raw, data.modul_2_raw, data.modul_3_raw, data.modul_4_raw, data.modul_5_raw, data.modul_6_raw].map(x => x !== undefined && x !== null ? x : 0),
            weights: [data.modul_1_weight, data.modul_2_weight, data.modul_3_weight, data.modul_4_weight, data.modul_5_weight, data.modul_6_weight].map(x => x !== undefined && x !== null ? x : 0),
            total: data.total_weight !== undefined && data.total_weight !== null ? data.total_weight : (data.stam_pts_manual ? parseFloat(data.stam_pts_manual) : 0),
            pg: data.pflegegrad !== undefined && data.pflegegrad !== null ? data.pflegegrad : (data.stam_pg_manual ? parseInt(data.stam_pg_manual) : 0)
        },
        valuesMap, provided
    };
}

// Bearbeitungs-Handler (mutieren reviewData)
function rvStam(k, v) { reviewData.stam[k] = v; }
function rvDiag(idx, field, v) { if (!reviewData.diagnoses[idx]) reviewData.diagnoses[idx] = { icd: '', text: '' }; reviewData.diagnoses[idx][field] = v; }
// Weitere Diagnosezeile in der Prüfansicht anhängen
function rvAddDiagRow() {
    const box = document.getElementById('rev-diag-rows');
    if (!box) return;
    const idx = box.querySelectorAll('.rev-diag').length;
    const div = document.createElement('div');
    div.className = 'rev-diag';
    div.innerHTML = `<input placeholder="ICD 10" style="width:120px" oninput="rvDiag(${idx},'icd',this.value)">`
                  + `<input placeholder="Diagnose" oninput="rvDiag(${idx},'text',this.value)">`;
    box.appendChild(div);
}
function rvText(k, v) { reviewData[k] = v; }
function rvExtract(kind, idx, v) {
    if (!reviewData || !reviewData.extracted) return;
    if (kind === 'total') reviewData.extracted.total = parseFloat(v) || 0;
    else if (kind === 'pg') reviewData.extracted.pg = parseInt(v) || 0;
    else reviewData.extracted[kind][idx] = parseFloat(v) || 0;
}
// Merkt sich, welche Kriterien in der Prüfansicht tatsächlich angefasst wurden. Beim
// Korrigieren wird ausschliesslich das übernommen – nicht angerührte Kriterien bleiben,
// wie sie sind (sonst schriebe die App unbemerkt Nullen in unbewertete Kriterien).
let reviewGeaendert = new Set();
function rvMarkEdited(id) {
    reviewGeaendert.add(id);
    const el = document.getElementById('rev-row-' + id);
    if (el) { el.classList.remove('rev-missing'); el.classList.add('rev-ok'); }
}
function rvValNum(id, v) { reviewData.valuesMap[id] = parseInt(v); rvMarkEdited(id); }
function rvM5Count(id, v) { if (typeof reviewData.valuesMap[id] !== 'object') reviewData.valuesMap[id] = { count: 0, period: 'W' }; reviewData.valuesMap[id].count = Number(v); rvMarkEdited(id); }
function rvM5Period(id, v) { if (typeof reviewData.valuesMap[id] !== 'object') reviewData.valuesMap[id] = { count: 0, period: 'W' }; reviewData.valuesMap[id].period = v; rvMarkEdited(id); }

// Zeichnet die hochgeladene PDF zuverlässig mit PDF.js in die linke Vorschau.
// Fällt auf ein <iframe> zurück, falls die Bibliothek fehlt oder das Rendern scheitert.
async function renderPdfPreview(file, container) {
    const iframeFallback = () => {
        try { container.innerHTML = `<iframe src="${URL.createObjectURL(file)}" title="Gutachten"></iframe>`; }
        catch (e) { container.innerHTML = '<div style="color:#e5e7eb;font-family:var(--font-mono);font-size:11px;padding:16px;">Vorschau nicht möglich – bitte „In neuem Tab öffnen" nutzen.</div>'; }
    };
    if (typeof pdfjsLib === 'undefined') { iframeFallback(); return; }
    // Zeitsperre: hängt das Zeichnen (z.B. sehr große Datei), wird automatisch auf iframe umgeschaltet.
    let finished = false;
    const guard = setTimeout(() => { if (!finished) { finished = true; iframeFallback(); } }, 12000);
    try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        if (finished) return; // Zeitsperre hat bereits umgeschaltet
        container.innerHTML = '';
        const maxPages = Math.min(pdf.numPages, 40); // Sicherheitslimit gegen sehr große Dokumente
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            if (finished) return;
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.cssText = 'display:block;margin:0 auto 12px;max-width:100%;height:auto;box-shadow:0 2px 8px rgba(0,0,0,0.35);background:#fff;';
            container.appendChild(canvas);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
        if (pdf.numPages > maxPages) {
            const more = document.createElement('div');
            more.style.cssText = 'color:#cbd5e1;font-family:var(--font-mono);font-size:10px;text-align:center;padding:8px;';
            more.textContent = `… ${pdf.numPages - maxPages} weitere Seite(n) über „In neuem Tab öffnen" einsehen.`;
            container.appendChild(more);
        }
        finished = true;
        clearTimeout(guard);
    } catch (e) {
        finished = true;
        clearTimeout(guard);
        console.warn('PDF.js-Vorschau fehlgeschlagen, nutze iframe:', e);
        iframeFallback();
    }
}

function openImportReview(file, data, mimeType) {
    if (typeof setzeReviewKopfZurueck === 'function') setzeReviewKopfZurueck();
    if (typeof merkeImportDokument === 'function') merkeImportDokument(file, mimeType);
    reviewData = normalizeImport(data);
    if (reviewBlobUrl) { try { URL.revokeObjectURL(reviewBlobUrl); } catch (e) {} }
    reviewBlobUrl = URL.createObjectURL(file);
    const left = document.getElementById('review-pdf');
    left.innerHTML = '';
    // Kopfzeile mit Dateiname + immer verfügbarem Fallback-Link (öffnet die PDF im neuen Tab)
    const bar = document.createElement('div');
    bar.className = 'review-pdf-bar';
    bar.innerHTML = `<span>${escapeHtml(file && file.name ? file.name : 'Dokument')}</span>`
        + `<a href="${reviewBlobUrl}" target="_blank" rel="noopener">In neuem Tab öffnen ↗</a>`;
    left.appendChild(bar);
    const content = document.createElement('div');
    content.className = 'review-pdf-content';
    left.appendChild(content);
    if (mimeType && mimeType.startsWith('image/')) {
        content.innerHTML = `<img src="${reviewBlobUrl}" alt="Gutachten" style="max-width:100%;display:block;margin:0 auto;">`;
    } else {
        renderPdfPreview(file, content);
    }
    document.getElementById('review-form').innerHTML = buildReviewForm(reviewData);
    document.getElementById('review-overlay').classList.add('active');
}

function closeReview() {
    document.getElementById('review-overlay').classList.remove('active');
    if (reviewBlobUrl) { try { URL.revokeObjectURL(reviewBlobUrl); } catch (e) {} reviewBlobUrl = null; }
    // Überschrift und Schaltflächen wieder auf das Einlesen stellen, falls die Ansicht
    // zuletzt zum Korrigieren geöffnet war.
    if (typeof setzeReviewKopfZurueck === 'function') setzeReviewKopfZurueck();
}

// Übernimmt die (geprüften/korrigierten) Werte in die App.
function applyImportedData(rev) {
    init();
    // WICHTIG: zuerst ALLE Stammfelder leeren, damit keine Daten eines vorherigen Falls
    // (anderer Person) stehen bleiben.
    document.querySelectorAll('#tab-1 [id^="stam-"]').forEach(el => {
        if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
    });
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
    setVal('stam-betreffend', rev.stam.betreffend);
    setVal('stam-geboren', rev.stam.geboren);
    const elKunde = document.getElementById('stam-kundennummer'); if (elKunde) elKunde.value = '';
    setVal('stam-kasse', rev.stam.kasse);
    setVal('stam-versnr', rev.stam.versnr);
    setVal('stam-bescheid', rev.stam.bescheid);
    setVal('stam-antrag', rev.stam.antrag);
    setVal('stam-organisation', rev.stam.organisation);
    setVal('stam-begutachtung', rev.stam.begutachtung);
    setVal('stam-art', normalizeArt(rev.stam.art));
    setVal('stam-pg-manual', rev.stam.pg);
    setVal('stam-pts-manual', rev.stam.pts);
    setVal('stam-anamnese', rev.anamnese);
    setVal('stam-befund', rev.befund);
    // Tabelle auf die Anzahl der eingelesenen Diagnosen erweitern und alle übernehmen
    ensureDiagRows((rev.diagnoses || []).length);
    (rev.diagnoses || []).forEach((d, idx) => { setVal(`diag-icd-${idx + 1}`, d.icd); setVal(`diag-txt-${idx + 1}`, d.text); });

    stateOrig = { special: rev.special || 0, values: {} };
    stateEigene = { special: rev.special || 0, values: {} };
    appealDraft = "";
    erstgespraechNotes = "";
    // extracted nur setzen, wenn es eine KI-Zusammenfassung gibt; sonst wird das
    // Vorgutachten aus den (präzisen) Einzelkriterien berechnet.
    if (rev.extracted) {
        stateOrig.extracted = { raws: rev.extracted.raws.slice(), weights: rev.extracted.weights.slice(), total: rev.extracted.total, pg: rev.extracted.pg };
    }

    ITEMS.forEach(i => {
        const v = rev.valuesMap[i.id];
        if (i.m === 5 && i.group !== 'D') {
            const o = (v && typeof v === 'object') ? { count: Number(v.count) || 0, period: v.period || 'W' } : { count: 0, period: 'W' };
            stateOrig.values[i.id] = { count: o.count, period: o.period };
            stateEigene.values[i.id] = { count: o.count, period: o.period };
        } else {
            const n = Number(v) || 0;
            stateOrig.values[i.id] = n;
            stateEigene.values[i.id] = n;
        }
    });

    // Ab hier gilt: die App traegt von sich aus nichts mehr ein. Alles Weitere sind
    // Vorschlaege, die der Berater ausdruecklich anhaken muss.
    protokolliereImport(ITEMS.filter(i => i.m).length);
    // Merken, welche Kriterien die KI tatsaechlich gelesen hat – die uebrigen sind beim
    // spaeteren Korrigieren die wahrscheinlichsten Kandidaten.
    if (typeof letzteProvided !== 'undefined') letzteProvided = rev.provided || null;
    if (typeof stellungnahmeVeraltet !== 'undefined') stellungnahmeVeraltet = false;
    fillTable('orig'); fillTable('own'); calculate('orig'); calculate('own'); syncSpecialUI();
    setTimeout(() => { autoResize(document.getElementById('stam-anamnese')); autoResize(document.getElementById('stam-befund')); }, 200);
}

function applyReviewedImport() {
    applyImportedData(reviewData);
    closeReview();
    switchTab(1);
    showToast("Werte geprüft und übernommen.", "success");
}

function buildReviewForm(rev) {
    const esc = escapeHtml;
    const modNames = ["Mobilität", "Kognitive Fähigkeiten", "Verhaltensweisen", "Selbstversorgung", "Krankheitsbed. Anforderungen", "Alltagsgestaltung"];
    let html = '';

    const tf = (label, k, type) => `<label class="rev-field"><span>${label}</span><input type="${type || 'text'}" value="${esc(rev.stam[k] || '')}" oninput="rvStam('${k}',this.value)"></label>`;
    html += `<div class="rev-section"><div class="rev-sec-title">Stammdaten</div><div class="rev-grid">`;
    html += tf('Betreffend', 'betreffend');
    html += tf('Geboren am', 'geboren', 'date');
    html += tf('Kasse', 'kasse');
    html += tf('Versicherungs-Nr.', 'versnr');
    html += tf('Bescheiddatum', 'bescheid', 'date');
    html += tf('Antragsdatum', 'antrag', 'date');
    html += tf('Gutachtenorganisation', 'organisation');
    html += tf('Begutachtungsdatum', 'begutachtung', 'date');
    html += `<label class="rev-field"><span>Durchführungsart</span><select onchange="rvStam('art',this.value)">${DURCHFUEHRUNGSARTEN.map(o => `<option ${rev.stam.art === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select></label>`;
    html += tf('Pflegegrad (Gutachten)', 'pg');
    html += tf('Gesamtpunkte (Gutachten)', 'pts');
    html += `</div></div>`;

    html += `<div class="rev-section"><label class="rev-field rev-inline"><input type="checkbox" ${rev.special == 1 ? 'checked' : ''} onchange="reviewData.special=this.checked?1:0; specialGeaendert=true;"> <span>Besondere Bedarfskonstellation (§ 15 Abs. 4) – Gebrauchsunfähigkeit beider Arme und Beine</span></label></div>`;

    // So viele Zeilen wie Diagnosen gefunden wurden, mindestens sechs, plus eine Leerzeile
    html += `<div class="rev-section"><div class="rev-sec-title">Diagnosen</div><div id="rev-diag-rows">`;
    const diagAnzahl = Math.max(6, (rev.diagnoses || []).length + 1);
    for (let idx = 0; idx < diagAnzahl; idx++) {
        const d = rev.diagnoses[idx] || { icd: '', text: '' };
        html += `<div class="rev-diag"><input placeholder="ICD 10" style="width:120px" value="${esc(d.icd || '')}" oninput="rvDiag(${idx},'icd',this.value)"><input placeholder="Diagnose" value="${esc(d.text || '')}" oninput="rvDiag(${idx},'text',this.value)"></div>`;
    }
    html += `</div><button type="button" class="btn btn-secondary" style="margin-top:8px" onclick="rvAddDiagRow()">+ Weitere Diagnose</button></div>`;

    // Modul-Zusammenfassung nur anzeigen, wenn sie von der KI kam. Bei lokal ausgelesenen
    // Kriterien wird das Vorgutachten automatisch aus den Einzelkriterien berechnet.
    if (rev.extracted) {
        html += `<div class="rev-section"><div class="rev-sec-title">Modul-Ergebnisse laut Gutachten</div><div class="rev-mod-grid"><div class="rev-mod-head">Modul</div><div class="rev-mod-head">Einzelpkt</div><div class="rev-mod-head">Gew. Pkt</div>`;
        for (let m = 0; m < 6; m++) {
            html += `<div>${m + 1}. ${modNames[m]}</div><div><input type="number" step="1" value="${rev.extracted.raws[m]}" oninput="rvExtract('raws',${m},this.value)"></div><div><input type="number" step="0.01" value="${rev.extracted.weights[m]}" oninput="rvExtract('weights',${m},this.value)"></div>`;
        }
        html += `<div><b>Gesamt / PG</b></div><div><input type="number" step="1" value="${rev.extracted.pg}" oninput="rvExtract('pg',0,this.value)" title="Pflegegrad"></div><div><input type="number" step="0.01" value="${rev.extracted.total}" oninput="rvExtract('total',0,this.value)" title="Gesamtpunkte"></div>`;
        html += `</div></div>`;
    }

    html += `<div class="rev-section"><div class="rev-sec-title">Anamnese</div><textarea class="rev-textarea" oninput="rvText('anamnese',this.value)">${esc(rev.anamnese || '')}</textarea></div>`;
    html += `<div class="rev-section"><div class="rev-sec-title">Befund</div><textarea class="rev-textarea" oninput="rvText('befund',this.value)">${esc(rev.befund || '')}</textarea></div>`;

    html += `<div class="rev-section"><div class="rev-sec-title">Einzelkriterien (NBA) — <span style="color:var(--green)">grün = erkannt</span> · <span style="color:var(--yellow)">gelb = nicht erkannt</span></div>`;
    for (let m = 1; m <= 6; m++) {
        html += `<div class="rev-mod-label">Modul ${m}: ${modNames[m - 1]}</div>`;
        ITEMS.filter(i => i.m === m).forEach(i => {
            const ok = rev.provided.has(i.id);
            const v = rev.valuesMap[i.id];
            let control = '';
            if (i.m === 5 && i.group !== 'D') {
                const noDaily = [55, 56, 57].includes(i.id);
                const cnt = (v && typeof v === 'object') ? v.count : 0;
                const per = (v && typeof v === 'object') ? v.period : 'W';
                control = `<input type="number" min="0" max="60" step="1" value="${cnt}" style="width:60px" oninput="rvM5Count(${i.id},this.value)"><select onchange="rvM5Period(${i.id},this.value)">${(noDaily ? ['W', 'M'] : ['D', 'W', 'M']).map(p => `<option value="${p}" ${per === p ? 'selected' : ''}>${p === 'D' ? 'Tag' : p === 'W' ? 'Woche' : 'Monat'}</option>`).join('')}</select>`;
            } else if (i.opts) {
                const cur = (typeof v === 'number') ? v : 0;
                control = `<select onchange="rvValNum(${i.id},this.value)">${i.opts.map((o, oi) => `<option value="${oi}" ${cur === oi ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
            }
            html += `<div class="rev-crit ${ok ? 'rev-ok' : 'rev-missing'}" id="rev-row-${i.id}"><span class="rev-crit-nr">${i.nr}</span><span class="rev-crit-title">${esc(i.title)}</span><span class="rev-crit-ctrl">${control}</span></div>`;
        });
    }
    html += `</div>`;
    return html;
}

// ===== FAMILIARA STELLUNGNAHME (Format 1:1 wie Muster-PDF) =====
