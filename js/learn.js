// ─── 학습(LEARN) ──────────────────────────────────────────────────────────────
// 학습/자기계발 항목(부트캠프, 온라인 강의, 어학앱, 독서습관 등) 관리 탭.
// 다른 새 탭들(친구/프로젝트)처럼 진입 시 캘린더가 기본으로 바로 보이고, 그 아래에
// 항목 리스트(스트릭 표시)가 이어지는 구조 — 별도 캘린더/리스트 토글 없음.
// 반복 스케줄은 루틴 탭의 freq 모델(daily/weekly/days)을 재사용하고, 스케줄이
// 정해지지 않은 항목을 위해 'free'(자유, 아무 날에나 체크 가능)를 추가로 지원함.
let editingLearnId=null;
let lrCalY=TODAY.getFullYear(),lrCalM=TODAY.getMonth();
let lrEndedExpanded=false;
let learnColorSel=null;
let learnFreqSel='free',learnWeekDays=[],learnWeeklyN=3;
let curLrWeekStart=null; // 주간 체크 그리드용 이번주 시작일(월요일 기준), 루틴 탭의 curWeekStart와 동일한 발상
let lrView='week'; // 학습 탭: 'week'(캘린더+주간체크그리드, 기본값) / 'ach'(달성률, 폴더 아이콘 눌렀을 때만)

function lrPad(n){return String(n).padStart(2,'0');}
function lrDateStr(y,m,d){return `${y}-${lrPad(m+1)}-${lrPad(d)}`;}
function lrTodayStr(){return lrDateStr(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());}

// 'days'(요일고정) 스케줄만 특정 요일로 제한하고, 나머지(매일/주N회/자유)는 어느
// 요일이든 "스케줄된 날"로 침. 루틴 탭의 isRoutineScheduledOnDow와 동일한 발상 —
// 요일고정 항목만 스케줄 안 된 요일엔 스트릭 계산에서 완전히 제외(끊기지도, 카운트되지도 않음).
function isLearnScheduledOnDow(item,dowMon){
  if(item.freq==='days'&&Array.isArray(item.days))return item.days.includes(dowMon);
  return true;
}
// 착수~종료 기간에 해당 날짜가 포함되는지 (종료일 없으면 계속 진행중으로 간주).
function lrItemActiveOn(item,dateStr){
  if(item.startDate&&dateStr<item.startDate)return false;
  if(item.endDate&&dateStr>item.endDate)return false;
  return true;
}
function isLearnEnded(item){
  return !!(item.endDate&&item.endDate<lrTodayStr());
}
function lrFreqLabel(item){
  if(item.freq==='daily')return '매일';
  if(item.freq==='weekly')return `주 ${item.weeklyN||3}회`;
  if(item.freq==='days')return (item.days||[]).map(i=>['월','화','수','목','금','토','일'][i]).join('/')||'요일고정';
  return '자유';
}
// 연속일수(스트릭): 오늘부터 거꾸로 훑으면서, 그 항목에 실제로 스케줄된 날(요일고정이면
// 해당 요일, 그 외엔 전부)만 카운트 대상으로 삼음. 스케줄 안 된 날은 건너뛸 뿐 끊기지 않음
// (루틴 탭 달력 필터에 적용한 것과 동일한 방식). 오늘은 아직 체크 전이어도 스트릭이 끊긴
// 걸로 치지 않음(듀오링고 등 흔한 스트릭 UX와 동일한 "그레이스" 처리).
function calcLearnStreak(item){
  let streak=0;
  let cursor=new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
  const startDate=item.startDate||'0000-01-01';
  const todayStr=lrTodayStr();
  let guard=0;
  while(guard<20000){
    guard++;
    const y=cursor.getFullYear(),m=cursor.getMonth(),d=cursor.getDate();
    const ds=lrDateStr(y,m,d);
    if(ds<startDate)break;
    const jsDow=cursor.getDay();
    const dowMon=jsDow===0?6:jsDow-1;
    if(isLearnScheduledOnDow(item,dowMon)){
      const checked=S.getLearnChecked(y,m,d).includes(item.id);
      if(checked){
        streak++;
      }else if(ds!==todayStr){
        break;
      }
      // 오늘이고 아직 체크 안 했으면 끊긴 걸로 치지 않고 그냥 어제로 넘어감
    }
    cursor.setDate(cursor.getDate()-1);
  }
  return streak+(item.streakOffset||0);
}

