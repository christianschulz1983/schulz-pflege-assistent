// Teil des Pflegegradassistenten für Berater. Diese Datei wurde aus der frueheren
// Einzeldatei index.html herausgeloest; der Inhalt ist unveraendert.
// API Key: Always set const apiKey = "" (empty string). The execution environment provides the key at runtime.
const apiKey = "";
let userApiKey = "";

// API-Schlüssel lokal merken, damit er nur einmal eingetragen werden muss
const API_KEY_STORAGE = "pflege_assistent_api_key";

function saveApiKey() {
    const el = document.getElementById('user-api-key');
    if (!el) return;
    userApiKey = el.value.trim();
    try { localStorage.setItem(API_KEY_STORAGE, userApiKey); } catch (e) {}
}

function loadApiKey() {
    const el = document.getElementById('user-api-key');
    if (!el) return;
    let stored = "";
    try { stored = localStorage.getItem(API_KEY_STORAGE) || ""; } catch (e) {}
    if (stored) {
        el.value = stored;
        userApiKey = stored;
    }
}

function toggleApiKeyVisible() {
    const el = document.getElementById('user-api-key');
    const btn = document.getElementById('api-key-toggle');
    if (!el) return;
    if (el.type === 'password') {
        el.type = 'text';
        if (btn) btn.innerText = '🙈';
    } else {
        el.type = 'password';
        if (btn) btn.innerText = '👁';
    }
}

async function pasteApiKey() {
    const el = document.getElementById('user-api-key');
    if (!el) return;
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            el.value = (text || "").trim();
            saveApiKey();
            // Kurz sichtbar machen, damit der Nutzer das Einfügen bestätigt sieht
            el.type = 'text';
            const btn = document.getElementById('api-key-toggle');
            if (btn) btn.innerText = '🙈';
            showToast("API-Schlüssel aus Zwischenablage eingefügt.", "success");
        } else {
            throw new Error("no-clipboard-api");
        }
    } catch (e) {
        el.focus();
        showToast("Automatisches Einfügen blockiert. Bitte ins Feld klicken und mit Strg+V einfügen.", "error");
    }
}

const PREFIX_M3 = "Ist eine psychiatrische Erkrankung oder eine Demenz fachärztlich diagnostiziert? ";
const M4_IMPORTANT = "<b>Wichtig:</b> Bei kognitiven Einschränkungen → Wertung unter 4.2.5 prüfen.";

// Zulässige Durchführungsarten der Begutachtung – nur diese drei Formulierungen sind korrekt.
const DURCHFUEHRUNGSARTEN = [
    'Begutachtung im Hausbesuch mit persönlicher Befunderhebung',
    'Begutachtung per Aktenlage',
    'Begutachtung in Form eines strukturierten Telefoninterviews'
];
// Ordnet eine beliebige Schreibweise aus dem Gutachten einer der drei Formulierungen zu.
function normalizeArt(v) {
    const s = (v || '').toString().toLowerCase();
    if (!s.trim()) return DURCHFUEHRUNGSARTEN[0];
    if (DURCHFUEHRUNGSARTEN.some(a => a.toLowerCase() === s.trim())) {
        return DURCHFUEHRUNGSARTEN.find(a => a.toLowerCase() === s.trim());
    }
    if (/aktenlage|nach aktenlage/.test(s)) return DURCHFUEHRUNGSARTEN[1];
    if (/telefon/.test(s)) return DURCHFUEHRUNGSARTEN[2];
    return DURCHFUEHRUNGSARTEN[0];   // Hausbesuch / persönliche Befunderhebung
}

