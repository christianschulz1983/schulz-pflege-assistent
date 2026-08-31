// Punkte und Pflegegrad nach den Begutachtungs-Richtlinien.

// Einzelpunkte eines Kriteriums. Kriterien mit eigener Punkteskala (val) werden darüber
// abgebildet. Liegt ein unzulässiger Stufenindex vor, wird 0 gewertet – früher entstand
// hier stillschweigend NaN, wodurch die gesamte Punktzahl und der Pflegegrad ausfielen.
function nbaEinzelpunkte(st, id) {
    const item = ITEMS.find(it => it.id === id);
    const v = st.values[id];
    if (typeof v !== 'number' || !item) return 0;
    if (!item.val) return Number.isFinite(v) ? v : 0;
    const p = item.val[v];
    return Number.isFinite(p) ? p : 0;
}

/* MODUL 5 WIRD JE GRUPPE GEWERTET, NICHT JE KRITERIUM.
   Die Häufigkeiten einer Gruppe werden zuerst zusammengezählt, dann bekommt die GRUPPE
   EINEN Punktwert. Deshalb kann sich ein einzelnes Kriterium ändern, ohne dass die
   Punkte des Moduls sich bewegen – und umgekehrt kann eine kleine Änderung die ganze
   Gruppe kippen. Diese Funktion ist die einzige Stelle, an der das gerechnet wird.

   Gruppe A (4.5.1–4.5.7)   Maßnahmen, Durchschnitt pro Tag
   Gruppe B (4.5.8–4.5.11)  Maßnahmen, Durchschnitt pro Tag
   Gruppe C (4.5.12–4.5.15) Besuche, umgerechnet auf den Monat (1x pro Woche = 4,3)
   Gruppe D (4.5.16)        Diät – einziges Kriterium mit eigener Stufe */
const M5_BEREICHE = { A: '4.5.1–4.5.7', B: '4.5.8–4.5.11', C: '4.5.12–4.5.15', D: '4.5.16' };

function m5Gruppen(st) {
    let sumA = 0, sumB = 0, sumC = 0, pD = 0;
    ITEMS.filter(i => i.m === 5).forEach(i => {
        if (i.group === 'D') { pD += nbaEinzelpunkte(st, i.id); return; }
        const d = st.values[i.id] || { count: 0, period: 'W' };
        let daily = Number(d.count);
        if (d.period === 'W') daily /= 7;
        if (d.period === 'M') daily /= 30;
        if (i.group === 'A') sumA += daily;
        else if (i.group === 'B') sumB += daily;
        else if (i.group === 'C') sumC += (Number(d.count) * (i.factor[d.period] || 0));
    });
    sumA = Math.round(sumA * 10000) / 10000;
    sumB = Math.round(sumB * 10000) / 10000;
    const pA = sumA > 8 ? 3 : sumA > 3 ? 2 : sumA >= 1 ? 1 : 0;
    const pB = sumB >= 3 ? 3 : sumB >= 1 ? 2 : sumB >= 0.1429 ? 1 : 0;
    const pC = sumC >= 60 ? 6 : sumC >= 12.9 ? 3 : sumC >= 8.6 ? 2 : sumC >= 4.3 ? 1 : 0;
    return { A: { summe: sumA, pkt: pA }, B: { summe: sumB, pkt: pB },
             C: { summe: sumC, pkt: pC }, D: { summe: pD, pkt: pD },
             gesamt: pA + pB + pC + pD };
}

