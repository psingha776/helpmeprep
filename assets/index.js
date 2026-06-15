/* ============================================================
   index.js v2.0 — home-page widgets
   v2 adds: KPI count-up, dynamic CTA computed from progress,
   notes-count summary, page-load IntersectionObserver for section labels.
   Existing widget functions (renderHeatmap, renderCalibration,
   renderNotes, startQuickQuiz et al.) preserved.
   ============================================================ */
'use strict';

function ie(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ── PROGRESS AGGREGATION ── */
function aggregateProgress(){
  const studyDays = (typeof TOTAL_DAYS!=='undefined') ? TOTAL_DAYS - 1 : 0;
  let answered=0, correct=0, total=0;
  const perDay={};
  for(let day=1; day<=studyDays; day++){
    const k=`hmp_quiz_day${day}`;const raw=localStorage.getItem(k);
    let dDone=0, dTotal=0;
    if(raw){
      try{
        const arr=JSON.parse(raw);
        if(Array.isArray(arr)){
          dTotal=arr.length;
          arr.forEach(e=>{ if(!e)return; total++; if(e.answered){answered++;dDone++;if(e.ok)correct++;} });
        }
      }catch{}
    }
    perDay[day] = { done: dDone, total: dTotal };
  }
  const completePct = total ? Math.round((answered/total)*100) : 0;
  const accuracyPct = answered ? Math.round((correct/answered)*100) : null;
  /* find current day = first day with progress<100% (or day 1 if nothing started) */
  let current = 1;
  for(let day=1; day<=studyDays; day++){
    if(!perDay[day] || perDay[day].done < perDay[day].total) { current = day; break; }
    if(day === studyDays && perDay[day].done >= perDay[day].total) current = studyDays + 1; /* all done → mock */
  }
  return { answered, correct, total, completePct, accuracyPct, current, perDay };
}

/* ── KPI COUNT-UP ── */
function countUp(el, target, suffix){
  if(!el) return;
  if(target===null || target===undefined){ el.textContent='—'; return; }
  const dur=620, t0=performance.now(), from=0;
  function frame(now){
    const t=Math.min((now-t0)/dur, 1);
    const eased = 1 - Math.pow(1-t, 3);
    const v=Math.round(from + (target-from)*eased);
    el.textContent = v + (suffix||'');
    if(t<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function paintKPIs(){
  const p = aggregateProgress();
  const streak = parseInt(localStorage.getItem('hmp_streak')||'0', 10);

  /* Complete */
  const completeEl = document.querySelector('.kpi:nth-child(1) .num');
  countUp(completeEl, p.completePct);
  const completeSub = document.getElementById('kpiCompleteSub');
  if(completeSub) completeSub.textContent = `${p.answered} of ${p.total||(typeof TOTAL_QUIZ_Q!=='undefined'?TOTAL_QUIZ_Q:'?')} Q`;

  /* Accuracy */
  const accEl = document.querySelector('.kpi:nth-child(2) .num');
  const accUnit = document.querySelector('.kpi:nth-child(2) .unit');
  if(p.accuracyPct === null){
    if(accEl) accEl.textContent = '—';
    if(accUnit) accUnit.textContent = '';
  }else{
    countUp(accEl, p.accuracyPct);
    if(accUnit) accUnit.textContent = '%';
  }
  const accSub = document.getElementById('kpiAccSub');
  if(accSub) accSub.textContent = p.answered ? `${p.correct} of ${p.answered}` : 'no answers yet';

  /* Streak */
  const streakEl = document.querySelector('.kpi:nth-child(3) .num');
  const streakUnit = document.querySelector('.kpi:nth-child(3) .unit');
  countUp(streakEl, streak);
  if(streakUnit) streakUnit.textContent = streak===1 ? 'd' : 'd';
  const streakSub = document.getElementById('kpiStreakSub');
  if(streakSub) streakSub.textContent = streak===0 ? 'start today' : (streak===1 ? 'keep going' : 'on a roll');
}

/* ── HERO CTA + KICKER computed from current day ── */
function paintHero(){
  const p = aggregateProgress();
  const studyDays = (typeof TOTAL_DAYS!=='undefined') ? TOTAL_DAYS - 1 : 0;
  const kicker = document.getElementById('kickerText');
  const ctaText = document.getElementById('primaryCtaText');
  const ctaLink = document.getElementById('primaryCta');
  const ctaDetail = document.getElementById('ctaDetail');

  if(p.answered === 0){
    if(kicker) kicker.textContent = 'Day 01 · Ready to start';
    if(ctaText) ctaText.textContent = 'Start Day 01';
    if(ctaLink) ctaLink.href = 'day1.html';
    if(ctaDetail) ctaDetail.textContent = '~2 hr reading + 30 Q quiz';
    return;
  }
  if(p.current > studyDays){
    if(kicker) kicker.textContent = 'All study days complete · ready for mocks';
    if(ctaText) ctaText.textContent = `Continue to Day ${String(studyDays+1).padStart(2,'0')}`;
    if(ctaLink) ctaLink.href = `day${studyDays+1}.html`;
    if(ctaDetail) ctaDetail.textContent = '2 timed mocks · final stretch';
    return;
  }
  const dn = String(p.current).padStart(2,'0');
  if(kicker) kicker.textContent = `Day ${dn} · in progress`;
  if(ctaText) ctaText.textContent = `Continue Day ${dn}`;
  if(ctaLink) ctaLink.href = `day${p.current}.html`;
  const dInfo = p.perDay[p.current] || {done:0,total:30};
  if(ctaDetail) ctaDetail.textContent = `${dInfo.done} of ${dInfo.total} questions answered`;
}

/* ── notes count summary ── */
function paintNotesCount(){
  const el = document.getElementById('notesCount');
  if(!el) return;
  const n = Object.keys(localStorage).filter(k=>k.startsWith('hmp_note_')&&localStorage.getItem(k)).length;
  el.textContent = n===0 ? 'no notes yet' : (n===1 ? '1 note' : `${n} notes`);
}

/* ── HEATMAP ── (unchanged behaviour) */
function renderHeatmap(){
  const host=document.getElementById('heatmapHost');if(!host)return;
  const studyDays=TOTAL_DAYS-1;
  if(!HEATMAP_DOMAINS||!HEATMAP_DOMAINS.length){host.innerHTML='<p style="color:var(--mu);font-size:13px">No domain data available for this hub.</p>';return;}
  const cells={};
  HEATMAP_DOMAINS.forEach(d=>{cells[d]={};for(let day=1;day<=studyDays;day++)cells[d][day]={c:0,t:0};});
  for(let day=1;day<=studyDays;day++){
    const k=`hmp_quiz_day${day}`;const raw=localStorage.getItem(k);if(!raw)continue;
    let qd;try{qd=JSON.parse(raw);}catch{continue;}
    const bank=(typeof QUESTION_BANK!=='undefined'&&QUESTION_BANK[`day${day}`])||[];
    qd.forEach((entry,qi)=>{
      const q=bank[entry.i!==undefined?entry.i:qi];if(!q||!q.domain)return;
      if(!cells[q.domain])return;
      if(entry.answered){cells[q.domain][day].t++;if(entry.ok)cells[q.domain][day].c++;}
    });
  }
  const head=`<th class="hm-domain-h">Domain</th>${Array.from({length:studyDays},(_,i)=>`<th class="hm-col-h">D${String(i+1).padStart(2,'0')}</th>`).join('')}`;
  const rows=HEATMAP_DOMAINS.map(d=>{
    const tds=Array.from({length:studyDays},(_,i)=>{const c=cells[d][i+1];if(!c||c.t===0)return `<td class="hm-cell off" title="${ie(d)} · Day ${i+1} · no data">·</td>`;const pct=c.c/c.t;const lvl=pct>=0.71?'on':pct>=0.41?'mid':'lo';return `<td class="hm-cell ${lvl}" title="${ie(d)} · Day ${i+1} · ${c.c}/${c.t} (${Math.round(pct*100)}%)">${Math.round(pct*100)}</td>`;}).join('');
    return `<tr><td class="hm-domain">${ie(d)}</td>${tds}</tr>`;
  }).join('');
  host.innerHTML=`<div class="hm-wrap"><table class="hm-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ── CONFIDENCE CALIBRATION ── (unchanged) */
function renderCalibration(){
  const host=document.getElementById('calibrationHost');if(!host)return;
  const buckets={guessed:{c:0,t:0},sure:{c:0,t:0},certain:{c:0,t:0}};
  Object.keys(localStorage).filter(k=>k.startsWith('hmp_quiz_day')).forEach(k=>{
    let arr;try{arr=JSON.parse(localStorage.getItem(k));}catch{return;}
    if(!Array.isArray(arr))return;
    arr.forEach(d=>{if(d.type==='mcq'&&d.answered&&d.conf&&buckets[d.conf]){buckets[d.conf].t++;if(d.ok)buckets[d.conf].c++;}});
  });
  const total=buckets.guessed.t+buckets.sure.t+buckets.certain.t;
  if(total===0){host.innerHTML='<p style="color:var(--mu);font-size:13px">Complete some quizzes to see your calibration.</p>';return;}
  const fmt=(b,label,expected)=>{const acc=b.t?b.c/b.t:0;const diff=acc-expected;const flag=Math.abs(diff)>=0.20&&b.t>=5;return `<div class="cal-row"><div class="cal-label">${label}</div><div class="cal-bar"><div class="cal-fill" style="width:${Math.round(acc*100)}%"></div></div><div class="cal-stat">${b.t?Math.round(acc*100)+'%':'—'} <span style="color:var(--mu);font-weight:400">(${b.c}/${b.t})</span> ${flag?'<span class="cal-warn" title="Significantly miscalibrated">!</span>':''}</div></div>`;};
  host.innerHTML=fmt(buckets.guessed,'Guessed',0.35)+fmt(buckets.sure,'Sure',0.70)+fmt(buckets.certain,'Certain',0.92)+`<p style="font-size:11.5px;color:var(--mu);margin-top:14px;font-family:'JetBrains Mono',monospace;letter-spacing:0.02em">Healthy targets · Guessed ≈ 35% · Sure ≈ 70% · Certain ≈ 92%</p>`;
}

/* ── NOTES DASHBOARD ── (unchanged) */
function renderNotes(){
  const host=document.getElementById('notesHost');if(!host)return;
  const byDay={};
  Object.keys(localStorage).forEach(k=>{const m=k.match(/^hmp_note_(\d+)_(.+)$/);if(!m)return;const day=+m[1],slug=m[2];const txt=localStorage.getItem(k);if(!txt||!txt.trim())return;(byDay[day]=byDay[day]||[]).push({slug,txt});});
  const days=Object.keys(byDay).map(Number).sort((a,b)=>a-b);
  if(!days.length){host.innerHTML='<p style="color:var(--mu);font-size:13px">No notes yet. Click <em style="font-family:\'Newsreader\',serif">+ note</em> beside any heading on a day page.</p>';return;}
  host.innerHTML=days.map(day=>{const items=byDay[day].map(n=>`<div class="note-item"><div class="note-anchor"><a href="day${day}.html#${ie(n.slug)}">${ie(n.slug.replace(/-/g,' '))}</a></div><div class="note-body">${ie(n.txt)}</div></div>`).join('');return `<div class="notes-day"><div class="notes-day-h">Day ${String(day).padStart(2,'0')}</div><div>${items}</div></div>`;}).join('');
}

/* ── QUICK QUIZ ── (unchanged) */
let _qqState={qs:[],idx:0,correct:0};
function startQuickQuiz(){
  if(typeof QUESTION_BANK==='undefined'){alert('Question bank not loaded yet — visit at least one day first.');return;}
  const pool=[];Object.keys(QUESTION_BANK).forEach(day=>{QUESTION_BANK[day].forEach(q=>{if(!q.type||q.type==='mcq')pool.push({...q,_day:day});});});
  if(pool.length<5){alert('Need at least 5 MCQs across all days to run a quick quiz.');return;}
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  /* shuffle each question's choices and remap correct index */
  const qs=pool.slice(0,5).map(q=>{
    const ord=q.choices.map((_,i)=>i);for(let i=ord.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]];}
    return {...q,choices:ord.map(i=>q.choices[i]),correct:ord.indexOf(q.correct)};
  });
  _qqState={qs,idx:0,correct:0,picks:[]};
  document.getElementById('quickQuizModal').style.display='flex';
  renderQuickQuiz();
}
function renderQuickQuiz(){
  const body=document.getElementById('quickQuizBody');
  if(_qqState.idx>=_qqState.qs.length){body.innerHTML=`<h2 style="margin-top:0;font-size:22px;font-weight:600;letter-spacing:-0.02em">Quick quiz complete</h2><p style="font-size:14.5px;color:var(--bo)">Score: <strong>${_qqState.correct} / ${_qqState.qs.length}</strong></p><div style="display:flex;gap:14px;margin-top:18px"><button class="btn" onclick="startQuickQuiz()">Another 5 <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px"><path d="M3 8h10M9 4l4 4-4 4"/></svg></button><button class="btn-secondary" onclick="closeQuickQuiz()">Close</button></div>`;return;}
  const q=_qqState.qs[_qqState.idx];
  const picked=_qqState.picks[_qqState.idx];
  const choices=q.choices.map((c,ci)=>{let cls='choice';if(picked!==undefined){if(ci===q.correct)cls+=' reveal-correct';if(ci===picked&&ci!==q.correct)cls+=' selected wrong';}return `<button class="${cls}" ${picked!==undefined?'disabled':''} onclick="pickQuick(${ci})"><span class="choice-letter">${String.fromCharCode(65+ci)}</span><span>${ie(c)}</span></button>`;}).join('');
  const expl=picked!==undefined?`<div class="explanation show ${picked===q.correct?'':'wrong'}"><div class="explanation-title">${picked===q.correct?'Correct':'Not quite'}</div><div class="explanation-text">${ie(q.explanation||'')}</div></div><button class="btn" style="margin-top:18px" onclick="nextQuick()">Next <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px"><path d="M3 8h10M9 4l4 4-4 4"/></svg></button>`:'';
  body.innerHTML=`<div class="question" style="border-bottom:0;padding:0;grid-template-columns:1fr"><div class="question-num">Quick quiz · ${_qqState.idx+1} of ${_qqState.qs.length}${q.domain?` · <span class="q-domain" style="display:inline">${ie(q.domain)}</span>`:''}</div><div class="question-text">${ie(q.text)}</div><div class="choices">${choices}</div>${expl}</div>`;
}
function pickQuick(ci){const q=_qqState.qs[_qqState.idx];if(_qqState.picks[_qqState.idx]!==undefined)return;_qqState.picks[_qqState.idx]=ci;if(ci===q.correct)_qqState.correct++;renderQuickQuiz();}
function nextQuick(){_qqState.idx++;renderQuickQuiz();}
function closeQuickQuiz(){document.getElementById('quickQuizModal').style.display='none';}

/* ── section-label track-in on scroll ── */
function armSectionLabels(){
  if(!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('tracking');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.sec-label').forEach(el => io.observe(el));
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  paintHero();
  paintKPIs();
  paintNotesCount();
  renderHeatmap();
  renderCalibration();
  renderNotes();
  armSectionLabels();
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      paintHero(); paintKPIs(); paintNotesCount();
      renderHeatmap(); renderCalibration(); renderNotes();
    }
  });
});
