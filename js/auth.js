// ─── 로그인/인증 ──────────────────────────────────────────────────────────────
let currentUser=null;

function showAuthGate(msg){
  const gate=document.getElementById('authGate');
  gate.style.display='flex';
  document.getElementById('authMsg').textContent=msg||'';
  document.getElementById('authMsg').style.color = msg==='로그인 중...'||msg==='계정 만드는 중...'||msg==='가입 완료! 다시 로그인해줘.' ? 'var(--income)' : 'var(--expense)';
}
function hideAuthGate(){
  document.getElementById('authGate').style.display='none';
}

async function handleSignIn(){
  const email=document.getElementById('authEmail').value.trim();
  const password=document.getElementById('authPassword').value;
  if(!email||!password){showAuthGate('이메일/비밀번호를 입력해줘');return;}
  showAuthGate('로그인 중...');
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){showAuthGate(error.message);return;}
  await onAuthReady(data.user);
}

async function handleSignUp(){
  const email=document.getElementById('authEmail').value.trim();
  const password=document.getElementById('authPassword').value;
  if(!email||!password||password.length<6){showAuthGate('이메일/비밀번호(6자 이상)를 입력해줘');return;}
  showAuthGate('계정 만드는 중...');
  const {data,error}=await sb.auth.signUp({email,password});
  if(error){showAuthGate(error.message);return;}
  if(data.session){
    await onAuthReady(data.user);
  }else{
    showAuthGate('가입 완료! 다시 로그인해줘.');
  }
}

async function handleSignOut(){
  await sb.auth.signOut();
  location.reload();
}

async function onAuthReady(user){
  currentUser=user;
  await Storage.loadAll(user.id);
  ROUTINES=getRoutines();
  FIXED_INCOME=getFixedIncome();
  FIXED_ITEMS=getFixedItems();
  hideAuthGate();
  switchPage('routine');
}

async function initAuth(){
  const {data}=await sb.auth.getSession();
  if(data.session){
    await onAuthReady(data.session.user);
  }else{
    showAuthGate();
  }
}
