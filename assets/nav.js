/* ============================================
   Shared sidebar navigation + helpers
   v2 — per-day note count badges
   ============================================ */

// {{NAV_DAYS_START}}
// Replace this array with one entry per day.
// - Days 1 to (n-1): { num, title, file, isMock: false }
// - Day n:           { num, title, file, isMock: true }
const NAV_DAYS = [
  { num: 1, title: "TOPIC TITLE HERE", file: "day1", isMock: false },
  { num: 0, title: "Mock Tests",       file: "dayN", isMock: true  },
];
// {{NAV_DAYS_END}}

function noteCountForDay(num){
  return Object.keys(localStorage).filter(k=>k.startsWith(`hmp_note_${num}_`)&&localStorage.getItem(k)).length;
}

function buildNav(){
  const root=document.getElementById('navRoot');if(!root)return;
  const currentPage=(location.pathname.split('/').pop()||'index.html').replace('.html','');
  const html=NAV_DAYS.map(d=>{
    const isCurrent=currentPage===d.file;
    const noteN=d.isMock?0:noteCountForDay(d.num);
    const noteBadge=noteN?`<span class="nav-note-count" title="${noteN} note${noteN>1?'s':''}">📝${noteN}</span>`:'';
    const subItems=d.isMock
      ?[{label:'Mock Test 1',href:`${d.file}.html#mock1`},{label:'Mock Test 2',href:`${d.file}.html#mock2`}]
      :[{label:'Study',href:`${d.file}.html#study`},{label:'Quiz',href:`${d.file}.html#quiz`}];
    const subHtml=subItems.map(s=>`<li><a href="${s.href}" class="${isCurrent?'current':''}">${s.label}</a></li>`).join('');
    return `<div class="nav-day ${isCurrent?'open':''}"><button class="nav-day-header ${isCurrent?'active':''}" onclick="toggleNavDay(this)" aria-expanded="${isCurrent}"><span class="nav-day-title"><span class="day-num">${d.num}</span><span>Day ${d.num} · ${d.title}</span></span>${noteBadge}<span class="chevron">›</span></button><ul class="nav-sublist">${subHtml}</ul></div>`;
  }).join('');
  root.innerHTML=html;
}
function toggleNavDay(btn){const day=btn.closest('.nav-day');day.classList.toggle('open');btn.setAttribute('aria-expanded',day.classList.contains('open'));}
function toggleSidebar(){document.getElementById('sidebar')?.classList.toggle('open');document.getElementById('backdrop')?.classList.toggle('show');}
document.addEventListener('DOMContentLoaded',buildNav);
