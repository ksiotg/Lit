// ─── 외주(FREELANCE) ──────────────────────────────────────────────────────────
// 프로젝트별/클라이언트별 관리 + 마감 D-day 표시.
// 상태 흐름: 진행중 → 작업완료(마감일이 지나면 자동 전환, 미리 수동 전환도 가능) → 정산완료(입금 확인 후 수동 전환).
// "정산완료" 처리는 프로젝트 상태만 바꿀 뿐 가계부에는 아무것도 자동 등록하지 않음
// (작업완료/정산완료 ≠ 입금이라, 입금은 가계부에서 직접 등록하는 게 맞음). 대신 가계부의 외주
// 수입 입력 폼에 "등록된 프로젝트에서 불러오기" 드롭다운을 연동해서, 실제 입금될
// 때마다 프로젝트를 골라 클라이언트/프로젝트명을 자동으로 채워넣을 수 있게 함.
let flView='month'; // 'month' | 'project' | 'client' — 탭에 들어갈 때마다 기본값은 '월간'
let editingFlId=null;

function setFreelanceView(v){
  flView=v;
  renderFreelance();
}

function flSyncViewButtons(){
  document.getElementById('fvbtn-month').classList.toggle('active',flView==='month');
  document.getElementById('fvbtn-project').classList.toggle('active',flView==='project');
  document.getElementById('fvbtn-client').classList.toggle('active',flView==='client');
}

function chFlMonth(d){flM+=d;if(flM>11){flM=0;flY++;}if(flM<0){flM=11;flY--;}renderFreelance();}

// 상태 흐름: 진행중 → 작업완료(마감일이 지나면 자동 전환, 또는 수동으로 미리 전환 가능) → 정산완료(입금 확인 후 수동 전환).
// 예전에 쓰던 상태 이름(정산중/완료)도 여기서 새 이름으로 자동 마이그레이션해줌.
function flApplyAutoTransitions(list){
  const pad=n=>String(n).padStart(2,'0');
  const todayStr=`${TODAY.getFullYear()}-${pad(TODAY.getMonth()+1)}-${pad(TODAY.getDate())}`;
  let changed=false;
  const next=list.map(p=>{
    let status=p.status;
    if(status==='정산중')status='작업완료'; // 예전 이름 마이그레이션
    else if(status==='완료')status='정산완료'; // 예전 이름 마이그레이션
    else if(!status)status='진행중';
    if(status==='진행중'&&p.dueDate&&p.dueDate<todayStr)status='작업완료'; // 마감일 경과 자동 전환
    if(status!==p.status){changed=true;return {...p,status};}
    return p;
  });
  if(changed)saveFreelanceProjects(next);
  return next;
}

// dueDate(YYYY-MM-DD) 기준 D-day 계산. 완료된 프로젝트는 호출 안 함.
function ddayInfo(dueDate){
  if(!dueDate)return null;
  const today=new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
  const [y,m,d]=dueDate.split('-').map(Number);
  if(!y||!m||!d)return null;
  const due=new Date(y,m-1,d);
  const diff=Math.round((due-today)/86400000);
  let label,cls;
  if(diff>7){label=`D-${diff}`;cls='safe';}
  else if(diff>0){label=`D-${diff}`;cls='soon';}
  else if(diff===0){label='D-DAY';cls='soon';}
  else{label=`D+${Math.abs(diff)}`;cls='over';}
  return {diff,label,cls};
}

