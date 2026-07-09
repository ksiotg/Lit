// ─── 프로젝트(PROJECT) ────────────────────────────────────────────────────────
// 인생의 크고 작은 목표/프로젝트를 정리하는 탭. 외주 탭의 카드/아코디언/D-day 패턴을
// 재사용하고, 카테고리는 루틴 탭 것을 완전히 그대로 재사용함 — 케어/건강/성장/생활 4개,
// 라벨/색상도 CAT_LABELS/CAT_COLORS(data-state.js) 그대로. 가계부처럼 사용자가
// 이름/이모지/색을 추가·수정하는 방식이 아니라 루틴과 동일한 고정 목록(PJ_CAT_LIST).
// 상태(대기/진행중/완료/보류)는 사용자가 직접 지정하는 필드. 체크리스트는 2단 구조
// (큰 항목 여러 개 + 각 큰 항목 안의 하위 항목들) — 큰 항목은 하위 항목을 전부 체크해야
// 자동으로 완료 처리되고(수동 완료 불가), 프로젝트 진행률(%)은 "완료된 큰 항목 수 / 전체
// 큰 항목 수" 기준으로 계산함. 상태(대기/진행중/완료/보류)는 여전히 사용자가 직접 지정.
let editingPjId=null;
let pjView='status';      // 'status' | 'category' — 목록을 상태별/카테고리별로 보는 토글(캘린더는 항상 위에 함께 표시)
let pjCalY=TODAY.getFullYear();
let pjCalM=TODAY.getMonth(); // 0-based
let pjDoneExpanded=false; // "완료" 아코디언 펼침 여부
let pjHoldExpanded=false; // "보류" 아코디언 펼침 여부
let pjDetailId=null;      // 상세 팝업에서 체크리스트/일지 추가·삭제할 때 대상 프로젝트
let pjStatusSel='대기';   // 추가/수정 폼에서 현재 선택된 상태
let pjCatSel=null;        // 추가/수정 폼에서 현재 선택된 카테고리 키(PJ_CAT_LIST 중 하나)
let pjImportanceSel='mid';// 추가/수정 폼에서 현재 선택된 중요도

const PJ_STATUS_LIST=['대기','진행중','완료','보류'];
const PJ_STATUS_BADGE={'대기':'wait','진행중':'progress','완료':'done','보류':'hold'};
// 이모지는 카테고리/항목을 대표하는 용도로만 쓰고, 상태처럼 UI 요소는 Feather 아이콘으로 통일.
const PJ_STATUS_ICON={'대기':'circle','진행중':'play','완료':'check-circle','보류':'pause'};
const PJ_IMPORTANCE_LIST=['low','mid','high'];
const PJ_IMPORTANCE_LABEL={low:'낮음',mid:'보통',high:'높음'};
const PJ_IMPORTANCE_N={low:1,mid:2,high:3}; // 중요도별 채울 별 개수(총 3개)