/* UMRECHNUNG: SUMME DER EINZELPUNKTE -> GEWICHTETE PUNKTE.
   Die Tabellen der Begutachtungs-Richtlinien, je Modul absteigend nach Untergrenze.
   Sie stehen hier an EINER Stelle, weil eine falsche Grenze sonst unbemerkt bleibt:
   In Modul 1 stand die Grenze zu 7,5 Punkten lange bei 7 statt bei 6. Wer genau
   6 Einzelpunkte hatte, bekam 5,00 statt 7,50 gewichtete Punkte – zweieinhalb Punkte
   zu wenig, was einen Pflegegrad kosten kann.

   Modul 1  0–1 → 0    2–3 → 2,5    4–5 → 5      6–9  → 7,5     10–15 → 10
   Modul 2  0–1 → 0    2–5 → 3,75   6–10 → 7,5   11–16 → 11,25  17–33 → 15
   Modul 3  0   → 0    1–2 → 3,75   3–4 → 7,5    5–6  → 11,25   7–65  → 15
   Modul 4  0–2 → 0    3–7 → 10     8–18 → 20    19–36 → 30     37–54 → 40
   Modul 5  0   → 0    1   → 5      2–3 → 10     4–5  → 15      6–15  → 20
   Modul 6  0   → 0    1–3 → 3,75   4–6 → 7,5    7–11 → 11,25   12–18 → 15
   Der Selbsttest prüft jede einzelne Grenze gegen diese Tabelle. */
const MODUL_SPANNEN = {
    1: [{ ab: 10, bis: 15, gew: 10 },   { ab: 6, bis: 9,  gew: 7.5 },
        { ab: 4,  bis: 5,  gew: 5 },    { ab: 2, bis: 3,  gew: 2.5 },  { ab: 0, bis: 1, gew: 0 }],
    2: [{ ab: 17, bis: 33, gew: 15 },   { ab: 11, bis: 16, gew: 11.25 },
        { ab: 6,  bis: 10, gew: 7.5 },  { ab: 2,  bis: 5,  gew: 3.75 }, { ab: 0, bis: 1, gew: 0 }],
    3: [{ ab: 7,  bis: 65, gew: 15 },   { ab: 5,  bis: 6,  gew: 11.25 },
        { ab: 3,  bis: 4,  gew: 7.5 },  { ab: 1,  bis: 2,  gew: 3.75 }, { ab: 0, bis: 0, gew: 0 }],
    4: [{ ab: 37, bis: 54, gew: 40 },   { ab: 19, bis: 36, gew: 30 },
        { ab: 8,  bis: 18, gew: 20 },   { ab: 3,  bis: 7,  gew: 10 },   { ab: 0, bis: 2, gew: 0 }],
    5: [{ ab: 6,  bis: 15, gew: 20 },   { ab: 4,  bis: 5,  gew: 15 },
        { ab: 2,  bis: 3,  gew: 10 },   { ab: 1,  bis: 1,  gew: 5 },    { ab: 0, bis: 0, gew: 0 }],
    6: [{ ab: 12, bis: 18, gew: 15 },   { ab: 7,  bis: 11, gew: 11.25 },
        { ab: 4,  bis: 6,  gew: 7.5 },  { ab: 1,  bis: 3,  gew: 3.75 }, { ab: 0, bis: 0, gew: 0 }]
};

function spanneZu(modul, einzel) {
    return (MODUL_SPANNEN[modul] || []).find(s => einzel >= s.ab) || null;
}
function gewichtetePunkte(modul, einzel) {
    const s = spanneZu(modul, einzel);
    return s ? s.gew : 0;
}
// Beschreibt die Spanne im Klartext: „2 bis 3 Einzelpunkte", „6 und mehr Einzelpunkte".
function spannenText(modul, einzel) {
    const s = spanneZu(modul, einzel);
    if (!s) return '';
    const hoechst = (MODUL_SPANNEN[modul] || [])[0];
    if (s === hoechst) return s.ab + ' und mehr Einzelpunkte';
    if (s.bis === s.ab) return s.ab === 0 ? 'kein Einzelpunkt' : s.ab + ' Einzelpunkt';
    return s.ab + ' bis ' + s.bis + ' Einzelpunkte';
}
// Modul 5 ist der Fall, in dem die breiten Spannen im Schriftstück erklärt werden müssen.
function m5Gewichtet(einzel) { return gewichtetePunkte(5, einzel); }
function m5SpannenText(einzel) { return spannenText(5, einzel); }

