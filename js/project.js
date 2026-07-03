// ─── 프로젝트(PROJECT) ────────────────────────────────────────────────────────
// 인생의 크고 작은 목표/프로젝트를 정리하는 탭. 외주 탭의 카드/아코디언 패턴을 재사용하고,
// 카테고리는 루틴 탭 것을 완전히 그대로 재사용함 — 케어/건강/성장/생활 4개, 라벨/색상도
// CAT_LABELS/CAT_COLORS(data-state.js) 그대로. 가계부처럼 사용자가 이름/이모지/색을
// 추가·수정하는 방식이 아니라 루틴과 동일한 고정 목록(PJ_CAT_LIST).
// 상태(대기/진행중/완료/보류)는 사용자가 직접 지정하는 필드. 체크리스트가 있는
// 프로젝트는 체크된 비율로 진행률(%)을 자동 계산해서 보여주지만, 그렇다고 상태가
// 자동으로 바뀌진 않음 — "완료" 처리는 항상 사용자가 상태 버튼으로 직접 함.
let editingPjId=null;
let pjDoneExpanded=false; // "완료" 아코디언 펼침 여부
let pjHoldExpanded=false; // "보류" 아코디언 펼침 여부
let pjDetailId=null;      // 상세 팝업에서 체크리스트 추가/삭제할 때 대상 프로젝트
let pjStatusSel='대기';   // 추가/수정 폼에서 현재 선택된 상태
let pjCatSel=null;        // 추가/수정 폼에서 현재 선택된 카테고리 키(PJ_CAT_LIST 중 하나)

const PJ_STATUS_LIST=['대기','진행중','완료','보류'];
const PJ_STATUS_BADGE={'대기':'wait','진행중':'progress','완료':'done','보류':'hold'};
const PJ_STATUS_EMOJI={'대기':'⏳','진행중':'🔥','완료':'✅','보류':'⏸️'};

// 체크리스트가 있으면 완료 비율(%)을, 없으면 null을 반환.
function pjProgress(p){
  if(!p.checklist||!p.checklist.length)return null;
  const done=p.checklist.filter(c=>c.done).length;
  return Math.round(done/p.checklist.length*100);
}
function pjCatInfo(catKey){
  // 루틴 탭과 동일한 CAT_LABELS/CAT_COLORS(data-state.js)를 그대로 씀.
  return {label:CAT_LABELS[catKey]||CAT_LABELS.selfcare,color:CAT_COLORS[catKey]||CAT_COLORS.selfcare};
}
function pjBadge(status){
  const cls=PJ_STATUS_BADGE[status]||'wait';
  const emoji=PJ_STATUS_EMOJI[status]||'⏳';
  return `<span class="pj-badge ${cls}">${emoji} ${status}</span>`;
}

function renderProjects(){
  PROJECTS=getProjects();
  const main=document.getElementById('projectMain');main.innerHTML='';
  const card=buildProjectList();
  card.classList.add('card-wide');
  main.appendChild(card);
}

function buildPjRow(p){
  const row=mkDiv('pj-row');
  const cat=pjCatInfo(p.cat);
  const progress=pjProgress(p);
  const badge=pjBadge(p.status);
  const dueLabel=p.dueDate?`🎯 ${p.dueDate}`:'';
  const subParts=[`<span class="pj-cat-badge" style="background:${cat.color}22;color:${cat.color};">${cat.label}</span>`];
  if(dueLabel)subParts.push(`<span>${dueLabel}</span>`);
  let progressHtml='';
  if(progress!==null){
    progressHtml=`<div style="display:flex;align-items:center;gap:8px;"><div class="pj-progress-track"><div class="pj-progress-fill" style="width:${progress}%;"></div></div><span class="pj-progress-pct">${progress}%</span></div>`;
  }
  row.innerHTML=`
    <div class="pj-row-top">
      <div class="pj-row-info" onclick="openProjectDetail('${p.id}')" title="상세보기">
        <div class="pj-row-name-line">
          <span class="pj-row-emoji" style="background:${cat.color}22;">${p.emoji||'🎯'}</span>
          <div class="pj-row-name">${p.title||'(제목없음)'}</div>
        </div>
        <div class="pj-row-sub">${subParts.join('')}</div>
      </div>
      ${badge}
    </div>
    ${progressHtml}
    <div style="display:flex;justify-content:flex-end;gap:4px;">
      <button class="pj-icon" onclick="editProjectStart('${p.id}')" title="수정">${icon('edit',14)}</button>
      <button class="pj-icon del" onclick="deleteProject('${p.id}')" title="삭제">${icon('x-circle',15)}</button>
    </div>`;
  return row;
}