// 체크리스트 큰 항목 배열을 반환. 예전 버전(플랫 체크리스트, p.checklist)으로 저장된
// 데이터가 있으면 "체크리스트"라는 이름의 큰 항목 1개로 감싸서 보여줌(하위호환).
function pjSections(p){
  if(p.sections)return p.sections;
  if(p.checklist&&p.checklist.length)return [{id:'legacy',title:'체크리스트',items:p.checklist}];
  return [];
}
// 큰 항목은 하위 항목이 1개 이상 있고 전부 체크됐을 때만 "완료"로 간주함(수동 완료 불가).
function pjSectionDone(sec){return !!(sec.items&&sec.items.length&&sec.items.every(i=>i.done));}
// 진행률(%) = 완료된 큰 항목 수 / 전체 큰 항목 수. 큰 항목이 하나도 없으면 null(체크리스트 없음).
function pjProgress(p){
  const secs=pjSections(p);
  if(!secs.length)return null;
  const doneCount=secs.filter(pjSectionDone).length;
  return Math.round(doneCount/secs.length*100);
}
function pjCatInfo(catKey){
  // 루틴 탭과 동일한 CAT_LABELS/CAT_COLORS(data-state.js)를 그대로 씀.
  return {label:CAT_LABELS[catKey]||CAT_LABELS.selfcare,color:CAT_COLORS[catKey]||CAT_COLORS.selfcare};
}
function pjBadge(status){
  const cls=PJ_STATUS_BADGE[status]||'wait';
  const iconName=PJ_STATUS_ICON[status]||'circle';
  return `<span class="pj-badge ${cls}" title="${status}">${icon(iconName,14)}</span>`;
}
// 중요도(low/mid/high) → 별 3개 중 몇 개를 채울지, Feather star 아이콘으로 렌더링(테마 핑크색).
function pjImportanceStarsHtml(importance){
  const filled=PJ_IMPORTANCE_N[importance]||PJ_IMPORTANCE_N.mid;
  let html='';
  for(let i=0;i<3;i++){
    const on=i<filled;
    html+=`<svg viewBox="0 0 24 24" width="13" height="13" fill="${on?'var(--project)':'none'}" stroke="${on?'var(--project)':'#d8dbe8'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  return `<span style="display:inline-flex;align-items:center;gap:1px;">${html}</span>`;
}
// 착수일/마감일을 "시작~마감" 형태로 합쳐서 보여줌 (외주 탭의 flPeriodLabel과 같은 패턴).
function pjPeriodLabel(p){
  if(p.startDate&&p.dueDate)return `${p.startDate} ~ ${p.dueDate}`;
  if(p.startDate)return `${p.startDate} ~ (마감 미정)`;
  if(p.dueDate)return `~ ${p.dueDate}`;
  return '';
}
// 마감일이 있으면 D-day 배지를 보여줌. ddayInfo()는 freelance.js에 정의된 공용 함수를 그대로 재사용.
function pjDdayBadge(p){
  if(!p.dueDate)return '';
  const dd=ddayInfo(p.dueDate);
  return dd?`<span class="pj-dday ${dd.cls}">${dd.label}</span>`:'';
}

function setProjectView(v){pjView=v;renderProjects();}
function pjSyncViewButtons(){
  const a=document.getElementById('pvbtn-status'),b=document.getElementById('pvbtn-category');
  if(a)a.classList.toggle('active',pjView==='status');
  if(b)b.classList.toggle('active',pjView==='category');
}
function chPjCalMonth(d){
  pjCalM+=d;
  if(pjCalM>11){pjCalM=0;pjCalY++;}
  if(pjCalM<0){pjCalM=11;pjCalY--;}
  renderProjects();
}

// 다른 탭들처럼 진입시 첫 화면 = 캘린더. 별도 토글 없이 항상 위쪽에 표시하고,
// 그 아래에 기존 상태별/카테고리별 토글 + 목록을 그대로 보여줌.
function renderProjects(){
  PROJECTS=getProjects();
  pjSyncViewButtons();
  const main=document.getElementById('projectMain');main.innerHTML='';
  const calCard=buildProjectCalCard();calCard.classList.add('card-wide');main.appendChild(calCard);
  const listCard=pjView==='category'?buildProjectCategoryList():buildProjectList();
  listCard.classList.add('card-wide');
  main.appendChild(listCard);
}

// ─── 캘린더 뷰: 착수~마감 기간이 이 달과 겹치는 프로젝트를 카테고리색 점으로 표시 ──────
function buildProjectCalCard(){
  const dim=new Date(pjCalY,pjCalM+1,0).getDate();
  const fd=new Date(pjCalY,pjCalM,1).getDay();
  const fdMon=fd===0?6:fd-1;
  const pad=n=>String(n).padStart(2,'0');
  const monthStart=`${pjCalY}-${pad(pjCalM+1)}-01`,monthEnd=`${pjCalY}-${pad(pjCalM+1)}-${pad(dim)}`;
  const activeProjects=PROJECTS.filter(p=>{
    if(!p.startDate&&!p.dueDate)return false;
    const s=p.startDate||p.dueDate,e=p.dueDate||p.startDate;
    return s<=monthEnd&&e>=monthStart;
  });

  const card=mkDiv('card');
  const head=document.createElement('div');
  head.style.cssText='display:flex;align-items:center;justify-content:center;gap:14px;padding:14px 16px 0;';
  head.innerHTML=`
    <button class="nav-btn" onclick="chPjCalMonth(-1)">‹</button>
    <span class="page-title" style="font-size:14px;">${pjCalY}년 ${pjCalM+1}월</span>
    <button class="nav-btn" onclick="chPjCalMonth(1)">›</button>`;
  card.appendChild(head);
  const dow=mkDiv('cal-dow-row');
  dow.style.paddingTop='14px';
  ['월','화','수','목','금','토','일'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===5?'sat':i===6?'sun':''}`);e.textContent=d;dow.appendChild(e);});
  const grid=mkDiv('cal-grid');
  for(let i=0;i<fdMon;i++)grid.appendChild(mkDiv('cal-cell empty'));
  for(let d=1;d<=dim;d++){
    const dow2=(fdMon+d-1)%7;
    const isT=TODAY.getFullYear()===pjCalY&&TODAY.getMonth()===pjCalM&&TODAY.getDate()===d;
    const dateStr=`${pjCalY}-${pad(pjCalM+1)}-${pad(d)}`;
    const cell=mkDiv(`cal-cell ${isT?'today':''} ${dow2===5?'sat':''} ${dow2===6?'sun':''}`);
    const dayEl=mkDiv('cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    const dayProjects=activeProjects.filter(p=>{
      const s=p.startDate||p.dueDate,e=p.dueDate||p.startDate;
      return dateStr>=s&&dateStr<=e;
    });
    // 마감일(D-day)인 날은 배경을 살짝 강조
    const isDueDay=activeProjects.some(p=>p.dueDate===dateStr);
    if(isDueDay)cell.style.background='var(--project-tint)';
    if(dayProjects.length){
      const dotsWrap=mkDiv('');dotsWrap.style.cssText='display:flex;gap:2px;justify-content:center;flex-wrap:wrap;margin-top:2px;';
      dayProjects.slice(0,4).forEach(p=>{
        const cat=pjCatInfo(p.cat);
        const dot=mkDiv('');dot.style.cssText=`width:5px;height:5px;border-radius:50%;background:${cat.color};`;
        dot.title=`${p.emoji||'🎯'} ${p.title||'(제목없음)'}${p.dueDate===dateStr?' (마감)':''}`;
        dotsWrap.appendChild(dot);
      });
      cell.appendChild(dotsWrap);
      cell.onclick=()=>openPjDayDetail(dateStr,dayProjects);
    }
    grid.appendChild(cell);
  }
  card.appendChild(dow);card.appendChild(grid);
  if(activeProjects.length){
    const legend=document.createElement('div');
    legend.style.cssText='padding:2px 16px 14px;display:flex;flex-wrap:wrap;gap:8px 12px;';
    legend.innerHTML=PJ_CAT_LIST.filter(k=>activeProjects.some(p=>(p.cat||PJ_CAT_LIST[0])===k)).map(k=>{
      const info=pjCatInfo(k);
      return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--muted);"><span style="width:7px;height:7px;border-radius:50%;background:${info.color};display:inline-block;"></span>${info.label}</span>`;
    }).join('');
    card.appendChild(legend);
  }
  return card;
}

