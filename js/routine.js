// ─── ROUTINE ──────────────────────────────────────────────────────────────────
function chRoutineMonth(d){rM+=d;if(rM>11){rM=0;rY++;}if(rM<0){rM=11;rY--;}curWeekStart=null;renderRoutine();}
function goToTodayRoutine(){rY=TODAY.getFullYear();rM=TODAY.getMonth();curWeekStart=null;renderRoutine();}

// 주간 스트릭: 이미 끝난 주(지난주부터) 기준, 전체 루틴 달성률이 60% 이상인 주가 연속 몇 주인지 계산
function calcRoutineWeekStreak(){
  let streak=0;
  for(let w=1;w<=52;w++){
    const ref=new Date(TODAY);ref.setDate(ref.getDate()-7*w);
    const ws=getWeekStart(ref.getFullYear(),ref.getMonth(),ref.getDate());
    const days=[];for(let i=0;i<7;i++){const dd=new Date(ws);dd.setDate(ws.getDate()+i);days.push(dd);}
    let totalGoal=0,totalDone=0;
    ROUTINES.forEach(r=>{
      let weekCount=0;
      days.forEach(dd=>{if(getRoutineChecked(r,dd.getFullYear(),dd.getMonth(),dd.getDate()))weekCount+=1;});
      totalDone+=Math.min(weekCount,r.goal);
      totalGoal+=r.goal;
    });
    const pct=totalGoal?totalDone/totalGoal*100:0;
    if(pct>=60)streak++; else break;
  }
  return streak;
}

function chRoutineWeek(d){
  if(!curWeekStart)return;
  curWeekStart.setDate(curWeekStart.getDate()+(d*7));
  renderRoutine();
}

function setRoutineView(v){
  rView=v;
  rSyncViewButtons();
  renderRoutine();
}
function rSyncViewButtons(){
  document.getElementById('rvbtn-week').classList.toggle('active',rView==='week');
  document.getElementById('rvbtn-month').classList.toggle('active',rView==='month');
}

function renderRoutine(){
  document.getElementById('routineMonthLabel').textContent=`${rY}년 ${rM+1}월`;
  const mc=document.getElementById('routineMain');mc.innerHTML='';
  if(rView==='month'){
    // 월간 루틴 탭: 요일별 그리드 없이, "이번 달에 했는지 + 언제 했는지"만 보여주는 화면
    const mrCalCard=buildMonthlyRoutineCal();mrCalCard.classList.add('card-wide');mc.appendChild(mrCalCard);
    const mrCard=buildMonthlyRoutineCard();mrCard.classList.add('card-wide');mc.appendChild(mrCard);
    return;
  }
  if(!curWeekStart){
    const refDate=new Date(rY,rM,(rY===TODAY.getFullYear()&&rM===TODAY.getMonth())?TODAY.getDate():1);
    curWeekStart=getWeekStart(rY,rM,refDate.getDate());
  }
  // PC 대시보드에서는 전부 넓게 봐야 하는 위젯들이라 card-wide로 표시함
  // 달력을 맨 위로 올려서 한눈에 이번 달 상황부터 보이게 함
  const calCard=buildRoutineCal();calCard.classList.add('card-wide');mc.appendChild(calCard);
  const tableCard=buildRoutineTable();tableCard.classList.add('card-wide');mc.appendChild(tableCard);
  const achCard=buildMonthlyAchievement();achCard.classList.add('card-wide');mc.appendChild(achCard);
}

// ─── 루틴 탭: 월간 루틴 (요일 무관, "이번 달에 했는지 + 언제 했는지"만 체크) ─────
let editingMrId=null;
let editingMrDateId=null;
// 등록 폼에서 현재 선택된 고정 스케줄 규칙 타입 ('day'=매달 N일 / 'nth'=매달 N번째 요일)
let mrScheduleType='day';