function buildProjectList(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:16px 16px 16px;display:flex;flex-direction:column;gap:8px;';
  if(!PROJECTS.length){
    wrap.innerHTML='<div class="empty">등록된 프로젝트가 없어요</div>';
    card.appendChild(wrap);return card;
  }
  // 대기/진행중은 항상 위에, 완료/보류는 각각 별도의 아코디언으로 접어둠.
  const active=PROJECTS.filter(p=>p.status==='대기'||p.status==='진행중');
  const done=PROJECTS.filter(p=>p.status==='완료');
  const hold=PROJECTS.filter(p=>p.status==='보류');
  const rank={'진행중':0,'대기':1};
  active.sort((a,b)=>{
    const r=(rank[a.status]??2)-(rank[b.status]??2);
    if(r)return r;
    return (a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99');
  });
  if(!active.length)wrap.innerHTML='<div class="empty">대기/진행중 프로젝트가 없어요</div>';
  active.forEach(p=>wrap.appendChild(buildPjRow(p)));
  if(done.length){
    done.sort((a,b)=>(b.dueDate||'').localeCompare(a.dueDate||''));
    const btn=document.createElement('button');
    btn.className='pj-more-btn';
    btn.textContent=pjDoneExpanded?'접기':`완료 (${done.length}건)`;
    btn.onclick=togglePjDoneList;
    wrap.appendChild(btn);
    if(pjDoneExpanded)done.forEach(p=>wrap.appendChild(buildPjRow(p)));
  }
  if(hold.length){
    hold.sort((a,b)=>(b.dueDate||'').localeCompare(a.dueDate||''));
    const btn=document.createElement('button');
    btn.className='pj-more-btn';
    btn.textContent=pjHoldExpanded?'접기':`보류 (${hold.length}건)`;
    btn.onclick=togglePjHoldList;
    wrap.appendChild(btn);
    if(pjHoldExpanded)hold.forEach(p=>wrap.appendChild(buildPjRow(p)));
  }
  card.appendChild(wrap);return card;
}
function togglePjDoneList(){pjDoneExpanded=!pjDoneExpanded;renderProjects();}
function togglePjHoldList(){pjHoldExpanded=!pjHoldExpanded;renderProjects();}

// ─── 프로젝트 추가/수정 ────────────────────────────────────────────────────────
// 카테고리는 루틴 탭과 동일하게 고정 프리셋 버튼(PJ_CAT_LIST)을 index.html에 정적으로
// 박아두고, 여기서는 선택 상태만 토글함 (가계부처럼 사용자가 추가/수정하는 방식이 아님).
function populatePjStatusButtons(){
  const wrap=document.getElementById('pjStatusBtnWrap');
  if(!wrap)return;
  wrap.innerHTML=PJ_STATUS_LIST.map(s=>`<button type="button" class="pj-status-btn ${PJ_STATUS_BADGE[s]} ${pjStatusSel===s?'active':''}" data-status="${s}" onclick="selPjStatus(this)">${PJ_STATUS_EMOJI[s]} ${s}</button>`).join('');
}
function selPjStatus(btn){pjStatusSel=btn.dataset.status;populatePjStatusButtons();}

function selPjCat(btn){
  document.querySelectorAll('#pjCatBtnWrap .cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  pjCatSel=btn.dataset.cat;
}
function syncPjCatButtons(){
  document.querySelectorAll('#pjCatBtnWrap .cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===pjCatSel));
}

function openProjectForm(){
  editingPjId=null;
  pjStatusSel='대기';
  pjCatSel=PJ_CAT_LIST[0];
  document.getElementById('pjFormTitle').innerHTML=`${icon('plus-circle',16,'color:var(--project)')} 새 프로젝트`;
  document.getElementById('pjSaveBtn').innerHTML=`${icon('plus-circle',14)} 추가하기`;
  ['pjTitle','pjEmoji','pjDueDate','pjMemo'].forEach(id=>{document.getElementById(id).value='';});
  populatePjStatusButtons();
  syncPjCatButtons();
  document.getElementById('projectFormPopup').classList.add('open');
}
function closeProjectForm(e){if(!e||e.target===document.getElementById('projectFormPopup'))document.getElementById('projectFormPopup').classList.remove('open');}

function editProjectStart(id){
  const p=PROJECTS.find(x=>x.id===id);
  if(!p)return;
  editingPjId=id;
  pjStatusSel=p.status||'대기';
  pjCatSel=p.cat||PJ_CAT_LIST[0];
  document.getElementById('pjFormTitle').innerHTML=`${icon('edit',16,'color:var(--project)')} 프로젝트 수정`;
  document.getElementById('pjSaveBtn').innerHTML=`${icon('edit',14)} 수정 완료`;
  document.getElementById('pjTitle').value=p.title||'';
  document.getElementById('pjEmoji').value=p.emoji||'';
  document.getElementById('pjDueDate').value=p.dueDate||'';
  document.getElementById('pjMemo').value=p.memo||'';
  populatePjStatusButtons();
  syncPjCatButtons();
  document.getElementById('projectFormPopup').classList.add('open');
}

function saveProjectForm(){
  const title=document.getElementById('pjTitle').value.trim();
  const emoji=document.getElementById('pjEmoji').value.trim()||'🎯';
  const dueDate=document.getElementById('pjDueDate').value;
  const memo=document.getElementById('pjMemo').value.trim();
  if(!title){alert('프로젝트 제목을 입력해줘');return;}
  if(!pjCatSel){alert('카테고리를 골라줘');return;}
  if(editingPjId){
    PROJECTS=PROJECTS.map(p=>p.id===editingPjId?{...p,title,emoji,dueDate,memo,status:pjStatusSel,cat:pjCatSel}:p);
  }else{
    PROJECTS=[...PROJECTS,{id:'pj'+Date.now(),title,emoji,dueDate,memo,status:pjStatusSel,cat:pjCatSel,checklist:[],createdAt:Date.now()}];
  }
  saveProjects(PROJECTS);
  document.getElementById('projectFormPopup').classList.remove('open');
  renderProjects();
}

function deleteProject(id){
  if(!confirm('이 프로젝트를 삭제할까요?'))return;
  PROJECTS=PROJECTS.filter(p=>p.id!==id);
  saveProjects(PROJECTS);
  renderProjects();
}

// ─── 프로젝트 상세 (체크리스트 추가/삭제) ──────────────────────────────────────
function openProjectDetail(id){
  const p=PROJECTS.find(x=>x.id===id);
  if(!p)return;
  pjDetailId=id;
  renderProjectDetail();
  document.getElementById('projectDetailPopup').classList.add('open');
}
function closeProjectDetail(e){
  if(!e||e.target===document.getElementById('projectDetailPopup')){
    document.getElementById('projectDetailPopup').classList.remove('open');
    pjDetailId=null;
  }
}

function renderProjectDetail(){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const cat=pjCatInfo(p.cat);
  document.getElementById('pjDetailTitle').textContent=`${p.emoji||'🎯'} ${p.title||'(제목없음)'}`;
  const dueLabel=p.dueDate?`🎯 ${p.dueDate}`:'목표일 없음';
  document.getElementById('pjDetailSub').innerHTML=`<span class="pj-cat-badge" style="background:${cat.color}22;color:${cat.color};">${cat.label}</span><span>${dueLabel}</span>${pjBadge(p.status)}`;
  const memoEl=document.getElementById('pjDetailMemo');
  if(p.memo){memoEl.textContent=p.memo;memoEl.style.display='';}
  else{memoEl.style.display='none';}
  const progress=pjProgress(p);
  const progWrap=document.getElementById('pjDetailProgress');
  if(progress!==null){
    progWrap.style.display='';
    progWrap.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px;"><span>체크리스트 진행률</span><span style="color:var(--project);">${progress}%</span></div><div style="height:8px;background:#f0f0f5;border-radius:99px;overflow:hidden;"><div style="height:100%;width:${progress}%;background:var(--project);border-radius:99px;"></div></div>`;
  }else{
    progWrap.style.display='none';progWrap.innerHTML='';
  }
  const list=document.getElementById('pjChecklist');
  const cl=p.checklist||[];
  if(!cl.length){
    list.innerHTML='<div class="empty">할 일을 추가해보세요</div>';
  }else{
    list.innerHTML=cl.map(item=>`
      <div class="pj-check-item">
        <div class="cb ${item.done?'on':''}" onclick="togglePjCheckItem('${item.id}')"></div>
        <div class="pj-check-text ${item.done?'done':''}">${item.text}</div>
        <button class="pj-icon del" onclick="deletePjCheckItem('${item.id}')" title="삭제">${icon('x-circle',15)}</button>
      </div>`).join('');
  }
}

function addPjCheckItem(){
  const input=document.getElementById('pjNewCheckText');
  const text=input.value.trim();
  if(!text)return;
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const checklist=[...(p.checklist||[]),{id:'ck'+Date.now(),text,done:false}];
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,checklist}:x);
  saveProjects(PROJECTS);
  input.value='';
  renderProjectDetail();
  renderProjects();
}
function togglePjCheckItem(itemId){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const checklist=(p.checklist||[]).map(c=>c.id===itemId?{...c,done:!c.done}:c);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,checklist}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
  renderProjects();
}
function deletePjCheckItem(itemId){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const checklist=(p.checklist||[]).filter(c=>c.id!==itemId);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,checklist}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
  renderProjects();
}