function openPjDayDetail(dateStr,dayProjects){
  const [y,m,d]=dateStr.split('-');
  document.getElementById('pjDayTitle').textContent=`${y}.${m}.${d}`;
  document.getElementById('pjDayContent').innerHTML=dayProjects.length?`<div style="display:flex;flex-direction:column;gap:6px;">${dayProjects.map(p=>{
    const cat=pjCatInfo(p.cat);
    const ddayBadge=pjDdayBadge(p);
    return `<div class="fl-payment-row" style="cursor:pointer;" onclick="closePjDayPopupAndOpen('${p.id}')">
      <span style="font-size:12px;font-weight:700;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cat.color};margin-right:5px;"></span>${p.emoji||'🎯'} ${p.title||'(제목없음)'}</span>
      ${ddayBadge||`<span style="font-size:11px;color:var(--muted);">${p.dueDate===dateStr?'마감일':'진행중'}</span>`}
    </div>`;
  }).join('')}</div>`:'<div class="empty">내역이 없어요</div>';
  document.getElementById('pjDayPopup').classList.add('open');
}
function closePjDayPopup(e){if(e.target===document.getElementById('pjDayPopup'))document.getElementById('pjDayPopup').classList.remove('open');}
function closePjDayPopupAndOpen(id){document.getElementById('pjDayPopup').classList.remove('open');openProjectDetail(id);}

