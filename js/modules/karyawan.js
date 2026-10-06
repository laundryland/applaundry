
import { StorageManager, safeLS } from '../db.js';
import { closeModal } from './modalManager.js';

export function getKaryawan(){ return safeLS.get('karyawanData', []); }

export function renderKaryawanList(){
  try{
    const list = getKaryawan();
    const container = document.getElementById('karyawanListContainer') || document.getElementById('karyawanList');
    if(!container) return;
    container.innerHTML = list.map(k=>`
      <div class="tap-model" style="padding:12px;border:1px solid #eee;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700">${k.nama}</div><div style="font-size:11px;color:#666">${k.level||'Kasir'} • ${k.outletId||''}</div></div>
        <button class="tap-model" data-edit-karyawan="${k.id}" style="padding:6px 10px;border-radius:8px;border:1px solid #f618a9;color:#f618a9;background:#fff">Edit</button>
      </div>
    `).join('');
    container.querySelectorAll('[data-edit-karyawan]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); editKaryawan(btn.getAttribute('data-edit-karyawan')); }); });
  }catch(e){}
}

export function editKaryawan(id){
  const list = getKaryawan();
  const k = list.find(x=>x.id===id);
  if(!k) return;
  const nama = document.getElementById('inputNamaKaryawan');
  const wa = document.getElementById('inputWaKaryawan');
  const level = document.getElementById('inputLevelKaryawan');
  if(nama) nama.value = k.nama||'';
  if(wa) wa.value = k.wa||'';
  if(level) level.value = k.level||'Kasir';
  safeLS.set('editingKaryawanId', id);
  const ov = document.getElementById('modalKaryawanOverlay');
  if(ov){ ov.classList.add('active'); ov.style.display='flex'; }
}

export async function simpanKaryawan(){
  try{
    const nama = document.getElementById('inputNamaKaryawan')?.value?.trim();
    const wa = document.getElementById('inputWaKaryawan')?.value?.trim()||'';
    const level = document.getElementById('inputLevelKaryawan')?.value||'Kasir';
    if(!nama){ alert('Nama karyawan wajib'); return; }
    let list = getKaryawan();
    const editingId = safeLS.get('editingKaryawanId');
    const activeOutletId = safeLS.get('activeOutletId') || safeLS.get('activeOutlet')?.id || 'outlet-1';
    if(editingId){
      list = list.map(k=> k.id===editingId ? {...k, nama, wa, level} : k);
      safeLS.remove('editingKaryawanId');
    }else{
      list.push({id:'karyawan-'+Date.now(), outletId: activeOutletId, nama, wa, level, isActive:true});
    }
    await StorageManager.saveSupabaseFirst('karyawan', list);
    renderKaryawanList();
    closeModal('modalKaryawanOverlay');
  }catch(e){ console.warn(e); }
}

window.KaryawanModule = { getKaryawan, renderKaryawanList, editKaryawan, simpanKaryawan };
