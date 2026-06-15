/* ============================================================
   nav.js — shared sidebar navigation
   v3 · collapsible (Ctrl+\), restore-state, tooltips when collapsed,
        per-day note count badges, current-day highlighting.
   ============================================================ */

// {{NAV_DAYS_START}}
const NAV_DAYS = [
  { num: 1, title: "TOPIC TITLE HERE", file: "day1", isMock: false },
  { num: 0, title: "Mock Tests",       file: "dayN", isMock: true  },
];
// {{NAV_DAYS_END}}

function noteCountForDay(num){
  return Object.keys(localStorage).filter(k=>k.startsWith(`hmp_note_${num}_`)&&localStorage.getItem(k)).length;
}

/* returns "X/30" status for sidebar tooltip */
function dayProgress(file){
  try{
    const raw = localStorage.getItem(`hmp_quiz_${file}`);
    if(!raw) return null;
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return null;
    const done = arr.filter(d=>d&&d.answered).length;
    return `${done}/${arr.length}`;
  }catch{ return null; }
}

function buildNav(){
  const root=document.getElementById('navRoot');if(!root)return;
  const currentPage=(location.pathname.split('/').pop()||'index.html').replace('.html','');
  const html=NAV_DAYS.map(d=>{
    const isCurrent=currentPage===d.file;
    const noteN=d.isMock?0:noteCountForDay(d.num);
    const noteBadge=noteN?`<span class="nav-note-count" title="${noteN} note${noteN>1?'s':''}">${noteN}n</span>`:'';
    const prog=dayProgress(d.file);
    const tip=d.isMock?`Day ${d.num} · Mock Tests`:`Day ${d.num} · ${d.title}${prog?` · ${prog}`:''}`;
    const subItems=d.isMock
      ?[{label:'Mock 1',href:`${d.file}.html#mock1`},{label:'Mock 2',href:`${d.file}.html#mock2`}]
      :[{label:'Study',href:`${d.file}.html#study`},{label:'Quiz',href:`${d.file}.html#quiz`}];
    const subHtml=subItems.map(s=>`<li><a href="${s.href}" class="${isCurrent?'current':''}">${s.label}</a></li>`).join('');
    const num=d.isMock?'M':String(d.num).padStart(2,'0');
    return `<div class="nav-day ${isCurrent?'open':''}"><button class="nav-day-header ${isCurrent?'active':''}" onclick="toggleNavDay(this)" aria-expanded="${isCurrent}" data-tip="${tip}"><span class="nav-day-title"><span class="day-num">${num}</span><span>${d.isMock?'Mock Tests':d.title}</span></span>${noteBadge}<span class="chevron">›</span></button><ul class="nav-sublist">${subHtml}</ul></div>`;
  }).join('');
  root.innerHTML=html;
}

function toggleNavDay(btn){
  const day=btn.closest('.nav-day');
  day.classList.toggle('open');
  btn.setAttribute('aria-expanded',day.classList.contains('open'));
}

/* mobile slide-in / out */
function toggleSidebar(){
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('backdrop')?.classList.toggle('show');
}

/* desktop collapse / expand */
function toggleNavCollapse(){
  const app=document.querySelector('.app');if(!app)return;
  app.classList.toggle('nav-collapsed');
  localStorage.setItem('hmp_nav_collapsed', app.classList.contains('nav-collapsed') ? '1' : '0');
}

/* restore collapsed state on load */
function restoreNavCollapse(){
  if(localStorage.getItem('hmp_nav_collapsed')==='1'){
    document.querySelector('.app')?.classList.add('nav-collapsed');
  }
}

/* keyboard shortcut: Ctrl+\ or ⌘+\ */
document.addEventListener('keydown', e=>{
  if((e.metaKey||e.ctrlKey) && e.key==='\\'){
    if(e.target.matches('input,textarea,[contenteditable]')) return;
    e.preventDefault();
    toggleNavCollapse();
  }
});

document.addEventListener('DOMContentLoaded', ()=>{
  restoreNavCollapse();
  buildNav();
});
