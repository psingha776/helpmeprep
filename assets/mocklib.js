/* ============================================================
   mocklib.js v1.0 — Mock Test runtime (extracted from
   mock-template inline script in v1.3). Adds: mark-for-review,
   domain-weighted scoring, dedup runtime warning.
   Reads constants from the page: MOCK1, MOCK2, MOCK_MINUTES,
   MOCK_PASSMARK, DOMAIN_WEIGHTS (optional).
   ============================================================ */
'use strict';

function mEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

const mockState={
  1:{answers:{},flagged:{},started:false,submitted:false,timer:null,secondsLeft:0,correct:0},
  2:{answers:{},flagged:{},started:false,submitted:false,timer:null,secondsLeft:0,correct:0}
};

/* init secondsLeft once page has loaded the config */
function initMockSeconds(){mockState[1].secondsLeft=MOCK_MINUTES*60;mockState[2].secondsLeft=MOCK_MINUTES*60;}

const mockKey=n=>`hmp_mock_${n}`;
function persistMock(n){const s=mockState[n];try{localStorage.setItem(mockKey(n),JSON.stringify({answers:s.answers,flagged:s.flagged,secondsLeft:s.secondsLeft,started:s.started,submitted:s.submitted,correct:s.correct}));}catch{}}
function loadMockPersisted(n){try{const raw=localStorage.getItem(mockKey(n));if(raw){const d=JSON.parse(raw);Object.assign(mockState[n],d);if(!mockState[n].flagged)mockState[n].flagged={};return true;}}catch{}return false;}

const bodyEl=n=>document.getElementById(`mock${n}Body`);
const introEl=n=>document.getElementById(`mock${n}Intro`);
const qEl=n=>document.getElementById(`mock${n}Questions`);
const timerEl=n=>document.getElementById(`timer${n}`);
const resultsEl=n=>document.getElementById(`mock${n}Results`);
const flagPanelEl=n=>document.getElementById(`mock${n}FlagPanel`);
const questionsFor=n=>n===1?MOCK1:MOCK2;

