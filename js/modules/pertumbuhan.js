
import { safeLS } from '../db.js';

export function renderPertumbuhanPelanggan(){
  try{
    const list = safeLS.get('pelangganData', []);
    const now=new Date();
    const startHari=new Date(now); startHari.setHours(0,0,0,0);
    const startMinggu=new Date(now); startMinggu.setDate(now.getDate()-7);
    const startBulan=new Date(now.getFullYear(), now.getMonth(), 1);
    const baruHari=list.filter(p=> new Date(p.created_at||p.tanggal||Date.now()) >= startHari).length;
    const baruMinggu=list.filter(p=> new Date(p.created_at||p.tanggal||Date.now()) >= startMinggu).length;
    const baruBulan=list.filter(p=> new Date(p.created_at||p.tanggal||Date.now()) >= startBulan).length;
    const elHari=document.getElementById('pertumbuhanHari');
    const elMinggu=document.getElementById('pertumbuhanMinggu');
    const elBulan=document.getElementById('pertumbuhanBulan');
    if(elHari) elHari.textContent=baruHari;
    if(elMinggu) elMinggu.textContent=baruMinggu;
    if(elBulan) elBulan.textContent=baruBulan;
  }catch(e){}
}

window.PertumbuhanModule={ renderPertumbuhanPelanggan };