const ITEMS = [
    { id:0, nr:"F 4.1.B", title:"Besondere Bedarfskonstellation", info:{ check:"Gebrauchsunfähigkeit beider Arme und Beine (§ 15 Abs. 4 SGB XI).", steps:[{l:"PG 5",d:"Sofortige Zuordnung ohne weitere Punkteprüfung."}] } },
    { id:1, m:1, nr:"4.1.1", title:"Positionswechsel im Bett", opts:["selbständig","überwiegend selbständig","überwiegend unselbständig","unselbständig"], info:{ check:"Kann sich die Person im Bett eigenständig umdrehen, Beine bewegen oder aufrichten?", steps:[{l:"Überwiegend selbständig",d:"Nur geringfügige Hilfe nötig, z.B. Beine aus dem Bett rausheben."},{l:"Überwiegend unselbständig",d:"Hoher Unterstützungsbedarf, Lage kann danach selbst gehalten werden."},{l:"Unselbständig",d:"Lage kann nicht beibehalten werden."}] } },
    { id:2, m:1, nr:"4.1.2", title:"Halten einer stabilen Sitzposition", opts:["selbständig","überwiegend selbständig","überwiegend unselbständig","unselbständig"], info:{ check:"Frei auf Bettkante oder Stuhl ohne Lehne sitzen.", steps:[{l:"Überwiegend selbständig",d:"Absicherung unmittelbar daneben erforderlich."}] } },
    { id:3, m:1, nr:"4.1.3", title:"Umsetzen", opts:["selbständig","überwiegend selbständig","überwiegend unselbständig","unselbständig"], info:{ check:"Transfer Bett zu Rollstuhl / Sessel zu WC.", steps:[{l:"Unselbständig",d:"Muss komplett gehoben werden."}] } },
    { id:4, m:1, nr:"4.1.4", title:"Fortbewegen innerhalb des Wohnbereichs", opts:["selbständig","überwiegend selbständig","überwiegend unselbständig","unselbständig"], info:{ check:"Weg zum WC oder ca. 8 m in der Wohnung.", rule:"Rollator oder Rollstuhl (selbst angetrieben) → selbständig." } },
    { id:5, m:1, nr:"4.1.5", title:"Treppensteigen", opts:["selbständig","überwiegend selbständig","überwiegend unselbständig","unselbständig"], info:{ check:"Ganze Etage in aufrechter Haltung überwinden.", rule:"Treppengeländer allein genutzt → selbständig." } },
    { id:6, m:2, nr:"4.2.1", title:"Personen aus dem näheren Umfeld erkennen", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Erkennt Bezugspersonen jederzeit sicher?", rule:"Brille/Hörgerät zählt nicht." } },
    { id:7, m:2, nr:"4.2.2", title:"Örtliche Orientierung", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Sicher zurechtfinden in Wohnung und nahem Umfeld?", rule:"Türbeschriftungen / Handy-App allein genutzt → unbeeinträchtigt." } },
    { id:8, m:2, nr:"4.2.3", title:"Zeitliche Orientierung", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Tageszeit, Wochentag, Monat bekannt?", steps:[{l:"Nicht vorhanden",d:"Hat jegliches Zeitgefühl verloren."}] } },
    { id:9, m:2, nr:"4.2.4", title:"Erinnern an wesentliche Ereignisse", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Bericht über letzte 24 Stunden möglich? Rein kognitiv." } },
    { id:10, m:2, nr:"4.2.5", title:"Steuern von mehrschrittigen Alltagshandlungen", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Planen (z.B. Kaffee kochen)? Rein kognitiv!", rule:"Checkliste selbständig genutzt → unbeeinträchtigt." } },
    { id:11, m:2, nr:"4.2.6", title:"Treffen von Entscheidungen im Alltagsleben", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Zweckmäßig entscheiden (Kleidung)?", steps:[{l:"Gering vorhanden",d:"Trifft unlogische Entscheidungen."}] } },
    { id:12, m:2, nr:"4.2.7", title:"Verstehen von Sachverhalten und Informationen", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Begreift Person Inhalte? NICHT Gehör bewerten!" } },
    { id:13, m:2, nr:"4.2.8", title:"Erkennen von Risiken und Gefahren", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Herdplatte, Verkehr?", rule:"Warnsysteme allein genutzt → unbeeinträchtigt." } },
    { id:14, m:2, nr:"4.2.9", title:"Mitteilen von elementaren Bedürfnissen", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Hunger, Schmerz, Toilettengang verständlich äußern?" } },
    { id:15, m:2, nr:"4.2.10", title:"Verstehen von Aufforderungen", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"'Komm bitte zum Essen'. Kognition + Gehör." } },
    { id:16, m:2, nr:"4.2.11", title:"Beteiligen an einem Gespräch", opts:["unbeeinträchtigt","größtenteils vorh.","gering vorh.","nicht vorh."], info:{ check:"Einer Runde folgen, Thema halten?", rule:"Sprachcomputer / Hörgerät → selbständig." } },
    { id:17, m:3, nr:"4.3.1", title:"Motorisch geprägte Verhaltensauffälligkeiten", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5], info:{ check:PREFIX_M3+"Bewegungsdrang? Zielloses Umherlaufen?" } },
    { id:18, m:3, nr:"4.3.2", title:"Nächtliche Unruhe", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5], info:{ check:PREFIX_M3+"Geistert die Person nachts durch das Haus?" } },
    { id:19, m:3, nr:"4.3.3", title:"Selbstschädigendes und autoaggressives Verhalten", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:20, m:3, nr:"4.3.4", title:"Beschädigen von Gegenständen", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:21, m:3, nr:"4.3.5", title:"Physisch aggressives Verhalten gegenüber anderen Personen", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:22, m:3, nr:"4.3.6", title:"Verbale Aggression", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:23, m:3, nr:"4.3.7", title:"Andere pflegerelevante vokale Auffälligkeiten", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:24, m:3, nr:"4.3.8", title:"Abwehr von pflegerischen Maßnahmen", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5], info:{ check:PREFIX_M3+"Psychische Abwehr. Keine körperliche Steifheit bewerten." } },
    { id:25, m:3, nr:"4.3.9", title:"Wahnvorstellungen und Halluzinationen", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:26, m:3, nr:"4.3.10", title:"Ängste", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:27, m:3, nr:"4.3.11", title:"Antriebslosigkeit bei depressiver Stimmungslage", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5], info:{ check:"Depression diagnostiziert? Motor aus?" } },
    { id:28, m:3, nr:"4.3.12", title:"Sozial inadäquate Verhaltensweisen", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:29, m:3, nr:"4.3.13", title:"Sonstige pflegerelevante psychische Problemlagen", opts:["nie/selten","selten","häufig","täglich"], val:[0,1,3,5] },
    { id:30, m:4, nr:"4.4.1", title:"Waschen des vorderen Oberkörpers", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"], info:{ check:"Gesicht, Hände, Arme. "+M4_IMPORTANT } },
    { id:31, m:4, nr:"4.4.2", title:"Körperpflege im Bereich des Kopfes", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:32, m:4, nr:"4.4.3", title:"Waschen des Intimbereichs", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:33, m:4, nr:"4.4.4", title:"Duschen und Baden einschließlich Haarewaschen", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:34, m:4, nr:"4.4.5", title:"An- und Auskleiden des Oberkörpers", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:35, m:4, nr:"4.4.6", title:"An- und Auskleiden des Unterkörpers", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:36, m:4, nr:"4.4.7", title:"Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:37, m:4, nr:"4.4.8", title:"Essen", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"], val:[0,3,6,9] },
    { id:38, m:4, nr:"4.4.9", title:"Trinken", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"], val:[0,2,4,6] },
    { id:39, m:4, nr:"4.4.10", title:"Benutzen einer Toilette oder eines Toilettenstuhls", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"], val:[0,2,4,6] },
    { id:40, m:4, nr:"4.4.11", title:"Bewältigen der Folgen einer Harninkontinenz und Umgang mit Dauerkatheter", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:41, m:4, nr:"4.4.12", title:"Bewältigen der Folgen einer Stuhlinkontinenz und Umgang mit Stoma", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:42, m:4, nr:"4.4.13", title:"Ernährung parenteral oder über Sonde", opts:["selbständig / nicht tägl.","tägl. zusätzlich oral","ausschließlich"], val:[0,6,3] },
    { id:43, m:5, nr:"4.5.1", title:"Medikation", group:"A", info:{ check:"Tabletten, Tropfen, Aerosole." } },
    { id:44, m:5, nr:"4.5.2", title:"Injektionen", group:"A" },
    { id:45, m:5, nr:"4.5.3", title:"Versorgung intravenöser Zugänge (Port)", group:"A" },
    { id:46, m:5, nr:"4.5.4", title:"Absaugen und Sauerstoffgabe", group:"A" },
    { id:47, m:5, nr:"4.5.5", title:"Einreibungen oder Kälte- und Wärmeanwendungen", group:"A" },
    { id:48, m:5, nr:"4.5.6", title:"Messung und Deutung von Körperzuständen", group:"A" },
    { id:49, m:5, nr:"4.5.7", title:"Versorgung mit körpernahen Hilfsmitteln", group:"A" },
    { id:50, m:5, nr:"4.5.8", title:"Verbandwechsel und Wundversorgung", group:"B" },
    { id:51, m:5, nr:"4.5.9", title:"Versorgung mit Stoma", group:"B" },
    { id:52, m:5, nr:"4.5.10", title:"Regelmäßige Einmalkatheterisierung und Nutzung von Abführmethoden", group:"B" },
    { id:53, m:5, nr:"4.5.11", title:"Therapiemaßnahmen in häuslicher Umgebung", group:"B" },
    { id:54, m:5, nr:"4.5.12", title:"Zeit- und technikintensive Maßnahmen", group:"C", factor:{D:60,W:8.6,M:2} },
    { id:55, m:5, nr:"4.5.13", title:"Arztbesuche", group:"C", factor:{W:4.3,M:1} },
    { id:56, m:5, nr:"4.5.14", title:"Besuch anderer med./therapeutischer Einrichtungen (bis 3h)", group:"C", factor:{W:4.3,M:1} },
    { id:57, m:5, nr:"4.5.15", title:"Zeitlich ausgedehnte Besuche med./therapeutischer Einrichtungen (über 3h)", group:"C", factor:{W:8.6,M:2} },
    { id:58, m:5, nr:"4.5.16", title:"Einhalten einer Diät oder krankheitsbedingter Verhaltensvorschriften", group:"D", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"], val:[0,1,2,3] },
    { id:59, m:6, nr:"4.6.1", title:"Gestaltung des Tagesablaufs und Anpassung an Veränderungen", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:60, m:6, nr:"4.6.2", title:"Ruhen und Schlafen", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:61, m:6, nr:"4.6.3", title:"Sichbeschäftigen", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:62, m:6, nr:"4.6.4", title:"Vornehmen von in die Zukunft gerichteten Planungen", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:63, m:6, nr:"4.6.5", title:"Interaktion mit Personen im direkten Kontakt", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] },
    { id:64, m:6, nr:"4.6.6", title:"Kontaktpflege zu Personen außerhalb des direkten Umfelds", opts:["selbständig","überw. selbst.","überw. unselbst.","unselbständig"] }
];

let stateOrig = { special:0, values:{} };
let stateEigene = { special:0, values:{} };

// Mitschrift des Erstgesprächs (Reiter "Auswertung"). Wird in die KI-Begründung eingearbeitet.
let erstgespraechNotes = "";
// Zwischengespeicherter KI-Entwurf, damit er beim Tab-Wechsel nicht verloren geht.
let appealDraft = "";

// ROBUST DATUM-PARSER FOR BROWSER DATE PICKERS (YYYY-MM-DD)
function formatToYYYYMMDD(dateStr) {
    if (!dateStr) return "";
    let clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // DD.MM.YYYY
    let ddmmyyyy = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddmmyyyy) {
        let day = ddmmyyyy[1].padStart(2, '0');
        let month = ddmmyyyy[2].padStart(2, '0');
        let year = ddmmyyyy[3];
        return `${year}-${month}-${day}`;
    }

    // German Month Names
    const months = {
        "jan": "01", "feb": "02", "mär": "03", "apr": "04", "mai": "05", "jun": "06",
        "jul": "07", "aug": "08", "sep": "09", "okt": "10", "nov": "11", "dez": "12",
        "januar": "01", "februar": "02", "märz": "03", "april": "04", "juni": "06",
        "juli": "07", "august": "08", "september": "09", "oktober": "10", "november": "11", "dezember": "12"
    };
    let matchWord = clean.match(/^(\d{1,2})\.?\s+([a-zA-ZäöüÄÖÜß\.]+)\s+(\d{4})$/);
    if (matchWord) {
        let day = matchWord[1].padStart(2, '0');
        let monthName = matchWord[2].toLowerCase().replace(/\./g, '');
        let month = months[monthName] || "01";
        let year = matchWord[3];
        return `${year}-${month}-${day}`;
    }

    try {
        let d = new Date(clean);
        if (!isNaN(d.getTime())) {
            let day = String(d.getDate()).padStart(2, '0');
            let month = String(d.getMonth() + 1).padStart(2, '0');
            let year = d.getFullYear();
            return `${year}-${month}-${day}`;
        }
    } catch(e) {}

    return "";
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    document.getElementById('btn-tab-'+id).classList.add('active');
    if (id === 4) renderAuswertung();
    if (id === 'befund' && typeof renderBefund === 'function') renderBefund();
}

function autoResize(t) {
    if (!t) return;
    t.style.height='auto';
    t.style.height=t.scrollHeight+'px';
}

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// EXPONENTIAL BACKOFF FOR API CALLS (WITH RESILIENCE FOR RATE LIMITS)
