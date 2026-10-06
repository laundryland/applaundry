
import { safeLS } from '../db.js';

export function printNota(id){
  try{
    const list = safeLS.get('antrianData', []);
    const nota = list.find(n=>n.id===id);
    if(!nota){ alert('Nota tidak ditemukan'); return; }
    // Simple print via window.print with struk template
    const w = window.open('', '_blank');
    if(!w) return;
    w.document.write(`
      <html><head><title>${nota.nota}</title><style>body{font-family:monospace;font-size:12px;padding:10px} .center{text-align:center} .right{text-align:right}</style></head>
      <body>
        <div class="center"><strong>${safeLS.get('outletsData',[])[0]?.nama||'Laundry Land'}</strong><br>${safeLS.get('outletsData',[])[0]?.alamat||''}</div>
        <hr>
        <div>No: ${nota.nota}<br>Tgl: ${new Date(nota.tanggal).toLocaleString('id-ID')}<br>Pelanggan: ${nota.namaPelanggan}</div>
        <hr>
        <div>${(nota.items||[]).map(i=>`${i.nama} x${i.qtyInput||1} = Rp ${( (i.qtyInput||1)*(i.harga||0)).toLocaleString('id-ID')}`).join('<br>')}</div>
        <hr>
        <div style="display:flex;justify-content:space-between"><strong>Total</strong><strong>Rp ${(nota.totalNota||0).toLocaleString('id-ID')}</strong></div>
        <div class="center" style="margin-top:12px">Terima kasih</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  }catch(e){ console.warn(e); }
}

export function shareWA(id){
  try{
    const list = safeLS.get('antrianData', []);
    const nota = list.find(n=>n.id===id);
    if(!nota) return;
    const msg = `Halo ${nota.namaPelanggan}, nota ${nota.nota} total Rp ${(nota.totalNota||0).toLocaleString('id-ID')} status ${nota.statusProses||'Antrian'}. Terima kasih - ${safeLS.get('outletsData',[])[0]?.nama||'Laundry'}`;
    const wa = (nota.waPelanggan || safeLS.get('pelangganData', []).find(p=>p.id===nota.pelangganId)?.wa || '').replace(/[^0-9]/g,'');
    if(!wa){ alert('No WA tidak ada'); return; }
    const url = `https://wa.me/${wa.startsWith('0') ? '62'+wa.slice(1) : wa}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }catch(e){}
}

window.PrintModule={ printNota, shareWA };
window.actionPrintNota=printNota;
window.actionShareWANota=shareWA;
