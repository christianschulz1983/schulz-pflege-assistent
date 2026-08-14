// Befundkatalog für Erstantrag und Höherstufungsantrag.
// Gliederung nach den Vorgaben des Verfassers. Je Eintrag eine feste Skala und ein Feld
// für Ergänzungen; je Gruppe lassen sich zusätzliche Einträge anlegen.
//
// "nba"     = Der Eintrag IST ein NBA-Kriterium. Die Stufen entsprechen eins zu eins den
//             Optionen des Kriteriums; die Eingabe wird direkt übernommen (keine Doppelerfassung).
// "stuetzt" = Funktionsbefund. Ab der angegebenen Stufe wird eine Einschränkung bei den
//             genannten Kriterien VORGESCHLAGEN; die Bewertung bleibt beim Pflegeberater.

const SKALA_PINZETTE  = ['Vollständig möglich', 'Verlangsamt möglich', 'Unkoordiniert möglich', 'Nicht möglich'];
const SKALA_FAUST     = ['Vollständig möglich', 'Mit reduzierter Kraft vollständig möglich', 'Unvollständig möglich', 'Nicht möglich'];
const SKALA_ARMHEBUNG = ['Vollständig möglich', 'Bis zum Hinterkopf möglich', 'Bis zum Ohr möglich', 'Bis zum Mund möglich'];
const SKALA_SCHUERZE  = ['Vollständig möglich', 'Bis zum hinteren Beckenkamm möglich', 'Bis zum mittleren Beckenkamm möglich', 'Bis zum vorderen Beckenkamm möglich'];
const SKALA_FUESSE    = ['Vollständig möglich', 'Bis zu den Sprunggelenken möglich', 'Bis zur Mitte der Unterschenkel möglich', 'Bis zu den Kniegelenken möglich', 'Bis zum Spann möglich'];
const SKALA_GELENK    = ['Frei beweglich', 'Endgradig eingeschränkt', 'Deutlich eingeschränkt', 'Aufgehoben'];
const SKALA_SELBST    = ['selbständig', 'überwiegend selbständig', 'überwiegend unselbständig', 'unselbständig'];
const SKALA_FAEHIG    = ['unbeeinträchtigt', 'größtenteils vorhanden', 'in geringem Maße vorhanden', 'nicht vorhanden'];
const SKALA_HAEUFIG   = ['nie oder sehr selten', 'selten', 'häufig', 'täglich'];

// Hilfsfunktion: erzeugt Einträge, die unmittelbar einem NBA-Kriterium entsprechen
function _nbaEintraege(nummern, skala, zusatzfeld) {
    return nummern.map(nr => {
        const item = (typeof ITEMS !== 'undefined') ? ITEMS.find(i => i.nr === nr) : null;
        return {
            id: 'k_' + nr.replace(/\./g, '_'),
            titel: nr + ' ' + (item ? item.title : nr),
            skala: skala,
            nba: nr,
            zusatz: zusatzfeld || null
        };
    });
}