// 월간 루틴 "고정 스케줄" — 가계부 고정지출과 같은 개념: 규칙으로 계획일(예정일)만 자동 계산해서
// 보여주고, 실제 완료 처리는 기존 toggleMonthlyRoutine 흐름 그대로(체크한 날짜=완료일) 둠.
// schedule 형태: {type:'day', day:N} 또는 {type:'nth', nth:1~5|-1(마지막), dow:0~6(일~토)}
function computeScheduledDay(schedule,y,m){
  if(!schedule)return null;
  const dim=new Date(y,m+1,0).getDate();
  if(schedule.type==='day'){
    return Math.min(schedule.day,dim);
  }
  if(schedule.type==='nth'){
    const matches=[];
    for(let d=1;d<=dim;d++){
      if(new Date(y,m,d).getDay()===schedule.dow)matches.push(d);
    }
    if(!matches.length)return null;
    if(schedule.nth===-1)return matches[matches.length-1];
    return matches[schedule.nth-1]||null;
  }
  return null;
}
// 규칙을 사람이 읽는 문구로 변환 (등록 폼/목록 표시용)
function scheduleLabel(schedule){
  if(!schedule)return '';
  if(schedule.type==='day')return `${schedule.day}일`;
  if(schedule.type==='nth'){
    const nthLabel={1:'첫째주',2:'둘째주',3:'셋째주',4:'넷째주',5:'다섯째주','-1':'마지막주'}[schedule.nth]||'';
    const dowLabel=['일','월','화','수','목','금','토'][schedule.dow];
    return `${nthLabel} ${dowLabel}요일`;
  }
  return '';
}
function toggleMrScheduleFields(){
  const on=document.getElementById('mrScheduleToggle').checked;
  document.getElementById('mrScheduleFields').style.display=on?'block':'none';
}
function setMrScheduleType(type){
  mrScheduleType=type;
  document.getElementById('mrSchTypeBtn-day').classList.toggle('active',type==='day');
  document.getElementById('mrSchTypeBtn-nth').classList.toggle('active',type==='nth');
  document.getElementById('mrSchDayWrap').style.display=type==='day'?'block':'none';
  document.getElementById('mrSchNthWrap').style.display=type==='nth'?'grid':'none';
}

// S.getMonthlyDone(y,m)는 [{id, day}] 형태로 저장됨(day=완료한 날짜의 일자).
// 혹시 남아있을 수 있는 예전 형태(순수 id 문자열 배열) 데이터도 깨지지 않게 방어적으로 변환.
function mrDoneList(y,m){
  return S.getMonthlyDone(y,m).map(x=>typeof x==='string'?{id:x,day:1}:x);
}

function buildMonthlyRoutineCard(){
  const card=mkDiv('card');
  const done=mrDoneList(rY,rM);
  const total=MONTHLY_ROUTINES.length;
  const doneCount=MONTHLY_ROUTINES.filter(r=>done.some(x=>x.id===r.id)).length;
  const header=mkDiv('card-header');
  header.innerHTML=`<span class="card-title">이번 달 루틴</span>`;
  if(total>0){
    const badge=mkDiv('streak-badge');badge.textContent=`${doneCount}/${total} 완료`;
    header.appendChild(badge);
  }
  card.appendChild(header);

  const list=document.createElement('div');
  list.style.cssText='padding:12px 16px 4px;';
  if(!total){
    list.innerHTML='<div class="empty">등록된 월간 루틴이 없어요</div>';
  }else{
    MONTHLY_ROUTINES.forEach(r=>{
      const doneEntry=done.find(x=>x.id===r.id);
      const isDone=!!doneEntry;
      const item=mkDiv('rmgmt-item');
      item.style.cursor='pointer';
      item.onclick=()=>toggleMonthlyRoutine(r.id);
      const dateBadge=isDone?`<button class="mr-date-badge" onclick="event.stopPropagation();openMonthlyRoutineDateEdit('${r.id}')" title="완료 날짜 수정">${rM+1}/${doneEntry.day} 완료 <span style="text-decoration:underline;">수정</span></button>`:'';
      let scheduleHint='';
      if(!isDone&&r.schedule){
        const sd=computeScheduledDay(r.schedule,rY,rM);
        scheduleHint=`<div class="mr-schedule-hint">${icon('calendar',11)} ${scheduleLabel(r.schedule)}${sd?` · ${rM+1}/${sd} 예정`:' · 이번 달엔 해당 없음'}</div>`;
      }
      item.innerHTML=`<div class="mr-check ${isDone?'done':''}">${isDone?'✓':''}</div><div class="rmgmt-icon">${r.emoji}</div><div class="rmgmt-info"><div class="rmgmt-name mr-item-name ${isDone?'done':''}">${r.name}</div>${dateBadge}${scheduleHint}</div><div style="display:flex;align-items:center;gap:2px;"><button class="mr-icon" onclick="event.stopPropagation();editMonthlyRoutineStart('${r.id}')" title="수정">${icon('edit',14)}</button><button class="mr-icon del" onclick="event.stopPropagation();deleteMonthlyRoutine('${r.id}')" title="삭제">${icon('x-circle',15)}</button></div>`;
      list.appendChild(item);
    });
  }
  card.appendChild(list);

  const addWrap=document.createElement('div');
  addWrap.style.cssText='padding:4px 16px 16px;';
  addWrap.innerHTML=`<button class="add-btn" style="background:var(--bg);color:var(--text);margin-top:0;" onclick="openMonthlyRoutineForm()"><span class="ico" data-icon="plus-circle" data-size="14" data-color="var(--routine)"></span> 월간 루틴 추가</button>`;
  card.appendChild(addWrap);
  // addWrap 안의 아이콘은 정적 렌더링(renderStaticIcons) 시점 이후에 추가되므로 직접 채워야 함
  addWrap.querySelectorAll('.ico[data-icon]').forEach(el=>{
    const extra=el.dataset.color?`color:${el.dataset.color};`:'';
    el.outerHTML=icon(el.dataset.icon,parseInt(el.dataset.size)||15,extra);
  });
  return card;
}

