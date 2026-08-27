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

function calculateInternal(pref) {
    const st = zustandZu(pref);

    // Liegt eine Zusammenfassung aus dem Gutachten vor, gilt sie – das betrifft
    // Vorgutachten und Anhörungsgutachten gleichermaßen, nie die eigene Einschätzung.
    if ((pref === 'orig' || pref === 'zweit') && st.extracted) {
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
    // Modul 5 nach BRi: Häufigkeiten je Gruppe ZUERST aufsummieren und in einen
    // Durchschnitt pro Tag umrechnen, dann der GRUPPE EINEN Punktwert zuordnen
    // (nicht je Einzelkriterium). Gruppe A: 4.5.1–4.5.7, Gruppe B: 4.5.8–4.5.11.
    let ptsM5=0, sumA=0, sumB=0, sumC=0;
    ITEMS.filter(i=>i.m===5).forEach(i=>{
        if(i.group==='D'){ptsM5+=getV(i.id);return;}
        let d=st.values[i.id]||{count:0,period:'W'};
        let daily=Number(d.count); if(d.period==='W')daily/=7; if(d.period==='M')daily/=30;
        if(i.group==='A') sumA+=daily;
        else if(i.group==='B') sumB+=daily;
        else if(i.group==='C') sumC+=(Number(d.count)*(i.factor[d.period]||0));
    });
    sumA=Math.round(sumA*10000)/10000;
    sumB=Math.round(sumB*10000)/10000;
    let pA=sumA>8?3:sumA>3?2:sumA>=1?1:0;
    let pB=sumB>=3?3:sumB>=1?2:sumB>=0.1429?1:0;
    let pC=sumC>=60?6:sumC>=12.9?3:sumC>=8.6?2:sumC>=4.3?1:0;
    ptsM5+=pA+pB+pC;
    let w1=s1>=10?10:s1>=7?7.5:s1>=4?5:s1>=2?2.5:0;
    let p2=s2>=17?15:s2>=11?11.25:s2>=6?7.5:s2>=2?3.75:0;
    let p3=s3>=7?15:s3>=5?11.25:s3>=3?7.5:s3>=1?3.75:0;
    let w4=s4>=37?40:s4>=19?30:s4>=8?20:s4>=3?10:0;
    let w5=ptsM5>=6?20:ptsM5>=4?15:ptsM5>=2?10:ptsM5>=1?5:0;
    let w6=s6>=12?15:s6>=7?11.25:s6>=4?7.5:s6>=1?3.75:0;
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
    let sumA=0, sumB=0, sumC=0;
    ITEMS.filter(i=>i.m===5).forEach(i=>{
        if(i.group==='D'){const el=document.getElementById('pts-'+pref+'-'+i.id);if(el)el.innerText=getV(i.id);return;}
        let d=st.values[i.id]||{count:0,period:'W'};
        let daily=Number(d.count); if(d.period==='W')daily/=7; if(d.period==='M')daily/=30;
        if(i.group==='A') sumA+=daily;
        else if(i.group==='B') sumB+=daily;
        else if(i.group==='C') sumC+=(Number(d.count)*(i.factor[d.period]||0));
    });
    sumA=Math.round(sumA*10000)/10000;
    sumB=Math.round(sumB*10000)/10000;
    let pA=sumA>8?3:sumA>3?2:sumA>=1?1:0;
    let pB=sumB>=3?3:sumB>=1?2:sumB>=0.1429?1:0;
    let pC=sumC>=60?6:sumC>=12.9?3:sumC>=8.6?2:sumC>=4.3?1:0;
    const showGroupPts = (grp, val, range) => {
        const ids = ITEMS.filter(i=>i.m===5 && i.group===grp).map(i=>i.id);
        ids.forEach((id, k) => {
            const el = document.getElementById('pts-'+pref+'-'+id);
            if(!el) return;
            if(k === ids.length-1){ el.innerText = val; el.title = 'Gruppen-Einzelpunkte '+range+' (gemeinsam gewertet)'; }
            else { el.innerText = '–'; el.title = 'Punkte werden je Gruppe '+range+' gemeinsam vergeben (Wert in der untersten Zeile der Gruppe)'; }
        });
    };
    showGroupPts('A', pA, '4.5.1–4.5.7');
    showGroupPts('B', pB, '4.5.8–4.5.11');
    showGroupPts('C', pC, '4.5.12–4.5.15');
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

    const tiers={1:[2,4,7,10],2:[2,6,11,17],3:[2,6,11,17],4:[3,8,19,37],5:[1,2,4,6],6:[1,4,7,12]};
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
    for(let m=1;m<=6;m++){
        const ew=document.getElementById('mod-w-comp-'+m);
        const er=document.getElementById('mod-r-comp-'+m);
        if(ew)ew.innerText=rO.weights[m-1].toFixed(2);
        if(er)er.innerText=rO.raws[m-1];
    }
}

