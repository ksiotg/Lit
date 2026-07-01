// ─── ROUTINE MANAGEMENT ───────────────────────────────────────────────────────
function openRoutineMgmt(){
  renderRoutineMgmtList();
  document.getElementById('routineMgmtPopup').classList.add('open');
}

function closeRoutineMgmt(e){if(e.target===document.getElementById('routineMgmtPopup'))document.getElementById('routineMgmtPopup').classList.remove('open');}

function freqLabel(r){
  if(r.autoFromBudget)return '가계부 자동';
  if(r.autoFromReview)return '회고 자동';
  if(r.freq==='daily')return '매일';
  if(r.freq==='weekly')return `주 ${r.weeklyN}회`;
  if(r.freq==='days')return `${(r.days||[]).map(i=>['월','화','수','목','금','토','일'][i]).join('/')}`;
  if(r.freq==='monthly')return `월 ${r.monthlyN}회`;
  return '';
}

function renderRoutineMgmtList(){
  const wrap=document.getElementById('routineMgmtList');wrap.innerHTML='';
  const periods=['morning','day','evening'];
  const periodLabel={morning:'☀️ 아침',day:'✨ 일중',evening:'🌙 저녁'};
  periods.forEach(p=>{
    const items=ROUTINES.filter(r=>r.period===p);
    if(!items.length)return;
    const label=mkDiv('');label.style.cssText='font-size:11px;font-weight:700;color:var(--muted);margin:8px 0 4px;letter-spacing:0.5px;';
    label.textContent=periodLabel[p];wrap.appendChild(label);
    items.forEach((r,i)=>{
      const item=mkDiv('rmgmt-item');
      const isAuto=r.autoFromBudget||r.autoFromReview;
      const moveBtns=`<div style="display:flex;flex-direction:column;">
        <button class="rmgmt-edit" style="font-size:10px;padding:0;line-height:1;${i===0?'opacity:0.25;pointer-events:none;':''}" onclick="moveRoutine('${r.id}',-1)" title="위로">▲</button>
        <button class="rmgmt-edit" style="font-size:10px;padding:0;line-height:1;${i===items.length-1?'opacity:0.25;pointer-events:none;':''}" onclick="moveRoutine('${r.id}',1)" title="아래로">▼</button>
      </div>`;
      item.innerHTML=`${moveBtns}<div class="rmgmt-icon">${r.emoji}</div><div class="rmgmt-info"><div class="rmgmt-name">${r.name}</div><div class="rmgmt-sub">${freqLabel(r)} · ${CAT_LABELS[r.cat]}</div></div>${isAuto?'<span style="font-size:10px;color:var(--muted);padding:4px 8px;background:#f0f0f5;border-radius:6px;">자동</span>':`<button class="rmgmt-del" onclick="deleteRoutine('${r.id}')">×</button>`}`;
      wrap.appendChild(item);
    });
  });
}

function moveRoutine(id,dir){
  const r=ROUTINES.find(x=>x.id===id);
  if(!r)return;
  const samePeriod=ROUTINES.filter(x=>x.period===r.period);
  const idx=samePeriod.indexOf(r);
  const swapIdx=idx+dir;
  if(swapIdx<0||swapIdx>=samePeriod.length)return;
  const other=samePeriod[swapIdx];
  const gi=ROUTINES.indexOf(r),gj=ROUTINES.indexOf(other);
  [ROUTINES[gi],ROUTINES[gj]]=[ROUTINES[gj],ROUTINES[gi]];
  saveRoutines(ROUTINES);
  renderRoutineMgmtList();
  renderRoutine();
}

function deleteRoutine(id){
  if(!confirm('이 루틴을 삭제할까요?'))return;
  ROUTINES=ROUTINES.filter(r=>r.id!==id);
  saveRoutines(ROUTINES);
  renderRoutineMgmtList();
  renderRoutine();
}

function selNewCat(btn){
  document.querySelectorAll('.cat-btn').forEach(b=>{b.classList.remove('active');});
  btn.classList.add('active');
  newRCat=btn.dataset.cat;
}

