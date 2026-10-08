// karyawan.js - FIXED
let editingKaryawanId=null;
function renderKaryawanList(){
  const container=document.getElementById('karyawanListContainer');
  if(!container) return;
  const data=JSON.parse(localStorage.getItem('karyawanData')||'[]');
  container.innerHTML='';
  data.forEach(k=>{
    const div=document.createElement('div');
    div.className='customer-card-item border-3-glass-blur rounded-12';
    div.innerHTML=`<div style="display:flex;justify-content:space-between"><span style="font-weight:800">${k.nama}</span><span style="font-size:10px">${k.isActive?'Aktif':''}</span></div><div style="font-size:10px;color:#555">${k.alamat||''}</div>`;
    container.appendChild(div);
  });
}
function simpanKaryawan(){
  const nama=document.getElementById('inputNamaKaryawan')?.value.trim();
  if(!nama) return;
  let data=JSON.parse(localStorage.getItem('karyawanData')||'[]');
  data.push({id:'id_'+Date.now(), nama, isActive:false});
  localStorage.setItem('karyawanData', JSON.stringify(data));
  if(window.syncKaryawanToSupabase) window.syncKaryawanToSupabase();
  renderKaryawanList();
}
window.renderKaryawanList=renderKaryawanList;
window.simpanKaryawan=simpanKaryawan;
console.log('✅ karyawan.js FIXED');