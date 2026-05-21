/* ============================================================
   index.js — home-page widgets:
   · Domain heatmap (rows = domains, cols = study days)
   · Confidence calibration chart
   · Notes dashboard (grouped by day)
   · Quick-quiz modal (5 random Qs from all days' question banks)
   Reads: HEATMAP_DOMAINS, DOMAIN_WEIGHTS, TOTAL_DAYS, QUESTION_BANK
   ============================================================ */
'use strict';

function ie(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ── HEATMAP ── */
function renderHeatmap(){
  const host=document.getElementById('heatmapHost');if(!host)return;
  const studyDays=TOTAL_DAYS-1;
  if(!HEATMAP_DOMAINS||!HEATMAP_DOMAINS.length){host.innerHTML='<p style="color:var(--mu);font-size:0.85rem">No domain data available for this hub.</p>';return;}
  /* aggregate per-domain per-day from localStorage quiz keys */
  const cells={};
  HEATMAP_DOMAINS.forEach(d=>{cells[d]={};for(let day=1;day<=studyDays;day++)cells[d][day]={c:0,t:0};});
  for(let day=1;day<=studyDays;day++){
    const k=`hmp_quiz_day${day}`;const raw=localStorage.getItem(k);if(!raw)continue;
    let qd;try{qd=JSON.parse(raw);}catch{continue;}
    /* question bank lookup */
    const bank=(typeof QUESTION_BANK!=='undefined'&&QUESTION_BANK[`day${day}`])||[];
    qd.forEach((entry,qi)=>{
      const q=bank[entry.i!==undefined?entry.i:qi];if(!q||!q.domain)return;
      if(!cells[q.domain])return;
      if(entry.answered){cells[q.domain][day].t++;if(entry.ok)cells[q.domain][day].c++;}
    });
  }
  /* table render */
  const head=`<th class="hm-domain-h">Domain</th>${Array.from({length:studyDays},(_,i)=>`<th class="hm-col-h">D${i+1}</th>`).join('')}`;
  const rows=HEATMAP_DOMAINS.map(d=>{
    const tds=Array.from({length:studyDays},(_,i)=>{const c=cells[d][i+1];if(!c||c.t===0)return `<td class="hm-cell off" title="${ie(d)} · Day ${i+1} · no data">·</td>`;const pct=c.c/c.t;const lvl=pct>=0.71?'on':pct>=0.41?'mid':'lo';return `<td class="hm-cell ${lvl}" title="${ie(d)} · Day ${i+1} · ${c.c}/${c.t} (${Math.round(pct*100)}%)">${Math.round(pct*100)}</td>`;}).join('');
    return `<tr><td class="hm-domain">${ie(d)}</td>${tds}</tr>`;
  }).join('');
  host.innerHTML=`<div class="hm-wrap"><table class="hm-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div><p style="font-size:0.78rem;color:var(--mu);margin-top:8px">Cells fill as you complete each day. Hover any cell for exact score.</p>`;
}

/* ── CONFIDENCE CALIBRATION ── */
function renderCalibration(){
  const host=document.getElementById('calibrationHost');if(!host)return;
  const buckets={guessed:{c:0,t:0},sure:{c:0,t:0},certain:{c:0,t:0}};
  Object.keys(localStorage).filter(k=>k.startsWith('hmp_quiz_day')).forEach(k=>{
    let arr;try{arr=JSON.parse(localStorage.getItem(k));}catch{return;}
    if(!Array.isArray(arr))return;
    arr.forEach(d=>{if(d.type==='mcq'&&d.answered&&d.conf&&buckets[d.conf]){buckets[d.conf].t++;if(d.ok)buckets[d.conf].c++;}});
  });
  const total=buckets.guessed.t+buckets.sure.t+buckets.certain.t;
  if(total===0){host.innerHTML='<p style="color:var(--mu);font-size:0.85rem">Complete some quizzes to see your calibration.</p>';return;}
  const fmt=(b,label,expected)=>{const acc=b.t?b.c/b.t:0;const diff=acc-expected;const flag=Math.abs(diff)>=0.20&&b.t>=5;return `<div class="cal-row"><div class="cal-label">${label}</div><div class="cal-bar"><div class="cal-fill" style="width:${Math.round(acc*100)}%"></div></div><div class="cal-stat">${b.t?Math.round(acc*100)+'%':'—'} <span style="color:var(--mu);font-size:0.75rem">(${b.c}/${b.t})</span> ${flag?'<span class="cal-warn" title="Significantly miscalibrated">⚠️</span>':''}</div></div>`;};
  host.innerHTML=fmt(buckets.guessed,'Guessed',0.35)+fmt(buckets.sure,'Sure',0.70)+fmt(buckets.certain,'Certain',0.92)+`<p style="font-size:0.78rem;color:var(--mu);margin-top:10px">Healthy targets: Guessed ≈ 35% · Sure ≈ 70% · Certain ≈ 92%. ⚠️ flags a 20-point gap once you have 5+ answers in that bucket.</p>`;
}

/* ── NOTES DASHBOARD ── */
function renderNotes(){
  const host=document.getElementById('notesHost');if(!host)return;
  const byDay={};
  Object.keys(localStorage).forEach(k=>{const m=k.match(/^hmp_note_(\d+)_(.+)$/);if(!m)return;const day=+m[1],slug=m[2];const txt=localStorage.getItem(k);if(!txt||!txt.trim())return;(byDay[day]=byDay[day]||[]).push({slug,txt});});
  const days=Object.keys(byDay).map(Number).sort((a,b)=>a-b);
  if(!days.length){host.innerHTML='<p style="color:var(--mu);font-size:0.88rem">No notes yet. Click the <em>+ note</em> button beside any heading on a day page to leave yourself one.</p>';return;}
  host.innerHTML=days.map(day=>{const items=byDay[day].map(n=>`<div class="note-item"><div class="note-anchor">↳ <a href="day${day}.html#${ie(n.slug)}">${ie(n.slug.replace(/-/g,' '))}</a></div><div class="note-body">${ie(n.txt)}</div></div>`).join('');return `<div class="notes-day"><div class="notes-day-h">Day ${day}</div>${items}</div>`;}).join('');
}

/* ── QUICK QUIZ ── */
let _qqState={qs:[],idx:0,correct:0};
function startQuickQuiz(){
  if(typeof QUESTION_BANK==='undefined'){alert('Question bank not loaded yet — visit at least one day first.');return;}
  const pool=[];Object.keys(QUESTION_BANK).forEach(day=>{QUESTION_BANK[day].forEach(q=>{if(!q.type||q.type==='mcq')pool.push({...q,_day:day});});});
  if(pool.length<5){alert('Need at least 5 MCQs across all days to run a quick quiz.');return;}
  /* shuffle, pick 5 */
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  _qqState={qs:pool.slice(0,5),idx:0,correct:0,picks:[]};
  document.getElementById('quickQuizModal').style.display='flex';
  renderQuickQuiz();
}
function renderQuickQuiz(){
  const body=document.getElementById('quickQuizBody');
  if(_qqState.idx>=_qqState.qs.length){body.innerHTML=`<h2 style="margin-top:0">Quick quiz complete</h2><p>Score: <strong>${_qqState.correct} / ${_qqState.qs.length}</strong></p><div style="display:flex;gap:8px;margin-top:14px"><button class="btn" onclick="startQuickQuiz()">🎲 Another 5</button><button class="btn btn-secondary" onclick="closeQuickQuiz()">Close</button></div>`;return;}
  const q=_qqState.qs[_qqState.idx];
  const picked=_qqState.picks[_qqState.idx];
  const choices=q.choices.map((c,ci)=>{let cls='choice';if(picked!==undefined){if(ci===q.correct)cls+=' reveal-correct';if(ci===picked&&ci!==q.correct)cls+=' selected wrong';}return `<button class="${cls}" ${picked!==undefined?'disabled':''} onclick="pickQuick(${ci})"><span class="choice-letter">${String.fromCharCode(65+ci)}</span><span>${ie(c)}</span></button>`;}).join('');
  const expl=picked!==undefined?`<div class="explanation show ${picked===q.correct?'correct':'wrong'}"><div class="explanation-title">${picked===q.correct?'✓ Correct':'✗ Not quite'}</div><div class="explanation-text">${ie(q.explanation||'')}</div></div><button class="btn" style="margin-top:12px" onclick="nextQuick()">Next →</button>`:'';
  body.innerHTML=`<div class="question"><div class="question-num">Quick quiz · ${_qqState.idx+1} of ${_qqState.qs.length}${q.domain?` · <span class="q-domain">${ie(q.domain)}</span>`:''}${q._day?` · <span style="color:var(--mu);font-size:0.75rem">from ${ie(q._day)}</span>`:''}</div><div class="question-text">${ie(q.text)}</div><div class="choices">${choices}</div>${expl}</div>`;
}
function pickQuick(ci){const q=_qqState.qs[_qqState.idx];if(_qqState.picks[_qqState.idx]!==undefined)return;_qqState.picks[_qqState.idx]=ci;if(ci===q.correct)_qqState.correct++;renderQuickQuiz();}
function nextQuick(){_qqState.idx++;renderQuickQuiz();}
function closeQuickQuiz(){document.getElementById('quickQuizModal').style.display='none';}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  renderHeatmap();renderCalibration();renderNotes();
  /* refresh when user returns from a day page */
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderHeatmap();renderCalibration();renderNotes();}});
});
