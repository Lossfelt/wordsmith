// Forstørrelsesglasseffekt – oppdaterer scale/brightness per celle
// basert på gaussisk avstandsfunksjon fra musepeker

const MAX_SCALE  = 0.5;   // maks ekstra skalering i senter  (1 + 0.5 = 1.5×)
const SIGMA      = 52;    // gaussisk spredning i piksler (~1.2 cellebredder)
const MAX_BRIGHT = 0.6;   // maks ekstra lysstyrke i senter
const MAX_BLUR   = 4;     // maks blur i piksler når fog of war er aktiv

const TOUCH_OFFSET_Y = 90; // touch: hvor langt over fingeren linsesentrum legges (px)
const DRAG_THRESHOLD = 8;  // px bevegelse før en touch regnes som dra (ikke trykk)

let cellCenters    = null;
let fogOfWar       = false;
let lastMouseX     = null;
let lastMouseY     = null;
let gestureStartX  = 0;
let gestureStartY  = 0;
let didDrag        = false;

function buildCellCenters() {
  const gridEl   = document.getElementById('grid');
  const gridRect = gridEl.getBoundingClientRect();
  cellCenters = cells.map(c => {
    const r = c.getBoundingClientRect();
    return {
      x: r.left - gridRect.left + r.width  / 2,
      y: r.top  - gridRect.top  + r.height / 2,
    };
  });
}

function updateLens(mouseX, mouseY) {
  if (!cellCenters) buildCellCenters();
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  for (let i = 0; i < TOTAL; i++) {
    const dx   = mouseX - cellCenters[i].x;
    const dy   = mouseY - cellCenters[i].y;
    const g    = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
    const blur = fogOfWar ? ` blur(${(MAX_BLUR * (1 - g)).toFixed(2)}px)` : '';
    cells[i].style.transform = `scale(${(1 + MAX_SCALE  * g).toFixed(4)})`;
    cells[i].style.filter    = `brightness(${(1 + MAX_BRIGHT * g).toFixed(4)})${blur}`;
    cells[i].style.zIndex    = Math.round(g * 30);
  }
}

function resetLens() {
  lastMouseX = null;
  lastMouseY = null;
  for (const c of cells) {
    c.style.transform = '';
    c.style.zIndex    = '';
    c.style.filter    = fogOfWar ? `blur(${MAX_BLUR}px)` : '';
  }
}

function toggleFog() {
  fogOfWar = !fogOfWar;
  if (lastMouseX !== null) {
    updateLens(lastMouseX, lastMouseY);
  } else {
    resetLens();
  }
  return fogOfWar;
}

(function initLens() {
  const gridEl = document.getElementById('grid');
  // Pointer events dekker mus (hover), touch (drag) og penn i ett sett lyttere.
  // For mus fyrer pointermove ved hover; for touch kun mens fingeren er nede.

  gridEl.addEventListener('pointerdown', e => {
    gestureStartX = e.clientX;
    gestureStartY = e.clientY;
    didDrag = false;
    // Ny gest → nullstill et eventuelt hengit ignorer-flagg fra en dra
    // som aldri endte i et klikk.
    window.lensIgnoreClick = false;
  });

  gridEl.addEventListener('pointermove', e => {
    const rect = gridEl.getBoundingClientRect();
    let cx = e.clientX - rect.left;
    let cy = e.clientY - rect.top;
    if (e.pointerType !== 'mouse') {
      // Touch/penn: løft linsesentrum over fingeren så den ikke dekkes.
      // Klamp så toppraden fortsatt forstørres når fingeren er nær toppen.
      cy = Math.max(24, cy - TOUCH_OFFSET_Y);
      const dx = e.clientX - gestureStartX;
      const dy = e.clientY - gestureStartY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) didDrag = true;
    }
    updateLens(cx, cy);
  });

  // En touch-dra skal kun posisjonere linsen, ikke plukke. Marker at det
  // påfølgende click-eventet skal ignoreres av plukkingen (inventory.js).
  // Linsen blir stående (ingen reset) så du rekker å sikte og deretter trykke.
  gridEl.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse' && didDrag) window.lensIgnoreClick = true;
  });

  // Mus som forlater grid → nullstill. (For touch fyrer pointerleave også ved
  // løft, men da skal linsen bli stående, så vi nullstiller kun for mus.)
  gridEl.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') resetLens();
  });
  gridEl.addEventListener('pointercancel', resetLens);
  window.addEventListener('resize', () => { cellCenters = null; });
})();
