// Teil des Pflegegradassistenten für Berater. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
async function callGeminiWithRetry(url, payload) {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                return await response.json();
            }
            // Echte Fehlermeldung von Google auslesen (sonst sieht der Nutzer nur "400")
            let apiMsg = "";
            try {
                const errBody = await response.json();
                apiMsg = (errBody && errBody.error && errBody.error.message) ? errBody.error.message : "";
            } catch (e2) {}
            if (response.status === 400 && /api key not valid/i.test(apiMsg)) {
                throw new Error("API Fehler: 400 – Der API-Schlüssel ist ungültig. Bitte prüfen Sie den oben rechts eingetragenen Google Gemini API-Schlüssel (aistudio.google.com).");
            }
            if (response.status === 429) {
                /* Tageslimit oder ein Kontingent von 0 (Modell im kostenlosen Zugang gesperrt):
                   Warten hilft nicht – sofort weiter zum nächsten Modell. Nur ein kurzes
                   Minutenlimit wird EINMAL abgewartet. Vorher: fünf Versuche mit wachsender
                   Pause, danach Abbruch ohne anderes Modell. */
                const warte = kiWartezeit(apiMsg);
                if (i >= 1 || warte === null || warte > 20) {
                    throw new Error("API Fehler: 429 " + (apiMsg || "Anfragenlimit überschritten"));
                }
                await new Promise(r => setTimeout(r, warte * 1000));
                continue;
            } else if (response.status >= 500 && response.status < 600) {
                if (i === 4) throw new Error(`API Fehler: ${response.status} ${apiMsg || response.statusText}`);
            } else {
                throw new Error(`API Fehler: ${response.status} ${apiMsg || response.statusText}`);
            }
        } catch (e) {
            if (e.message && (e.message.includes("400") || e.message.includes("403") || e.message.includes("404") || e.message.includes("429"))) {
                throw e;
            }
            if (i === 4) throw e;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }
}

/* Wie lange rät Google zu warten? (Sekunden, aus „retry in 12.3s" oder retryDelay „12s").
   null, wenn keine Angabe – oder wenn es ein Tageslimit ist: dann hilft Warten nicht. */
function kiWartezeit(apiMsg) {
    const t = String(apiMsg || '');
    if (/per\s*day|PerDay|daily/i.test(t)) return null;
    const m = t.match(/retry in\s*([\d.]+)\s*s/i) || t.match(/retryDelay"?\s*:?\s*"?([\d.]+)s/i);
    return m ? Math.ceil(parseFloat(m[1])) : null;
}

/* DER ECHTE GRUND IN KLARTEXT. Gemeldet: Eine Kollegin legte nach Anleitung einen Schlüssel
   an, die App sagte nur „Google-Limit erreicht" – bei JEDEM Fehler, auch bei einem
   ungültigen Schlüssel, einem nicht unterstützten Standort oder einem abgeschalteten
   Modell. Jetzt wird Googles Antwort übersetzt. */
function kiFehlerErklaerung(fehler) {
    const t = String((fehler && fehler.message) || fehler || '');
    if (!t) return '';
    if (/zuerst oben rechts/i.test(t)) return 'Es ist kein API-Schlüssel eingetragen (oben rechts).';
    if (/api key not valid|schlüssel ist ungültig|API_KEY_INVALID/i.test(t))
        return 'Der API-Schlüssel ist ungültig. Bitte auf aistudio.google.com/apikey neu kopieren und oben rechts '
             + 'einfügen – ohne Leerzeichen, vollständig ab „AIza".';
    if (/api key expired|API_KEY_EXPIRED/i.test(t))
        return 'Der API-Schlüssel ist abgelaufen. Bitte auf aistudio.google.com/apikey einen neuen erstellen.';
    if (/location is not supported|FAILED_PRECONDITION/i.test(t))
        return 'Google lässt die KI von diesem Standort bzw. Netzwerk aus nicht zu (etwa über ein Firmen-VPN). '
             + 'Bitte ohne VPN erneut versuchen.';
    if (/has not been used in project|is disabled|SERVICE_DISABLED|PERMISSION_DENIED|\b403\b/i.test(t))
        return 'Der Schlüssel darf die KI nicht nutzen (Zugriff verweigert). Bitte den Schlüssel auf '
             + 'aistudio.google.com/apikey neu erstellen – dort wird der Zugang automatisch freigeschaltet.';
    if (/limit:\s*0\b/i.test(t))
        return 'Für diesen Schlüssel ist im kostenlosen Zugang kein Kontingent frei. Abhilfe: im Google-Projekt die '
             + 'Abrechnung aktivieren (aistudio.google.com/apikey → „Abrechnung einrichten").';
    if (/\b429\b|quota|RESOURCE_EXHAUSTED|Anfragenlimit/i.test(t))
        return /per\s*day|PerDay|daily/i.test(t)
            ? 'Das Tageskontingent des Schlüssels ist aufgebraucht. Es wird gegen 9 Uhr morgens zurückgesetzt – oder '
              + 'die Abrechnung im Google-Projekt aktivieren.'
            : 'Das Anfragenlimit des Schlüssels ist erreicht. Bitte etwa eine Minute warten und erneut versuchen.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(t))
        return 'Google war nicht erreichbar (keine Internetverbindung oder eine Firewall blockiert generativelanguage.googleapis.com).';
    if (/Keines der KI-Modelle|\b404\b/i.test(t))
        return 'Keines der KI-Modelle ist für diesen Schlüssel verfügbar.';
    return 'Google meldet: ' + t.replace(/^API Fehler:\s*/, '');
}

