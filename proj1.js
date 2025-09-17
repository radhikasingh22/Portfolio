// ===== Tooltip element (HUD-style, reused from Page 1) =====
(function setupTooltip(){
  const tipEl = document.createElement('div');
  tipEl.id = 'pill-tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tipEl);

  function show(text, source="action"){
    tipEl.textContent = text;
    tipEl.classList.remove("from-pillar","from-action");
    tipEl.classList.add(source==="action" ? "from-action" : "from-pillar");
    tipEl.style.opacity = '1';
    tipEl.style.visibility = 'visible';
    tipEl.setAttribute('aria-hidden','false');
  }
  function hide(){
    tipEl.style.opacity = '0';
    tipEl.style.visibility = 'hidden';
    tipEl.setAttribute('aria-hidden','true');
  }
  function move(x,y){
    const vw = innerWidth, vh = innerHeight;
    tipEl.style.left = '0px'; tipEl.style.top = '0px'; tipEl.style.transform = 'none';
    const r = tipEl.getBoundingClientRect();
    if (x + r.width > vw) { tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; tipEl.style.transform = 'translateX(-100%)'; }
    else                  { tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; }
    const r2 = tipEl.getBoundingClientRect();
    if (r2.bottom > vh) tipEl.style.top = (y - (r2.bottom - vh + 4)) + 'px';
  }

  const bar = document.getElementById('top-actions');
  if (bar) {
    bar.querySelectorAll('.icon-btn').forEach(btn=>{
      const getTip = () => btn.getAttribute('data-tip') || btn.getAttribute('aria-label') || '';
      btn.addEventListener('mouseenter', e => { const t = getTip(); if (t){ show(t,"action"); move(e.clientX,e.clientY); }});
      btn.addEventListener('mousemove', e => move(e.clientX,e.clientY));
      btn.addEventListener('mouseleave', hide);
      btn.addEventListener('click', hide, true);
    });
  }

  // expose if needed elsewhere
  window.__pillTip = { show, hide, move };
})();

// ===== Moving panorama background (same feel as Page 1) =====
(function pano(){
  const TAU = Math.PI*2;
  const canvas = document.getElementById('pano');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = 'backpano.png';

  let phase = 0;
  let last = 0;
  const speed = 0.32;  // matches Page 1 autoSpeed

  function draw(ts){
    if (!last) last = ts;
    const dt = (ts - last)/1000; last = ts;
    phase = (phase + speed*dt) % TAU;

    const w = canvas.width = innerWidth;
    const h = canvas.height = innerHeight;

    if (!img.complete || img.naturalWidth === 0){
      const g = ctx.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#0a1220'); g.addColorStop(1,'#0b0f18');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      return requestAnimationFrame(draw);
    }

    const scale = h / img.naturalHeight;
    const drawW = Math.ceil(img.naturalWidth * scale);
    const pxPerRad = drawW / TAU;
    let offset = Math.round(phase * pxPerRad) % drawW;
    if (offset < 0) offset += drawW;

    let x = -offset;
    while (x < w){
      ctx.drawImage(img, 0,0,img.naturalWidth,img.naturalHeight, x, 0, drawW, h);
      x += drawW;
    }
    requestAnimationFrame(draw);
  }

  function onResize(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener('resize', onResize);
  img.onload = () => requestAnimationFrame(draw);
  img.onerror = () => requestAnimationFrame(draw);
  onResize();
})();

// ===== Custom cursor (trimmed) =====
(function customCursor(){
  if (!window.matchMedia || !window.matchMedia('(pointer:fine)').matches) return;
  const root = document.getElementById('cursor');
  const ring = root.querySelector('.cursor-ring');
  const dot  = root.querySelector('.cursor-dot');

  let x = innerWidth/2, y = innerHeight/2;
  let rx = x, ry = y;
  const ease = 0.2;

  function move(e){ x = e.clientX; y = e.clientY; }
  function touch(e){ const t=e.touches&&e.touches[0]; if(!t) return; x=t.clientX; y=t.clientY; }

  addEventListener('mousemove', move, {passive:true});
  addEventListener('touchstart', touch, {passive:true});
  addEventListener('touchmove', touch, {passive:true});
  addEventListener('mousedown', ()=>{ dot.classList.add('click'); setTimeout(()=>dot.classList.remove('click'),240); }, {passive:true});
  addEventListener('touchend', ()=>{ dot.classList.add('click'); setTimeout(()=>dot.classList.remove('click'),240); }, {passive:true});

  function raf(){
    rx += (x - rx) * ease;
    ry += (y - ry) * ease;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    dot.style.transform  = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();

// Clear any leftover zooming state if you navigate back to this page
addEventListener('pageshow', () => {
  document.body.classList.remove('zooming');
  document.querySelectorAll('.bg').forEach(bg => bg.style.filter = '');
});
