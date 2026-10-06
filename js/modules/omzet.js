
import { safeLS } from '../db.js';

export function getOutletData(){
  try{
    const list = safeLS.get('outletsData', []);
    if(list && list.length) return list;
    return [{id:'outlet-1', nama:'Laundry Land'}];
  }catch(e){ return []; }
}

export function updateGlobalOmzetCard(){
  try{
    const outlets = getOutletData();
    const antrian = safeLS.get('antrianData', []);
    const container = document.getElementById('globalOmzetGrid');
    if(!container) return;
    container.innerHTML = outlets.map(o=>{
      const total = antrian.filter(n=> !n.outletId || n.outletId===o.id).reduce((s,n)=>s+(n.totalNota||0),0);
      return `<div style="padding:12px;background:#fff;border:1px solid #eee;border-radius:10px"><div style="font-size:11px;color:#666">${o.nama}</div><div style="font-weight:800;margin-top:4px">Rp ${total.toLocaleString('id-ID')}</div></div>`;
    }).join('');
  }catch(e){}
}

window.OmzetModule={ getOutletData, updateGlobalOmzetCard };
window.updateGlobalOmzetCard=updateGlobalOmzetCard;
