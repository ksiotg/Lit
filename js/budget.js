// ─── BUDGET ───────────────────────────────────────────────────────────────────
function chMonth(d){curM+=d;if(curM>11){curM=0;curY++;}if(curM<0){curM=11;curY--;}renderBudget();}
function setView(v){curView=v;document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));document.getElementById('vbtn-'+v).classList.add('active');renderBudget();}

// 특정 연/월에 "적용 중"인 고정 수입만 골라냄 (startYm~endYm 기준).
// 예전 고정수입을 종료해도 그게 적용되던 과거 달의 기록은 그대로 유지됨.
function activeFixedIncome(y,m){
  const ym=mk(y,m);
  return FIXED_INCOME.filter(fi=>{
    if(fi.startYm&&ym<fi.startYm)return false;
    if(fi.endYm&&ym>fi.endYm)return false;
    return true;
  });
}

// 특정 연/월에 "적용 중"인 고정지출만 골라냄 (startYm~endYm 기준).
// 고정지출을 수정/종료해도 그게 적용되던 과거 달의 기록은 그대로 유지됨.
function activeFixedItems(y,m){
  const ym=mk(y,m);
  return FIXED_ITEMS.filter(fi=>{
    if(fi.startYm&&ym<fi.startYm)return false;
    if(fi.endYm&&ym>fi.endYm)return false;
    return true;
  });
}

function renderBudget(){
  document.getElementById('monthLabel').textContent=`${curY}년 ${curM+1}월`;
  const entries=S.getEntries(curY,curM),checked=S.getChecked(curY,curM);
  const fi=activeFixedIncome(curY,curM).reduce((s,i)=>s+i.amount,0)+entries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const fe=activeFixedItems(curY,curM).filter(f=>checked.includes(f.id)).reduce((s,f)=>s+f.amount,0)+entries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const rem=fi-fe;
  document.getElementById('sumIncome').textContent=fmt(fi);
  document.getElementById('sumExpense').textContent=fmt(fe);
  const re=document.getElementById('sumRemain');re.textContent=fmt(rem);re.style.color=rem<0?'var(--expense)':'var(--remain)';
  const mc=document.getElementById('budgetMain');mc.innerHTML='';
  if(curView==='month'){mc.appendChild(buildTop5());mc.appendChild(buildFreelanceIncome());mc.appendChild(buildFixed());mc.appendChild(buildBudgetCal());}
  else mc.appendChild(buildYear());
}

function buildFreelanceIncome(){
  const entries=S.getEntries(curY,curM).filter(e=>e.type==='income'&&e.cat==='외주');
  const card=mkDiv('card');card.innerHTML='<div class="card-header"><span class="card-title">💻 프리랜서 수입</span></div>';
  const inner=document.createElement('div');inner.style.cssText='padding:10px 16px 16px;display:flex;flex-direction:column;gap:7px;';
  if(!entries.length){inner.innerHTML='<div class="empty">이번 달 프리랜서 수입이 없어요</div>';}
  else{
    entries.forEach(e=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;justify-content:space-between;align-items:center;background:var(--bg);border-radius:10px;padding:9px 12px;';
      row.innerHTML=`<div style="font-size:12px;font-weight:600;">${e.emoji||'💻'} ${e.name}</div><div style="font-size:13px;font-weight:800;color:var(--income);">${fmt(e.amount)}</div>`;
      inner.appendChild(row);
    });
    const total=entries.reduce((s,e)=>s+e.amount,0);
    const totalRow=document.createElement('div');
    totalRow.style.cssText='display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);margin-top:2px;';
    totalRow.innerHTML=`<span style="font-size:11px;color:var(--muted);font-weight:700;">합계</span><span style="font-size:13px;font-weight:800;color:var(--income);">${fmt(total)}</span>`;
    inner.appendChild(totalRow);
  }
  card.appendChild(inner);return card;
}

