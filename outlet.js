
import { StorageManager, safeLS } from '../db.js';
import { closeModal } from './modalManager.js';

export function getOutlets(){ return safeLS.get('outletsData', []); }

export function renderOutletList(){
  try{
    const list = getOutlets();
    const container = document.getElementById('outletListContainer') || document.getElementById('outletList');
    if(!container) return;
    container.innerHTML = list.map(o=>`
      <div class="tap-model" data-outlet-id="${o.id}" style="padding:12px;border:1px solid #eee;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:800">${o.nama}</div><div style="font-size:11px;color:#666">${o.alamat||''}</div></div>
        <div style="display:flex;gap:8px"><button class="tap-model" data-edit-outlet="${o.id}" style="padding:6px 10px;border-radius:8px;border:1px solid #f618a9;color:#f618a9;background:#fff">Edit</button><button class="tap-model" data-set-outlet="${o.id}" style="padding:6px 10px;border-radius:8px;background:#f618a9;color:#fff;border:none">Aktif</button></div>
      </div>
    `).join('');
    container.querySelectorAll('[data-edit-outlet]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); editOutlet(btn.getAttribute('data-edit-outlet')); }); });
    container.querySelectorAll('[data-set-outlet]').forEach(btn=>{ btn.addEventListener('click', (e)=>{ e.stopPropagation(); setActiveOutlet(btn.getAttribute('data-set-outlet')); }); });
  }catch(e){ console.warn('renderOutlet', e); }
}

export function setActiveOutlet(id){
  try{
    safeLS.set('activeOutletId', id);
    const outlets = getOutlets();
    const active = outlets.find(o=>o.id===id) || outlets[0];
    const label = document.getElementById('headerOutletLabel');
    if(label && active) label.textContent = active.nama;
    if(typeof window.syncActiveOutletHeader==='function') try{window.syncActiveOutletHeader()}catch(e){}
    closeModal('modalOutletOverlay');
    // Re-render antrian filtered by outlet
    if(typeof window.renderAntrian==='function') try{window.renderAntrian()}catch(e){}
  }catch(e){}
}

export function editOutlet(id){
  const outlets = getOutlets();
  const o = outlets.find(x=>x.id===id);
  if(!o) return;
  const nama = document.getElementById('inputNamaOutlet');
  const alamat = document.getElementById('inputAlamatOutlet');
  const wa = document.getElementById('inputWaOutlet');
  if(nama) nama.value = o.nama||'';
  if(alamat) alamat.value = o.alamat||'';
  if(wa) wa.value = o.wa||'';
  safeLS.set('editingOutletId', id);
  // open modal
  const ov = document.getElementById('modalOutletOverlay');
  if(ov){ ov.classList.add('active'); ov.style.display='flex'; }
}

export async function simpanOutlet(){
  try{
    const namaEl = document.getElementById('inputNamaOutlet');
    const alamatEl = document.getElementById('inputAlamatOutlet');
    const waEl = document.getElementById('inputWaOutlet');
    const nama = namaEl?.value?.trim();
    if(!nama){ alert('Nama outlet wajib'); return; }
    let outlets = getOutlets();
    const editingId = safeLS.get('editingOutletId');
    if(editingId){
      outlets = outlets.map(o=> o.id===editingId ? {...o, nama, alamat: alamatEl?.value||'', wa: waEl?.value||''} : o);
      safeLS.remove('editingOutletId');
    }else{
      const newId = 'outlet-'+Date.now();
      outlets.push({id:newId, nama, alamat: alamatEl?.value||'', wa: waEl?.value||'', isActive:false});
    }
    await StorageManager.saveSupabaseFirst('outlets', outlets);
    renderOutletList();
    closeModal('modalOutletOverlay');
  }catch(e){ console.warn('simpanOutlet', e); }
}

window.OutletModule = { getOutlets, renderOutletList, setActiveOutlet, editOutlet, simpanOutlet };