function selNewPeriod(btn){
  document.querySelectorAll('[data-period]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  newRPeriod=btn.dataset.period;
}

function selNewFreq(btn){
  document.querySelectorAll('[data-freq]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  newRFreq=btn.dataset.freq;
  renderFreqDetail();
}

function renderFreqDetail(){
  const wrap=document.getElementById('freqDetailWrap');
  wrap.innerHTML='';wrap.style.display='none';
  if(newRFreq==='weekly'){
    wrap.style.display='block';
    wrap.innerHTML=`<label class="fl" style="margin-bottom:6px;display:block;">주 몇 회?</label><div style="display:flex;gap:6px;">${[1,2,3,4,5,6,7].map(n=>`<button style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:${newRWeeklyN===n?'var(--text)':'#fff'};color:${newRWeeklyN===n?'#fff':'var(--muted)'};font-size:12px;font-weight:700;cursor:pointer;" onclick="setWeeklyN(${n},this)">${n}</button>`).join('')}</div>`;
  } else if(newRFreq==='days'){
    wrap.style.display='block';
    wrap.innerHTML=`<label class="fl" style="margin-bottom:6px;display:block;">요일 선택</label><div style="display:flex;gap:4px;">${['월','화','수','목','금','토','일'].map((d,i)=>`<button class="dow-btn ${newRWeekDays.includes(i)?'active':''}" onclick="toggleDow(${i},this)">${d}</button>`).join('')}</div>`;
  } else if(newRFreq==='monthly'){
    wrap.style.display='block';
    wrap.innerHTML=`<label class="fl" style="margin-bottom:6px;display:block;">월 몇 회?</label><div style="display:flex;gap:6px;flex-wrap:wrap;">${[1,2,3,4,5,6,7,8].map(n=>`<button style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:${newRMonthlyN===n?'var(--text)':'#fff'};color:${newRMonthlyN===n?'#fff':'var(--muted)'};font-size:12px;font-weight:700;cursor:pointer;" onclick="setMonthlyN(${n},this)">${n}</button>`).join('')}</div>`;
  }
}

function setWeeklyN(n,btn){
  newRWeeklyN=n;
  btn.parentElement.querySelectorAll('button').forEach(b=>{b.style.background='#fff';b.style.color='var(--muted)';});
  btn.style.background='var(--text)';btn.style.color='#fff';
}

function toggleDow(i,btn){
  if(newRWeekDays.includes(i))newRWeekDays=newRWeekDays.filter(x=>x!==i);
  else newRWeekDays.push(i);
  btn.classList.toggle('active');
}

function setMonthlyN(n,btn){
  newRMonthlyN=n;
  btn.parentElement.querySelectorAll('button').forEach(b=>{b.style.background='#fff';b.style.color='var(--muted)';});
  btn.style.background='var(--text)';btn.style.color='#fff';
}

function saveNewRoutine(){
  const name=document.getElementById('newRName').value.trim();
  const emoji=document.getElementById('newREmoji').value.trim()||'⭐';
  const time=document.getElementById('newRTime').value.trim()||null;
  if(!name){alert('루틴 이름을 입력해주세요');return;}
  let goal=7;
  if(newRFreq==='weekly')goal=newRWeeklyN;
  else if(newRFreq==='days')goal=newRWeekDays.length||1;
  else if(newRFreq==='monthly')goal=newRMonthlyN;
  const newR={
    id:'r'+Date.now(),name,emoji,time,period:newRPeriod,cat:newRCat,goal,
    freq:newRFreq,
    ...(newRFreq==='weekly'?{weeklyN:newRWeeklyN}:{}),
    ...(newRFreq==='days'?{days:[...newRWeekDays]}:{}),
    ...(newRFreq==='monthly'?{monthlyN:newRMonthlyN}:{}),
  };
  ROUTINES.push(newR);
  saveRoutines(ROUTINES);
  // 폼 초기화
  document.getElementById('newRName').value='';
  document.getElementById('newREmoji').value='';
  document.getElementById('newRTime').value='';
  newRFreq='daily';newRPeriod='morning';newRCat='selfcare';newRWeekDays=[];newRWeeklyN=3;newRMonthlyN=2;
  document.querySelectorAll('[data-freq]').forEach(b=>b.classList.toggle('active',b.dataset.freq==='daily'));
  document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period==='morning'));
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat==='selfcare'));
  document.getElementById('freqDetailWrap').style.display='none';
  renderRoutineMgmtList();
  renderRoutine();
}
