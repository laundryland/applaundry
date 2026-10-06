
import { safeLS, StorageManager } from '../db.js';

export function exportData(){
  try{
    const data = {
      outlets: safeLS.get('outletsData', []),
      karyawan: safeLS.get('karyawanData', []),
      pelanggan: safeLS.get('pelangganData', []),
      layanan: safeLS.get('layananData', []),
      antrian: safeLS.get('antrianData', []),
      strukSettings: safeLS.get('strukSettings', {}),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='laundry-backup-'+Date.now()+'.json'; a.click(); URL.revokeObjectURL(url);
  }catch(e){ alert('Export gagal: '+e.message); }
}

export async function importData(file){
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(data.outlets) await StorageManager.saveSupabaseFirst('outlets', data.outlets);
    if(data.karyawan) await StorageManager.saveSupabaseFirst('karyawan', data.karyawan);
    if(data.pelanggan) await StorageManager.saveSupabaseFirst('pelanggan', data.pelanggan);
    if(data.layanan) await StorageManager.saveSupabaseFirst('layanan', data.layanan);
    if(data.antrian) await StorageManager.saveSupabaseFirst('antrian', data.antrian);
    if(data.strukSettings) safeLS.set('strukSettings', data.strukSettings);
    alert('Import berhasil, reload halaman');
    location.reload();
  }catch(e){ alert('Import gagal: '+e.message); }
}

window.ExportImportModule={ exportData, importData };
