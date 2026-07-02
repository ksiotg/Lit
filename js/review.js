
// ─── REVIEW ───────────────────────────────────────────────────────────────────
function chReviewMonth(d){rvM+=d;if(rvM>11){rvM=0;rvY++;}if(rvM<0){rvM=11;rvY--;}renderReview();}

function renderReview(){
  document.getElementById('reviewMonthLabel').textContent=`${rvY}년 ${rvM+1}월`;
  const mc=document.getElementById('reviewMain');mc.innerHTML='';
  mc.appendChild(buildReviewToday());
  const calCard=buildReviewCal();calCard.classList.add('card-wide');mc.appendChild(calCard);
  mc.appendChild(buildWeeklySummary());
}

function buildReviewToday(){
  const card=mkDiv('card');
  const todayReview=S.getReview(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
  const header=mkDiv('card-header');
  const streak=calcWeekStreak();
  header.innerHTML=`<span class="card-title">오늘의 회고</span>${streak>0?`<span class="streak-badge">🔥 ${streak}주 연속</span>`:''}`;
  card.appendChild(header);
  if(todayReview){
    const done=mkDiv('');done.style.cssText='padding:14px 16px;';
    done.innerHTML=`<div style="font-size:13px;font-weight:600;color:var(--review);margin-bottom:8px;">✅ 오늘 회고 완료!</div>`;
    REVIEW_QUESTIONS.forEach(q=>{
      const answer=todayReview.answers?.[q.id]||'';
      const row=mkDiv('');row.style.cssText='margin-bottom:10px;';
      const label=mkDiv('');label.style.cssText='font-size:12px;color:var(--muted);margin-bottom:4px;';label.textContent=`${q.emoji} ${q.text}`;
      const ans=mkDiv('review-q-answer-done');
      if(answer){ans.textContent=answer;}else{ans.style.color='var(--muted)';ans.textContent='(답변 없음)';}
      row.appendChild(label);row.appendChild(ans);
      done.appendChild(row);
    });
    if(todayReview.memo){
      const memo=mkDiv('');memo.style.cssText='background:var(--bg);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--text);margin-top:8px;';
      memo.textContent=todayReview.memo;done.appendChild(memo);
    }
    const editBtn=document.createElement('button');editBtn.className='add-btn';editBtn.style.cssText='margin-top:12px;';editBtn.innerHTML=`${icon('edit',14)} 수정하기`;
    editBtn.onclick=()=>openReviewPopup(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
    done.appendChild(editBtn);card.appendChild(done);
  } else {
    const empty=mkDiv('');empty.style.cssText='padding:14px 16px;';
    empty.innerHTML=`<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">오늘 하루를 돌아볼 시간이에요 🌙</div>`;
    const btn=document.createElement('button');btn.className='add-btn';btn.textContent='회고 작성하기';
    btn.onclick=()=>openReviewPopup(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
    empty.appendChild(btn);card.appendChild(empty);
  }
  return card;
}

function buildReviewCal(){
  const fd=new Date(rvY,rvM,1).getDay();
  const fdMon=fd===0?6:fd-1;
  const dim=new Date(rvY,rvM+1,0).getDate();
  const card=mkDiv('card');
  const dowRow=mkDiv('cal-dow-row');
  dowRow.style.paddingTop='14px';
  ['월','화','수','목','금','토','일'].forEach((d,i)=>{const e=mkDiv(`cal-dow ${i===5?'sat':i===6?'sun':''}`);e.textContent=d;dowRow.appendChild(e);});
  card.appendChild(dowRow);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:0 10px 14px;';
  for(let i=0;i<fdMon;i++){const e=mkDiv('review-cal-cell empty');grid.appendChild(e);}
  for(let d=1;d<=dim;d++){
    const date=new Date(rvY,rvM,d);
    const dow=(date.getDay()+6)%7;
    const isT=TODAY.getFullYear()===rvY&&TODAY.getMonth()===rvM&&TODAY.getDate()===d;
    const isFuture=date>TODAY;
    const rv=isFuture?null:S.getReview(rvY,rvM,d);
    const cell=mkDiv(`review-cal-cell ${isT?'today':''} ${rv?'has-review':''} ${dow===5?'sat':''} ${dow===6?'sun':''}`);
    if(!isFuture) cell.onclick=()=>openReviewPopup(rvY,rvM,d);
    const dayEl=mkDiv('review-cal-day');dayEl.textContent=d;cell.appendChild(dayEl);
    if(rv){const dot=mkDiv('review-dot');cell.appendChild(dot);}
    grid.appendChild(cell);
  }
  card.appendChild(grid);return card;
}

function buildWeeklySummary(){
  const card=mkDiv('card');
  card.innerHTML='<div class="card-header"><span class="card-title">주간 요약</span></div>';
  const inner=mkDiv('');inner.style.cssText='padding:12px 16px 16px;';
  const dim=new Date(rvY,rvM+1,0).getDate();
  // 주차별로 묶기
  const weeks={};
  for(let d=1;d<=dim;d++){
    const ws=getWeekStart(rvY,rvM,d);
    const wk=ws.toDateString();
    if(!weeks[wk]){weeks[wk]={start:new Date(ws),days:[],label:''};}
    weeks[wk].days.push(d);
  }
  const weekKeys=Object.keys(weeks);
  weekKeys.forEach((wk,wi)=>{
    const w=weeks[wk];
    const weekEnd=new Date(w.start);weekEnd.setDate(w.start.getDate()+6);
    const startM=w.start.getMonth();
    const startW=getWeekOfMonth(w.start.getFullYear(),startM,w.start.getDate());
    const endM=weekEnd.getMonth();
    const endW=getWeekOfMonth(weekEnd.getFullYear(),endM,weekEnd.getDate());
    // 주가 두 달에 걸치면(예: 6월 마지막 주 = 7월 첫째 주) 두 라벨을 함께 표시해서
    // "6월 5주"만 보고 실제로는 7월 날짜라 헷갈리는 걸 방지함.
    w.label = startM===endM ? `${startM+1}월 ${startW}주차` : `${startM+1}월 ${startW}주차 / ${endM+1}월 ${endW}주차`;
    let done=0,total=0;
    w.days.forEach(d=>{
      const date=new Date(rvY,rvM,d);
      if(date>TODAY)return;
      total++;
      if(S.getReview(rvY,rvM,d))done++;
    });
    if(total===0)return;
    const pct=Math.round(done/total*100);
    const row=mkDiv('weekly-sum-row');
    row.innerHTML=`<span class="weekly-sum-week">${w.label}</span><div class="weekly-sum-bar-wrap"><div class="weekly-sum-bar"><div class="weekly-sum-fill" style="width:${pct}%"></div></div></div><span class="weekly-sum-pct">${total}일 중 ${done}일</span>`;
    inner.appendChild(row);
  });
  if(!inner.children.length)inner.innerHTML='<div class="empty">아직 기록이 없어요</div>';
  card.appendChild(inner);return card;
}

function calcWeekStreak(){
  // 지난 주들을 확인해서 회고 달성 주 연속 계산
  let streak=0;
  const today=new Date(TODAY);
  for(let w=1;w<=52;w++){
    const weekEnd=new Date(today);
    weekEnd.setDate(today.getDate()-(w-1)*7);
    const weekStart=getWeekStart(weekEnd.getFullYear(),weekEnd.getMonth(),weekEnd.getDate());
    let hasDone=false;
    for(let i=0;i<7;i++){
      const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);
      if(d>today)continue;
      if(S.getReview(d.getFullYear(),d.getMonth(),d.getDate())){hasDone=true;break;}
    }
    if(hasDone)streak++;
    else break;
  }
  return streak;
}

function openReviewPopup(y,m,d){
  reviewCtx={y,m,d};
  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('reviewPopupDate').textContent=`${y}년 ${months[m]} ${d}일`;
  const existing=S.getReview(y,m,d)||{answers:{},memo:''};
  const qWrap=document.getElementById('reviewQuestions');qWrap.innerHTML='';
  REVIEW_QUESTIONS.forEach(q=>{
    const div=mkDiv('review-q');
    const answer=existing.answers?.[q.id]||'';
    div.innerHTML=`<div class="review-q-label">${q.emoji} ${q.id.replace('q','Q')}</div><div class="review-q-text">${q.text}</div><textarea class="review-q-answer" id="ans_${q.id}" placeholder="답변을 적어보세요..."></textarea>`;
    qWrap.appendChild(div);
    div.querySelector(`#ans_${q.id}`).value=answer;
  });
  document.getElementById('reviewMemoInput').value=existing.memo||'';
  const hasReview=!!S.getReview(y,m,d);
  const actions=document.getElementById('reviewPopupActions');
  actions.innerHTML = hasReview ? `<button onclick="editReviewDate()">📅 날짜 변경</button><button class="danger" onclick="deleteReview()">${icon('trash-2',14)} 삭제</button>` : '';
  document.getElementById('reviewOverlay').classList.add('open');
}
// 잘못 입력한 날짜의 회고를 다른 날짜로 이동
function editReviewDate(){
  const{y,m,d}=reviewCtx;
  const cur=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const input=prompt('날짜를 수정해줘 (YYYY-MM-DD)',cur);
  if(!input)return;
  const mch=input.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(!mch){alert('날짜 형식이 올바르지 않아요 (예: 2026-07-15)');return;}
  const newY=parseInt(mch[1]),newM=parseInt(mch[2])-1,newD=parseInt(mch[3]);
  const dim=new Date(newY,newM+1,0).getDate();
  if(newM<0||newM>11||newD<1||newD>dim){alert('날짜가 올바르지 않아요');return;}
  if(newY===y&&newM===m&&newD===d){document.getElementById('reviewOverlay').classList.remove('open');return;}
  const current=S.getReview(y,m,d);
  if(!current)return;
  const target=S.getReview(newY,newM,newD);
  if(target&&!confirm('이미 그 날짜에 회고가 있어요. 덮어쓸까요?'))return;
  S.setReview(newY,newM,newD,current);
  S.setReview(y,m,d,null);
  const r14=ROUTINES.find(r=>r.autoFromReview);
  if(r14){
    let c1=S.getRoutine(y,m,d);c1=c1.filter(x=>x!==r14.id);S.setRoutine(y,m,d,c1);
    let c2=S.getRoutine(newY,newM,newD);if(!c2.includes(r14.id))c2.push(r14.id);S.setRoutine(newY,newM,newD,c2);
  }
  document.getElementById('reviewOverlay').classList.remove('open');
  renderReview();
  if(rY===y&&rM===m)renderRoutine();
  if(rY===newY&&rM===newM)renderRoutine();
}
function deleteReview(){
  const{y,m,d}=reviewCtx;
  if(!confirm('이 날짜의 회고를 삭제할까요?'))return;
  S.setReview(y,m,d,null);
  const r14=ROUTINES.find(r=>r.autoFromReview);
  if(r14){let c=S.getRoutine(y,m,d);c=c.filter(x=>x!==r14.id);S.setRoutine(y,m,d,c);}
  document.getElementById('reviewOverlay').classList.remove('open');
  renderReview();
  if(rY===y&&rM===m)renderRoutine();
}

function closeReviewPopup(e){if(e.target===document.getElementById('reviewOverlay'))document.getElementById('reviewOverlay').classList.remove('open');}

function saveReview(){
  const{y,m,d}=reviewCtx;
  const answers={};
  REVIEW_QUESTIONS.forEach(q=>{
    answers[q.id]=document.getElementById(`ans_${q.id}`).value.trim();
  });
  const memo=document.getElementById('reviewMemoInput').value.trim();
  S.setReview(y,m,d,{answers,memo,ts:Date.now()});
  // 루틴 r14(회고) 자동 체크
  const r14=ROUTINES.find(r=>r.autoFromReview);
  if(r14){let c=S.getRoutine(y,m,d);if(!c.includes(r14.id))c.push(r14.id);S.setRoutine(y,m,d,c);}
  document.getElementById('reviewOverlay').classList.remove('open');
  renderReview();
  if(rY===y&&rM===m)renderRoutine();
}

// autoFromReview 체크 함수
function isReviewDone(y,m,d){return !!S.getReview(y,m,d);}