/* WELCHE MODELLE KENNT DIESER SCHLÜSSEL? Google schaltet ältere Modelle ab (1.5 und 2.0 sind
   für neue Schlüssel nicht mehr verfügbar). Statt eine feste Liste zu raten, wird Google
   einmal gefragt (models.list, kostet kein Kontingent). Bevorzugt wird die Reihenfolge unten;
   fehlt die Liste, gilt sie unverändert. Zwischengespeichert nur im Arbeitsspeicher und nur
   mit den letzten Zeichen des Schlüssels als Kennung – der Schlüssel selbst wird nicht abgelegt. */
const KI_MODELL_VORZUG = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite",
                          "gemini-flash-lite-latest", "gemini-2.5-pro", "gemini-2.0-flash"];
const kiModellCache = {};
async function kiModelleFuer(key) {
    const kennung = key.slice(-6);
    if (kiModellCache[kennung]) return kiModellCache[kennung].slice();
    let namen = null;
    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${key}`);
        if (r.ok) {
            const j = await r.json();
            namen = (j.models || [])
                .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
                .map(m => String(m.name || '').replace(/^models\//, ''))
                .filter(n => /^gemini-/.test(n) && !/image|tts|audio|live|embedding|vision|robotics|computer/i.test(n));
        } else {
            let msg = ''; try { msg = (await r.json()).error.message || ''; } catch (e) {}
            // Ungültiger Schlüssel: gleich mit Klartext abbrechen statt vier Modelle zu probieren
            if (r.status === 400 && /api key not valid/i.test(msg))
                throw new Error("API Fehler: 400 – Der API-Schlüssel ist ungültig. " + msg);
            if (r.status === 400 || r.status === 403) throw new Error(`API Fehler: ${r.status} ${msg}`);
        }
    } catch (e) {
        if (/API Fehler/.test(e.message || '')) throw e;
        namen = null;                                   // Netz o. Ä.: feste Liste verwenden
    }
    let liste;
    if (namen && namen.length) {
        liste = KI_MODELL_VORZUG.filter(n => namen.includes(n));
        // Kennt der Schlüssel keines der bevorzugten, die verfügbaren Flash-Modelle nehmen
        if (!liste.length) liste = namen.filter(n => /flash/.test(n)).concat(namen.filter(n => !/flash/.test(n)));
        kiModellCache[kennung] = liste.slice();
    } else {
        liste = KI_MODELL_VORZUG.slice();
    }
    return liste;
}

// INTELLIGENTES KI-FALLBACK-SYSTEM FÜR MODELLANFRAGEN (VERMEIDET 404 BEI PERSÖNLICHEN KEYS UND UNTERDRÜCKT FEHLER-OVERLAYS)
async function callGeminiWithFallback(payload, systemPrompt) {
    const domApiKey = document.getElementById('user-api-key') ? document.getElementById('user-api-key').value.trim() : "";
    // Beim Kopieren rutschen gern Leerzeichen, Zeilenumbrüche oder Anführungszeichen mit
    const cleanApiKey = (domApiKey || userApiKey.trim() || apiKey.trim()).replace(/[\s"'„“]/g, '');

    if (!cleanApiKey) {
        throw new Error("Bitte tragen Sie zuerst oben rechts Ihren Google Gemini API-Schlüssel ein!");
    }

    // Alle Modelle laufen über den v1beta-Endpunkt: nur dieser kennt "systemInstruction"
    // sowie "responseMimeType"/"responseSchema" für strukturiertes JSON (v1 würde 400 werfen).
    const models = (await kiModelleFuer(cleanApiKey)).map(n => ({ name: n, version: "v1beta" }));

    // Zuletzt erfolgreiches Modell zuerst probieren -> spart Anfragen (weniger 429),
    // wenn der Schlüssel manche Modelle gar nicht unterstützt.
    try {
        const pref = localStorage.getItem('pflege_pref_model');
        if (pref) {
            const i = models.findIndex(m => m.name === pref);
            if (i > 0) { const [m] = models.splice(i, 1); models.unshift(m); }
        }
    } catch (e) {}

    let lastError = null, limitFehler = null;
    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${cleanApiKey}`;
        const fullPayload = { ...payload, systemInstruction: { parts: [{ text: systemPrompt }] } };
        try {
            const response = await callGeminiWithRetry(url, fullPayload);
            if (response) { try { localStorage.setItem('pflege_pref_model', model.name); } catch (e) {} return response; }
        } catch (e) {
            lastError = e;
            // Jedes Modell hat ein eigenes Kontingent: bei einem Limit das nächste versuchen.
            if (e.message && e.message.includes("429")) { limitFehler = limitFehler || e; continue; }
            // Ungültiger Schlüssel, Standort, gesperrter Zugang: gilt für alle Modelle – abbrechen.
            if (e.message && /api key|location is not supported|PERMISSION_DENIED|has not been used|\b403\b/i.test(e.message)) throw e;

            // Sicherheitsnetz: kennt das Modell die Schema-Felder nicht, ohne sie erneut versuchen.
            if (e.message && /responseMimeType|responseSchema|generation_config/i.test(e.message) && fullPayload.generationConfig) {
                try {
                    const stripped = JSON.parse(JSON.stringify(fullPayload));
                    if (stripped.generationConfig) {
                        delete stripped.generationConfig.responseMimeType;
                        delete stripped.generationConfig.responseSchema;
                        if (Object.keys(stripped.generationConfig).length === 0) delete stripped.generationConfig;
                    }
                    const resp2 = await callGeminiWithRetry(url, stripped);
                    if (resp2) { try { localStorage.setItem('pflege_pref_model', model.name); } catch (e) {} return resp2; }
                } catch (e2) {
                    lastError = e2;
                    if (e2.message && e2.message.includes("429")) { limitFehler = limitFehler || e2; continue; }
                }
            }
            console.warn(`Model ${model.name} failed:`, e);
        }
    }
    // Ein Limit ist aussagekräftiger als ein „Modell unbekannt" beim letzten Versuch
    throw limitFehler || lastError || new Error("Keines der KI-Modelle konnte erreicht werden.");
}