// pref ist entweder eine Spalte ('orig' | 'zweit' | 'own') oder – für Was-wäre-wenn-
// Rechnungen – unmittelbar ein Bewertungsstand. Wird ein Stand übergeben, wird immer
// aus den Kriterien gerechnet; eine Zusammenfassung aus dem Gutachten gilt dann nicht.
function calculateInternal(pref) {
    const eigenerStand = (pref && typeof pref === 'object');
    const st = eigenerStand ? pref : zustandZu(pref);

    // Liegt eine Zusammenfassung aus dem Gutachten vor, gilt sie – das betrifft
    // Vorgutachten und Anhörungsgutachten gleichermaßen, nie die eigene Einschätzung.
    if (!eigenerStand && (pref === 'orig' || pref === 'zweit') && st.extracted) {
        return {
            raws: st.extracted.raws,
            weights: st.extracted.weights,
            total: st.extracted.total,
            pg: st.extracted.pg
        };
    }

    const getV = (id) => nbaEinzelpunkte(st, id);
    let s1=ITEMS.filter(i=>i.m===1).reduce((s,i)=>s+(Number(st.values[i.id])||0),0);
    let s2=ITEMS.filter(i=>i.m===2).reduce((s,i)=>s+(Number(st.values[i.id])||0),0);
    let s3=ITEMS.filter(i=>i.m===3).reduce((s,i)=>s+getV(i.id),0);
    let s4=ITEMS.filter(i=>i.m===4).reduce((s,i)=>s+getV(i.id),0);
    let s6=ITEMS.filter(i=>i.m===6).reduce((s,i)=>s+(Number(st.values[i.id])||0),0);
    // Modul 5 nach BRi: je Gruppe summieren, dann der GRUPPE EINEN Punktwert zuordnen.
    // Gerechnet wird in m5Gruppen() – der einzigen Stelle für diese Logik.
    const ptsM5 = m5Gruppen(st).gesamt;
    // Alle sechs Umrechnungen aus MODUL_SPANNEN – nicht mehr von Hand ausgeschrieben.
    let w1=gewichtetePunkte(1,s1);
    let p2=gewichtetePunkte(2,s2);
    let p3=gewichtetePunkte(3,s3);
    let w4=gewichtetePunkte(4,s4);
    let w5=gewichtetePunkte(5,ptsM5);
    let w6=gewichtetePunkte(6,s6);
    let wm23=Math.max(p2,p3);
    let total=st.special==1?100:(w1+wm23+w4+w5+w6);
    let pg=total>=90?5:total>=70?4:total>=47.5?3:total>=27?2:total>=12.5?1:0;
    return {raws:[s1,s2,s3,s4,ptsM5,s6], weights:[w1,p2,p3,w4,w5,w6], total, pg};
}

