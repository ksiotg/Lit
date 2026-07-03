// ─── UTILS ────────────────────────────────────────────────────────────────────
// Feather Icons(https://feathericons.com/)를 인라인 SVG로 직접 임베드해서 사용.
// innerHTML 템플릿 문자열로 화면을 자주 다시 그리는 구조라 feather.replace() 같은
// 런타임 치환 방식은 누락되기 쉬워서, 문자열을 바로 심는 방식을 씀.
// stroke="currentColor"라 버튼의 글자색을 그대로 물려받아 튀지 않음.
const FEATHER_ICONS={
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  'trash-2':'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  'plus-circle':'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  'x-circle':'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
};
function icon(name,size=15,extraStyle=''){
  const d=FEATHER_ICONS[name];
  if(!d)return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;flex-shrink:0;${extraStyle}">${d}</svg>`;
}
const fmt=n=>'₩'+Math.abs(n).toLocaleString('ko-KR');
const shortFmt=n=>(Math.abs(n)/10000).toLocaleString('ko-KR',{maximumFractionDigits:1});
const mkDiv=(cls,html='')=>{const d=document.createElement('div');d.className=cls;if(html)d.innerHTML=html;return d;};
function getWeekStart(y,m,d){
  // Monday-based week
  const date=new Date(y,m,d);
  const dow=date.getDay();
  const diff=dow===0?-6:1-dow;
  const mon=new Date(date);mon.setDate(d+diff);
  return mon;
}
function getWeekOfMonth(y,m,d){
  // 1-7일은 1주차, 8-14일은 2주차... 로 계산하는 간단한 방식
  return Math.ceil(d / 7);
}
function isNoDeal(y,m,d){
  const entries=S.getEntries(y,m);
  return !entries.some(e=>e.type==='expense'&&e.day===d);
}
function getRoutineChecked(r,y,m,d){
  if(r.autoFromBudget) return isNoDeal(y,m,d);
  if(r.autoFromReview) return !!S.getReview(y,m,d);
  return S.getRoutine(y,m,d).includes(r.id);
}

// index.html에 정적으로 박혀있는 <span class="ico" data-icon="..." data-size="..."></span>
// 자리를 실제 Feather 아이콘 SVG로 한 번 채워넣음. (동적으로 다시 그려지는 부분은 각 JS에서
// icon() 함수를 직접 호출해서 채우고, 여긴 페이지 최초 로드 시 한 번만 실행됨)
function renderStaticIcons(){
  document.querySelectorAll('.ico[data-icon]').forEach(el=>{
    const extra=el.dataset.color?`color:${el.dataset.color};`:'';
    el.outerHTML=icon(el.dataset.icon,parseInt(el.dataset.size)||15,extra);
  });
}
