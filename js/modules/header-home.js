
export function initHeaderHome() {
  // Logo upload
  document.getElementById('btn-upload-logo')?.addEventListener('click', (e) => {
    if (e.target.closest('#logoFileInput')) return;
    document.getElementById('logoFileInput')?.click();
  });
  document.getElementById('logoFileInput')?.addEventListener('change', function(e){
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=function(ev){
      const img=document.getElementById('outletLogoImg');
      const ph=document.getElementById('logoPlaceholderIcon');
      if(img){ img.src=ev.target.result; img.style.display='block'; }
      if(ph) ph.style.display='none';
      try{ localStorage.setItem('outletLogo', ev.target.result); }catch(e){}
    };
    reader.readAsDataURL(file);
  });
  try{
    const saved=localStorage.getItem('outletLogo');
    if(saved){
      const img=document.getElementById('outletLogoImg');
      const ph=document.getElementById('logoPlaceholderIcon');
      if(img){ img.src=saved; img.style.display='block'; }
      if(ph) ph.style.display='none';
    }
  }catch(e){}
}

export function toggleHeaderOutletDropdown() {
  const dd = document.getElementById('headerOutletDropdown');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' || !dd.style.display ? 'block' : 'none';
}
window.toggleHeaderOutletDropdown = toggleHeaderOutletDropdown;