function buildTop5(){
  const entries=S.getEntries(curY,curM);
  const catMap={};entries.filter(e=>e.type==='expense').forEach(e=>{catMap[e.cat]=(catMap[e.cat]||0)+e.amount;});
  // 리스트는 TOP5만, 그래프는 전체 카테고리를 다 보여주되 TOP5 조각만 강조(하이라이트)함.
  const allSorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const sorted=allSorted.slice(0,5);
  const total=sorted.reduce((s,[,v])=>s+v,0);
  const card=mkDiv('card');card.innerHTML='<div class="card-header"><span class="card-title">변동지출 TOP 5</span></div>';
  const inner=mkDiv('top5-inner');const list=mkDiv('top5-list');
  if(!sorted.length){list.innerHTML='<div class="empty">변동지출 내역이 없어요</div>';}
  else{sorted.forEach(([cat,amt],i)=>{
    const pct=total?Math.round(amt/total*100):0,color=PIE_COLORS[i];
    const ci=CATS.expense.find(c=>c.n===cat)||{e:'📦'};
    const row=mkDiv('top5-row');
    row.innerHTML=`<div class="top5-num">${i+1}</div><div class="top5-info"><div class="top5-name">${ci.e} ${cat}</div><div class="top5-bar-track"><div class="top5-bar-fill" style="width:${pct}%;background:${color}"></div></div></div><div class="top5-right"><div class="top5-amt" style="color:${color}">${fmt(amt)}</div><div class="top5-pct">${pct}%</div></div>`;
    list.appendChild(row);
  });}
  const pw=mkDiv('pie-wrap');const canvas=document.createElement('canvas');pw.appendChild(canvas);
  inner.appendChild(list);inner.appendChild(pw);card.appendChild(inner);
  if(pieChart)pieChart.destroy();
  if(allSorted.length){
    // 처음 5개(=TOP5)는 원래 색으로 살려서 튀어나오게 하고, 나머지는 톤다운된 회색으로 묶어서 보여줌.
    const colors=allSorted.map((_,i)=>i<5?PIE_COLORS[i]:'#e5e7eb');
    const offsets=allSorted.map((_,i)=>i<5?8:0);
    pieChart=new Chart(canvas,{type:'doughnut',data:{labels:allSorted.map(([c])=>c),datasets:[{data:allSorted.map(([,v])=>v),backgroundColor:colors,borderWidth:2,borderColor:'#fff',offset:offsets}]},options:{responsive:true,maintainAspectRatio:false,cutout:'58%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.raw)}`}}}}});
  }
  return card;
}

function buildFixed(){
  const checked=S.getChecked(curY,curM);
  const items=activeFixedItems(curY,curM);
  const card=mkDiv('card');card.innerHTML='<div class="card-header"><span class="card-title">고정지출</span></div>';
  const table=document.createElement('table');table.className='fixed-table';
  table.innerHTML='<thead><tr><th style="width:33px">일</th><th style="width:40px">납부</th><th style="width:45px">분류</th><th>내역</th><th>금액</th></tr></thead>';
  const tbody=document.createElement('tbody');
  items.forEach(f=>{
    const done=checked.includes(f.id);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><span class="fixed-day">${f.day}</span></td><td><div class="cb-wrap"><div class="cb ${done?'on':''}" onclick="toggleFixed('${f.id}')"></div></div></td><td><span class="fixed-cat-badge" title="${f.cat}">${f.emoji}</span></td><td><span class="fixed-name-text ${done?'done':''}">${f.name}</span></td><td><span class="fixed-amt-text ${done?'done':''}">${fmt(f.amount)}</span></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);card.appendChild(table);
  const da=items.filter(f=>checked.includes(f.id)).reduce((s,f)=>s+f.amount,0);
  const ta=items.reduce((s,f)=>s+f.amount,0);
  const footer=mkDiv('fixed-footer');footer.innerHTML=`<span class="fixed-footer-label">납부 완료</span><span class="fixed-footer-val">${fmt(da)} / ${fmt(ta)}</span>`;
  card.appendChild(footer);return card;
}
function toggleFixed(id){let c=S.getChecked(curY,curM);c=c.includes(id)?c.filter(x=>x!==id):[...c,id];S.setChecked(curY,curM,c);renderBudget();}

function buildBudgetCal(){
  const entries=S.getEntries(curY,curM);
  const fd=new Date(curY,curM,1).getDay();
  const dim=new Date(curY,curM+1,0).getDate();
  const byDay={};
  const todayZero = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  entries.forEach(e=>{if(!byDay[e.day])byDay[e.day]=[];byDay[e.day].push(e);});
  activeFixedIncome(curY,curM).forEach(fi=>{if(!byDay[fi.day])byDay[fi.day]=[];byDay[fi.day].push({...fi,type:'income',auto:true});});
  const card=mkDiv('card');
  card.innerHTML=`<div class="card-header" style="padding-bottom:4px"><span class="card-title">${curY}년 ${curM+1}월</span></div>`;
  let noSpendCount=0;
  const dow=mkDiv('cal-dow-row');
  ['일','월','화','수','목','금','토'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===0?'sun':i===6?'sat':''}`);e.textContent=d;dow.appendChild(e);});
  const grid=mkDiv('cal-grid');
  for(let i=0;i<fd;i++)grid.appendChild(mkDiv('cal-cell empty'));
  for(let d=1;d<=dim;d++){
    const dow2=(fd+d-1)%7;
    const isT=TODAY.getFullYear()===curY&&TODAY.getMonth()===curM&&TODAY.getDate()===d;
    const isFuture = new Date(curY, curM, d) > todayZero;
    const de=byDay[d]||[];
    const cell=mkDiv(`cal-cell ${isT?'today':''} ${dow2===0?'sun':''} ${dow2===6?'sat':''}`);
    cell.onclick=()=>openPopup(d);
    const dayEl=mkDiv('cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    let totExp=0;
    if(de.length){
      const totInc=de.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
      totExp=de.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);

      if(totExp > 0){
        if(totExp <= 30000) cell.style.background = '#FADADD'; // 소액 지출 (연한 코랄)
        else if(totExp <= 100000) cell.style.background = '#F8C3C3'; // 중간 지출 (코랄)
        else { cell.style.background = '#F6A9A9'; } // 과소비 (진한 코랄)
      } else if (!isFuture) { cell.style.background = '#dcfce7'; } // 지출 0원 (초록)

      if(totInc > 0){
        const incDot=mkDiv('');incDot.style.cssText='position:absolute;top:6px;right:6px;width:5px;height:5px;background:var(--income);border-radius:50%;';
        cell.appendChild(incDot);
      }
    } else if (!isFuture) {
      cell.style.background = '#dcfce7'; // 무지출 (초록)
    }
    // 오늘까지 지난 날짜 중 지출이 0원인 날만 무지출 챌린지 성공으로 카운트 (미래 날짜는 제외)
    if(!isFuture && totExp===0) noSpendCount++;
    // routine dots removed for budget calendar
    grid.appendChild(cell);
  }
  const challenge=mkDiv('nospend-challenge');
  challenge.textContent=`이번 달 무지출 챌린지 ${noSpendCount}회 성공!`;
  card.appendChild(challenge);
  card.appendChild(dow);
  card.appendChild(grid);return card;
}

function buildYear(){
  const card=mkDiv('card');card.innerHTML=`<div class="card-header"><span class="card-title">연간 요약 — ${curY}년</span></div>`;
  const inner=document.createElement('div');inner.style.cssText='padding:12px 16px 16px;display:flex;flex-direction:column;gap:10px';
  let yi=0,ye=0;
  for(let m=0;m<12;m++){
    const e=S.getEntries(curY,m),c=S.getChecked(curY,m);
    const fi=activeFixedIncome(curY,m).reduce((s,i)=>s+i.amount,0)+e.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);
    const fe=activeFixedItems(curY,m).filter(f=>c.includes(f.id)).reduce((s,f)=>s+f.amount,0)+e.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0);
    yi+=fi;ye+=fe;
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;cursor:pointer';
    row.onclick=()=>{curM=m;setView('month');};
    row.innerHTML=`<span style="font-size:12px;font-weight:700;color:${m===curM?'var(--income)':'var(--muted)'};width:28px">${m+1}월</span><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="color:var(--income);font-weight:700">${fmt(fi)}</span><span style="color:var(--expense);font-weight:700">${fmt(fe)}</span></div><div style="height:4px;background:#f0f0f5;border-radius:99px;overflow:hidden"><div style="height:100%;width:${fi?Math.min(100,Math.round(fe/fi*100)):0}%;background:var(--expense);border-radius:99px"></div></div></div><span style="font-size:11px;font-weight:800;color:${fi-fe>=0?'var(--remain)':'var(--expense)'}">${fmt(fi-fe)}</span>`;
    inner.appendChild(row);
  }
  const tot=document.createElement('div');tot.style.cssText='border-top:2px solid var(--border);padding-top:10px;display:flex;justify-content:space-between';
  tot.innerHTML=`<div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:2px">연간 수입</div><div style="font-size:14px;font-weight:800;color:var(--income)">${fmt(yi)}</div></div><div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:2px">연간 지출</div><div style="font-size:14px;font-weight:800;color:var(--expense)">${fmt(ye)}</div></div><div style="text-align:center"><div style="font-size:10px;color:var(--muted);margin-bottom:2px">연간 잔여</div><div style="font-size:14px;font-weight:800;color:var(--remain)">${fmt(yi-ye)}</div></div>`;
  inner.appendChild(tot);card.appendChild(inner);return card;
}

// ─── BUDGET POPUP ─────────────────────────────────────────────────────────────
let editingEntryId=null;
// 외주 수입을 "등록된 프로젝트에서 불러오기"로 선택하면 그 프로젝트 id를 기억해뒀다가
// 저장되는 항목에 함께 저장함 (외주 탭 프로젝트 상세보기에서 정산 내역을 역으로 찾을 때 사용).
let pickedFlProjectId=null;
function openPopup(day){
  popupDay=day;popupType='expense';
  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('popupDateLabel').textContent=`${curY}년 ${months[curM]} ${day}일`;
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.type-btn.expense').classList.add('active');
  setType('expense',document.querySelector('.type-btn.expense'));
  resetEntryFormUI();
  renderPopupEntries();document.getElementById('overlay').classList.add('open');
}
function closePopup(e){if(e.target===document.getElementById('overlay'))document.getElementById('overlay').classList.remove('open');}
function renderPopupEntries(){
  if(popupDay===null)return;
  const entries=S.getEntries(curY,curM).filter(e=>e.day===popupDay);
  const auto=activeFixedIncome(curY,curM).filter(f=>f.day===popupDay);
  const all=[...auto.map(f=>({...f,type:'income',auto:true,id:'a_'+f.id})),...entries];
  const el=document.getElementById('popupEntries');
  if(!all.length){el.innerHTML='<div class="empty">내역이 없어요</div>';return;}
  el.innerHTML=all.map(e=>`<div class="pe"><div class="pe-dot ${e.type}"></div><div class="pe-info"><div class="pe-name">${e.emoji||''} ${e.name||e.cat}</div><div class="pe-cat">${e.cat}${e.auto?' · 자동':''}</div></div><div class="pe-amt ${e.type}">${e.type==='income'?'+':'−'}${fmt(e.amount)}</div>${e.auto?'':`<button class="pe-edit" onclick="editEntry('${e.id}')" title="수정">✏️</button><button class="pe-del" onclick="delEntry('${e.id}')">×</button>`}</div>`).join('');
}
// 등록된 항목의 모든 필드(날짜/금액/카테고리/메모/이모지 등)를 아래 "내역 추가" 폼에 그대로 채워서
// 편집 모드로 전환함. 저장은 saveEntryForm()이 처리 (추가/수정 공용).
function editEntry(id){
  const entries=S.getEntries(curY,curM);
  const e=entries.find(x=>x.id===id);
  if(!e)return;
  editingEntryId=id;
  const btn=document.querySelector(`.type-btn.${e.type}`);
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  setType(e.type,btn);
  if(e.type==='income'){
    document.getElementById('fCategory').value=e.cat;
    onIncomeCatChange();
    if(e.cat==='외주'){
      const parts=(e.name||'').split(' / ');
      document.getElementById('fClient').value=parts[0]||'';
      document.getElementById('fProject').value=parts[1]||'';
      document.getElementById('fAmount').value=e.amount;
      calcTax();
      pickedFlProjectId=e.projectId||null;
      if(e.projectId)document.getElementById('fProjectPicker').value=e.projectId;
    }else{
      document.getElementById('fSimpleAmount').value=e.amount;
      document.getElementById('fSimpleMemo').value=e.name||'';
    }
  }else{
    document.getElementById('nCategory').value=e.cat;
    document.getElementById('nAmount').value=e.amount;
    document.getElementById('nMemo').value=e.name||'';
  }
  const dateStr=`${curY}-${String(curM+1).padStart(2,'0')}-${String(e.day).padStart(2,'0')}`;
  document.getElementById('editDateInput').value=dateStr;
  document.getElementById('editDateRow').style.display='block';
  document.getElementById('entrySaveBtn').textContent='수정 완료';
  document.getElementById('entryCancelBtn').style.display='block';
}
function cancelEditEntry(){
  resetEntryFormUI();
  clearEntryFormFields();
  setType('expense',document.querySelector('.type-btn.expense'));
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.type-btn.expense').classList.add('active');
}
function resetEntryFormUI(){
  editingEntryId=null;
  document.getElementById('editDateRow').style.display='none';
  document.getElementById('editDateInput').value='';
  document.getElementById('entrySaveBtn').textContent='추가하기';
  document.getElementById('entryCancelBtn').style.display='none';
}
function clearEntryFormFields(){
  ['fAmount','fClient','fProject','fSimpleAmount','fSimpleMemo','nAmount','nMemo','fProjectPicker'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('fTaxRate').value='3.3';document.getElementById('taxPreview').classList.remove('show');
  pickedFlProjectId=null;
}
function setType(type,btn){
  popupType=type;document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const isI=(type==='income');
  document.getElementById('normalFields').style.display=isI?'none':'grid';
  document.getElementById('incomeCatRow').style.display=isI?'block':'none';
  if(isI){
    const sel=document.getElementById('fCategory');
    sel.innerHTML=CATS.income.map(c=>`<option value="${c.n}">${c.e} ${c.n}</option>`).join('');
    onIncomeCatChange();
  }else{
    document.getElementById('freelanceFields').classList.remove('show');
    document.getElementById('incomeSimpleFields').style.display='none';
    const sel=document.getElementById('nCategory');
    sel.innerHTML=CATS.expense.map(c=>`<option value="${c.n}">${c.e} ${c.n}</option>`).join('');
  }
}
// 수입 카테고리에 따라 입력 폼을 전환. "외주"만 세율 계산(프리랜서 원천징수 미리보기) 폼을 보여주고,
// 급여/용돈/기타처럼 세금을 떼지 않는 항목은 입력한 금액을 그대로 반영하는 단순 폼을 보여줌.
function onIncomeCatChange(){
  const cat=document.getElementById('fCategory').value;
  const isFreelance=(cat==='외주');
  document.getElementById('freelanceFields').classList.toggle('show',isFreelance);
  document.getElementById('incomeSimpleFields').style.display=isFreelance?'none':'grid';
  if(isFreelance){populateFlProjectPicker();calcTax();}
}
function calcTax(){
  const amt=parseFloat(document.getElementById('fAmount').value)||0;
  const rate=parseFloat(document.getElementById('fTaxRate').value)||3.3;
  const prev=document.getElementById('taxPreview');
  if(amt>0){prev.classList.add('show');document.getElementById('taxKip').textContent=fmt(Math.round(amt*rate/100));document.getElementById('taxNet').textContent=fmt(amt-Math.round(amt*rate/100));}
  else prev.classList.remove('show');
}
function saveEntryForm(){
  const isI=popupType==='income';
  let amount,cat,memo,emoji;
  if(isI){
    cat=document.getElementById('fCategory').value;
    if(cat==='외주'){
      amount=parseInt(document.getElementById('fAmount').value)||0;
      const cl=document.getElementById('fClient').value.trim(),pr=document.getElementById('fProject').value.trim();
      memo=[cl,pr].filter(Boolean).join(' / ')||cat;
    }else{
      amount=parseInt(document.getElementById('fSimpleAmount').value)||0;
      memo=document.getElementById('fSimpleMemo').value.trim()||cat;
    }
  }else{amount=parseInt(document.getElementById('nAmount').value)||0;cat=document.getElementById('nCategory').value;memo=document.getElementById('nMemo').value.trim()||cat;}
  if(!amount||amount<=0){alert('금액을 입력해주세요');return;}
  const ci=[...CATS.income,...CATS.expense].find(c=>c.n===cat)||{e:'📌'};emoji=ci.e;
  // 외주 수입을 "등록된 프로젝트에서 불러오기"로 선택했으면 그 프로젝트 id를 항목에 같이 저장함
  // (외주 탭 프로젝트 상세보기에서 이 항목을 정산 내역으로 역추적할 수 있게).
  const projectId=(isI&&cat==='외주')?pickedFlProjectId||undefined:undefined;

  if(editingEntryId){
    // 수정 모드: 날짜 입력값을 검증하고, 필요하면 다른 달/연도로도 옮김.
    const dateVal=document.getElementById('editDateInput').value;
    if(!dateVal){alert('날짜를 입력해주세요');return;}
    const parts=dateVal.split('-').map(Number);
    const newY=parts[0],newM=parts[1]-1,newD=parts[2];
    const dim=new Date(newY,newM+1,0).getDate();
    if(!newY||newM<0||newM>11||newD<1||newD>dim){alert('날짜가 올바르지 않아요');return;}
    const remaining=S.getEntries(curY,curM).filter(x=>x.id!==editingEntryId);
    S.setEntries(curY,curM,remaining);
    const updated={id:editingEntryId,type:popupType,day:newD,amount,cat,emoji,name:memo,projectId};
    if(newY===curY&&newM===curM){
      const list=S.getEntries(curY,curM);
      list.push(updated);
      S.setEntries(curY,curM,list);
    }else{
      const target=S.getEntries(newY,newM);
      target.push(updated);
      S.setEntries(newY,newM,target);
    }
    resetEntryFormUI();
  }else{
    const entries=S.getEntries(curY,curM);entries.push({id:'e'+Date.now(),type:popupType,day:popupDay,amount,cat,emoji,name:memo,projectId});
    S.setEntries(curY,curM,entries);
  }
  clearEntryFormFields();
  setType('expense',document.querySelector('.type-btn.expense'));
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.type-btn.expense').classList.add('active');
  renderPopupEntries();renderBudget();
}
function delEntry(id){
  if(editingEntryId===id)resetEntryFormUI();
  S.setEntries(curY,curM,S.getEntries(curY,curM).filter(e=>e.id!==id));renderPopupEntries();renderBudget();
}

// ─── 가계부 설정 (고정 수입 관리) ────────────────────────────────────────────
function openBudgetSettings(){
  renderFixedIncomeList();
  renderFixedItemsList();
  document.getElementById('budgetSettingsPopup').classList.add('open');
}
function closeBudgetSettings(e){if(e.target===document.getElementById('budgetSettingsPopup'))document.getElementById('budgetSettingsPopup').classList.remove('open');}

function renderFixedIncomeList(){
  const wrap=document.getElementById('fixedIncomeList');wrap.innerHTML='';
  if(!FIXED_INCOME.length){wrap.innerHTML='<div class="empty">등록된 고정 수입이 없어요</div>';return;}
  FIXED_INCOME.forEach(fi=>{
    const item=mkDiv('rmgmt-item');
    const period=fi.endYm?`${fi.startYm||'처음'}~${fi.endYm} · 종료됨`:`${fi.startYm?fi.startYm+'~':''}매월 자동 반영중`;
    const rightBtn=fi.endYm?'':`<button class="rmgmt-del" onclick="endFixedIncome('${fi.id}')" title="이번 달까지만 반영하고 종료">종료</button>`;
    item.innerHTML=`<div class="rmgmt-icon">${fi.emoji}</div><div class="rmgmt-info"><div class="rmgmt-name">${fi.name}</div><div class="rmgmt-sub">매월 ${fi.day}일 · ${fmt(fi.amount)} · ${period}</div></div>${rightBtn}`;
    if(fi.endYm)item.style.opacity='0.55';
    wrap.appendChild(item);
  });
}

function saveNewFixedIncome(){
  const name=document.getElementById('newFiName').value.trim();
  const emoji=document.getElementById('newFiEmoji').value.trim()||'💼';
  const day=Math.min(31,Math.max(1,parseInt(document.getElementById('newFiDay').value)||1));
  const amount=parseInt(document.getElementById('newFiAmount').value)||0;
  if(!name||!amount){alert('이름과 금액을 입력해줘');return;}
  FIXED_INCOME=[...FIXED_INCOME,{id:'fi'+Date.now(),name,emoji,day,cat:'급여',amount,startYm:mk(TODAY.getFullYear(),TODAY.getMonth())}];
  saveFixedIncome(FIXED_INCOME);
  document.getElementById('newFiName').value='';
  document.getElementById('newFiEmoji').value='';
  document.getElementById('newFiDay').value='';
  document.getElementById('newFiAmount').value='';
  renderFixedIncomeList();
  renderBudget();
}

// 고정 수입을 "삭제"하는 대신 이번 달까지만 반영하고 이번 달 기준으로 종료함.
// 이렇게 해야 지난 달까지의 가계부 기록이 뒤늦게 바뀌지 않음.
function endFixedIncome(id){
  if(!confirm('이번 달까지만 반영하고 종료할까요? 지난 기록은 그대로 남아요.'))return;
  FIXED_INCOME=FIXED_INCOME.map(f=>f.id===id?{...f,endYm:mk(TODAY.getFullYear(),TODAY.getMonth())}:f);
  saveFixedIncome(FIXED_INCOME);
  renderFixedIncomeList();
  renderBudget();
}

// ─── 가계부 설정 (고정지출 관리) ────────────────────────────────────────────
let editingFixedItemId=null;

function renderFixedItemsList(){
  const wrap=document.getElementById('fixedItemsList');wrap.innerHTML='';
  if(!FIXED_ITEMS.length){wrap.innerHTML='<div class="empty">등록된 고정지출이 없어요</div>';return;}
  FIXED_ITEMS.forEach(f=>{
    const item=mkDiv('rmgmt-item');
    const period=f.endYm?`${f.startYm||'처음'}~${f.endYm} · 종료됨`:`${f.startYm?f.startYm+'~':''}매월 자동 반영중`;
    const rightBtns=f.endYm?'':`<button class="rmgmt-del" style="font-size:13px;" onclick="editFixedItemStart('${f.id}')" title="수정">수정</button><button class="rmgmt-del" onclick="endFixedItem('${f.id}')" title="이번 달까지만 반영하고 종료">종료</button>`;
    item.innerHTML=`<div class="rmgmt-icon">${f.emoji}</div><div class="rmgmt-info"><div class="rmgmt-name">${f.name}</div><div class="rmgmt-sub">매월 ${f.day}일 · ${fmt(f.amount)} · ${period}</div></div><div style="display:flex;gap:2px;">${rightBtns}</div>`;
    if(f.endYm)item.style.opacity='0.55';
    wrap.appendChild(item);
  });
}

function editFixedItemStart(id){
  const f=FIXED_ITEMS.find(x=>x.id===id);
  if(!f)return;
  editingFixedItemId=id;
  document.getElementById('newFItemName').value=f.name;
  document.getElementById('newFItemEmoji').value=f.emoji;
  document.getElementById('newFItemCat').value=f.cat;
  document.getElementById('newFItemDay').value=f.day;
  document.getElementById('newFItemAmount').value=f.amount;
  document.getElementById('fiItemFormTitle').textContent='✏️ 고정지출 수정 (이번 달부터 적용)';
  document.getElementById('fiItemSaveBtn').textContent='수정 완료';
}

// 새 고정지출 추가 / 기존 항목 수정 저장.
// 수정은 기존 항목을 이번 달까지만 반영하고 종료 + 이번 달부터 새 값으로 새 항목을 시작하는 방식.
// (가계부 고정 수입과 동일한 원리 — 지난 달 기록은 예전 값 그대로 유지됨)
function saveFixedItemForm(){
  const name=document.getElementById('newFItemName').value.trim();
  const emoji=document.getElementById('newFItemEmoji').value.trim()||'📌';
  const cat=document.getElementById('newFItemCat').value.trim()||'기타';
  const day=Math.min(31,Math.max(1,parseInt(document.getElementById('newFItemDay').value)||1));
  const amount=parseInt(document.getElementById('newFItemAmount').value)||0;
  if(!name||!amount){alert('이름과 금액을 입력해줘');return;}
  const curYm=mk(TODAY.getFullYear(),TODAY.getMonth());
  if(editingFixedItemId){
    FIXED_ITEMS=FIXED_ITEMS.map(f=>f.id===editingFixedItemId?{...f,endYm:curYm}:f);
    FIXED_ITEMS=[...FIXED_ITEMS,{id:'f'+Date.now(),name,emoji,cat,day,amount,startYm:curYm}];
    editingFixedItemId=null;
  }else{
    FIXED_ITEMS=[...FIXED_ITEMS,{id:'f'+Date.now(),name,emoji,cat,day,amount,startYm:curYm}];
  }
  saveFixedItems(FIXED_ITEMS);
  ['newFItemName','newFItemEmoji','newFItemCat','newFItemDay','newFItemAmount'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('fiItemFormTitle').textContent='+ 고정지출 추가';
  document.getElementById('fiItemSaveBtn').textContent='추가하기';
  renderFixedItemsList();
  renderBudget();
}

// 고정지출을 "삭제"하는 대신 이번 달까지만 반영하고 이번 달 기준으로 종료함.
function endFixedItem(id){
  if(!confirm('이번 달까지만 반영하고 종료할까요? 지난 기록은 그대로 남아요.'))return;
  FIXED_ITEMS=FIXED_ITEMS.map(f=>f.id===id?{...f,endYm:mk(TODAY.getFullYear(),TODAY.getMonth())}:f);
  saveFixedItems(FIXED_ITEMS);
  renderFixedItemsList();
  renderBudget();
}
