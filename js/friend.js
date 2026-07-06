// ─── 친구(FRIEND) ──────────────────────────────────────────────────────────────
// 생일/친밀도 관리 탭. 월/연 같은 시간 축이 없는 플랫 리스트 + 그룹 필터/정렬 위주.
// 친밀도는 0~10 숫자로 저장하고, 화면에는 별 5개(별 1개=2점, 남는 점수는 빈별)로 환산해서 보여줌.
// 생일은 연도 없이 'MM-DD' 문자열로 저장(매년 반복되는 정보라 연도가 필요 없음. 다가오는 생일
// 정렬/알림 같은 기능은 이번 1순위 범위 밖이라 아직 안 씀).
let frView='list'; // 'list'(전체 목록) | 'nobday'(생일 미등록만 모아보기)
let frGroupFilter='전체';
let frSort='intimacy_desc'; // 'intimacy_desc' | 'intimacy_asc' | 'name'
let editingFrId=null;
let frBdaySearch='';

function frEsc(s){return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');}

function setFriendView(v){
  frView=v;
  if(v==='nobday')frBdaySearch=''; // 생일없음 뷰 들어올 때마다 검색어 리셋
  renderFriend();
}
function frSyncViewButtons(){
  document.getElementById('frvbtn-list').classList.toggle('active',frView==='list');
  document.getElementById('frvbtn-nobday').classList.toggle('active',frView==='nobday');
}

// 현재 등록된 친구들의 그룹명을 훑어서 필터 칩 목록을 만듦. 그룹은 고정된 enum이 아니라
// 사용자가 자유롭게 적는 텍스트라서, 실제 쓰이고 있는 값만 동적으로 뽑아 가나다순 정렬.
function frGroups(){
  const set=new Set(FRIENDS.map(f=>f.group||'미분류'));
  return [...set].sort((a,b)=>a.localeCompare(b,'ko'));
}

// 친밀도(0~10) → 별 5개 중 몇 개를 채울지 계산. 별 1개 = 2점, 홀수라 남는 1점은
// 반쪽 별 대신 그냥 빈 별로 처리(디자인상 half-fill 안 씀).
function frStarsHtml(intimacy){
  const filled=Math.max(0,Math.min(5,Math.floor((intimacy||0)/2)));
  let html='';
  for(let i=0;i<5;i++){
    const on=i<filled;
    html+=`<svg viewBox="0 0 24 24" width="14" height="14" fill="${on?'var(--friend)':'none'}" stroke="${on?'var(--friend)':'#d8dbe8'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  return `<div class="fr-stars">${html}</div>`;
}

function frBdayLabel(bday){
  if(!bday)return null;
  const [mm,dd]=bday.split('-').map(Number);
  if(!mm||!dd)return null;
  return `${mm}월 ${dd}일`;
}

function renderFriend(){
  FRIENDS=getFriends();
  frSyncViewButtons();
  const main=document.getElementById('friendMain');main.innerHTML='';
  if(frView==='nobday'){
    main.appendChild(buildFrNoBdayCard());
  }else{
    main.appendChild(buildFrFilterCard());
    main.appendChild(buildFrListCard());
  }
}

// ─── 목록 뷰: 그룹 필터 + 정렬 ──────────────────────────────────────────────────
function buildFrFilterCard(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:14px 16px;display:flex;flex-direction:column;gap:10px;';
  const groups=frGroups();
  const chipsWrap=document.createElement('div');chipsWrap.style.cssText='display:flex;flex-wrap:wrap;gap:6px;';
  chipsWrap.innerHTML=['전체',...groups].map(g=>`<button class="fr-chip ${frGroupFilter===g?'active':''}" onclick="setFrGroupFilter('${frEsc(g)}')">${g}</button>`).join('');
  const sortWrap=document.createElement('div');sortWrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap;';
  sortWrap.innerHTML=`
    <button class="fr-sort-btn ${frSort==='intimacy_desc'?'active':''}" onclick="setFrSort('intimacy_desc')">친밀도 높은순</button>
    <button class="fr-sort-btn ${frSort==='intimacy_asc'?'active':''}" onclick="setFrSort('intimacy_asc')">친밀도 낮은순</button>
    <button class="fr-sort-btn ${frSort==='name'?'active':''}" onclick="setFrSort('name')">이름순</button>`;
  wrap.appendChild(chipsWrap);wrap.appendChild(sortWrap);
  card.appendChild(wrap);return card;
}
function setFrGroupFilter(g){frGroupFilter=g;renderFriend();}
function setFrSort(s){frSort=s;renderFriend();}

function buildFrListCard(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:2px 16px 16px;display:flex;flex-direction:column;gap:8px;';
  let list=[...FRIENDS];
  if(frGroupFilter!=='전체')list=list.filter(f=>(f.group||'미분류')===frGroupFilter);
  if(frSort==='intimacy_desc')list.sort((a,b)=>(b.intimacy||0)-(a.intimacy||0)||a.name.localeCompare(b.name,'ko'));
  else if(frSort==='intimacy_asc')list.sort((a,b)=>(a.intimacy||0)-(b.intimacy||0)||a.name.localeCompare(b.name,'ko'));
  else list.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  const head=document.createElement('div');
  head.style.cssText='font-size:11px;color:var(--muted);font-weight:700;padding:8px 0 2px;';
  head.textContent=`총 ${list.length}명`;
  wrap.appendChild(head);
  if(!list.length){
    const empty=document.createElement('div');empty.className='empty';empty.textContent='해당하는 친구가 없어요';
    wrap.appendChild(empty);
  }else{
    list.forEach(f=>wrap.appendChild(buildFrRow(f)));
  }
  card.appendChild(wrap);return card;
}

function buildFrRow(f){
  const row=mkDiv('fr-row');
  const bdayLabel=frBdayLabel(f.birthday);
  row.innerHTML=`
    <div class="fr-row-top">
      <div class="fr-row-info">
        <div class="fr-row-name-line">
          <div class="fr-row-name">${f.name}</div>
          <span class="fr-group-badge">${f.group||'미분류'}</span>
        </div>
        <div class="fr-row-bday ${bdayLabel?'set':''}">${bdayLabel?'🎂 '+bdayLabel:'생일 미등록'}</div>
      </div>
      <div class="fr-row-actions">
        <button class="fr-icon" onclick="editFriend('${f.id}')" title="수정">${icon('edit',14)}</button>
        <button class="fr-icon del" onclick="deleteFriend('${f.id}')" title="삭제">${icon('x-circle',15)}</button>
      </div>
    </div>
    ${frStarsHtml(f.intimacy)}`;
  return row;
}

// ─── 생일 없음 뷰: 이름 검색 + 원탭 입력 ────────────────────────────────────────
function buildFrNoBdayCard(){
  const card=mkDiv('card');
  const wrap=document.createElement('div');wrap.style.cssText='padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;';
  wrap.innerHTML=`
    <div class="fg"><input class="fi" id="frBdaySearchInput" placeholder="이름 검색" oninput="onFrBdaySearch(this.value)"></div>
    <div id="frNoBdayCount" style="font-size:11px;color:var(--muted);font-weight:700;"></div>
    <div id="frNoBdayList" style="display:flex;flex-direction:column;gap:8px;"></div>`;
  card.appendChild(wrap);
  const input=wrap.querySelector('#frBdaySearchInput');
  if(input)input.value=frBdaySearch;
  renderFrNoBdayList();
  return card;
}

function renderFrNoBdayList(){
  const list=FRIENDS.filter(f=>!f.birthday).filter(f=>!frBdaySearch||f.name.includes(frBdaySearch));
  const countEl=document.getElementById('frNoBdayCount');
  if(countEl)countEl.textContent=`생일 미등록 ${list.length}명`;
  const listWrap=document.getElementById('frNoBdayList');
  if(!listWrap)return;
  if(!list.length){
    listWrap.innerHTML='<div class="empty">해당하는 친구가 없어요</div>';
  }else{
    listWrap.innerHTML='';
    list.forEach(f=>listWrap.appendChild(buildFrNoBdayRow(f)));
  }
}

// 검색어가 바뀔 때마다 검색창 자체는 다시 그리지 않고 목록만 갱신 → 타이핑 중 포커스/커서 유지됨.
function onFrBdaySearch(v){
  frBdaySearch=v;
  renderFrNoBdayList();
}

function buildFrNoBdayRow(f){
  const row=mkDiv('fr-nobday-row');
  row.innerHTML=`
    <div class="fr-nobday-info">
      <div class="fr-nobday-name">${f.name}</div>
      <div class="fr-nobday-group">${f.group||'미분류'}</div>
    </div>
    <div class="fr-bday-input-wrap">
      <input type="number" min="1" max="12" placeholder="월" id="frBdayM-${f.id}">
      <input type="number" min="1" max="31" placeholder="일" id="frBdayD-${f.id}">
      <button class="fr-bday-save-btn" onclick="quickSaveFrBday('${f.id}')" title="저장">${icon('plus-circle',15)}</button>
    </div>`;
  return row;
}

// 카톡 생일 알림 뜰 때 바로 찾아서 월/일만 입력하고 저장하는 용도. 저장 후에는 목록에서
// 바로 사라져야 하니 생일없음 목록만 다시 그림(검색창은 안 건드림 → 이어서 다음 사람 검색 가능).
function quickSaveFrBday(id){
  const mEl=document.getElementById('frBdayM-'+id),dEl=document.getElementById('frBdayD-'+id);
  const m=parseInt(mEl.value),d=parseInt(dEl.value);
  if(!m||!d||m<1||m>12||d<1||d>31){alert('월/일을 올바르게 입력해줘');return;}
  FRIENDS=FRIENDS.map(f=>f.id===id?{...f,birthday:`${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}:f);
  saveFriends(FRIENDS);
  renderFrNoBdayList();
}

// ─── 추가/수정 폼 ──────────────────────────────────────────────────────────────
function populateFrGroupDatalist(){
  const dl=document.getElementById('frGroupOptions');
  if(!dl)return;
  dl.innerHTML=frGroups().filter(g=>g!=='미분류').map(g=>`<option value="${g}"></option>`).join('');
}

function openFriendForm(){
  editingFrId=null;
  document.getElementById('frFormTitle').innerHTML=`${icon('plus-circle',16,'color:var(--friend)')} 새 친구`;
  document.getElementById('frSaveBtn').innerHTML=`${icon('plus-circle',14)} 추가하기`;
  document.getElementById('frName').value='';
  document.getElementById('frGroup').value='';
  document.getElementById('frIntimacy').value=5;
  document.getElementById('frBdayMonth').value='';
  document.getElementById('frBdayDay').value='';
  populateFrGroupDatalist();
  document.getElementById('friendFormPopup').classList.add('open');
}
function closeFriendForm(e){if(!e||e.target===document.getElementById('friendFormPopup'))document.getElementById('friendFormPopup').classList.remove('open');}

function editFriend(id){
  const f=FRIENDS.find(x=>x.id===id);
  if(!f)return;
  editingFrId=id;
  document.getElementById('frFormTitle').innerHTML=`${icon('edit',16,'color:var(--friend)')} 친구 수정`;
  document.getElementById('frSaveBtn').innerHTML=`${icon('edit',14)} 수정 완료`;
  document.getElementById('frName').value=f.name||'';
  document.getElementById('frGroup').value=f.group||'';
  document.getElementById('frIntimacy').value=f.intimacy!=null?f.intimacy:5;
  if(f.birthday){
    const [mm,dd]=f.birthday.split('-');
    document.getElementById('frBdayMonth').value=parseInt(mm)||'';
    document.getElementById('frBdayDay').value=parseInt(dd)||'';
  }else{
    document.getElementById('frBdayMonth').value='';
    document.getElementById('frBdayDay').value='';
  }
  populateFrGroupDatalist();
  document.getElementById('friendFormPopup').classList.add('open');
}

function saveFriendForm(){
  const name=document.getElementById('frName').value.trim();
  const group=document.getElementById('frGroup').value.trim()||'미분류';
  let intimacy=parseInt(document.getElementById('frIntimacy').value);
  if(isNaN(intimacy))intimacy=0;
  intimacy=Math.max(0,Math.min(10,intimacy));
  const bm=parseInt(document.getElementById('frBdayMonth').value);
  const bd=parseInt(document.getElementById('frBdayDay').value);
  let birthday=null;
  if(bm&&bd&&bm>=1&&bm<=12&&bd>=1&&bd<=31)birthday=`${String(bm).padStart(2,'0')}-${String(bd).padStart(2,'0')}`;
  if(!name){alert('이름을 입력해줘');return;}
  if(editingFrId){
    FRIENDS=FRIENDS.map(f=>f.id===editingFrId?{...f,name,group,intimacy,birthday}:f);
  }else{
    FRIENDS=[...FRIENDS,{id:'fr'+Date.now(),name,group,intimacy,birthday}];
  }
  saveFriends(FRIENDS);
  document.getElementById('friendFormPopup').classList.remove('open');
  renderFriend();
}

function deleteFriend(id){
  if(!confirm('이 친구를 삭제할까요?'))return;
  FRIENDS=FRIENDS.filter(f=>f.id!==id);
  saveFriends(FRIENDS);
  renderFriend();
}
