
import { safeLS } from '../db.js';
import { openModal, closeModal } from './modalManager.js';

export function getTodayRange(){
  const now=new Date(); const start=new Date(now); start.setHours(0,0,0,0); const end=new Date(now); end.setHours(23,59,59,999);
  return {now, start, end};
}

export function getNotasHariIni(){
  const {start,end} = getTodayRange();
  const list = safeLS.get('antrianData', []);
  return list.filter(n=>{ const t=new Date(n.tanggal||n.created_at||Date.now()); return t>=start && t<=end; });
}

export function hitungRingkasanKas(){
  try{
    const notas = getNotasHariIni();
    const totalTunai = notas.filter(n=> (n.metodeBayar||'Tunai')==='Tunai' && n.statusBayar==='Lunas').reduce((s,n)=>s+(n.totalNota||0),0);
    const totalNonTunai = notas.filter(n=> (n.metodeBayar||'')!=='Tunai' && n.statusBayar==='Lunas').reduce((s,n)=>s+(n.totalNota||0),0);
    const elTunai = document.getElementById('kasTunaiValue');
    const elNonTunai = document.getElementById('kasNonTunaiValue');
    if(elTunai) elTunai.textContent = 'Rp ' + totalTunai.toLocaleString('id-ID');
    if(elNonTunai) elNonTunai.textContent = 'Rp ' + totalNonTunai.toLocaleString('id-ID');
  }catch(e){}
}

window.KasModule = { getTodayRange, getNotasHariIni, hitungRingkasanKas };
window.hitungRingkasanKas = hitungRingkasanKas;