function buildPjRow(p){
  const row=mkDiv(`pj-row ${p.pinned?'pinned-bg':''}`);
  const cat=pjCatInfo(p.cat);
  const progress=pjProgress(p);
  const badge=pjBadge(p.status);
  const period=pjPeriodLabel(p);
  const stars=pjImportanceStarsHtml(p.importance);
  // D-day는 캘린더에서 이미 보여주므로 카드 목록에서는 기간 텍스트만 남기고 뺌.
  const subParts=[`<span class="pj-cat-badge" style="background:${cat.color}22;color:${cat.color};">${cat.label}</span>`];
  if(period)subParts.push(`<span>${period}</span>`);
  subParts.push(stars);
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
      <button class="pj-icon ${p.pinned?'pinned':''}" onclick="togglePjPin('${p.id}')" title="${p.pinned?'이번 주 집중 해제':'이번 주 집중으로 고정'}">${icon('bookmark',15)}</button>
      <button class="pj-icon" onclick="editProjectStart('${p.id}')" title="수정">${icon('edit',14)}</button>
      <button class="pj-icon del" onclick="deleteProject('${p.id}')" title="삭제">${icon('x-circle',15)}</button>
    </div>`;
  return row;
}

function buildProjectList(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:16px 16px 16px;display:flex;flex-direction:column;gap:8px;';
  if(!PROJECTS.length){
    wrap.appendChild(mkDiv('empty','등록된 프로젝트가 없어요'));
    card.appendChild(wrap);return card;
  }
  // 고정(핀)한 프로젝트는 별도 텍스트 배지/섹션 없이, 카드 배경 틴트(pj-row.pinned-bg)로만 표시하고
  // 대기/진행중 목록 안에서 맨 위로 정렬함.
  const active=PROJECTS.filter(p=>p.status==='대기'||p.status==='진행중');
  const done=PROJECTS.filter(p=>p.status==='완료');
  const hold=PROJECTS.filter(p=>p.status==='보류');
  const rank={'진행중':0,'대기':1};
  active.sort((a,b)=>{
    const pinDiff=(b.pinned?1:0)-(a.pinned?1:0);
    if(pinDiff)return pinDiff;
    const r=(rank[a.status]??2)-(rank[b.status]??2);
    if(r)return r;
    return (a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99');
  });
  if(active.length)active.forEach(p=>wrap.appendChild(buildPjRow(p)));
  else wrap.appendChild(mkDiv('empty','대기/진행중 프로젝트가 없어요'));
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

// 카테고리별 보기 (외주 탭의 "클라이언트별 보기"와 같은 패턴): 카테고리마다 그룹 헤더 +
// 그 안에 상태순(진행중→대기→보류→완료)·마감일순으로 정렬된 목록.
function buildProjectCategoryList(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:16px 16px 16px;display:flex;flex-direction:column;gap:12px;';
  if(!PROJECTS.length){
    wrap.appendChild(mkDiv('empty','등록된 프로젝트가 없어요'));
    card.appendChild(wrap);return card;
  }
  // 고정(핀) 프로젝트는 별도 섹션 없이 카드 배경 틴트로만 표시, 각 카테고리 그룹 안에서 맨 위로 정렬.
  const rank={'진행중':0,'대기':1,'보류':2,'완료':3};
  const byCat={};
  PROJECTS.forEach(p=>{const key=p.cat||PJ_CAT_LIST[0];(byCat[key]=byCat[key]||[]).push(p);});
  let any=false;
  PJ_CAT_LIST.forEach(catKey=>{
    const projects=byCat[catKey];
    if(!projects||!projects.length)return;
    any=true;
    const info=pjCatInfo(catKey);
    const group=mkDiv('pj-cat-group');
    const head=mkDiv('pj-cat-group-head');
    head.innerHTML=`<span class="pj-cat-group-name">${info.label}</span><span class="pj-cat-group-total">${projects.length}건</span>`;
    const list=document.createElement('div');list.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:10px;';
    [...projects].sort((a,b)=>{
      const pinDiff=(b.pinned?1:0)-(a.pinned?1:0);
      if(pinDiff)return pinDiff;
      const r=(rank[a.status]??9)-(rank[b.status]??9);
      if(r)return r;
      return (a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99');
    }).forEach(p=>list.appendChild(buildPjRow(p)));
    group.appendChild(head);group.appendChild(list);
    wrap.appendChild(group);
  });
  if(!any)wrap.appendChild(mkDiv('empty','등록된 프로젝트가 없어요'));
  card.appendChild(wrap);return card;
}

function togglePjPin(id){
  PROJECTS=PROJECTS.map(p=>p.id===id?{...p,pinned:!p.pinned}:p);
  saveProjects(PROJECTS);
  renderProjects();
}

// ─── 프로젝트 추가/수정 ────────────────────────────────────────────────────────
// 카테고리는 루틴 탭과 동일하게 고정 프리셋 버튼(PJ_CAT_LIST)을 index.html에 정적으로
// 박아두고, 여기서는 선택 상태만 토글함 (가계부처럼 사용자가 추가/수정하는 방식이 아님).
function populatePjStatusButtons(){
  const wrap=document.getElementById('pjStatusBtnWrap');
  if(!wrap)return;
  wrap.innerHTML=PJ_STATUS_LIST.map(s=>`<button type="button" class="pj-status-btn ${PJ_STATUS_BADGE[s]} ${pjStatusSel===s?'active':''}" data-status="${s}" onclick="selPjStatus(this)">${icon(PJ_STATUS_ICON[s],13)} ${s}</button>`).join('');
  syncPjCompletionNoteVisibility();
}
function selPjStatus(btn){pjStatusSel=btn.dataset.status;populatePjStatusButtons();}
// 상태를 "완료"로 고를 때만 완료 소감 입력칸을 보여줌.
function syncPjCompletionNoteVisibility(){
  const row=document.getElementById('pjCompletionNoteRow');
  if(!row)return;
  row.style.display=pjStatusSel==='완료'?'':'none';
}

function selPjCat(btn){
  document.querySelectorAll('#pjCatBtnWrap .cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  pjCatSel=btn.dataset.cat;
}
function syncPjCatButtons(){
  document.querySelectorAll('#pjCatBtnWrap .cat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===pjCatSel));
}

function populatePjImportanceButtons(){
  const wrap=document.getElementById('pjImportanceBtnWrap');
  if(!wrap)return;
  wrap.innerHTML=PJ_IMPORTANCE_LIST.map(k=>`<button type="button" class="pj-imp-btn ${pjImportanceSel===k?'active':''}" data-imp="${k}" onclick="selPjImportance(this)">${pjImportanceStarsHtml(k)} ${PJ_IMPORTANCE_LABEL[k]}</button>`).join('');
}
function selPjImportance(btn){pjImportanceSel=btn.dataset.imp;populatePjImportanceButtons();}

function openProjectForm(){
  editingPjId=null;
  pjStatusSel='대기';
  pjCatSel=PJ_CAT_LIST[0];
  pjImportanceSel='mid';
  document.getElementById('pjFormTitle').innerHTML=`${icon('plus-circle',16,'color:var(--project)')} 새 프로젝트`;
  document.getElementById('pjSaveBtn').innerHTML=`${icon('plus-circle',14)} 추가하기`;
  ['pjTitle','pjEmoji','pjStartDate','pjDueDate','pjMemo','pjCompletionNote'].forEach(id=>{document.getElementById(id).value='';});
  populatePjStatusButtons();
  syncPjCatButtons();
  populatePjImportanceButtons();
  document.getElementById('projectFormPopup').classList.add('open');
}
function closeProjectForm(e){if(!e||e.target===document.getElementById('projectFormPopup'))document.getElementById('projectFormPopup').classList.remove('open');}

function editProjectStart(id){
  const p=PROJECTS.find(x=>x.id===id);
  if(!p)return;
  editingPjId=id;
  pjStatusSel=p.status||'대기';
  pjCatSel=p.cat||PJ_CAT_LIST[0];
  pjImportanceSel=p.importance||'mid';
  document.getElementById('pjFormTitle').innerHTML=`${icon('edit',16,'color:var(--project)')} 프로젝트 수정`;
  document.getElementById('pjSaveBtn').innerHTML=`${icon('edit',14)} 수정 완료`;
  document.getElementById('pjTitle').value=p.title||'';
  document.getElementById('pjEmoji').value=p.emoji||'';
  document.getElementById('pjStartDate').value=p.startDate||'';
  document.getElementById('pjDueDate').value=p.dueDate||'';
  document.getElementById('pjMemo').value=p.memo||'';
  document.getElementById('pjCompletionNote').value=p.completionNote||'';
  populatePjStatusButtons();
  syncPjCatButtons();
  populatePjImportanceButtons();
  document.getElementById('projectFormPopup').classList.add('open');
}

function saveProjectForm(){
  const title=document.getElementById('pjTitle').value.trim();
  const emoji=document.getElementById('pjEmoji').value.trim()||'🎯';
  const startDate=document.getElementById('pjStartDate').value;
  const dueDate=document.getElementById('pjDueDate').value;
  const memo=document.getElementById('pjMemo').value.trim();
  const completionNoteInput=document.getElementById('pjCompletionNote').value.trim();
  if(!title){alert('프로젝트 제목을 입력해줘');return;}
  if(!pjCatSel){alert('카테고리를 골라줘');return;}
  if(startDate&&dueDate&&startDate>dueDate){alert('마감일이 착수일보다 빠를 수 없어요');return;}
  if(editingPjId){
    PROJECTS=PROJECTS.map(p=>p.id===editingPjId?{...p,title,emoji,startDate,dueDate,memo,status:pjStatusSel,cat:pjCatSel,importance:pjImportanceSel,completionNote:pjStatusSel==='완료'?completionNoteInput:p.completionNote}:p);
  }else{
    PROJECTS=[...PROJECTS,{id:'pj'+Date.now(),title,emoji,startDate,dueDate,memo,status:pjStatusSel,cat:pjCatSel,importance:pjImportanceSel,completionNote:pjStatusSel==='완료'?completionNoteInput:'',pinned:false,sections:[],notes:[],createdAt:Date.now()}];
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

// ─── 프로젝트 상세 (2단 체크리스트 + 일지) ────────────────────────────────────
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
  const period=pjPeriodLabel(p);
  const subParts=[`<span class="pj-cat-badge" style="background:${cat.color}22;color:${cat.color};">${cat.label}</span>`];
  subParts.push(`<span>${period||'기간 없음'}</span>`);
  subParts.push(pjBadge(p.status));
  subParts.push(pjImportanceStarsHtml(p.importance));
  document.getElementById('pjDetailSub').innerHTML=subParts.join('');
  const memoEl=document.getElementById('pjDetailMemo');
  if(p.memo){memoEl.textContent=p.memo;memoEl.style.display='';}
  else{memoEl.style.display='none';}
  const noteEl=document.getElementById('pjDetailCompletionNote');
  if(p.status==='완료'&&p.completionNote){
    noteEl.style.display='';
    noteEl.innerHTML=`<div style="font-size:10px;font-weight:800;color:var(--project);margin-bottom:2px;">✅ 완료 소감</div>${p.completionNote}`;
  }else{
    noteEl.style.display='none';noteEl.innerHTML='';
  }
  const progress=pjProgress(p);
  const progWrap=document.getElementById('pjDetailProgress');
  if(progress!==null){
    progWrap.style.display='';
    progWrap.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px;"><span>진행률 (완료된 큰 항목 기준)</span><span style="color:var(--project);">${progress}%</span></div><div style="height:8px;background:#f0f0f5;border-radius:99px;overflow:hidden;"><div style="height:100%;width:${progress}%;background:var(--project);border-radius:99px;"></div></div>`;
  }else{
    progWrap.style.display='none';progWrap.innerHTML='';
  }
  renderPjSectionsUI(p);
  renderPjNotesUI(p);
}

