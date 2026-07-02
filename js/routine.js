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

function renderRoutine(){
  document.getElementById('routineMonthLabel').textContent=`${rY}년 ${rM+1}월`;
  if(!curWeekStart){
    const refDate=new Date(rY,rM,(rY===TODAY.getFullYear()&&rM===TODAY.getMonth())?TODAY.getDate():1);
    curWeekStart=getWeekStart(rY,rM,refDate.getDate());
  }
  const mc=document.getElementById('routineMain');mc.innerHTML='';
  // PC 대시보드에서는 전부 넓게 봐야 하는 위젯들이라 card-wide로 표시함
  // 달력을 맨 위로 올려서 한눈에 이번 달 상황부터 보이게 함
  const calCard=buildRoutineCal();calCard.classList.add('card-wide');mc.appendChild(calCard);
  const tableCard=buildRoutineTable();tableCard.classList.add('card-wide');mc.appendChild(tableCard);
  const achCard=buildMonthlyAchievement();achCard.classList.add('card-wide');mc.appendChild(achCard);
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

