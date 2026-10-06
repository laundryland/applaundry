
import { safeLS } from '../db.js';
import { openModal, closeModal } from './modalManager.js';

const DEFAULT_PERMISSIONS = {
  Owner: {'Data Outlet':true,'Data Karyawan':true,'Data Pelanggan':true,'Data Layanan':true,'Laporan':true,'Pengaturan Sistem':true,'Master Struk':true,'Export Import':true,'Level':true},
  Admin: {'Data Outlet':true,'Data Karyawan':true,'Data Pelanggan':true,'Data Layanan':true,'Laporan':true,'Pengaturan Sistem':true,'Master Struk':true,'Export Import':false,'Level':false},
  Kasir: {'Data Outlet':false,'Data Karyawan':false,'Data Pelanggan':true,'Data Layanan':false,'Laporan':false,'Pengaturan Sistem':false,'Master Struk':false,'Export Import':false,'Level':false},
  Operator: {'Data Outlet':false,'Data Karyawan':false,'Data Pelanggan':true,'Data Layanan':false,'Laporan':false,'Pengaturan Sistem':false,'Master Struk':false,'Export Import':false,'Level':false}
};

export function getPermissions(){
  return safeLS.get('levelPermissions', DEFAULT_PERMISSIONS);
}

export function savePermissions(perms){
  safeLS.set('levelPermissions', perms);
  applyPermissions();
}

export function applyPermissions(){
  try{
    const perms = getPermissions();
    const activeLevel = safeLS.get('activeLevel','Owner');
    const levelPerm = perms[activeLevel] || perms.Owner;
    document.querySelectorAll('[data-menu]').forEach(el=>{
      const menu = el.getAttribute('data-menu');
      if(menu && levelPerm[menu]===false){ el.style.display='none'; } else { el.style.display=''; }
    });
  }catch(e){}
}

export function getActiveKaryawan(){
  try{
    const activeId = safeLS.get('activeKaryawanId');
    const list = safeLS.get('karyawanData', []);
    if(activeId){ return list.find(k=>k.id===activeId) || list[0]; }
    return list[0] || {id:'karyawan-1', nama:'Kasir Utama', level:'Owner'};
  }catch(e){ return {id:'karyawan-1', nama:'Kasir Utama'}; }
}

window.LevelModule = { getPermissions, savePermissions, applyPermissions, getActiveKaryawan };
