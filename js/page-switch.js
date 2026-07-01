// ─── PAGE SWITCH ──────────────────────────────────────────────────────────────
function switchPage(page){
  ['budget','routine','workout','review'].forEach(p=>{
    document.getElementById('page-'+p).style.display=p===page?'':'none';
  });
  if(page==='budget') renderBudget();
  else if(page==='routine') renderRoutine();
  else if(page==='workout') renderWorkout();
  else if(page==='review') renderReview();
}
