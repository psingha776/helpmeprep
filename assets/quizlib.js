/* ============================================================
   quizlib.js v2.1 — Study Hub runtime engine
   v2.1 changes: keyboard shortcuts · per-question timer ·
   sticky-note coachmark · Google search cap removed ·
   calibration data exposed for index-page chart ·
   notes-by-day index aggregator helpers
   ============================================================ */
'use strict';

/* ── UTILITIES ── */
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function inlineFmt(raw){
  return esc(raw)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
function reRender(sel,html){
  const el=document.querySelector(sel);if(!el)return;
  const hadFocus=el.contains(document.activeElement);
  const tmp=document.createElement('div');tmp.innerHTML=html;el.replaceWith(tmp.firstElementChild);
  if(hadFocus){
    const newEl=document.querySelector(sel);
    const target=newEl?.querySelector('.explanation summary,.conf-btn,.hint-btn,.btn-check,.btn-submit-blank,button:not([disabled])');
    if(target)target.focus();
  }
}

/* ── MARKDOWN → BLUEPRINT RENDERER (unchanged) ── */
function md2html(md){
  const lines=md.split('\n');let out='',i=0;
  while(i<lines.length){
    const ln=lines[i];
    if(ln.startsWith('```')){const lang=ln.slice(3).trim()||'text';let code='';i++;while(i<lines.length&&!lines[i].startsWith('```')){code+=esc(lines[i])+'\n';i++;}out+=`<pre><code class="lang-${esc(lang)}">${code}</code></pre>\n`;i++;continue;}
    const cm=ln.match(/^>\s*\[!(info|warn|success|error)\]\s*(.*)/i);
    if(cm){const type=cm[1].toLowerCase(),title=cm[2].trim()||type.toUpperCase();let body='';i++;while(i<lines.length&&lines[i].startsWith('>')){body+=inlineFmt(lines[i].replace(/^>\s?/,''))+' ';i++;}out+=`<div class="callout ${type}"><div class="callout-title">${esc(title)}</div><p>${body.trim()}</p></div>\n`;continue;}
    if(ln.match(/^(>\s*)?EXAMPLE[:\s]/i)){const body=inlineFmt(ln.replace(/^(>\s*)?EXAMPLE[:\s]*/i,'').trim());out+=`<div class="example"><div class="example-label">EXAMPLE</div><p>${body}</p></div>\n`;i++;continue;}
    let hm;
    if((hm=ln.match(/^###\s+(.*)/))){out+=`<h3>${inlineFmt(hm[1])} <span class="sticky-trigger" title="Click to add a note">+ note</span></h3>\n`;i++;continue;}
    if((hm=ln.match(/^##\s+(.*)/))){out+=`<h2>${inlineFmt(hm[1])} <span class="sticky-trigger" title="Click to add a note">+ note</span></h2>\n`;i++;continue;}
    if((hm=ln.match(/^#\s+(.*)/))){out+=`<h2>${inlineFmt(hm[1])} <span class="sticky-trigger" title="Click to add a note">+ note</span></h2>\n`;i++;continue;}
    if(ln.trim().startsWith('|')&&ln.includes('|')){const rows=[];while(i<lines.length&&lines[i].trim().startsWith('|')){if(!lines[i].match(/^\|[-: |]+\|$/))rows.push(lines[i]);i++;}if(rows.length){const cells=r=>r.split('|').slice(1,-1).map(c=>c.trim());const head=cells(rows[0]).map(c=>`<th>${inlineFmt(c)}</th>`).join('');const body=rows.slice(1).map(r=>`<tr>${cells(r).map(c=>`<td>${inlineFmt(c)}</td>`).join('')}</tr>`).join('');out+=`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;}continue;}
    if(ln.match(/^[-*]\s+/)){let items='';while(i<lines.length&&lines[i].match(/^[-*]\s+/)){items+=`<li>${inlineFmt(lines[i].replace(/^[-*]\s+/,''))}</li>`;i++;}out+=`<ul>${items}</ul>\n`;continue;}
    if(ln.match(/^\d+\.\s+/)){let items='';while(i<lines.length&&lines[i].match(/^\d+\.\s+/)){items+=`<li>${inlineFmt(lines[i].replace(/^\d+\.\s+/,''))}</li>`;i++;}out+=`<ol>${items}</ol>\n`;continue;}
    if(ln.match(/^\[.+?\](\s*\[.+?\])*/)){const badges=[...ln.matchAll(/\[([^\]]+)\]/g)].map(m=>`<span class="badge">${esc(m[1])}</span>`).join(' ');out+=`<div class="badges">${badges}</div>\n`;i++;continue;}
    if(ln.match(/^-{3,}$/)){out+='<hr>\n';i++;continue;}
    if(!ln.trim()){i++;continue;}
    let para=inlineFmt(ln.trim());i++;
    while(i<lines.length&&lines[i].trim()&&!lines[i].match(/^[#>\-*|]/)&&!lines[i].match(/^\d+\./)&&!lines[i].startsWith('```')){para+=' '+inlineFmt(lines[i].trim());i++;}
    out+=`<p>${para}</p>\n`;
  }
  return out;
}

function renderStudyMarkdown(){
  const rendered=document.getElementById('studyRendered');
  if(!rendered) return;
  if(typeof STUDY_MD!=='undefined'&&STUDY_MD.trim()){rendered.innerHTML=md2html(STUDY_MD);}
  document.querySelectorAll('#study h2,#study h3,#studyRendered h2,#studyRendered h3').forEach(h=>{
    if(!h.querySelector('.sticky-trigger')){const t=document.createElement('span');t.className='sticky-trigger';t.title='Click to add a note';t.textContent='+ note';h.appendChild(t);}
  });
  initStickyNotes();
  maybeShowStickyCoachmark();
}

/* ── STICKY NOTES ── */
function initStickyNotes(){
  const dayNum=document.body.dataset.day||'0';
  document.querySelectorAll('#study .sticky-trigger,#studyRendered .sticky-trigger').forEach(trigger=>{
    const h=trigger.parentElement;
    const slug=h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').slice(0,32);
    const key=`hmp_note_${dayNum}_${slug}`;
    let note=h.nextElementSibling;
    if(!note||!note.classList.contains('sticky-note')){note=document.createElement('div');note.className='sticky-note';note.contentEditable='true';h.insertAdjacentElement('afterend',note);}
    const saved=localStorage.getItem(key);
    note.dataset.key=key;note.style.display=saved?'block':'none';
    if(saved) note.textContent=saved;
    trigger.onclick=e=>{e.preventDefault();const show=note.style.display==='none';note.style.display=show?'block':'none';if(show)note.focus();};
    let deb;
    note.oninput=()=>{clearTimeout(deb);deb=setTimeout(()=>{const v=note.textContent.trim();v?localStorage.setItem(key,v):localStorage.removeItem(key);updateNotesBadge(dayNum);},400);};
    note.onblur=()=>{if(!note.textContent.trim()){localStorage.removeItem(key);note.style.display='none';updateNotesBadge(dayNum);}};
  });
  updateNotesBadge(dayNum);
}

function updateNotesBadge(dayNum){
  const n=Object.keys(localStorage).filter(k=>k.startsWith(`hmp_note_${dayNum}_`)&&localStorage.getItem(k)).length;
  const b=document.getElementById('notesBadge');
  if(b){b.textContent=n?`${n} note${n>1?'s':''}`:'no notes';b.style.display='inline-block';b.classList.toggle('empty',!n);}
}

/* ── FIRST-VISIT COACHMARK (any day) ── */
function maybeShowStickyCoachmark(){
  if(localStorage.getItem('hmp_seen_notes_v1')) return;
  const firstH=document.querySelector('#studyRendered h2, #studyRendered h3, #study h2, #study h3');
  if(!firstH) return;
  const cm=document.createElement('div');
  cm.className='coachmark';
  cm.innerHTML=`<div class="cm-arrow">↑</div><div class="cm-body"><strong>Tip ·</strong> Click <em style="font-family:'Newsreader',serif">+ note</em> beside any heading to leave yourself a sticky note. Notes show up on your home page too.</div><button class="cm-x" title="Got it" onclick="dismissCoachmark(this)">Got it</button>`;
  firstH.insertAdjacentElement('afterend',cm);
}
function dismissCoachmark(btn){localStorage.setItem('hmp_seen_notes_v1','1');btn.closest('.coachmark')?.remove();}

/* ── KEYBOARD SHORTCUTS ── */
function maybeShowKbdCoachmark(){
  if(localStorage.getItem('hmp_seen_kbd_v1')) return;
  if(!document.querySelector('.question')) return;
  const t=document.createElement('div');
  t.className='kbd-toast';
  t.innerHTML=`<div><strong style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase">Shortcuts ·</strong> <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>H</kbd> hint · <kbd>→</kbd> next · <kbd>?</kbd> help</div><button onclick="dismissKbdToast(this)" title="Dismiss">×</button>`;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('fade'),9000);
  setTimeout(()=>{if(t.parentElement){localStorage.setItem('hmp_seen_kbd_v1','1');t.remove();}},10500);
}
function dismissKbdToast(btn){localStorage.setItem('hmp_seen_kbd_v1','1');btn.closest('.kbd-toast')?.remove();}

function showKbdCheatsheet(){
  if(document.getElementById('kbdCheat')) return;
  const ov=document.createElement('div');
  ov.id='kbdCheat';ov.className='kbd-cheat-overlay';
  ov.innerHTML=`<div class="kbd-cheat"><h3>Keyboard shortcuts</h3>
    <dl><dt><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></dt><dd>Pick answer (MCQ only)</dd>
    <dt><kbd>H</kbd></dt><dd>Reveal next hint</dd>
    <dt><kbd>→</kbd></dt><dd>Scroll to next unanswered question</dd>
    <dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>Scroll between questions</dd>
    <dt><kbd>N</kbd></dt><dd>Open note on nearest heading</dd>
    <dt><kbd>?</kbd></dt><dd>Toggle this cheatsheet</dd>
    <dt><kbd>Esc</kbd></dt><dd>Close this cheatsheet</dd></dl>
    <p style="font-size:0.78rem;color:var(--mu)">Shortcuts are disabled inside text inputs and on match / order / fill-blank questions.</p>
    <button onclick="document.getElementById('kbdCheat').remove()">Close</button></div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
}

function getCurrentQuestion(){
  const qs=[...document.querySelectorAll('.question')];
  const mid=window.scrollY+window.innerHeight/3;
  let best=null,bestDist=Infinity;
  qs.forEach(q=>{const r=q.getBoundingClientRect();const top=r.top+window.scrollY;const d=Math.abs(top-mid);if(d<bestDist){bestDist=d;best=q;}});
  return best;
}

function handleKbdShortcut(e){
  /* never intercept inside text inputs / contentEditable */
  const t=e.target;
  if(t.matches('input,textarea,[contenteditable="true"]')) return;
  if(document.getElementById('kbdCheat')){
    if(e.key==='Escape'||e.key==='?'){document.getElementById('kbdCheat').remove();e.preventDefault();}
    return;
  }
  if(e.key==='?'){showKbdCheatsheet();e.preventDefault();return;}
  const block=getCurrentQuestion();if(!block)return;
  const qi=+block.dataset.q;
  const qd=(typeof quizData!=='undefined'&&quizData)?quizData[qi]:null;
  const isReview=block.hasAttribute('data-r');
  /* digit keys: only for MCQ on study pages, and review cards (which are MCQ-shaped) */
  if(/^[1-4]$/.test(e.key)){
    if(isReview){const di=+e.key-1;if(typeof pickReview==='function'){pickReview(+block.dataset.r,di);e.preventDefault();}return;}
    if(!qd) return;
    if(qd.type!=='mcq'){return;} /* silently disabled on match/order/fillblank */
    if(qd.answered) return;
    const di=+e.key-1;const btns=block.querySelectorAll('.choice');
    if(btns[di]&&!btns[di].disabled){pickMCQ(qi,di);e.preventDefault();}
    return;
  }
  if(e.key==='h'||e.key==='H'){
    if(qd&&qd.type==='mcq'&&!qd.answered){revealHint(qi);e.preventDefault();}
    return;
  }
  if(e.key==='ArrowRight'){
    const next=[...document.querySelectorAll('.question')].find(q=>{
      const i=+q.dataset.q;const d=(typeof quizData!=='undefined'&&quizData)?quizData[i]:null;
      const ans=q.hasAttribute('data-r')?_reviewCards[+q.dataset.r]?.answered:d?.answered;
      const r=q.getBoundingClientRect();return r.top>window.innerHeight/3&&!ans;
    });
    if(next){next.scrollIntoView({behavior:'smooth',block:'start'});e.preventDefault();}
    return;
  }
  if(e.key==='n'||e.key==='N'){
    /* open note on heading nearest to current scroll */
    const headings=[...document.querySelectorAll('#studyRendered h2, #studyRendered h3, #study h2, #study h3')];
    if(!headings.length) return;
    const mid=window.scrollY+window.innerHeight/3;
    let best=null,bestDist=Infinity;
    headings.forEach(h=>{const top=h.getBoundingClientRect().top+window.scrollY;const d=Math.abs(top-mid);if(d<bestDist){bestDist=d;best=h;}});
    best?.querySelector('.sticky-trigger')?.click();
    best?.scrollIntoView({behavior:'smooth',block:'center'});
    e.preventDefault();
  }
}

/* ── PER-QUESTION TIMER ── */
const _qStart={};
function startQTimer(qi){_qStart[qi]=Date.now();}
function endQTimer(qi){
  if(!_qStart[qi]) return null;
  const s=Math.floor((Date.now()-_qStart[qi])/1000);
  delete _qStart[qi];
  return s;
}
function fmtQTime(s){if(s<60)return`${s}s`;return`${Math.floor(s/60)}m ${s%60}s`;}

/* ── XP / STREAK / LEVEL ── */
const XP_T=[0,100,300,600,1000],XP_L=['Beginner','Associate','Practitioner','Architect','Fellow'];
const getXP=()=>+(localStorage.getItem('hmp_xp')||0);
const getStreak=()=>+(localStorage.getItem('hmp_streak')||0);
const getLevel=()=>{let l=0;XP_T.forEach((t,i)=>{if(getXP()>=t)l=i;});return l;};
let _prevStreak = null;
function addXP(amt){
  const prev=getLevel(),nxp=getXP()+amt;
  localStorage.setItem('hmp_xp',nxp);
  const today=new Date().toDateString(),last=localStorage.getItem('hmp_last_study_date');
  if(!last){localStorage.setItem('hmp_last_study_date',today);localStorage.setItem('hmp_streak',1);}
  else if(last!==today){const yd=new Date(Date.now()-86400000).toDateString();localStorage.setItem('hmp_streak',last===yd?getStreak()+1:1);localStorage.setItem('hmp_last_study_date',today);}
  updateXPDisplay();
  if(getLevel()>prev)flashLevelUp();
}
function updateXPDisplay(){
  const el=document.getElementById('xpDisplay');if(!el)return;
  const l=getLevel(),xp=getXP(),streak=getStreak();
  const streakChanged = _prevStreak !== null && streak > _prevStreak;
  const streakHTML = streakChanged
    ? `<span class="streak-flip"><strong>${streak}</strong></span>`
    : `<strong>${streak}</strong>`;
  el.innerHTML =
    `<strong>${xp}</strong> XP · L${l+1} ${XP_L[l]}<br>` +
    `${streakHTML} day streak`;
  _prevStreak = streak;
}
function showXPToast(amt,anchor){
  const t=document.createElement('div');t.className='xp-toast';t.textContent=`+${amt} XP`;
  const r=anchor?anchor.getBoundingClientRect():{left:window.innerWidth/2,top:200,right:window.innerWidth/2};
  /* spawn at right edge of anchor */
  t.style.cssText=`left:${r.right-50}px;top:${r.top+window.scrollY-6}px`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1200);
}
function flashLevelUp(){const el=document.getElementById('xpDisplay');if(el){el.classList.add('level-up-flash');setTimeout(()=>el.classList.remove('level-up-flash'),1800);}}

/* ── SPACED REPETITION POOL ── */
function getPool(){try{return JSON.parse(localStorage.getItem('hmp_review_pool')||'[]');}catch{return[];}}
function savePool(p){try{localStorage.setItem('hmp_review_pool',JSON.stringify(p));}catch{}}
function addToPool(id,q,reason){const p=getPool();if(!p.find(x=>x.id===id)){p.push({id,text:q.text,choices:q.choices,correct:q.correct,explanation:q.explanation,domain:q.domain,flagReason:reason});savePool(p);}}
function removeFromPool(id){savePool(getPool().filter(x=>x.id!==id));}

/* ── LIVES / CHALLENGE MODE (unchanged) ── */
let _lives=5;
function initLivesMode(dayNum){
  const lockKey=`hmp_lock_day${dayNum}`,modeKey=`hmp_challenge_day${dayNum}`;
  const lockTs=+localStorage.getItem(lockKey)||0;
  if(lockTs&&Date.now()-lockTs<3600000){showLockOverlay(Math.ceil((3600000-(Date.now()-lockTs))/60000));return;}
  if(lockTs)localStorage.removeItem(lockKey);
  setModeUI(localStorage.getItem(modeKey)||'normal',dayNum);
  document.querySelectorAll('.mode-btn').forEach(btn=>{btn.addEventListener('click',()=>{if(countAnswered()>0)return;const m=btn.dataset.mode;localStorage.setItem(modeKey,m);setModeUI(m,dayNum);});});
}
function setModeUI(mode,dayNum){document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));const hr=document.getElementById('heartsRow');if(hr){hr.style.display=mode==='challenge'?'flex':'none';renderHearts();}}
function renderHearts(){
  const hr=document.getElementById('heartsRow');if(!hr)return;
  const H='<svg viewBox="0 0 16 14" fill="currentColor" style="width:14px;height:14px;display:block;color:#a23b1f"><path d="M8 13s-6-3.8-6-8.2C2 2.6 3.6 1 5.6 1 6.8 1 7.6 1.6 8 2.2 8.4 1.6 9.2 1 10.4 1 12.4 1 14 2.6 14 4.8 14 9.2 8 13 8 13z"/></svg>';
  const HO='<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.4" style="width:14px;height:14px;display:block;color:#5a6378"><path d="M8 13s-6-3.8-6-8.2C2 2.6 3.6 1 5.6 1 6.8 1 7.6 1.6 8 2.2 8.4 1.6 9.2 1 10.4 1 12.4 1 14 2.6 14 4.8 14 9.2 8 13 8 13z"/></svg>';
  hr.innerHTML=Array.from({length:5},(_,i)=>`<span class="${i<_lives?'':'heart-lost'}">${i<_lives?H:HO}</span>`).join('');
}
function loseHeart(dayNum){const mode=localStorage.getItem(`hmp_challenge_day${dayNum}`)||'normal';if(mode!=='challenge')return;_lives=Math.max(0,_lives-1);renderHearts();if(_lives===0){localStorage.setItem(`hmp_lock_day${dayNum}`,Date.now());setTimeout(()=>showLockOverlay(60),400);}}
function showLockOverlay(mins){const ov=document.createElement('div');ov.className='lock-overlay';ov.innerHTML=`<div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#d97757;font-weight:600">Session locked</div><h2>All hearts lost</h2><p>Come back in ~${mins} min · partial progress saved</p>`;document.body.appendChild(ov);}

/* ── CLIENT-SIDE HINTS ── */
const _hintUsed={};
function revealHint(qi){
  const qd=quizData[qi];if(qd.answered||qd.type!=='mcq')return;
  const used=_hintUsed[qi]||0;if(used>=3)return;
  const q=QUESTIONS[qd.i];const expl=q.explanation||'';
  _hintUsed[qi]=used+1;
  const block=document.querySelector(`[data-q="${qi}"]`);
  let hb=block.querySelector('.hint-box');
  if(!hb){hb=document.createElement('div');hb.className='hint-box';block.querySelector('.choices').insertAdjacentElement('afterend',hb);}
  if(used===0){
    // H1: dim one random wrong choice
    const wrongs=qd.co.map((_,di)=>di).filter(di=>di!==qd.nc);const grey=wrongs[Math.floor(Math.random()*wrongs.length)];const btn=block.querySelectorAll('.choice')[grey];if(btn){btn.classList.add('hint-greyed');btn.disabled=true;}
    hb.innerHTML+=`<div class="hint-label">Hint 1</div><span>One unlikely answer eliminated.</span>`;
  } else if(used===1){
    // H2: dim a SECOND wrong choice — no explanation text leak
    const dimmed=[...block.querySelectorAll('.choice.hint-greyed')].map(b=>+b.dataset.idx||[...block.querySelectorAll('.choice')].indexOf(b));
    const remaining=qd.co.map((_,di)=>di).filter(di=>di!==qd.nc&&!dimmed.includes(di));
    const grey2=remaining[Math.floor(Math.random()*remaining.length)];const btn2=block.querySelectorAll('.choice')[grey2];if(btn2){btn2.classList.add('hint-greyed');btn2.disabled=true;}
    hb.innerHTML+=`<div class="hint-label">Hint 2</div><span>A second unlikely answer eliminated. Two choices remain.</span>`;
  } else {
    // H3: domain label + first 8 words of explanation as a fragment — not a full sentence
    const domain=q.domain?`[${q.domain}] `:'[Concept] ';const fragment=expl.trim().split(/\s+/).slice(0,8).join(' ');
    hb.innerHTML+=`<div class="hint-label">Hint 3</div><span>${esc(domain)}— ${esc(fragment)}…</span>`;
    const btn=block.querySelector('.hint-btn');if(btn){btn.disabled=true;btn.textContent='All hints used';}
  }
}

/* ── QUIZ STORAGE ── */
function storageKey(){return 'hmp_quiz_'+location.pathname.split('/').pop().replace('.html','');}
let quizData;
function buildFresh(){
  return QUESTIONS.map((q,idx)=>{
    const t=q.type||'mcq';
    if(t==='mcq'){const co=shuffle([0,1,2,3]);return{type:'mcq',i:idx,co,nc:co.indexOf(q.correct),answered:false,sel:null,ok:null,conf:null,timeSec:null};}
    if(t==='match'){return{type:'match',i:idx,to:shuffle(q.pairs.map((_,j)=>j)),def:shuffle(q.pairs.map((_,j)=>j)),matched:{},wrongs:0,answered:false};}
    if(t==='order'){return{type:'order',i:idx,cur:shuffle(q.items.map((_,j)=>j)),attempts:0,answered:false,ok:null};}
    if(t==='fillblank'){return{type:'fillblank',i:idx,bo:shuffle(q.wordBank.map((_,j)=>j)),selIdx:undefined,answered:false,ok:null};}
  });
}
function loadSaved(){try{const s=localStorage.getItem(storageKey());if(s){const p=JSON.parse(s);if(Array.isArray(p)&&p.length===QUESTIONS.length)return p;}}catch{}return null;}
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(quizData));}catch{}}
const countAnswered=()=>quizData.filter(d=>d.answered).length;
const countCorrect=()=>quizData.filter(d=>d.ok===true).length;

/* ── REVIEW CARDS ── */
let _reviewCards=[];
function buildReviewCards(){const pool=getPool().slice(0,5);_reviewCards=pool.map(item=>{const co=shuffle([0,1,2,3]);return{item,co,nc:co.indexOf(item.correct),answered:false,ok:null,sel:null};});}

/* ── RENDER ALL ── */
function renderAll(){
  buildReviewCards();
  const root=document.getElementById('questionList');
  const reviewHTML=_reviewCards.length?`<div class="review-section-header">Spaced Review <span class="review-count">(${_reviewCards.length} from earlier days)</span></div>`+_reviewCards.map((rc,ri)=>renderReviewCard(ri,rc)).join(''):'';
  root.innerHTML=reviewHTML+quizData.map((qd,qi)=>renderQ(qi,qd)).join('');
  /* arm per-question timers on unanswered MCQs */
  quizData.forEach((qd,qi)=>{if(qd.type==='mcq'&&!qd.answered)startQTimer(qi);});
  updateProg();
  maybeShowKbdCoachmark();
  if(typeof armQuestionObserver==='function') armQuestionObserver();
}
function renderQ(qi,qd){if(qd.type==='match')return renderMatch(qi,qd);if(qd.type==='order')return renderOrder(qi,qd);if(qd.type==='fillblank')return renderFillblank(qi,qd);return renderMCQ(qi,qd);}

/* ── REVIEW CARD ── */
function renderReviewCard(ri,rc){
  const {item,co,nc,answered,ok,sel}=rc;
  const sc=co.map(ci=>item.choices[ci]);
  const btns=sc.map((txt,di)=>{let cls='choice',dis='';if(answered){dis='disabled';if(di===sel&&ok)cls+=' selected correct';else if(di===sel&&!ok)cls+=' selected wrong';else if(di===nc&&!ok)cls+=' reveal-correct';else cls+=' faded';}return `<button class="${cls}" onclick="pickReview(${ri},${di})" ${dis}><span class="choice-letter">${String.fromCharCode(65+di)}</span><span>${esc(txt)}</span></button>`;}).join('');
  const expl=answered?`<div class="explanation show ${ok?'':'wrong'}"><div class="explanation-title">${ok?'Correct':'Not quite'}</div><details class="show-explanation"><summary>Show explanation</summary><div class="explanation-text">${esc(item.explanation||'')}</div></details>${buildAskGoogle(item.domain||'',item.text)}</div>`:'<div class="explanation"></div>';
  return `<div class="question review-card" data-r="${ri}" data-q="${ri}"><div class="question-num"><span class="review-badge">Review</span> ${esc(item.domain||'')}</div><div class="question-text">${esc(item.text)}</div><div class="choices">${btns}</div>${expl}</div>`;
}
function pickReview(ri,di){const rc=_reviewCards[ri];if(rc.answered)return;rc.answered=true;rc.sel=di;rc.ok=di===rc.nc;if(rc.ok){removeFromPool(rc.item.id);addXP(15);showXPToast(15,document.querySelector(`[data-r="${ri}"]`));announce('Correct');}else{announce('Incorrect');}reRender(`[data-r="${ri}"]`,renderReviewCard(ri,rc));updateProg();checkDone();}

/* ── MCQ ── */
function renderMCQ(qi,qd){
  const q=QUESTIONS[qd.i];
  const sc=qd.co.map(ci=>q.choices[ci]);
  const btns=sc.map((txt,di)=>{let cls='choice',dis='';if(qd.answered){dis='disabled';if(di===qd.sel&&qd.ok)cls+=' selected correct';else if(di===qd.sel&&!qd.ok)cls+=' selected wrong';else if(di===qd.nc&&!qd.ok)cls+=' reveal-correct';else cls+=' faded';}return `<button class="${cls}" onclick="pickMCQ(${qi},${di})" ${dis}><span class="choice-letter">${String.fromCharCode(65+di)}</span><span>${esc(txt)}</span></button>`;}).join('');
  const hintBtn=!qd.answered?`<button class="hint-btn" onclick="revealHint(${qi})">Hint</button>`:'';
  const conf=qd.answered?renderConf(qi,qd.conf):'';
  const timerHTML=qd.answered&&qd.timeSec!=null?`<span class="q-time">⏱ ${fmtQTime(qd.timeSec)}</span>`:'';
  const expl=qd.answered?`<div class="explanation show ${qd.ok?'':'wrong'}"><div class="explanation-title">${qd.ok?'Correct':'Not quite'} ${timerHTML}</div><details class="show-explanation"><summary>Show explanation</summary><div class="explanation-text">${esc(q.explanation||'')}</div></details>${buildAskGoogle(q.domain||'',q.text)}</div>`:'<div class="explanation"></div>';
  const dom=q.domain?`<span class="q-domain">${esc(q.domain)}</span> `:'';
  return `<div class="question" data-q="${qi}"><div class="question-num">${dom}Q${qi+1} of ${QUESTIONS.length}</div><div class="question-text">${esc(q.text)}</div><div class="choices">${btns}</div>${hintBtn}${conf}${expl}</div>`;
}
function pickMCQ(qi,di){
  const qd=quizData[qi];if(qd.answered)return;
  const q=QUESTIONS[qd.i];
  qd.answered=true;qd.sel=di;qd.ok=di===qd.nc;
  qd.timeSec=endQTimer(qi);
  if(!qd.conf)qd.conf='sure';
  const dayNum=document.body.dataset.day||'0';
  const hu=_hintUsed[qi]||0;
  const xpTable=[10,7,4,2];
  if(qd.ok){const xp=xpTable[Math.min(hu,3)]+(qd.conf==='certain'?2:0);addXP(xp);persist();reRender(`[data-q="${qi}"]`,renderMCQ(qi,qd));showXPToast(xp,document.querySelector(`[data-q="${qi}"]`));announce('Correct');}
  else {addToPool(`${storageKey()}_${qi}`,q,'wrong');loseHeart(dayNum);persist();reRender(`[data-q="${qi}"]`,renderMCQ(qi,qd));announce('Incorrect');}
  updateProg();checkDone();
}
function renderConf(qi,sel){return `<div class="conf-row"><span class="conf-label">How confident?</span>${['Guessed','Sure','Certain'].map(l=>`<button class="conf-btn${sel===l.toLowerCase()?' selected':''}" onclick="setConf(${qi},'${l.toLowerCase()}')">${l}</button>`).join('')}</div>`;}
function setConf(qi,conf){const qd=quizData[qi];qd.conf=conf;persist();const q=QUESTIONS[qd.i],dKey=storageKey();if(conf==='guessed'&&qd.ok)addToPool(`${dKey}_${qi}_lg`,q,'lucky-guess');if(conf==='certain'&&!qd.ok)addToPool(`${dKey}_${qi}_fc`,q,'false-certainty');document.querySelector(`[data-q="${qi}"]`)?.querySelectorAll('.conf-btn').forEach(b=>b.classList.toggle('selected',b.textContent.toLowerCase()===conf));}

/* ── MATCH PAIRS ── */
const _matchPend={};
function renderMatch(qi,qd){
  const q=QUESTIONS[qd.i];
  if(qd.answered){const rows=q.pairs.map(p=>`<div class="match-row"><span class="match-term correct-pair">${esc(p.term)}</span><span class="match-arrow">→</span><span class="match-def correct-pair">${esc(p.definition)}</span></div>`).join('');return `<div class="question match-q" data-q="${qi}"><div class="question-num">Q${qi+1} of ${QUESTIONS.length}</div><div class="question-text">${esc(q.text)}</div><div class="match-pairs">${rows}</div><div class="explanation show"><div class="explanation-title">All matched</div><details class="show-explanation"><summary>Show explanation</summary><div class="explanation-text">${esc(q.explanation||'')}</div></details></div></div>`;}
  const matchedTerms=new Set(Object.keys(qd.matched||{}).map(Number));
  const matchedDefs=new Set(Object.values(qd.matched||{}).map(Number));
  const terms=qd.to.map((pi,ti)=>{const locked=matchedTerms.has(ti);return `<button class="match-term-btn${locked?' correct-pair':''}" data-ti="${ti}" onclick="matchClick(${qi},'t',${ti})" ${locked?'disabled':''}>`+esc(q.pairs[pi].term)+`</button>`;}).join('');
  const defs=qd.def.map((pi,di)=>{const locked=matchedDefs.has(di);return `<button class="match-def-btn${locked?' correct-pair':''}" data-di="${di}" onclick="matchClick(${qi},'d',${di})" ${locked?'disabled':''}>`+esc(q.pairs[pi].definition)+`</button>`;}).join('');
  return `<div class="question match-q" data-q="${qi}"><div class="question-num">Q${qi+1} of ${QUESTIONS.length}</div><div class="question-text">${esc(q.text)}</div><div class="match-cols"><div class="match-col">${terms}</div><div class="match-col">${defs}</div></div><div class="explanation"></div></div>`;
}
function matchClick(qi,side,idx){
  const qd=quizData[qi];if(qd.answered)return;
  const pend=_matchPend[qi];
  const block=document.querySelector(`[data-q="${qi}"]`);
  if(!pend){_matchPend[qi]={side,idx};block.querySelector(`[data-${side==='t'?'t':'d'}i="${idx}"]`)?.classList.add('selected');return;}
  if(pend.side===side){block.querySelectorAll('.match-term-btn.selected,.match-def-btn.selected').forEach(b=>b.classList.remove('selected'));_matchPend[qi]={side,idx};block.querySelector(`[data-${side==='t'?'t':'d'}i="${idx}"]`)?.classList.add('selected');return;}
  const ti=side==='t'?idx:pend.idx,di=side==='d'?idx:pend.idx;
  _matchPend[qi]=null;
  const q=QUESTIONS[qd.i];const ok=qd.to[ti]===qd.def[di];
  const tb=block.querySelector(`[data-ti="${ti}"]`),db=block.querySelector(`[data-di="${di}"]`);
  if(ok){[tb,db].forEach(b=>{if(b){b.classList.remove('selected');b.classList.add('correct-pair');b.disabled=true;}});if(!qd.matched)qd.matched={};qd.matched[ti]=di;if(Object.keys(qd.matched).length>=q.pairs.length){qd.answered=true;persist();const xp=qd.wrongs===0?10:5;addXP(xp);reRender(`[data-q="${qi}"]`,renderMatch(qi,qd));showXPToast(xp,document.querySelector(`[data-q="${qi}"]`));announce('All pairs matched — correct');updateProg();checkDone();}}
  else {qd.wrongs=(qd.wrongs||0)+1;persist();[tb,db].forEach(b=>{if(b){b.classList.remove('selected');b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),500);}});}
}

/* ── SEQUENCE ORDERING ── */
let _dragSrc=null;

/* B3: move-button handler for touch/keyboard accessibility */
function moveItem(qi,pos,dir){
  const qd=quizData[qi];if(qd.answered)return;
  const a=[...qd.cur];const target=pos+dir;
  if(target<0||target>=a.length)return;
  [a[pos],a[target]]=[a[target],a[pos]];qd.cur=a;persist();
  reRender(`[data-q="${qi}"]`,renderOrder(qi,qd));
  const items=document.querySelectorAll(`[data-q="${qi}"] .order-item`);
  items[target]?.querySelector('.order-move-up,.order-move-dn')?.focus();
}

function renderOrder(qi,qd){
  const q=QUESTIONS[qd.i];
  if(qd.answered){const items=q.correctOrder.map(ci=>`<div class="order-item correct"><span class="drag-handle">✓</span>${esc(q.items[ci])}</div>`).join('');return `<div class="question" data-q="${qi}"><div class="question-num">Q${qi+1} of ${QUESTIONS.length}</div><div class="question-text">${esc(q.text)}</div><div class="order-list">${items}</div><div class="explanation show"><div class="explanation-title">Correct order</div><details class="show-explanation"><summary>Show explanation</summary><div class="explanation-text">${esc(q.explanation||'')}</div></details></div></div>`;}
  const items=qd.cur.map((ci,pos)=>{
    const isFirst=pos===0,isLast=pos===qd.cur.length-1;
    return `<div class="order-item" draggable="true" data-pos="${pos}" ondragstart="orderDragStart(event,${qi},${pos})" ondragover="orderDragOver(event)" ondrop="orderDrop(event,${qi},${pos})" role="listitem"><span class="drag-handle" aria-hidden="true">⋮⋮</span><span class="order-text">${esc(q.items[ci])}</span><span class="order-move-btns"><button class="order-move-btn order-move-up" aria-label="Move up" onclick="moveItem(${qi},${pos},-1)" ${isFirst?'disabled':''}">▲</button><button class="order-move-btn order-move-dn" aria-label="Move down" onclick="moveItem(${qi},${pos},1)" ${isLast?'disabled':''}">▼</button></span></div>`;
  }).join('');
  return `<div class="question" data-q="${qi}"><div class="question-num">Q${qi+1} of ${QUESTIONS.length}</div><div class="question-text">${esc(q.text)}</div><div class="order-list">${items}</div><button class="btn-check" onclick="checkOrder(${qi})">Check Order</button><div class="explanation"></div></div>`;
}
function orderDragStart(e,qi,pos){_dragSrc={qi,pos};e.dataTransfer.effectAllowed='move';}
function orderDragOver(e){e.preventDefault();}
function orderDrop(e,qi,to){e.preventDefault();if(!_dragSrc||_dragSrc.qi!==qi)return;const qd=quizData[qi];const a=[...qd.cur];const[m]=a.splice(_dragSrc.pos,1);a.splice(to,0,m);qd.cur=a;persist();reRender(`[data-q="${qi}"]`,renderOrder(qi,qd));}
function checkOrder(qi){
  const qd=quizData[qi],q=QUESTIONS[qd.i];
  const ok=qd.cur.every((v,i)=>v===q.correctOrder[i]);
  if(ok){qd.answered=true;qd.ok=true;persist();const xp=qd.attempts===0?10:5;addXP(xp);reRender(`[data-q="${qi}"]`,renderOrder(qi,qd));showXPToast(xp,document.querySelector(`[data-q="${qi}"]`));announce('Correct order');updateProg();checkDone();}
  else {qd.attempts++;persist();if(qd.attempts>=2){qd.answered=true;qd.ok=false;qd.cur=[...q.correctOrder];persist();reRender(`[data-q="${qi}"]`,renderOrder(qi,qd));announce('Incorrect — correct order revealed');updateProg();checkDone();}else {document.querySelector(`[data-q="${qi}"]`).querySelectorAll('.order-item').forEach((item,pos)=>{item.classList.toggle('correct',qd.cur[pos]===q.correctOrder[pos]);item.classList.toggle('wrong',qd.cur[pos]!==q.correctOrder[pos]);});}}
}

/* ── FILL-BLANK ── */
function renderFillblank(qi,qd){
  const q=QUESTIONS[qd.i];
  const selWord=qd.selIdx!==undefined?q.wordBank[qd.selIdx]:null;
  const slot=`<span class="blank-slot${qd.answered?(qd.ok?' correct':' wrong'):(selWord?' filled':'')}" onclick="returnWord(${qi})">${selWord?esc(selWord):'_____'}</span>`;
  const text=q.text.replace('___BLANK___',slot);
  const pills=qd.bo.map(origIdx=>{const word=q.wordBank[origIdx];const used=qd.answered?(origIdx===q.correct):qd.selIdx===origIdx;return `<button class="word-pill${used?' used':''}" onclick="selectWord(${qi},${origIdx})" ${used||qd.answered?'disabled':''}>${esc(word)}</button>`;}).join('');
  const submitBtn=(!qd.answered&&selWord!==null)?`<button class="btn-submit-blank" onclick="submitBlank(${qi})">Submit</button>`:'';
  const expl=qd.answered?`<div class="explanation show ${qd.ok?'':'wrong'}"><div class="explanation-title">${qd.ok?'Correct':'Answer: '+esc(q.wordBank[q.correct])}</div><details class="show-explanation"><summary>Show explanation</summary><div class="explanation-text">${esc(q.explanation||'')}</div></details>${buildAskGoogle(q.domain||'',q.text)}</div>`:'';
  return `<div class="question" data-q="${qi}"><div class="question-num">Q${qi+1} of ${QUESTIONS.length}</div><div class="question-text fillblank-text">${text}</div><div class="word-bank">${pills}</div>${submitBtn}${expl}</div>`;
}
function selectWord(qi,origIdx){const qd=quizData[qi];if(qd.answered)return;qd.selIdx=origIdx;persist();reRender(`[data-q="${qi}"]`,renderFillblank(qi,qd));}
function returnWord(qi){const qd=quizData[qi];if(qd.answered)return;qd.selIdx=undefined;persist();reRender(`[data-q="${qi}"]`,renderFillblank(qi,qd));}
function submitBlank(qi){const qd=quizData[qi];if(qd.answered||qd.selIdx===undefined)return;const q=QUESTIONS[qd.i];qd.answered=true;qd.ok=qd.selIdx===q.correct;if(qd.ok)addXP(10);persist();reRender(`[data-q="${qi}"]`,renderFillblank(qi,qd));if(qd.ok){showXPToast(10,document.querySelector(`[data-q="${qi}"]`));announce('Correct');}else{announce('Incorrect — correct answer revealed');}updateProg();checkDone();}

/* ── HELPERS ── */
/* v2.1: Google search query no longer truncated (was capped at 150 chars in v2.0) */
function buildAskGoogle(domain,question){
  const q=encodeURIComponent(`${domain} ${question} explanation correct answer`);
  return `<a class="ag" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Ask Google for details</a>`;
}

/* ── PROGRESS ── */
function updateProg(){
  const rDone=_reviewCards.filter(r=>r.answered).length;
  const total=QUESTIONS.length+_reviewCards.length,done=countAnswered()+rDone;
  const fill=document.getElementById('progressFill'),label=document.getElementById('progressLabel'),score=document.getElementById('progressScore');
  if(fill)fill.style.width=Math.round(done/total*100)+'%';
  if(label)label.textContent=`${done} of ${total} answered`;
  if(score)score.textContent=`Score: ${countCorrect()} / ${countAnswered()||0}`;
  updateXPDisplay();
}
function checkDone(){if(countAnswered()===QUESTIONS.length&&_reviewCards.every(r=>r.answered))triggerConfetti();}

/* destructive friction: first click arms, second click confirms within 1500ms */
function _danger(btn, originalLabel, confirmLabel, action){
  if(!btn){ if(confirm(`${confirmLabel}?`)) action(); return; }
  if(btn.classList.contains('confirming')){
    btn.classList.remove('confirming');
    btn.textContent = originalLabel;
    if(btn._timer){clearTimeout(btn._timer);btn._timer=null;}
    action();
    return;
  }
  btn.classList.add('confirming');
  btn.dataset.origLabel = originalLabel;
  btn.textContent = `Confirm ${confirmLabel.toLowerCase()}?`;
  btn._timer = setTimeout(()=>{
    btn.classList.remove('confirming');
    btn.textContent = originalLabel;
    btn._timer = null;
  }, 1500);
}
function resetQuiz(btn){
  _danger(btn, 'Reset', 'Reset quiz', ()=>{
    try{localStorage.removeItem(storageKey());}catch{}
    Object.keys(_hintUsed).forEach(k=>delete _hintUsed[k]);
    quizData=buildFresh();persist();renderAll();
    const s=document.getElementById('quiz');if(s)window.scrollTo({top:s.offsetTop-20,behavior:'smooth'});
  });
}
function clearReviewQueue(btn){
  _danger(btn, 'Clear review', 'Clear queue', ()=>{
    localStorage.removeItem('hmp_review_pool');renderAll();
  });
}

/* ── CONFETTI ── (primary + warm only, 80 particles, 4s) */
function triggerConfetti(){
  const c=document.createElement('canvas');c.id='confettiCanvas';
  Object.assign(c.style,{position:'fixed',top:'0',left:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'9999'});
  document.body.appendChild(c);c.width=window.innerWidth;c.height=window.innerHeight;
  const ctx=c.getContext('2d');
  const css=getComputedStyle(document.documentElement);
  const primary=(css.getPropertyValue('--primary')||'#1e3a8a').trim();
  const warm=(css.getPropertyValue('--warm')||'#a23b1f').trim();
  const colors=[primary,warm,primary,warm,primary];
  const pieces=Array.from({length:80},()=>({x:Math.random()*c.width,y:-10-Math.random()*120,w:5+Math.random()*5,h:3+Math.random()*4,color:colors[Math.floor(Math.random()*colors.length)],vx:(Math.random()-.5)*2.4,vy:1.8+Math.random()*2.6,rot:Math.random()*Math.PI*2,rs:(Math.random()-.5)*.12,op:1}));
  const t0=Date.now(),DUR=4000;
  (function go(){const el=Date.now()-t0;ctx.clearRect(0,0,c.width,c.height);pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.rot+=p.rs;if(el>DUR*.65)p.op=Math.max(0,1-(el-DUR*.65)/(DUR*.35));ctx.save();ctx.globalAlpha=p.op;ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();});if(el<DUR)requestAnimationFrame(go);else c.remove();})();
}

/* ── INTERSECTION OBSERVER for question top-rule reveal ── */
function armQuestionObserver(){
  if(!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.question').forEach(q => io.observe(q));
}

/* ── INIT ── */
/* ── E3: screen-reader announce utility ── */
function announce(msg){
  const el=document.getElementById('srAnnounce');
  if(!el)return;
  el.textContent='';
  requestAnimationFrame(()=>{el.textContent=msg;});
}

document.addEventListener('DOMContentLoaded',()=>{
  if(typeof QUESTIONS==='undefined'){
    const el=document.getElementById('questionList');
    if(el)el.innerHTML='<div class="load-error"><span class="load-error-icon">⚠</span><span>Questions failed to load — refresh the page or reopen from the home page.</span></div>';
    return;
  }
  quizData=loadSaved()||buildFresh();persist();
  renderStudyMarkdown();
  renderAll();
  updateXPDisplay();
  initLivesMode(document.body.dataset.day||'0');
  document.addEventListener('keydown',handleKbdShortcut);
  armQuestionObserver();
});