function calculate(pref) {
    const st = zustandZu(pref);
    const res = calculateInternal(pref);
    const {raws:[s1,s2,s3,s4,ptsM5,s6], weights:[w1,p2,p3,w4,w5,w6], total, pg} = res;

    const getV = (id) => nbaEinzelpunkte(st, id);
    // Modul 5 nach BRi: Häufigkeiten je Gruppe summieren -> EIN Punktwert je Gruppe.
    // Anzeige: der Gruppen-Punktwert erscheint NUR auf der untersten Zeile der Gruppe
    // (wie die "Summe"-Zeile im BRi), die übrigen Zeilen zeigen "–" – damit nicht der
    // Eindruck einer Mehrfachzählung entsteht.
    const grp5 = m5Gruppen(st);
    ITEMS.filter(i => i.m === 5 && i.group === 'D').forEach(i => {
        const el = document.getElementById('pts-'+pref+'-'+i.id); if (el) el.innerText = getV(i.id);
    });
    const showGroupPts = (grp, val, range) => {
        const ids = ITEMS.filter(i=>i.m===5 && i.group===grp).map(i=>i.id);
        ids.forEach((id, k) => {
            const el = document.getElementById('pts-'+pref+'-'+id);
            if(!el) return;
            if(k === ids.length-1){ el.innerText = val; el.title = 'Gruppen-Einzelpunkte '+range+' (gemeinsam gewertet)'; }
            else { el.innerText = '–'; el.title = 'Punkte werden je Gruppe '+range+' gemeinsam vergeben (Wert in der untersten Zeile der Gruppe)'; }
        });
    };
    showGroupPts('A', grp5.A.pkt, M5_BEREICHE.A);
    showGroupPts('B', grp5.B.pkt, M5_BEREICHE.B);
    showGroupPts('C', grp5.C.pkt, M5_BEREICHE.C);
    ITEMS.filter(i=>i.m&&i.m!==5).forEach(i=>{const el=document.getElementById('pts-'+pref+'-'+i.id);if(el)el.innerText=getV(i.id);});
    if(pref==='own'){ ITEMS.forEach(it=>applyVorgHighlight(it.id)); }

    const setEl = (id,v) => { const el=document.getElementById(id); if(el)el.innerText=v; };
    setEl('mod-w-'+pref+'-1',w1.toFixed(2)); setEl('mod-r-'+pref+'-1',s1);
    setEl('mod-w-'+pref+'-2',p2.toFixed(2)); setEl('mod-r-'+pref+'-2',s2);
    setEl('mod-w-'+pref+'-3',p3.toFixed(2)); setEl('mod-r-'+pref+'-3',s3);
    setEl('mod-w-'+pref+'-4',w4.toFixed(2)); setEl('mod-r-'+pref+'-4',s4);
    setEl('mod-w-'+pref+'-5',w5.toFixed(2)); setEl('mod-r-'+pref+'-5',ptsM5);
    setEl('mod-w-'+pref+'-6',w6.toFixed(2)); setEl('mod-r-'+pref+'-6',s6);
    setEl('total-w-'+pref, total.toFixed(2).replace('.',','));
    setEl('pg-title-'+pref, pg>0?'PFLEGEGRAD '+pg:'KEIN PFLEGEGRAD');

    // Die nächste erreichbare Stufe kommt aus derselben Tabelle wie die Umrechnung –
    // vorher stand sie ein zweites Mal von Hand da und wich in Modul 1 und 3 ab.
    const tiers = {};
    [1,2,3,4,5,6].forEach(m => {
        tiers[m] = MODUL_SPANNEN[m].map(s => s.ab).filter(a => a > 0).sort((a,b) => a-b);
    });
    const getGap=(mod,sum)=>{
        const next=tiers[mod].find(t=>t>sum);
        if(!next)return{t:'Max ✓',cls:'gap-green'};
        const diff=next-sum;
        const prev=[...tiers[mod]].reverse().find(t=>t<=sum)||0;
        const pct=Math.round((diff/(next-prev))*100);
        return{t:`-${diff} (${pct}%)`,cls:pct<50?'gap-green':'gap-red'};
    };

    const grid=document.getElementById('res-grid-'+pref);
    if(grid){
        const mNames=['Mobilität','Kognition','Verhalten','Selbstversorgung','Med. Anf.','Alltagsgest.'];
        if(pref==='own'){
            const rO=calculateInternal('orig');
            grid.innerHTML=[1,2,3,4,5,6].map(m=>{
                const rw=[w1,p2,p3,w4,w5,w6][m-1];
                const rv=[s1,s2,s3,s4,ptsM5,s6][m-1];
                const isWin=(m===2&&p2>=p3)||(m===3&&p3>p2);
                const gap=getGap(m,rv);
                return `<tr class="${isWin?'winner-row':''}">
                    <td>${m}. ${mNames[m-1]}</td>
                    <td class="center mono">${rw.toFixed(2)}</td>
                    <td class="center mono">${rv}</td>
                    <td class="center" style="color:var(--accent);opacity:0.7;font-family:var(--font-mono);font-weight:700">${rO.weights[m-1].toFixed(2)}</td>
                    <td class="center" style="color:var(--accent);opacity:0.7;font-family:var(--font-mono)">${rO.raws[m-1]}</td>
                    <td class="center"><span class="gap-badge ${gap.cls}">${gap.t}</span></td>
                </tr>`;
            }).join('');
            setEl('total-w-orig-ref', rO.total.toFixed(2).replace('.',','));
            setEl('pg-title-orig-ref', rO.pg>0?'VORGUTACHTEN: PFLEGEGRAD '+rO.pg:'VORGUTACHTEN: KEIN PFLEGEGRAD');
            updateLiveCompRows();
        } else {
            grid.innerHTML=[1,2,3,4,5,6].map(m=>{
                const rw=[w1,p2,p3,w4,w5,w6][m-1];
                const rv=[s1,s2,s3,s4,ptsM5,s6][m-1];
                const gap=getGap(m,rv);
                return `<tr>
                    <td>${m}. ${mNames[m-1]}</td>
                    <td class="center mono">${rw.toFixed(2)}</td>
                    <td class="center mono">${rv}</td>
                    <td class="center"><span class="gap-badge ${gap.cls}">${gap.t}</span></td>
                </tr>`;
            }).join('');
        }
    }

    const nextT=[12.5,27,47.5,70,90].find(t=>t>total);
    const footEl=document.getElementById('gap-footer-'+pref);
    if(footEl){
        footEl.style.display='block';
        if(nextT){
            footEl.className='gap-footer danger';
            const pgNext=[1,2,3,4,5][[12.5,27,47.5,70,90].indexOf(nextT)];
            footEl.innerText=`Noch ${(nextT-total).toFixed(2).replace('.',',')} Pkt. bis Pflegegrad ${pgNext}`;
        } else {
            footEl.className='gap-footer success';
            footEl.innerText='✓ Maximaler Pflegegrad erreicht';
        }
    }
}

