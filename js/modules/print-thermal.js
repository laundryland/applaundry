// PRINT THERMAL - RPP02N, GZB100, 58mm/80mm, ESC/POS, RawBT, Bluetooth - FULL v2.5.28
export function downloadESCPOS(notaId) {
  const notaObj = (window.antrianData || []).find(n => n.id === notaId) || window.activePreviewNotaObj;
  if (!notaObj) { if(window.showNoticeToast) showNoticeToast('Buka preview nota dulu'); return; }
  const escpos = buildESC_POSNota(notaObj, window.getActiveOutlet ? window.getActiveOutlet() : {nama:'Laundry Land'});
  const blob = new Blob([escpos], {type: 'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nota-${notaObj.nota || notaObj.id}-RPP02N-GZB100.bin`;
  a.click();
  URL.revokeObjectURL(url);
  if(window.showNoticeToast) showNoticeToast(`⬇️ Download ESC/POS 58/80mm Nota ${notaObj.nota}`);
}
export function buildESC_POSNota(nota, outlet){
  const ESC = '\x1b'; const GS = '\x1d'; let cmds = '';
  cmds += ESC + '@'; cmds += ESC + 'a' + '\x01';
  cmds += (outlet.nama || 'Laundry Land').toUpperCase() + '\n';
  cmds += ESC + 'a' + '\x00';
  cmds += (outlet.alamat || '') + '\n'; cmds += 'WA: ' + (outlet.wa || '') + '\n';
  cmds += '--------------------------------\n';
  cmds += 'No: ' + (nota.nota || nota.id) + '\n';
  cmds += 'Tgl: ' + new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) + '\n';
  cmds += 'Pel: ' + (nota.namaPelanggan || nota.pelangganNama || '-') + '\n';
  cmds += 'Kasir: ' + (typeof getActiveKaryawan==='function' ? getActiveKaryawan().nama : 'Kasir') + '\n';
  cmds += '--------------------------------\n';
  cmds += 'Layanan (per row):\n';
  if(nota.items && nota.items.length>0){
    nota.items.forEach(function(it, idx){
      cmds += (idx+1) + '. ' + (it.nama || it.layanan) + '\n';
      cmds += '   ' + (it.qtyInput || it.qty || 1) + (it.satuan || 'kg') + ' @Rp ' + (it.harga||0).toLocaleString('id-ID') + '\n';
      cmds += '   Rp ' + (it.subtotal||0).toLocaleString('id-ID') + '\n';
    });
  } else { cmds += (nota.layanan || '-') + '\n'; }
  cmds += '--------------------------------\n';
  cmds += ESC + 'a' + '\x02'; cmds += ESC + '!' + '\x08';
  cmds += 'TOTAL: Rp ' + (nota.totalNota || nota.total || 0).toLocaleString('id-ID') + '\n';
  cmds += ESC + '!' + '\x00'; cmds += ESC + 'a' + '\x00';
  cmds += 'Bayar: ' + (nota.statusBayar || '-') + '\n'; cmds += 'Proses: ' + (nota.statusProses || '-') + '\n';
  cmds += '--------------------------------\n'; cmds += ESC + 'a' + '\x01'; cmds += 'Terima Kasih!\n';
  cmds += 'Barang tdk diambil 30 hari\n'; cmds += 'diluar tanggung jawab kami\n';
  cmds += '\n\n\n'; cmds += GS + 'V' + '\x00'; return cmds;
}
export async function requestBluetoothPrinter() {
  if (!navigator.bluetooth) { alert('Browser tidak support Bluetooth.\n1. Pakai Chrome Android\n2. Buka via HTTPS'); return null; }
  if (!window.isSecureContext) { alert('Bluetooth diblokir file:// - Upload ke HTTPS dulu'); return null; }
  try {
    const device = await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:['000018f0-0000-1000-8000-00805f9b34fb','battery_service']});
    if(window.showNoticeToast) showNoticeToast(`🖨️ ${device.name || 'RPP02N/GZB100'} terhubung`); return device;
  } catch(e) { if(window.showNoticeToast) showNoticeToast('❌ Bluetooth gagal: '+e.message); return null; }
}
export async function cetakThermalBluetooth(notaId){
  const nota = (window.antrianData || []).find(n=>n.id===notaId) || window.activePreviewNotaObj;
  if(!nota){ if(window.showNoticeToast) showNoticeToast('Nota tidak ditemukan'); return false; }
  const device = await requestBluetoothPrinter(); if (!device) return false;
  try {
    const server = await device.gatt.connect(); const services = await server.getPrimaryServices();
    for (let service of services) { const characteristics = await service.getCharacteristics();
      for (let char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          const outlet = window.getActiveOutlet ? window.getActiveOutlet() : {nama:'Laundry Land'};
          const escpos = buildESC_POSNota(nota, outlet); const encoder = new TextEncoder();
          await char.writeValue(encoder.encode(escpos));
          if(window.showNoticeToast) showNoticeToast(`🖨️ Cetak ke ${device.name} (RPP02N/GZB100) berhasil`); return true;
        }}}}
  catch(e) { console.error('Cetak Bluetooth fail', e); return false; } return false;
}
export function fallbackCetakRawBT(notaObj) {
  if (!notaObj) notaObj = window.activePreviewNotaObj; if (!notaObj) return;
  if (navigator.share) {
    const outlet = window.getActiveOutlet ? window.getActiveOutlet() : {nama:'Laundry Land'};
    const escpos = buildESC_POSNota(notaObj, outlet);
    const blob = new Blob([escpos], {type: 'application/octet-stream'});
    const file = new File([blob], `nota-${notaObj.nota || notaObj.id}.bin`, {type: 'application/octet-stream'});
    navigator.share({files: [file], title: `Nota ${notaObj.nota} - RPP02N/GZB100`}).catch(() => { downloadESCPOS(notaObj.id); });
  } else { downloadESCPOS(notaObj.id); }
}
window.downloadESCPOS = downloadESCPOS; window.buildESC_POSNota = buildESC_POSNota;
window.requestBluetoothPrinter = requestBluetoothPrinter; window.cetakThermalBluetooth = cetakThermalBluetooth;
window.fallbackCetakRawBT = fallbackCetakRawBT;
console.log('✅ print-thermal.js FULL loaded - RPP02N, GZB100, 58/80mm');