function lrDaysBetweenInclusive(startStr,endStr){
  const [sy,sm,sd]=startStr.split('-').map(Number);
  const [ey,em,ed]=endStr.split('-').map(Number);
  const s=new Date(sy,sm-1,sd),e=new Date(ey,em-1,ed);
  return Math.round((e-s)/86400000)+1;
}
// 달성률: (실제 완료 횟수) ÷ (시작일~마감기한까지 그 항목 스케줄 기준 총 목표 횟수) × 100
// - daily/free/days: 스케줄된 날(요일고정이면 해당 요일, 그 외엔 매일)의 개수를 목표로 삼음
// - weekly(주 N회): 요일 제한이 없으니 날짜 하나하나 세는 대신 "총 일수/7 × 주당 목표 횟수"로 목표를 계산
//   (예: 주 3회 스케줄, 시작~마감까지 20주 남았으면 목표 60회)
function calcLearnAchievement(item){
  const startStr=item.startDate||lrTodayStr();
  const endStr=item.endDate||'2026-12-31';
  if(endStr<startStr)return {pct:0,done:0,goal:0};
  const [sy,sm,sd]=startStr.split('-').map(Number);
  const [ey,em,ed]=endStr.split('-').map(Number);
  let cursor=new Date(sy,sm-1,sd);
  const end=new Date(ey,em-1,ed);
  let scheduledDays=0,done=0,guard=0;
  while(cursor<=end&&guard<3660){
    guard++;
    const y=cursor.getFullYear(),m=cursor.getMonth(),d=cursor.getDate();
    const jsDow=cursor.getDay();
    const dowMon=jsDow===0?6:jsDow-1;
    if(isLearnScheduledOnDow(item,dowMon)){
      scheduledDays++;
      if(S.getLearnChecked(y,m,d).includes(item.id))done++;
    }
    cursor.setDate(cursor.getDate()+1);
  }
  let goal;
  if(item.freq==='weekly'){
    const totalDays=lrDaysBetweenInclusive(startStr,endStr);
    goal=Math.max(1,Math.round(totalDays/7*(item.weeklyN||3)));
  }else{
    goal=scheduledDays;
  }
  const pct=goal?Math.min(100,Math.round(done/goal*100)):0;
  return {pct,done,goal};
}

function chLrCalMonth(d){
  lrCalM+=d;
  if(lrCalM>11){lrCalM=0;lrCalY++;}
  if(lrCalM<0){lrCalM=11;lrCalY--;}
  curLrWeekStart=null;
  renderLearn();
}
function chLrWeek(d){
  if(!curLrWeekStart)return;
  curLrWeekStart.setDate(curLrWeekStart.getDate()+(d*7));
  renderLearn();
}

function setLearnView(v){
  lrView=v;
  lrSyncViewButtons();
  renderLearn();
}
function lrSyncViewButtons(){
  document.getElementById('lrvbtn-week').classList.toggle('active',lrView==='week');
  document.getElementById('lrvbtn-ach').classList.toggle('active',lrView==='ach');
}

// 다른 새 탭들(친구/프로젝트)처럼 진입 시 첫 화면 = 캘린더+주간체크그리드+달성률.
// 항목 리스트(CRUD, 수정/삭제)는 기본 화면엔 안 보이고, 헤더의 폴더 아이콘을 눌렀을 때만 별도로 보여줌
// (루틴 탭의 주간/월간 루틴 폴더 토글과 동일한 방식).
function renderLearn(){
  LEARN_ITEMS=getLearnItems();
  document.getElementById('lrMonthLabel').textContent=`${lrCalY}년 ${lrCalM+1}월`;
  const main=document.getElementById('learnMain');main.innerHTML='';
  if(lrView==='ach'){
    const listCard=buildLearnListCard();listCard.classList.add('card-wide');main.appendChild(listCard);
    return;
  }
  if(!curLrWeekStart){
    const refDate=new Date(lrCalY,lrCalM,(lrCalY===TODAY.getFullYear()&&lrCalM===TODAY.getMonth())?TODAY.getDate():1);
    curLrWeekStart=getWeekStart(lrCalY,lrCalM,refDate.getDate());
  }
  const calCard=buildLearnCalCard();calCard.classList.add('card-wide');main.appendChild(calCard);
  const tableCard=buildLearnTable();tableCard.classList.add('card-wide');main.appendChild(tableCard);
  const achCard=buildLearnAchievementCard();achCard.classList.add('card-wide');main.appendChild(achCard);
}

