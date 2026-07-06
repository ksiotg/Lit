// ─── DATA ─────────────────────────────────────────────────────────────────────
const DEFAULT_FIXED_ITEMS=[
  {id:'f01',day:1,name:'변제금',cat:'상환',emoji:'💸',amount:223000},
  {id:'f02',day:1,name:'교통비',cat:'교통',emoji:'🚕',amount:55000},
  {id:'f03',day:1,name:'식비',cat:'식비',emoji:'🛒',amount:100000},
  {id:'f04',day:1,name:'소모품',cat:'소모품',emoji:'🧻',amount:50000},
  {id:'f05',day:2,name:'가스비',cat:'주거',emoji:'🏠',amount:50000},
  {id:'f06',day:5,name:'해비타트',cat:'기부',emoji:'💌',amount:10000},
  {id:'f07',day:7,name:'와이즐리',cat:'구독',emoji:'📅',amount:3000},
  {id:'f08',day:10,name:'월세',cat:'주거',emoji:'🏠',amount:650000},
  {id:'f09',day:13,name:'구글',cat:'구독',emoji:'📅',amount:29000},
  {id:'f10',day:14,name:'전기세',cat:'주거',emoji:'🏠',amount:50000},
  {id:'f11',day:15,name:'인터넷',cat:'통신',emoji:'☎️',amount:33000},
  {id:'f12',day:15,name:'카리타스',cat:'기부',emoji:'💌',amount:10000},
  {id:'f13',day:16,name:'어도비',cat:'구독',emoji:'📅',amount:26400},
  {id:'f14',day:21,name:'모바일',cat:'통신',emoji:'☎️',amount:18700},
  {id:'f15',day:25,name:'보험',cat:'보험',emoji:'☂️',amount:134850},
  {id:'f16',day:26,name:'당비',cat:'기부',emoji:'💌',amount:2000},
  {id:'f17',day:26,name:'플랜',cat:'기부',emoji:'💌',amount:60000},
  {id:'f18',day:28,name:'애플',cat:'구독',emoji:'📅',amount:1100},
  {id:'f19',day:30,name:'카카오',cat:'구독',emoji:'📅',amount:1000},
];
const DEFAULT_FIXED_INCOME=[{id:'fi01',day:10,name:'월급',cat:'급여',emoji:'💼',amount:1920000}];
const CATS={
  income:[{n:'급여',e:'💼'},{n:'외주',e:'💻'},{n:'용돈',e:'👛'},{n:'기타',e:'💰'}],
  expense:[{n:'식사',e:'🍽️'},{n:'간식',e:'☕️'},{n:'유흥',e:'🍺'},{n:'의료',e:'🏥'},{n:'생활',e:'🧺'},{n:'교통',e:'🚕'},{n:'뷰티',e:'🪞'},{n:'여행',e:'✈️'},{n:'여가',e:'🎬'},{n:'둥',e:'🐾'},{n:'교육',e:'🎓'},{n:'경조사',e:'🕊️'},{n:'기타',e:'📦'},{n:'세금',e:'🪙'}],
};
const PIE_COLORS=['#3b82f6','#ef4444','#f59e0b','#22c55e','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6'];
// 변동지출 카테고리별 고정 색상. 매달 순위가 바뀌어도 같은 카테고리는 항상 같은 색으로 보이게 함.
// '둥'은 데이터상의 카테고리명이지만 실제로는 "등산"을 의미해서 사용자가 요청한 등산 색(진회색)을 배정함.
const EXPENSE_CAT_COLORS={
  '기타':'#1e3a8a',   // 남색
  '유흥':'#ef4444',   // 빨강
  '생활':'#d8c3a5',   // 베이지
  '간식':'#92400e',   // 갈색
  '교통':'#eab308',   // 노랑
  '뷰티':'#ec4899',   // 핑크
  '둥':'#4b5563',     // 진회색 (등산)
  '여가':'#f97316',   // 주황
  '의료':'#22c55e',   // 초록
  '식사':'#14b8a6',   // 청록 (딱히 지정 안 돼서 튀지 않는 색으로 선정)
  '여행':'#0ea5e9',   // 하늘색
  '교육':'#6366f1',   // 인디고
  '경조사':'#c026d3', // 마젠타
  '세금':'#94a3b8',   // 슬레이트 그레이
};
function expenseCatColor(cat,fallbackIdx){return EXPENSE_CAT_COLORS[cat]||PIE_COLORS[fallbackIdx%PIE_COLORS.length];}
const CAT_COLORS={selfcare:'#f59e0b',health:'#ef4444',growth:'#3b82f6',life:'#22c55e'};
const CAT_LABELS={selfcare:'💛 케어',health:'❤️ 건강',growth:'💙 성장',life:'💚 생활'};

