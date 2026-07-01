// ─── STORAGE (Supabase 연동) ──────────────────────────────────────────────────
// localStorage 대신 Supabase의 kv_store 테이블에 저장. 화면 렌더링 함수들은
// 전부 동기적으로 S.get*()를 호출하므로, 로그인 시 전체 데이터를 메모리 캐시로
// 한번에 불러온 뒤(Storage.loadAll) 그 캐시를 읽고 쓰는 방식으로 동작함.
// 쓰기는 캐시에 즉시 반영 + Supabase로는 백그라운드에서 비동기 전송.
const mk=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`;
const dk=(y,m,d)=>`${mk(y,m)}-${String(d).padStart(2,'0')}`;

const Storage={
  _cache:{},
  _userId:null,

  async loadAll(userId){
    this._userId=userId;
    this._cache={};
    const {data,error}=await sb.from('kv_store').select('key,value').eq('user_id',userId);
    if(error){console.error('불러오기 실패',error);return;}
    data.forEach(row=>{this._cache[row.key]=row.value;});
  },

  _get(key,fallback){
    return this._cache.hasOwnProperty(key)?this._cache[key]:fallback;
  },

  _set(key,value){
    this._cache[key]=value;
    if(!this._userId)return;
    sb.from('kv_store')
      .upsert({user_id:this._userId,key,value,updated_at:new Date().toISOString()},{onConflict:'user_id,key'})
      .then(({error})=>{if(error)console.error('저장 실패',key,error);});
  },
};

function getRoutines(){
  return Storage._get('custom_routines',null)||DEFAULT_ROUTINES;
}
function saveRoutines(arr){Storage._set('custom_routines',arr);}

const S={
  getChecked(y,m){return Storage._get('ck_'+mk(y,m),[])},
  setChecked(y,m,a){Storage._set('ck_'+mk(y,m),a)},
  getEntries(y,m){return Storage._get('en_'+mk(y,m),[])},
  setEntries(y,m,a){Storage._set('en_'+mk(y,m),a)},
  getRoutine(y,m,d){return Storage._get('rt_'+dk(y,m,d),[])},
  setRoutine(y,m,d,a){Storage._set('rt_'+dk(y,m,d),a)},
  getWorkout(y,m,d){
    const v=Storage._get('wo_'+dk(y,m,d),null);
    if(!v)return [];
    return Array.isArray(v)?v:[{type:'러닝',memo:v}];
  },
  setWorkout(y,m,d,v){Storage._set('wo_'+dk(y,m,d),v)},
  getReview(y,m,d){return Storage._get('rv_'+dk(y,m,d),null)},
  setReview(y,m,d,v){Storage._set('rv_'+dk(y,m,d),v)},
  getWeekStreak(){return Storage._get('week_streak',0)},
  setWeekStreak(n){Storage._set('week_streak',n)},
};