// ─── 캘린더: 완료 체크한 항목만 그 날짜에 항목 고유색 점으로 표시 ────────────────
function buildLearnCalCard(){
  const dim=new Date(lrCalY,lrCalM+1,0).getDate();
  const fd=new Date(lrCalY,lrCalM,1).getDay();
  const fdMon=fd===0?6:fd-1;
  const card=mkDiv('card');
  // 월 이동은 페이지 헤더 nav-row(lrMonthLabel + chLrCalMonth)로 통일됐으므로
  // 캘린더 카드 안에는 별도 월 표시/화살표를 두지 않음.
  const dow=mkDiv('cal-dow-row');
  dow.style.paddingTop='14px';
  ['월','화','수','목','금','토','일'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===5?'sat':i===6?'sun':''}`);e.textContent=d;dow.appendChild(e);});
  const grid=mkDiv('cal-grid');
  for(let i=0;i<fdMon;i++)grid.appendChild(mkDiv('cal-cell empty'));
  for(let d=1;d<=dim;d++){
    const dow2=(fdMon+d-1)%7;
    const isT=TODAY.getFullYear()===lrCalY&&TODAY.getMonth()===lrCalM&&TODAY.getDate()===d;
    const cell=mkDiv(`cal-cell ${isT?'today':''} ${dow2===5?'sat':''} ${dow2===6?'sun':''}`);
    const dayEl=mkDiv('cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    const checkedIds=S.getLearnChecked(lrCalY,lrCalM,d);
    const completedItems=LEARN_ITEMS.filter(it=>checkedIds.includes(it.id));
    if(completedItems.length){
      const dotsWrap=mkDiv('');dotsWrap.style.cssText='display:flex;gap:2px;justify-content:center;flex-wrap:wrap;margin-top:2px;';
      completedItems.slice(0,4).forEach(it=>{
        const dot=mkDiv('');dot.style.cssText=`width:5px;height:5px;border-radius:50%;background:${it.color||'var(--learn)'};`;
        dot.title=it.name;
        dotsWrap.appendChild(dot);
      });
      cell.appendChild(dotsWrap);
    }
    cell.onclick=()=>openLearnDayDetail(lrCalY,lrCalM,d);
    grid.appendChild(cell);
  }
  card.appendChild(dow);card.appendChild(grid);
  const legendItems=LEARN_ITEMS.filter(it=>!isLearnEnded(it));
  if(legendItems.length){
    const legend=document.createElement('div');
    legend.style.cssText='padding:2px 16px 14px;display:flex;flex-wrap:wrap;gap:8px 12px;';
    legend.innerHTML=legendItems.map(it=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--muted);"><span style="width:7px;height:7px;border-radius:50%;background:${it.color||'var(--learn)'};display:inline-block;"></span>${it.name}</span>`).join('');
    card.appendChild(legend);
  }
  return card;
}

// ─── 날짜 클릭 팝업: 그날 "완료한" 학습 항목 목록만 보여주는 조회 전용 팝업 ──────────
// (체크/해제는 아래 주간 체크 그리드에서 인라인으로 처리 — 루틴 탭 월간뷰 날짜팝업과 동일한 방식)
function openLearnDayDetail(y,m,d){
  document.getElementById('lrDayTitle').textContent=`${y}년 ${m+1}월 ${d}일`;
  const checkedIds=S.getLearnChecked(y,m,d);
  const done=LEARN_ITEMS.filter(it=>checkedIds.includes(it.id));
  const content=document.getElementById('lrDayContent');
  if(!done.length){
    content.innerHTML='<div class="empty">이 날 완료한 학습 항목이 없어요</div>';
  }else{
    content.innerHTML=done.map(it=>`<div class="rmgmt-item" style="margin-bottom:0;"><div class="rmgmt-icon" style="background:${it.color||'var(--learn)'}22;">${it.emoji||'📘'}</div><div class="rmgmt-info"><div class="rmgmt-name">${it.name}</div></div></div>`).join('');
  }
  document.getElementById('lrDayPopup').classList.add('open');
}
function closeLrDayPopup(e){if(!e||e.target===document.getElementById('lrDayPopup'))document.getElementById('lrDayPopup').classList.remove('open');}

