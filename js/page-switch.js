// ─── PAGE SWITCH ──────────────────────────────────────────────────────────────
function switchPage(page){
  ['routine','workout','review','budget','freelance','project'].forEach(p=>{
    document.getElementById('page-'+p).style.display=p===page?'':'none';
  });
  if(page==='budget') renderBudget();
  else if(page==='routine') renderRoutine();
  else if(page==='workout') renderWorkout();
  else if(page==='review') renderReview();
  else if(page==='freelance'){flView='month';renderFreelance();} // 탭 클릭 시 항상 월간 뷰로 초기화
  else if(page==='project') renderProjects();
}