// ─── 루틴 탭: 월간 루틴 ─────────────────────────────────────────────────────────
// 요일별 체크가 필요 없이 "이번 달에 했는지"만 체크하는 단순한 반복 루틴.
// 완료 여부는 storage.js의 S.getMonthlyDone(y,m)/setMonthlyDone(y,m,arr)에 'YYYY-MM' 단위로
// 저장되기 때문에, 달이 바뀌면 자동으로 새 키를 참조하게 되어 별도 리셋 로직 없이 매달 리셋됨.
const DEFAULT_MONTHLY_ROUTINES=[
  {id:'mr01',name:'화장실 모래갈이',emoji:'🐱'},
  {id:'mr02',name:'당근데이 (최소 물건 1개 처분)',emoji:'🥕'},
  {id:'mr03',name:'한 달 회고',emoji:'📝'},
  {id:'mr04',name:'앨범 정리 & 업로드',emoji:'📷'},
];
let MONTHLY_ROUTINES=DEFAULT_MONTHLY_ROUTINES;

const DEFAULT_ROUTINES=[
  {id:'r01',name:'기상',emoji:'⏰',time:'AM 7:30',period:'morning',cat:'health',goal:7,freq:'daily'},
  {id:'r02',name:'유산균',emoji:'🥛',time:'AM 8:00',period:'morning',cat:'selfcare',goal:7,freq:'daily'},
  {id:'r03',name:'콘서타',emoji:'🎯',time:'AM 8:00',period:'morning',cat:'selfcare',goal:7,freq:'daily'},
  {id:'r04',name:'선크림',emoji:'☀️',time:'AM 8:00',period:'morning',cat:'selfcare',goal:5,freq:'days',days:[0,1,2,3,4]},
  {id:'r05',name:'말해보카',emoji:'👄',time:null,period:'day',cat:'growth',goal:7,freq:'daily'},
  {id:'r06',name:'듀오링고',emoji:'📗',time:null,period:'day',cat:'growth',goal:7,freq:'daily'},
  {id:'r07',name:'독서',emoji:'📖',time:null,period:'day',cat:'growth',goal:3,freq:'weekly',weeklyN:3},
  {id:'r08',name:'운동',emoji:'🥊',time:null,period:'day',cat:'health',goal:3,freq:'weekly',weeklyN:3},
  {id:'r09',name:'무지출',emoji:'💰',time:null,period:'day',cat:'life',goal:3,freq:'weekly',weeklyN:3,autoFromBudget:true},
  {id:'r10',name:'영양제',emoji:'💊',time:'PM 10:00',period:'evening',cat:'selfcare',goal:7,freq:'daily'},
  {id:'r11',name:'둥장실',emoji:'🐈‍⬛',time:'PM 11:00',period:'evening',cat:'life',goal:4,freq:'monthly',monthlyN:4},
  {id:'r12',name:'교정장치',emoji:'🦷',time:'PM 11:00',period:'evening',cat:'selfcare',goal:7,freq:'daily'},
  {id:'r13',name:'취침',emoji:'💤',time:'PM 11:30',period:'evening',cat:'health',goal:7,freq:'daily'},
  {id:'r14',name:'회고',emoji:'📝',time:'PM 11:00',period:'evening',cat:'growth',goal:5,freq:'weekly',weeklyN:5,autoFromReview:true},
];

const REVIEW_QUESTIONS=[
  {id:'q1',text:'오늘 스스로 선택하거나 결정한 일이 있었나요?',emoji:'🧭'},
  {id:'q2',text:'오늘 했던 일 중, 나에게 의미 있었던 순간은 무엇인가요?',emoji:'🌱'},
  {id:'q3',text:'오늘 내가 끝마친 일을 하나만 떠올려보세요.',emoji:'✅'},
  {id:'q4',text:'오늘 나 자신에게 너그러웠던 순간이 있었나요?',emoji:'💛'},
  {id:'q5',text:'오늘 "아, 이게 나답다" 싶었던 순간이 있었나요?',emoji:'✨'},
];

