// Teil des Schulz Pflege-Assistenten. Diese Datei wurde aus der frueheren
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
                if (i === 4) throw new Error("Anfragenlimit überschritten (Rate Limit 429). Bitte warten Sie ca. 1 Minute, bevor Sie es erneut versuchen.");
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

// INTELLIGENTES KI-FALLBACK-SYSTEM FÜR MODELLANFRAGEN (VERMEIDET 404 BEI PERSÖNLICHEN KEYS UND UNTERDRÜCKT FEHLER-OVERLAYS)
async function callGeminiWithFallback(payload, systemPrompt) {
    const domApiKey = document.getElementById('user-api-key') ? document.getElementById('user-api-key').value.trim() : "";
    const cleanApiKey = (domApiKey || userApiKey.trim() || apiKey.trim()).trim();

    if (!cleanApiKey) {
        throw new Error("Bitte tragen Sie zuerst oben rechts Ihren Google Gemini API-Schlüssel ein!");
    }

    // Alle Modelle laufen über den v1beta-Endpunkt: nur dieser kennt "systemInstruction"
    // sowie "responseMimeType"/"responseSchema" für strukturiertes JSON (v1 würde 400 werfen).
    let models = [];
    if (domApiKey || userApiKey.trim() !== "") {
        models = [
            { name: "gemini-2.5-flash", version: "v1beta" },
            { name: "gemini-2.0-flash", version: "v1beta" },
            { name: "gemini-1.5-flash", version: "v1beta" },
            { name: "gemini-1.5-pro", version: "v1beta" }
        ];
    } else {
        models = [
            { name: "gemini-2.5-flash-preview-09-2025", version: "v1beta" },
            { name: "gemini-2.5-flash", version: "v1beta" },
            { name: "gemini-1.5-flash", version: "v1beta" }
        ];
    }

    // Zuletzt erfolgreiches Modell zuerst probieren -> spart Anfragen (weniger 429),
    // wenn der Schlüssel manche Modelle gar nicht unterstützt.
    try {
        const pref = localStorage.getItem('pflege_pref_model');
        if (pref) {
            const i = models.findIndex(m => m.name === pref);
            if (i > 0) { const [m] = models.splice(i, 1); models.unshift(m); }
        }
    } catch (e) {}

    let lastError = null;
    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${cleanApiKey}`;
        const fullPayload = { ...payload, systemInstruction: { parts: [{ text: systemPrompt }] } };
        try {
            const response = await callGeminiWithRetry(url, fullPayload);
            if (response) { try { localStorage.setItem('pflege_pref_model', model.name); } catch (e) {} return response; }
        } catch (e) {
            lastError = e;
            if (e.message && e.message.includes("429")) throw e;

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
                    if (e2.message && e2.message.includes("429")) throw e2;
                }
            }
            console.warn(`Model ${model.name} failed:`, e);
        }
    }
    throw lastError || new Error("Keines der KI-Modelle konnte erreicht werden.");
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