function fmtTime(secs){return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
function tickTimer(n){const s=mockState[n];if(s.submitted)return;s.secondsLeft--;timerEl(n).textContent=fmtTime(s.secondsLeft);timerEl(n).classList.toggle('warn',s.secondsLeft<=600&&s.secondsLeft>300);timerEl(n).classList.toggle('danger',s.secondsLeft<=300);persistMock(n);if(s.secondsLeft<=0)submitMock(n);}

function startMock(n){const s=mockState[n];if(s.started)return;s.started=true;introEl(n).style.display='none';bodyEl(n).style.display='block';renderMockQuestions(n);bodyEl(n).scrollIntoView({behavior:'smooth',block:'start'});timerEl(n).textContent=fmtTime(s.secondsLeft);s.timer=setInterval(()=>tickTimer(n),1000);persistMock(n);updateFlagPanel(n);}

function renderMockQuestions(n){
  const qs=questionsFor(n);
  qEl(n).innerHTML=qs.map((q,qi)=>`
    <div class="question" id="mock${n}-q${qi}" data-mock="${n}" data-q="${qi}">
      <div class="question-num">
        Question ${qi+1} of ${qs.length}
        <button class="flag-btn" onclick="toggleFlag(${n},${qi})" title="Mark for review" aria-label="Flag for review">🚩</button>
      </div>
      <div class="question-text">${mEsc(q.text)}</div>
      <div class="choices">
        ${q.choices.map((c,ci)=>`<button class="choice" data-ci="${ci}" onclick="pickMock(${n},${qi},${ci})"><span class="choice-letter">${String.fromCharCode(65+ci)}</span><span>${mEsc(c)}</span></button>`).join('')}
      </div>
    </div>`).join('');
}

function toggleFlag(n,qi){
  const s=mockState[n];if(s.submitted)return;
  s.flagged[qi]=!s.flagged[qi];if(!s.flagged[qi])delete s.flagged[qi];
  const block=document.getElementById(`mock${n}-q${qi}`);
  block?.classList.toggle('flagged',!!s.flagged[qi]);
  block?.querySelector('.flag-btn')?.classList.toggle('on',!!s.flagged[qi]);
  persistMock(n);updateFlagPanel(n);
}

function updateFlagPanel(n){
  const panel=flagPanelEl(n);if(!panel)return;
  const s=mockState[n];
  const flags=Object.keys(s.flagged).map(Number).sort((a,b)=>a-b);
  if(!flags.length){panel.style.display='none';return;}
  panel.style.display='block';
  panel.innerHTML=`<div class="flag-panel-title">🚩 Flagged for review (${flags.length})</div>`+
    `<div class="flag-list">${flags.map(qi=>`<a href="#mock${n}-q${qi}" onclick="document.getElementById('mock${n}-q${qi}').scrollIntoView({behavior:'smooth',block:'center'});return false;">Q${qi+1}</a>`).join(' · ')}</div>`;
}

function restoreAnswers(n){
  const s=mockState[n];const qs=questionsFor(n);
  Object.entries(s.answers).forEach(([qi,ci])=>{const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);if(block)block.querySelectorAll('.choice').forEach((btn,i)=>btn.classList.toggle('selected',i===+ci));});
  Object.keys(s.flagged).forEach(qi=>{const block=document.getElementById(`mock${n}-q${qi}`);block?.classList.add('flagged');block?.querySelector('.flag-btn')?.classList.add('on');});
  if(s.submitted){
    qs.forEach((q,qi)=>{
      const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);if(!block)return;
      const picked=s.answers[qi];
      block.querySelectorAll('.choice').forEach((btn,i)=>{btn.disabled=true;btn.classList.remove('selected');if(i===q.correct)btn.classList.add('reveal-correct');if(picked!==undefined&&+picked===i&&+picked!==q.correct)btn.classList.add('selected','wrong');});
      if(!block.querySelector('.explanation')){const expl=document.createElement('div');expl.className='explanation show '+(+picked===q.correct?'correct':'wrong');expl.innerHTML=`<div class="explanation-title">${+picked===q.correct?'Correct':(picked===undefined?'Skipped':'Incorrect')}</div><details class="show-explanation"><summary>Show explanation</summary><div>${mEsc(q.explanation||'')}</div></details>`;block.appendChild(expl);}
    });
    renderMockScore(n);
    document.getElementById(`mock${n}SubmitBtn`)?.setAttribute('disabled','');
  }
  updateFlagPanel(n);
}

function pickMock(n,qi,ci){const s=mockState[n];if(s.submitted)return;s.answers[qi]=ci;persistMock(n);const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);block.querySelectorAll('.choice').forEach((btn,i)=>btn.classList.toggle('selected',i===ci));}

function submitMock(n){
  const s=mockState[n];if(s.submitted)return;
  /* if flagged items still unanswered, confirm */
  const qs=questionsFor(n);
  const unansweredFlags=Object.keys(s.flagged).filter(qi=>s.answers[qi]===undefined);
  if(unansweredFlags.length&&s.secondsLeft>5){
    if(!confirm(`You have ${unansweredFlags.length} flagged question(s) still unanswered (${unansweredFlags.map(q=>'Q'+(+q+1)).join(', ')}). Submit anyway?`))return;
  }
  s.submitted=true;clearInterval(s.timer);
  let correct=0;
  qs.forEach((q,qi)=>{if(+s.answers[qi]===q.correct)correct++;});
  s.correct=correct;persistMock(n);
  qs.forEach((q,qi)=>{
    const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);
    const picked=s.answers[qi];
    block.querySelectorAll('.choice').forEach((btn,i)=>{btn.disabled=true;btn.classList.remove('selected');if(i===q.correct)btn.classList.add('reveal-correct');if(picked!==undefined&&+picked===i&&+picked!==q.correct)btn.classList.add('selected','wrong');});
    const expl=document.createElement('div');expl.className='explanation show '+(+picked===q.correct?'correct':'wrong');expl.innerHTML=`<div class="explanation-title">${+picked===q.correct?'Correct':(picked===undefined?'Skipped':'Incorrect')}</div><details class="show-explanation"><summary>Show explanation</summary><div>${mEsc(q.explanation||'')}</div></details>`;
    block.appendChild(expl);
  });
  document.getElementById(`mock${n}SubmitBtn`)?.setAttribute('disabled','');
  renderMockScore(n);
  resultsEl(n).scrollIntoView({behavior:'smooth',block:'start'});
  checkBothDone();
}

