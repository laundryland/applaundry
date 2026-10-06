
import { StorageManager, safeLS } from '../db.js';
import { closeModal } from './modalManager.js';

export function getLayanan(){ return safeLS.get('layananData', []); }

export function renderLayananList(){
  try{
    const list=getLayanan();
    const q=(document.getElementById('inputSearchLayanan')?.value||'').toLowerCase();
    const filtered=q ? list.filter(l=> (l.nama||'').toLowerCase().includes(q) || (l.kode||'').toLowerCase().includes(q)) : list;
    const container=document.getElementById('layananListContainer') || document.getElementById('layananList');
    if(!container) return;
    container.innerHTML=filtered.map(l=>`
      <div class="tap-model" style="padding:12px;border:1px solid #eee;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700">${l.nama} <span style="font-size:10px;background:#f618a9;color:#fff;padding:2px 6px;border-radius:6px">${l.kode||''}</span></div><div style="font-size:11px;color:#666">Rp ${(l.harga||0).toLocaleString('id-ID')}/${l.satuan||'Kg'} • Est ${l.estimasiVal||''} ${l.estimasiUnit||''}</div></div>
        <div style="display:flex;gap:6px"><button class="tap-model" data-pilih-layanan="${l.id}" style="padding:6px 10px;border-radius:8px;background:#f618a9;color:#fff;border:none">Pilih</button><button class="tap-model" data-edit-layanan="${l.id}" style="padding:6px 10px;border-radius:8px;border:1px solid #ddd;background:#fff">Edit</button></div>
      </div>
    `).join('');
    container.querySelectorAll('[data-pilih-layanan]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); if(typeof window.addLayananToNotaRincian==='function'){ const id=btn.getAttribute('data-pilih-layanan'); const layanan=getLayanan().find(x=>x.id===id); if(layanan) window.addLayananToNotaRincian(layanan); } closeModal('modalLayananOverlay'); }); });
    container.querySelectorAll('[data-edit-layanan]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); editLayanan(btn.getAttribute('data-edit-layanan')); }); });
  }catch(e){}
}

export function editLayanan(id){
  const l=getLayanan().find(x=>x.id===id);
  if(!l) return;
  const nama=document.getElementById('inputNamaLayanan');
  const kode=document.getElementById('inputKodeLayanan');
  const harga=document.getElementById('inputHargaLayanan');
  if(nama) nama.value=l.nama||'';
  if(kode) kode.value=l.kode||'';
  if(harga) harga.value=l.harga||0;
  safeLS.set('editingLayananId', id);
  const ov=document.getElementById('modalLayananOverlay');
  if(ov){ ov.classList.add('active'); ov.style.display='flex'; }
}

export async function simpanLayanan(){
  try{
    const nama=document.getElementById('inputNamaLayanan')?.value?.trim();
    const kode=document.getElementById('inputKodeLayanan')?.value?.trim()||'';
    const harga=Number(document.getElementById('inputHargaLayanan')?.value||0);
    const satuan=document.getElementById('inputSatuanLayanan')?.value||'Kg';
    if(!nama){ alert('Nama layanan wajib'); return; }
    let list=getLayanan();
    const editingId=safeLS.get('editingLayananId');
    const activeOutletId=safeLS.get('activeOutletId')||'outlet-1';
    if(editingId){
      list=list.map(l=> l.id===editingId ? {...l, nama, kode, harga, satuan} : l);
      safeLS.remove('editingLayananId');
    }else{
      list.push({id:'layanan-'+Date.now(), outletId:activeOutletId, nama, kode, harga, satuan, estimasiVal:3, estimasiUnit:'Jam', minKg:0});
    }
    await StorageManager.saveSupabaseFirst('layanan', list);
    renderLayananList();
    closeModal('modalLayananOverlay');
  }catch(e){}
}

window.LayananModule={ getLayanan, renderLayananList, editLayanan, simpanLayanan };
