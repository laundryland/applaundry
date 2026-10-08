// struk.js + nota-print-share.js COMBINED FIXED
let strukPrintMode = localStorage.getItem('strukPrintMode')||'text';
let strukPNGMode = localStorage.getItem('strukPNGMode')||'ios';
let activePreviewNotaObj=null;

function setStrukPrintMode(mode){
  strukPrintMode=mode; localStorage.setItem('strukPrintMode', mode);
  window.showNoticeToast?.(mode==='ios'?'🍎 Mode Gambar iOS':'📄 Mode Text');
}
function openPreviewNotaModal(id){
  const antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const nota=antrianData.find(n=>n.id===id);
  if(!nota) return;
  activePreviewNotaObj=nota;
  window.activePreviewNotaObj=nota;
  document.getElementById('modalPreviewNotaOverlay')?.classList.add('active');
  updateStrukPreview();
}
function closeModalPreviewNota(){ document.getElementById('modalPreviewNotaOverlay')?.classList.remove('active'); }
function closeModalPreviewNotaOnBackdrop(e){ if(e.target.id==='modalPreviewNotaOverlay') closeModalPreviewNota(); }
function updateStrukPreview(){
  if(!activePreviewNotaObj) return;
  const preview=document.getElementById('strukPreviewContent');
  if(!preview) return;
  const nota=activePreviewNotaObj;
  const outlet=JSON.parse(localStorage.getItem('outletsData')||'[]').find(o=>o.isActive) || {};
  preview.innerHTML=`
    <div style="font-family:monospace;font-size:12px;padding:12px;background:#fff;color:#000;line-height:1.4">
      <div style="text-align:center;font-weight:800">${outlet.nama||'Laundry Land'}</div>
      <div style="text-align:center;font-size:10px">${outlet.alamat||''}</div>
      <div style="border-top:1px dashed #000;margin:8px 0"></div>
      <div>No: ${nota.nota}</div>
      <div>Pel: ${nota.namaPelanggan}</div>
      <div>Tgl: ${new Date(nota.tanggal||Date.now()).toLocaleString('id-ID')}</div>
      <div style="border-top:1px dashed #000;margin:8px 0"></div>
      <div>${nota.layanan||''}</div>
      <div style="display:flex;justify-content:space-between;font-weight:800;margin-top:6px"><span>Total</span><span>Rp ${Number(nota.totalNota||0).toLocaleString('id-ID')}</span></div>
      <div style="border-top:1px dashed #000;margin:8px 0"></div>
      <div style="text-align:center;font-size:10px">Terima kasih</div>
    </div>
  `;
}
function executePrintFromPreview(){
  const content=document.getElementById('strukPreviewContent')?.innerHTML;
  if(!content) return;
  const w=window.open('','_blank','width=300,height=600');
  w.document.write(`<html><body style="margin:0;padding:10px">${content}</body></html>`);
  w.document.close(); w.print();
}
function actionPrintNota(id, e){ if(e) e.stopPropagation(); openPreviewNotaModal(id); }
function actionShareWANota(id, e){ if(e) e.stopPropagation(); openPreviewNotaModal(id); }

async function executeShareWAText(){
  if(!activePreviewNotaObj) return;
  const nota=activePreviewNotaObj;
  const text=`*${(JSON.parse(localStorage.getItem('outletsData')||'[]').find(o=>o.isActive)||{}).nama||'Laundry'}*\nNo: ${nota.nota}\nPelanggan: ${nota.namaPelanggan}\nLayanan: ${nota.layanan}\nTotal: Rp ${Number(nota.totalNota||0).toLocaleString('id-ID')}\nStatus: ${nota.statusBayar}\n\nTerima kasih`;
  const url=`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
}
async function executeShareWAPNG(){
  if(!activePreviewNotaObj) return;
  const el=document.getElementById('strukPreviewContent');
  if(!el) return;
  try{
    // fallback to text if html2canvas not loaded
    if(!window.html2canvas){
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      document.body.appendChild(s);
      await new Promise(r=> s.onload=r);
    }
    const canvas=await window.html2canvas(el, {scale:2});
    canvas.toBlob(blob=>{
      const file=new File([blob], 'nota.png', {type:'image/png'});
      if(navigator.share && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title:'Nota Laundry'});
      } else {
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a'); a.href=url; a.download='nota.png'; a.click();
      }
    });
  }catch(e){ console.error(e); executeShareWAText(); }
}

window.openPreviewNotaModal=openPreviewNotaModal;
window.closeModalPreviewNota=closeModalPreviewNota;
window.closeModalPreviewNotaOnBackdrop=closeModalPreviewNotaOnBackdrop;
window.updateStrukPreview=updateStrukPreview;
window.executePrintFromPreview=executePrintFromPreview;
window.actionPrintNota=actionPrintNota;
window.actionShareWANota=actionShareWANota;
window.executeShareWAText=executeShareWAText;
window.executeShareWAPNG=executeShareWAPNG;
window.setStrukPrintMode=setStrukPrintMode;

console.log('✅ struk + print-share FIXED loaded');