
import { StorageManager, safeLS } from '../db.js';
import { openModal, closeModal } from './modalManager.js';
import { getTanggalNota, formatRupiah } from '../utils.js';

export function getAntrian(){ return safeLS.get('antrianData', []); }

export function renderAntrian(){
  try{
    const list = getAntrian();
    const activeOutletId = safeLS.get('activeOutletId') || safeLS.get('activeOutlet')?.id;
    const filter = safeLS.get('activeAntrianFilter','semua');
    const search = (safeLS.get('searchAntrianQuery','')||'').toLowerCase();
    let filtered = list;
    if(activeOutletId) filtered = filtered.filter(n=> !n.outletId || n.outletId===activeOutletId);
    if(filter!=='semua') filtered = filtered.filter(n=> (n.statusProses||'').toLowerCase()===filter.toLowerCase() || (n.statusBayar||'').toLowerCase()===filter.toLowerCase());
    if(search) filtered = filtered.filter(n=> (n.namaPelanggan||'').toLowerCase().includes(search) || (n.nota||'').toLowerCase().includes(search));
    // Sort by tanggal desc
    filtered = filtered.sort((a,b)=> getTanggalNota(b) - getTanggalNota(a));
    
    const container = document.getElementById('antrianList') || document.getElementById('antrianListContainer');
    if(!container) return;
    if(!filtered.length){
      container.innerHTML = '<div style="padding:24px;text-align:center;color:#666">Belum ada nota • Buat nota baru</div>';
      return;
    }
    container.innerHTML = filtered.map(it=>{
      const isDeadline = (it.statusProses==='Proses' || it.statusProses==='Antrian') && getTanggalNota(it) < new Date(Date.now()-2*24*3600000);
      const badgeClass = it.statusBayar==='Lunas' ? 'background:#dcfce7;color:#166534' : 'background:#fef3c7;color:#92400e';
      const prosesClass = it.statusProses==='Selesai' ? 'background:#dcfce7;color:#166534' : it.statusProses==='Proses' ? 'background:#dbeafe;color:#1e40af' : 'background:#f3f4f6;color:#374151';
      return `
        <div class="tap-model" data-nota-id="${it.id}" style="padding:14px;border:1px solid #eee;border-radius:12px;margin-bottom:10px;background:#fff;${isDeadline?'border-left:4px solid #f97316':''}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:800;font-size:14px">${it.nota||'#NT-'+it.id.slice(-4)} <span style="font-size:10px;padding:2px 6px;border-radius:6px;${badgeClass}">${it.statusBayar||'Belum Lunas'}</span></div>
            <div style="font-size:10px;padding:3px 8px;border-radius:20px;${prosesClass}">${it.statusProses||'Antrian'}</div>
          </div>
          <div style="margin-top:6px;font-size:13px;font-weight:600">${it.namaPelanggan||'Pelanggan'}</div>
          <div style="font-size:11px;color:#666">${it.layanan||''} • ${formatRupiah(it.totalNota||0)}</div>
          <div style="margin-top:8px;display:flex;gap:6px">
            <button class="tap-model" data-detail-nota="${it.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid #eee;background:#fff;font-size:12px;font-weight:600">Detail</button>
            <button class="tap-model" data-bayar-nota="${it.id}" style="flex:1;padding:8px;border-radius:8px;background:#f618a9;color:#fff;border:none;font-size:12px;font-weight:700">Bayar</button>
          </div>
        </div>
      `;
    }).join('');
    container.querySelectorAll('[data-detail-nota]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); const id=btn.getAttribute('data-detail-nota'); if(typeof window.openModalDetailNota==='function') window.openModalDetailNota(id); else openModal('modalDetailNotaOverlay'); safeLS.set('activeDetailNotaId', id); });
    });
    container.querySelectorAll('[data-bayar-nota]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); const id=btn.getAttribute('data-bayar-nota'); if(typeof window.openBayarNotaModal==='function') window.openBayarNotaModal(id); else openModal('modalBayarNotaOverlay'); });
    });
  }catch(e){ console.warn('renderAntrian', e); }
}

export async function simpanNotaBaru(){
  try{
    const pelanggan = safeLS.get('currentNotaPelanggan');
    const items = safeLS.get('currentNotaItems', []);
    if(!pelanggan || !items.length){ alert('Pilih pelanggan dan layanan dulu'); return; }
    const total = items.reduce((sum,it)=> sum + (Number(it.qtyInput||1)*Number(it.harga||0)), 0);
    const newNota = {
      id: 'nota-'+Date.now(),
      outletId: safeLS.get('activeOutletId')||'outlet-1',
      nota: '#NT-'+Date.now().toString().slice(-6),
      namaPelanggan: pelanggan.nama||'Pelanggan',
      pelangganId: pelanggan.id,
      layanan: items.map(i=> i.nama + ' ' + (i.qtyInput||'') + (i.satuan||'')).join(', '),
      totalNota: total,
      statusProses: 'Antrian',
      statusBayar: 'Belum Lunas',
      tanggal: new Date().toISOString(),
      estimasiISO: new Date(Date.now()+3*3600000).toISOString(),
      items: items
    };
    let list = getAntrian();
    list.unshift(newNota);
    await StorageManager.saveSupabaseFirst('antrian', list);
    safeLS.set('currentNotaItems', []);
    safeLS.set('currentNotaPelanggan', null);
    renderAntrian();
    closeModal('modalNotaOverlay');
  }catch(e){ console.warn(e); }
}

window.AntrianModule = { getAntrian, renderAntrian, simpanNotaBaru };