/* „Schlüssel prüfen": ein einziger, winziger Aufruf – danach steht fest, ob der Schlüssel
   funktioniert, und wenn nicht, warum. Für die Einrichtung bei Kolleginnen gedacht. */
async function pruefeApiSchluessel() {
    const el = document.getElementById('user-api-key');
    if (el) { userApiKey = el.value.trim(); try { saveApiKey(); } catch (e) {} }
    showOverlay('API-Schlüssel wird geprüft...', 'Verbindung zu Google');
    try {
        const r = await callGeminiWithFallback({
            contents: [{ role: 'user', parts: [{ text: 'Antworte nur mit: OK' }] }]
        }, 'Du bist ein Verbindungstest. Antworte nur mit OK.');
        const ok = !!(r && r.candidates && r.candidates.length);
        let modell = ''; try { modell = localStorage.getItem('pflege_pref_model') || ''; } catch (e) {}
        showToast(ok ? 'Der API-Schlüssel funktioniert ✓' + (modell ? ' (Modell ' + modell + ')' : '')
                     : 'Google hat geantwortet, aber ohne Text. Bitte später erneut prüfen.', ok ? 'success' : 'error');
        return ok;
    } catch (e) {
        showToast('Schlüssel funktioniert nicht: ' + kiFehlerErklaerung(e), 'error');
        return false;
    } finally {
        hideOverlay();
    }
}

function showConfirmModal() {
    document.getElementById('confirm-modal').classList.add('active');
}
function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('active');
}

function showOverlay(title, step) {
    document.getElementById('ai-overlay').classList.add('active');
    document.querySelector('.ai-overlay-title').innerText = title;
    document.getElementById('ai-overlay-step').innerText = step;
    document.getElementById('ai-progress-fill').style.width = '10%';
    document.getElementById('system-status-badge').className = "status-badge processing";
    document.getElementById('system-status-text').innerText = "Verarbeitet...";
}
function updateOverlay(step, pct) {
    document.getElementById('ai-overlay-step').innerText = step;
    document.getElementById('ai-progress-fill').style.width = pct + '%';
}
function hideOverlay() {
    document.getElementById('ai-overlay').classList.remove('active');
    document.getElementById('system-status-badge').className = "status-badge ready";
    document.getElementById('system-status-text').innerText = "Bereit";
}

// STUFE 2: optionaler lokaler Extraktions-/OCR-Server (Alternative B).
// Liefert den lokal ausgelesenen Gutachten-Text oder null (dann Direktweg an Gemini).
