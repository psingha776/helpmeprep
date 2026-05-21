/* ============================================================
   theme.js — dark mode toggle + service-worker registration
   ============================================================ */
(function(){
  const stored=localStorage.getItem('hmp_theme');
  if(stored==='dark'||(!stored&&matchMedia('(prefers-color-scheme: dark)').matches)){
    document.documentElement.classList.add('dark');
  }
})();
function toggleTheme(){
  const root=document.documentElement;
  root.classList.toggle('dark');
  localStorage.setItem('hmp_theme',root.classList.contains('dark')?'dark':'light');
}
window.registerSW=function(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }
};