/* ── DOMAIN-WEIGHTED SCORE ── */
function computeWeightedScore(n){
  if(typeof DOMAIN_WEIGHTS==='undefined'||!Object.keys(DOMAIN_WEIGHTS).length) return null;
  const s=mockState[n],qs=questionsFor(n);
  const byDom={};
  qs.forEach((q,qi)=>{const d=q.domain||'_unweighted';if(!byDom[d])byDom[d]={c:0,t:0};byDom[d].t++;if(+s.answers[qi]===q.correct)byDom[d].c++;});
  const totalWeight=Object.entries(DOMAIN_WEIGHTS).reduce((a,[d,w])=>a+(byDom[d]?w:0),0);
  if(totalWeight===0) return null;
  let weighted=0;
  Object.entries(DOMAIN_WEIGHTS).forEach(([d,w])=>{if(byDom[d]&&byDom[d].t>0)weighted+=(byDom[d].c/byDom[d].t)*w;});
  weighted=weighted/totalWeight;
  return {scaled:Math.round(weighted*1000),pct:weighted*100,byDom};
}

function renderMockScore(n){
  const s=mockState[n],qs=questionsFor(n);
  const pct=s.correct/qs.length;
  const passed=pct>=MOCK_PASSMARK;
  const timeUsed=MOCK_MINUTES*60-s.secondsLeft;
  const w=computeWeightedScore(n);
  const r=resultsEl(n);
  r.classList.add('show');
  let domBreakdown='';
  if(w){
    const rows=Object.entries(DOMAIN_WEIGHTS).map(([d,wt])=>{const stat=w.byDom[d];if(!stat||stat.t===0)return `<tr><td>${mEsc(d)}</td><td>—</td><td>${Math.round(wt*100)}%</td></tr>`;const acc=stat.c/stat.t;return `<tr><td>${mEsc(d)}</td><td>${stat.c}/${stat.t} (${Math.round(acc*100)}%)</td><td>${Math.round(wt*100)}%</td></tr>`;}).join('');
    domBreakdown=`<details class="dom-breakdown" open><summary>Domain breakdown</summary><table><thead><tr><th>Domain</th><th>Score</th><th>Weight</th></tr></thead><tbody>${rows}</tbody></table></details>`;
  }
  r.innerHTML=`
    <div class="score-display">
      <div class="score-num">${w?w.scaled:Math.round(pct*1000)}</div>
      <div class="score-label">${s.correct} / ${qs.length} correct (${Math.round(pct*100)}% raw${w?` · ${Math.round(w.pct)}% weighted`:''})</div>
      <div class="score-verdict ${passed?'pass':'fail'}">${passed?'✓ PASS':'✗ Below pass mark'}</div>
    </div>
    <p style="text-align:center;color:var(--mu);font-size:0.85rem">Time used: ${Math.floor(timeUsed/60)}m ${timeUsed%60}s · Pass mark: ${Math.round(MOCK_PASSMARK*100)}%</p>
    ${domBreakdown}`;
}

