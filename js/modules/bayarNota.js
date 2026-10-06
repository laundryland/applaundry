
import { StorageManager, safeLS } from '../db.js';
import { closeModal } from './modalManager.js';
import { formatRupiah } from '../utils.js';

let activeBayarNota = null;
let activeMetode = 'Tunai';
let splitMode = false;

export function openBayarNotaModal(notaId){
  try{
    const list = safeLS.get('antrianData', []);
    const nota = list.find(n=>n.id===notaId) || list[0];
    if(!nota) return;
    activeBayarNota = nota;
    safeLS.set('activeBayarNotaId', notaId);
    
    // Row 1: Jumlah Nota
    const row1 = document.getElementById('bayarRowJumlahNota');
    if(row1) row1.innerHTML = `<div style="display:flex;justify-content:space-between;padding:10px;background:#f9fafb;border-radius:10px"><span>Jumlah Nota</span><strong>${formatRupiah(nota.totalNota||0)}</strong></div>`;
    
    // Row 2: Deposito & Split
    const pelangganList = safeLS.get('pelangganData', []);
    const cust = pelangganList.find(p=> p.id===nota.pelangganId || p.nama===nota.namaPelanggan);
    const saldoDep = cust?.deposito||0;
    const row2 = document.getElementById('bayarRowDepositoSplit');
    if(row2){
      row2.innerHTML = `
        <div style="padding:10px;background:#fff;border:1px solid #eee;border-radius:10px">
          <div style="display:flex;justify-content:space-between"><span>Deposito ${cust?.nama||''}</span><span style="font-weight:700;color:${saldoDep>0?'#059669':'#666'}">Rp ${saldoDep.toLocaleString('id-ID')}</span></div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="checkPakaiDeposito" ${saldoDep>0?'':'disabled'}> Pakai Deposito</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="checkSplitBayar"> Split Bayar</label>
          </div>
        </div>
      `;
      setTimeout(()=>{
        document.getElementById('checkPakaiDeposito')?.addEventListener('change', hitungKalkulasi);
        document.getElementById('checkSplitBayar')?.addEventListener('change', (e)=>{ splitMode=e.target.checked; hitungKalkulasi(); });
      },100);
    }
    
    // Row 3: Metode Pembayaran
    const row3 = document.getElementById('bayarRowMetode');
    if(row3){
      row3.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${['Tunai','Transfer','QRIS','EDC','Deposito'].map(m=>`<button class="tap-model" data-metode="${m}" style="padding:10px;border-radius:10px;border:1.5px solid ${activeMetode===m?'#f618a9':'#eee'};background:${activeMetode===m?'#fdf2f8':'#fff'};font-weight:700;font-size:12px">${m}</button>`).join('')}
        </div>
      `;
      row3.querySelectorAll('[data-metode]').forEach(btn=>{
        btn.addEventListener('click', (e)=>{ e.stopPropagation(); activeMetode=btn.getAttribute('data-metode'); row3.querySelectorAll('[data-metode]').forEach(b=>{ b.style.border='1.5px solid #eee'; b.style.background='#fff'; }); btn.style.border='1.5px solid #f618a9'; btn.style.background='#fdf2f8'; hitungKalkulasi(); });
      });
    }
    
    // Row 4: Kalkulasi
    hitungKalkulasi();
    
    const ov = document.getElementById('modalBayarNotaOverlay');
    if(ov){ ov.classList.add('active'); ov.style.display='flex'; }
  }catch(e){ console.warn('openBayarNota', e); }
}

export function hitungKalkulasi(){
  try{
    if(!activeBayarNota) return;
    const total = activeBayarNota.totalNota||0;
    const pelangganList = safeLS.get('pelangganData', []);
    const cust = pelangganList.find(p=> p.id===activeBayarNota.pelangganId || p.nama===activeBayarNota.namaPelanggan);
    const saldoDep = cust?.deposito||0;
    const pakaiDep = document.getElementById('checkPakaiDeposito')?.checked;
    let potongDep = 0;
    if(pakaiDep && saldoDep>0){ potongDep = Math.min(saldoDep, total); }
    const sisa = total - potongDep;
    const inputBayar = Number(document.getElementById('inputNominalBayar')?.value||sisa);
    
    const row4 = document.getElementById('bayarRowKalkulasi');
    if(row4){
      row4.innerHTML = `
        <div style="padding:10px;background:#f9fafb;border-radius:10px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span>Total</span><span>${formatRupiah(total)}</span></div>
          ${potongDep>0?`<div style="display:flex;justify-content:space-between;color:#059669"><span>Potong Deposito</span><span>-${formatRupiah(potongDep)}</span></div>`:''}
          <div style="display:flex;justify-content:space-between;font-weight:800;margin-top:6px;padding-top:6px;border-top:1px dashed #ddd"><span>Sisa Bayar</span><span>${formatRupiah(sisa)}</span></div>
          <input id="inputNominalBayar" type="number" placeholder="Nominal bayar" value="${sisa}" style="width:100%;margin-top:8px;padding:10px;border:1px solid #ddd;border-radius:8px">
          <div style="margin-top:6px;font-size:11px;color:#666">Metode: ${activeMetode} ${splitMode?'(Split)':''}</div>
        </div>
      `;
      document.getElementById('inputNominalBayar')?.addEventListener('input', hitungKalkulasi);
    }
  }catch(e){}
}

export async function eksekusiSimpanPembayaran(){
  try{
    if(!activeBayarNota){ alert('Nota tidak ditemukan'); return; }
    const inputNominal = Number(document.getElementById('inputNominalBayar')?.value||0);
    const pakaiDep = document.getElementById('checkPakaiDeposito')?.checked;
    const pelangganList = safeLS.get('pelangganData', []);
    const custIdx = pelangganList.findIndex(p=> p.id===activeBayarNota.pelangganId || p.nama===activeBayarNota.namaPelanggan);
    let list = safeLS.get('antrianData', []);
    const idx = list.findIndex(n=>n.id===activeBayarNota.id);
    if(idx===-1) return;
    
    // Update deposito jika dipakai
    if(pakaiDep && custIdx!==-1){
      const cust = pelangganList[custIdx];
      const potong = Math.min(cust.deposito||0, activeBayarNota.totalNota||0);
      pelangganList[custIdx].deposito = (cust.deposito||0) - potong;
      await StorageManager.saveSupabaseFirst('pelanggan', pelangganList);
    }
    
    // Update nota jadi Lunas jika bayar cukup
    if(inputNominal >= (activeBayarNota.totalNota||0) || pakaiDep){
      list[idx].statusBayar = 'Lunas';
      list[idx].metodeBayar = activeMetode;
      list[idx].tanggalBayar = new Date().toISOString();
    }
    await StorageManager.saveSupabaseFirst('antrian', list);
    closeModal('modalBayarNotaOverlay');
    if(typeof window.renderAntrian==='function') window.renderAntrian();
    if(typeof window.hitungRingkasanKas==='function') try{window.hitungRingkasanKas()}catch(e){}
  }catch(e){ console.warn(e); }
}

window.BayarNotaModule = { openBayarNotaModal, hitungKalkulasi, eksekusiSimpanPembayaran };
window.openBayarNotaModal = openBayarNotaModal;
window.hitungKalkulasiPembayaran = hitungKalkulasi;
window.eksekusiSimpanPembayaran = eksekusiSimpanPembayaran;