function updateLiveCompRows() {
    const rO=calculateInternal('orig');
    const rE=calculateInternal('own');
    for(let m=1;m<=6;m++){
        const ew=document.getElementById('mod-w-comp-'+m);
        const er=document.getElementById('mod-r-comp-'+m);
        if(ew)ew.innerText=rO.weights[m-1].toFixed(2);
        if(er)er.innerText=rO.raws[m-1];
        zeigeModulHinweis(m, rO, rE);
    }
}

/* Erklärt in der Ansicht, warum sich die gewichteten Punkte nicht bewegen, obwohl die
   Einzelpunkte sich geändert haben. Gemeldet wurde genau das: „Ich stelle fest, dass die
   Physiotherapie nicht zu werten ist, gleichzeitig ändern sich die Punkte im Modul 5
   nicht." Die Rechnung ist richtig – die Spannen der Richtlinien sind breit. Ohne diesen
   Satz sieht es wie ein Rechenfehler aus. */
function modulHinweisText(m, rO, rE) {
    const einzelO = rO.raws[m-1], einzelE = rE.raws[m-1];
    const gewO = rO.weights[m-1], gewE = rE.weights[m-1];
    if (einzelO === einzelE || gewO !== gewE) return '';
    const f2 = n => Number(n).toFixed(2).replace('.', ',');
    return 'Die Einzelpunkte ändern sich (' + einzelO + ' → ' + einzelE + '), die gewichteten '
         + 'Punkte bleiben bei ' + f2(gewE) + '. Beide Werte fallen nach den Richtlinien in '
         + 'dieselbe Spanne (' + spannenText(m, einzelE) + '). Das ist richtig gerechnet.';
}

function zeigeModulHinweis(m, rO, rE) {
    const zeile = document.getElementById('mod-hinweis-row-' + m);
    const zelle = document.getElementById('mod-hinweis-' + m);
    if (!zeile || !zelle) return;
    const txt = modulHinweisText(m, rO, rE);
    zelle.innerText = txt;
    zeile.style.display = txt ? '' : 'none';
}

