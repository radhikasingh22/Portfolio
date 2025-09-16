// ====== Minimal pano background with same rotation dynamics ======
const TAU = Math.PI * 2;
const HFOV = Math.PI / 2;      // 90°
let yaw = 0;                   // camera heading
let autoYawDir = -1;           // left by default (matches your main)
let autoSpeed = 0.32;          // radians/sec
let bgPhase = 0;
let prevYawForBg = 0;
let prevTs = 0;
let dragging = false, lastX = 0, lastDX = 0, dragSum = 0;

const viewer = document.getElementById('viewer');
const bg = document.getElementById('bg');
const ctx = bg.getContext('2d');

// ===== Tooltip element + helpers (HUD-style, same as reference) =====
const tipEl = document.createElement('div');
tipEl.id = 'pill-tip';
tipEl.setAttribute('role', 'tooltip');
tipEl.setAttribute('aria-hidden', 'true');
document.body.appendChild(tipEl);

function showPillarTip(text, source = "action"){
  tipEl.textContent = text;
  tipEl.classList.remove("from-pillar", "from-action");
  tipEl.classList.add(source === "action" ? "from-action" : "from-pillar");

  tipEl.style.opacity = '1';
  tipEl.style.visibility = 'visible';
  tipEl.setAttribute('aria-hidden', 'false');
}

function hidePillarTip(){
  tipEl.style.opacity = '0';
  tipEl.style.visibility = 'hidden';
  tipEl.setAttribute('aria-hidden', 'true');
}

// Position tooltip near cursor, prevent overflow on right/bottom
function movePillarTip(clientX, clientY){
  const pad = 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // reset to measure
  tipEl.style.left = '0px';
  tipEl.style.top  = '0px';
  tipEl.style.transform = 'none';
  const rect = tipEl.getBoundingClientRect();

  let x = clientX + pad;
  let y = clientY + pad;

  const overflowRight = x + rect.width > vw;
  if (overflowRight) {
    tipEl.style.left = clientX + 'px';
    tipEl.style.top  = y + 'px';
    tipEl.style.transform = 'translateX(-100%) translateY(0)';
  } else {
    tipEl.style.left = x + 'px';
    tipEl.style.top  = y + 'px';
    tipEl.style.transform = 'translate(0,0)';
  }

  const rect2 = tipEl.getBoundingClientRect();
  if (rect2.bottom > vh) {
    const dy = rect2.bottom - vh + 4;
    tipEl.style.top = (clientY - dy) + 'px';
  }
}

// ===== Attach tooltip to top-right buttons (Work/Resume/About/Contact) =====
(function wireTopActionTooltips(){
  const bar = document.getElementById('top-actions');
  if (!bar) return;

  const buttons = bar.querySelectorAll('.icon-btn');
  buttons.forEach(btn => {
    // data-tip > aria-label > title
    const getTip = () =>
      btn.getAttribute('data-tip') ||
      btn.getAttribute('aria-label') ||
      btn.getAttribute('title') ||
      '';

    btn.addEventListener('mouseenter', (e) => {
      const text = getTip();
      if (!text) return;
      showPillarTip(text, "action");
      movePillarTip(e.clientX, e.clientY);
    });

    btn.addEventListener('mousemove', (e) => {
      movePillarTip(e.clientX, e.clientY);
    });

    btn.addEventListener('mouseleave', () => {
      hidePillarTip();
    });

    // Hide on click as well (prevents lingering if navigation is blocked)
    btn.addEventListener('click', () => {
      hidePillarTip();
    }, true);
  });
})();



const panoImg = new Image();
panoImg.crossOrigin = "anonymous";
panoImg.src = "backpano.png";

function norm(a){ a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function drawPanorama(){
  const w = bg.width = viewer.clientWidth;
  const h = bg.height = viewer.clientHeight;

  if (!panoImg.complete || panoImg.naturalWidth === 0) {
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,'#0a1220'); grad.addColorStop(1,'#0b0f18');
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    return { w, h };
  }

  const scale = h / panoImg.naturalHeight;
  const drawW = Math.ceil(panoImg.naturalWidth * scale);
  const drawH = h;

  const pxPerRadian = drawW / TAU;
  const total = -bgPhase;                // pano moves opposite to yaw
  let offset = Math.round(total * pxPerRadian) % drawW;
  if (offset < 0) offset += drawW;

  let x = -offset;
  while (x < w) {
    ctx.drawImage(
      panoImg, 0, 0, panoImg.naturalWidth, panoImg.naturalHeight,
      x, 0, drawW, drawH
    );
    x += drawW;
  }
  return { w, h };
}