// 이번 달에 어느 날 어떤 월간 루틴을 완료했는지 보여주는 캘린더 (운동 탭 달력과 같은 패턴:
// 그날 완료한 루틴들의 이모지를 나열해서 항목별로 구분되게 표시)
function buildMonthlyRoutineCal(){
  const fd=new Date(rY,rM,1).getDay();
  const fdMon=fd===0?6:fd-1;
  const dim=new Date(rY,rM+1,0).getDate();
  const done=mrDoneList(rY,rM);
  const card=mkDiv('card');
  const dowRow=mkDiv('cal-dow-row');
  dowRow.style.paddingTop='14px';
  ['월','화','수','목','금','토','일'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===5?'sat':i===6?'sun':''}`);e.textContent=d;dowRow.appendChild(e);});
  card.appendChild(dowRow);
  const grid=mkDiv('cal-grid');
  for(let i=0;i<fdMon;i++)grid.appendChild(mkDiv('cal-cell empty'));
  for(let d=1;d<=dim;d++){
    const dow2=(fdMon+d-1)%7;
    const isT=TODAY.getFullYear()===rY&&TODAY.getMonth()===rM&&TODAY.getDate()===d;
    const doneToday=done.filter(x=>x.day===d).map(x=>MONTHLY_ROUTINES.find(r=>r.id===x.id)).filter(Boolean);
    // 고정 스케줄이 걸려있고 이번 달에 아직 체크 안 된 루틴 중, 오늘이 계획일(예정일)인 것들 —
    // 달성 전이라 옅게(50% 투명도) 미리보기로 표시해두고, 체크하면 doneToday 쪽으로 넘어가 진하게 바뀜.
    const scheduledToday=MONTHLY_ROUTINES.filter(r=>r.schedule&&!done.some(x=>x.id===r.id)&&computeScheduledDay(r.schedule,rY,rM)===d);
    const hasMr=doneToday.length>0||scheduledToday.length>0;
    const cell=mkDiv(`cal-cell mr-cal-cell ${isT?'today':''} ${hasMr?'has-mr':''} ${dow2===5?'sat':''} ${dow2===6?'sun':''}`);
    cell.onclick=()=>openMonthlyRoutineDayDetail(rY,rM,d);
    const dayEl=mkDiv('cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    if(hasMr){
      const iconEl=mkDiv('mr-cal-icon');
      iconEl.innerHTML=doneToday.map(r=>`<span style="opacity:1">${r.emoji}</span>`).join('')+scheduledToday.map(r=>`<span style="opacity:.5">${r.emoji}</span>`).join('');
      cell.appendChild(iconEl);
    }
    grid.appendChild(cell);
  }
  card.appendChild(grid);
  return card;
}

function openMonthlyRoutineDayDetail(y,m,d){
  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('mrDayTitle').textContent=`${y}년 ${months[m]} ${d}일`;
  const done=mrDoneList(y,m).filter(x=>x.day===d).map(x=>MONTHLY_ROUTINES.find(r=>r.id===x.id)).filter(Boolean);
  const content=document.getElementById('mrDayContent');
  if(!done.length){
    content.innerHTML='<div class="empty">이 날 완료한 월간 루틴이 없어요</div>';
  }else{
    content.innerHTML=done.map(r=>`<div class="rmgmt-item" style="margin-bottom:0;"><div class="rmgmt-icon">${r.emoji}</div><div class="rmgmt-info"><div class="rmgmt-name">${r.name}</div></div></div>`).join('');
  }
  document.getElementById('mrDayPopup').classList.add('open');
}
function closeMonthlyRoutineDayPopup(e){if(!e||e.target===document.getElementById('mrDayPopup'))document.getElementById('mrDayPopup').classList.remove('open');}

function toggleMonthlyRoutine(id){
  let done=mrDoneList(rY,rM);
  const exists=done.some(x=>x.id===id);
  if(exists){
    done=done.filter(x=>x.id!==id);
  }else{
    // 실제로 보고 있는 달이 "지금 진짜 이번 달"이면 오늘 날짜로, 지나간/미래 달을 보며 체크한
    // 경우엔 정확한 날짜를 알 수 없으니 1일로 기본 저장(캘린더 표시용 최소한의 기본값).
    const day=(rY===TODAY.getFullYear()&&rM===TODAY.getMonth())?TODAY.getDate():1;
    done=[...done,{id,day}];
  }
  S.setMonthlyDone(rY,rM,done);
  renderRoutine();
}

function openMonthlyRoutineForm(){
  editingMrId=null;
  document.getElementById('mrFormTitle').innerHTML=`${icon('plus-circle',16,'color:var(--routine)')} 월간 루틴 추가`;
  document.getElementById('mrSaveBtn').textContent='추가하기';
  document.getElementById('newMrName').value='';
  document.getElementById('newMrEmoji').value='';
  document.getElementById('mrScheduleToggle').checked=false;
  document.getElementById('mrScheduleFields').style.display='none';
  document.getElementById('mrSchDay').value='';
  document.getElementById('mrSchNth').value='1';
  document.getElementById('mrSchDow').value='6';
  setMrScheduleType('day');
  document.getElementById('monthlyRoutineFormPopup').classList.add('open');
}
function editMonthlyRoutineStart(id){
  const r=MONTHLY_ROUTINES.find(x=>x.id===id);
  if(!r)return;
  editingMrId=id;
  document.getElementById('mrFormTitle').innerHTML=`${icon('edit',16,'color:var(--routine)')} 월간 루틴 수정`;
  document.getElementById('mrSaveBtn').textContent='수정 완료';
  document.getElementById('newMrName').value=r.name;
  document.getElementById('newMrEmoji').value=r.emoji;
  const sch=r.schedule;
  document.getElementById('mrScheduleToggle').checked=!!sch;
  document.getElementById('mrScheduleFields').style.display=sch?'block':'none';
  if(sch&&sch.type==='nth'){
    document.getElementById('mrSchNth').value=String(sch.nth);
    document.getElementById('mrSchDow').value=String(sch.dow);
    document.getElementById('mrSchDay').value='';
    setMrScheduleType('nth');
  }else{
    document.getElementById('mrSchDay').value=sch?sch.day:'';
    document.getElementById('mrSchNth').value='1';
    document.getElementById('mrSchDow').value='6';
    setMrScheduleType('day');
  }
  document.getElementById('monthlyRoutineFormPopup').classList.add('open');
}
function closeMonthlyRoutineForm(e){
  if(!e||e.target===document.getElementById('monthlyRoutineFormPopup'))document.getElementById('monthlyRoutineFormPopup').classList.remove('open');
}
function saveMonthlyRoutineForm(){
  const name=document.getElementById('newMrName').value.trim();
  const emoji=document.getElementById('newMrEmoji').value.trim()||'🌟';
  if(!name)return;
  let schedule=null;
  if(document.getElementById('mrScheduleToggle').checked){
    if(mrScheduleType==='day'){
      const day=parseInt(document.getElementById('mrSchDay').value);
      if(day>=1&&day<=31)schedule={type:'day',day};
    }else{
      const nth=parseInt(document.getElementById('mrSchNth').value);
      const dow=parseInt(document.getElementById('mrSchDow').value);
      schedule={type:'nth',nth,dow};
    }
  }
  if(editingMrId){
    MONTHLY_ROUTINES=MONTHLY_ROUTINES.map(r=>r.id===editingMrId?{...r,name,emoji,schedule}:r);
  }else{
    MONTHLY_ROUTINES=[...MONTHLY_ROUTINES,{id:'mr'+Date.now(),name,emoji,schedule}];
  }
  saveMonthlyRoutines(MONTHLY_ROUTINES);
  document.getElementById('monthlyRoutineFormPopup').classList.remove('open');
  renderRoutine();
}
function deleteMonthlyRoutine(id){
  if(!confirm('이 월간 루틴을 삭제할까요?'))return;
  MONTHLY_ROUTINES=MONTHLY_ROUTINES.filter(r=>r.id!==id);
  saveMonthlyRoutines(MONTHLY_ROUTINES);
  renderRoutine();
}

// 완료 처리된 월간 루틴의 달성일을 사용자가 직접 바꿀 수 있게 해주는 팝업
function openMonthlyRoutineDateEdit(id){
  const entry=mrDoneList(rY,rM).find(x=>x.id===id);
  if(!entry)return;
  editingMrDateId=id;
  const dateStr=`${rY}-${String(rM+1).padStart(2,'0')}-${String(entry.day).padStart(2,'0')}`;
  document.getElementById('mrDateInput').value=dateStr;
  document.getElementById('mrDateFormPopup').classList.add('open');
}
function closeMonthlyRoutineDateForm(e){
  if(!e||e.target===document.getElementById('mrDateFormPopup'))document.getElementById('mrDateFormPopup').classList.remove('open');
}
function saveMonthlyRoutineDate(){
  const val=document.getElementById('mrDateInput').value;
  if(!val||!editingMrDateId)return;
  const [y,m,d]=val.split('-').map(Number);
  // 다른 달로 날짜를 옮기는 경우까지는 지원하지 않고, 보고 있는 달(rY,rM) 안에서만 날짜를 조정함
  const day=(y===rY&&m===rM+1)?d:new Date(rY,rM+1,0).getDate()<d?new Date(rY,rM+1,0).getDate():d;
  const done=mrDoneList(rY,rM).map(x=>x.id===editingMrDateId?{...x,day}:x);
  S.setMonthlyDone(rY,rM,done);
  editingMrDateId=null;
  document.getElementById('mrDateFormPopup').classList.remove('open');
  renderRoutine();
}

function buildRoutineTable(){
  const card=mkDiv('card');
  const weekStart=curWeekStart;
  const weekDays=[];
  for(let i=0;i<7;i++){const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);weekDays.push(d);}

  const firstDayOfMonth = new Date(rY, rM, 1);
  const lastDayOfMonth = new Date(rY, rM + 1, 0);
  const firstWeekStartOfMonth = getWeekStart(rY, rM, firstDayOfMonth.getDate());
  const lastWeekStartOfMonth = getWeekStart(rY, rM, lastDayOfMonth.getDate());
  const isPrevDisabled = weekStart.getTime() <= firstWeekStartOfMonth.getTime();
  const isNextDisabled = weekStart.getTime() >= lastWeekStartOfMonth.getTime();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const startM = weekStart.getMonth();
  const startWeek = getWeekOfMonth(weekStart.getFullYear(), startM, weekStart.getDate());
  const endM = weekEnd.getMonth();
  const endWeek = getWeekOfMonth(weekEnd.getFullYear(), endM, weekEnd.getDate());

  let weekText;
  if (startM === endM) {
    weekText = `${startM + 1}월 ${startWeek}주차`;
  } else {
    weekText = `${startM + 1}월 ${startWeek}주차 / ${endM + 1}월 ${endWeek}주차`;
  }
  const header=mkDiv('card-header');header.innerHTML=`<span class="card-title">루틴 현황</span>`;
  const streak=calcRoutineWeekStreak();
  if(streak>0){
    const badge=mkDiv('streak-badge');badge.innerHTML=`🔥 ${streak}주 연속`;badge.title='전체 루틴 달성률 60% 이상인 주가 연속된 횟수 (완료된 주 기준)';
    header.appendChild(badge);
  }
  const weekNavContainer=mkDiv('');
  weekNavContainer.style.cssText='display:flex;align-items:center;gap:4px;';
  weekNavContainer.innerHTML=`<button class="nav-btn" style="width:24px;height:24px;font-size:12px;" onclick="chRoutineWeek(-1)" ${isPrevDisabled?'disabled':''}>‹</button><span style="font-size:11px;color:var(--muted);font-weight:600;min-width:40px;text-align:center;white-space:nowrap;">${weekText}</span><button class="nav-btn" style="width:24px;height:24px;font-size:12px;" onclick="chRoutineWeek(1)" ${isNextDisabled?'disabled':''}>›</button>`;
  header.appendChild(weekNavContainer);card.appendChild(header);

  const wrap=mkDiv('rtable-wrap');
  const table=document.createElement('table');table.className='rtable';

  // thead
  const thead=document.createElement('thead');
  const htr=document.createElement('tr');
  htr.innerHTML=`<th style="text-align:left;padding-left:4px;padding-right:14px;width:auto"></th>`;
  weekDays.forEach((d,i)=>{
    const isSat=i===5,isSun=i===6;
    const color=isSun?'color:var(--expense)':isSat?'color:var(--income)':'';
    htr.innerHTML+=`<th style="width:28px;max-width:28px;${color}"></th>`;
  });
  htr.innerHTML+=`<th style="width:36px;padding-left:14px"></th><th style="width:36px"></th>`;
  thead.appendChild(htr);table.appendChild(thead);

  const tbody=document.createElement('tbody');
  ['morning','day','evening'].forEach(period=>{
    ROUTINES.filter(r=>r.period===period).forEach(r=>{
      const tr=document.createElement('tr');
      tr.classList.add(`period-${period}`);
      // 루틴명 + 아이콘
      const iconTd=document.createElement('td');
      iconTd.style.cssText='text-align:left;padding-left:4px;padding-right:14px;';
      iconTd.innerHTML=`<div style="display:flex;align-items:center;gap:6px;"><div class="r-cat-icon ${r.cat}">${r.emoji}</div><span style="font-size:12px;font-weight:600;white-space:nowrap;letter-spacing:-0.3px;color:${CAT_COLORS[r.cat]}">${r.name}</span></div>`;
      tr.appendChild(iconTd);
      // 요일 체크박스
      let weekCount=0;
      weekDays.forEach((d,i)=>{
        const isSat=i===5,isSun=i===6;
        const isFuture=d>TODAY;
        const checked=isFuture?false:getRoutineChecked(r,d.getFullYear(),d.getMonth(),d.getDate());
        if(checked)weekCount++;
        const td=document.createElement('td');
        const cb=mkDiv(`rcb ${r.cat} ${checked?'on':''} ${isSat?'sat':''} ${isSun?'sun':''}`);
        if(r.autoFromBudget){
          cb.style.cursor='default';
        } else if(!isFuture){
          cb.onclick=()=>toggleRoutineCb(r,d.getFullYear(),d.getMonth(),d.getDate());
        }
        const wrap2=document.createElement('div');wrap2.style.cssText='display:flex;justify-content:center;';
        wrap2.appendChild(cb);td.appendChild(wrap2);
        tr.appendChild(td);
      });
      // 횟수
      const countTd=document.createElement('td');
      countTd.style.paddingLeft='14px';
      countTd.innerHTML=period==='day'?'<span class="r-count" style="color:#d1d5db">-</span>':
        `<span class="r-count">${r.goal===7?'매일':`${r.goal}회`}</span>`;
      tr.appendChild(countTd);
      // 달성
      const achTd=document.createElement('td');
      const pct=weekCount/r.goal*100;
      achTd.innerHTML=`<span class="ach-badge">${pct>=60?'🟢':pct>=30?'🟡':'🔴'}</span>`;
      tr.appendChild(achTd);
      tbody.appendChild(tr);
    });
  });
  table.appendChild(tbody);wrap.appendChild(table);card.appendChild(wrap);
  return card;
}

function toggleRoutineCb(r,y,m,d){
  let c = S.getRoutine(y,m,d);
  const isChecked = c.includes(r.id);
  c = isChecked ? c.filter(x=>x!==r.id) : [...c,r.id];
  S.setRoutine(y,m,d,c);

  if(r.id === 'r08') {
    let w = S.getWorkout(y,m,d);
    if(!isChecked && w.length === 0) {
      S.setWorkout(y,m,d, [{type:'러닝', memo:''}]);
    } else if (isChecked && w.length > 0) {
      S.setWorkout(y,m,d, []);
    }
  }
  renderRoutine();
}

function buildRoutineCal(){
  const fd=new Date(rY,rM,1).getDay();// 0=Sun
  const fdMon=fd===0?6:fd-1;// Mon-based offset
  const dim=new Date(rY,rM+1,0).getDate();
  const card=mkDiv('card');
  const dowRow=mkDiv('cal-dow-row');
  dowRow.style.paddingTop='14px';
  ['월','화','수','목','금','토','일'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===5?'sat':i===6?'sun':''}`);e.textContent=d;dowRow.appendChild(e);});
  card.appendChild(dowRow);

  // week coloring
  const weekInfo={};
  for(let d=1;d<=dim;d++){
    const ws=getWeekStart(rY,rM,d);
    const wk=ws.toDateString();
    if(!weekInfo[wk]){
      const days=[];for(let i=0;i<7;i++){const dd=new Date(ws);dd.setDate(ws.getDate()+i);days.push(dd);}
      const lastDay=days[days.length-1];
      const isPast=lastDay<TODAY;
      let totalGoal=0,totalDone=0;
      ROUTINES.forEach(r=>{
        let weekCount=0;
        days.forEach(dd=>{
          if(dd>TODAY)return;
          if(getRoutineChecked(r,dd.getFullYear(),dd.getMonth(),dd.getDate()))weekCount+=1;
        });
        totalDone+=Math.min(weekCount,r.goal);
        totalGoal+=r.goal;
      });
      const pct=totalGoal?totalDone/totalGoal*100:0;
      weekInfo[wk]={isPast,success:pct>=60,fail:isPast&&pct<60};
    }
  }

  const grid=mkDiv('rcal-grid');
  let weekNumDisplayed={};
  for(let i=0;i<fdMon;i++)grid.appendChild(mkDiv('rcal-cell empty'));
  for(let d=1;d<=dim;d++){
    const date=new Date(rY,rM,d);
    const ws=getWeekStart(rY,rM,d);
    const wk=ws.toDateString();
    const wi=weekInfo[wk]||{};
    const dow=(date.getDay()+6)%7;// Mon=0
    const isT=TODAY.getFullYear()===rY&&TODAY.getMonth()===rM&&TODAY.getDate()===d;
    const isFuture=date>TODAY;

    let bgColor='';
    if(!isFuture&&wi.success)bgColor='#f0fdf4';
    else if(!isFuture&&wi.fail)bgColor='#fefce8';

    const cell=mkDiv(`rcal-cell ${isT?'today':''} ${dow===5?'sat':''} ${dow===6?'sun':''}`);
    if(bgColor)cell.style.background=bgColor;
    cell.onclick=()=>openRoutineDayDetail(rY,rM,d);
    const dayEl=mkDiv('rcal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    if(!isFuture){
      const dots=mkDiv('rcal-dots');
      ['selfcare','health','growth','life'].forEach(cat=>{
        if(ROUTINES.filter(r=>r.cat===cat).some(r=>getRoutineChecked(r,rY,rM,d))){
          const dot=mkDiv('rcal-dot');dot.style.background=CAT_COLORS[cat];dots.appendChild(dot);
        }
      });
      if(dots.children.length)cell.appendChild(dots);
    }
    grid.appendChild(cell);
    // fill end of last week
    if(d===dim){const remaining=(6-((fdMon+d-1)%7));for(let i=0;i<remaining;i++)grid.appendChild(mkDiv('rcal-cell empty'));}
  }
  card.appendChild(grid);return card;
}