// ─── 주간 체크 그리드: 항목별로 이번주 요일 7칸이 나열돼 팝업 없이 바로 클릭해서 체크/해제
// (루틴 탭 buildRoutineTable()과 동일한 구조 — 다만 학습 항목은 고정 카테고리 대신
// 항목별 커스텀 color를 쓰므로 클래스 대신 인라인 스타일로 색을 입힘)
function buildLearnTable(){
  const card=mkDiv('card');
  const weekStart=curLrWeekStart;
  const weekDays=[];
  for(let i=0;i<7;i++){const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);weekDays.push(d);}

  const firstDayOfMonth=new Date(lrCalY,lrCalM,1);
  const lastDayOfMonth=new Date(lrCalY,lrCalM+1,0);
  const firstWeekStartOfMonth=getWeekStart(lrCalY,lrCalM,firstDayOfMonth.getDate());
  const lastWeekStartOfMonth=getWeekStart(lrCalY,lrCalM,lastDayOfMonth.getDate());
  const isPrevDisabled=weekStart.getTime()<=firstWeekStartOfMonth.getTime();
  const isNextDisabled=weekStart.getTime()>=lastWeekStartOfMonth.getTime();

  const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
  const startM=weekStart.getMonth();
  const startWeek=getWeekOfMonth(weekStart.getFullYear(),startM,weekStart.getDate());
  const endM=weekEnd.getMonth();
  const endWeek=getWeekOfMonth(weekEnd.getFullYear(),endM,weekEnd.getDate());
  let weekText;
  if(startM===endM){weekText=`${startM+1}월 ${startWeek}주차`;}
  else{weekText=`${startM+1}월 ${startWeek}주차 / ${endM+1}월 ${endWeek}주차`;}

  const header=mkDiv('card-header');header.innerHTML=`<span class="card-title">이번 주 체크</span>`;
  const weekNavContainer=mkDiv('');
  weekNavContainer.style.cssText='display:flex;align-items:center;gap:4px;';
  weekNavContainer.innerHTML=`<button class="nav-btn" style="width:24px;height:24px;font-size:12px;" onclick="chLrWeek(-1)" ${isPrevDisabled?'disabled':''}>‹</button><span style="font-size:11px;color:var(--muted);font-weight:600;min-width:40px;text-align:center;white-space:nowrap;">${weekText}</span><button class="nav-btn" style="width:24px;height:24px;font-size:12px;" onclick="chLrWeek(1)" ${isNextDisabled?'disabled':''}>›</button>`;
  header.appendChild(weekNavContainer);card.appendChild(header);

  const activeItems=LEARN_ITEMS.filter(it=>!isLearnEnded(it));
  if(!activeItems.length){
    const empty=mkDiv('empty');empty.style.padding='0 16px 16px';empty.textContent='진행중인 학습 항목이 없어요';
    card.appendChild(empty);return card;
  }

  const wrap=mkDiv('rtable-wrap');
  const table=document.createElement('table');table.className='rtable';

  const thead=document.createElement('thead');
  const htr=document.createElement('tr');
  htr.innerHTML=`<th style="text-align:left;padding-left:4px;padding-right:14px;width:auto"></th>`;
  weekDays.forEach((d,i)=>{
    const isSat=i===5,isSun=i===6;
    const color=isSun?'color:var(--expense)':isSat?'color:var(--income)':'';
    htr.innerHTML+=`<th style="width:28px;max-width:28px;${color}">${d.getDate()}</th>`;
  });
  htr.innerHTML+=`<th style="width:44px;padding-left:14px"></th>`;
  thead.appendChild(htr);table.appendChild(thead);

  const tbody=document.createElement('tbody');
  activeItems.forEach(it=>{
    const tr=document.createElement('tr');
    const color=it.color||'var(--learn)';
    const iconTd=document.createElement('td');
    iconTd.style.cssText='text-align:left;padding-left:4px;padding-right:14px;';
    iconTd.innerHTML=`<div style="display:flex;align-items:center;gap:6px;"><div class="r-cat-icon" style="background:${color}22;">${it.emoji||'📘'}</div><span style="font-size:12px;font-weight:600;white-space:nowrap;letter-spacing:-0.3px;color:${color};">${it.name}</span></div>`;
    tr.appendChild(iconTd);
    weekDays.forEach((d,i)=>{
      const isSat=i===5,isSun=i===6;
      const isFuture=d>TODAY;
      const y=d.getFullYear(),m=d.getMonth(),dd=d.getDate();
      const checked=isFuture?false:S.getLearnChecked(y,m,dd).includes(it.id);
      const td=document.createElement('td');
      const cb=mkDiv(`rcb ${checked?'on':''} ${isSat?'sat':''} ${isSun?'sun':''}`);
      if(checked){cb.style.borderColor=color;cb.style.background=`${color}22`;}
      if(!isFuture){
        cb.onclick=()=>toggleLrWeekCb(it.id,y,m,dd);
      }else{
        cb.style.cursor='default';cb.style.opacity='0.35';
      }
      const wrap2=document.createElement('div');wrap2.style.cssText='display:flex;justify-content:center;';
      wrap2.appendChild(cb);td.appendChild(wrap2);
      tr.appendChild(td);
    });
    const streakTd=document.createElement('td');
    streakTd.style.paddingLeft='14px';
    streakTd.innerHTML=`<span class="r-count">🔥${calcLearnStreak(it)}</span>`;
    tr.appendChild(streakTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);wrap.appendChild(table);card.appendChild(wrap);
  return card;
}

function toggleLrWeekCb(itemId,y,m,d){
  let checked=S.getLearnChecked(y,m,d);
  if(checked.includes(itemId))checked=checked.filter(id=>id!==itemId);
  else checked=[...checked,itemId];
  S.setLearnChecked(y,m,d,checked);
  renderLearn(); // 캘린더 점/주간그리드/리스트 스트릭 모두 함께 갱신
}

// ─── 달성률: 항목별로 (완료 횟수 / 시작~마감기한 기준 목표 횟수) × 100 를 진행바로 표시 ──
function buildLearnAchievementCard(){
  const card=mkDiv('card');
  const header=mkDiv('card-header');header.innerHTML='<span class="card-title">달성률</span>';
  card.appendChild(header);
  const activeItems=LEARN_ITEMS.filter(it=>!isLearnEnded(it));
  if(!activeItems.length){
    const empty=mkDiv('empty');empty.style.padding='0 16px 16px';empty.textContent='진행중인 학습 항목이 없어요';
    card.appendChild(empty);return card;
  }
  const grid=mkDiv('monthly-grid');
  const items=mkDiv('monthly-items');
  activeItems.forEach(it=>{
    const color=it.color||'var(--learn)';
    const {pct,done,goal}=calcLearnAchievement(it);
    const item=mkDiv('monthly-item');
    item.innerHTML=`<div class="monthly-item-icon">${it.emoji||'📘'}</div><div class="monthly-item-info"><div class="monthly-item-name">${it.name} <span style="font-weight:600;color:var(--muted);font-size:9.5px;">(${done}/${goal})</span></div><div class="monthly-item-bar-track"><div class="monthly-item-bar-fill" style="width:${pct}%;background:${color}"></div></div></div><div class="monthly-item-pct" style="color:${color}">${pct}%</div>`;
    items.appendChild(item);
  });
  grid.appendChild(items);card.appendChild(grid);
  return card;
}

// ─── 항목 리스트: 진행중 + "종료된 항목 (N건)" 아코디언 ─────────────────────────
function buildLearnListCard(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:16px 16px 16px;display:flex;flex-direction:column;gap:8px;';
  if(!LEARN_ITEMS.length){
    wrap.appendChild(mkDiv('empty','등록된 학습 항목이 없어요'));
    card.appendChild(wrap);return card;
  }
  const active=LEARN_ITEMS.filter(it=>!isLearnEnded(it));
  const ended=LEARN_ITEMS.filter(isLearnEnded);
  active.sort((a,b)=>calcLearnStreak(b)-calcLearnStreak(a));
  if(active.length)active.forEach(it=>wrap.appendChild(buildLrRow(it,false)));
  else wrap.appendChild(mkDiv('empty','진행중인 학습 항목이 없어요'));
  if(ended.length){
    ended.sort((a,b)=>(b.endDate||'').localeCompare(a.endDate||''));
    const btn=document.createElement('button');
    btn.className='lr-more-btn';
    btn.textContent=lrEndedExpanded?'접기':`종료된 항목 (${ended.length}건)`;
    btn.onclick=toggleLrEndedList;
    wrap.appendChild(btn);
    if(lrEndedExpanded)ended.forEach(it=>wrap.appendChild(buildLrRow(it,true)));
  }
  card.appendChild(wrap);return card;
}
function toggleLrEndedList(){lrEndedExpanded=!lrEndedExpanded;renderLearn();}

function buildLrRow(item,ended){
  const row=mkDiv('lr-row');
  const streak=calcLearnStreak(item);
  const color=item.color||'var(--learn)';
  const periodLabel=item.startDate&&item.endDate?`${item.startDate} ~ ${item.endDate}`:item.startDate?`${item.startDate} ~ (계속)`:'';
  const subParts=[`<span class="pj-cat-badge" style="background:${color}22;color:${color};">${lrFreqLabel(item)}</span>`];
  if(periodLabel)subParts.push(`<span>${periodLabel}</span>`);
  if(item.timeLabel)subParts.push(`<span>${item.timeLabel}</span>`);
  const streakBadge=`<span class="lr-streak-badge">🔥 ${streak}</span>`;
  const actionsHtml=ended?
    `<button class="freq-btn" style="font-size:11px;padding:4px 10px;color:var(--learn);border-color:var(--learn);" onclick="renewLearnItem('${item.id}')">갱신하기</button>
     <button class="pj-icon del" onclick="deleteLearnItem('${item.id}')" title="삭제">${icon('x-circle',15)}</button>`
    :`<button class="pj-icon" onclick="editLearnStart('${item.id}')" title="수정">${icon('edit',14)}</button>
     <button class="pj-icon del" onclick="deleteLearnItem('${item.id}')" title="삭제">${icon('x-circle',15)}</button>`;
  row.innerHTML=`
    <div class="lr-row-top">
      <div class="lr-row-info">
        <div class="lr-row-name-line">
          <span class="lr-row-emoji" style="background:${color}22;">${item.emoji||'📘'}</span>
          <div class="lr-row-name">${item.name}</div>
        </div>
        <div class="lr-row-sub">${subParts.join('')}</div>
        ${item.memo?`<div class="lr-row-sub" style="margin-top:2px;">${item.memo}</div>`:''}
      </div>
      ${streakBadge}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:4px;">${actionsHtml}</div>`;
  return row;
}

// ─── 학습 항목 추가/수정 ───────────────────────────────────────────────────────
function renderLearnColorSwatches(selected){
  const wrap=document.getElementById('lrColorSwatches');
  if(!wrap)return;
  learnColorSel=selected||FL_COLOR_PALETTE[0];
  wrap.innerHTML=FL_COLOR_PALETTE.map(c=>`<div class="fl-color-swatch ${c===learnColorSel?'active':''}" style="background:${c};" onclick="selLearnColor('${c}')"></div>`).join('');
}
function selLearnColor(c){renderLearnColorSwatches(c);}

function selLearnFreq(btn){
  document.querySelectorAll('#learnFormPopup [data-freq]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  learnFreqSel=btn.dataset.freq;
  renderLearnFreqDetail();
}
function renderLearnFreqDetail(){
  const wrap=document.getElementById('lrFreqDetailWrap');
  wrap.innerHTML='';wrap.style.display='none';
  if(learnFreqSel==='weekly'){
    wrap.style.display='block';
    wrap.innerHTML=`<label class="fl" style="margin-bottom:6px;display:block;">주 몇 회?</label><div style="display:flex;gap:6px;">${[1,2,3,4,5,6,7].map(n=>`<button type="button" style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:${learnWeeklyN===n?'var(--learn)':'#fff'};color:${learnWeeklyN===n?'#fff':'var(--muted)'};font-size:12px;font-weight:700;cursor:pointer;" onclick="setLearnWeeklyN(${n},this)">${n}</button>`).join('')}</div>`;
  }else if(learnFreqSel==='days'){
    wrap.style.display='block';
    wrap.innerHTML=`<label class="fl" style="margin-bottom:6px;display:block;">요일 선택</label><div style="display:flex;gap:4px;">${['월','화','수','목','금','토','일'].map((d,i)=>`<button type="button" class="dow-btn ${learnWeekDays.includes(i)?'active':''}" onclick="toggleLearnDow(${i},this)">${d}</button>`).join('')}</div>`;
  }
}
function setLearnWeeklyN(n,btn){
  learnWeeklyN=n;
  btn.parentElement.querySelectorAll('button').forEach(b=>{b.style.background='#fff';b.style.color='var(--muted)';});
  btn.style.background='var(--learn)';btn.style.color='#fff';
}
function toggleLearnDow(i,btn){
  if(learnWeekDays.includes(i))learnWeekDays=learnWeekDays.filter(x=>x!==i);
  else learnWeekDays.push(i);
  btn.classList.toggle('active');
}

function openLearnForm(){
  editingLearnId=null;
  learnFreqSel='free';learnWeekDays=[];learnWeeklyN=3;
  document.getElementById('lrFormTitle').innerHTML=`${icon('plus-circle',16,'color:var(--learn)')} 새 학습 항목`;
  document.getElementById('lrSaveBtn').innerHTML=`${icon('plus-circle',14)} 추가하기`;
  ['lrName','lrEmoji','lrTimeLabel','lrStreakOffset','lrMemo'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('lrStartDate').value=lrTodayStr();
  document.getElementById('lrEndDate').value='2026-12-31'; // 마감기한 필수값 — 기본으로 올해 연말을 채워줌
  document.querySelectorAll('#learnFormPopup [data-freq]').forEach(b=>b.classList.toggle('active',b.dataset.freq==='free'));
  renderLearnFreqDetail();
  renderLearnColorSwatches(FL_COLOR_PALETTE[Math.floor(Math.random()*FL_COLOR_PALETTE.length)]);
  document.getElementById('learnFormPopup').classList.add('open');
}
function closeLearnForm(e){if(!e||e.target===document.getElementById('learnFormPopup'))document.getElementById('learnFormPopup').classList.remove('open');}

function editLearnStart(id){
  const it=LEARN_ITEMS.find(x=>x.id===id);
  if(!it)return;
  editingLearnId=id;
  document.getElementById('lrName').value=it.name||'';
  document.getElementById('lrEmoji').value=it.emoji||'';
  document.getElementById('lrStartDate').value=it.startDate||'';
  document.getElementById('lrEndDate').value=it.endDate||'';
  document.getElementById('lrTimeLabel').value=it.timeLabel||'';
  document.getElementById('lrStreakOffset').value=it.streakOffset||0;
  document.getElementById('lrMemo').value=it.memo||'';
  learnFreqSel=it.freq||'free';
  learnWeekDays=[...(it.days||[])];
  learnWeeklyN=it.weeklyN||3;
  document.querySelectorAll('#learnFormPopup [data-freq]').forEach(b=>b.classList.toggle('active',b.dataset.freq===learnFreqSel));
  renderLearnFreqDetail();
  renderLearnColorSwatches(it.color||FL_COLOR_PALETTE[0]);
  document.getElementById('lrFormTitle').innerHTML=`${icon('edit',16,'color:var(--learn)')} 학습 항목 수정`;
  document.getElementById('lrSaveBtn').innerHTML=`${icon('edit',14)} 수정 완료`;
  document.getElementById('learnFormPopup').classList.add('open');
}

// 종료된 항목의 "갱신하기": 기존 항목 정보를 미리 채운 새 등록 폼을 열어주기만 하고,
// 실제로 저장할지/기간을 얼마로 할지는 사용자가 직접 확인 후 결정하게 함(자동 갱신 금지).
// 저장하면 기존 종료 항목은 그대로 남고(기록 보존) 새 항목이 별도로 추가됨.
function renewLearnItem(id){
  const it=LEARN_ITEMS.find(x=>x.id===id);
  if(!it)return;
  editingLearnId=null;
  document.getElementById('lrName').value=it.name||'';
  document.getElementById('lrEmoji').value=it.emoji||'';
  document.getElementById('lrStartDate').value=lrTodayStr();
  document.getElementById('lrEndDate').value='2026-12-31'; // 마감기한 필수값 — 기본으로 올해 연말을 채워줌
  document.getElementById('lrTimeLabel').value=it.timeLabel||'';
  document.getElementById('lrStreakOffset').value=0;
  document.getElementById('lrMemo').value=it.memo||'';
  learnFreqSel=it.freq||'free';
  learnWeekDays=[...(it.days||[])];
  learnWeeklyN=it.weeklyN||3;
  document.querySelectorAll('#learnFormPopup [data-freq]').forEach(b=>b.classList.toggle('active',b.dataset.freq===learnFreqSel));
  renderLearnFreqDetail();
  renderLearnColorSwatches(it.color||FL_COLOR_PALETTE[0]);
  document.getElementById('lrFormTitle').innerHTML=`${icon('plus-circle',16,'color:var(--learn)')} ${it.name} 갱신 (새로 등록)`;
  document.getElementById('lrSaveBtn').innerHTML=`${icon('plus-circle',14)} 추가하기`;
  document.getElementById('learnFormPopup').classList.add('open');
}

function saveLearnForm(){
  const name=document.getElementById('lrName').value.trim();
  const emoji=document.getElementById('lrEmoji').value.trim()||'📘';
  const startDate=document.getElementById('lrStartDate').value;
  const endDate=document.getElementById('lrEndDate').value;
  const timeLabel=document.getElementById('lrTimeLabel').value.trim();
  const streakOffset=parseInt(document.getElementById('lrStreakOffset').value,10)||0;
  const memo=document.getElementById('lrMemo').value.trim();
  const color=learnColorSel||FL_COLOR_PALETTE[0];
  if(!name){alert('학습 항목 이름을 입력해줘');return;}
  if(!endDate){alert('마감기한을 입력해줘 (달성률 계산 기준일이에요)');return;}
  if(startDate&&endDate&&startDate>endDate){alert('마감기한이 시작일보다 빠를 수 없어요');return;}
  const data={
    name,emoji,color,startDate,endDate,freq:learnFreqSel,timeLabel,memo,streakOffset,
    ...(learnFreqSel==='weekly'?{weeklyN:learnWeeklyN}:{}),
    ...(learnFreqSel==='days'?{days:[...learnWeekDays]}:{}),
  };
  if(editingLearnId){
    LEARN_ITEMS=LEARN_ITEMS.map(it=>it.id===editingLearnId?{...it,...data}:it);
  }else{
    LEARN_ITEMS=[...LEARN_ITEMS,{id:'lr'+Date.now(),...data}];
  }
  saveLearnItems(LEARN_ITEMS);
  document.getElementById('learnFormPopup').classList.remove('open');
  renderLearn();
}

function deleteLearnItem(id){
  if(!confirm('이 학습 항목을 삭제할까요?'))return;
  LEARN_ITEMS=LEARN_ITEMS.filter(it=>it.id!==id);
  saveLearnItems(LEARN_ITEMS);
  renderLearn();
}

// ─── 학습 설정 팝업(헤더 통일: 루틴/가계부처럼 톱니바퀴 안에서 추가/수정/삭제) ──────────
function openLearnSettings(){
  renderLearnSettingsList();
  document.getElementById('learnSettingsPopup').classList.add('open');
}
function closeLearnSettings(e){if(!e||e.target===document.getElementById('learnSettingsPopup'))document.getElementById('learnSettingsPopup').classList.remove('open');}
function renderLearnSettingsList(){
  const wrap=document.getElementById('lrSettingsList');
  if(!wrap)return;
  wrap.innerHTML='';
  if(!LEARN_ITEMS.length){wrap.innerHTML='<div class="empty">등록된 학습 항목이 없어요</div>';return;}
  LEARN_ITEMS.forEach(it=>{
    const item=mkDiv('rmgmt-item');
    const endedTag=isLearnEnded(it)?' · 종료됨':'';
    item.innerHTML=`<div class="rmgmt-icon">${it.emoji||'📘'}</div><div class="rmgmt-info"><div class="rmgmt-name">${it.name}</div><div class="rmgmt-sub">${lrFreqLabel(it)}${endedTag}</div></div><button class="rmgmt-edit" onclick="settingsEditLearn('${it.id}')" title="수정">${icon('edit',14)}</button><button class="rmgmt-del" onclick="settingsDeleteLearn('${it.id}')" title="삭제">${icon('x-circle',15)}</button>`;
    wrap.appendChild(item);
  });
}
function settingsEditLearn(id){
  document.getElementById('learnSettingsPopup').classList.remove('open');
  editLearnStart(id);
}
function settingsDeleteLearn(id){
  deleteLearnItem(id); // 내부에서 LEARN_ITEMS 갱신 + renderLearn() 재호출
  renderLearnSettingsList();
}
function openNewLearnFromSettings(){
  document.getElementById('learnSettingsPopup').classList.remove('open');
  openLearnForm();
}