// ── 2단 체크리스트: 큰 항목(섹션) + 하위 항목 ──────────────────────────────────
function renderPjSectionsUI(p){
  const wrap=document.getElementById('pjSectionsList');
  const secs=pjSections(p);
  if(!secs.length){
    wrap.innerHTML='<div class="empty">아직 큰 항목이 없어요. 아래에서 추가해보세요</div>';
    return;
  }
  wrap.innerHTML=secs.map(sec=>{
    const done=pjSectionDone(sec);
    const items=sec.items||[];
    const itemsHtml=items.length?items.map(item=>`
      <div class="pj-check-item">
        <div class="cb ${item.done?'on':''}" onclick="togglePjSectionItem('${sec.id}','${item.id}')"></div>
        <div class="pj-check-text ${item.done?'done':''}">${item.text}</div>
        <button class="pj-icon del" onclick="deletePjSectionItem('${sec.id}','${item.id}')" title="삭제">${icon('x-circle',14)}</button>
      </div>`).join('') : '<div class="empty" style="padding:4px 0;">하위 항목이 없어요</div>';
    return `
      <div class="pj-section">
        <div class="pj-section-head">
          <div class="pj-section-title ${done?'done':''}"><span class="pj-section-check ${done?'done':''}">${done?'✓':''}</span>${sec.title}</div>
          <button class="pj-icon del" onclick="deletePjSection('${sec.id}')" title="큰 항목 삭제">${icon('x-circle',14)}</button>
        </div>
        ${itemsHtml}
        <div style="display:flex;gap:6px;margin-top:6px;">
          <input class="fi" id="pjNewItem_${sec.id}" placeholder="하위 항목 추가" style="flex:1;font-size:12px;padding:8px 10px;" onkeydown="if(event.key==='Enter')addPjSectionItem('${sec.id}')">
          <button class="add-btn" style="width:auto;margin-top:0;padding:0 12px;background:var(--project);font-size:12px;" onclick="addPjSectionItem('${sec.id}')">추가</button>
        </div>
      </div>`;
  }).join('');
}