// getRoutines/saveRoutines, getFixedIncome/saveFixedIncome은 storage.js(Supabase 연동)에서 정의됨.
// 로그인 후 데이터를 불러오기 전까지는 기본값으로 시작.
let ROUTINES=DEFAULT_ROUTINES;
let FIXED_INCOME=DEFAULT_FIXED_INCOME;
let FIXED_ITEMS=DEFAULT_FIXED_ITEMS;
let FREELANCE_PROJECTS=[];
// 변동지출 카테고리(이름/이모지/색상). 사용자가 직접 추가/수정 가능 — 기본값은 CATS.expense +
// EXPENSE_CAT_COLORS(없으면 PIE_COLORS 순환)로 시드하고, 이후엔 이 배열 자체가 저장/로드됨.
let EXPENSE_CATS=CATS.expense.map((c,i)=>({n:c.n,e:c.e,color:EXPENSE_CAT_COLORS[c.n]||PIE_COLORS[i%PIE_COLORS.length]}));

// ─── 프로젝트 탭 ───────────────────────────────────────────────────────────────
// 인생의 크고 작은 목표/프로젝트 관리. 카테고리는 루틴 탭 것을 "그대로" 재사용함 —
// 별도 목록을 만드는 게 아니라 루틴과 완전히 동일한 4개(케어/건강/성장/생활)를 그대로 씀.
// 그래서 라벨/색상도 위에서 정의된 CAT_LABELS/CAT_COLORS를 그대로 참조함(중복 정의 X).
const PJ_CAT_LIST=['selfcare','health','growth','life'];
let PROJECTS=[];
const PERIOD_ICON={morning:'☀️',day:'✨',evening:'🌙'};
const PERIOD_LABEL={morning:'아침',day:'일중',evening:'저녁'};
const DOW=['월','화','수','목','금','토','일'];
const WORKOUT_EMOJIS={'러닝':'🏃','홈트':'🏋️','걷기':'🚶','자전거':'🚲','등산':'⛰️','클라이밍':'🧗','요가':'🧘','수영':'🏊','기타':'🤸'};