/* ── COMPLETION CANVAS ── */
function checkBothDone(){if(!mockState[1].submitted||!mockState[2].submitted)return;if(sessionStorage.getItem('hmp_mock_canvas_shown'))return;sessionStorage.setItem('hmp_mock_canvas_shown','1');showCompletionCanvas();}
function showCompletionCanvas(){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,15,30,0.93);z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;text-align:center;padding:24px';
  const m1=mockState[1],m2=mockState[2];
  const p1=m1.correct/MOCK1.length>=MOCK_PASSMARK,p2=m2.correct/MOCK2.length>=MOCK_PASSMARK;
  ov.innerHTML=`<div style="font-size:3rem">🎉</div><h2 style="font-size:1.8rem;margin:0">Mock Tests Complete!</h2><div style="font-size:1rem;line-height:2">Mock 1: <strong>${m1.correct}/${MOCK1.length}</strong> — <span style="color:${p1?'#4ade80':'#fbbf24'}">${p1?'PASS':'Below pass mark'}</span><br>Mock 2: <strong>${m2.correct}/${MOCK2.length}</strong> — <span style="color:${p2?'#4ade80':'#fbbf24'}">${p2?'PASS':'Below pass mark'}</span></div><p style="color:#a0b0c8;max-width:400px;margin:0">Good luck on your exam! You've put in the work — go get it. 💪</p><button onclick="this.closest('div').remove()" style="margin-top:8px;padding:10px 28px;border-radius:6px;border:none;background:#5c6ef8;color:#fff;font-size:1rem;cursor:pointer;font-family:inherit">View Results &amp; Retrospect</button>`;
  document.body.appendChild(ov);triggerConfettiCanvas();
}
function triggerConfettiCanvas(){
  const c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';
  document.body.appendChild(c);c.width=window.innerWidth;c.height=window.innerHeight;
  const ctx=c.getContext('2d');const colors=['#ffb84d','#4ade80','#60a5fa','#f87171','#a78bfa','#fbbf24'];
  const pieces=Array.from({length:180},()=>({x:Math.random()*c.width,y:-20-Math.random()*100,w:8+Math.random()*8,h:4+Math.random()*5,color:colors[Math.floor(Math.random()*colors.length)],vx:(Math.random()-.5)*3,vy:2+Math.random()*4,rot:Math.random()*Math.PI*2,rs:(Math.random()-.5)*.12,op:1}));
  const t0=Date.now(),DUR=4000;
  (function go(){const el=Date.now()-t0;ctx.clearRect(0,0,c.width,c.height);pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.rot+=p.rs;if(el>DUR*.65)p.op=Math.max(0,1-(el-DUR*.65)/(DUR*.35));ctx.save();ctx.globalAlpha=p.op;ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();});if(el<DUR)requestAnimationFrame(go);else c.remove();})();
}

/* ── DEDUP RUNTIME WARNING ── */
function checkDedup(){
  try{
    const sigs=new Set();
    Object.keys(localStorage).filter(k=>k.startsWith('hmp_quiz_day')).forEach(k=>{
      const s=k.match(/hmp_quiz_(day\d+)/);if(!s)return;
      /* signatures are written by study-day pages via window.QUESTIONS_SIGS when present */
    });
    const studySigs=JSON.parse(localStorage.getItem('hmp_study_sigs')||'[]');
    const mockSigs=[...MOCK1,...MOCK2].map(q=>(q.sig||q.text.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,60)));
    const collisions=mockSigs.filter(s=>studySigs.includes(s));
    if(collisions.length)console.warn(`[helpmeprep] ${collisions.length} mock question signature(s) overlap with study-day questions:`,collisions);
  }catch{}
}

/* ── PAGE LOAD ── */
document.addEventListener('DOMContentLoaded',()=>{
  initMockSeconds();
  [1,2].forEach(n=>{
    const hadSaved=loadMockPersisted(n);
    const s=mockState[n];
    if(!hadSaved||!s.started)return;
    introEl(n).style.display='none';bodyEl(n).style.display='block';
    renderMockQuestions(n);timerEl(n).textContent=fmtTime(s.secondsLeft);
    restoreAnswers(n);
    if(!s.submitted)s.timer=setInterval(()=>tickTimer(n),1000);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const ov=document.querySelector('div[style*="z-index:9998"]');if(ov)ov.remove();}});
  checkDedup();
});