function addPjSection(){
  const input=document.getElementById('pjNewSectionTitle');
  const title=input.value.trim();
  if(!title)return;
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const sections=[...pjSections(p),{id:'sec'+Date.now(),title,items:[]}];
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,sections}:x);
  saveProjects(PROJECTS);
  input.value='';
  renderProjectDetail();
  renderProjects();
}
function deletePjSection(secId){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const sections=pjSections(p).filter(s=>s.id!==secId);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,sections}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
  renderProjects();
}
function addPjSectionItem(secId){
  const input=document.getElementById('pjNewItem_'+secId);
  if(!input)return;
  const text=input.value.trim();
  if(!text)return;
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const sections=pjSections(p).map(s=>s.id===secId?{...s,items:[...(s.items||[]),{id:'it'+Date.now(),text,done:false}]}:s);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,sections}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
  renderProjects();
}
function togglePjSectionItem(secId,itemId){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const sections=pjSections(p).map(s=>s.id===secId?{...s,items:(s.items||[]).map(i=>i.id===itemId?{...i,done:!i.done}:i)}:s);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,sections}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
  renderProjects();
}
function deletePjSectionItem(secId,itemId){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const sections=pjSections(p).map(s=>s.id===secId?{...s,items:(s.items||[]).filter(i=>i.id!==itemId)}:s);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,sections}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
  renderProjects();
}

