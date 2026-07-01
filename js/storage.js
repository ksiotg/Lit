// ─── STORAGE ──────────────────────────────────────────────────────────────────
const mk=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`;
const dk=(y,m,d)=>`${mk(y,m)}-${String(d).padStart(2,'0')}`;
const S={
  getChecked(y,m){try{return JSON.parse(localStorage.getItem('ck_'+mk(y,m))||'[]')}catch{return[]}},
  setChecked(y,m,a){localStorage.setItem('ck_'+mk(y,m),JSON.stringify(a))},
  getEntries(y,m){try{return JSON.parse(localStorage.getItem('en_'+mk(y,m))||'[]')}catch{return[]}},
  setEntries(y,m,a){localStorage.setItem('en_'+mk(y,m),JSON.stringify(a))},
  getRoutine(y,m,d){try{return JSON.parse(localStorage.getItem('rt_'+dk(y,m,d))||'[]')}catch{return[]}},
  setRoutine(y,m,d,a){localStorage.setItem('rt_'+dk(y,m,d),JSON.stringify(a))},
  getWorkout(y,m,d){
    const v=localStorage.getItem('wo_'+dk(y,m,d));
    if(!v) return [];
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [{type:'러닝', memo:p}];
    } catch {
      return [{type:'러닝', memo:v}];
    }
  },
  setWorkout(y,m,d,v){localStorage.setItem('wo_'+dk(y,m,d),JSON.stringify(v))},
  getReview(y,m,d){try{const v=localStorage.getItem('rv_'+dk(y,m,d));return v?JSON.parse(v):null;}catch{return null;}},
  setReview(y,m,d,v){localStorage.setItem('rv_'+dk(y,m,d),JSON.stringify(v))},
  getWeekStreak(){try{return parseInt(localStorage.getItem('week_streak')||'0');}catch{return 0;}},
  setWeekStreak(n){localStorage.setItem('week_streak',String(n))},
};
