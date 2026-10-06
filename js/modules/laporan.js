
import { safeLS } from '../db.js';
import { getTanggalNota } from '../utils.js';

export function filterNotaByOutletAndDate(start,end){
  try{
    const activeOutletId = safeLS.get('activeOutletId');
    const list = safeLS.get('antrianData', []);
    return list.filter(it=>{
      if(activeOutletId && it.outletId && it.outletId!==activeOutletId) return false;
      const t=getTanggalNota(it);
      if(start && t<start) return false;
      if(end && t>end) return false;
      return true;
    });
  }catch(e){ return []; }
}

export function renderLaporanMingguan(){
  try{
    const now=new Date(); const start=new Date(now); start.setDate(now.getDate()-7);
    const data=filterNotaByOutletAndDate(start, now);
    const total=data.reduce((s,n)=>s+(n.totalNota||0),0);
    const el=document.getElementById('laporanMingguanTotal');
    if(el) el.textContent='Rp '+total.toLocaleString('id-ID');
  }catch(e){}
}

export function renderLaporanBulanan(){
  try{
    const now=new Date(); const start=new Date(now.getFullYear(), now.getMonth(), 1);
    const data=filterNotaByOutletAndDate(start, now);
    const total=data.reduce((s,n)=>s+(n.totalNota||0),0);
    const el=document.getElementById('laporanBulananTotal');
    if(el) el.textContent='Rp '+total.toLocaleString('id-ID');
  }catch(e){}
}

window.LaporanModule={ filterNotaByOutletAndDate, renderLaporanMingguan, renderLaporanBulanan };