function render(ts){
  if (!prevTs) prevTs = ts;
  const dt = (ts - prevTs) / 1000;
  prevTs = ts;

  // Auto-rotate unless dragging
  if (!dragging) yaw = norm(yaw + autoYawDir * autoSpeed * dt);

  // Keep pano strictly opposite to yaw
  const dyaw = norm(yaw - prevYawForBg);
  bgPhase = norm(bgPhase - dyaw);
  prevYawForBg = yaw;

  drawPanorama();
  requestAnimationFrame(render);
}

// Drag gestures (mouse)
viewer.addEventListener('mousedown', e=>{
  dragging = true;
  lastX = e.clientX;
  dragSum = 0;
  viewer.classList.add('dragging');
});
window.addEventListener('mouseup', ()=>{
  if (!dragging) return;
  dragging = false;
  viewer.classList.remove('dragging');

  // Decide auto-rotation direction based on drag
  let s;
  if (Math.abs(dragSum) > 2) {
    s = Math.sign(dragSum);
  } else if (lastDX !== 0) {
    s = Math.sign(lastDX);
  } else {
    s = autoYawDir;
  }
  autoYawDir = s;
  lastDX = 0;
});
window.addEventListener('mousemove', e=>{
  if(!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  lastDX = dx;
  dragSum += dx;
  yaw = norm(yaw + dx * 0.0006);
});

// Touch gestures
viewer.addEventListener('touchstart', e=>{
  const t=e.touches[0]; if(!t) return;
  dragging = true;
  lastX = t.clientX;
  dragSum = 0;
}, {passive:true});
window.addEventListener('touchend', ()=>{
  if (!dragging) return;
  dragging = false;

  let s;
  if (Math.abs(dragSum) > 2) {
    s = Math.sign(dragSum);
  } else if (lastDX !== 0) {
    s = Math.sign(lastDX);
  } else {
    s = autoYawDir;
  }
  autoYawDir = s;
  lastDX = 0;
}, {passive:true});
window.addEventListener('touchmove', e=>{
  if(!dragging) return;
  const t=e.touches[0]; if(!t) return;
  const dx = t.clientX - lastX;
  lastX = t.clientX;
  lastDX = dx;
  dragSum += dx;
  yaw = norm(yaw + dx * 0.0003);
}, {passive:true});

// Start
panoImg.onload = () => requestAnimationFrame(render);
panoImg.onerror = () => requestAnimationFrame(render);
requestAnimationFrame(render);

// ====== Custom Cursor (same implementation) ======
(function customCursor(){
  if (window.matchMedia && !window.matchMedia('(pointer:fine)').matches) return;

  const root = document.getElementById('cursor');
  const ring = root.querySelector('.cursor-ring');
  const dot  = root.querySelector('.cursor-dot');

  let x = window.innerWidth/2, y = window.innerHeight/2;
  let rx = x, ry = y;                 // ring lerp
  const ease = 0.2;

  function move(e){ x = e.clientX; y = e.clientY; }
  function touch(e){ const t=e.touches&&e.touches[0]; if(!t) return; x=t.clientX; y=t.clientY; }

  window.addEventListener('mousemove', move, {passive:true});
  window.addEventListener('touchstart', touch, {passive:true});
  window.addEventListener('touchmove', touch, {passive:true});

  function clickPulse(){
    dot.classList.add('click');
    setTimeout(() => dot.classList.remove('click'), 240);
  }
  window.addEventListener('mousedown', clickPulse, { passive: true });
  window.addEventListener('touchend', clickPulse, { passive: true });

  document.addEventListener('mouseover', (e) => {
    const isInteractive = e.target.closest('input, textarea, [contenteditable="true"]');
    root.style.display = isInteractive ? 'none' : '';
  });

  function raf(){
    rx += (x - rx) * ease;
    ry += (y - ry) * ease;

    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    dot.style.transform  = `translate(${x}px, ${y}px) translate(-50%,-50%)`;

    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();
