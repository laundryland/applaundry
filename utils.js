
export function pad(n){ return String(n).padStart(2,'0'); }
export function getTanggalNota(it){
  try{
    if(!it) return new Date();
    if(it.tanggal) return new Date(it.tanggal);
    if(it.tglEstimasi) return new Date(it.tglEstimasi);
    if(it.estimasiISO) return new Date(it.estimasiISO);
    if(it.created_at) return new Date(it.created_at);
    return new Date();
  }catch(e){ return new Date(); }
}
export function formatRupiah(n){ try{ return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }catch(e){ return 'Rp '+ (n||0); } }
export function formatTanggal(date){
  try{
    const d = date instanceof Date ? date : new Date(date);
    return pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+String(d.getFullYear()).slice(-2)+' '+pad(d.getHours())+':'+pad(d.getMinutes());
  }catch(e){ return ''; }
}
export function debounce(fn, delay=300){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }
window.pad = pad;
window.getTanggalNota = getTanggalNota;
