// ─── WORKOUT ──────────────────────────────────────────────────────────────────
function chWorkoutMonth(d){wM+=d;if(wM>11){wM=0;wY++;}if(wM<0){wM=11;wY--;}renderWorkout();}

function renderWorkout(){
  document.getElementById('workoutMonthLabel').textContent=`${wY}년 ${wM+1}월`;
  const mc=document.getElementById('workoutMain');mc.innerHTML='';
  const calCard=buildWorkoutCal();calCard.classList.add('card-wide');mc.appendChild(calCard);
  mc.appendChild(buildWorkoutStats());
}

function buildWorkoutStats(){
  const dim=new Date(wY,wM+1,0).getDate();
  const counts={};
  for(let d=1;d<=dim;d++){S.getWorkout(wY,wM,d).forEach(w=>{counts[w.type]=(counts[w.type]||0)+1;});}
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const card=mkDiv('card');card.innerHTML='<div class="card-header"><span class="card-title">종목별 통계</span></div>';
  const inner=document.createElement('div');inner.style.cssText='padding:12px 16px 16px;display:flex;flex-direction:column;gap:9px;';
  if(!total){inner.innerHTML='<div class="empty">이번 달 운동 기록이 없어요</div>';}
  else{
    Object.keys(WORKOUT_EMOJIS).forEach(t=>{
      const c=counts[t]||0;
      if(!c)return;
      const pct=Math.round(c/total*100);
      const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;';
      row.innerHTML=`<span style="font-size:16px;width:20px;flex-shrink:0;">${WORKOUT_EMOJIS[t]}</span><span style="font-size:12px;font-weight:600;width:44px;flex-shrink:0;">${t}</span><div style="flex:1;height:6px;background:#f0f0f5;border-radius:99px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--expense);border-radius:99px;"></div></div><span style="font-size:11px;font-weight:800;color:var(--expense);min-width:34px;text-align:right;">${c}회</span>`;
      inner.appendChild(row);
    });
  }
  card.appendChild(inner);return card;
}