function renderFreelance(){
  FREELANCE_PROJECTS=flApplyAutoTransitions(getFreelanceProjects());
  document.getElementById('flMonthLabel').textContent=`${flY}년 ${flM+1}월`;
  flSyncViewButtons();
  const inProgress=FREELANCE_PROJECTS.filter(p=>p.status==='진행중');
  const workDone=FREELANCE_PROJECTS.filter(p=>p.status==='작업완료');
  const settledTotal=FREELANCE_PROJECTS.filter(p=>p.status==='정산완료').reduce((s,p)=>s+(p.amount||0),0);
  document.getElementById('flSumProgress').textContent=inProgress.length+'건';
  document.getElementById('flSumSettling').textContent=workDone.length+'건';
  document.getElementById('flSumDone').textContent=fmt(settledTotal);
  const main=document.getElementById('freelanceMain');main.innerHTML='';
  let listCard;
  if(flView==='month')listCard=buildFlMonthView();
  else if(flView==='client')listCard=buildFlClientList();
  else listCard=buildFlProjectList();
  listCard.classList.add('card-wide');
  main.appendChild(listCard);
  // 프로젝트 캘린더는 "월간" 뷰에서만 표시 (프로젝트/클라이언트 뷰에서는 숨김)
  if(flView==='month'){
    const calCard=buildFlCal();
    calCard.classList.add('card-wide');
    main.appendChild(calCard);
  }
}

// 착수일/마감일을 "시작~마감" 형태로 합쳐서 보여줌. 하나만 있으면 그것만 표시.
function flPeriodLabel(p){
  if(p.startDate&&p.dueDate)return `${p.startDate} ~ ${p.dueDate}`;
  if(p.startDate)return `${p.startDate} ~ (마감 미정)`;
  if(p.dueDate)return `~ ${p.dueDate}`;
  return '';
}

// 상태별 배지: 진행중은 마감 D-day, 작업완료/정산완료는 전용 배지.
function flStatusBadge(p){
  if(p.status==='정산완료')return '<span class="fl-badge done">💰 정산완료</span>';
  if(p.status==='작업완료')return '<span class="fl-badge settling">📋 작업완료</span>';
  const dd=ddayInfo(p.dueDate);
  return dd?`<span class="fl-badge ${dd.cls}">${dd.label}</span>`:'<span class="fl-badge safe">기한없음</span>';
}

function buildFlRow(p){
  const row=mkDiv('fl-row');
  const badge=flStatusBadge(p);
  const period=flPeriodLabel(p);
  let actions;
  if(p.status==='진행중'){
    actions=`<button class="fl-act primary" onclick="flAdvanceStatus('${p.id}')">작업 완료</button>`;
  }else if(p.status==='작업완료'){
    actions=`<button class="fl-act primary" onclick="flAdvanceStatus('${p.id}')">입금 완료</button><button class="fl-act" onclick="flRevertStatus('${p.id}')">되돌리기</button>`;
  }else{
    actions=`<button class="fl-act" onclick="flRevertStatus('${p.id}')">되돌리기</button>`;
  }
  row.innerHTML=`
    <div class="fl-row-top">
      <div class="fl-row-info" onclick="openFreelanceDetail('${p.id}')" title="정산 내역 보기">
        <div class="fl-row-name">${p.project||'(제목없음)'}</div>
        <div class="fl-row-client">🏢 ${p.client||'미지정'}${period?' · '+period:''}</div>
      </div>
      ${badge}
    </div>
    <div class="fl-row-bottom">
      <div class="fl-row-amt">${fmt(p.amount||0)}</div>
      <div class="fl-row-actions">
        ${actions}
        <button class="fl-icon" onclick="editFreelanceProject('${p.id}')" title="수정">${icon('edit',14)}</button>
        <button class="fl-icon del" onclick="deleteFreelanceProject('${p.id}')" title="삭제">${icon('x-circle',15)}</button>
      </div>
    </div>`;
  return row;
}