// ─── 친구 탭 ───────────────────────────────────────────────────────────────────
// 생일/친밀도 관리. 시간(월) 개념 없이 필터/정렬 위주의 플랫 리스트.
// 친밀도는 0~10 숫자로 저장하고, 화면에는 별 5개(1개=2점)로 환산해 보여줌.
// 생일은 연도 없이 'MM-DD' 문자열로 저장(매년 반복되는 정보라 연도가 필요 없음).
const DEFAULT_FRIENDS=[
  {id:'fr01',name:'현송희',group:'득락녀',intimacy:10,birthday:null},
  {id:'fr02',name:'윤지영',group:'득락녀',intimacy:9,birthday:null},
  {id:'fr03',name:'한다솜',group:'득락녀',intimacy:9,birthday:null},
  {id:'fr04',name:'이규리',group:'득락녀',intimacy:4,birthday:null},
  {id:'fr05',name:'오빛나리',group:'득락녀',intimacy:5,birthday:null},
  {id:'fr06',name:'이지원',group:'득락녀',intimacy:5,birthday:null},
  {id:'fr07',name:'이재연',group:'득락녀',intimacy:7,birthday:null},
  {id:'fr08',name:'김보겸',group:'득락녀',intimacy:5,birthday:null},
  {id:'fr09',name:'김성은',group:'득락녀',intimacy:4,birthday:null},
  {id:'fr10',name:'이도희',group:'득락녀',intimacy:3,birthday:null},
  {id:'fr11',name:'금수민',group:'득락녀',intimacy:2,birthday:null},
  {id:'fr12',name:'이다현',group:'고향',intimacy:10,birthday:null},
  {id:'fr13',name:'강윤서',group:'고향',intimacy:9,birthday:null},
  {id:'fr14',name:'강지희',group:'고향',intimacy:5,birthday:null},
  {id:'fr15',name:'장주옥',group:'고향',intimacy:7,birthday:null},
  {id:'fr16',name:'김진우',group:'고향',intimacy:4,birthday:null},
  {id:'fr17',name:'최윤지',group:'성당',intimacy:9,birthday:null},
  {id:'fr18',name:'김현우',group:'성당',intimacy:8,birthday:null},
  {id:'fr19',name:'김범진',group:'성당',intimacy:7,birthday:null},
  {id:'fr20',name:'배준기',group:'성당',intimacy:6,birthday:null},
  {id:'fr21',name:'이재환',group:'성당',intimacy:5,birthday:null},
  {id:'fr22',name:'김주신',group:'성당',intimacy:5,birthday:null},
  {id:'fr23',name:'성혜원',group:'성당',intimacy:4,birthday:null},
  {id:'fr24',name:'정원',group:'전직장',intimacy:7,birthday:null},
  {id:'fr25',name:'원미향',group:'전직장',intimacy:7,birthday:null},
  {id:'fr26',name:'심민화',group:'전직장',intimacy:6,birthday:null},
  {id:'fr27',name:'이예림',group:'전직장',intimacy:6,birthday:null},
  {id:'fr28',name:'고명준',group:'전직장',intimacy:6,birthday:null},
  {id:'fr29',name:'신선영',group:'전직장',intimacy:3,birthday:null},
  {id:'fr30',name:'지성경',group:'전직장',intimacy:2,birthday:null},
  {id:'fr31',name:'스티페',group:'HBC',intimacy:8,birthday:null},
  {id:'fr32',name:'리차드',group:'HBC',intimacy:7,birthday:null},
  {id:'fr33',name:'조와드',group:'HBC',intimacy:7,birthday:null},
  {id:'fr34',name:'제니',group:'HBC',intimacy:7,birthday:null},
  {id:'fr35',name:'아이리',group:'HBC',intimacy:5,birthday:null},
  {id:'fr36',name:'그랜트',group:'HBC',intimacy:8,birthday:null},
  {id:'fr37',name:'켈리',group:'HBC',intimacy:4,birthday:null},
  {id:'fr38',name:'브래드',group:'HBC',intimacy:3,birthday:null},
  {id:'fr39',name:'시브',group:'HBC',intimacy:4,birthday:null},
  {id:'fr40',name:'정민재',group:'HBC',intimacy:4,birthday:null},
  {id:'fr41',name:'예지',group:'홍대',intimacy:3,birthday:null},
  {id:'fr42',name:'주이',group:'홍대',intimacy:2,birthday:null},
  {id:'fr43',name:'지호',group:'홍대',intimacy:3,birthday:null},
  {id:'fr44',name:'은비',group:'홍대',intimacy:3,birthday:null},
  {id:'fr45',name:'하루노',group:'홍대',intimacy:1,birthday:null},
  {id:'fr46',name:'김영석',group:'음악',intimacy:8,birthday:null},
  {id:'fr47',name:'김지은',group:'음악',intimacy:5,birthday:null},
  {id:'fr48',name:'강영글',group:'음악',intimacy:5,birthday:null},
  {id:'fr49',name:'윤현지',group:'음악',intimacy:6,birthday:null},
  {id:'fr50',name:'윤미리',group:'음악',intimacy:4,birthday:null},
  {id:'fr51',name:'김도헌',group:'음악',intimacy:3,birthday:null},
  {id:'fr52',name:'신현태',group:'음악',intimacy:2,birthday:null},
  {id:'fr53',name:'권민지',group:'음악',intimacy:3,birthday:null},
  {id:'fr54',name:'임소연',group:'음악',intimacy:3,birthday:null},
  {id:'fr55',name:'지선',group:'음악',intimacy:2,birthday:null},
  {id:'fr56',name:'채혜진',group:'인연',intimacy:4,birthday:null},
  {id:'fr57',name:'지애',group:'인연',intimacy:3,birthday:null},
  {id:'fr58',name:'수라',group:'인연',intimacy:1,birthday:null},
];
let FRIENDS=DEFAULT_FRIENDS;

// ─── STATE ─────────────────────────────────────────────────────────────────────
const TODAY=new Date();
let curY=TODAY.getFullYear(),curM=TODAY.getMonth();
let rY=TODAY.getFullYear(),rM=TODAY.getMonth();
let wY=TODAY.getFullYear(),wM=TODAY.getMonth();
let flY=TODAY.getFullYear(),flM=TODAY.getMonth();
let rvY=TODAY.getFullYear(),rvM=TODAY.getMonth();
let curView='month',popupDay=null,popupType='income';
let pieChart=null;
let workoutCtx={y:null,m:null,d:null};
let reviewCtx={y:null,m:null,d:null};
let curWeekStart = null;
let newRFreq='daily',newRPeriod='morning',newRCat='selfcare',newRWeekDays=[],newRWeeklyN=3,newRMonthlyN=2;
let rView='week'; // 루틴 탭: 'week'(요일별 그리드, 기본값) / 'month'(월간 루틴 체크리스트)
