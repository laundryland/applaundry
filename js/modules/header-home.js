
export function initHeaderHome() {
  // Logo
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

  // Render outlets from Supabase real
  try{
    const outlets = window.outletsData || JSON.parse(localStorage.getItem('outletsData')||'[]');
    if(outlets && outlets.length){
      const dropdown = document.getElementById('headerOutletDropdown');
      if(dropdown){
        dropdown.innerHTML = outlets.map(o=>`<div onclick="selectOutlet('${o.id}')" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #eee;">${o.nama || o.name}</div>`).join('');
      }
      const label = document.getElementById('label-outlet');
      if(label && outlets[0]) label.textContent = outlets[0].nama || outlets[0].name || 'Laundry Land';
      console.log('✅ header-home outlets', outlets.length);
    }
  }catch(e){ console.warn('header-home outlets fail', e); }
}

export function toggleHeaderOutletDropdown() {
  const dd = document.getElementById('headerOutletDropdown');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' || !dd.style.display ? 'block' : 'none';
  dd.style.pointerEvents='auto';
}
window.toggleHeaderOutletDropdown = toggleHeaderOutletDropdown;
window.initHeaderHome = initHeaderHome;

console.log('✅ header-home.js fixed - Supabase real');
