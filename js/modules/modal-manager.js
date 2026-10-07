
// MODAL MANAGER - anti hidden tap
let stack = [];

export function openModal(id){
  const el = document.getElementById(id);
  if(!el){ console.warn('Modal not found', id); return; }
  // Close other modals with same base name duplicate
  document.querySelectorAll('.modal-overlay.active').forEach(m=>{
    if(m.id!==id && m.id.startsWith(id.split('-')[0])) closeModal(m.id);
  });
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

export function initModalBackdrop(){
  document.addEventListener('click', (e)=>{
    if(e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')){
      e.stopPropagation();
      closeModal(e.target.id);
    }
  }, true);
}

window.openModal = openModal;
window.closeModal = closeModal;