function buildFlProjectList(){
  const card=mkDiv('card');card.innerHTML='<div class="card-header"><span class="card-title">프로젝트 목록</span></div>';
  const wrap=document.createElement('div');wrap.style.cssText='padding:10px 16px 16px;display:flex;flex-direction:column;gap:8px;';
  if(!FREELANCE_PROJECTS.length){
    wrap.innerHTML='<div class="empty">등록된 프로젝트가 없어요</div>';
  }else{
    // 진행중 → 작업완료 → 정산완료 순, 그 안에서는 마감 임박 순.
    const rank={'진행중':0,'작업완료':1,'정산완료':2};
    const sorted=[...FREELANCE_PROJECTS].sort((a,b)=>{
      const r=(rank[a.status]??0)-(rank[b.status]??0);
      if(r)return r;
      return (a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99');
    });
    sorted.forEach(p=>wrap.appendChild(buildFlRow(p)));
  }
  card.appendChild(wrap);return card;
}

function buildFlClientList(){
  const card=mkDiv('card');card.innerHTML='<div class="card-header"><span class="card-title">클라이언트별 보기</span></div>';
  const wrap=document.createElement('div');wrap.style.cssText='padding:10px 16px 16px;display:flex;flex-direction:column;gap:12px;';
  if(!FREELANCE_PROJECTS.length){
    wrap.innerHTML='<div class="empty">등록된 프로젝트가 없어요</div>';
  }else{
    const byClient={};
    FREELANCE_PROJECTS.forEach(p=>{const key=p.client||'(미지정)';(byClient[key]=byClient[key]||[]).push(p);});
    Object.entries(byClient).sort((a,b)=>b[1].length-a[1].length).forEach(([client,projects])=>{
      const total=projects.reduce((s,p)=>s+(p.amount||0),0);
      const group=mkDiv('fl-client-group');
      const head=mkDiv('fl-client-head');
      head.innerHTML=`<span class="fl-client-name">🏢 ${client}</span><span class="fl-client-total">${fmt(total)} · ${projects.length}건</span>`;
      const list=document.createElement('div');list.style.cssText='display:flex;flex-direction:column;gap:6px;margin-top:10px;';
      [...projects].sort((a,b)=>(a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99')).forEach(p=>list.appendChild(buildFlRow(p)));
      group.appendChild(head);group.appendChild(list);
      wrap.appendChild(group);
    });
  }
  card.appendChild(wrap);return card;
}

// ─── 월간 뷰: 이 달에 정산된 외주 수입 모아보기 ──────────────────────────────────
function buildFlMonthView(){
  const entries=S.getEntries(flY,flM).filter(e=>e.type==='income'&&e.cat==='외주');
  const total=entries.reduce((s,e)=>s+e.amount,0);
  const card=mkDiv('card');
  card.innerHTML=`<div class="card-header"><span class="card-title">${flY}년 ${flM+1}월 정산 내역</span></div>`;
  const summary=document.createElement('div');
  summary.style.cssText='padding:0 16px 12px;display:flex;justify-content:space-between;align-items:center;';
  summary.innerHTML=`<span style="font-size:12px;color:var(--muted);font-weight:700;">이번 달 정산 합계</span><span style="font-size:16px;font-weight:800;color:var(--freelance);">${fmt(total)}</span>`;
  card.appendChild(summary);
  const list=document.createElement('div');
  list.style.cssText='padding:0 16px 16px;display:flex;flex-direction:column;gap:6px;';
  if(!entries.length){
    list.innerHTML='<div class="empty">이번 달 정산 내역이 없어요</div>';
  }else{
    [...entries].sort((a,b)=>a.day-b.day).forEach(e=>{
      const row=document.createElement('div');row.className='fl-payment-row';
      row.innerHTML=`<span class="fl-payment-date">${flM+1}.${String(e.day).padStart(2,'0')}</span><span style="flex:1;font-size:12px;font-weight:600;padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name||''}</span><span class="fl-payment-amt">+${fmt(e.amount)}</span>`;
      list.appendChild(row);
    });
  }
  card.appendChild(list);
  return card;
}

// ─── 프로젝트 캘린더: 작업기간(착수~마감)+정산일을 한 달력에 표시 ─────────────────
const FL_CAL_PALETTE=['#8b5cf6','#f59e0b','#10b981','#3b82f6','#ec4899','#ef4444','#06b6d4','#84cc16'];
function buildFlCal(){
  const dim=new Date(flY,flM+1,0).getDate();
  const fd=new Date(flY,flM,1).getDay();
  const fdMon=fd===0?6:fd-1;
  const pad=n=>String(n).padStart(2,'0');
  const monthStart=`${flY}-${pad(flM+1)}-01`,monthEnd=`${flY}-${pad(flM+1)}-${pad(dim)}`;
  // 이 달과 기간이 겹치는 프로젝트만 색상 배정 (착수/마감 중 하나만 있어도 그 날 하루짜리로 취급)
  const activeProjects=FREELANCE_PROJECTS.filter(p=>{
    if(!p.startDate&&!p.dueDate)return false;
    const s=p.startDate||p.dueDate,e=p.dueDate||p.startDate;
    return s<=monthEnd&&e>=monthStart;
  });
  const colorOf={};
  activeProjects.forEach((p,i)=>{colorOf[p.id]=FL_CAL_PALETTE[i%FL_CAL_PALETTE.length];});
  const settleEntries=S.getEntries(flY,flM).filter(e=>e.type==='income'&&e.cat==='외주');
  const settleByDay={};
  settleEntries.forEach(e=>{(settleByDay[e.day]=settleByDay[e.day]||[]).push(e);});

  const card=mkDiv('card');
  const dow=mkDiv('cal-dow-row');
  dow.style.paddingTop='14px';
  ['월','화','수','목','금','토','일'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===5?'sat':i===6?'sun':''}`);e.textContent=d;dow.appendChild(e);});
  const grid=mkDiv('cal-grid');
  for(let i=0;i<fdMon;i++)grid.appendChild(mkDiv('cal-cell empty'));
  for(let d=1;d<=dim;d++){
    const dow2=(fdMon+d-1)%7;
    const isT=TODAY.getFullYear()===flY&&TODAY.getMonth()===flM&&TODAY.getDate()===d;
    const dateStr=`${flY}-${pad(flM+1)}-${pad(d)}`;
    const cell=mkDiv(`cal-cell ${isT?'today':''} ${dow2===5?'sat':''} ${dow2===6?'sun':''}`);
    const dayEl=mkDiv('cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    const dayProjects=activeProjects.filter(p=>{
      const s=p.startDate||p.dueDate,e=p.dueDate||p.startDate;
      return dateStr>=s&&dateStr<=e;
    });
    if(dayProjects.length){
      const dotsWrap=mkDiv('');dotsWrap.style.cssText='display:flex;gap:2px;justify-content:center;flex-wrap:wrap;margin-top:2px;';
      dayProjects.slice(0,4).forEach(p=>{
        const dot=mkDiv('');dot.style.cssText=`width:5px;height:5px;border-radius:50%;background:${colorOf[p.id]};`;
        dot.title=flProjectLabel(p);
        dotsWrap.appendChild(dot);
      });
      cell.appendChild(dotsWrap);
    }
    const daySettles=settleByDay[d]||[];
    if(daySettles.length){
      cell.style.background='var(--freelance-tint)';
    }
    if(dayProjects.length||daySettles.length)cell.onclick=()=>openFlDayDetail(dateStr,dayProjects,daySettles);
    grid.appendChild(cell);
  }
  card.appendChild(dow);card.appendChild(grid);
  if(activeProjects.length){
    const legend=document.createElement('div');
    legend.style.cssText='padding:2px 16px 14px;display:flex;flex-wrap:wrap;gap:8px 12px;';
    legend.innerHTML=activeProjects.map(p=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--muted);"><span style="width:7px;height:7px;border-radius:50%;background:${colorOf[p.id]};display:inline-block;"></span>${p.project||'(제목없음)'}</span>`).join('')
      +`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--muted);"><span style="width:7px;height:7px;border-radius:50%;background:var(--freelance-tint);border:1.5px solid var(--freelance);display:inline-block;"></span>정산일</span>`;
    card.appendChild(legend);
  }
  return card;
}

function openFlDayDetail(dateStr,dayProjects,settlements){
  const [y,m,d]=dateStr.split('-');
  document.getElementById('flDayTitle').textContent=`${y}.${m}.${d}`;
  const parts=[];
  if(dayProjects.length){
    parts.push(`<div><div class="add-routine-form-title" style="margin-bottom:8px;">📁 진행 중인 프로젝트</div><div style="display:flex;flex-direction:column;gap:6px;">${dayProjects.map(p=>
      `<div class="fl-payment-row" style="cursor:pointer;" onclick="closeFlDayPopupAndOpen('${p.id}')"><span style="font-size:12px;font-weight:700;">${p.project||'(제목없음)'}</span><span style="font-size:11px;color:var(--muted);">🏢 ${p.client||'미지정'}</span></div>`
    ).join('')}</div></div>`);
  }
  if(settlements.length){
    parts.push(`<div><div class="add-routine-form-title" style="margin-bottom:8px;">💰 정산</div><div style="display:flex;flex-direction:column;gap:6px;">${settlements.map(e=>
      `<div class="fl-payment-row"><span style="font-size:12px;font-weight:600;">${e.name||''}</span><span class="fl-payment-amt">+${fmt(e.amount)}</span></div>`
    ).join('')}</div></div>`);
  }
  document.getElementById('flDayContent').innerHTML=parts.join('')||'<div class="empty">내역이 없어요</div>';
  document.getElementById('flDayPopup').classList.add('open');
}
function closeFlDayPopup(e){if(e.target===document.getElementById('flDayPopup'))document.getElementById('flDayPopup').classList.remove('open');}
function closeFlDayPopupAndOpen(id){document.getElementById('flDayPopup').classList.remove('open');openFreelanceDetail(id);}

// ─── 추가/수정 폼 ──────────────────────────────────────────────────────────────
function openFreelanceForm(){
  editingFlId=null;
  document.getElementById('flFormTitle').innerHTML=`${icon('plus-circle',16)} 새 프로젝트`;
  document.getElementById('flSaveBtn').innerHTML=`${icon('plus-circle',14)} 추가하기`;
  ['flClient','flProject','flAmount','flStartDate','flDueDate','flMemo'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('flTaxRate').value='3.3';
  document.getElementById('flTaxPreview').classList.remove('show');
  document.getElementById('freelanceFormPopup').classList.add('open');
}
function closeFreelanceForm(e){if(e.target===document.getElementById('freelanceFormPopup'))document.getElementById('freelanceFormPopup').classList.remove('open');}

function calcFlTax(){
  const amt=parseFloat(document.getElementById('flAmount').value)||0;
  const rate=parseFloat(document.getElementById('flTaxRate').value)||3.3;
  const prev=document.getElementById('flTaxPreview');
  if(amt>0){prev.classList.add('show');document.getElementById('flTaxKip').textContent=fmt(Math.round(amt*rate/100));document.getElementById('flTaxNet').textContent=fmt(amt-Math.round(amt*rate/100));}
  else prev.classList.remove('show');
}

function editFreelanceProject(id){
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  editingFlId=id;
  document.getElementById('flFormTitle').innerHTML=`${icon('edit',16)} 프로젝트 수정`;
  document.getElementById('flSaveBtn').innerHTML=`${icon('edit',14)} 수정 완료`;
  document.getElementById('flClient').value=p.client||'';
  document.getElementById('flProject').value=p.project||'';
  document.getElementById('flAmount').value=p.amount||'';
  document.getElementById('flTaxRate').value=p.taxRate||3.3;
  document.getElementById('flStartDate').value=p.startDate||'';
  document.getElementById('flDueDate').value=p.dueDate||'';
  document.getElementById('flMemo').value=p.memo||'';
  calcFlTax();
  document.getElementById('freelanceFormPopup').classList.add('open');
}

function saveFreelanceForm(){
  const client=document.getElementById('flClient').value.trim();
  const project=document.getElementById('flProject').value.trim();
  const amount=parseInt(document.getElementById('flAmount').value)||0;
  const taxRate=parseFloat(document.getElementById('flTaxRate').value)||3.3;
  const startDate=document.getElementById('flStartDate').value;
  const dueDate=document.getElementById('flDueDate').value;
  const memo=document.getElementById('flMemo').value.trim();
  if(!client||!project){alert('클라이언트명과 프로젝트명을 입력해줘');return;}
  if(startDate&&dueDate&&startDate>dueDate){alert('마감일이 착수일보다 빠를 수 없어요');return;}
  if(editingFlId){
    FREELANCE_PROJECTS=FREELANCE_PROJECTS.map(p=>p.id===editingFlId?{...p,client,project,amount,taxRate,startDate,dueDate,memo}:p);
  }else{
    FREELANCE_PROJECTS=[...FREELANCE_PROJECTS,{id:'fp'+Date.now(),client,project,amount,taxRate,startDate,dueDate,memo,status:'진행중',createdAt:Date.now()}];
  }
  saveFreelanceProjects(FREELANCE_PROJECTS);
  document.getElementById('freelanceFormPopup').classList.remove('open');
  renderFreelance();
}

function deleteFreelanceProject(id){
  if(!confirm('이 프로젝트를 삭제할까요? (이미 가계부에 등록된 수입 기록은 그대로 남아요)'))return;
  FREELANCE_PROJECTS=FREELANCE_PROJECTS.filter(p=>p.id!==id);
  saveFreelanceProjects(FREELANCE_PROJECTS);
  renderFreelance();
}

// 상태를 한 단계 진행시킴: 진행중(작업 중) → 작업완료(작업 끝, 입금 대기 — 마감일이 지나면 자동으로도 전환됨.
// 마감일 전에 미리 끝냈으면 이 버튼으로 앞당겨 전환 가능) → 정산완료(입금까지 끝나서 수입으로 기재됨).
// 정산완료 처리는 여전히 프로젝트 상태만 바꿀 뿐 가계부에는 아무것도 자동 등록하지 않음
// (실제 입금은 가계부에서 "등록된 프로젝트에서 불러오기"로 직접 등록 — 분할 입금/지연도 자연스럽게 처리됨).
function flAdvanceStatus(id){
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  if(p.status==='진행중'){
    if(!confirm('작업을 완료 처리할까요? (마감일이 지나면 자동으로도 전환돼요)'))return;
    FREELANCE_PROJECTS=FREELANCE_PROJECTS.map(x=>x.id===id?{...x,status:'작업완료'}:x);
  }else if(p.status==='작업완료'){
    if(!confirm('입금까지 완료됐나요? 정산완료로 처리할까요?'))return;
    FREELANCE_PROJECTS=FREELANCE_PROJECTS.map(x=>x.id===id?{...x,status:'정산완료'}:x);
  }else return;
  saveFreelanceProjects(FREELANCE_PROJECTS);
  renderFreelance();
}

// 상태를 한 단계 되돌림: 정산완료 → 작업완료, 작업완료 → 진행중.
// (작업완료로 되돌려도 마감일이 이미 지났다면 다음 렌더링 때 자동전환으로 다시 작업완료가 됨)
function flRevertStatus(id){
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  let prev;
  if(p.status==='정산완료'){prev='작업완료';if(!confirm('정산완료를 취소하고 작업완료로 되돌릴까요?'))return;}
  else if(p.status==='작업완료'){prev='진행중';if(!confirm('작업완료를 취소하고 진행중으로 되돌릴까요?'))return;}
  else return;
  FREELANCE_PROJECTS=FREELANCE_PROJECTS.map(x=>x.id===id?{...x,status:prev}:x);
  saveFreelanceProjects(FREELANCE_PROJECTS);
  renderFreelance();
}

// ─── 가계부 외주 입력 폼 연동 ───────────────────────────────────────────────────
// 가계부에서 "외주" 카테고리를 고르면, 외주 탭에 이미 등록해둔 프로젝트 목록을
// 드롭다운으로 보여줘서 클라이언트/프로젝트명을 직접 타이핑하지 않고 불러올 수 있게 함.
function populateFlProjectPicker(){
  const sel=document.getElementById('fProjectPicker');
  if(!sel)return;
  // 완전히 정산 끝난(정산완료) 프로젝트는 목록에서 아예 제외. 아직 안 끝난(진행중/작업완료 등
  // 부분 정산 상태) 프로젝트만 골라서 등록할 수 있게 함.
  const list=FREELANCE_PROJECTS.filter(p=>p.status!=='정산완료');
  sel.innerHTML='<option value="">프로젝트를 선택하세요</option>'+list.map(p=>
    `<option value="${p.id}">${p.client||'?'} · ${p.project||'?'}</option>`
  ).join('');
  sel.value='';
}
function applyFlProjectPick(){
  const id=document.getElementById('fProjectPicker').value;
  pickedFlProjectId=id||null;
  if(!id)return;
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  document.getElementById('fClient').value=p.client||'';
  document.getElementById('fProject').value=p.project||'';
  if(p.amount)document.getElementById('fAmount').value=p.amount;
  if(p.taxRate)document.getElementById('fTaxRate').value=p.taxRate;
  calcTax();
}

// ─── 프로젝트 상세보기 (정산 내역) ──────────────────────────────────────────────
function flProjectLabel(p){return [p.client,p.project].filter(Boolean).join(' / ');}

// 이 프로젝트로 등록된 가계부 외주 수입 항목을 모든 달에 걸쳐 찾아냄.
// projectId로 연결된 항목을 우선 찾고(등록된 프로젝트 불러오기로 입력한 경우),
// projectId가 없는 옛날 항목은 "클라이언트 / 프로젝트명" 문구가 정확히 일치하는 것으로 대신 매칭함.
function getProjectPayments(project){
  const label=flProjectLabel(project);
  const payments=[];
  getAllEntryMonths().forEach(({ym,entries})=>{
    entries.forEach(e=>{
      if(e.type!=='income'||e.cat!=='외주')return;
      const matched=e.projectId?e.projectId===project.id:(e.name===label);
      if(matched)payments.push({...e,ym});
    });
  });
  payments.sort((a,b)=>(a.ym+String(a.day).padStart(2,'0')).localeCompare(b.ym+String(b.day).padStart(2,'0')));
  return payments;
}

function openFreelanceDetail(id){
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  const payments=getProjectPayments(p);
  const received=payments.reduce((s,e)=>s+e.amount,0);
  const contract=p.amount||0;
  const pct=contract?Math.min(100,Math.round(received/contract*100)):0;
  const remain=contract-received;
  const period=flPeriodLabel(p);

  document.getElementById('flDetailTitle').textContent=p.project||'(제목없음)';
  document.getElementById('flDetailSub').textContent=`🏢 ${p.client||'미지정'}${period?' · '+period:''}`;
  document.getElementById('flDetailProgress').innerHTML=`
    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px;">
      <span>정산 ${fmt(received)} / 계약 ${fmt(contract)}</span>
      <span style="color:${remain>0?'var(--expense)':'var(--remain)'}">${contract?(remain>0?'미정산 '+fmt(remain):'정산 완료'):''}</span>
    </div>
    <div style="height:8px;background:#f0f0f5;border-radius:99px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:var(--freelance);border-radius:99px;"></div>
    </div>
    <div style="text-align:right;font-size:11px;color:var(--muted);margin-top:4px;">${pct}%</div>`;

  const list=document.getElementById('flDetailPayments');
  if(!payments.length){
    list.innerHTML='<div class="empty">아직 등록된 정산 내역이 없어요</div>';
  }else{
    list.innerHTML=payments.map(e=>{
      const [y,m]=e.ym.split('-');
      return `<div class="fl-payment-row"><span class="fl-payment-date">${y}.${m}.${String(e.day).padStart(2,'0')}</span><span class="fl-payment-amt">+${fmt(e.amount)}</span></div>`;
    }).join('');
  }
  document.getElementById('freelanceDetailPopup').classList.add('open');
}
function closeFreelanceDetail(e){if(e.target===document.getElementById('freelanceDetailPopup'))document.getElementById('freelanceDetailPopup').classList.remove('open');}
