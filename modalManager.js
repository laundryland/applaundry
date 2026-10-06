
let stack = [];
export function openModal(id){
  const el = document.getElementById(id);
  if(!el){ console.warn('Modal not found', id); return; }
  document.querySelectorAll('.modal-overlay.active').forEach(m=>{ if(m.id!==id) closeModal(m.id); });
  el.classList.add('active');
  el.style.display='flex';
  el.style.pointerEvents='auto';
  stack.push(id);
  document.body.style.overflow='hidden';
}
export function closeModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('active');
  el.style.pointerEvents='none';
  setTimeout(()=>{ if(!el.classList.contains('active')) el.style.display='none'; },250);
  stack = stack.filter(x=>x!==id);
  if(stack.length===0) document.body.style.overflow='';
}
export function closeAllModals(){ document.querySelectorAll('.modal-overlay.active').forEach(m=>closeModal(m.id)); }
export function initModalBackdrop(){
  document.addEventListener('click', (e)=>{
    if(e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')){
      e.stopPropagation();
      closeModal(e.target.id);
    }
  }, true);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && stack.length){ closeModal(stack[stack.length-1]); } });
}
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
