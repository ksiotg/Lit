// ─── 외주(FREELANCE) ──────────────────────────────────────────────────────────
// 프로젝트별/클라이언트별 관리 + 마감 D-day 표시.
// "완료 처리"는 프로젝트 상태만 바꿀 뿐 가계부에는 아무것도 자동 등록하지 않음
// (완료 ≠ 입금이라, 입금은 가계부에서 직접 등록하는 게 맞음). 대신 가계부의 외주
// 수입 입력 폼에 "등록된 프로젝트에서 불러오기" 드롭다운을 연동해서, 실제 입금될
// 때마다 프로젝트를 골라 클라이언트/프로젝트명을 자동으로 채워넣을 수 있게 함.
let flView='project'; // 'project' | 'client'
let editingFlId=null;

function setFreelanceView(v){
  flView=v;
  document.getElementById('fvbtn-project').classList.toggle('active',v==='project');
  document.getElementById('fvbtn-client').classList.toggle('active',v==='client');
  renderFreelance();
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
  FREELANCE_PROJECTS=getFreelanceProjects();
  const progress=FREELANCE_PROJECTS.filter(p=>p.status!=='완료');
  const dueSoon=progress.filter(p=>{const dd=ddayInfo(p.dueDate);return dd&&dd.diff<=3;});
  const doneTotal=FREELANCE_PROJECTS.filter(p=>p.status==='완료').reduce((s,p)=>s+(p.amount||0),0);
  document.getElementById('flSumProgress').textContent=progress.length+'건';
  document.getElementById('flSumDday').textContent=dueSoon.length+'건';
  document.getElementById('flSumDone').textContent=fmt(doneTotal);
  const main=document.getElementById('freelanceMain');main.innerHTML='';
  main.appendChild(flView==='project'?buildFlProjectList():buildFlClientList());
}

// 착수일/마감일을 "시작~마감" 형태로 합쳐서 보여줌. 하나만 있으면 그것만 표시.
function flPeriodLabel(p){
  if(p.startDate&&p.dueDate)return `${p.startDate} ~ ${p.dueDate}`;
  if(p.startDate)return `${p.startDate} ~ (마감 미정)`;
  if(p.dueDate)return `~ ${p.dueDate}`;
  return '';
}

function buildFlRow(p){
  const row=mkDiv('fl-row');
  const dd=p.status==='완료'?null:ddayInfo(p.dueDate);
  const badge=p.status==='완료'
    ?'<span class="fl-badge done">완료</span>'
    :(dd?`<span class="fl-badge ${dd.cls}">${dd.label}</span>`:'<span class="fl-badge safe">기한없음</span>');
  const period=flPeriodLabel(p);
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
        ${p.status==='완료'
          ?`<button class="fl-act" onclick="revertFreelanceProject('${p.id}')">되돌리기</button>`
          :`<button class="fl-act primary" onclick="completeFreelanceProject('${p.id}')">완료 처리</button>`}
        <button class="fl-icon" onclick="editFreelanceProject('${p.id}')" title="수정">✏️</button>
        <button class="fl-icon del" onclick="deleteFreelanceProject('${p.id}')" title="삭제">×</button>
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
    // 진행중인 것 먼저(마감 임박 순), 완료는 아래로.
    const sorted=[...FREELANCE_PROJECTS].sort((a,b)=>{
      const aDone=a.status==='완료',bDone=b.status==='완료';
      if(aDone!==bDone)return aDone?1:-1;
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

// ─── 추가/수정 폼 ──────────────────────────────────────────────────────────────
function openFreelanceForm(){
  editingFlId=null;
  document.getElementById('flFormTitle').textContent='+ 새 프로젝트';
  document.getElementById('flSaveBtn').textContent='추가하기';
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
  document.getElementById('flFormTitle').textContent='✏️ 프로젝트 수정';
  document.getElementById('flSaveBtn').textContent='수정 완료';
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

// 완료 처리: 프로젝트 상태만 완료로 바꿈. 가계부에는 아무것도 자동으로 등록하지 않음.
// (외주는 완료≠입금이라, 실제 입금 시점에 가계부에서 "등록된 프로젝트에서 불러오기"로
// 직접 수입을 등록하는 방식을 사용함 — 분할 입금/입금 지연도 자연스럽게 처리됨)
function completeFreelanceProject(id){
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  if(!confirm('이 프로젝트를 완료 처리할까요?'))return;
  FREELANCE_PROJECTS=FREELANCE_PROJECTS.map(x=>x.id===id?{...x,status:'완료'}:x);
  saveFreelanceProjects(FREELANCE_PROJECTS);
  renderFreelance();
}

// 완료를 취소하고 다시 진행중으로 되돌림.
function revertFreelanceProject(id){
  const p=FREELANCE_PROJECTS.find(x=>x.id===id);
  if(!p)return;
  if(!confirm('완료를 취소하고 진행중으로 되돌릴까요?'))return;
  FREELANCE_PROJECTS=FREELANCE_PROJECTS.map(x=>x.id===id?{...x,status:'진행중'}:x);
  saveFreelanceProjects(FREELANCE_PROJECTS);
  renderFreelance();
}

// ─── 가계부 외주 입력 폼 연동 ───────────────────────────────────────────────────
// 가계부에서 "외주" 카테고리를 고르면, 외주 탭에 이미 등록해둔 프로젝트 목록을
// 드롭다운으로 보여줘서 클라이언트/프로젝트명을 직접 타이핑하지 않고 불러올 수 있게 함.
function populateFlProjectPicker(){
  const sel=document.getElementById('fProjectPicker');
  if(!sel)return;
  const list=[...FREELANCE_PROJECTS].sort((a,b)=>(a.status==='완료')-(b.status==='완료'));
  sel.innerHTML='<option value="">직접 입력</option>'+list.map(p=>
    `<option value="${p.id}">${p.client||'?'} · ${p.project||'?'}${p.status==='완료'?' (완료)':''}</option>`
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