// ── 날짜순 메모/일지 ──────────────────────────────────────────────────────────
function renderPjNotesUI(p){
  const wrap=document.getElementById('pjNotesList');
  const notes=(p.notes||[]).slice().reverse(); // 최신순
  if(!notes.length){
    wrap.innerHTML='<div class="empty">아직 일지가 없어요</div>';
    return;
  }
  wrap.innerHTML=notes.map(n=>`
    <div class="pj-note-item">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
        <div class="pj-note-date">${n.date}</div>
        <button class="pj-icon del" onclick="deletePjNote('${n.id}')" title="삭제">${icon('x-circle',13)}</button>
      </div>
      <div class="pj-note-text">${n.text}</div>
    </div>`).join('');
}
function addPjNote(){
  const input=document.getElementById('pjNewNoteText');
  const text=input.value.trim();
  if(!text)return;
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const pad=n=>String(n).padStart(2,'0');
  const today=`${TODAY.getFullYear()}-${pad(TODAY.getMonth()+1)}-${pad(TODAY.getDate())}`;
  const notes=[...(p.notes||[]),{id:'note'+Date.now(),date:today,text}];
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,notes}:x);
  saveProjects(PROJECTS);
  input.value='';
  renderProjectDetail();
}
function deletePjNote(noteId){
  const p=PROJECTS.find(x=>x.id===pjDetailId);
  if(!p)return;
  const notes=(p.notes||[]).filter(n=>n.id!==noteId);
  PROJECTS=PROJECTS.map(x=>x.id===p.id?{...x,notes}:x);
  saveProjects(PROJECTS);
  renderProjectDetail();
}
