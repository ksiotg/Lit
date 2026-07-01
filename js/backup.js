// ─── 데이터 백업 (내보내기 / 불러오기) ──────────────────────────────────────────
function exportData(){
  const data=Storage._cache;
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const today=new Date();
  const fname=`lit-backup-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}.json`;
  a.href=url;a.download=fname;document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}

function importData(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!confirm('현재 데이터를 불러온 파일로 덮어씁니다. 계속할까요?')){input.value='';return;}
      Object.keys(data).forEach(k=>Storage._set(k,data[k]));
      alert('불러오기 완료! 새로고침합니다.');
      location.reload();
    }catch(err){
      alert('올바르지 않은 백업 파일이에요.');
    }
  };
  reader.readAsText(file);
  input.value='';
}
