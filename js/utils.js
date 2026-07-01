// ─── UTILS ────────────────────────────────────────────────────────────────────
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
