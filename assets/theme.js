/* ============================================================
   theme.js — three-state theme (system / light / dark)
   Sun & moon SVG painted into #themeIcon, label into #themeLabel.
   No View Transitions API — relies on CSS color transitions.
   ============================================================ */
(function(){
  const SUN  = '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.6 2.6l1.4 1.4M12 12l1.4 1.4M2.6 13.4l1.4-1.4M12 4l1.4-1.4"/>';
  const MOON = '<path d="M13 9.5A5 5 0 117 3.5a4 4 0 006 6z"/>';
  const SYS  = '<rect x="2" y="3" width="12" height="9" rx="1"/><path d="M6 14h4M8 12v2"/>';

  function getMode(){ return localStorage.getItem('hmp_theme') || 'system'; }
  function effective(mode){
    if(mode==='system') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return mode;
  }
  function apply(){
    const mode = getMode();
    document.documentElement.classList.toggle('dark', effective(mode)==='dark');
    paintToggle(mode);
  }
  function paintToggle(mode){
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if(icon){
      icon.innerHTML = mode==='light' ? SUN : (mode==='dark' ? MOON : SYS);
    }
    if(label){
      label.textContent = mode==='system' ? 'Auto' : (mode==='light' ? 'Light' : 'Dark');
    }
  }

  /* initial paint — before DOMContentLoaded the html.dark class avoids a flash */
  document.documentElement.classList.toggle('dark', effective(getMode())==='dark');
  document.addEventListener('DOMContentLoaded', apply);

  /* expose */
  window.toggleTheme = function(){
    const cur = getMode();
    const next = cur==='system' ? 'light' : (cur==='light' ? 'dark' : 'system');
    localStorage.setItem('hmp_theme', next);
    apply();
  };

  /* react to OS theme change when in system mode */
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if(getMode()==='system') apply();
  });
})();

window.registerSW = function(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }
};
