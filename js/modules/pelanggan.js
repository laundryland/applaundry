
import { StorageManager, safeLS } from '../db.js';
import { closeModal } from './modalManager.js';

export function getPelanggan(){ return safeLS.get('pelangganData', []); }

export function renderPelangganList(){
  try{
    const list = getPelanggan();
    const q = (document.getElementById('inputSearchPelanggan')?.value||'').toLowerCase();
    const filtered = q ? list.filter(p=> (p.nama||'').toLowerCase().includes(q) || (p.wa||'').includes(q)) : list;
    const container = document.getElementById('pelangganListContainer') || document.getElementById('pelangganList');
    if(!container) return;
    container.innerHTML = filtered.map(p=>`
      <div class="tap-model" data-pelanggan-id="${p.id}" style="padding:12px;border:1px solid #eee;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700">${p.nama}</div><div style="font-size:11px;color:#666">${p.wa||''} • Dep: Rp ${(p.deposito||0).toLocaleString('id-ID')}</div></div>
        <div style="display:flex;gap:6px"><button class="tap-model" data-pilih-pelanggan="${p.id}" style="padding:6px 10px;border-radius:8px;background:#f618a9;color:#fff;border:none">Pilih</button><button class="tap-model" data-edit-pelanggan="${p.id}" style="padding:6px 10px;border-radius:8px;border:1px solid #ddd;background:#fff">Edit</button></div>
      </div>
    `).join('');
    container.querySelectorAll('[data-pilih-pelanggan]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); const id=btn.getAttribute('data-pilih-pelanggan'); if(typeof window.selectPelangganTargetNota==='function') window.selectPelangganTargetNota(id); closeModal('modalPelangganOverlay'); }); });
    container.querySelectorAll('[data-edit-pelanggan]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); editPelanggan(btn.getAttribute('data-edit-pelanggan')); }); });
  }catch(e){ console.warn(e); }
}

export function editPelanggan(id){
  const p = getPelanggan().find(x=>x.id===id);
  if(!p) return;
  const nama = document.getElementById('inputNamaPelanggan');
  const wa = document.getElementById('inputWaPelanggan');
  const alamat = document.getElementById('inputAlamatPelanggan');
  if(nama) nama.value=p.nama||'';
  if(wa) wa.value=p.wa||'';
  if(alamat) alamat.value=p.alamat||'';
  safeLS.set('editingPelangganId', id);
  const ov=document.getElementById('modalPelangganOverlay');
  if(ov){ ov.classList.add('active'); ov.style.display='flex'; }
}

export async function simpanPelanggan(){
  try{
    const nama=document.getElementById('inputNamaPelanggan')?.value?.trim();
    const wa=document.getElementById('inputWaPelanggan')?.value?.trim()||'';
    const alamat=document.getElementById('inputAlamatPelanggan')?.value?.trim()||'';
    if(!nama){ alert('Nama wajib'); return; }
    let list=getPelanggan();
    const editingId=safeLS.get('editingPelangganId');
    const activeOutletId=safeLS.get('activeOutletId')||'outlet-1';
    if(editingId){
      list=list.map(p=> p.id===editingId ? {...p, nama, wa, alamat} : p);
      safeLS.remove('editingPelangganId');
    }else{
      list.push({id:'pelanggan-'+Date.now(), outletId:activeOutletId, nama, wa, alamat, deposito:0});
    }
    await StorageManager.saveSupabaseFirst('pelanggan', list);
    renderPelangganList();
    closeModal('modalPelangganOverlay');
  }catch(e){}
}

window.PelangganModule={ getPelanggan, renderPelangganList, editPelanggan, simpanPelanggan };