const BEFUND_GRUPPEN = [
    {
        id: 'obere', titel: 'Beweglichkeit obere Extremitäten',
        hinweis: 'Funktionsprüfungen je Seite. Sie stützen die Bewertung in den Modulen 1 und 4.',
        eintraege: [
            { id: 'pinzettengriff', titel: 'Pinzettengriff', seiten: true, skala: SKALA_PINZETTE,
              stuetzt: [{ nr: '4.4.7', ab: 1 }, { nr: '4.4.5', ab: 2 }, { nr: '4.4.6', ab: 2 }] },
            { id: 'faustschluss', titel: 'Faustschluss / Handkraft', seiten: true, skala: SKALA_FAUST,
              stuetzt: [{ nr: '4.4.7', ab: 1 }, { nr: '4.4.5', ab: 2 }] },
            { id: 'armhebung', titel: 'Armhebung über Kopf', seiten: true, skala: SKALA_ARMHEBUNG,
              stuetzt: [{ nr: '4.4.2', ab: 1 }, { nr: '4.4.5', ab: 1 }] },
            { id: 'nackengriff', titel: 'Nackengriff', seiten: true, skala: SKALA_ARMHEBUNG,
              stuetzt: [{ nr: '4.4.2', ab: 1 }, { nr: '4.4.5', ab: 1 }] },
            { id: 'schuerzengriff', titel: 'Schürzengriff', seiten: true, skala: SKALA_SCHUERZE,
              stuetzt: [{ nr: '4.4.3', ab: 1 }, { nr: '4.4.6', ab: 1 }, { nr: '4.4.10', ab: 2 }] },
            { id: 'greifen_fuesse', titel: 'Greifen zu den Füßen', seiten: true, skala: SKALA_FUESSE,
              stuetzt: [{ nr: '4.4.6', ab: 1 }] }
        ]
    },
    {
        id: 'mobilitaet', titel: 'Mobilität',
        hinweis: 'Die ersten fünf Einträge sind die Kriterien des Moduls 1 – die Eingabe wird direkt übernommen.',
        eintraege: _nbaEintraege(['4.1.1', '4.1.2', '4.1.3', '4.1.4', '4.1.5'], SKALA_SELBST).concat([
            { id: 'gangbild', titel: 'Gangbild', skala: ['Sicher', 'Unsicher', 'Stark unsicher', 'Nicht gehfähig'],
              stuetzt: [{ nr: '4.1.4', ab: 1 }, { nr: '4.1.5', ab: 1 }] },
            { id: 'gehstrecke', titel: 'Gehstrecke', frei: true, platzhalter: 'z. B. ca. 20 m mit Rollator, dann Pause' },
            { id: 'gehhilfen', titel: 'Genutzte Hilfsmittel', frei: true, platzhalter: 'z. B. Rollator, Gehstock, Rollstuhl' },
            { id: 'stuerze', titel: 'Sturzereignisse (letzte 6 Monate)', frei: true, platzhalter: 'Anzahl, Zeitpunkt, Folgen' }
        ])
    },
    {
        id: 'kognition', titel: 'Kognition',
        hinweis: 'Entspricht den Kriterien des Moduls 2 – die Eingabe wird direkt übernommen.',
        eintraege: _nbaEintraege(['4.2.1', '4.2.2', '4.2.3', '4.2.4', '4.2.5', '4.2.6',
                                  '4.2.7', '4.2.8', '4.2.9', '4.2.10', '4.2.11'], SKALA_FAEHIG)
    },
    {
        id: 'psyche', titel: 'Psychische Problemlagen',
        hinweis: 'Entspricht den Kriterien des Moduls 3. Voraussetzung ist eine fachärztliche Diagnose, '
               + 'die seit mindestens sechs Monaten behandelt wird – diese bitte je Eintrag angeben.',
        eintraege: _nbaEintraege(['4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6', '4.3.7',
                                  '4.3.8', '4.3.9', '4.3.10', '4.3.11', '4.3.12', '4.3.13'],
                                 SKALA_HAEUFIG, 'Auftreten aufgrund welcher Diagnose')
    },
    {
        id: 'ernaehrung', titel: 'Ernährung',
        eintraege: [
            { id: 'groesse', titel: 'Körpergröße (cm)', frei: true, zahl: true, platzhalter: 'z. B. 172' },
            { id: 'gewicht', titel: 'Gewicht (kg)', frei: true, zahl: true, platzhalter: 'z. B. 68' },
            { id: 'bmi', titel: 'BMI', frei: true, berechnet: true, platzhalter: 'wird berechnet' },
            { id: 'ernaehrungszustand', titel: 'Ernährungszustand',
              skala: ['Normalgewicht', 'Untergewicht', 'Übergewicht', 'Adipositas'] },
            { id: 'schluckstoerung', titel: 'Schluckstörung',
              skala: ['Nein', 'Leicht', 'Ausgeprägt (diagnostiziert)'],
              stuetzt: [{ nr: '4.4.8', ab: 2 }, { nr: '4.4.9', ab: 2 }] },
            { id: 'zahnstatus', titel: 'Kau- und Zahnstatus', frei: true, platzhalter: 'z. B. Prothese oben und unten' },
            { id: 'trinkmenge', titel: 'Trinkmenge', frei: true, platzhalter: 'z. B. etwa 1,2 Liter täglich' },
            { id: 'sonde', titel: 'Sonde oder Port', skala: ['Nein', 'PEG', 'Parenteral (Port)'],
              stuetzt: [{ nr: '4.4.13', ab: 1 }] }
        ]
    },
    {
        id: 'sinne', titel: 'Sinneswahrnehmungen / Interaktion',
        hinweis: 'Die letzten sechs Einträge sind die Kriterien des Moduls 6 – die Eingabe wird direkt übernommen.',
        eintraege: [
            { id: 'sehen', titel: 'Sehen',
              skala: ['Unbeeinträchtigt', 'Mit Brille ausgeglichen', 'Stark eingeschränkt', 'Blind'] },
            { id: 'hoeren', titel: 'Hören',
              skala: ['Unbeeinträchtigt', 'Mit Hörgerät ausgeglichen', 'Stark eingeschränkt', 'Gehörlos'],
              stuetzt: [{ nr: '4.2.10', ab: 2 }] },
            { id: 'sprechen', titel: 'Sprechen und Verständlichkeit',
              skala: ['Unbeeinträchtigt', 'Verwaschen, aber verständlich', 'Stark eingeschränkt', 'Nicht möglich'],
              stuetzt: [{ nr: '4.2.9', ab: 2 }] }
        ].concat(_nbaEintraege(['4.6.1', '4.6.2', '4.6.3', '4.6.4', '4.6.5', '4.6.6'], SKALA_SELBST))
    },
    {
        id: 'sonstiges', titel: 'Sonstiges',
        eintraege: [
            { id: 'wunden', titel: 'Wunden oder Dekubitus',
              skala: ['Keine', 'Vorhanden, in Abheilung', 'Chronisch (über 6 Monate)'],
              zusatz: 'Lokalisation und Versorgung', stuetzt: [{ nr: '4.5.8', ab: 1 }] },
            { id: 'oedeme', titel: 'Ödeme', skala: ['Keine', 'Gering', 'Ausgeprägt'] },
            { id: 'kontinenz_harn', titel: 'Harnkontinenz',
              skala: ['Kontinent', 'Teilkontinent', 'Inkontinent', 'Dauerkatheter oder Urostoma'],
              stuetzt: [{ nr: '4.4.11', ab: 1 }] },
            { id: 'kontinenz_stuhl', titel: 'Stuhlkontinenz',
              skala: ['Kontinent', 'Teilkontinent', 'Inkontinent', 'Stoma'],
              stuetzt: [{ nr: '4.4.12', ab: 1 }] },
            { id: 'schmerz', titel: 'Schmerz',
              skala: ['Keine Angabe von Schmerzen', 'Gelegentlich', 'Dauerhaft', 'Dauerhaft trotz Medikation'],
              zusatz: 'Lokalisation und Auswirkung' },
            { id: 'atmung', titel: 'Atmung',
              skala: ['Unauffällig', 'Belastungsdyspnoe', 'Ruhedyspnoe', 'Sauerstoffpflichtig'],
              stuetzt: [{ nr: '4.5.4', ab: 3 }] },
            { id: 'tremor', titel: 'Tremor', seiten: true,
              skala: ['feinschlägig', 'grobschlägig'],
              zusatzAuswahl: { titel: 'Auftreten', skala: ['bei Belastung', 'in Ruhe', 'bei Belastung und in Ruhe'] },
              stuetzt: [{ nr: '4.4.7', ab: 1 }, { nr: '4.4.5', ab: 1 }] }
        ]
    }
];
