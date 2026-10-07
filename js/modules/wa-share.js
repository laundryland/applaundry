// WA / WA Bisnis - Kirim Gambar Struk - FULL v2.5.28
export function executeShareWAText(isBusiness = false) {
  if (!window.activePreviewNotaObj) return;
  const nota = activePreviewNotaObj;
  const outlet = window.getActiveOutlet ? window.getActiveOutlet() : {nama:'Laundry Land'};
  const text = `*${outlet.nama || 'Laundry Land'}*\nNota: ${nota.nota || nota.id}\nPelanggan: ${nota.namaPelanggan || nota.pelangganNama || '-'}\nTotal: Rp ${(nota.totalNota || nota.total || 0).toLocaleString('id-ID')}\n\nTerima kasih sudah laundry!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  if(window.showNoticeToast) showNoticeToast(`📱 Share WA${isBusiness ? ' Bisnis' : ''} Nota ${nota.nota || nota.id}`);
}
export async function executeShareWAPNG(isBusiness = false) {
  if (!window.activePreviewNotaObj) return;
  const previewEl = document.querySelector('.thermal-receipt-preview') || document.querySelector('#notaPreviewContainer');
  if (!previewEl) { executeShareWAText(isBusiness); return; }
  try {
    if (typeof html2canvas === 'undefined') {
      await new Promise((res, rej) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = res; script.onerror = rej; document.head.appendChild(script);
      });
    }
    const canvas = await html2canvas(previewEl, {scale: 2, backgroundColor: '#ffffff'});
    const dataUrl = canvas.toDataURL('image/png');
    if (navigator.canShare) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `nota-${activePreviewNotaObj.nota || activePreviewNotaObj.id}.png`, {type: 'image/png'});
      if (navigator.canShare({files: [file]})) {
        await navigator.share({files: [file], title: `Nota ${activePreviewNotaObj.nota}`}); return;
      }
    }
    const a = document.createElement('a'); a.href = dataUrl; a.download = `nota-${activePreviewNotaObj.nota || activePreviewNotaObj.id}.png`; a.click();
    if(window.showNoticeToast) showNoticeToast(`🖼️ Gambar didownload, kirim manual ke WA`);
    setTimeout(() => executeShareWAText(isBusiness), 500);
  } catch(e) { executeShareWAText(isBusiness); }
}
export const executeShareWAImage = executeShareWAPNG;
window.executeShareWAText = executeShareWAText; window.executeShareWAPNG = executeShareWAPNG; window.executeShareWAImage = executeShareWAImage;
console.log('✅ wa-share.js FULL loaded');
