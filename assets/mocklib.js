/* ============================================================
   mocklib.js v1.0 — Mock Test runtime (extracted from
   mock-template inline script in v1.3). Adds: mark-for-review,
   domain-weighted scoring, dedup runtime warning.
   Reads constants from the page: MOCK1, MOCK2, MOCK_MINUTES,
   MOCK_PASSMARK, DOMAIN_WEIGHTS (optional).
   ============================================================ */
'use strict';

function mEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function buildMockAskGoogle(domain,question){
  const q=encodeURIComponent((domain+' '+question+' explanation correct answer').trim());
  return `<a class="ag" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Ask Google for details</a>`;
}

const mockState={
  1:{answers:{},flagged:{},started:false,submitted:false,timer:null,secondsLeft:0,endTime:null,correct:0,_shuffled:null},
  2:{answers:{},flagged:{},started:false,submitted:false,timer:null,secondsLeft:0,endTime:null,correct:0,_shuffled:null}
};

/* init secondsLeft once page has loaded the config */
function initMockSeconds(){mockState[1].secondsLeft=MOCK_MINUTES*60;mockState[2].secondsLeft=MOCK_MINUTES*60;}

/* ── CHOICE SHUFFLE (Bug 5 fix) ── */
function _shuffArr(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildShuffledMock(n){
  if(mockState[n]._shuffled)return; // already built or restored from localStorage
  const qs=questionsFor(n);const sh={};
  qs.forEach((q,qi)=>{
    const ord=_shuffArr([...Array(q.choices.length).keys()]);
    sh[qi]={choices:ord.map(i=>q.choices[i]),correct:ord.indexOf(q.correct)};
  });
  mockState[n]._shuffled=sh;persistMock(n);
}

const mockKey=n=>`hmp_mock_${n}`;
function persistMock(n){const s=mockState[n];try{localStorage.setItem(mockKey(n),JSON.stringify({answers:s.answers,flagged:s.flagged,secondsLeft:s.secondsLeft,endTime:s.endTime,started:s.started,submitted:s.submitted,correct:s.correct,_shuffled:s._shuffled}));}catch{}}
function loadMockPersisted(n){try{const raw=localStorage.getItem(mockKey(n));if(raw){const d=JSON.parse(raw);Object.assign(mockState[n],d);if(!mockState[n].flagged)mockState[n].flagged={};if(mockState[n].endTime&&!mockState[n].submitted){mockState[n].secondsLeft=Math.max(0,Math.ceil((mockState[n].endTime-Date.now())/1000));}return true;}}catch{}return false;}

const bodyEl=n=>document.getElementById(`mock${n}Body`);
const introEl=n=>document.getElementById(`mock${n}Intro`);
const qEl=n=>document.getElementById(`mock${n}Questions`);
const timerEl=n=>document.getElementById(`timer${n}`);
const resultsEl=n=>document.getElementById(`mock${n}Results`);
const flagPanelEl=n=>document.getElementById(`mock${n}FlagPanel`);
const questionsFor=n=>n===1?MOCK1:MOCK2;

function fmtTime(secs){return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
function tickTimer(n){const s=mockState[n];if(s.submitted)return;s.secondsLeft=s.endTime?Math.max(0,Math.ceil((s.endTime-Date.now())/1000)):Math.max(0,s.secondsLeft-1);timerEl(n).textContent=fmtTime(s.secondsLeft);timerEl(n).classList.toggle('warn',s.secondsLeft<=600&&s.secondsLeft>300);timerEl(n).classList.toggle('danger',s.secondsLeft<=300);persistMock(n);if(s.secondsLeft<=0)submitMock(n);}

function startMock(n){const s=mockState[n];if(s.started)return;s.started=true;s.endTime=Date.now()+s.secondsLeft*1000;introEl(n).style.display='none';bodyEl(n).style.display='block';renderMockQuestions(n);bodyEl(n).scrollIntoView({behavior:'smooth',block:'start'});timerEl(n).textContent=fmtTime(s.secondsLeft);s.timer=setInterval(()=>tickTimer(n),1000);persistMock(n);updateFlagPanel(n);}

function renderMockQuestions(n){
  buildShuffledMock(n);
  const qs=questionsFor(n);const sh=mockState[n]._shuffled;
  qEl(n).innerHTML=qs.map((q,qi)=>`
    <div class="question" id="mock${n}-q${qi}" data-mock="${n}" data-q="${qi}">
      <div class="question-num">
        Question ${qi+1} of ${qs.length}
        <button class="flag-btn" onclick="toggleFlag(${n},${qi})" title="Mark for review" aria-label="Flag for review"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" style="width:11px;height:11px;display:inline-block;vertical-align:middle"><path d="M3 1v10M3 2l6 1.5L7 5l2 1.5L3 7"/></svg></button>
      </div>
      <div class="question-text">${mEsc(q.text)}</div>
      <div class="choices">
        ${sh[qi].choices.map((c,ci)=>`<button class="choice" data-ci="${ci}" onclick="pickMock(${n},${qi},${ci})"><span class="choice-letter">${String.fromCharCode(65+ci)}</span><span>${mEsc(c)}</span></button>`).join('')}
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
  panel.innerHTML=`<div class="flag-panel-title">Flagged for review · ${flags.length}</div>`+
    `<div class="flag-list">${flags.map(qi=>`<a href="#mock${n}-q${qi}" onclick="document.getElementById('mock${n}-q${qi}').scrollIntoView({behavior:'smooth',block:'center'});return false;">Q${qi+1}</a>`).join(' · ')}</div>`;
}

function restoreAnswers(n){
  const s=mockState[n];const qs=questionsFor(n);const sh=s._shuffled||{};
  const getCorr=qi=>sh[qi]!==undefined?sh[qi].correct:(qs[qi]?.correct??0);
  Object.entries(s.answers).forEach(([qi,ci])=>{const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);if(block)block.querySelectorAll('.choice').forEach((btn,i)=>btn.classList.toggle('selected',i===+ci));});
  Object.keys(s.flagged).forEach(qi=>{const block=document.getElementById(`mock${n}-q${qi}`);block?.classList.add('flagged');block?.querySelector('.flag-btn')?.classList.add('on');});
  if(s.submitted){
    qs.forEach((q,qi)=>{
      const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);if(!block)return;
      const picked=s.answers[qi];const corr=getCorr(qi);
      block.querySelectorAll('.choice').forEach((btn,i)=>{btn.disabled=true;btn.classList.remove('selected');if(i===corr)btn.classList.add('reveal-correct');if(picked!==undefined&&+picked===i&&+picked!==corr)btn.classList.add('selected','wrong');});
      if(!block.querySelector('.explanation')){const expl=document.createElement('div');expl.className='explanation show '+(+picked===corr?'':'wrong');expl.innerHTML=`<div class="explanation-title">${+picked===corr?'Correct':(picked===undefined?'Skipped':'Incorrect')}</div><details class="show-explanation"><summary>Show explanation</summary><div>${mEsc(q.explanation||'')}</div></details>${buildMockAskGoogle(q.domain||'',q.text)}`;block.appendChild(expl);}
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
  const sh=s._shuffled||{};const getCorr=qi=>sh[qi]!==undefined?sh[qi].correct:(qs[qi]?.correct??0);
  let correct=0;
  qs.forEach((q,qi)=>{if(+s.answers[qi]===getCorr(qi))correct++;});
  s.correct=correct;persistMock(n);
  qs.forEach((q,qi)=>{
    const block=document.querySelector(`[data-mock="${n}"][data-q="${qi}"]`);
    const picked=s.answers[qi];const corr=getCorr(qi);
    block.querySelectorAll('.choice').forEach((btn,i)=>{btn.disabled=true;btn.classList.remove('selected');if(i===corr)btn.classList.add('reveal-correct');if(picked!==undefined&&+picked===i&&+picked!==corr)btn.classList.add('selected','wrong');});
    const expl=document.createElement('div');expl.className='explanation show '+(+picked===corr?'':'wrong');expl.innerHTML=`<div class="explanation-title">${+picked===corr?'Correct':(picked===undefined?'Skipped':'Incorrect')}</div><details class="show-explanation"><summary>Show explanation</summary><div>${mEsc(q.explanation||'')}</div></details>${buildMockAskGoogle(q.domain||'',q.text)}`;
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
  const sh=s._shuffled||{};const getCorr=qi=>sh[qi]!==undefined?sh[qi].correct:(qs[qi]?.correct??0);
  const byDom={};
  qs.forEach((q,qi)=>{const d=q.domain||'_unweighted';if(!byDom[d])byDom[d]={c:0,t:0};byDom[d].t++;if(+s.answers[qi]===getCorr(qi))byDom[d].c++;});
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
      <div class="score-verdict ${passed?'pass':'fail'}">${passed?'Pass':'Below pass mark'}</div>
    </div>
    <p style="text-align:center;color:var(--mu);font-size:0.85rem">Time used: ${Math.floor(timeUsed/60)}m ${timeUsed%60}s · Pass mark: ${Math.round(MOCK_PASSMARK*100)}%</p>
    ${domBreakdown}
    <div style="text-align:center;margin-top:24px"><button class="btn-secondary" onclick="retryMock(${n})">↺ Retry Mock ${n}</button></div>`;
}

/* ── MOCK RETRY ── */
function retryMock(n){
  const s=mockState[n];
  if(s.timer)clearInterval(s.timer);
  mockState[n]={answers:{},flagged:{},started:false,submitted:false,timer:null,secondsLeft:MOCK_MINUTES*60,endTime:null,correct:0,_shuffled:null};
  try{localStorage.removeItem(mockKey(n));}catch{}
  bodyEl(n).style.display='none';
  introEl(n).style.display='block';
  resultsEl(n).classList.remove('show');
  resultsEl(n).innerHTML='';
  document.getElementById(`mock${n}SubmitBtn`)?.removeAttribute('disabled');
  const fp=flagPanelEl(n);if(fp){fp.style.display='none';fp.innerHTML='';}
  introEl(n).scrollIntoView({behavior:'smooth',block:'start'});
  // hmp_mock_canvas_shown remains set — canvas will NOT refire on re-submission
}

/* ── COMPLETION CANVAS ── */
function checkBothDone(){if(!mockState[1].submitted||!mockState[2].submitted)return;if(sessionStorage.getItem('hmp_mock_canvas_shown'))return;sessionStorage.setItem('hmp_mock_canvas_shown','1');showCompletionCanvas();}
function showCompletionCanvas(){
  const ov=document.createElement('div');
  const css=getComputedStyle(document.documentElement);
  const ink=(css.getPropertyValue('--ink')||'#0e1424').trim();
  const canvas=(css.getPropertyValue('--canvas')||'#faf8f3').trim();
  const ok=(css.getPropertyValue('--ok')||'#1d6e3a').trim();
  const warm=(css.getPropertyValue('--warm')||'#a23b1f').trim();
  const primary=(css.getPropertyValue('--primary')||'#1e3a8a').trim();
  ov.style.cssText=`position:fixed;inset:0;background:${ink};z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;color:${canvas};text-align:center;padding:24px;font-family:'Outfit',sans-serif;opacity:0;transition:opacity 320ms cubic-bezier(0.23,1,0.32,1)`;
  const m1=mockState[1],m2=mockState[2];
  const p1=m1.correct/MOCK1.length>=MOCK_PASSMARK,p2=m2.correct/MOCK2.length>=MOCK_PASSMARK;
  ov.innerHTML=`
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${warm};font-weight:600">Mocks Complete</div>
    <h2 style="font-size:42px;font-weight:600;margin:0;letter-spacing:-0.025em;line-height:1.05">Good luck on your exam</h2>
    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;line-height:2;color:${canvas};opacity:0.85">
      Mock 1 · <strong style="color:${canvas}">${m1.correct}/${MOCK1.length}</strong> · <span style="color:${p1?ok:warm};text-transform:uppercase;letter-spacing:0.1em;font-size:11px">${p1?'Pass':'Below'}</span><br>
      Mock 2 · <strong style="color:${canvas}">${m2.correct}/${MOCK2.length}</strong> · <span style="color:${p2?ok:warm};text-transform:uppercase;letter-spacing:0.1em;font-size:11px">${p2?'Pass':'Below'}</span>
    </div>
    <p style="color:${canvas};opacity:0.65;max-width:380px;margin:0;font-family:'Newsreader',serif;font-style:italic;font-size:15.5px;line-height:1.55">You've put in the work — now go and own it.</p>
    <button onclick="this.closest('div').remove()" style="margin-top:8px;padding:12px 24px;border:0;background:${primary};color:${canvas};font-size:13px;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:500;letter-spacing:0.01em;transition:opacity 180ms">View results &amp; retrospect →</button>`;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.style.opacity='1');
  triggerConfettiCanvas();
}
function triggerConfettiCanvas(){
  const c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';
  document.body.appendChild(c);c.width=window.innerWidth;c.height=window.innerHeight;
  const ctx=c.getContext('2d');
  const css=getComputedStyle(document.documentElement);
  const primary=(css.getPropertyValue('--primary')||'#1e3a8a').trim();
  const warm=(css.getPropertyValue('--warm')||'#a23b1f').trim();
  const colors=[primary,warm,primary,warm,primary];
  const pieces=Array.from({length:80},()=>({x:Math.random()*c.width,y:-20-Math.random()*100,w:6+Math.random()*5,h:3+Math.random()*4,color:colors[Math.floor(Math.random()*colors.length)],vx:(Math.random()-.5)*2.4,vy:1.8+Math.random()*3,rot:Math.random()*Math.PI*2,rs:(Math.random()-.5)*.1,op:1}));
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