function buildMonthlyAchievement(){
  const card=mkDiv('card');
  card.innerHTML='<div class="card-header"><span class="card-title">월간 달성률</span></div>';
  const grid=mkDiv('monthly-grid');
  const daysInMonth=new Date(rY,rM+1,0).getDate();
  const pastDays=rY===TODAY.getFullYear()&&rM===TODAY.getMonth()?TODAY.getDate():daysInMonth;

  let worstR=null,worstPct=101;
  ['selfcare','health','growth','life'].forEach(cat=>{
    const catDiv=mkDiv(`monthly-cat ${cat}`);
    const title=mkDiv(`monthly-cat-title ${cat}`);title.textContent=CAT_LABELS[cat];catDiv.appendChild(title);
    const items=mkDiv('monthly-items');
    ROUTINES.filter(r=>r.cat===cat).forEach(r=>{
      let done=0;
      for(let d=1;d<=pastDays;d++){if(getRoutineChecked(r,rY,rM,d))done++;}
      const possible=Math.min(pastDays,r.goal===7?pastDays:Math.ceil(pastDays/7*r.goal));
      const pct=possible?Math.min(100,Math.round(done/possible*100)):0;
      if(pct<worstPct){worstPct=pct;worstR=r;}
      const item=mkDiv('monthly-item');
      item.innerHTML=`<div class="monthly-item-icon">${r.emoji}</div><div class="monthly-item-info"><div class="monthly-item-name">${r.name}</div><div class="monthly-item-bar-track"><div class="monthly-item-bar-fill" style="width:${pct}%;background:${CAT_COLORS[cat]}"></div></div></div><div class="monthly-item-pct" style="color:${CAT_COLORS[cat]}">${pct}%</div>`;
      items.appendChild(item);
    });
    catDiv.appendChild(items);grid.appendChild(catDiv);
  });
  card.appendChild(grid);
  if(worstR){
    const banner=mkDiv('worst-banner');
    banner.innerHTML=`<div class="worst-banner-icon">${worstR.emoji}</div><div><div class="worst-banner-text">${worstR.name} — 신경써주세요!</div><div class="worst-banner-label">이번 달 가장 달성률이 낮은 루틴이에요</div></div>`;
    card.appendChild(banner);
  }
  return card;
}

// ─── 루틴 달력 날짜 클릭 시 그날 달성한 루틴 목록 팝업 ────────────────────────────
function openRoutineDayDetail(y,m,d){
  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('routineDayTitle').textContent=`${y}년 ${months[m]} ${d}일`;
  const done=ROUTINES.filter(r=>getRoutineChecked(r,y,m,d));
  const content=document.getElementById('routineDayContent');
  if(!done.length){
    content.innerHTML='<div class="empty">이 날 달성한 루틴이 없어요</div>';
  }else{
    content.innerHTML=done.map(r=>`<div class="rmgmt-item" style="margin-bottom:0;"><div class="rmgmt-icon">${r.emoji}</div><div class="rmgmt-info"><div class="rmgmt-name">${r.name}</div><div class="rmgmt-sub">${PERIOD_LABEL[r.period]} · ${CAT_LABELS[r.cat]}</div></div></div>`).join('');
  }
  document.getElementById('routineDayPopup').classList.add('open');
}
function closeRoutineDayPopup(e){if(e.target===document.getElementById('routineDayPopup'))document.getElementById('routineDayPopup').classList.remove('open');}

