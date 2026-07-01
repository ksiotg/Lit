// ─── DATA ─────────────────────────────────────────────────────────────────────
const FIXED_ITEMS=[
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
const FIXED_INCOME=[{id:'fi01',day:10,name:'월급',cat:'급여',emoji:'💼',amount:1920000}];
const CATS={
  income:[{n:'급여',e:'💼'},{n:'외주',e:'💻'},{n:'용돈',e:'👛'},{n:'기타',e:'💰'}],
  expense:[{n:'식사',e:'🍽️'},{n:'간식',e:'☕️'},{n:'유흥',e:'🍺'},{n:'의료',e:'🏥'},{n:'생활',e:'🧺'},{n:'교통',e:'🚕'},{n:'뷰티',e:'🪞'},{n:'여행',e:'✈️'},{n:'여가',e:'🎬'},{n:'둥',e:'🐾'},{n:'교육',e:'🎓'},{n:'경조사',e:'🕊️'},{n:'기타',e:'📦'},{n:'세금',e:'🪙'}],
};
const PIE_COLORS=['#3b82f6','#ef4444','#f59e0b','#22c55e','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6'];
const CAT_COLORS={selfcare:'#f59e0b',health:'#ef4444',growth:'#3b82f6',life:'#22c55e'};
const CAT_LABELS={selfcare:'💛 케어',health:'❤️ 건강',growth:'💙 성장',life:'💚 생활'};

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
  {id:'q1',text:'오늘 루틴을 얼마나 잘 지켰나요?',emoji:'✅'},
  {id:'q2',text:'오늘 에너지 레벨은 어땠나요?',emoji:'⚡'},
  {id:'q3',text:'오늘 내 감정 상태는?',emoji:'💭'},
  {id:'q4',text:'오늘 가장 잘한 일 하나는?',emoji:'🌟'},
  {id:'q5',text:'내일 더 잘하고 싶은 것은?',emoji:'🎯'},
];

function getRoutines(){
  try{const s=localStorage.getItem('custom_routines');if(s)return JSON.parse(s);}catch{}
  return DEFAULT_ROUTINES;
}
function saveRoutines(arr){localStorage.setItem('custom_routines',JSON.stringify(arr));}
let ROUTINES=getRoutines();
const PERIOD_ICON={morning:'☀️',day:'✨',evening:'🌙'};
const PERIOD_LABEL={morning:'아침',day:'일중',evening:'저녁'};
const DOW=['월','화','수','목','금','토','일'];
const WORKOUT_EMOJIS={'러닝':'🏃','홈트':'🏋️','걷기':'🚶','자전거':'🚲'};

// ─── STATE ─────────────────────────────────────────────────────────────────────
const TODAY=new Date();
let curY=TODAY.getFullYear(),curM=TODAY.getMonth();
let rY=TODAY.getFullYear(),rM=TODAY.getMonth();
let wY=TODAY.getFullYear(),wM=TODAY.getMonth();
let rvY=TODAY.getFullYear(),rvM=TODAY.getMonth();
let curView='month',popupDay=null,popupType='income';
let pieChart=null;
let workoutCtx={y:null,m:null,d:null};
let reviewCtx={y:null,m:null,d:null};
let curWeekStart = null;
let newRFreq='daily',newRPeriod='morning',newRCat='selfcare',newRWeekDays=[],newRWeeklyN=3,newRMonthlyN=2;