function buildWorkoutCal(){
  const fd=new Date(wY,wM,1).getDay();
  const dim=new Date(wY,wM+1,0).getDate();
  const card=mkDiv('card');
  card.innerHTML=`<div class="card-header" style="padding-bottom:4px"><span class="card-title">🏋️ ${wY}년 ${wM+1}월 운동기록</span></div>`;
  const dowRow=mkDiv('cal-dow-row');
  ['일','월','화','수','목','금','토'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===0?'sun':i===6?'sat':''}`);e.textContent=d;dowRow.appendChild(e);});
  card.appendChild(dowRow);
  const grid=mkDiv('cal-grid');
  for(let i=0;i<fd;i++)grid.appendChild(mkDiv('cal-cell empty'));
  for(let d=1;d<=dim;d++){
    const dow2=(fd+d-1)%7;
    const isT=TODAY.getFullYear()===wY&&TODAY.getMonth()===wM&&TODAY.getDate()===d;
    const workouts=S.getWorkout(wY,wM,d);
    const hasW=workouts.length>0;
    const cell=mkDiv(`cal-cell workout-cal-cell ${isT?'today':''} ${hasW?'has-workout':''} ${dow2===0?'sun':''} ${dow2===6?'sat':''}`);
    cell.onclick=()=>openWorkoutPopup(wY,wM,d);
    const dayEl=mkDiv('cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    if(hasW){
      const icon=mkDiv('workout-icon');icon.textContent=[...new Set(workouts.map(w=>WORKOUT_EMOJIS[w.type]||'🥊'))].join('');cell.appendChild(icon);
      const memo2=mkDiv('cal-nodeal');memo2.style.cssText='font-size:7.5px;color:var(--expense);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-top:2px;';memo2.textContent=workouts.map(w=>w.type).join(', ');cell.appendChild(memo2);
    }
    grid.appendChild(cell);
  }
  card.appendChild(grid);
  // summary
  let totalDays=0;
  for(let d=1;d<=dim;d++){if(S.getWorkout(wY,wM,d).length>0)totalDays++;}
  const footer=mkDiv('fixed-footer');footer.innerHTML=`<span class="fixed-footer-label">이번 달 운동 횟수</span><span class="fixed-footer-val">${totalDays}회</span>`;
  card.appendChild(footer);return card;
}

function openWorkoutPopup(y,m,d){
  workoutCtx={y,m,d};
  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('workoutPopupDate').textContent=`${y}년 ${months[m]} ${d}일`;

  const listEl = document.getElementById('workoutPopupList');
  listEl.innerHTML = '';
  const workouts = S.getWorkout(y,m,d);
  if(workouts.length === 0) {
    addWorkoutField();
  } else {
    workouts.forEach(w => addWorkoutField(w.type, w.memo));
  }
  const actions=document.getElementById('workoutPopupActions');
  actions.innerHTML = workouts.length ? `<button onclick="editWorkoutDate()">📅 날짜 변경</button><button class="danger" onclick="deleteWorkoutDay()">${icon('trash-2',14)} 이 날 기록 삭제</button>` : '';

  document.getElementById('workoutPopup').classList.add('open');
}
// 잘못 입력한 날짜의 운동 기록 전체를 다른 날짜로 이동
function editWorkoutDate(){
  const{y,m,d}=workoutCtx;
  const cur=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const input=prompt('날짜를 수정해줘 (YYYY-MM-DD)',cur);
  if(!input)return;
  const mch=input.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(!mch){alert('날짜 형식이 올바르지 않아요 (예: 2026-07-15)');return;}
  const newY=parseInt(mch[1]),newM=parseInt(mch[2])-1,newD=parseInt(mch[3]);
  const dim=new Date(newY,newM+1,0).getDate();
  if(newM<0||newM>11||newD<1||newD>dim){alert('날짜가 올바르지 않아요');return;}
  if(newY===y&&newM===m&&newD===d){document.getElementById('workoutPopup').classList.remove('open');return;}
  const current=S.getWorkout(y,m,d);
  const target=S.getWorkout(newY,newM,newD);
  if(target.length&&!confirm('이미 그 날짜에 운동 기록이 있어요. 합쳐서 저장할까요?'))return;
  S.setWorkout(newY,newM,newD,[...target,...current]);
  S.setWorkout(y,m,d,[]);
  let c1=S.getRoutine(y,m,d);c1=c1.filter(x=>x!=='r08');S.setRoutine(y,m,d,c1);
  let c2=S.getRoutine(newY,newM,newD);if(!c2.includes('r08'))c2.push('r08');S.setRoutine(newY,newM,newD,c2);
  document.getElementById('workoutPopup').classList.remove('open');
  renderWorkout();
}
function deleteWorkoutDay(){
  const{y,m,d}=workoutCtx;
  if(!confirm('이 날짜의 운동 기록을 전부 삭제할까요?'))return;
  S.setWorkout(y,m,d,[]);
  let c=S.getRoutine(y,m,d);c=c.filter(x=>x!=='r08');S.setRoutine(y,m,d,c);
  document.getElementById('workoutPopup').classList.remove('open');
  renderWorkout();
}
function closeWorkoutPopup(e){if(e.target===document.getElementById('workoutPopup'))document.getElementById('workoutPopup').classList.remove('open');}
function addWorkoutField(type = '러닝', memo = '') {
  const listEl = document.getElementById('workoutPopupList');
  const row = document.createElement('div');
  row.className = 'workout-item-row';
  row.style.cssText = 'background:var(--bg);padding:12px;border-radius:12px;position:relative;';
  const types = ['러닝', '홈트', '걷기', '자전거', '등산', '클라이밍'];
  const typeHtml = types.map(t => `<button class="workout-type ${t===type?'active':''}" data-type="${t}" onclick="selWType(this)">${WORKOUT_EMOJIS[t]} ${t}</button>`).join('');
  row.innerHTML = `<button style="position:absolute;top:8px;right:8px;background:none;border:none;color:#9ea3b8;font-size:18px;cursor:pointer;padding:4px;" onclick="this.parentElement.remove()">✕</button><div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">운동 종류</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px">${typeHtml}</div><input class="fi workout-memo-input" style="background:#fff" placeholder="강도 및 시간 (예: 5km, 30분)" value="${memo}">`;
  listEl.appendChild(row);
}
function selWType(btn) {
  btn.parentElement.querySelectorAll('.workout-type').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function saveWorkoutMemo(){
  const{y,m,d}=workoutCtx;
  const rows = document.querySelectorAll('.workout-item-row');
  const items = Array.from(rows).map(row => ({type: row.querySelector('.workout-type.active')?.dataset.type || '러닝', memo: row.querySelector('.workout-memo-input').value.trim()}));
  S.setWorkout(y,m,d,items);
  let c=S.getRoutine(y,m,d);
  if(items.length>0&&!c.includes('r08'))c.push('r08');
  else if(items.length===0)c=c.filter(x=>x!=='r08');
  S.setRoutine(y,m,d,c);
  document.getElementById('workoutPopup').classList.remove('open');
  renderWorkout();
}
